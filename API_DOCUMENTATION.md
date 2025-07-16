# MSMESquare API Documentation

## Overview

The MSMESquare API provides comprehensive endpoints for managing MSME (Micro, Small & Medium Enterprise) business acquisitions, loan applications, and related services. This RESTful API supports multiple authentication methods and provides extensive functionality for buyers, sellers, agents, NBFCs, and administrators.

## Base URL

- **Development**: `http://localhost:5000`
- **Production**: `https://api.msmesquare.com`

## Interactive Documentation

Access the interactive Swagger UI documentation at:
- **Development**: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
- **JSON Specification**: [http://localhost:5000/api-docs.json](http://localhost:5000/api-docs.json)

## Authentication

The API supports multiple authentication methods:

### 1. JWT Bearer Token
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/auth/me
```

### 2. Cookie Authentication
Automatically handled by browsers after login.

### 3. Mobile OTP Authentication
SMS-based authentication for mobile users.

## Quick Start

### 1. Register a New User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "role": "seller"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### 3. Create MSME Listing
```bash
curl -X POST http://localhost:5000/api/msme-listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "businessName": "Tech Solutions Pvt Ltd",
    "industry": "Technology",
    "location": "Bhubaneswar, Odisha",
    "askingPrice": 5000000,
    "revenue": 2000000,
    "profit": 500000,
    "employees": 25,
    "description": "Leading software development company"
  }'
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/send-otp` - Send OTP to mobile
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/resend-otp` - Resend OTP

### MSME Listings
- `GET /api/msme-listings` - List all MSMEs with filtering
- `POST /api/msme-listings` - Create new listing
- `GET /api/msme-listings/:id` - Get specific listing
- `PUT /api/msme-listings/:id` - Update listing
- `DELETE /api/msme-listings/:id` - Delete listing

### Valuation & Matchmaking
- `POST /api/msme-listings/:id/valuation` - Get AI valuation
- `GET /api/matchmaking/find-matches/:msmeId` - Find potential buyers
- `GET /api/matchmaking/find-msmes/:buyerId` - Find MSMEs for buyer

### Loan Applications
- `GET /api/loan-applications` - List loan applications
- `POST /api/loan-applications` - Create loan application
- `GET /api/loan-applications/:id` - Get loan application
- `PUT /api/loan-applications/:id` - Update loan application

### Buyer Interests
- `GET /api/buyer-interests` - List buyer interests
- `POST /api/buyer-interests` - Express interest
- `PUT /api/buyer-interests/:id` - Update interest status

### Compliance (NBFC)
- `GET /api/compliance/:nbfcId` - Check compliance status
- `POST /api/compliance/:nbfcId` - Update compliance record

### Escrow Management
- `POST /api/escrow` - Create escrow account
- `GET /api/escrow/:id` - Get escrow details
- `POST /api/escrow/:id/fund` - Fund escrow account
- `POST /api/escrow/:id/release` - Release funds
- `POST /api/escrow/:id/refund` - Process refund

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `POST /api/notifications/preferences` - Update preferences

### Monitoring
- `GET /health` - Health check
- `GET /api/monitoring/metrics` - System metrics (admin only)

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "error": "Error type",
  "message": "Detailed error description",
  "statusCode": 400
}
```

### Pagination
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

## Data Models

### User
```json
{
  "id": 1,
  "email": "user@example.com",
  "phone": "+91-9876543210",
  "firstName": "John",
  "lastName": "Doe",
  "role": "seller",
  "isVerified": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### MSME Listing
```json
{
  "id": 1,
  "businessName": "Tech Solutions Pvt Ltd",
  "industry": "Technology",
  "location": "Bhubaneswar, Odisha",
  "askingPrice": 5000000,
  "revenue": 2000000,
  "profit": 500000,
  "employees": 25,
  "description": "Leading software development company",
  "assets": ["Office equipment", "Software licenses"],
  "liabilities": ["Bank loan", "Vendor payments"],
  "documents": ["financial_statements.pdf"],
  "status": "active",
  "sellerId": 1,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### Loan Application
```json
{
  "id": 1,
  "msmeId": 1,
  "buyerId": 2,
  "nbfcId": 3,
  "loanAmount": 4000000,
  "purpose": "Business acquisition",
  "documents": ["income_proof.pdf", "business_plan.pdf"],
  "status": "pending",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

## Rate Limiting

- **Default**: 100 requests per 15 minutes per IP
- **Authenticated**: 1000 requests per 15 minutes per user
- **Admin**: 5000 requests per 15 minutes

## Testing

### Health Check
```bash
curl http://localhost:5000/health
```

### API Status
```bash
curl http://localhost:5000/api-docs.json
```

## Security Features

- JWT token-based authentication
- Role-based access control (RBAC)
- Input validation and sanitization
- Rate limiting
- CORS protection
- SQL injection prevention
- XSS protection

## Mobile Authentication Flow

1. **Send OTP**: `POST /api/auth/send-otp`
2. **Verify OTP**: `POST /api/auth/verify-otp`
3. **Resend OTP**: `POST /api/auth/resend-otp` (if needed)

## Webhook Support

The API supports webhooks for real-time notifications:
- Loan status updates
- Escrow transaction events
- Compliance alerts
- Matchmaking notifications

## SDKs and Libraries

Currently supported languages:
- JavaScript/Node.js
- Python
- Java
- Go

## Support

For API support and questions:
- Email: support@msmesquare.com
- Documentation: [API Docs](http://localhost:5000/api-docs)
- Issues: [GitHub Issues](https://github.com/msmesquare/api/issues)

## Changelog

### Version 1.0.0
- Initial API release
- Authentication system
- MSME listing management
- Loan application processing
- Valuation and matchmaking services
- Escrow management
- Comprehensive documentation