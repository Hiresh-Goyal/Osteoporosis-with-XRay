import os
from app import app
from models import db, User

# Ensure we are in the correct directory context
db_path = os.path.join(os.path.dirname(__name__), "instance", "database.db")

def init_database():
    with app.app_context():
        # Create all tables defined in models.py
        print("Creating database tables...")
        db.create_all()
        
        # Check if users already exist
        if User.query.first() is None:
            print("Seeding initial users...")
            
            # Create a mock Admin
            admin = User(
                role="Admin",
                name="System Admin",
                email="admin@osteoverse.com",
                is_approved_by_admin=True
            )
            admin.set_password(os.environ.get("ADMIN_PASS", "admin123"))
            
            # Create a mock Doctor
            doctor = User(
                role="Doctor",
                name="Dr. Sarah Connor",
                email="dr.connor@osteoverse.com",
                is_approved_by_admin=True
            )
            doctor.set_password(os.environ.get("DOCTOR_PASS", "doctor123"))
            

            # Create a mock Patient
            patient = User(
                role="Patient",
                name="Sarah Johnson",
                email="sarah.j@example.com",
                is_approved_by_admin=True
            )
            patient.set_password(os.environ.get("PATIENT_PASS", "patient123"))
            
            db.session.add_all([admin, doctor, patient])
            db.session.commit()
            
            # Create PatientProfile for the seeded patient (mirrors registration flow)
            from models import PatientProfile
            profile = PatientProfile(
                user_id=patient.id,
                age=0,
                gender='Unknown',
                height=0,
                weight=0,
                bmi=0,
                questionnaire_filled=False
            )
            db.session.add(profile)
            db.session.commit()
            print("Successfully seeded Admin, Doctor, and Patient users.")
        else:
            print("Database already contains users. Skipping seed.")

if __name__ == "__main__":
    init_database()
    print("Database initialization complete.")
