import os, json, joblib
from datetime import datetime
from typing import Dict, Any, List, Optional

import numpy as np
import pandas as pd
from imblearn.over_sampling import SMOTE
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.preprocessing import StandardScaler

# ───────────────────────────────────────── CONFIG ──────────────────────────────
BASE_DIR       = os.path.dirname(os.path.abspath(__file__))
DATA_DIR       = os.path.join(BASE_DIR, "..", "data")
OUT_CSV        = os.path.join(BASE_DIR, "processed_multidisease_data.csv")
MODEL_DIR      = os.path.join(BASE_DIR, "..", "models")

# Model paths per disease
MODEL_PATHS = {
    "cardio": os.path.join(MODEL_DIR, "cardio_risk_rf.joblib"),
    "diabetes": os.path.join(MODEL_DIR, "diabetes_rf.joblib"),
    "ckd": os.path.join(MODEL_DIR, "ckd_rf.joblib"),
    "nafld": os.path.join(MODEL_DIR, "nafld_rf.joblib"),
}
SCALER_PATHS = {
    "cardio": os.path.join(MODEL_DIR, "cardio_scaler.joblib"),
    "diabetes": os.path.join(MODEL_DIR, "diabetes_scaler.joblib"),
    "ckd": os.path.join(MODEL_DIR, "ckd_scaler.joblib"),
    "nafld": os.path.join(MODEL_DIR, "nafld_scaler.joblib"),
}

# LOINC sets
LOINC_CODES = {
    # Cardio fields
    "BMI": {"39156-5"},
    "TC":  {"2093-3"},
    "HDL": {"2085-9"},
    "LDL": {"18262-6", "2089-1"},
    "SBP": {"8480-6"},
    "DBP": {"8462-4"},
    "BP_PANEL": {"85354-9"},
    "GLU": {"2339-0", "33747-0"},
    "SMOKE": {"72166-2"},

    # Diabetes
    "HBA1C": {"4548-4"},

    # Liver
    "ALT": {"1743-4", "16325-3"},
    "AST": {"1920-8", "1916-6"},
    "BILIRUBIN": {"1975-2", "14631-7"},

    # Kidney
    "CREAT": {"2160-0"},
    "EGFR": {"48642-3", "62238-1"},
    "UACR": {"14959-1"},
}

# ICD-10 codes
ASCVD_CODES   = {"I20", "I21", "I22", "I23", "I24", "I25", "I63", "I64"}
ICD10_DIABETES = {"E11"}
ICD10_CKD     = {"N18"}
ICD10_NAFLD   = {"K76"}

# ─────────────────────────── F E A T U R E   E X T R A C T I O N ───────────────

def years_between(date_str: str) -> Optional[int]:
    try:
        year = int(date_str.split("-")[0])
        return datetime.now().year - year
    except Exception:
        return None

def display_contains(obs: Dict[str, Any], keywords: List[str]) -> bool:
    for coding in obs.get("code", {}).get("coding", []):
        disp = coding.get("display", "")
        if any(k.lower() in disp.lower() for k in keywords):
            return True
    return False

def loinc_in(obs: Dict[str, Any]) -> set:
    return {c.get("code") for c in obs.get("code", {}).get("coding", []) if c.get("code")}

