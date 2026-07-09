# OsteoCare-AI

OsteoCare-AI is a comprehensive, AI-powered diagnostic platform designed to assist healthcare professionals in predicting and diagnosing Osteoporosis. The platform integrates a full clinical pipeline, allowing for multi-modal patient assessment including initial clinical questionnaires and tabular DEXA scan analysis.

## 🚀 Key Features

*   **Role-Based Portals:** Dedicated and secure dashboards for Patients (to submit clinical history) and Doctors (to review, prescribe, and run diagnostic AI tools).
*   **Initial Clinical Assessment:** Patients complete a comprehensive medical questionnaire, generating an immediate baseline risk profile.
*   **Ensemble ML DEXA Analysis:** Tabular diagnostic tool utilizing a trained ensemble machine learning pipeline to predict osteoporosis risk based on 20 distinct biomarkers and DEXA scan metrics.

*   **Diagnostic Transparency:** The Doctor Dashboard provides transparent AI metrics, displaying the exact probability distribution (Normal, Osteopenia, Osteoporosis) for all predictions.

## 🛠️ Technology Stack

*   **Frontend:** React (Vite), TailwindCSS, Lucide Icons
*   **Backend:** Python, Flask, Flask-SQLAlchemy, Flask-JWT-Extended
*   **Machine Learning (Tabular):** Scikit-Learn, XGBoost, Pandas

*   **Database:** SQLite

## ⚙️ Getting Started

### Prerequisites
*   Python 3.10+
*   Node.js 18+
*   Trained model files placed in `models/` (`best_model_pipeline.joblib`, etc.)

### 1. Start the Backend (Flask Server)

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # On Windows
pip install -r requirements.txt
python init_db.py      # Initialize the database and seed accounts
python app.py          # Starts the API server on http://localhost:7860
```

### 2. Start the Frontend (React App)

```bash
cd frontend
npm install
npm run dev            # Starts the web app on http://localhost:5173
```

## 🔐 Seeded Test Accounts

The following accounts are pre-configured in the Neon PostgreSQL database for testing:
*   **System Admin:** `admin@osteoverse.com` | Password: `admin123`
*   **Hiresh Admin:** `HireshAdmin@gmail.com` | Password: `AdminHiresh`
*   **Doctor:** `doctor@osteoverse.com` | Password: `doctor123`

## 👥 Contributors
Developed by the OsteoCare AI Team.
