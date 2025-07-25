"""
Loan workflow orchestration and state management
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from enum import Enum
import logging
import asyncio

logger = logging.getLogger(__name__)

class WorkflowStatus(str, Enum):
    INITIATED = "initiated"
    DOCUMENT_COLLECTION = "document_collection"
    KYC_VERIFICATION = "kyc_verification"
    RISK_ASSESSMENT = "risk_assessment"
    UNDERWRITING = "underwriting"
    APPROVAL = "approval"
    DISBURSEMENT = "disbursement"
    COMPLETED = "completed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class WorkflowStep(str, Enum):
    APPLICATION_SUBMITTED = "application_submitted"
    DOCUMENTS_UPLOADED = "documents_uploaded"
    KYC_COMPLETED = "kyc_completed"
    RISK_ASSESSED = "risk_assessed"
    UNDERWRITING_COMPLETED = "underwriting_completed"
    LOAN_APPROVED = "loan_approved"
    LOAN_REJECTED = "loan_rejected"
    DISBURSEMENT_INITIATED = "disbursement_initiated"
    DISBURSEMENT_COMPLETED = "disbursement_completed"

class LoanWorkflow:
    """
    Orchestrates the complete loan processing workflow
    """
    
    def __init__(self, application_id: str):
        self.application_id = application_id
        self.current_status = WorkflowStatus.INITIATED
        self.steps_completed = []
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        
    async def start_workflow(self, application_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Start the loan workflow process
        """
        try:
            logger.info(f"Starting loan workflow for application {self.application_id}")
            
            # Initialize workflow state
            workflow_state = {
                "application_id": self.application_id,
                "status": WorkflowStatus.DOCUMENT_COLLECTION,
                "current_step": "document_collection",
                "steps_completed": [],
                "next_steps": [
                    "Upload required documents",
                    "Complete KYC verification"
                ],
                "estimated_completion": datetime.now() + timedelta(days=7),
                "created_at": self.created_at,
                "updated_at": datetime.now()
            }
            
            # Trigger document collection notification
            await self._send_notification(
                "document_collection_required",
                application_data.get("business_id"),
                "Please upload required documents to proceed with your loan application"
            )
            
            return workflow_state
            
        except Exception as e:
            logger.error(f"Error starting workflow: {str(e)}")
            raise
    
    async def process_document_upload(self, documents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Process document upload step
        """
        try:
            logger.info(f"Processing document upload for application {self.application_id}")
            
            # Validate documents
            required_docs = ["financial_statements", "bank_statements", "kyc_documents"]
            uploaded_docs = [doc["type"] for doc in documents]
            
            missing_docs = [doc for doc in required_docs if doc not in uploaded_docs]
            
            if missing_docs:
                return {
                    "status": "incomplete",
                    "missing_documents": missing_docs,
                    "message": "Please upload all required documents"
                }
            
            # Mark step as completed
            self.steps_completed.append(WorkflowStep.DOCUMENTS_UPLOADED)
            self.current_status = WorkflowStatus.KYC_VERIFICATION
            
            # Trigger KYC verification
            await self._trigger_kyc_verification()
            
            return {
                "status": WorkflowStatus.KYC_VERIFICATION,
                "message": "Documents uploaded successfully. KYC verification initiated.",
                "next_steps": ["Complete KYC verification process"]
            }
            
        except Exception as e:
            logger.error(f"Error processing document upload: {str(e)}")
            raise
    
    async def process_kyc_completion(self, kyc_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process KYC completion step
        """
        try:
            logger.info(f"Processing KYC completion for application {self.application_id}")
            
            # Validate KYC data
            if not kyc_data.get("verified", False):
                return {
                    "status": "kyc_failed",
                    "message": "KYC verification failed. Please retry.",
                    "reasons": kyc_data.get("failure_reasons", [])
                }
            
            # Mark step as completed
            self.steps_completed.append(WorkflowStep.KYC_COMPLETED)
            self.current_status = WorkflowStatus.RISK_ASSESSMENT
            
            # Trigger risk assessment
            await self._trigger_risk_assessment()
            
            return {
                "status": WorkflowStatus.RISK_ASSESSMENT,
                "message": "KYC verification completed. Risk assessment initiated.",
                "next_steps": ["Automated risk assessment in progress"]
            }
            
        except Exception as e:
            logger.error(f"Error processing KYC completion: {str(e)}")
            raise
    
    async def process_risk_assessment(self, risk_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process risk assessment completion
        """
        try:
            logger.info(f"Processing risk assessment for application {self.application_id}")
            
            risk_score = risk_data.get("risk_score", 0)
            risk_level = risk_data.get("risk_level", "high")
            
            # Mark step as completed
            self.steps_completed.append(WorkflowStep.RISK_ASSESSED)
            
            # Determine next step based on risk level
            if risk_level in ["low", "medium"]:
                self.current_status = WorkflowStatus.UNDERWRITING
                await self._trigger_underwriting(risk_data)
                
                return {
                    "status": WorkflowStatus.UNDERWRITING,
                    "message": "Risk assessment completed. Underwriting process initiated.",
                    "risk_score": risk_score,
                    "next_steps": ["Underwriting review in progress"]
                }
            else:
                # High risk requires manual review
                self.current_status = WorkflowStatus.UNDERWRITING
                await self._trigger_manual_review(risk_data)
                
                return {
                    "status": WorkflowStatus.UNDERWRITING,
                    "message": "Risk assessment completed. Manual underwriting review required.",
                    "risk_score": risk_score,
                    "next_steps": ["Manual underwriting review in progress"]
                }
                
        except Exception as e:
            logger.error(f"Error processing risk assessment: {str(e)}")
            raise
    
    async def process_underwriting_decision(self, decision_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process underwriting decision
        """
        try:
            logger.info(f"Processing underwriting decision for application {self.application_id}")
            
            decision = decision_data.get("decision", "rejected")
            
            # Mark step as completed
            self.steps_completed.append(WorkflowStep.UNDERWRITING_COMPLETED)
            
            if decision == "approved":
                self.current_status = WorkflowStatus.APPROVAL
                self.steps_completed.append(WorkflowStep.LOAN_APPROVED)
                
                # Trigger disbursement preparation
                await self._prepare_disbursement(decision_data)
                
                return {
                    "status": WorkflowStatus.APPROVAL,
                    "message": "Loan approved successfully!",
                    "approved_amount": decision_data.get("approved_amount"),
                    "interest_rate": decision_data.get("interest_rate"),
                    "next_steps": ["Disbursement preparation in progress"]
                }
            else:
                self.current_status = WorkflowStatus.REJECTED
                self.steps_completed.append(WorkflowStep.LOAN_REJECTED)
                
                await self._send_rejection_notification(decision_data)
                
                return {
                    "status": WorkflowStatus.REJECTED,
                    "message": "Loan application rejected.",
                    "reasons": decision_data.get("reasons", [])
                }
                
        except Exception as e:
            logger.error(f"Error processing underwriting decision: {str(e)}")
            raise
    
    async def process_disbursement_completion(self, disbursement_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process disbursement completion
        """
        try:
            logger.info(f"Processing disbursement completion for application {self.application_id}")
            
            # Mark steps as completed
            self.steps_completed.extend([
                WorkflowStep.DISBURSEMENT_INITIATED,
                WorkflowStep.DISBURSEMENT_COMPLETED
            ])
            self.current_status = WorkflowStatus.COMPLETED
            
            # Send completion notifications
            await self._send_completion_notification(disbursement_data)
            
            return {
                "status": WorkflowStatus.COMPLETED,
                "message": "Loan disbursement completed successfully!",
                "disbursement_id": disbursement_data.get("disbursement_id"),
                "amount": disbursement_data.get("amount"),
                "transaction_reference": disbursement_data.get("transaction_reference")
            }
            
        except Exception as e:
            logger.error(f"Error processing disbursement completion: {str(e)}")
            raise
    
    async def get_workflow_status(self) -> Dict[str, Any]:
        """
        Get current workflow status and next steps
        """
        try:
            next_steps = self._get_next_steps()
            progress_percentage = self._calculate_progress()
            
            return {
                "application_id": self.application_id,
                "current_status": self.current_status,
                "steps_completed": self.steps_completed,
                "progress_percentage": progress_percentage,
                "next_steps": next_steps,
                "estimated_completion": self._estimate_completion(),
                "created_at": self.created_at,
                "updated_at": self.updated_at
            }
            
        except Exception as e:
            logger.error(f"Error getting workflow status: {str(e)}")
            raise
    
    def _get_next_steps(self) -> List[str]:
        """Get next steps based on current status"""
        next_steps_map = {
            WorkflowStatus.INITIATED: ["Submit loan application"],
            WorkflowStatus.DOCUMENT_COLLECTION: ["Upload required documents"],
            WorkflowStatus.KYC_VERIFICATION: ["Complete KYC verification"],
            WorkflowStatus.RISK_ASSESSMENT: ["Automated risk assessment in progress"],
            WorkflowStatus.UNDERWRITING: ["Underwriting review in progress"],
            WorkflowStatus.APPROVAL: ["Disbursement preparation"],
            WorkflowStatus.DISBURSEMENT: ["Fund disbursement in progress"],
            WorkflowStatus.COMPLETED: ["Loan process completed"],
            WorkflowStatus.REJECTED: ["Application rejected"],
            WorkflowStatus.CANCELLED: ["Application cancelled"]
        }
        return next_steps_map.get(self.current_status, [])
    
    def _calculate_progress(self) -> float:
        """Calculate workflow progress percentage"""
        total_steps = 8  # Total number of workflow steps
        completed_steps = len(self.steps_completed)
        return min((completed_steps / total_steps) * 100, 100)
    
    def _estimate_completion(self) -> datetime:
        """Estimate workflow completion date"""
        base_days = {
            WorkflowStatus.INITIATED: 7,
            WorkflowStatus.DOCUMENT_COLLECTION: 5,
            WorkflowStatus.KYC_VERIFICATION: 3,
            WorkflowStatus.RISK_ASSESSMENT: 2,
            WorkflowStatus.UNDERWRITING: 2,
            WorkflowStatus.APPROVAL: 1,
            WorkflowStatus.DISBURSEMENT: 1
        }
        
        days_remaining = base_days.get(self.current_status, 0)
        return datetime.now() + timedelta(days=days_remaining)
    
    async def _trigger_kyc_verification(self):
        """Trigger KYC verification process"""
        logger.info(f"Triggering KYC verification for {self.application_id}")
        # This would integrate with KYC service
        pass
    
    async def _trigger_risk_assessment(self):
        """Trigger risk assessment process"""
        logger.info(f"Triggering risk assessment for {self.application_id}")
        # This would integrate with risk assessment service
        pass
    
    async def _trigger_underwriting(self, risk_data: Dict[str, Any]):
        """Trigger underwriting process"""
        logger.info(f"Triggering underwriting for {self.application_id}")
        # This would integrate with underwriting service
        pass
    
    async def _trigger_manual_review(self, risk_data: Dict[str, Any]):
        """Trigger manual review process"""
        logger.info(f"Triggering manual review for {self.application_id}")
        # This would notify underwriters for manual review
        pass
    
    async def _prepare_disbursement(self, decision_data: Dict[str, Any]):
        """Prepare for disbursement"""
        logger.info(f"Preparing disbursement for {self.application_id}")
        # This would prepare disbursement documentation and processes
        pass
    
    async def _send_notification(self, notification_type: str, business_id: str, message: str):
        """Send notification to business"""
        logger.info(f"Sending {notification_type} notification to {business_id}")
        # This would integrate with notification service
        pass
    
    async def _send_rejection_notification(self, decision_data: Dict[str, Any]):
        """Send rejection notification"""
        logger.info(f"Sending rejection notification for {self.application_id}")
        # This would send detailed rejection notification
        pass
    
    async def _send_completion_notification(self, disbursement_data: Dict[str, Any]):
        """Send completion notification"""
        logger.info(f"Sending completion notification for {self.application_id}")
        # This would send loan completion notification
        pass