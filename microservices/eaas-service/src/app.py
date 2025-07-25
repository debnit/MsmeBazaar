"""
🏢 EaaS Service - Everything-as-a-Service
FastAPI + PDFKit + DocuSign API for document generation
Generate sale deeds, NDAs, exit docs with e-signature integration
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import asyncio
import aiofiles
import os
import json
import uuid
import logging
from pathlib import Path
import tempfile
import io
from reportlab.lib.pagesizes import letter, A4
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from jinja2 import Template
import requests
from docusign_esign import ApiClient, EnvelopesApi, DocumentsApi, Configuration
from docusign_esign.models import EnvelopeDefinition, Document, Signer, SignHere, Tabs, Recipients
import base64
from dataclasses import dataclass
from enum import Enum
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app initialization
app = FastAPI(
    title="EaaS Service - Document Generation",
    description="Everything-as-a-Service for legal document generation with e-signature integration",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Document types enum
class DocumentType(str, Enum):
    SALE_DEED = "sale_deed"
    NDA = "nda"
    EXIT_DOCUMENT = "exit_document"
    SHARE_PURCHASE_AGREEMENT = "share_purchase_agreement"
    ASSET_PURCHASE_AGREEMENT = "asset_purchase_agreement"
    EMPLOYMENT_AGREEMENT = "employment_agreement"
    CONSULTANCY_AGREEMENT = "consultancy_agreement"
    VALUATION_REPORT = "valuation_report"
    DUE_DILIGENCE_REPORT = "due_diligence_report"
    COMPLIANCE_CERTIFICATE = "compliance_certificate"

# Document status enum
class DocumentStatus(str, Enum):
    DRAFT = "draft"
    GENERATED = "generated"
    SENT_FOR_SIGNATURE = "sent_for_signature"
    PARTIALLY_SIGNED = "partially_signed"
    FULLY_SIGNED = "fully_signed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

# Pydantic models
class DocumentRequest(BaseModel):
    document_type: DocumentType
    template_id: Optional[str] = None
    data: Dict[str, Any]
    signers: List[Dict[str, str]]  # [{"name": "John Doe", "email": "john@example.com", "role": "seller"}]
    require_signature: bool = True
    notification_email: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class DocumentResponse(BaseModel):
    document_id: str
    document_type: DocumentType
    status: DocumentStatus
    download_url: Optional[str] = None
    docusign_envelope_id: Optional[str] = None
    signature_url: Optional[str] = None
    created_at: datetime
    expires_at: Optional[datetime] = None

class SignatureRequest(BaseModel):
    document_id: str
    signer_email: str
    redirect_url: Optional[str] = None

class TemplateRequest(BaseModel):
    template_name: str
    document_type: DocumentType
    template_content: str
    variables: List[str]
    default_styling: Optional[Dict[str, Any]] = None

@dataclass
class DocumentGenerator:
    """Document generation service with PDF creation and templating"""
    
    def __init__(self):
        self.temp_dir = Path(tempfile.gettempdir()) / "eaas_documents"
        self.temp_dir.mkdir(exist_ok=True)
        self.templates_dir = Path(__file__).parent / "templates"
        self.templates_dir.mkdir(exist_ok=True)
        
    async def generate_sale_deed(self, data: Dict[str, Any]) -> bytes:
        """Generate a sale deed document"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, 
                               topMargin=72, bottomMargin=18)
        
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=HexColor('#2E86AB')
        )
        
        content = []
        
        # Title
        title = Paragraph("SALE DEED", title_style)
        content.append(title)
        content.append(Spacer(1, 12))
        
        # Document content
        sale_deed_content = f"""
        <para align="justify">
        This Sale Deed is executed on {data.get('execution_date', datetime.now().strftime('%B %d, %Y'))} 
        between {data.get('seller_name', 'SELLER NAME')} (hereinafter referred to as "SELLER") 
        and {data.get('buyer_name', 'BUYER NAME')} (hereinafter referred to as "BUYER").
        </para>
        
        <para align="justify" spaceBefore="12">
        <b>WHEREAS:</b> The Seller is the absolute owner of the business/assets described herein 
        and wishes to sell the same to the Buyer for the consideration mentioned below.
        </para>
        
        <para align="justify" spaceBefore="12">
        <b>BUSINESS DETAILS:</b>
        </para>
        
        <para align="left" spaceBefore="6">
        • Business Name: {data.get('business_name', 'BUSINESS NAME')}
        • Industry: {data.get('industry', 'INDUSTRY')}
        • Annual Turnover: ₹{data.get('annual_turnover', 'TURNOVER')}
        • Location: {data.get('location', 'LOCATION')}
        • Employee Count: {data.get('employee_count', 'COUNT')}
        </para>
        
        <para align="justify" spaceBefore="12">
        <b>CONSIDERATION:</b> The total consideration for this sale is ₹{data.get('sale_price', 'SALE PRICE')} 
        (Rupees {data.get('sale_price_words', 'AMOUNT IN WORDS')}).
        </para>
        
        <para align="justify" spaceBefore="12">
        <b>TERMS AND CONDITIONS:</b>
        </para>
        
        <para align="left" spaceBefore="6">
        1. The Seller hereby transfers all rights, title, and interest in the business to the Buyer.
        2. The Buyer shall assume all liabilities and obligations of the business from the date of transfer.
        3. All necessary regulatory approvals and licenses shall be transferred to the Buyer.
        4. The Seller warrants that the business is free from any encumbrances or legal disputes.
        5. This deed shall be governed by the laws of India.
        </para>
        
        <para align="justify" spaceBefore="24">
        IN WITNESS WHEREOF, the parties have executed this Sale Deed on the date first written above.
        </para>
        """
        
        content.append(Paragraph(sale_deed_content, styles['Normal']))
        content.append(Spacer(1, 48))
        
        # Signature section
        sig_data = [
            ['SELLER', '', 'BUYER'],
            ['', '', ''],
            ['Signature: _________________', '', 'Signature: _________________'],
            [f"Name: {data.get('seller_name', 'SELLER NAME')}", '', f"Name: {data.get('buyer_name', 'BUYER NAME')}"],
            [f"Date: {data.get('execution_date', datetime.now().strftime('%B %d, %Y'))}", '', f"Date: {data.get('execution_date', datetime.now().strftime('%B %d, %Y'))}"]
        ]
        
        sig_table = Table(sig_data, colWidths=[2.5*inch, 1*inch, 2.5*inch])
        sig_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ]))
        
        content.append(sig_table)
        
        # Build PDF
        doc.build(content)
        buffer.seek(0)
        return buffer.read()
    
    async def generate_nda(self, data: Dict[str, Any]) -> bytes:
        """Generate a Non-Disclosure Agreement"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, 
                               topMargin=72, bottomMargin=18)
        
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=HexColor('#2E86AB')
        )
        
        content = []
        
        # Title
        title = Paragraph("NON-DISCLOSURE AGREEMENT", title_style)
        content.append(title)
        content.append(Spacer(1, 12))
        
        # NDA content
        nda_content = f"""
        <para align="justify">
        This Non-Disclosure Agreement ("Agreement") is entered into on {data.get('execution_date', datetime.now().strftime('%B %d, %Y'))} 
        between {data.get('disclosing_party', 'DISCLOSING PARTY')} ("Disclosing Party") 
        and {data.get('receiving_party', 'RECEIVING PARTY')} ("Receiving Party").
        </para>
        
        <para align="justify" spaceBefore="12">
        <b>WHEREAS:</b> The Disclosing Party possesses certain confidential and proprietary information 
        related to the business transaction and is willing to disclose such information to the Receiving Party 
        for the purpose of evaluating potential business opportunities.
        </para>
        
        <para align="justify" spaceBefore="12">
        <b>1. CONFIDENTIAL INFORMATION:</b> For purposes of this Agreement, "Confidential Information" means 
        any and all information disclosed by the Disclosing Party including but not limited to:
        </para>
        
        <para align="left" spaceBefore="6">
        • Financial statements, business plans, and projections
        • Customer lists, supplier information, and pricing data
        • Technical specifications, processes, and know-how
        • Marketing strategies and business methodologies
        • Any other proprietary information marked as confidential
        </para>
        
        <para align="justify" spaceBefore="12">
        <b>2. OBLIGATIONS OF RECEIVING PARTY:</b> The Receiving Party agrees to:
        </para>
        
        <para align="left" spaceBefore="6">
        • Maintain the confidentiality of all Confidential Information
        • Use the information solely for evaluation purposes
        • Not disclose the information to any third party without written consent
        • Return or destroy all confidential materials upon request
        • Not use the information to compete with the Disclosing Party
        </para>
        
        <para align="justify" spaceBefore="12">
        <b>3. TERM:</b> This Agreement shall remain in effect for a period of {data.get('term_years', '3')} years 
        from the date of execution.
        </para>
        
        <para align="justify" spaceBefore="12">
        <b>4. REMEDIES:</b> The Receiving Party acknowledges that any breach of this Agreement 
        may cause irreparable harm to the Disclosing Party, and therefore, the Disclosing Party 
        shall be entitled to seek injunctive relief and other equitable remedies.
        </para>
        
        <para align="justify" spaceBefore="12">
        <b>5. GOVERNING LAW:</b> This Agreement shall be governed by the laws of India.
        </para>
        
        <para align="justify" spaceBefore="24">
        IN WITNESS WHEREOF, the parties have executed this Agreement on the date first written above.
        </para>
        """
        
        content.append(Paragraph(nda_content, styles['Normal']))
        content.append(Spacer(1, 48))
        
        # Signature section
        sig_data = [
            ['DISCLOSING PARTY', '', 'RECEIVING PARTY'],
            ['', '', ''],
            ['Signature: _________________', '', 'Signature: _________________'],
            [f"Name: {data.get('disclosing_party', 'DISCLOSING PARTY')}", '', f"Name: {data.get('receiving_party', 'RECEIVING PARTY')}"],
            [f"Date: {data.get('execution_date', datetime.now().strftime('%B %d, %Y'))}", '', f"Date: {data.get('execution_date', datetime.now().strftime('%B %d, %Y'))}"]
        ]
        
        sig_table = Table(sig_data, colWidths=[2.5*inch, 1*inch, 2.5*inch])
        sig_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ]))
        
        content.append(sig_table)
        
        # Build PDF
        doc.build(content)
        buffer.seek(0)
        return buffer.read()
    
    async def generate_exit_document(self, data: Dict[str, Any]) -> bytes:
        """Generate an exit document"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, 
                               topMargin=72, bottomMargin=18)
        
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=HexColor('#2E86AB')
        )
        
        content = []
        
        # Title
        title = Paragraph("EXIT AGREEMENT", title_style)
        content.append(title)
        content.append(Spacer(1, 12))
        
        # Exit document content
        exit_content = f"""
        <para align="justify">
        This Exit Agreement is executed on {data.get('execution_date', datetime.now().strftime('%B %d, %Y'))} 
        between {data.get('exiting_party', 'EXITING PARTY')} ("Exiting Party") 
        and {data.get('remaining_party', 'REMAINING PARTY')} ("Remaining Party").
        </para>
        
        <para align="justify" spaceBefore="12">
        <b>WHEREAS:</b> The Exiting Party desires to exit from the business/partnership and 
        transfer all rights and interests to the Remaining Party under the terms set forth herein.
        </para>
        
        <para align="justify" spaceBefore="12">
        <b>BUSINESS DETAILS:</b>
        </para>
        
        <para align="left" spaceBefore="6">
        • Business Name: {data.get('business_name', 'BUSINESS NAME')}
        • Exiting Party's Share: {data.get('exit_share_percentage', 'SHARE')}%
        • Valuation: ₹{data.get('business_valuation', 'VALUATION')}
        • Exit Value: ₹{data.get('exit_value', 'EXIT VALUE')}
        </para>
        
        <para align="justify" spaceBefore="12">
        <b>EXIT TERMS:</b>
        </para>
        
        <para align="left" spaceBefore="6">
        1. The Exiting Party shall transfer all shares, rights, and interests to the Remaining Party.
        2. The exit value shall be paid in {data.get('payment_terms', 'PAYMENT TERMS')}.
        3. The Exiting Party shall provide transition support for {data.get('transition_period', '30')} days.
        4. All confidentiality obligations shall survive the exit.
        5. Non-compete clause shall remain in effect for {data.get('non_compete_period', '2')} years.
        </para>
        
        <para align="justify" spaceBefore="12">
        <b>LIABILITIES:</b> The Remaining Party shall assume all business liabilities from the exit date.
        </para>
        
        <para align="justify" spaceBefore="12">
        <b>REPRESENTATIONS:</b> Both parties represent that they have the authority to enter into this Agreement.
        </para>
        
        <para align="justify" spaceBefore="24">
        IN WITNESS WHEREOF, the parties have executed this Exit Agreement on the date first written above.
        </para>
        """
        
        content.append(Paragraph(exit_content, styles['Normal']))
        content.append(Spacer(1, 48))
        
        # Signature section
        sig_data = [
            ['EXITING PARTY', '', 'REMAINING PARTY'],
            ['', '', ''],
            ['Signature: _________________', '', 'Signature: _________________'],
            [f"Name: {data.get('exiting_party', 'EXITING PARTY')}", '', f"Name: {data.get('remaining_party', 'REMAINING PARTY')}"],
            [f"Date: {data.get('execution_date', datetime.now().strftime('%B %d, %Y'))}", '', f"Date: {data.get('execution_date', datetime.now().strftime('%B %d, %Y'))}"]
        ]
        
        sig_table = Table(sig_data, colWidths=[2.5*inch, 1*inch, 2.5*inch])
        sig_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ]))
        
        content.append(sig_table)
        
        # Build PDF
        doc.build(content)
        buffer.seek(0)
        return buffer.read()

