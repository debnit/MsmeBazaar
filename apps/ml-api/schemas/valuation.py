from pydantic import BaseModel

class ValuationRequest(BaseModel):
    revenue: float
    profit: float
    industry: str
    age: int
