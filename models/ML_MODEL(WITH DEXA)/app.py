from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
import joblib

# -----------------------------
# Load Saved Model and Correct Scaler
# -----------------------------
saved = joblib.load("best_model_pipeline.joblib")

model = saved["model"]
features = saved["features"]
model_name = saved["model_name"]

# Load the reconstructed scaler and outlier clipping bounds
scaler_data = joblib.load("real_scaler_and_bounds.joblib")
scaler = scaler_data["scaler"]
bounds = scaler_data["bounds"]

# Training means for truly neutral fallbacks when inputs are unrecoverable.
# Setting raw values to 0.0 is NOT neutral after scaling (e.g. fnt mean=-1.30,
# so raw 0.0 becomes z-score +1.18 which is a strong HEALTHY bias).
TRAINING_MEANS = dict(zip(features, scaler.mean_))
# Binary field defaults: rounded training means
# calcitriol mean=0.17 -> 0, calsium mean=0.15 -> 0,
# calcitonin mean=0.06 -> 0, as mean=0.75 -> 1
BINARY_DEFAULTS = {
    "calcitriol": round(TRAINING_MEANS.get("calcitriol", 0)),
    "calsium": round(TRAINING_MEANS.get("calsium", 0)),
    "calcitonin": round(TRAINING_MEANS.get("calcitonin", 0)),
    "as": round(TRAINING_MEANS.get("as", 0)),
}

# -----------------------------
# FastAPI App
# -----------------------------
app = FastAPI(
    title="Osteoporosis Prediction API",
    version="1.0"
)

# -----------------------------
# Input Schema
# -----------------------------
class Patient(BaseModel):
    fnt: float
    calcitriol: float
    uric: float
    alt: float
    bun: float
    crea: float
    fbg: float
    ldl_c: float
    l1_4t: float
    age: float
    hdl_c: float
    bmi: float
    ca: float
    p: float
    height: float
    ast: float
    weight: float
    calsium: float
    calcitonin: float
    as_: float


@app.get("/")
def home():
    return {
        "message": "Osteoporosis Prediction API is Running",
        "model": model_name
    }


@app.post("/predict")
def predict(patient: Patient):

    warnings = []
    
    fnt_val = patient.fnt
    l1_4t_val = patient.l1_4t
    
    # 1. T-score validation & auto-conversion
    # Real T-scores range from about -5.0 to +3.0.
    # ChatGPT often generates invalid positive T-scores. Auto-fix logic:
    #   3.0 < T <= 6.0 : likely missing negative sign → negate
    #                     (e.g., 3.7 was meant to be -3.7)
    #   6.0 < T <= 20.0: likely missing negative sign AND decimal point
    #                     → divide by 10, negate (e.g., 12.8 → -1.28)
    #   T > 20.0       : unrecoverable → set to 0.0 (neutral)
    for label, raw, setter in [("fnt", patient.fnt, "fnt"), ("l1_4t", patient.l1_4t, "l1_4t")]:
        if raw > 3.0:
            if raw <= 6.0:
                corrected = -raw
                warnings.append(f"{label} T-score '{raw}' appears to be missing the negative sign. Auto-corrected to '{corrected}'.")
            elif raw <= 20.0:
                corrected = -raw
                warnings.append(f"{label} T-score '{raw}' appears to be missing the negative sign. Auto-corrected to '{corrected}' (will be clipped to training bounds).")
            else:
                corrected = TRAINING_MEANS[label]
                warnings.append(f"{label} T-score '{raw}' is not a valid T-score. Set to training mean '{corrected:.2f}' (neutral). Real T-scores range from -5.0 to +3.0.")
            if setter == "fnt":
                fnt_val = corrected
            else:
                l1_4t_val = corrected
        
    # 2. Binary validation & auto-conversion
    binary_fields = {
        "calcitriol": patient.calcitriol,
        "calsium": patient.calsium,
        "calcitonin": patient.calcitonin,
        "as": patient.as_
    }
    
    sanitized_binary = {}
    for field, val in binary_fields.items():
        if val not in [0.0, 1.0]:
            if val > 1.0:
                sanitized_val = float(BINARY_DEFAULTS[field])
                warnings.append(f"'{field}' value '{val}' looks like a lab measurement. Coerced to '{sanitized_val}' (training default). (Calcium blood level is already captured in 'ca').")
            else:
                sanitized_val = 1.0 if val >= 0.5 else 0.0
                warnings.append(f"'{field}' value '{val}' is non-binary. Coerced to '{sanitized_val}' (binary).")
            sanitized_binary[field] = sanitized_val
        else:
            sanitized_binary[field] = val

    data = {
        "fnt": fnt_val,
        "calcitriol": sanitized_binary["calcitriol"],
        "uric": patient.uric,
        "alt": patient.alt,
        "bun": patient.bun,
        "crea": patient.crea,
        "fbg": patient.fbg,
        "ldl_c": patient.ldl_c,
        "l1_4t": l1_4t_val,
        "age": patient.age,
        "hdl_c": patient.hdl_c,
        "bmi": patient.bmi,
        "ca": patient.ca,
        "p": patient.p,
        "height": patient.height,
        "ast": patient.ast,
        "weight": patient.weight,
        "calsium": sanitized_binary["calsium"],
        "calcitonin": sanitized_binary["calcitonin"],
        "as": sanitized_binary["as"]
    }

    # Convert US clinical lab units to SI units expected by the model
    # 1. Uric Acid (mg/dL -> umol/L)
    data["uric"] = data["uric"] * 59.48
    # 2. Creatinine (mg/dL -> umol/L)
    data["crea"] = data["crea"] * 88.42
    # 3. Fasting Blood Glucose (mg/dL -> mmol/L)
    data["fbg"] = data["fbg"] / 18.016
    # 4. LDL Cholesterol (mg/dL -> mmol/L)
    data["ldl_c"] = data["ldl_c"] / 38.67
    # 5. HDL Cholesterol (mg/dL -> mmol/L)
    data["hdl_c"] = data["hdl_c"] / 38.67
    # 6. Calcium (mg/dL -> mmol/L)
    data["ca"] = data["ca"] * 0.2495
    # 7. Phosphorus (mg/dL -> mmol/L)
    data["p"] = data["p"] * 0.3229
    # 8. Blood Urea Nitrogen (mg/dL -> mmol/L)
    data["bun"] = data["bun"] / 2.80

    df = pd.DataFrame([data])

    outliers_detected = {}

    # Outlier detection and clipping based on training IQR bounds
    for col, (lower, upper) in bounds.items():
        if col in df.columns:
            val = float(df.loc[0, col])
            if val < lower or val > upper:
                clipped_val = min(max(val, lower), upper)
                outliers_detected[col] = {
                    "value_si": round(val, 4),
                    "lower_bound_si": round(lower, 4),
                    "upper_bound_si": round(upper, 4),
                    "status": "Under lower bound" if val < lower else "Over upper bound"
                }
                df.loc[0, col] = clipped_val

    df = df[features]

    df_scaled = scaler.transform(df)

    prediction = int(model.predict(df_scaled)[0])

    probability = model.predict_proba(df_scaled)[0]

    return {
        "prediction": prediction,
        "probability_no": round(float(probability[0]), 4),
        "probability_yes": round(float(probability[1]), 4),
        "risk": "Osteoporosis" if prediction == 1 else "Healthy",
        "outliers": outliers_detected,
        "warnings": warnings
    }