class DocuSignService:
    """DocuSign integration for e-signature workflow"""
    
    def __init__(self):
        self.integration_key = os.getenv('DOCUSIGN_INTEGRATION_KEY')
        self.user_id = os.getenv('DOCUSIGN_USER_ID')
        self.account_id = os.getenv('DOCUSIGN_ACCOUNT_ID')
        self.private_key = os.getenv('DOCUSIGN_PRIVATE_KEY')
        self.base_url = os.getenv('DOCUSIGN_BASE_URL', 'https://demo.docusign.net/restapi')
        
        if not all([self.integration_key, self.user_id, self.account_id]):
            logger.warning("DocuSign credentials not configured. E-signature features will be disabled.")
            self.enabled = False
        else:
            self.enabled = True
            self.configure_client()
    
    def configure_client(self):
        """Configure DocuSign API client"""
        try:
            config = Configuration()
            config.host = self.base_url
            self.api_client = ApiClient(config)
            
            # JWT authentication would go here
            # For now, we'll use a placeholder
            logger.info("DocuSign client configured successfully")
        except Exception as e:
            logger.error(f"Failed to configure DocuSign client: {e}")
            self.enabled = False
    
    async def send_for_signature(self, document_bytes: bytes, signers: List[Dict], 
                               document_name: str) -> Dict[str, Any]:
        """Send document for signature via DocuSign"""
        if not self.enabled:
            raise HTTPException(status_code=503, detail="DocuSign service not available")
        
        try:
            # Create envelope definition
            envelope_definition = EnvelopeDefinition(
                email_subject=f"Please sign: {document_name}",
                status="sent"
            )
            
            # Add document
            document = Document(
                document_base64=base64.b64encode(document_bytes).decode(),
                name=document_name,
                file_extension="pdf",
                document_id="1"
            )
            envelope_definition.documents = [document]
            
            # Add recipients
            recipients = Recipients()
            signers_list = []
            
            for i, signer in enumerate(signers):
                ds_signer = Signer(
                    email=signer['email'],
                    name=signer['name'],
                    recipient_id=str(i + 1),
                    routing_order=str(i + 1)
                )
                
                # Add signature tab
                sign_here = SignHere(
                    document_id="1",
                    page_number="1",
                    x_position="100",
                    y_position="100"
                )
                
                tabs = Tabs(sign_here_tabs=[sign_here])
                ds_signer.tabs = tabs
                signers_list.append(ds_signer)
            
            recipients.signers = signers_list
            envelope_definition.recipients = recipients
            
            # Send envelope
            envelopes_api = EnvelopesApi(self.api_client)
            results = envelopes_api.create_envelope(self.account_id, envelope_definition)
            
            return {
                "envelope_id": results.envelope_id,
                "status": results.status,
                "uri": results.uri
            }
            
        except Exception as e:
            logger.error(f"DocuSign error: {e}")
            raise HTTPException(status_code=500, detail=f"DocuSign service error: {str(e)}")

