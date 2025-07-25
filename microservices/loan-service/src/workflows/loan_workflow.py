"""
Simple loan workflow module
"""
import logging

logger = logging.getLogger(__name__)

class LoanWorkflow:
    """Simple loan workflow class"""
    
    def __init__(self, application_id: str):
        self.application_id = application_id
        logger.info(f"Initialized workflow for application {application_id}")
    
    def start_workflow(self):
        """Start the loan workflow"""
        logger.info(f"Starting workflow for application {self.application_id}")
        return {"status": "started", "application_id": self.application_id}