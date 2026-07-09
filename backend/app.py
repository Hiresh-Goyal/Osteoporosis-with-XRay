# pyrefly: ignore [missing-import]
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import xgboost as xgb
import pandas as pd
import os
import io
from flask import send_file
import pandas as pd
import os
import tempfile
from models import db, User, PatientProfile, ClinicalRecord, Prediction, Appointment
from api_routes import api_bp
from model_loader import ai_system
from datetime import datetime

app = Flask(__name__, static_folder='../frontend/dist', static_url_path='/')

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "success",
        "message": "OsteoVerse API is running smoothly",
        "timestamp": datetime.utcnow().isoformat()
    }), 200

# Enable CORS, defaulting to all origins unless FRONTEND_URL is set in the environment
frontend_url = os.environ.get('FRONTEND_URL', '*')
allowed_origins = [frontend_url, 'http://localhost:5173', 'http://127.0.0.1:5173'] if frontend_url != '*' else '*'
CORS(app, resources={r"/*": {"origins": allowed_origins}})

# Database Configuration (Neon PostgreSQL)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://neondb_owner:npg_wD8dZUqJu4vH@ep-broad-dream-ao9mlt4w.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'default-dev-key-change-in-prod')
db.init_app(app)
jwt = JWTManager(app)

app.register_blueprint(api_bp, url_prefix='/api/v1')

import joblib

# Load Teammate's Models (With and Without DEXA)
MODELS_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))
with_dexa_path = os.path.join(MODELS_BASE_DIR, "ML_MODEL(WITH DEXA)", "best_model_pipeline.joblib")
without_dexa_path = os.path.join(MODELS_BASE_DIR, "ML_MODEL(WITHOUTDEXA)", "osteoporosis_model.pkl")
without_dexa_scaler_path = os.path.join(MODELS_BASE_DIR, "ML_MODEL(WITHOUTDEXA)", "osteoporosis_scaler.pkl")

model_with_dexa = None
features_with_dexa = None
scaler_with_dexa = None
bounds_with_dexa = None
training_means_with_dexa = {}
binary_defaults_with_dexa = {}
model_without_dexa = None
scaler_without_dexa = None

try:
    saved_dexa = joblib.load(with_dexa_path)
    model_with_dexa = saved_dexa["model"]
    features_with_dexa = saved_dexa["features"]
    
    # Load the reconstructed scaler and outlier clipping bounds
    real_scaler_path = os.path.join(MODELS_BASE_DIR, "ML_MODEL(WITH DEXA)", "real_scaler_and_bounds.joblib")
    scaler_data = joblib.load(real_scaler_path)
    scaler_with_dexa = scaler_data["scaler"]
    bounds_with_dexa = scaler_data["bounds"]
    
    # Calculate training means and binary defaults for fallback
    training_means_with_dexa = dict(zip(features_with_dexa, scaler_with_dexa.mean_))
    binary_defaults_with_dexa = {
        "calcitriol": round(training_means_with_dexa.get("calcitriol", 0)),
        "calsium": round(training_means_with_dexa.get("calsium", 0)),
        "calcitonin": round(training_means_with_dexa.get("calcitonin", 0)),
        "as": round(training_means_with_dexa.get("as", 0)),
    }
    print("SUCCESS: With-DEXA Model Loaded")
except Exception as e:
    print(f"WARNING: With-DEXA model failed to load: {e}")

try:
    model_without_dexa = joblib.load(without_dexa_path)
    scaler_without_dexa = joblib.load(without_dexa_scaler_path)
    print("SUCCESS: Without-DEXA Model and Scaler Loaded")
except Exception as e:
    print(f"WARNING: Without-DEXA model or scaler failed to load: {e}")



# --- AUTHENTICATION ROUTES ---
@app.route('/auth/register', methods=['POST'])
def register():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'Patient')
    
    if User.query.filter_by(email=email).first():
        return jsonify({"status": "error", "message": "Email address already registered"}), 400
        
    new_user = User(name=name, email=email, role=role)
    new_user.set_password(password)
    # All users are auto-approved now
    new_user.is_approved_by_admin = True
    
    db.session.add(new_user)
    db.session.flush() # Get new_user.id
    
    if role == 'Patient':
        profile = PatientProfile(
            user_id=new_user.id,
            age=0,
            gender='Unknown',
            height=0,
            weight=0,
            bmi=0,
            questionnaire_filled=False
        )
        db.session.add(profile)
        
    db.session.commit()
    
    return jsonify({"status": "success", "message": "User created successfully"}), 201

