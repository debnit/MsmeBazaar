from app.schemas.item import Item, ItemCreate

class ItemService:
    def __init__(self):
        self._items = []
        self._counter = 1

    def get_all(self):
        return self._items

    def create(self, item: ItemCreate):
        new_item = Item(id=self._counter, **item.dict())
        self._items.append(new_item)
        self._counter += 1
        return new_item