def extract_patient_features(bundle: Dict[str, Any]) -> Dict[str, Any]:
    patient, observations, conditions, fam_histories = {}, [], [], []

    for entry in bundle.get("entry", []):
        res = entry.get("resource", {})
        rtype = res.get("resourceType")
        if rtype == "Patient":
            patient = res
        elif rtype == "Observation":
            observations.append(res)
        elif rtype == "Condition":
            conditions.append(res)
        elif rtype == "FamilyMemberHistory":
            fam_histories.append(res)

    # Demographics
    age    = years_between(patient.get("birthDate"))
    gender = patient.get("gender", "").lower()
    gender = 1 if gender == "male" else 0 if gender == "female" else None

    # Cardio & general labs
    sbp = dbp = glucose = bmi = tc = hdl = ldl = None
    # New fields:
    hba1c = alt = ast = creat = egfr = uacr = bilirubin = None
    smoking_code = None
    family_cad   = 0

    # Family history of premature CAD
    for fh in fam_histories:
        rel_age = None
        if "age" in fh and isinstance(fh["age"], dict):
            rel_age = fh["age"].get("value")
        for cond in fh.get("condition", []):
            for coding in cond.get("code", {}).get("coding", []):
                icd = coding.get("code", "")
                if any(icd.startswith(c) for c in ASCVD_CODES):
                    if rel_age is None or rel_age < (55 if gender == 1 else 65):
                        family_cad = 1

    # Observations
    for obs in observations:
        codes = loinc_in(obs)
        valq  = obs.get("valueQuantity")
        value = valq.get("value") if valq else None
        unit  = valq.get("unit") if valq else None

        if not value:
            # Check BP components
            if LOINC_CODES["BP_PANEL"] & codes:
                for comp in obs.get("component", []):
                    c_codes = loinc_in(comp)
                    c_val   = comp.get("valueQuantity", {}).get("value")
                    if LOINC_CODES["SBP"] & c_codes and sbp is None:
                        sbp = c_val
                    if LOINC_CODES["DBP"] & c_codes and dbp is None:
                        dbp = c_val
            continue

        if codes & LOINC_CODES["SBP"]:
            sbp = value
        elif codes & LOINC_CODES["DBP"]:
            dbp = value
        elif codes & LOINC_CODES["GLU"]:
            glucose = round(value / 18.0, 2) if value > 50 else value
        elif codes & LOINC_CODES["BMI"]:
            bmi = value
        elif codes & LOINC_CODES["TC"]:
            tc = value if unit and "mmol" in unit else round(value / 38.67, 2)
        elif codes & LOINC_CODES["HDL"]:
            hdl = value if unit and "mmol" in unit else round(value / 38.67, 2)
        elif codes & LOINC_CODES["LDL"]:
            ldl = value if unit and "mmol" in unit else round(value / 38.67, 2)
        elif codes & LOINC_CODES["SMOKE"]:
            smoking_code = obs.get("valueCodeableConcept", {}).get("coding", [{}])[0].get("code")
        elif codes & LOINC_CODES["HBA1C"]:
            hba1c = value
        elif codes & LOINC_CODES["ALT"]:
            alt = value
        elif codes & LOINC_CODES["AST"]:
            ast = value
        elif codes & LOINC_CODES["CREAT"]:
            creat = value
        elif codes & LOINC_CODES["EGFR"]:
            egfr = value
        elif codes & LOINC_CODES["UACR"]:
            uacr = value
        elif codes & LOINC_CODES["BILIRUBIN"]:
            bilirubin = value

    # Smoking numeric encoding
    smoke_map = {
        "77176002": 2,  # current every day smoker
        "449868002": 2,  # current some day smoker
        "428041000124106": 1,  # former smoker
        "8517006": 0,  # never smoker
    }
    smoking_status = smoke_map.get(smoking_code, 0)

    # Hypertension / DM flags
    has_htn = has_dm = False
    has_diabetes_icd = has_ckd_icd = has_nafld_icd = False
    for cond in conditions:
        for coding in cond.get("code", {}).get("coding", []):
            cc = coding.get("code", "").upper()
            disp = coding.get("display", "").lower()
            if cc.startswith("I10") or "hypertension" in disp:
                has_htn = True
            if cc.startswith("E11") or "diabetes" in disp:
                has_dm = True
                has_diabetes_icd = True
            if cc.startswith("N18"):
                has_ckd_icd = True
            if cc.startswith("K76"):
                has_nafld_icd = True

    risk_label     = compute_cvd_risk(age, gender, sbp, dbp, tc, hdl, ldl, smoking_status, has_dm, family_cad)
    diabetes_label = compute_diabetes_label(hba1c, has_diabetes_icd)
    ckd_label      = compute_ckd_label(egfr, creat, uacr, has_ckd_icd)
    nafld_label    = compute_nafld_label(alt, ast, has_nafld_icd)

    return dict(
        # Cardio & general fields
        age=age, gender=gender, sbp=sbp, dbp=dbp, glucose=glucose, bmi=bmi,
        tc=tc, hdl=hdl, ldl=ldl, smoker=smoking_status, dm=int(has_dm), htn=int(has_htn), fam_cad=family_cad, risk_label=risk_label,
        # Extended labs
        hba1c=hba1c, alt=alt, ast=ast, creat=creat, egfr=egfr, uacr=uacr, bilirubin=bilirubin,
        # Labels
        diabetes_label=diabetes_label, ckd_label=ckd_label, nafld_label=nafld_label,
    )

# ────────────────────────────── RISK SCORING LOGIC ────────────────────────────
def compute_cvd_risk(age, gender, sbp, dbp, tc, hdl, ldl, smoking_status, has_dm, family_cad) -> int:
    score = 0
    # Demographics
    if age and age >= 50: score += 2 if age >= 65 else 1
    if gender == 1 and age and age >= 45: score += 1
    # Lipids
    if tc and tc >= 6.2: score += 2
    elif tc and tc >= 5.2: score += 1
    if hdl and ((gender == 1 and hdl < 1.0) or (gender == 0 and hdl < 1.3)): score += 1
    if ldl and ldl >= 4.1: score += 2
    elif ldl and ldl >= 2.6: score += 1
    # BP
    if sbp and sbp >= 160 or dbp and dbp >= 100: score += 2
    elif sbp and sbp >= 140 or dbp and dbp >= 90: score += 1
    # Others
    if smoking_status == 2: score += 2
    elif smoking_status == 1: score += 1
    if has_dm: score += 2
    if family_cad: score += 1
    return 2 if score >= 8 else 1 if score >= 4 else 0

