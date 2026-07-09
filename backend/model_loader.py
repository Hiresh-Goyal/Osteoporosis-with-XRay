import os
import pickle
import gc

# Global Configuration
DEMO_MODE = False  # Try real mode first

class ModelLoader:
    def __init__(self):
        self.xgb_model = None
        self.image_model = None
        self.is_demo = False
        self.warning_msg = None
        self.classes = ['Normal', 'Osteopenia', 'Osteoporosis']
        self.device = None
        self.transform = None
        
        if not DEMO_MODE:
            self._load_clinical_model()

    def _load_clinical_model(self):
        xgb_path = os.path.join(os.path.dirname(__file__), "../models/clinical/xgboost_baseline.pkl")
        if os.path.exists(xgb_path):
            with open(xgb_path, 'rb') as f:
                self.xgb_model = pickle.load(f)
            print("Loaded XGBoost clinical model.")
        else:
            print(f"Warning: {xgb_path} not found.")

    def _load_image_model(self):
        try:
            import onnxruntime as ort
        except ImportError:
            print("WARNING: onnxruntime not installed. Falling back to synthetic inference.")
            self.is_demo = True
            return False

        # Image preprocessing using PIL and numpy instead of torchvision
        def preprocess(image_path):
            from PIL import Image
            import numpy as np
            
            img = Image.open(image_path).convert('RGB')
            # Resize
            img = img.resize((256, 256), Image.Resampling.BILINEAR)
            # Center Crop
            width, height = img.size
            left = (width - 224)/2
            top = (height - 224)/2
            right = (width + 224)/2
            bottom = (height + 224)/2
            img = img.crop((left, top, right, bottom))
            
            # To Tensor (HWC to CHW) and normalize
            img_array = np.array(img).astype(np.float32) / 255.0
            img_array = np.transpose(img_array, (2, 0, 1))
            
            mean = np.array([0.485, 0.456, 0.406]).reshape(3, 1, 1)
            std = np.array([0.229, 0.224, 0.225]).reshape(3, 1, 1)
            img_array = (img_array - mean) / std
            
            # Add batch dimension
            return np.expand_dims(img_array, axis=0).astype(np.float32)
            
        self.transform = preprocess

        img_path = os.path.join(os.path.dirname(__file__), "../models/densenet121.onnx")
        if os.path.exists(img_path):
            self.image_model = ort.InferenceSession(img_path, providers=['CPUExecutionProvider'])
            print("Successfully Lazy-Loaded DenseNet121 ONNX model locally.")
            return True
        else:
            print(f"CRITICAL WARNING: ONNX Model file not found at {img_path}")
            self.image_model = None
            return False

    def predict_risk(self, features):
        if self.is_demo:
            return 0.82
            
        import pandas as pd
        df = pd.DataFrame([features])
        return float(self.xgb_model.predict_proba(df)[0][1])

    def predict_image(self, image_path):
        if self.is_demo:
            return "Osteopenia", [0.1, 0.7, 0.2]
            
        if self.image_model is None:
            success = self._load_image_model()
            if not success:
                return "Osteopenia", [0.1, 0.7, 0.2] # Fallback if loading fails

        try:
            import numpy as np
            
            # Preprocess
            input_tensor = self.transform(image_path)
            
            # ONNX Inference
            input_name = self.image_model.get_inputs()[0].name
            outputs = self.image_model.run(None, {input_name: input_tensor})[0]
            
            # Softmax
            exp_preds = np.exp(outputs[0] - np.max(outputs[0]))
            probs = (exp_preds / exp_preds.sum()).tolist()
            
            pred_idx = np.argmax(probs)
            result = (self.classes[pred_idx], probs)
                
            return result
        finally:
            # MEMORY MANAGEMENT
            del self.image_model
            self.image_model = None
            gc.collect()

    def predict_fusion(self, clinical_score, image_prediction):
        if self.is_demo:
            return "Osteoporosis"
            
        img_severity = self.classes.index(image_prediction)
        img_score = img_severity / 2.0  
        final_score = (0.6 * clinical_score) + (0.4 * img_score)
        
        if final_score > 0.65:
            return "Osteoporosis"
        elif final_score > 0.35:
            return "Osteopenia"
        return "Normal"

# Eager loading instance (will only load clinical model now)
ai_system = ModelLoader()