# Initialize services
document_generator = DocumentGenerator()
docusign_service = DocuSignService()

# In-memory storage for demo (replace with database in production)
documents_storage = {}

@app.post("/generate-document", response_model=DocumentResponse)
async def generate_document(request: DocumentRequest, background_tasks: BackgroundTasks):
    """Generate a legal document"""
    try:
        document_id = str(uuid.uuid4())
        
        # Generate document based on type
        if request.document_type == DocumentType.SALE_DEED:
            document_bytes = await document_generator.generate_sale_deed(request.data)
        elif request.document_type == DocumentType.NDA:
            document_bytes = await document_generator.generate_nda(request.data)
        elif request.document_type == DocumentType.EXIT_DOCUMENT:
            document_bytes = await document_generator.generate_exit_document(request.data)
        else:
            raise HTTPException(status_code=400, detail="Document type not supported")
        
        # Save document
        document_path = document_generator.temp_dir / f"{document_id}.pdf"
        async with aiofiles.open(document_path, 'wb') as f:
            await f.write(document_bytes)
        
        # Create document record
        document_record = {
            "document_id": document_id,
            "document_type": request.document_type,
            "status": DocumentStatus.GENERATED,
            "file_path": str(document_path),
            "signers": request.signers,
            "created_at": datetime.now(),
            "expires_at": datetime.now() + timedelta(days=30)
        }
        
        documents_storage[document_id] = document_record
        
        # Send for signature if required
        if request.require_signature and request.signers:
            try:
                docusign_result = await docusign_service.send_for_signature(
                    document_bytes, request.signers, f"{request.document_type}_{document_id}"
                )
                document_record["docusign_envelope_id"] = docusign_result["envelope_id"]
                document_record["status"] = DocumentStatus.SENT_FOR_SIGNATURE
            except Exception as e:
                logger.warning(f"DocuSign not available: {e}")
                # Continue without e-signature
        
        return DocumentResponse(
            document_id=document_id,
            document_type=request.document_type,
            status=document_record["status"],
            download_url=f"/download-document/{document_id}",
            docusign_envelope_id=document_record.get("docusign_envelope_id"),
            created_at=document_record["created_at"],
            expires_at=document_record["expires_at"]
        )
        
    except Exception as e:
        logger.error(f"Document generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Document generation failed: {str(e)}")

