# models-api/src/fastapi_app.py
from typing import Optional, Literal, Dict, Any
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from pathlib import Path
import joblib
import numpy as np
import logging

app = FastAPI(title="Risk Predictor API", version="1.0.0")

# Allow your Next.js dev origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://med2-vgw1.onrender.com",
        "https://med2-xi.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Models (Pydantic v2) ----
class PatientIn(BaseModel):
    # strings allowed; we coerce to numbers where needed
    name: Optional[str] = None
    email: Optional[str] = None
    age: Optional[float] = None
    gender: Optional[Literal["0", "1"]] = None

    sbp: Optional[float] = None
    dbp: Optional[float] = None
    bmi: Optional[float] = None

    glucose: Optional[float] = None
    tc: Optional[float] = None
    hdl: Optional[float] = None
    ldl: Optional[float] = None
    hba1c: Optional[float] = None
    alt: Optional[float] = None
    ast: Optional[float] = None
    creat: Optional[float] = None
    egfr: Optional[float] = None
    uacr: Optional[float] = None
    bilirubin: Optional[float] = None

    smoker: Optional[Literal["0", "1"]] = None
    dm: Optional[Literal["0", "1"]] = None
    htn: Optional[Literal["0", "1"]] = None
    fam_cad: Optional[Literal["0", "1"]] = None

    # coerce blanks ("") to None so Number("") in the UI doesn’t explode server-side
    @field_validator("*", mode="before")
    @classmethod
    def empty_to_none(cls, v: Any) -> Any:
        if v == "":
            return None
        return v

# ------------------------
# Logging + model paths
# ------------------------
logger = logging.getLogger("uvicorn.error")
HERE = Path(__file__).resolve().parent
MODELS_DIR = (HERE.parent / "models").resolve()

# Names expected in your repository (adjust if different)
CARDIO_MODEL_FN = MODELS_DIR / "cardio_risk_rf.joblib"
CARDIO_SCALER_FN = MODELS_DIR / "cardio_scaler.joblib"
DIAB_MODEL_FN = MODELS_DIR / "diabetes_rf.joblib"
DIAB_SCALER_FN = MODELS_DIR / "diabetes_scaler.joblib"

_cardio_model = None
_cardio_scaler = None
_diab_model = None
_diab_scaler = None

# ------------------------
# Utilities
# ------------------------
def _safe_float(val: Any, default: float = 0.0) -> float:
    try:
        if val is None:
            return default
        if isinstance(val, str):
            v = val.strip()
            if v == "":
                return default
            if v in ("1", "0"):
                return float(v)
        return float(val)
    except Exception:
        return default


def _soft_prob(p: float) -> float:
    # clamp 0..1 and round for nicer output
    return round(max(0.0, min(1.0, p)), 3)


def _interpret_cardio(p_high: float) -> str:
    if p_high >= 0.20:
        return "High cardiovascular risk: consider aggressive risk factor control."
    if p_high >= 0.10:
        return "Moderate cardiovascular risk: optimize lifestyle and consider medication."
    return "Low cardiovascular risk: maintain healthy lifestyle."


def _interpret_diabetes(p_yes: float) -> str:
    if p_yes >= 0.30:
        return "High diabetes risk: consider fasting glucose/HbA1c follow-up and lifestyle intervention."
    return "Low diabetes risk: continue routine screening."

# ------------------------
# Model loader + predictors
# ------------------------
def _load_joblib(path: Path):
    try:
        if not path.exists():
            logger.warning(f"Model file not found: {path}")
            return None
        return joblib.load(path)
    except Exception:
        logger.exception(f"Error loading joblib file {path}")
        return None


def load_models():
    global _cardio_model, _cardio_scaler, _diab_model, _diab_scaler
    _cardio_model = _load_joblib(CARDIO_MODEL_FN)
    _cardio_scaler = _load_joblib(CARDIO_SCALER_FN)
    _diab_model = _load_joblib(DIAB_MODEL_FN)
    _diab_scaler = _load_joblib(DIAB_SCALER_FN)


# call on import
load_models()


# NOTE: The feature order below MUST match the features used during training.
# If you trained with different names/order, update these lists to match.
FEATURE_ORDER_CARDIO = ["age", "sbp", "ldl", "smoker", "dm", "bmi"]
FEATURE_ORDER_DIAB = ["age", "hba1c", "glucose", "bmi", "fam_cad"]


def _build_feature_vector(payload: PatientIn, order: list, defaults: Dict[str, float]) -> np.ndarray:
    vals = []
    pdata = payload.__dict__
    for f in order:
        raw = pdata.get(f)
        if raw is None:
            # some names differ: try alternate names
            # e.g., fam_cad in payload used for diabetes fam flag — keep mapping if needed
            raw = pdata.get(f)
        vals.append(_safe_float(raw, defaults.get(f, 0.0)))
    return np.array(vals).reshape(1, -1)


def predict_cardio_model(payload: PatientIn):
    if _cardio_model is None:
        return None
    defaults = {"age": 40.0, "sbp": 120.0, "ldl": 3.0, "smoker": 0.0, "dm": 0.0, "bmi": 25.0}
    fv = _build_feature_vector(payload, FEATURE_ORDER_CARDIO, defaults)
    if _cardio_scaler is not None:
        try:
            fv = _cardio_scaler.transform(fv)
        except Exception:
            logger.exception("Cardio scaler transform failed; proceeding with raw features")
    try:
        proba = _cardio_model.predict_proba(fv)
        # sklearn convention: classes_ order -> assume index 1 is positive/high risk
        p_high = float(proba[0, 1]) if proba.shape[1] > 1 else float(proba[0, 0])
        return {"High": _soft_prob(p_high), "Low": _soft_prob(1.0 - p_high)}
    except Exception:
        logger.exception("Cardio model predict failed")
        return None


