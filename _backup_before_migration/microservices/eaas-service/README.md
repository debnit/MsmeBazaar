# EaaS Service - Everything-as-a-Service

## Overview

The EaaS (Everything-as-a-Service) service is a comprehensive document generation and e-signature platform built with FastAPI, PDFKit, and DocuSign API integration. It specializes in generating legal documents such as sale deeds, NDAs, and exit documents with professional formatting and e-signature capabilities.

## Features

### Document Types Supported
- **Sale Deed**: Complete business sale agreements with terms and conditions
- **Non-Disclosure Agreement (NDA)**: Confidentiality agreements for business discussions
- **Exit Document**: Partnership/business exit agreements
- **Share Purchase Agreement**: Equity transfer documents
- **Asset Purchase Agreement**: Asset acquisition contracts
- **Employment Agreement**: Employment contracts
- **Consultancy Agreement**: Consultant engagement contracts
- **Valuation Report**: Business valuation documents
- **Due Diligence Report**: Investment analysis reports
- **Compliance Certificate**: Regulatory compliance documents

### Key Capabilities
- **Professional PDF Generation**: High-quality documents with proper formatting
- **E-Signature Integration**: DocuSign API integration for digital signatures
- **Template System**: Customizable document templates
- **Multi-Signer Support**: Multiple parties can sign documents
- **Status Tracking**: Real-time document status updates
- **Document Management**: Storage and retrieval of generated documents
- **Expiration Management**: Automatic document expiration handling

## API Endpoints

### Document Generation
- `POST /generate-document` - Generate a new legal document
- `GET /download-document/{document_id}` - Download generated document
- `GET /document-status/{document_id}` - Check document status
- `GET /list-documents` - List all generated documents

### Template Management
- `POST /create-template` - Create a new document template
- `GET /templates` - List all available templates

### System
- `GET /health` - Health check endpoint
- `GET /metrics` - Service metrics and statistics

## Configuration

### Environment Variables

```env
# DocuSign Configuration
DOCUSIGN_INTEGRATION_KEY=your-docusign-integration-key
DOCUSIGN_USER_ID=your-docusign-user-id
DOCUSIGN_ACCOUNT_ID=your-docusign-account-id
DOCUSIGN_PRIVATE_KEY=your-docusign-private-key
DOCUSIGN_BASE_URL=https://demo.docusign.net/restapi

# Email Configuration (for notifications)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

## Usage Examples

### Generate a Sale Deed

```python
import requests

# Document generation request
payload = {
    "document_type": "sale_deed",
    "data": {
        "execution_date": "January 15, 2024",
        "seller_name": "ABC Enterprises Pvt Ltd",
        "buyer_name": "XYZ Corporation",
        "business_name": "TechStartup Solutions",
        "industry": "Software Development",
        "annual_turnover": "50,00,000",
        "location": "Bangalore, Karnataka",
        "employee_count": "25",
        "sale_price": "1,50,00,000",
        "sale_price_words": "One Crore Fifty Lakhs Only"
    },
    "signers": [
        {
            "name": "John Doe",
            "email": "john@abcenterprises.com",
            "role": "seller"
        },
        {
            "name": "Jane Smith",
            "email": "jane@xyzcorp.com",
            "role": "buyer"
        }
    ],
    "require_signature": true
}

response = requests.post("http://localhost:8006/generate-document", json=payload)
print(response.json())
```

### Generate an NDA

```python
payload = {
    "document_type": "nda",
    "data": {
        "execution_date": "January 15, 2024",
        "disclosing_party": "TechCorp Solutions",
        "receiving_party": "Investment Partners LLC",
        "term_years": "3"
    },
    "signers": [
        {
            "name": "Alice Johnson",
            "email": "alice@techcorp.com",
            "role": "disclosing_party"
        },
        {
            "name": "Bob Wilson",
            "email": "bob@investmentpartners.com",
            "role": "receiving_party"
        }
    ],
    "require_signature": true
}

