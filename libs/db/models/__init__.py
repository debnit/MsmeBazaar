# __init__.py - Aggregator for all SQLAlchemy models
from .auth_models import AuthModel
from .user_profile_models import User_profileModel
from .loan_models import LoanModel
from .nbfc_models import NbfcModel
from .payment_models import PaymentModel
from .recommendation_models import RecommendationModel
from .valuation_models import ValuationModel
from .transaction_matching_models import Transaction_matchingModel
from .search_matchmaking_models import Search_matchmakingModel
from .msme_listing_models import Msme_listingModel
from .compliance_models import ComplianceModel
from .gamification_models import GamificationModel
from .notification_models import NotificationModel
from .seller_models import SellerModel
from .admin_models import AdminModel
from .eaas_models import EaasModel
from .model_metadata import ModelMetadata
from .monitoring_alert import MonitoringAlert
from .user_points import UserPoints
from .device import Device

# Optional: List of all models
ALL_MODELS = [
    AuthModel,
    User_profileModel,
    LoanModel,
    NbfcModel,
    PaymentModel,
    RecommendationModel,
    ValuationModel,
    Transaction_matchingModel,
    Search_matchmakingModel,
    Msme_listingModel,
    ComplianceModel,
    GamificationModel,
    NotificationModel,
    SellerModel,
    AdminModel,
    EaasModel,
    ModelMetadata,
    MonitoringAlert,
    UserPoints,
    Device
]