@app.get("/download-document/{document_id}")
async def download_document(document_id: str):
    """Download a generated document"""
    if document_id not in documents_storage:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document_record = documents_storage[document_id]
    file_path = Path(document_record["file_path"])
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Document file not found")
    
    return FileResponse(
        file_path,
        media_type='application/pdf',
        filename=f"{document_record['document_type']}_{document_id}.pdf"
    )

@app.get("/document-status/{document_id}")
async def get_document_status(document_id: str):
    """Get document status"""
    if document_id not in documents_storage:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document_record = documents_storage[document_id]
    
    return {
        "document_id": document_id,
        "status": document_record["status"],
        "created_at": document_record["created_at"],
        "expires_at": document_record["expires_at"],
        "docusign_envelope_id": document_record.get("docusign_envelope_id")
    }

@app.get("/list-documents")
async def list_documents():
    """List all generated documents"""
    return {
        "documents": [
            {
                "document_id": doc_id,
                "document_type": doc["document_type"],
                "status": doc["status"],
                "created_at": doc["created_at"]
            }
            for doc_id, doc in documents_storage.items()
        ]
    }

@app.post("/create-template")
async def create_template(request: TemplateRequest):
    """Create a document template"""
    template_id = str(uuid.uuid4())
    
    template_path = document_generator.templates_dir / f"{template_id}.json"
    template_data = {
        "template_id": template_id,
        "template_name": request.template_name,
        "document_type": request.document_type,
        "template_content": request.template_content,
        "variables": request.variables,
        "default_styling": request.default_styling or {},
        "created_at": datetime.now().isoformat()
    }
    
    async with aiofiles.open(template_path, 'w') as f:
        await f.write(json.dumps(template_data, indent=2))
    
    return {
        "template_id": template_id,
        "message": "Template created successfully"
    }

@app.get("/templates")
async def list_templates():
    """List all document templates"""
    templates = []
    
    for template_file in document_generator.templates_dir.glob("*.json"):
        async with aiofiles.open(template_file, 'r') as f:
            template_data = json.loads(await f.read())
            templates.append({
                "template_id": template_data["template_id"],
                "template_name": template_data["template_name"],
                "document_type": template_data["document_type"],
                "created_at": template_data["created_at"]
            })
    
    return {"templates": templates}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "eaas-service",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "docusign_available": docusign_service.enabled
    }

@app.get("/metrics")
async def get_metrics():
    """Get service metrics"""
    return {
        "documents_generated": len(documents_storage),
        "active_documents": len([doc for doc in documents_storage.values() 
                                if doc["status"] != DocumentStatus.COMPLETED]),
        "templates_available": len(list(document_generator.templates_dir.glob("*.json"))),
        "uptime": "running",
        "docusign_enabled": docusign_service.enabled
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)