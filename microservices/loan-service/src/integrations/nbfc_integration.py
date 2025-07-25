"""
NBFC integration module for connecting with Non-Banking Financial Companies
"""
import httpx
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum
import json

logger = logging.getLogger(__name__)

class NBFCType(str, Enum):
    ASSET_FINANCE = "asset_finance"
    INVESTMENT_COMPANY = "investment_company"
    LOAN_COMPANY = "loan_company"
    INFRASTRUCTURE_FINANCE = "infrastructure_finance"
    SYSTEMICALLY_IMPORTANT = "systemically_important"
    MICRO_FINANCE = "micro_finance"

class LoanProduct(str, Enum):
    WORKING_CAPITAL = "working_capital"
    TERM_LOAN = "term_loan"
    EQUIPMENT_FINANCE = "equipment_finance"
    VEHICLE_FINANCE = "vehicle_finance"
    PERSONAL_LOAN = "personal_loan"
    BUSINESS_LOAN = "business_loan"
    INVOICE_DISCOUNTING = "invoice_discounting"

class NBFCIntegration:
    """
    Base class for NBFC integrations
    """
    
    def __init__(self, nbfc_code: str, config: Dict[str, Any]):
        self.nbfc_code = nbfc_code
        self.config = config
        self.base_url = config.get("base_url")
        self.client_id = config.get("client_id")
        self.client_secret = config.get("client_secret")
        self.timeout = config.get("timeout", 45)
        self.access_token = None
        self.token_expires_at = None
        
    async def authenticate(self) -> bool:
        """
        Authenticate with NBFC API
        """
        try:
            logger.info(f"Authenticating with NBFC {self.nbfc_code}")
            
            auth_payload = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "grant_type": "client_credentials"
            }
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/oauth/token",
                    data=auth_payload,
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                
                if response.status_code == 200:
                    token_data = response.json()
                    self.access_token = token_data.get("access_token")
                    expires_in = token_data.get("expires_in", 3600)
                    self.token_expires_at = datetime.now().timestamp() + expires_in
                    return True
                else:
                    logger.error(f"Authentication failed: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error during authentication: {str(e)}")
            return False
    
    async def submit_loan_application(self, application_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Submit loan application to NBFC
        """
        try:
            logger.info(f"Submitting loan application to NBFC {self.nbfc_code}")
            
            # Ensure we have valid authentication
            if not await self._ensure_authenticated():
                return {
                    "success": False,
                    "error": "Authentication failed"
                }
            
            # Prepare application payload
            payload = {
                "applicant": {
                    "business_name": application_data.get("business_name"),
                    "business_id": application_data.get("business_id"),
                    "pan": application_data.get("pan"),
                    "gstin": application_data.get("gstin"),
                    "contact_details": application_data.get("contact_details"),
                    "address": application_data.get("address")
                },
                "loan_details": {
                    "product_type": application_data.get("loan_type"),
                    "amount": application_data.get("amount"),
                    "tenure_months": application_data.get("tenure_months"),
                    "purpose": application_data.get("purpose"),
                    "interest_rate_expected": application_data.get("interest_rate_expected")
                },
                "financial_data": application_data.get("financial_data", {}),
                "documents": application_data.get("documents", [])
            }
            
            response = await self._make_authenticated_request(
                endpoint="/applications",
                method="POST",
                data=payload
            )
            
            if response.get("status") == "success":
                return {
                    "success": True,
                    "nbfc_application_id": response.get("application_id"),
                    "reference_number": response.get("reference_number"),
                    "status": response.get("application_status", "submitted"),
                    "next_steps": response.get("next_steps", [])
                }
            else:
                return {
                    "success": False,
                    "error": response.get("error", "Application submission failed")
                }
                
        except Exception as e:
            logger.error(f"Error submitting loan application: {str(e)}")
            return {
                "success": False,
                "error": "Application submission service unavailable"
            }
    
    async def check_application_status(self, nbfc_application_id: str) -> Dict[str, Any]:
        """
        Check loan application status with NBFC
        """
        try:
            logger.info(f"Checking application status {nbfc_application_id} with NBFC {self.nbfc_code}")
            
            if not await self._ensure_authenticated():
                return {
                    "status": "error",
                    "error": "Authentication failed"
                }
            
            response = await self._make_authenticated_request(
                endpoint=f"/applications/{nbfc_application_id}/status",
                method="GET"
            )
            
            return {
                "nbfc_application_id": nbfc_application_id,
                "status": response.get("status", "unknown"),
                "stage": response.get("current_stage", "submitted"),
                "decision": response.get("decision"),
                "approved_amount": response.get("approved_amount"),
                "interest_rate": response.get("interest_rate"),
                "conditions": response.get("conditions", []),
                "remarks": response.get("remarks"),
                "last_updated": response.get("last_updated")
            }
            
        except Exception as e:
            logger.error(f"Error checking application status: {str(e)}")
            return {
                "nbfc_application_id": nbfc_application_id,
                "status": "error",
                "error": "Status check service unavailable"
            }
    
    async def get_loan_products(self) -> List[Dict[str, Any]]:
        """
        Get available loan products from NBFC
        """
        try:
            logger.info(f"Fetching loan products from NBFC {self.nbfc_code}")
            
            if not await self._ensure_authenticated():
                return []
            
            response = await self._make_authenticated_request(
                endpoint="/products",
                method="GET"
            )
            
            return response.get("products", [])
            
        except Exception as e:
            logger.error(f"Error fetching loan products: {str(e)}")
            return []
    
    async def get_interest_rates(self, loan_type: str, amount: float, tenure: int) -> Dict[str, Any]:
        """
        Get interest rates for specific loan parameters
        """
        try:
            logger.info(f"Fetching interest rates from NBFC {self.nbfc_code}")
            
            if not await self._ensure_authenticated():
                return {
                    "error": "Authentication failed"
                }
            
            params = {
                "loan_type": loan_type,
                "amount": amount,
                "tenure_months": tenure
            }
            
            response = await self._make_authenticated_request(
                endpoint="/rates/calculate",
                method="POST",
                data=params
            )
            
            return {
                "base_rate": response.get("base_rate"),
                "applicable_rate": response.get("applicable_rate"),
                "processing_fee": response.get("processing_fee"),
                "other_charges": response.get("other_charges", {}),
                "total_cost": response.get("total_cost"),
                "emi": response.get("emi"),
                "rate_valid_until": response.get("rate_valid_until")
            }
            
        except Exception as e:
            logger.error(f"Error fetching interest rates: {str(e)}")
            return {
                "error": "Interest rate service unavailable"
            }
    
    async def initiate_disbursement(self, disbursement_details: Dict[str, Any]) -> Dict[str, Any]:
        """
        Initiate loan disbursement through NBFC
        """
        try:
            logger.info(f"Initiating disbursement with NBFC {self.nbfc_code}")
            
            if not await self._ensure_authenticated():
                return {
                    "success": False,
                    "error": "Authentication failed"
                }
            
            payload = {
                "application_id": disbursement_details.get("nbfc_application_id"),
                "disbursement_amount": disbursement_details.get("amount"),
                "beneficiary_details": disbursement_details.get("beneficiary_details"),
                "disbursement_mode": disbursement_details.get("disbursement_mode", "RTGS")
            }
            
            response = await self._make_authenticated_request(
                endpoint="/disbursements/initiate",
                method="POST",
                data=payload
            )
            
            if response.get("status") == "success":
                return {
                    "success": True,
                    "disbursement_id": response.get("disbursement_id"),
                    "transaction_reference": response.get("transaction_reference"),
                    "estimated_completion": response.get("estimated_completion"),
                    "status": response.get("disbursement_status", "initiated")
                }
            else:
                return {
                    "success": False,
                    "error": response.get("error", "Disbursement initiation failed")
                }
                
        except Exception as e:
            logger.error(f"Error initiating disbursement: {str(e)}")
            return {
                "success": False,
                "error": "Disbursement service unavailable"
            }
    
    async def _ensure_authenticated(self) -> bool:
        """
        Ensure we have a valid access token
        """
        if (not self.access_token or 
            not self.token_expires_at or 
            datetime.now().timestamp() >= self.token_expires_at - 300):  # Refresh 5 minutes before expiry
            return await self.authenticate()
        return True
    
    async def _make_authenticated_request(self, endpoint: str, method: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Make authenticated API request to NBFC
        """
        try:
            url = f"{self.base_url}{endpoint}"
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                if method.upper() == "GET":
                    response = await client.get(url, headers=headers)
                elif method.upper() == "POST":
                    response = await client.post(url, headers=headers, json=data)
                elif method.upper() == "PUT":
                    response = await client.put(url, headers=headers, json=data)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                
                response.raise_for_status()
                return response.json()
                
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error in NBFC API call: {e.response.status_code} - {e.response.text}")
            raise
        except httpx.RequestError as e:
            logger.error(f"Request error in NBFC API call: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in NBFC API call: {str(e)}")
            raise

class BajajFinservIntegration(NBFCIntegration):
    """
    Bajaj Finserv specific integration
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__("BAJAJ_FINSERV", config)
    
    async def submit_loan_application(self, application_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Bajaj Finserv specific application submission
        """
        # Add Bajaj specific data transformations
        application_data["nbfc_specific"] = {
            "product_code": "BFL_" + application_data.get("loan_type", "").upper(),
            "channel": "API",
            "source": "MSMEBAZAAR"
        }
        
        result = await super().submit_loan_application(application_data)
        
        # Add Bajaj specific processing
        if result.get("success"):
            result["bajaj_customer_id"] = f"BFL_{result.get('nbfc_application_id', '')}"
        
        return result

class TataCapitalIntegration(NBFCIntegration):
    """
    Tata Capital specific integration
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__("TATA_CAPITAL", config)
    
    async def get_interest_rates(self, loan_type: str, amount: float, tenure: int) -> Dict[str, Any]:
        """
        Tata Capital specific interest rate calculation
        """
        # Add Tata Capital specific parameters
        result = await super().get_interest_rates(loan_type, amount, tenure)
        
        # Add Tata Capital specific processing
        if "error" not in result:
            result["tata_advantage_rate"] = result.get("applicable_rate", 0) - 0.25  # Example discount
            result["loyalty_benefits"] = ["Faster processing", "Dedicated relationship manager"]
        
        return result

class NBFCIntegrationManager:
    """
    Manages multiple NBFC integrations
    """
    
    def __init__(self):
        self.integrations: Dict[str, NBFCIntegration] = {}
        self.load_nbfc_configurations()
    
    def load_nbfc_configurations(self):
        """
        Load NBFC configurations from environment/config
        """
        # This would typically load from environment variables or config files
        nbfc_configs = {
            "BAJAJ_FINSERV": {
                "base_url": "https://api.bajajfinserv.in/v1",
                "client_id": "bajaj_client_id",
                "client_secret": "bajaj_client_secret",
                "timeout": 45
            },
            "TATA_CAPITAL": {
                "base_url": "https://api.tatacapital.com/v1",
                "client_id": "tata_client_id",
                "client_secret": "tata_client_secret",
                "timeout": 45
            }
        }
        
        # Initialize integrations
        self.integrations["BAJAJ_FINSERV"] = BajajFinservIntegration(nbfc_configs["BAJAJ_FINSERV"])
        self.integrations["TATA_CAPITAL"] = TataCapitalIntegration(nbfc_configs["TATA_CAPITAL"])
    
    def get_integration(self, nbfc_code: str) -> Optional[NBFCIntegration]:
        """
        Get NBFC integration by code
        """
        return self.integrations.get(nbfc_code.upper())
    
    async def submit_to_multiple_nbfcs(self, application_data: Dict[str, Any], nbfc_codes: List[str]) -> Dict[str, Any]:
        """
        Submit application to multiple NBFCs simultaneously
        """
        results = {}
        
        for nbfc_code in nbfc_codes:
            integration = self.get_integration(nbfc_code)
            if integration:
                try:
                    result = await integration.submit_loan_application(application_data)
                    results[nbfc_code] = result
                except Exception as e:
                    logger.error(f"Error submitting to {nbfc_code}: {str(e)}")
                    results[nbfc_code] = {
                        "success": False,
                        "error": f"Submission to {nbfc_code} failed"
                    }
            else:
                results[nbfc_code] = {
                    "success": False,
                    "error": f"NBFC integration not available for {nbfc_code}"
                }
        
        return results
    
    async def get_best_rates(self, loan_type: str, amount: float, tenure: int) -> List[Dict[str, Any]]:
        """
        Get interest rates from all NBFCs and return sorted by best rate
        """
        rates = []
        
        for nbfc_code, integration in self.integrations.items():
            try:
                rate_info = await integration.get_interest_rates(loan_type, amount, tenure)
                if "error" not in rate_info:
                    rate_info["nbfc_code"] = nbfc_code
                    rates.append(rate_info)
            except Exception as e:
                logger.error(f"Error getting rates from {nbfc_code}: {str(e)}")
        
        # Sort by applicable rate (ascending)
        rates.sort(key=lambda x: x.get("applicable_rate", float('inf')))
        
        return rates
    
    def get_supported_nbfcs(self) -> List[str]:
        """
        Get list of supported NBFCs
        """
        return list(self.integrations.keys())
    
    async def health_check_all_nbfcs(self) -> Dict[str, Any]:
        """
        Check health of all NBFC integrations
        """
        health_status = {}
        
        for nbfc_code, integration in self.integrations.items():
            try:
                # Simple health check - authenticate
                auth_result = await integration.authenticate()
                health_status[nbfc_code] = {
                    "status": "healthy" if auth_result else "unhealthy",
                    "last_check": datetime.now().isoformat()
                }
            except Exception as e:
                health_status[nbfc_code] = {
                    "status": "error",
                    "error": str(e),
                    "last_check": datetime.now().isoformat()
                }
        
        return health_status

# Global NBFC integration manager instance
nbfc_manager = NBFCIntegrationManager()