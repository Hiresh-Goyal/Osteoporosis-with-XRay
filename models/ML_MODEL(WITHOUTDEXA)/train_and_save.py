import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import joblib

df = pd.read_csv('original2.csv')

# Encode identically to app.py
def encode_col(val, target_vals):
    return 1 if val in target_vals else 0

df['Gender'] = df['Gender'].apply(lambda x: encode_col(x, ['Female']))
df['Hormonal_Changes'] = df['Hormonal Changes'].apply(lambda x: encode_col(x, ['Postmenopausal']))
df['Body_Weight'] = df['Body Weight'].apply(lambda x: encode_col(x, ['Underweight', 'Overweight']))
df['Vitamin_D_Intake'] = df['Vitamin D Intake'].apply(lambda x: encode_col(x, ['Sufficient']))
df['Physical_Activity'] = df['Physical Activity'].apply(lambda x: encode_col(x, ['Active']))
df['Smoking'] = df['Smoking'].apply(lambda x: encode_col(x, ['Yes']))

# Correct NaN handling to ensure correct binary encoding
df['Alcohol_Consumption'] = df['Alcohol Consumption'].fillna('None').apply(lambda x: 0 if x == 'None' else 1)
df['Medications'] = df['Medications'].fillna('None').apply(lambda x: 0 if str(x).lower() == 'none' else 1)

df['Prior_Fractures'] = df['Prior Fractures'].apply(lambda x: encode_col(x, ['Yes']))

expected_features = [
    'Age', 'Smoking', 'Physical_Activity', 'Medications', 'Vitamin_D_Intake', 
    'Hormonal_Changes', 'Gender', 'Body_Weight', 'Prior_Fractures', 'Alcohol_Consumption'
]

X = df[expected_features]
y = df['Osteoporosis']

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_scaled, y)

joblib.dump(model, 'osteoporosis_model.pkl')
joblib.dump(scaler, 'osteoporosis_scaler.pkl')

print("Model and scaler saved successfully for Without DEXA using original2.csv with fixed encodings.")
