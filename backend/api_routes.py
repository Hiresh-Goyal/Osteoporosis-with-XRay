import os
from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import random

from models import (
    db, User, PatientProfile, ClinicalRecord, Prediction, 
    Appointment, VisitHistory, Medication, MedicationLog, 
    ExerciseLink, DietLog, HealthReport
)

api_bp = Blueprint('api_bp', __name__)

# --- 1. QUEUE & ONBOARDING (Smart Load Balancing) ---

@api_bp.route('/doctors', methods=['GET'])
def get_doctors():
    doctors = User.query.filter_by(role='Doctor').all()
    result = [{"id": d.id, "name": d.name} for d in doctors]
    return jsonify({"status": "success", "doctors": result})

@api_bp.route('/patient/onboard', methods=['POST'])
def onboard_patient():
    data = request.json
    patient_id = data.get('patient_id')
    selected_doctor_id = data.get('doctor_id')
    
    age = int(data.get('age', 0))
    pain_level = int(data.get('pain_level', 1))
    
    priority = "Least Urgent"
    if age > 65 or pain_level >= 7:
        priority = "Urgent"
    elif age > 50 or pain_level >= 4:
        priority = "Less Urgent"
        
    profile = PatientProfile.query.filter_by(user_id=patient_id).first()
    if not profile:
        profile = PatientProfile(
            user_id=patient_id,
            assigned_doctor_id=selected_doctor_id,
            age=age,
            gender=data.get('gender', 'Unknown'),
            height=data.get('height', 0),
            weight=data.get('weight', 0),
            bmi=data.get('bmi', 0),
            priority_rank=priority
        )
        db.session.add(profile)
        db.session.commit()
    else:
        profile.priority_rank = priority
        profile.assigned_doctor_id = selected_doctor_id
        db.session.commit()
        
    today = datetime.utcnow().date()
    existing_appts = Appointment.query.filter_by(doctor_id=selected_doctor_id, scheduled_date=today).count()
    
    scheduled_date = today
    if existing_appts > 20: 
        scheduled_date = today + timedelta(days=1)
        existing_appts = Appointment.query.filter_by(doctor_id=selected_doctor_id, scheduled_date=scheduled_date).count()
        
    appt = Appointment(
        patient_id=profile.id,
        doctor_id=selected_doctor_id,
        status="Waiting for Intake",
        scheduled_date=scheduled_date,
        serial_number=existing_appts + 1
    )
    db.session.add(appt)
    db.session.commit()
    
    return jsonify({
        "status": "success", 
        "message": "Onboarding complete", 
        "appointment": {
            "scheduled_date": scheduled_date.strftime('%Y-%m-%d'),
            "serial_number": appt.serial_number,
            "priority": priority
        }
    })

# --- 2. DOCTOR / TECHNICIAN DASHBOARD ---

@api_bp.route('/doctor/queue/<doctor_id>', methods=['GET'])
def get_doctor_queue(doctor_id):
    appts = Appointment.query.filter(
        Appointment.doctor_id == doctor_id,
        Appointment.status != 'Completed'
    ).order_by(Appointment.scheduled_date, Appointment.serial_number).all()
    
    result = []
    for appt in appts:
        patient = PatientProfile.query.get(appt.patient_id)
        user = User.query.get(patient.user_id)
        result.append({
            "appointment_id": appt.id,
            "patient_id": patient.id,
            "patient_name": user.name,
            "age": patient.age,
            "priority": patient.priority_rank,
            "status": appt.status,
            "serial_number": appt.serial_number,
            "scheduled_date": appt.scheduled_date.strftime('%Y-%m-%d') if appt.scheduled_date else None
        })
        
    return jsonify({"status": "success", "queue": result})

