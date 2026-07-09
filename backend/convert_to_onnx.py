import torch
from torchvision import models
import torch.nn as nn
import os

print("Loading model...")
device = torch.device('cpu')
model = models.densenet121()
num_ftrs = model.classifier.in_features
model.classifier = nn.Sequential(
    nn.Dropout(0.5),
    nn.Linear(num_ftrs, 256),
    nn.ReLU(),
    nn.Dropout(0.5),
    nn.Linear(256, 3)
)

model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../models/densenet121_best.pth'))
model.load_state_dict(torch.load(model_path, map_location=device))
model.eval()

print("Converting to ONNX...")
dummy_input = torch.randn(1, 3, 224, 224)
onnx_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../models/densenet121.onnx'))
torch.onnx.export(
    model, 
    dummy_input, 
    onnx_path, 
    export_params=True, 
    opset_version=11, 
    do_constant_folding=True, 
    input_names=['input'], 
    output_names=['output'], 
    dynamic_axes={'input':{0:'batch_size'}, 'output':{0:'batch_size'}}
)
print("ONNX Export Success!")
