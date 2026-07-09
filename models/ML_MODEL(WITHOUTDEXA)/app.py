from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import joblib

# Load trained model
model = joblib.load("osteoporosis_model.pkl")

app = FastAPI(
    title="Osteoporosis Prediction API",
    description="Predicts Osteoporosis Risk",
    version="1.0"
)


# Input Schema
class Patient(BaseModel):
    Age: int
    Gender: str
    Hormonal_Changes: str
    Family_History: str
    Race_Ethnicity: str
    Body_Weight: str
    Calcium_Intake: str
    Vitamin_D_Intake: str
    Physical_Activity: str
    Smoking: str
    Alcohol_Consumption: str
    Medical_Conditions: str
    Medications: str
    Prior_Fractures: str


@app.get("/")
def home():
    return {
        "message": "Osteoporosis Prediction API is Running"
    }


@app.post("/predict")
def predict(patient: Patient):

    data = {
        "Age": patient.Age,
        "Gender": patient.Gender,
        "Hormonal_Changes": patient.Hormonal_Changes,
        "Family_History": patient.Family_History,
        "Race/Ethnicity": patient.Race_Ethnicity,
        "Body_Weight": patient.Body_Weight,
        "Calcium_Intake": patient.Calcium_Intake,
        "Vitamin_D_Intake": patient.Vitamin_D_Intake,
        "Physical_Activity": patient.Physical_Activity,
        "Smoking": patient.Smoking,
        "Alcohol_Consumption": patient.Alcohol_Consumption,
        "Medical_Conditions": patient.Medical_Conditions,
        "Medications": patient.Medications,
        "Prior_Fractures": patient.Prior_Fractures,
    }

    df = pd.DataFrame([data])

    prediction = model.predict(df)[0]
    probability = model.predict_proba(df)[0][1]

    return {
        "prediction": int(prediction),
        "risk_probability": round(float(probability), 4),
        "result": "High Risk" if prediction == 1 else "Low Risk"
    }