@api_bp.route('/imaging/upload', methods=['POST'])
def upload_xray():
    if 'file' not in request.files:
        return jsonify({"status": "error", "message": "No image file provided"}), 400
        
    file = request.files['file']
    patient_id = request.form.get('patient_id')
    appointment_id = request.form.get('appointment_id')
    
    if dl_model is None:
        return jsonify({"status": "error", "message": "Deep Learning model is not loaded"}), 500
        
    try:
        image = Image.open(file.stream).convert('RGB')
        input_tensor = img_transforms(image).unsqueeze(0) 
        input_tensor = input_tensor.to(device)
        
        with torch.no_grad():
            outputs = dl_model(input_tensor)
            probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
            
        confidence, predicted_idx = torch.max(probabilities, 0)
        classes = ["Normal", "Osteopenia", "Osteoporosis"]
        result = classes[predicted_idx.item()]
        conf_percentage = round(confidence.item() * 100, 2)
        
        if appointment_id:
            appt = Appointment.query.get(appointment_id)
            if appt:
                appt.status = "Waiting for Doctor"
                db.session.commit()
                
        prediction = Prediction(
            patient_id=patient_id,
            branch="Branch C (DenseNet X-Ray)",
            diagnosis=result,
            confidence=conf_percentage
        )
        db.session.add(prediction)
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "prediction": result,
            "confidence": conf_percentage,
            "heatmap_generated": True 
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@api_bp.route('/doctor/prescribe', methods=['POST'])
def prescribe_medication():
    data = request.json
    patient_id = data.get('patient_id')
    doctor_id = data.get('doctor_id')
    appointment_id = data.get('appointment_id')
    medications = data.get('medications', []) 
    duration_minutes = data.get('duration_minutes', 15)
    
    for med in medications:
        new_med = Medication(
            patient_id=patient_id,
            doctor_id=doctor_id,
            name=med.get('name'),
            dosage=med.get('dosage'),
            duration_days=med.get('days', 30)
        )
        db.session.add(new_med)
        
    visit = VisitHistory(
        patient_id=patient_id,
        doctor_id=doctor_id,
        duration_minutes=duration_minutes,
        ai_visit_summary=f"Doctor prescribed {len(medications)} medications."
    )
    db.session.add(visit)
    
    if appointment_id:
        appt = Appointment.query.get(appointment_id)
        if appt:
            appt.status = "Completed"
            
    db.session.commit()
    return jsonify({"status": "success", "message": "Prescription generated and visit logged"})

@api_bp.route('/qm/patients', methods=['GET'])
def qm_get_patients():
    patients = PatientProfile.query.filter_by(is_discharged=False).all()
    result = []
    for p in patients:
        user = User.query.get(p.user_id)
        result.append({
            "patient_id": p.id,
            "name": user.name,
            "priority": p.priority_rank
        })
    return jsonify({"status": "success", "patients": result})

@api_bp.route('/qm/assign_exercise', methods=['POST'])
def qm_assign_exercise():
    data = request.json
    new_ex = ExerciseLink(
        patient_id=data.get('patient_id'),
        qm_id=data.get('qm_id'),
        url=data.get('url'),
        description=data.get('description'),
        assigned_date=datetime.strptime(data.get('date'), '%Y-%m-%d').date()
    )
    db.session.add(new_ex)
    db.session.commit()
    return jsonify({"status": "success", "message": "Exercise assigned"})

@api_bp.route('/patient/profile/<user_id>', methods=['GET'])
def get_patient_profile(user_id):
    profile = PatientProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        return jsonify({"status": "error", "message": "Profile not found"}), 404
        
    appts = Appointment.query.filter_by(patient_id=profile.id).order_by(Appointment.created_at.desc()).all()
    status = appts[0].status if appts else "Pending"
    serial = appts[0].serial_number if appts else None
    
    return jsonify({
        "status": "success",
        "profile": {
            "id": profile.id,
            "age": profile.age,
            "gender": profile.gender,
            "height": profile.height,
            "weight": profile.weight,
            "bmi": profile.bmi,
            "urgency_level": profile.priority_rank,
            "appointment_status": status
        },
        "serial_number": serial
    })

@api_bp.route('/patient/data/<patient_id>', methods=['GET'])
def get_patient_data(patient_id):
    # Quick endpoint to fetch all patient specific data
    meds = Medication.query.filter_by(patient_id=patient_id).all()
    diets = DietLog.query.filter_by(patient_id=patient_id).order_by(DietLog.logged_at.desc()).all()
    reports = HealthReport.query.filter_by(patient_id=patient_id).order_by(HealthReport.created_at.desc()).all()
    exercises = ExerciseLink.query.filter_by(patient_id=patient_id).all()
    
    return jsonify({
        "status": "success",
        "medications": [{"name": m.name, "dosage": m.dosage} for m in meds],
        "diets": [{"meal": d.meal_description, "feedback": d.ai_feedback} for d in diets],
        "reports": [{"pain": r.pain_level, "summary": r.ai_summary} for r in reports],
        "exercises": [{"url": e.url, "description": e.description} for e in exercises]
    })