def compute_diabetes_label(hba1c, has_diabetes_icd) -> int:
    if has_diabetes_icd: return 1
    if hba1c is not None and hba1c >= 6.5: return 1
    return 0

def compute_ckd_label(egfr, creat, uacr, has_ckd_icd) -> int:
    if has_ckd_icd: return 1
    if egfr is not None and egfr < 60: return 1
    if creat is not None and creat > 120: return 1 # umol/L threshold
    return 0

def compute_nafld_label(alt, ast, has_nafld_icd) -> int:
    # Very basic NAFLD: ALT/AST > 2x ULN (assuming 35 for ALT)
    if has_nafld_icd: return 1
    if alt is not None and alt > 70: return 1
    if ast is not None and ast > 70: return 1
    return 0

# ───────────────────────────────── DATA PIPELINE ──────────────────────────────
def prepare_dataframe() -> pd.DataFrame:
    rows: List[Dict[str, Any]] = []
    for fname in os.listdir(DATA_DIR):
        if not fname.endswith(".json"):
            continue
        with open(os.path.join(DATA_DIR, fname), "r", encoding="utf-8") as f:
            bundle = json.load(f)
        feats = extract_patient_features(bundle)
        print(f"→ {fname}  {feats}")
        rows.append(feats)

    df = pd.DataFrame(rows)
    # Impute numerics
    num_cols = ["sbp", "dbp", "glucose", "bmi", "tc", "hdl", "ldl", "hba1c", "alt", "ast", "creat", "egfr", "uacr", "bilirubin"]
    for col in num_cols:
        if col in df.columns:
            df[col].fillna(df[col].median(), inplace=True)
    df.dropna(subset=["age", "gender"], inplace=True)
    df.to_csv(OUT_CSV, index=False)
    print(f"\nSaved dataset → {OUT_CSV}  ({len(df)} rows)")
    return df

# ───────────────────────────── M O D E L   T R A I N ──────────────────────────
def train_model_for_label(df: pd.DataFrame, feat_cols: List[str], label_name: str, model_path: str, scaler_path: str):
    X, y = df[feat_cols], df[label_name]
    strat = y.nunique() > 1
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y if strat else None, random_state=42
    )
    if y_train.nunique() > 1 and len(y_train) >= 5:
        X_train, y_train = SMOTE(random_state=42).fit_resample(X_train, y_train)
    scaler = StandardScaler()
    X_train_s, X_test_s = scaler.fit_transform(X_train), scaler.transform(X_test)
    grid = GridSearchCV(
        RandomForestClassifier(class_weight="balanced", random_state=42),
        param_grid=dict(
            n_estimators=[200, 400],
            max_depth=[None, 20, 30],
            min_samples_split=[2, 5],
        ),
        cv=4, scoring="accuracy", n_jobs=-1, verbose=1)
    grid.fit(X_train_s, y_train)
    print(f"{label_name} best params: {grid.best_params_}")
    print(
        f"\nTest set report for {label_name}:\n",
        classification_report(y_test, grid.best_estimator_.predict(X_test_s), digits=3))
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(grid.best_estimator_, model_path)
    joblib.dump(scaler, scaler_path)
    print(f"{label_name} Model → {model_path}\nScaler → {scaler_path}")

# ──────────────────────────────────── MAIN ────────────────────────────────────
if __name__ == "__main__":
    df = prepare_dataframe()
    disease_configs = {
        "cardio": (["age","gender","sbp","dbp","glucose","bmi","tc","hdl","ldl","smoker","dm","htn","fam_cad"], "risk_label", MODEL_PATHS["cardio"], SCALER_PATHS["cardio"]),
        "diabetes": (["age","gender","bmi","hba1c","glucose","smoker"], "diabetes_label", MODEL_PATHS["diabetes"], SCALER_PATHS["diabetes"]),
        "ckd": (["age","gender","creat","egfr","uacr","sbp","dbp","bmi"], "ckd_label", MODEL_PATHS["ckd"], SCALER_PATHS["ckd"]),
        "nafld": (["age","gender","bmi","alt","ast","bilirubin"], "nafld_label", MODEL_PATHS["nafld"], SCALER_PATHS["nafld"]),
    }
    for disease, (feat_cols, label_col, model_path, scaler_path) in disease_configs.items():
        if label_col in df.columns and df[label_col].nunique() > 1:
            train_model_for_label(df, feat_cols, label_col, model_path, scaler_path)
