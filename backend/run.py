#!/usr/bin/env python3
"""Entry point for the Flask backend."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (one level up from /backend)
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path, override=True)

from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=True)
