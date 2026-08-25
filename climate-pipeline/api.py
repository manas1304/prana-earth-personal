"""Top-level FastAPI app for `uvicorn api:app`."""
from prana_climate.api import create_app

app = create_app()
