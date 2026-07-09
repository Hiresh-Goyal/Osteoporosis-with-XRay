# Osteoporosis Prediction API (WITH DEXA)

A FastAPI-based machine learning API that predicts osteoporosis risk from clinical patient data including DEXA scan T-scores.

## Files Required

| File | Description |
|---|---|
| `app.py` | FastAPI application with auto-sanitization logic |
| `best_model_pipeline.joblib` | Trained ExtraTrees classifier model (~27 MB) |
| `real_scaler_and_bounds.joblib` | StandardScaler + IQR outlier clipping bounds |
| `requirements.txt` | Python dependencies |

## Setup & Run Locally

```bash
# 1. Create a virtual environment
python -m venv venv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate            # Windows

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the API server
uvicorn app:app --host 0.0.0.0 --port 8000
```

The API will be live at `http://localhost:8000`  
Swagger docs at `http://localhost:8000/docs`

## Deploy on Render (Free)

1. Push this folder to a **GitHub repository**
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Set:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
5. Deploy!

## API Usage

### POST `/predict`

**Request Body (JSON):**

```json
{
  "fnt": -2.8,
  "calcitriol": 0.0,
  "uric": 6.1,
  "alt": 36.0,
  "bun": 23.0,
  "crea": 1.05,
  "fbg": 108.0,
  "ldl_c": 136.0,
  "l1_4t": -2.9,
  "age": 58.0,
  "hdl_c": 46.0,
  "bmi": 27.8,
  "ca": 8.8,
  "p": 3.2,
  "height": 160.0,
  "ast": 34.0,
  "weight": 71.0,
  "calsium": 0.0,
  "calcitonin": 0.0,
  "as_": 1.0
}
```

### Input Field Guide

| Field | Type | Description | Unit |
|---|---|---|---|
| `fnt` | decimal | Femoral Neck T-score | -5.0 to +3.0 |
| `l1_4t` | decimal | L1-L4 Spine T-score | -5.0 to +3.0 |
| `age` | float | Patient age | years |
| `bmi` | float | Body Mass Index | kg/m² |
| `height` | float | Height | cm |
| `weight` | float | Weight | kg |
| `ca` | float | Blood Calcium | mg/dL |
| `p` | float | Phosphorus | mg/dL |
| `uric` | float | Uric Acid | mg/dL |
| `crea` | float | Creatinine | mg/dL |
| `fbg` | float | Fasting Blood Glucose | mg/dL |
| `ldl_c` | float | LDL Cholesterol | mg/dL |
| `hdl_c` | float | HDL Cholesterol | mg/dL |
| `alt` | float | ALT liver enzyme | U/L |
| `ast` | float | AST liver enzyme | U/L |
| `bun` | float | Blood Urea Nitrogen | mg/dL |
| `calsium` | binary | Calcium supplement (0=No, 1=Yes) | — |
| `calcitriol` | binary | Calcitriol treatment (0=No, 1=Yes) | — |
| `calcitonin` | binary | Calcitonin treatment (0=No, 1=Yes) | — |
| `as_` | binary | Ankylosing Spondylitis (0=No, 1=Yes) | — |

> **Note:** The API includes auto-sanitization. If invalid values are passed (e.g. positive T-scores, continuous values in binary fields), they will be auto-corrected and warnings will be returned in the response.

### Response

```json
{
  "prediction": 1,
  "probability_no": 0.2821,
  "probability_yes": 0.7179,
  "risk": "Osteoporosis",
  "outliers": {},
  "warnings": []
}
```
