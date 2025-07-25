from fastapi import FastAPI
from api.valuation.feedback import router as valuation_router
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
app.include_router(valuation_router, prefix="/valuation", tags=["Valuation"])
