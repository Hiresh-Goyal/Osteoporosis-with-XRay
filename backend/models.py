from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

def generate_uuid():
    return str(uuid.uuid4())

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    role = db.Column(db.String(50), nullable=False) # Admin, Doctor, Patient, QueryManager
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    is_approved_by_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class PatientProfile(db.Model):
    __tablename__ = 'patient_profiles'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    assigned_doctor_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True) # For Load Balancing
    
    # Demographics & Lifestyle (Branch A & B Common)
    age = db.Column(db.Integer, nullable=False)
    gender = db.Column(db.String(20), nullable=False)
    race_ethnicity = db.Column(db.String(100), nullable=True)
    
    # Optional quantitative fields for Doctor DEXA input
    height = db.Column(db.Float, nullable=True)
    weight = db.Column(db.Float, nullable=True)
    bmi = db.Column(db.Float, nullable=True)
    
    # Categorical Questionnaire Fields
    body_weight = db.Column(db.String(50), nullable=True)
    calcium_intake = db.Column(db.String(50), nullable=True)
    vitamin_d_intake = db.Column(db.String(50), nullable=True)
    physical_activity = db.Column(db.String(50), nullable=True)
    smoking = db.Column(db.String(50), nullable=True)
    alcohol_consumption = db.Column(db.String(50), nullable=True)
    hormonal_changes = db.Column(db.String(50), nullable=True)
    family_history = db.Column(db.String(50), nullable=True)
    medical_conditions = db.Column(db.String(200), nullable=True)
    medications = db.Column(db.String(200), nullable=True)
    prior_fractures = db.Column(db.String(50), nullable=True)
    
    priority_rank = db.Column(db.String(20), default="Medium")
    is_discharged = db.Column(db.Boolean, default=False)
    discharge_feedback = db.Column(db.Text, nullable=True)
    
    # New Simplified Flow Fields
    xray_risk_score = db.Column(db.Float, nullable=True)
    clinical_risk_score = db.Column(db.Float, nullable=True)
    initial_prediction = db.Column(db.String(100), nullable=True) # High Risk / Low Risk
    doctor_request = db.Column(db.String(100), nullable=True) # None, DEXA, XRay, Discharged
    final_prediction = db.Column(db.String(100), nullable=True) # Healthy / Osteoporosis
    pdf_report_url = db.Column(db.String(255), nullable=True)
    
    questionnaire_filled = db.Column(db.Boolean, default=False)
    prescribed_medication = db.Column(db.Text, nullable=True)
    
    # Appointment Feature
    appointment_requested = db.Column(db.Boolean, default=False)
    appointment_time = db.Column(db.String(100), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Appointment(db.Model):
    __tablename__ = 'appointments'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    patient_id = db.Column(db.String(36), db.ForeignKey('patient_profiles.id'), nullable=False)
    doctor_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    status = db.Column(db.String(50), default="Waiting for Intake") # Waiting for Intake, Waiting for Doctor, Waiting for X-Ray, Completed
    scheduled_date = db.Column(db.Date, nullable=True) # AI assigns nearest date based on priority
    serial_number = db.Column(db.Integer, nullable=True) # Order of the day
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class VisitHistory(db.Model):
    __tablename__ = 'visit_history'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    patient_id = db.Column(db.String(36), db.ForeignKey('patient_profiles.id'), nullable=False)
    doctor_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    visit_date = db.Column(db.DateTime, default=datetime.utcnow)
    duration_minutes = db.Column(db.Integer, nullable=True) # Track how long they were under control
    ai_visit_summary = db.Column(db.Text, nullable=True) # AI automation sync between QM/Doctor
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ClinicalRecord(db.Model):
    __tablename__ = 'clinical_records'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    patient_id = db.Column(db.String(36), db.ForeignKey('patient_profiles.id'), nullable=False)
    # Additional metrics if needed can be added here
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Prediction(db.Model):
    __tablename__ = 'predictions'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    patient_id = db.Column(db.String(36), db.ForeignKey('patient_profiles.id'), nullable=False)
    clinical_record_id = db.Column(db.String(36), db.ForeignKey('clinical_records.id'), nullable=True)
    
    branch = db.Column(db.String(50), nullable=False) # Branch A vs Branch B
    diagnosis = db.Column(db.String(50), nullable=False) # Normal, Osteopenia, Osteoporosis
    confidence = db.Column(db.Float, nullable=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Medication(db.Model):
    __tablename__ = 'medications'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    patient_id = db.Column(db.String(36), db.ForeignKey('patient_profiles.id'), nullable=False)
    doctor_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    dosage = db.Column(db.String(100), nullable=True)
    duration_days = db.Column(db.Integer, nullable=False, default=30)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class MedicationLog(db.Model):
    __tablename__ = 'medication_logs'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    patient_id = db.Column(db.String(36), db.ForeignKey('patient_profiles.id'), nullable=False)
    medication_id = db.Column(db.String(36), db.ForeignKey('medications.id'), nullable=False)
    taken_date = db.Column(db.Date, nullable=False)
    is_taken = db.Column(db.Boolean, default=False)

class ExerciseLink(db.Model):
    __tablename__ = 'exercise_links'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    patient_id = db.Column(db.String(36), db.ForeignKey('patient_profiles.id'), nullable=False)
    qm_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    url = db.Column(db.String(255), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    assigned_date = db.Column(db.Date, nullable=False)
    is_completed = db.Column(db.Boolean, default=False)

class DietLog(db.Model):
    __tablename__ = 'diet_logs'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    patient_id = db.Column(db.String(36), db.ForeignKey('patient_profiles.id'), nullable=False)
    meal_description = db.Column(db.Text, nullable=False)
    ai_feedback = db.Column(db.Text, nullable=True)
    logged_at = db.Column(db.DateTime, default=datetime.utcnow)

class HealthReport(db.Model):
    __tablename__ = 'health_reports'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    patient_id = db.Column(db.String(36), db.ForeignKey('patient_profiles.id'), nullable=False)
    pain_level = db.Column(db.Integer, nullable=False) # 1-10
    symptoms = db.Column(db.Text, nullable=True)
    ai_summary = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