@app.route('/api/v1/patient/submit-questionnaire', methods=['POST'])
@jwt_required()
def submit_questionnaire():
    try:
        patient_id = get_jwt_identity()
        data = request.json
        
        user = User.query.filter_by(id=patient_id).first()
        profile = PatientProfile.query.filter_by(user_id=patient_id).first()
        if not profile:
            return jsonify({"status": "error", "message": "Profile not found"}), 404
            
        import random
        # Auto-assign random doctor
        doctors = User.query.filter_by(role='Doctor').all()
        assigned_doctor_id = random.choice(doctors).id if doctors else None
        
        # Build DataFrame for Without DEXA Model
        import pandas as pd
        # The ML model was trained on label-encoded integers (0 and 1), 
        # so we must map the incoming strings to match.
        def encode(val, pos_val):
            if isinstance(val, str):
                return 1 if val.lower() in [v.lower() for v in pos_val] else 0
            return int(val)

        patient_data = {
            "Age": int(data.get('Age', 0)),
            "Gender": encode(data.get('Gender', 'Male'), ['Female']),
            "Hormonal_Changes": encode(data.get('Hormonal_Changes', 'Normal'), ['Postmenopausal']),
            "Body_Weight": encode(data.get('Body_Weight', 'Normal'), ['Underweight', 'Overweight']),
            "Vitamin_D_Intake": encode(data.get('Vitamin_D_Intake', 'Sufficient'), ['Sufficient']),
            "Physical_Activity": encode(data.get('Physical_Activity', 'Active'), ['Active']),
            "Smoking": encode(data.get('Smoking', 'No'), ['Yes']),
            "Alcohol_Consumption": 0 if data.get('Alcohol_Consumption', 'None') == 'None' else 1,
            "Medications": 0 if data.get('Medications', 'None').lower() == 'none' else 1,
            "Prior_Fractures": encode(data.get('Prior_Fractures', 'No'), ['Yes']),
        }
        df_nodexa = pd.DataFrame([patient_data])
        
        # Ensure only the trained features are passed to the model
        expected_features = [
            'Age', 'Smoking', 'Physical_Activity', 'Medications', 'Vitamin_D_Intake', 
            'Hormonal_Changes', 'Gender', 'Body_Weight', 'Prior_Fractures', 'Alcohol_Consumption'
        ]
        df_nodexa = df_nodexa[expected_features]
        
        # Predict Without DEXA
        try:
            df_nodexa_scaled = scaler_without_dexa.transform(df_nodexa)
            pred = model_without_dexa.predict(df_nodexa_scaled)[0]
            initial_prediction = "High Risk" if pred == 1 else "Low Risk"
        except Exception as e:
            print("Error predicting nodexa:", e)
            initial_prediction = "Unknown Risk"
            
        profile.age = int(data.get('Age', 0))
        profile.gender = data.get('Gender', 'Unknown')
        profile.race_ethnicity = data.get('Race_Ethnicity')
        profile.body_weight = data.get('Body_Weight')
        profile.calcium_intake = data.get('Calcium_Intake')
        profile.vitamin_d_intake = data.get('Vitamin_D_Intake')
        profile.physical_activity = data.get('Physical_Activity')
        profile.smoking = data.get('Smoking')
        profile.alcohol_consumption = data.get('Alcohol_Consumption')
        profile.hormonal_changes = data.get('Hormonal_Changes')
        profile.family_history = data.get('Family_History')
        profile.medical_conditions = data.get('Medical_Conditions')
        profile.medications = data.get('Medications')
        profile.prior_fractures = data.get('Prior_Fractures')
        
        profile.assigned_doctor_id = assigned_doctor_id
        profile.initial_prediction = initial_prediction
        profile.questionnaire_filled = True
        
        # Reset previous doctor actions since this is a new assessment
        profile.doctor_request = None
        profile.prescribed_medication = None
        profile.final_prediction = None
        profile.is_discharged = False
        
        appointment = Appointment(
            patient_id=profile.id,
            doctor_id=assigned_doctor_id,
            status="Waiting for Intake"
        )
        db.session.add(appointment)
        db.session.commit()
        
        return jsonify({"status": "success", "prediction": initial_prediction, "message": "Questionnaire submitted"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/v1/admin/users', methods=['GET'])
@jwt_required()
def admin_get_users():
    try:
        admin_id = get_jwt_identity()
        admin = User.query.filter_by(id=admin_id).first()
        if not admin or admin.role != 'Admin':
            return jsonify({"status": "error", "message": "Unauthorized"}), 403
            
        users = User.query.all()
        res = [{"id": u.id, "name": u.name, "email": u.email, "role": u.role} for u in users if u.id != admin_id]
        return jsonify({"status": "success", "users": res})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/v1/admin/remove-user/<user_id>', methods=['DELETE'])
@jwt_required()
def admin_remove_user(user_id):
    try:
        admin_id = get_jwt_identity()
        admin = User.query.filter_by(id=admin_id).first()
        if not admin or admin.role != 'Admin':
            return jsonify({"status": "error", "message": "Unauthorized"}), 403
            
        user = User.query.filter_by(id=user_id).first()
        if not user:
            return jsonify({"status": "error", "message": "User not found"}), 404
            
        # Optional: cleanup patient profile or let cascading handle it if configured
        if user.role == 'Patient':
            profile = PatientProfile.query.filter_by(user_id=user_id).first()
            if profile:
                Appointment.query.filter_by(patient_id=profile.id).delete()
                db.session.delete(profile)
        elif user.role == 'Doctor':
            # Unassign from patients
            PatientProfile.query.filter_by(assigned_doctor_id=user.id).update({'assigned_doctor_id': None})
            
        db.session.delete(user)
        db.session.commit()
        return jsonify({"status": "success", "message": "User removed successfully"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/v1/patient/profile', methods=['GET'])
@jwt_required()
def get_patient_profile():
    try:
        patient_id = get_jwt_identity()
        profile = PatientProfile.query.filter_by(user_id=patient_id).first()
        if not profile:
            return jsonify({"status": "error", "message": "Profile not found"}), 404
            
        return jsonify({
            "status": "success",
            "profile": {
                "questionnaire_filled": profile.questionnaire_filled,
                "initial_prediction": profile.initial_prediction,
                "doctor_request": profile.doctor_request,
                "final_prediction": profile.final_prediction,
                "prescribed_medication": profile.prescribed_medication,
                "pdf_url": profile.pdf_report_url,
                "appointment_requested": profile.appointment_requested,
                "appointment_time": profile.appointment_time
            }
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/v1/public/doctors', methods=['GET'])
def get_public_doctors():
    doctors = User.query.filter_by(role='Doctor').all()
    res = [{"id": d.id, "name": d.name} for d in doctors]
    return jsonify({"status": "success", "doctors": res})

@app.route('/api/v1/admin/patient-assignments', methods=['GET'])
# @jwt_required() # For simplicity and testing without token passing
def get_patient_assignments():
    try:
        profiles = PatientProfile.query.filter_by(questionnaire_filled=True).all()
        doctors = User.query.filter_by(role='Doctor').all()
        doc_map = {d.id: d.name for d in doctors}
        
        patients = []
        for p in profiles:
            user = User.query.filter_by(id=p.user_id).first()
            if user:
                patients.append({
                    "patient_id": p.id,
                    "patient_name": user.name,
                    "assigned_doctor_id": p.assigned_doctor_id,
                    "assigned_doctor_name": doc_map.get(p.assigned_doctor_id, "Unassigned")
                })
        
        return jsonify({
            "status": "success", 
            "patients": patients,
            "doctors": [{"id": d.id, "name": d.name} for d in doctors]
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/v1/admin/assign-doctor', methods=['POST'])
# @jwt_required()
def admin_assign_doctor():
    try:
        data = request.json
        patient_id = data.get('patient_id')
        doctor_id = data.get('doctor_id')
        
        if not patient_id or not doctor_id:
            return jsonify({"status": "error", "message": "Missing patient_id or doctor_id"}), 400
            
        profile = PatientProfile.query.filter_by(id=patient_id).first()
        if not profile:
            return jsonify({"status": "error", "message": "Patient not found"}), 404
            
        profile.assigned_doctor_id = doctor_id
        db.session.commit()
        
        return jsonify({"status": "success", "message": "Doctor assigned successfully"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/v1/doctor/patients', methods=['GET'])
@jwt_required()
def get_doctor_patients():
    try:
        doctor_id = get_jwt_identity()
        profiles = PatientProfile.query.filter_by(assigned_doctor_id=doctor_id).all()
        res = []
        for p in profiles:
            user = User.query.filter_by(id=p.user_id).first()
            if user:
                res.append({
                    "id": p.id,
                    "name": user.name,
                    "age": p.age,
                    "initialRisk": p.initial_prediction,
                    "request": p.doctor_request,
                    "questionnaire_filled": p.questionnaire_filled,
                    "final_prediction": p.final_prediction,
                    "pdf_url": p.pdf_report_url,
                    "prescribed_medication": p.prescribed_medication,
                    "appointment_requested": p.appointment_requested,
                    "appointment_time": p.appointment_time
                })
        return jsonify({"status": "success", "patients": res})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/v1/doctor/stats', methods=['GET'])
@jwt_required()
def get_doctor_stats():
    try:
        doctor_id = get_jwt_identity()
        from datetime import datetime
        
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        gender = request.args.get('gender')
        age_group = request.args.get('age_group')
        
        query = PatientProfile.query.filter_by(assigned_doctor_id=doctor_id)
        
        if date_from:
            query = query.filter(PatientProfile.created_at >= datetime.strptime(date_from, '%Y-%m-%d'))
        if date_to:
            query = query.filter(PatientProfile.created_at <= datetime.strptime(date_to + ' 23:59:59', '%Y-%m-%d %H:%M:%S'))
        
        if gender and gender != 'All':
            query = query.filter(PatientProfile.gender == gender)
            
        if age_group and age_group != 'All':
            if age_group == 'Teenager (0-17)':
                query = query.filter(PatientProfile.age >= 0, PatientProfile.age <= 17)
            elif age_group == 'Young Adult (18-25)':
                query = query.filter(PatientProfile.age >= 18, PatientProfile.age <= 25)
            elif age_group == 'Adult (26-64)':
                query = query.filter(PatientProfile.age >= 26, PatientProfile.age <= 64)
            elif age_group == 'Senior Citizen (65+)':
                query = query.filter(PatientProfile.age >= 65)
        
        profiles = query.all()
        
        total = len(profiles)
        osteoporosis = sum(1 for p in profiles if p.final_prediction == 'Osteoporosis')
        osteopenia = sum(1 for p in profiles if p.final_prediction == 'Osteopenia')
        healthy = sum(1 for p in profiles if p.final_prediction == 'Healthy' or p.final_prediction == 'Normal')
        high_risk = sum(1 for p in profiles if p.initial_prediction == 'High Risk')
        low_risk = sum(1 for p in profiles if p.initial_prediction == 'Low Risk')
        reviewed = sum(1 for p in profiles if p.doctor_request == 'Reviewed')
        pending = total - reviewed
        with_dexa = sum(1 for p in profiles if p.final_prediction is not None)
        
        return jsonify({
            "status": "success",
            "stats": {
                "total_patients": total,
                "osteoporosis": osteoporosis,
                "osteopenia": osteopenia,
                "healthy": healthy,
                "high_risk_initial": high_risk,
                "low_risk_initial": low_risk,
                "reviewed": reviewed,
                "pending_review": pending,
                "dexa_completed": with_dexa
            }
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
@app.route('/auth/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    user = User.query.filter_by(email=email).first()
    
    if not user or not user.check_password(password):
        return jsonify({"status": "error", "message": "Invalid email or password"}), 401
        

        
    access_token = create_access_token(identity=user.id, additional_claims={"role": user.role, "name": user.name})
    return jsonify({
        "status": "success", 
        "token": access_token, 
        "user": {"id": user.id, "name": user.name, "role": user.role}
    }), 200


@app.route('/api/v1/doctor/request_action', methods=['POST'])
@jwt_required()
def request_action():
    try:
        doctor_id = get_jwt_identity()
        data = request.json
        patient_id = data.get('patient_id')
        action = data.get('action') # 'DEXA', 'XRay', 'Discharged'
        medication = data.get('medication')
        
        patient = PatientProfile.query.filter_by(id=patient_id).first()
        if not patient:
            return jsonify({"status": "error", "message": "Patient not found"}), 404
            
        if action:
            patient.doctor_request = action
            if action == 'Discharged':
                patient.is_discharged = True
                
        if medication:
            patient.prescribed_medication = medication
            
        db.session.commit()
        return jsonify({"status": "success", "message": f"Action updated successfully"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/v1/patient/request-appointment', methods=['POST'])
@jwt_required()
def request_appointment():
    try:
        patient_id = get_jwt_identity()
        profile = PatientProfile.query.filter_by(user_id=patient_id).first()
        if not profile:
            return jsonify({"status": "error", "message": "Profile not found"}), 404
            
        profile.appointment_requested = True
        db.session.commit()
        return jsonify({"status": "success", "message": "Appointment requested successfully"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/v1/doctor/assign-appointment', methods=['POST'])
@jwt_required()
def assign_appointment():
    try:
        doctor_id = get_jwt_identity()
        data = request.json
        patient_id = data.get('patient_id')
        appointment_time = data.get('appointment_time')
        
        patient = PatientProfile.query.filter_by(id=patient_id).first()
        if not patient:
            return jsonify({"status": "error", "message": "Patient not found"}), 404
            
        patient.appointment_time = appointment_time
        db.session.commit()
        return jsonify({"status": "success", "message": "Appointment assigned"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/v1/doctor/analyze-xray', methods=['POST'])
@jwt_required()
def analyze_xray():
    try:
        if model_without_dexa is None:
            return jsonify({"status": "error", "message": "ML model (without DEXA) is not loaded on the server. Please check server logs."}), 503
        doctor_id = get_jwt_identity()
        if 'image' not in request.files:
            return jsonify({"status": "error", "message": "No image file provided"}), 400
            
        file = request.files['image']
        patient_id = request.form.get('patient_id')
        
        if file.filename == '':
            return jsonify({"status": "error", "message": "No selected file"}), 400
            
        patient = PatientProfile.query.filter_by(id=patient_id).first()
        if not patient:
            return jsonify({"status": "error", "message": "Patient not found"}), 404

        # Save to temp file
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, file.filename)
        file.save(temp_path)
        
        # --- 1. Get DL Model (X-Ray) Probability ---
        dl_prediction_label, dl_probs = ai_system.predict_image(temp_path)
        # Assuming classes are ['Normal', 'Osteopenia', 'Osteoporosis']
        # Map to a risk score between 0 and 1
        dl_risk_score = dl_probs[2] + (dl_probs[1] * 0.5) 
        
        # --- 2. Get ML Model (Without DEXA) Probability ---
        def encode(val, pos_val):
            if isinstance(val, str):
                return 1 if val.lower() in [v.lower() for v in pos_val] else 0
            return int(val) if val else 0

        patient_data = {
            "Age": int(patient.age or 0),
            "Gender": encode(patient.gender, ['Female']),
            "Hormonal_Changes": encode(patient.hormonal_changes, ['Postmenopausal']),
            "Body_Weight": encode(patient.body_weight, ['Underweight', 'Overweight']),
            "Vitamin_D_Intake": encode(patient.vitamin_d_intake, ['Sufficient']),
            "Physical_Activity": encode(patient.physical_activity, ['Active']),
            "Smoking": encode(patient.smoking, ['Yes']),
            "Alcohol_Consumption": 0 if str(patient.alcohol_consumption).lower() == 'none' else 1,
            "Medications": 0 if str(patient.medications).lower() == 'none' else 1,
            "Prior_Fractures": encode(patient.prior_fractures, ['Yes']),
        }
        df_nodexa = pd.DataFrame([patient_data])
        expected_features = [
            'Age', 'Smoking', 'Physical_Activity', 'Medications', 'Vitamin_D_Intake', 
            'Hormonal_Changes', 'Gender', 'Body_Weight', 'Prior_Fractures', 'Alcohol_Consumption'
        ]
        df_nodexa = df_nodexa[expected_features]
        df_nodexa_scaled = scaler_without_dexa.transform(df_nodexa)
        
        ml_probs = model_without_dexa.predict_proba(df_nodexa_scaled)[0]
        ml_risk_score = ml_probs[1] # Probability of class 1 (High Risk)
        
        # --- 3. Average Predictions ---
        final_prob = (dl_risk_score + ml_risk_score) / 2.0
        final_prediction = "High Risk" if final_prob > 0.5 else "Low Risk"
        percentage = round(final_prob * 100, 2)
        
        # Clean up
        try:
            os.remove(temp_path)
            os.rmdir(temp_dir)
        except Exception:
            pass
            
        # Update Patient Profile
        patient.xray_risk_score = float(dl_risk_score)
        patient.clinical_risk_score = float(ml_risk_score)
        patient.final_prediction = final_prediction
        patient.doctor_request = None
        db.session.commit()
        
        return jsonify({
            "status": "success", 
            "prediction": final_prediction,
            "confidence": percentage,
            "dl_prediction": dl_prediction_label,
            "pdf_url": f"/reports/report_{patient_id}.pdf",
            "message": "X-Ray analyzed successfully"
        })
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"ERROR in analyze_xray: {error_detail}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/v1/predict/ml-dexa', methods=['POST'])
@jwt_required()
def predict_ml_dexa():
    try:
        doctor_id = get_jwt_identity()
        data = request.json
        patient_id = data.get('patient_id')
        
        # Build dictionary for the model
        import pandas as pd
        patient_data = {
            "fnt": float(data.get('fnt', 0)),
            "calcitriol": float(data.get('calcitriol', 0)),
            "uric": float(data.get('uric', 0)),
            "alt": float(data.get('alt', 0)),
            "bun": float(data.get('bun', 0)),
            "crea": float(data.get('crea', 0)),
            "fbg": float(data.get('fbg', 0)),
            "ldl_c": float(data.get('ldl_c', 0)),
            "l1_4t": float(data.get('l1_4t', 0)),
            "age": float(data.get('age', 0)),
            "hdl_c": float(data.get('hdl_c', 0)),
            "bmi": float(data.get('bmi', 0)),
            "ca": float(data.get('ca', 0)),
            "p": float(data.get('p', 0)),
            "height": float(data.get('height', 0)),
            "ast": float(data.get('ast', 0)),
            "weight": float(data.get('weight', 0)),
            "calsium": float(data.get('calsium', 0)),
            "calcitonin": float(data.get('calcitonin', 0)),
            "as": float(data.get('as_', 0))
        }
        
        # Auto-calculate BMI from height and weight
        height_cm = float(data.get('height', 0))
        weight_kg = float(data.get('weight', 0))
        if height_cm > 0 and weight_kg > 0:
            height_m = height_cm / 100.0
            patient_data['bmi'] = round(weight_kg / (height_m * height_m), 2)
            
        fnt_val = patient_data["fnt"]
        l1_4t_val = patient_data["l1_4t"]
        
        # 1. T-score validation & auto-conversion
        for label, raw, setter in [("fnt", patient_data["fnt"], "fnt"), ("l1_4t", patient_data["l1_4t"], "l1_4t")]:
            if raw > 3.0:
                if raw <= 6.0:
                    corrected = -raw
                elif raw <= 20.0:
                    corrected = -raw
                else:
                    corrected = training_means_with_dexa.get(label, 0)
                if setter == "fnt":
                    fnt_val = corrected
                else:
                    l1_4t_val = corrected
                    
        # 2. Binary validation & auto-conversion
        binary_fields = {
            "calcitriol": patient_data["calcitriol"],
            "calsium": patient_data["calsium"],
            "calcitonin": patient_data["calcitonin"],
            "as": patient_data["as"]
        }
        
        sanitized_binary = {}
        for field, val in binary_fields.items():
            if val not in [0.0, 1.0]:
                if val > 1.0:
                    sanitized_val = float(binary_defaults_with_dexa.get(field, 0))
                else:
                    sanitized_val = 1.0 if val >= 0.5 else 0.0
                sanitized_binary[field] = sanitized_val
            else:
                sanitized_binary[field] = val
                
        # 3. Unit Conversions (US -> SI)
        patient_data["fnt"] = fnt_val
        patient_data["l1_4t"] = l1_4t_val
        patient_data["calcitriol"] = sanitized_binary["calcitriol"]
        patient_data["calsium"] = sanitized_binary["calsium"]
        patient_data["calcitonin"] = sanitized_binary["calcitonin"]
        patient_data["as"] = sanitized_binary["as"]
        
        patient_data["uric"] = patient_data["uric"] * 59.48
        patient_data["crea"] = patient_data["crea"] * 88.42
        patient_data["fbg"] = patient_data["fbg"] / 18.016
        patient_data["ldl_c"] = patient_data["ldl_c"] / 38.67
        patient_data["hdl_c"] = patient_data["hdl_c"] / 38.67
        patient_data["ca"] = patient_data["ca"] * 0.2495
        patient_data["p"] = patient_data["p"] * 0.3229
        patient_data["bun"] = patient_data["bun"] / 2.80
        
        df = pd.DataFrame([patient_data])
        
        # 4. Outlier Clipping
        for col, (lower, upper) in bounds_with_dexa.items():
            if col in df.columns:
                val = float(df.loc[0, col])
                if val < lower or val > upper:
                    df.loc[0, col] = min(max(val, lower), upper)

        df = df[features_with_dexa]
        print("\n=== DEBUG DEXA PREDICTION INPUT ===")
        print("Raw doctor input:", request.json)
        print("Formatted patient dataframe:\n", df)
        df_scaled = scaler_with_dexa.transform(df)
        print("Scaled features:\n", df_scaled)
        
        dexa_probs = model_with_dexa.predict_proba(df_scaled)[0]
        print("Model output probabilities (Healthy, Osteoporosis):", dexa_probs)
        print("===================================\n")
        dexa_risk_score = float(dexa_probs[1])
        
        # Get ML Clinical Probability (Recalculate it)
        patient = PatientProfile.query.filter_by(id=patient_id).first()
        if not patient:
            return jsonify({"status": "error", "message": "Patient not found"}), 404
            
        def encode(val, pos_val):
            if isinstance(val, str):
                return 1 if val.lower() in [v.lower() for v in pos_val] else 0
            return int(val) if val else 0
            
        clinical_data = {
            "Age": int(patient.age or 0),
            "Gender": encode(patient.gender, ['Female']),
            "Hormonal_Changes": encode(patient.hormonal_changes, ['Postmenopausal']),
            "Body_Weight": encode(patient.body_weight, ['Underweight', 'Overweight']),
            "Vitamin_D_Intake": encode(patient.vitamin_d_intake, ['Sufficient']),
            "Physical_Activity": encode(patient.physical_activity, ['Active']),
            "Smoking": encode(patient.smoking, ['Yes']),
            "Alcohol_Consumption": 0 if str(patient.alcohol_consumption).lower() == 'none' else 1,
            "Medications": 0 if str(patient.medications).lower() == 'none' else 1,
            "Prior_Fractures": encode(patient.prior_fractures, ['Yes']),
        }
        df_clinical = pd.DataFrame([clinical_data])
        expected_features = [
            'Age', 'Smoking', 'Physical_Activity', 'Medications', 'Vitamin_D_Intake', 
            'Hormonal_Changes', 'Gender', 'Body_Weight', 'Prior_Fractures', 'Alcohol_Consumption'
        ]
        df_clinical = df_clinical[expected_features]
        df_clinical_scaled = scaler_without_dexa.transform(df_clinical)
        
        ml_probs = model_without_dexa.predict_proba(df_clinical_scaled)[0]
        ml_risk_score = float(ml_probs[1])
        
        # Average with X-Ray DL probability if entered (exluding the triage questionnaire score)
        scores_to_average = [dexa_risk_score]
        if patient.xray_risk_score is not None:
            scores_to_average.append(patient.xray_risk_score)
            
        final_prob = sum(scores_to_average) / len(scores_to_average)
        
        result = "Osteoporosis" if final_prob > 0.5 else "Healthy"
        confidence = round(final_prob * 100, 2)
        
        # Update Database
        patient.final_prediction = result
        patient.pdf_report_url = f"/reports/report_{patient_id}.pdf" # Mock PDF url
        patient.doctor_request = None
        db.session.commit()
        
        return jsonify({
            "status": "success", 
            "prediction": result,
            "confidence": confidence,
            "probabilities": {
                "Healthy": round((1 - final_prob) * 100, 2),
                "Osteoporosis": confidence
            },
            "pdf_url": patient.pdf_report_url,
            "message": "DEXA Prediction successful with model fusion"
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/reports/report_<patient_id>.pdf', methods=['GET'])
def download_report(patient_id):
    patient = PatientProfile.query.filter_by(id=patient_id).first()
    if not patient:
        return jsonify({"status": "error", "message": "Patient not found"}), 404
    user = User.query.filter_by(id=patient.user_id).first()
        
    try:
        from fpdf import FPDF
        pdf = FPDF()
        pdf.add_page()
        
        # Header
        pdf.set_font("Arial", 'B', 20)
        pdf.set_text_color(13, 148, 136) # Teal color
        pdf.cell(0, 15, txt="OsteoCare Medical Report", ln=1, align='C')
        pdf.ln(5)
        
        def render_table(title, data):
            pdf.set_font("Arial", 'B', 14)
            pdf.set_text_color(30, 41, 59) # Slate 800
            pdf.cell(0, 10, txt=title, ln=1, align='L')
            
            pdf.set_font("Arial", 'B', 11)
            pdf.set_fill_color(241, 245, 249) # Slate 100
            pdf.set_text_color(71, 85, 105) # Slate 600
            
            # Draw Table
            for key, value in data.items():
                pdf.cell(80, 10, txt=f" {key}", border=1, fill=True)
                
                pdf.set_font("Arial", '', 11)
                pdf.set_fill_color(255, 255, 255)
                pdf.set_text_color(15, 23, 42) # Slate 900
                pdf.cell(110, 10, txt=f" {value}", border=1, ln=1, fill=True)
                
                pdf.set_font("Arial", 'B', 11)
                pdf.set_fill_color(241, 245, 249)
                pdf.set_text_color(71, 85, 105)
                
            pdf.ln(8)

        # Patient Details
        patient_data = {
            "Patient Name": user.name if user else 'Unknown',
            "Age": str(patient.age),
            "Gender": patient.gender,
            "Race/Ethnicity": patient.race_ethnicity or "N/A"
        }
        render_table("Patient Demographics", patient_data)
        
        # Clinical Questionnaire (Select fields)
        clinical_data = {
            "Body Weight Category": patient.body_weight or "N/A",
            "Physical Activity": patient.physical_activity or "N/A",
            "Smoking History": patient.smoking or "N/A",
            "Prior Fractures": patient.prior_fractures or "N/A"
        }
        render_table("Clinical Questionnaire", clinical_data)
        
        # DEXA & Assessment
        assessment_data = {
            "Initial AI Risk (No DEXA)": patient.initial_prediction or "N/A",
            "Final AI Prediction (DEXA)": patient.final_prediction or "Pending",
        }
        if patient.bmi:
            assessment_data["Calculated BMI"] = str(patient.bmi)
        render_table("AI Assessment & DEXA Results", assessment_data)
        
        # Doctor Notes
        notes_data = {
            "Prescribed Plan / Advice": patient.prescribed_medication or "None",
            "Next Scheduled Appointment": str(patient.appointment_time) if patient.appointment_time else "Not scheduled"
        }
        render_table("Doctor's Notes & Plan", notes_data)
        
        pdf_bytes = pdf.output(dest='S').encode('latin-1')
        return send_file(io.BytesIO(pdf_bytes), mimetype='application/pdf', download_name=f'report_{patient_id}.pdf', as_attachment=True)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- REACT SPA ROUTING ---
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return app.send_static_file(path)
    else:
        return app.send_static_file('index.html')
# -------------------------



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=7860, debug=True)
