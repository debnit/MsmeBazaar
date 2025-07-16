"""
🚀 Queues & Async Workers (BullMQ + Celery)
Advanced queue system for handling async tasks
"""

import asyncio
import json
import logging
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import uuid
from concurrent.futures import ThreadPoolExecutor
import time

# Import queue systems
import redis
from celery import Celery
from celery.result import AsyncResult
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRY = "retry"
    CANCELLED = "cancelled"

class TaskPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"

class TaskType(str, Enum):
    VALUATION = "valuation"
    BUYER_SCORING = "buyer_scoring"
    NOTIFICATION = "notification"
    DOCUMENT_GENERATION = "document_generation"
    DATA_EXPORT = "data_export"
    ML_TRAINING = "ml_training"
    COMPLIANCE_CHECK = "compliance_check"
    WHATSAPP_MESSAGE = "whatsapp_message"
    EMAIL_CAMPAIGN = "email_campaign"
    PDF_GENERATION = "pdf_generation"

@dataclass
class TaskRequest:
    task_id: str
    task_type: TaskType
    payload: Dict[str, Any]
    priority: TaskPriority = TaskPriority.NORMAL
    created_at: datetime = None
    schedule_at: Optional[datetime] = None
    retry_count: int = 0
    max_retries: int = 3
    timeout: int = 300  # 5 minutes
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.task_id is None:
            self.task_id = str(uuid.uuid4())

@dataclass
class TaskResult:
    task_id: str
    status: TaskStatus
    result: Dict[str, Any] = None
    error: str = None
    started_at: datetime = None
    completed_at: datetime = None
    processing_time: float = None
    
    def __post_init__(self):
        if self.result is None:
            self.result = {}

class TaskSubmissionRequest(BaseModel):
    task_type: TaskType
    payload: Dict[str, Any]
    priority: TaskPriority = TaskPriority.NORMAL
    schedule_at: Optional[datetime] = None
    max_retries: int = 3
    timeout: int = 300

class TaskStatusResponse(BaseModel):
    task_id: str
    status: TaskStatus
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    processing_time: Optional[float] = None
    retry_count: int = 0