def predict_diab_model(payload: PatientIn):
    if _diab_model is None:
        return None
    defaults = {"age": 40.0, "hba1c": 5.5, "glucose": 5.2, "bmi": 25.0, "fam_cad": 0.0}
    fv = _build_feature_vector(payload, FEATURE_ORDER_DIAB, defaults)
    if _diab_scaler is not None:
        try:
            fv = _diab_scaler.transform(fv)
        except Exception:
            logger.exception("Diabetes scaler transform failed; proceeding with raw features")
    try:
        proba = _diab_model.predict_proba(fv)
        p_yes = float(proba[0, 1]) if proba.shape[1] > 1 else float(proba[0, 0])
        return {"Yes": _soft_prob(p_yes), "No": _soft_prob(1.0 - p_yes)}
    except Exception:
        logger.exception("Diabetes model predict failed")
        return None


# ------------------------
# Endpoints
# ------------------------
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "models": {
            "cardio_model": bool(_cardio_model),
            "cardio_scaler": bool(_cardio_scaler),
            "diab_model": bool(_diab_model),
            "diab_scaler": bool(_diab_scaler),
        },
    }


@app.post("/api/patient/add")
def add_patient(payload: PatientIn, authorization: Optional[str] = Header(None)):
    # (Optional) quick token check – make it strict later
    if authorization is None or not authorization.startswith("Bearer "):
        # Keep 200 if you want to avoid frontend errors; or enforce 401:
        # raise HTTPException(status_code=401, detail="Missing/invalid token")
        pass

    # First, try model-based predictions
    cardio_probs = predict_cardio_model(payload)
    diab_probs = predict_diab_model(payload)

    # If model(s) missing or failed, fall back to the existing heuristic
    if cardio_probs is None:
        sbp = payload.sbp or 120
        ldl = payload.ldl or 2.5
        smoker = 1.0 if payload.smoker == "1" else 0.0
        dm = 1.0 if payload.dm == "1" else 0.0
        age = payload.age or 40.0
        bmi = payload.bmi or 25.0

        raw_cardio = 0.003 * (sbp - 120) + 0.04 * (ldl - 3.0) + 0.1 * smoker + 0.08 * dm + 0.002 * (age - 40) + 0.003 * (bmi - 25)
        p_cardio_high = _soft_prob(0.05 + raw_cardio)
        p_cardio_low = _soft_prob(1.0 - p_cardio_high)
        cardio_probs = {"High": p_cardio_high, "Low": p_cardio_low}

    if diab_probs is None:
        hba1c = payload.hba1c or 5.5
        glucose = payload.glucose or 5.2
        fam = 1.0 if payload.fam_cad == "1" else 0.0
        bmi = payload.bmi or 25.0
        raw_dm = 0.08 * (hba1c - 5.5) + 0.03 * (glucose - 5.0) + 0.02 * (bmi - 25) + 0.05 * fam
        p_dm_yes = _soft_prob(0.05 + raw_dm)
        p_dm_no = _soft_prob(1.0 - p_dm_yes)
        diab_probs = {"Yes": p_dm_yes, "No": p_dm_no}

    cardio_block = {
        "probabilities": cardio_probs,
        "interpretation": _interpret_cardio(cardio_probs.get("High") or cardio_probs.get("high") or 0.0),
    }
    diabetes_block = {
        "probabilities": diab_probs,
        "interpretation": _interpret_diabetes(diab_probs.get("Yes") or diab_probs.get("yes") or 0.0),
    }

    return {
        "risk": {
            "cardio": cardio_block,
            "diabetes": diabetes_block,
        }
    }
    
@app.post("/debug/model-info")
def model_info(payload: PatientIn):
    """
    Returns simple metadata about the loaded models and the raw predict_proba
    arrays for the given payload so you can confirm:
      - model.classes_ and n_features_in_ (prove these are sklearn models)
      - the raw probability vector (e.g. [prob_class0, prob_class1]) so you know
        which index is the positive class.
    """
    info = {}
    try:
        # Model metadata
        if _cardio_model is not None:
            info["cardio_meta"] = {
                "classes": getattr(_cardio_model, "classes_", None),
                "n_features_in": getattr(_cardio_model, "n_features_in_", None),
            }
        else:
            info["cardio_meta"] = None

        if _diab_model is not None:
            info["diab_meta"] = {
                "classes": getattr(_diab_model, "classes_", None),
                "n_features_in": getattr(_diab_model, "n_features_in_", None),
            }
        else:
            info["diab_meta"] = None

        # Raw predict_proba outputs (if model present)
        try:
            fv_cardio = _build_feature_vector(payload, FEATURE_ORDER_CARDIO, {"age":40,"sbp":120,"ldl":3.0,"smoker":0,"dm":0,"bmi":25})
            if _cardio_scaler is not None:
                fv_cardio = _cardio_scaler.transform(fv_cardio)
            info["cardio_proba_raw"] = _cardio_model.predict_proba(fv_cardio).tolist() if _cardio_model is not None else None
        except Exception as e:
            info["cardio_proba_error"] = str(e)

        try:
            fv_diab = _build_feature_vector(payload, FEATURE_ORDER_DIAB, {"age":40,"hba1c":5.5,"glucose":5.2,"bmi":25,"fam_cad":0})
            if _diab_scaler is not None:
                fv_diab = _diab_scaler.transform(fv_diab)
            info["diab_proba_raw"] = _diab_model.predict_proba(fv_diab).tolist() if _diab_model is not None else None
        except Exception as e:
            info["diab_proba_error"] = str(e)

    except Exception as e:
        return {"error": str(e)}
    return info

# uvicorn src.fastapi_app:app --host 0.0.0.0 --port 8000 --reload
