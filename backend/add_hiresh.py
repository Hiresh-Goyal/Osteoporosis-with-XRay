from app import app, db
from models import User

def add_hiresh():
    with app.app_context():
        # Check if user already exists
        existing = User.query.filter_by(email='HireshAdmin@gmail.com').first()
        if existing:
            print("User already exists.")
            return

        admin = User(name='Hiresh', email='HireshAdmin@gmail.com', role='Admin', is_approved_by_admin=True)
        admin.set_password('AdminHiresh')
        db.session.add(admin)
        db.session.commit()
        print("Successfully added Hiresh to the database as an Admin!")

if __name__ == "__main__":
    add_hiresh()
