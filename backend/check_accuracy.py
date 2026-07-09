"""
Comprehensive accuracy check for the retrained osteoporosis_model.pkl
"""
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

# Load retrained model
model = joblib.load('../models/ML_MODEL(WITHOUTDEXA)/osteoporosis_model.pkl')

# Load and prepare dataset (same preprocessing as retrain)
df = pd.read_csv('../models/ML_MODEL(WITHOUTDEXA)/cleaned_osteoporosis_dataset.csv')
age_mean, age_std = 55, 15
df['Age'] = (df['Age'] * age_std + age_mean).round().astype(int)

features = ['Age', 'Smoking', 'Physical_Activity', 'Medications', 'Vitamin_D_Intake',
            'Hormonal_Changes', 'Gender', 'Body_Weight', 'Prior_Fractures', 'Alcohol_Consumption']
X = df[features]
y = df['Osteoporosis']

# Same split as training
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("=" * 60)
print("   OSTEOPOROSIS MODEL ACCURACY REPORT")
print("=" * 60)

# 1. Basic Accuracy
train_acc = model.score(X_train, y_train)
test_acc = model.score(X_test, y_test)
print(f"\n1. BASIC ACCURACY")
print(f"   Train Accuracy : {train_acc:.4f} ({train_acc*100:.2f}%)")
print(f"   Test Accuracy  : {test_acc:.4f} ({test_acc*100:.2f}%)")

# 2. Cross-Validation (5-fold)
cv_scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')
print(f"\n2. 5-FOLD CROSS-VALIDATION")
print(f"   Scores : {[f'{s:.4f}' for s in cv_scores]}")
print(f"   Mean   : {cv_scores.mean():.4f} ({cv_scores.mean()*100:.2f}%)")
print(f"   Std    : {cv_scores.std():.4f}")

# 3. Classification Report (on test set)
y_pred = model.predict(X_test)
print(f"\n3. CLASSIFICATION REPORT (Test Set)")
print(classification_report(y_test, y_pred, target_names=['Low Risk (0)', 'High Risk (1)']))

# 4. Confusion Matrix
cm = confusion_matrix(y_test, y_pred)
print(f"4. CONFUSION MATRIX")
print(f"                  Predicted Low  Predicted High")
print(f"   Actual Low     {cm[0][0]:>12}  {cm[0][1]:>14}")
print(f"   Actual High    {cm[1][0]:>12}  {cm[1][1]:>14}")

# 5. Prediction distribution check
print(f"\n5. PREDICTION DISTRIBUTION (Test Set)")
unique, counts = np.unique(y_pred, return_counts=True)
for u, c in zip(unique, counts):
    label = "Low Risk" if u == 0 else "High Risk"
    print(f"   {label}: {c} ({c/len(y_pred)*100:.1f}%)")

# 6. Real-world scenario tests
print(f"\n6. REAL-WORLD SCENARIO TESTS")
scenarios = [
    ("Young healthy male (25yo)",       {'Age':25,'Smoking':0,'Physical_Activity':1,'Medications':0,'Vitamin_D_Intake':1,'Hormonal_Changes':0,'Gender':0,'Body_Weight':0,'Prior_Fractures':0,'Alcohol_Consumption':0}, "Low Risk"),
    ("Middle-aged moderate risk (50yo)", {'Age':50,'Smoking':0,'Physical_Activity':0,'Medications':0,'Vitamin_D_Intake':0,'Hormonal_Changes':1,'Gender':1,'Body_Weight':0,'Prior_Fractures':0,'Alcohol_Consumption':0}, "Either"),
    ("Elderly high risk female (80yo)",  {'Age':80,'Smoking':1,'Physical_Activity':0,'Medications':1,'Vitamin_D_Intake':0,'Hormonal_Changes':1,'Gender':1,'Body_Weight':1,'Prior_Fractures':1,'Alcohol_Consumption':1}, "High Risk"),
    ("Young smoker (30yo)",             {'Age':30,'Smoking':1,'Physical_Activity':0,'Medications':0,'Vitamin_D_Intake':0,'Hormonal_Changes':0,'Gender':0,'Body_Weight':0,'Prior_Fractures':0,'Alcohol_Consumption':1}, "Low Risk"),
    ("Elderly healthy male (70yo)",     {'Age':70,'Smoking':0,'Physical_Activity':1,'Medications':0,'Vitamin_D_Intake':1,'Hormonal_Changes':0,'Gender':0,'Body_Weight':0,'Prior_Fractures':0,'Alcohol_Consumption':0}, "Either"),
]

for name, data, expected in scenarios:
    pred = model.predict(pd.DataFrame([data]))[0]
    result = "High Risk" if pred == 1 else "Low Risk"
    status = "PASS" if expected == "Either" or result == expected else "FAIL"
    print(f"   [{status}] {name}: {result} (expected: {expected})")

print("\n" + "=" * 60)
