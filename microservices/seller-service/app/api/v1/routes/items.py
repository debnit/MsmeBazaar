from fastapi import APIRouter
from typing import List
from app.schemas.item import Item, ItemCreate
from app.services.item_service import ItemService

router = APIRouter()
service = ItemService()

@router.get("/", response_model=List[Item])
async def get_items():
    return service.get_all()

@router.post("/", response_model=Item)
async def create_item(item: ItemCreate):
    return service.create(item)
