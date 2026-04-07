# api/index.py
import sys
from pathlib import Path

# Add your src/ folder to sys.path
BASE = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE / "models-api" / "src"))

# Import the FastAPI app
from fastapi_app import app

# Vercel will now detect this app
