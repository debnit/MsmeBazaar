from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    phone: str
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    password: str

class UserOut(BaseModel):
    id: str
    phone: str
    email: Optional[str]
    name: Optional[str]

    class Config:
        orm_mode = True
