"""
Bank integration module for connecting with banking partners
"""
import httpx
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum
import hashlib
import hmac
import base64

logger = logging.getLogger(__name__)

class BankType(str, Enum):
    PUBLIC_SECTOR = "public_sector"
    PRIVATE_SECTOR = "private_sector"
    FOREIGN_BANK = "foreign_bank"
    SMALL_FINANCE_BANK = "small_finance_bank"
    PAYMENTS_BANK = "payments_bank"

class IntegrationStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"
    ERROR = "error"

class BankIntegration:
    """
    Base class for bank integrations
    """
    
    def __init__(self, bank_code: str, config: Dict[str, Any]):
        self.bank_code = bank_code
        self.config = config
        self.base_url = config.get("base_url")
        self.api_key = config.get("api_key")
        self.secret_key = config.get("secret_key")
        self.timeout = config.get("timeout", 30)
        
    async def validate_account(self, account_details: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate bank account details
        """
        try:
            logger.info(f"Validating account for bank {self.bank_code}")
            
            # Prepare request
            payload = {
                "account_number": account_details.get("account_number"),
                "ifsc_code": account_details.get("ifsc_code"),
                "account_holder_name": account_details.get("account_holder_name")
            }
            
            # Make API call
            response = await self._make_api_call(
                endpoint="/account/validate",
                method="POST",
                data=payload
            )
            
            if response.get("status") == "success":
                return {
                    "valid": True,
                    "account_holder": response.get("account_holder_name"),
                    "account_type": response.get("account_type"),
                    "bank_name": response.get("bank_name"),
                    "branch": response.get("branch_name")
                }
            else:
                return {
                    "valid": False,
                    "error": response.get("error", "Account validation failed")
                }
                
        except Exception as e:
            logger.error(f"Error validating account: {str(e)}")
            return {
                "valid": False,
                "error": "Account validation service unavailable"
            }
    
    async def initiate_transfer(self, transfer_details: Dict[str, Any]) -> Dict[str, Any]:
        """
        Initiate fund transfer
        """
        try:
            logger.info(f"Initiating transfer for bank {self.bank_code}")
            
            # Prepare transfer request
            payload = {
                "beneficiary_account": transfer_details.get("beneficiary_account"),
                "beneficiary_ifsc": transfer_details.get("beneficiary_ifsc"),
                "beneficiary_name": transfer_details.get("beneficiary_name"),
                "amount": transfer_details.get("amount"),
                "purpose": transfer_details.get("purpose"),
                "reference_id": transfer_details.get("reference_id"),
                "transfer_mode": transfer_details.get("transfer_mode", "RTGS")
            }
            
            # Make API call
            response = await self._make_api_call(
                endpoint="/transfer/initiate",
                method="POST",
                data=payload
            )
            
            if response.get("status") == "success":
                return {
                    "success": True,
                    "transaction_id": response.get("transaction_id"),
                    "reference_number": response.get("reference_number"),
                    "status": response.get("transfer_status", "initiated"),
                    "estimated_completion": response.get("estimated_completion")
                }
            else:
                return {
                    "success": False,
                    "error": response.get("error", "Transfer initiation failed")
                }
                
        except Exception as e:
            logger.error(f"Error initiating transfer: {str(e)}")
            return {
                "success": False,
                "error": "Transfer service unavailable"
            }
    
    async def check_transfer_status(self, transaction_id: str) -> Dict[str, Any]:
        """
        Check transfer status
        """
        try:
            logger.info(f"Checking transfer status for {transaction_id}")
            
            # Make API call
            response = await self._make_api_call(
                endpoint=f"/transfer/status/{transaction_id}",
                method="GET"
            )
            
            return {
                "transaction_id": transaction_id,
                "status": response.get("status", "unknown"),
                "amount": response.get("amount"),
                "processed_at": response.get("processed_at"),
                "failure_reason": response.get("failure_reason")
            }
            
        except Exception as e:
            logger.error(f"Error checking transfer status: {str(e)}")
            return {
                "transaction_id": transaction_id,
                "status": "error",
                "error": "Status check service unavailable"
            }
    
    async def get_balance(self) -> Dict[str, Any]:
        """
        Get account balance
        """
        try:
            logger.info(f"Getting balance for bank {self.bank_code}")
            
            response = await self._make_api_call(
                endpoint="/account/balance",
                method="GET"
            )
            
            return {
                "available_balance": response.get("available_balance", 0),
                "reserved_balance": response.get("reserved_balance", 0),
                "currency": response.get("currency", "INR"),
                "last_updated": response.get("last_updated")
            }
            
        except Exception as e:
            logger.error(f"Error getting balance: {str(e)}")
            return {
                "available_balance": 0,
                "error": "Balance service unavailable"
            }
    
    async def _make_api_call(self, endpoint: str, method: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Make authenticated API call to bank
        """
        try:
            url = f"{self.base_url}{endpoint}"
            headers = self._get_auth_headers(method, endpoint, data)
            
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
            logger.error(f"HTTP error in API call: {e.response.status_code} - {e.response.text}")
            raise
        except httpx.RequestError as e:
            logger.error(f"Request error in API call: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in API call: {str(e)}")
            raise
    
    def _get_auth_headers(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict[str, str]:
        """
        Generate authentication headers for bank API
        """
        timestamp = str(int(datetime.now().timestamp()))
        nonce = base64.b64encode(f"{timestamp}_{self.bank_code}".encode()).decode()
        
        # Create signature
        signature_string = f"{method.upper()}{endpoint}{timestamp}{nonce}"
        if data:
            signature_string += str(data)
        
        signature = hmac.new(
            self.secret_key.encode(),
            signature_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return {
            "Authorization": f"Bearer {self.api_key}",
            "X-Timestamp": timestamp,
            "X-Nonce": nonce,
            "X-Signature": signature,
            "Content-Type": "application/json"
        }

class HDFCBankIntegration(BankIntegration):
    """
    HDFC Bank specific integration
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__("HDFC", config)
    
    async def validate_account(self, account_details: Dict[str, Any]) -> Dict[str, Any]:
        """
        HDFC specific account validation
        """
        # HDFC specific validation logic
        result = await super().validate_account(account_details)
        
        # Add HDFC specific processing
        if result.get("valid"):
            result["bank_specific_data"] = {
                "customer_id": "HDFC_" + account_details.get("account_number", "")[-6:],
                "relationship_number": "REL_" + str(datetime.now().year)
            }
        
        return result

class ICICIBankIntegration(BankIntegration):
    """
    ICICI Bank specific integration
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__("ICICI", config)
    
    async def initiate_transfer(self, transfer_details: Dict[str, Any]) -> Dict[str, Any]:
        """
        ICICI specific transfer initiation
        """
        # ICICI specific transfer logic
        result = await super().initiate_transfer(transfer_details)
        
        # Add ICICI specific processing
        if result.get("success"):
            result["icici_reference"] = f"ICICI_{result.get('transaction_id', '')}"
        
        return result

class BankIntegrationManager:
    """
    Manages multiple bank integrations
    """
    
    def __init__(self):
        self.integrations: Dict[str, BankIntegration] = {}
        self.load_bank_configurations()
    
    def load_bank_configurations(self):
        """
        Load bank configurations from environment/config
        """
        # This would typically load from environment variables or config files
        bank_configs = {
            "HDFC": {
                "base_url": "https://api.hdfcbank.com/v1",
                "api_key": "hdfc_api_key",
                "secret_key": "hdfc_secret_key",
                "timeout": 30
            },
            "ICICI": {
                "base_url": "https://api.icicibank.com/v1",
                "api_key": "icici_api_key",
                "secret_key": "icici_secret_key",
                "timeout": 30
            }
        }
        
        # Initialize integrations
        self.integrations["HDFC"] = HDFCBankIntegration(bank_configs["HDFC"])
        self.integrations["ICICI"] = ICICIBankIntegration(bank_configs["ICICI"])
    
    def get_integration(self, bank_code: str) -> Optional[BankIntegration]:
        """
        Get bank integration by code
        """
        return self.integrations.get(bank_code.upper())
    
    async def validate_account_with_bank(self, bank_code: str, account_details: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate account with specific bank
        """
        integration = self.get_integration(bank_code)
        if not integration:
            return {
                "valid": False,
                "error": f"Bank integration not available for {bank_code}"
            }
        
        return await integration.validate_account(account_details)
    
    async def initiate_transfer_with_bank(self, bank_code: str, transfer_details: Dict[str, Any]) -> Dict[str, Any]:
        """
        Initiate transfer with specific bank
        """
        integration = self.get_integration(bank_code)
        if not integration:
            return {
                "success": False,
                "error": f"Bank integration not available for {bank_code}"
            }
        
        return await integration.initiate_transfer(transfer_details)
    
    def get_supported_banks(self) -> List[str]:
        """
        Get list of supported banks
        """
        return list(self.integrations.keys())
    
    async def health_check_all_banks(self) -> Dict[str, Any]:
        """
        Check health of all bank integrations
        """
        health_status = {}
        
        for bank_code, integration in self.integrations.items():
            try:
                # Simple health check - get balance
                result = await integration.get_balance()
                health_status[bank_code] = {
                    "status": "healthy" if "error" not in result else "unhealthy",
                    "last_check": datetime.now().isoformat()
                }
            except Exception as e:
                health_status[bank_code] = {
                    "status": "error",
                    "error": str(e),
                    "last_check": datetime.now().isoformat()
                }
        
        return health_status

# Global bank integration manager instance
bank_manager = BankIntegrationManager()