class MSMETaskQueue:
    def __init__(self):
        self.redis_client = None
        self.celery_app = None
        self.tasks = {}  # In-memory task storage
        self.workers = {}  # Worker pool
        self.task_handlers = {}
        self.executor = ThreadPoolExecutor(max_workers=10)
        
        # Initialize Celery
        self.setup_celery()
        
        # Register task handlers
        self.register_task_handlers()
    
    def setup_celery(self):
        """Setup Celery app"""
        self.celery_app = Celery(
            'msme_tasks',
            broker='redis://localhost:6379/0',
            backend='redis://localhost:6379/0'
        )
        
        # Configure Celery
        self.celery_app.conf.update(
            task_serializer='json',
            accept_content=['json'],
            result_serializer='json',
            timezone='UTC',
            enable_utc=True,
            task_track_started=True,
            task_time_limit=300,
            task_soft_time_limit=240,
            worker_prefetch_multiplier=1,
            task_acks_late=True,
            worker_disable_rate_limits=False,
            task_compression='gzip',
            result_compression='gzip',
        )
        
        # Setup Redis client
        try:
            self.redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
            self.redis_client.ping()
            logger.info("Redis connection established")
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            self.redis_client = None
    
    def register_task_handlers(self):
        """Register task handlers for different task types"""
        self.task_handlers = {
            TaskType.VALUATION: self.handle_valuation_task,
            TaskType.BUYER_SCORING: self.handle_buyer_scoring_task,
            TaskType.NOTIFICATION: self.handle_notification_task,
            TaskType.DOCUMENT_GENERATION: self.handle_document_generation_task,
            TaskType.DATA_EXPORT: self.handle_data_export_task,
            TaskType.ML_TRAINING: self.handle_ml_training_task,
            TaskType.COMPLIANCE_CHECK: self.handle_compliance_check_task,
            TaskType.WHATSAPP_MESSAGE: self.handle_whatsapp_message_task,
            TaskType.EMAIL_CAMPAIGN: self.handle_email_campaign_task,
            TaskType.PDF_GENERATION: self.handle_pdf_generation_task,
        }
    
    async def submit_task(self, task_request: TaskSubmissionRequest) -> str:
        """Submit a new task to the queue"""
        task_id = str(uuid.uuid4())
        
        task = TaskRequest(
            task_id=task_id,
            task_type=task_request.task_type,
            payload=task_request.payload,
            priority=task_request.priority,
            schedule_at=task_request.schedule_at,
            max_retries=task_request.max_retries,
            timeout=task_request.timeout
        )
        
        # Store task
        self.tasks[task_id] = TaskResult(
            task_id=task_id,
            status=TaskStatus.PENDING,
        )
        
        # Submit to appropriate queue
        if task_request.schedule_at and task_request.schedule_at > datetime.utcnow():
            # Scheduled task
            await self.schedule_task(task)
        else:
            # Immediate task
            await self.queue_task(task)
        
        logger.info(f"Task {task_id} submitted with type {task_request.task_type}")
        return task_id
    
    async def queue_task(self, task: TaskRequest):
        """Queue task for immediate processing"""
        try:
            if self.celery_app:
                # Use Celery for distributed processing
                self.celery_app.send_task(
                    'msme_tasks.process_task',
                    args=[asdict(task)],
                    task_id=task.task_id,
                    priority=self.get_priority_value(task.priority),
                    time_limit=task.timeout,
                    soft_time_limit=task.timeout - 60
                )
            else:
                # Fallback to thread pool
                self.executor.submit(self.process_task_sync, task)
        except Exception as e:
            logger.error(f"Error queuing task {task.task_id}: {e}")
            self.tasks[task.task_id].status = TaskStatus.FAILED
            self.tasks[task.task_id].error = str(e)
    
    async def schedule_task(self, task: TaskRequest):
        """Schedule task for future execution"""
        delay = (task.schedule_at - datetime.utcnow()).total_seconds()
        
        if self.celery_app:
            self.celery_app.send_task(
                'msme_tasks.process_task',
                args=[asdict(task)],
                task_id=task.task_id,
                countdown=delay,
                priority=self.get_priority_value(task.priority)
            )
        else:
            # Fallback scheduling
            asyncio.create_task(self.delayed_task_execution(task, delay))
    
    async def delayed_task_execution(self, task: TaskRequest, delay: float):
        """Execute task after delay"""
        await asyncio.sleep(delay)
        await self.queue_task(task)
    
    def get_priority_value(self, priority: TaskPriority) -> int:
        """Convert priority enum to numeric value"""
        priority_map = {
            TaskPriority.LOW: 1,
            TaskPriority.NORMAL: 5,
            TaskPriority.HIGH: 7,
            TaskPriority.CRITICAL: 9
        }
        return priority_map.get(priority, 5)
    
    async def process_task(self, task: TaskRequest):
        """Process a single task"""
        task_result = self.tasks.get(task.task_id)
        if not task_result:
            return
        
        task_result.status = TaskStatus.PROCESSING
        task_result.started_at = datetime.utcnow()
        
        try:
            # Get task handler
            handler = self.task_handlers.get(task.task_type)
            if not handler:
                raise ValueError(f"No handler found for task type: {task.task_type}")
            
            # Execute task
            result = await handler(task.payload)
            
            # Update task result
            task_result.status = TaskStatus.COMPLETED
            task_result.result = result
            task_result.completed_at = datetime.utcnow()
            
            if task_result.started_at:
                task_result.processing_time = (task_result.completed_at - task_result.started_at).total_seconds()
            
            logger.info(f"Task {task.task_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Task {task.task_id} failed: {e}")
            task_result.status = TaskStatus.FAILED
            task_result.error = str(e)
            task_result.completed_at = datetime.utcnow()
            
            # Handle retry logic
            if task.retry_count < task.max_retries:
                task.retry_count += 1
                task_result.status = TaskStatus.RETRY
                task_result.retry_count = task.retry_count
                
                # Exponential backoff
                delay = 2 ** task.retry_count * 60  # 2, 4, 8 minutes
                await asyncio.sleep(delay)
                await self.process_task(task)
    
    def process_task_sync(self, task: TaskRequest):
        """Synchronous wrapper for task processing"""
        asyncio.run(self.process_task(task))
    
    async def get_task_status(self, task_id: str) -> Optional[TaskResult]:
        """Get task status"""
        return self.tasks.get(task_id)
    
    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a pending task"""
        task_result = self.tasks.get(task_id)
        if not task_result:
            return False
        
        if task_result.status == TaskStatus.PENDING:
            task_result.status = TaskStatus.CANCELLED
            task_result.completed_at = datetime.utcnow()
            
            # Cancel Celery task if applicable
            if self.celery_app:
                self.celery_app.control.revoke(task_id, terminate=True)
            
            return True
        
        return False
    
    # Task Handlers
    async def handle_valuation_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle MSME valuation task"""
        # Simulate valuation processing
        await asyncio.sleep(2)
        
        return {
            "estimated_value": 2500000,
            "confidence_score": 0.85,
            "model_used": "XGBoost",
            "processing_time": 2.1
        }
    
    async def handle_buyer_scoring_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle buyer scoring task"""
        await asyncio.sleep(1)
        
        return {
            "buyer_id": payload.get("buyer_id"),
            "score": 75.5,
            "segment": "evaluator",
            "intent_level": "high"
        }
    
    async def handle_notification_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle notification task"""
        await asyncio.sleep(0.5)
        
        return {
            "notification_id": str(uuid.uuid4()),
            "sent_at": datetime.utcnow().isoformat(),
            "status": "sent"
        }
    
    async def handle_document_generation_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle document generation task"""
        await asyncio.sleep(3)
        
        return {
            "document_id": str(uuid.uuid4()),
            "document_type": payload.get("document_type"),
            "file_path": f"/documents/{uuid.uuid4()}.pdf",
            "generated_at": datetime.utcnow().isoformat()
        }
    
    async def handle_data_export_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle data export task"""
        await asyncio.sleep(5)
        
        return {
            "export_id": str(uuid.uuid4()),
            "format": payload.get("format", "csv"),
            "file_path": f"/exports/{uuid.uuid4()}.csv",
            "record_count": 1000
        }
    
    async def handle_ml_training_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle ML model training task"""
        await asyncio.sleep(10)
        
        return {
            "model_id": str(uuid.uuid4()),
            "model_type": payload.get("model_type"),
            "accuracy": 0.89,
            "training_time": 10.5
        }
    
    async def handle_compliance_check_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle compliance check task"""
        await asyncio.sleep(2)
        
        return {
            "check_id": str(uuid.uuid4()),
            "compliance_status": "compliant",
            "issues_found": [],
            "checked_at": datetime.utcnow().isoformat()
        }
    
    async def handle_whatsapp_message_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle WhatsApp message task"""
        await asyncio.sleep(1)
        
        return {
            "message_id": str(uuid.uuid4()),
            "recipient": payload.get("recipient"),
            "status": "sent",
            "sent_at": datetime.utcnow().isoformat()
        }
    
    async def handle_email_campaign_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle email campaign task"""
        await asyncio.sleep(3)
        
        return {
            "campaign_id": str(uuid.uuid4()),
            "emails_sent": payload.get("recipient_count", 100),
            "success_rate": 0.95,
            "sent_at": datetime.utcnow().isoformat()
        }
    
    async def handle_pdf_generation_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle PDF generation task"""
        await asyncio.sleep(2)
        
        return {
            "pdf_id": str(uuid.uuid4()),
            "file_path": f"/pdfs/{uuid.uuid4()}.pdf",
            "page_count": 5,
            "generated_at": datetime.utcnow().isoformat()
        }

# Initialize queue system
task_queue = MSMETaskQueue()

# FastAPI app
app = FastAPI(
    title="MSME Task Queue API",
    description="Advanced queue system for handling async tasks",
    version="1.0.0"
)

@app.post("/tasks/submit")
async def submit_task(request: TaskSubmissionRequest):
    """Submit a new task to the queue"""
    try:
        task_id = await task_queue.submit_task(request)
        return {"task_id": task_id, "status": "submitted"}
    except Exception as e:
        logger.error(f"Error submitting task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tasks/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """Get task status"""
    task_result = await task_queue.get_task_status(task_id)
    if not task_result:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return TaskStatusResponse(
        task_id=task_result.task_id,
        status=task_result.status,
        result=task_result.result,
        error=task_result.error,
        created_at=datetime.utcnow(),  # Default since we don't store created_at
        started_at=task_result.started_at,
        completed_at=task_result.completed_at,
        processing_time=task_result.processing_time,
        retry_count=task_result.retry_count
    )

@app.delete("/tasks/{task_id}")
async def cancel_task(task_id: str):
    """Cancel a pending task"""
    cancelled = await task_queue.cancel_task(task_id)
    if not cancelled:
        raise HTTPException(status_code=400, detail="Task cannot be cancelled")
    
    return {"task_id": task_id, "status": "cancelled"}

@app.get("/tasks/queue/stats")
async def get_queue_stats():
    """Get queue statistics"""
    stats = {
        "total_tasks": len(task_queue.tasks),
        "pending": len([t for t in task_queue.tasks.values() if t.status == TaskStatus.PENDING]),
        "processing": len([t for t in task_queue.tasks.values() if t.status == TaskStatus.PROCESSING]),
        "completed": len([t for t in task_queue.tasks.values() if t.status == TaskStatus.COMPLETED]),
        "failed": len([t for t in task_queue.tasks.values() if t.status == TaskStatus.FAILED])
    }
    return stats

@app.get("/tasks/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "queue_active": True,
        "redis_connected": task_queue.redis_client is not None,
        "celery_active": task_queue.celery_app is not None
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8003)