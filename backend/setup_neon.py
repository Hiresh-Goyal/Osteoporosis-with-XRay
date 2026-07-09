from app import app, db
from models import User, PatientProfile
import time

def setup_db():
    with app.app_context():
        # Drop all tables and recreate them
        print("Dropping existing tables...")
        db.drop_all()
        print("Creating tables...")
        db.create_all()
        
        print("Seeding initial users...")
        
        # Admin User
        admin = User(name='System Admin', email='admin@osteoverse.com', role='Admin', is_approved_by_admin=True)
        admin.set_password('admin123')
        db.session.add(admin)
        
        # Doctor User
        doctor = User(name='Dr. Smith', email='doctor@osteoverse.com', role='Doctor', is_approved_by_admin=True)
        doctor.set_password('doctor123')
        db.session.add(doctor)
        
        db.session.commit() # Commit to get doctor.id
        
        # Patient 1
        patient1 = User(name='Sarah Johnson', email='patient1@example.com', role='Patient', is_approved_by_admin=True)
        patient1.set_password('patient123')
        db.session.add(patient1)
        
        # Patient 2
        patient2 = User(name='John Doe', email='patient2@example.com', role='Patient', is_approved_by_admin=True)
        patient2.set_password('patient123')
        db.session.add(patient2)
        
        db.session.commit() # Commit to get patient ids
        
        # Patient Profiles
        profile1 = PatientProfile(
            user_id=patient1.id,
            assigned_doctor_id=doctor.id,
            age=0,
            gender='Unknown',
            height=0.0,
            weight=0.0,
            bmi=0.0,
            questionnaire_filled=False
        )
        db.session.add(profile1)
        
        profile2 = PatientProfile(
            user_id=patient2.id,
            assigned_doctor_id=doctor.id,
            age=0,
            gender='Unknown',
            height=0.0,
            weight=0.0,
            bmi=0.0,
            questionnaire_filled=False
        )
        db.session.add(profile2)
        
        db.session.commit()
        print("Database initialized with 1 Admin, 1 Doctor, and 2 Patients successfully!")

if __name__ == "__main__":
    setup_db()
