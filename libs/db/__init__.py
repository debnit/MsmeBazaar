from libs.db.base import Base

# Import all model modules here to register them with Alembic's metadata
from libs.db.models.user import User  
#from libs.db.models.loan import Loan  # etc.

# You must import all models so that Alembic can see them and generate migrations
# Add all your models here for Alembic autogeneration
__all__ = [
    "Base",
    "User",
]