response = requests.post("http://localhost:8006/generate-document", json=payload)
```

### Generate an Exit Document

```python
payload = {
    "document_type": "exit_document",
    "data": {
        "execution_date": "January 15, 2024",
        "exiting_party": "Michael Brown",
        "remaining_party": "StartupCo Pvt Ltd",
        "business_name": "InnovateNow Solutions",
        "exit_share_percentage": "30",
        "business_valuation": "2,00,00,000",
        "exit_value": "60,00,000",
        "payment_terms": "3 equal installments over 6 months",
        "transition_period": "45",
        "non_compete_period": "2"
    },
    "signers": [
        {
            "name": "Michael Brown",
            "email": "michael@innovatenow.com",
            "role": "exiting_party"
        },
        {
            "name": "Sarah Davis",
            "email": "sarah@startupco.com",
            "role": "remaining_party"
        }
    ],
    "require_signature": true
}

response = requests.post("http://localhost:8006/generate-document", json=payload)
```

## Document Templates

### Creating Custom Templates

```python
template_payload = {
    "template_name": "Custom Sale Agreement",
    "document_type": "sale_deed",
    "template_content": "Your custom template content with {{variables}}",
    "variables": ["seller_name", "buyer_name", "sale_price"],
    "default_styling": {
        "font_size": 12,
        "line_spacing": 1.5,
        "margin": 72
    }
}

response = requests.post("http://localhost:8006/create-template", json=template_payload)
```

## Development

### Running Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
python app.py
```

### Docker Deployment

```bash
# Build image
docker build -t eaas-service .

# Run container
docker run -p 8006:8006 \
    -e DOCUSIGN_INTEGRATION_KEY=your-key \
    -e DOCUSIGN_USER_ID=your-user-id \
    -e DOCUSIGN_ACCOUNT_ID=your-account-id \
    eaas-service
```

## Security Considerations

### Document Security
- All generated documents are stored temporarily and expire after 30 days
- PDF files are generated with proper metadata and security settings
- E-signature integration uses DocuSign's enterprise-grade security

### API Security
- All endpoints should be secured with proper authentication
- Rate limiting should be implemented in production
- Input validation is performed on all document data

### Data Privacy
- Personal information is handled according to GDPR/privacy regulations
- Documents can be automatically deleted after completion
- Audit trails are maintained for all document operations

## Monitoring and Logging

### Health Checks
- `/health` endpoint provides service status
- DocuSign integration status is included in health checks
- Automatic service recovery mechanisms

### Metrics
- Document generation counts
- Template usage statistics
- E-signature completion rates
- Service uptime and performance metrics

### Logging
- All document generation events are logged
- E-signature workflow tracking
- Error logging with detailed stack traces
- Performance monitoring and alerting

## Integration with Other Services

### Authentication Service
- Integrates with auth service for user verification
- Role-based access control for document types

### Notification Service
- Sends email notifications for document completion
- SMS alerts for signature requests
- Real-time status updates

### Audit Service
- All document operations are logged for compliance
- Signature tracking and audit trails
- Regulatory compliance reporting

## Troubleshooting

### Common Issues

#### DocuSign Integration
- Verify API credentials are correct
- Check DocuSign account permissions
- Ensure proper JWT authentication setup

#### PDF Generation
- Check reportlab installation
- Verify template formatting
- Monitor memory usage for large documents

#### File Storage
- Ensure proper directory permissions
- Monitor disk space usage
- Implement cleanup for expired documents

### Performance Optimization
- Implement document caching
- Use async processing for large documents
- Optimize PDF generation for speed
- Monitor memory usage and cleanup

## Future Enhancements

### Planned Features
- **Advanced Templates**: Rich text editor for template creation
- **Bulk Generation**: Generate multiple documents simultaneously
- **Digital Watermarks**: Add security watermarks to documents
- **Version Control**: Track document versions and changes
- **Integration APIs**: Connect with CRM and ERP systems

### Technical Roadmap
- **GraphQL API**: More flexible API interface
- **Microservice Communication**: gRPC for inter-service calls
- **Blockchain Integration**: Immutable document verification
- **AI Enhancement**: Automated document review and suggestions