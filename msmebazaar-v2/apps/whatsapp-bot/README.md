# MSMEBazaar WhatsApp Bot

A conversational WhatsApp bot for onboarding MSMEs (Micro, Small, and Medium Enterprises) to the MSMEBazaar platform using Twilio's WhatsApp API.

## Features

- **Conversational Onboarding**: Step-by-step registration process via WhatsApp
- **Data Validation**: Phone number and pincode validation for Indian businesses
- **Session Management**: Redis-based session storage with 24-hour expiry
- **Multi-step Flow**: Name → Sector → Pincode → Phone → Confirmation
- **Integration**: Seamless integration with MSMEBazaar Auth API
- **Error Handling**: Comprehensive error handling and user-friendly messages
- **Commands**: Help, restart, and support commands
- **Broadcasting**: Admin broadcast functionality
- **Analytics**: Session statistics and monitoring

## Architecture

```
WhatsApp User → Twilio → WhatsApp Bot → Auth API → Database
                   ↓
                Redis (Session Storage)
```

## Onboarding Flow

1. **Welcome**: User sends "Hi" or "Hello"
2. **Name**: Bot asks for full name
3. **Sector**: User selects business sector (1-12)
4. **Pincode**: User enters 6-digit pincode
5. **Phone**: User enters mobile number
6. **Confirmation**: User confirms details
7. **OTP**: Bot triggers OTP via Auth API
8. **Completion**: User redirected to web app for login

## Setup

### Prerequisites

- Python 3.11+
- Redis server
- Twilio account with WhatsApp API access
- Auth API service running

### Installation

1. **Clone and navigate:**
```bash
cd msmebazaar-v2/apps/whatsapp-bot
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. **Run the service:**
```bash
python main.py
```

## Configuration

### Environment Variables

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Service URLs
AUTH_API_URL=http://localhost:8001
WEB_APP_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379

# Flask Configuration
FLASK_ENV=production
FLASK_DEBUG=false
LOG_LEVEL=INFO
```

### Twilio Setup

1. **Create Twilio Account**: Sign up at [twilio.com](https://twilio.com)
2. **Get WhatsApp Sandbox**: Enable WhatsApp sandbox in Console
3. **Configure Webhook**: Set webhook URL to `https://your-domain.com/webhook`
4. **Get Credentials**: Copy Account SID and Auth Token

## API Endpoints

### Webhook
- **POST** `/webhook` - Handles incoming WhatsApp messages
- **Request**: Twilio webhook format
- **Response**: TwiML response

### Health Check
- **GET** `/health` - Service health status
- **Response**: JSON with service status

### Statistics
- **GET** `/stats` - Bot usage statistics
- **Response**: Session counts and distribution

### Broadcasting
- **POST** `/send-broadcast` - Send message to all users
- **Body**: `{"message": "text", "target_step": "optional"}`
- **Response**: Broadcast status

## Bot Commands

### User Commands
- **HI/HELLO/START**: Start onboarding
- **HELP**: Show help menu
- **RESTART**: Restart registration
- **YES/NO**: Confirmation responses

### Admin Commands
- **SUPPORT**: Contact support information

## Data Flow

### Session Data Structure
```json
{
  "current_step": "name|sector|pincode|phone|confirmation|completed",
  "data": {
    "name": "John Doe",
    "sector": "Technology",
    "pincode": "400001",
    "phone": "+919876543210"
  },
  "created_at": "2024-01-01T10:00:00",
  "updated_at": "2024-01-01T10:05:00"
}
```

### Auth API Integration
```json
{
  "phone_number": "+919876543210",
  "user_type": "MSME",
  "metadata": {
    "source": "whatsapp",
    "onboarding_data": {
      "name": "John Doe",
      "sector": "Technology",
      "pincode": "400001"
    }
  }
}
```

## Business Sectors

1. Manufacturing
2. Services
3. Technology
4. Healthcare
5. Education
6. Agriculture
7. Retail
8. Construction
9. Food & Beverage
10. Textile
11. Automotive
12. Other

## Validation Rules

### Phone Number
- 10 digits starting with 6, 7, 8, or 9
- Supports +91 country code
- Formats to +91XXXXXXXXXX

### Pincode
- Exactly 6 digits
- Indian postal code format

### Name
- Minimum 2 characters
- No special validation (allows international names)

## Error Handling

- **Twilio Errors**: Logged and graceful fallback
- **Redis Errors**: Session creation fails gracefully
- **Auth API Errors**: User-friendly error messages
- **Validation Errors**: Clear guidance for correction

## Testing

### Run Tests
```bash
python -m pytest test_bot.py -v
```

### Test Coverage
- Unit tests for all bot functions
- Integration tests for webhook endpoints
- Mock tests for external services

### Manual Testing
1. **WhatsApp Sandbox**: Test with Twilio sandbox
2. **Ngrok**: Use ngrok for local webhook testing
3. **Postman**: Test API endpoints directly

## Docker Deployment

### Build Image
```bash
docker build -t whatsapp-bot .
```

### Run Container
```bash
docker run -p 5000:5000 --env-file .env whatsapp-bot
```

### Docker Compose
```yaml
whatsapp-bot:
  build: ./apps/whatsapp-bot
  ports:
    - "5000:5000"
  environment:
    - REDIS_URL=redis://redis:6379
    - AUTH_API_URL=http://auth-api:8001
  depends_on:
    - redis
    - auth-api
```

## Monitoring

### Health Checks
- Redis connectivity
- Auth API availability
- Service uptime

### Metrics
- Total sessions
- Step distribution
- Completion rates
- Error rates

### Logging
- Structured logging with trace IDs
- Message flow tracking
- Error logging with context

## Security

### Data Protection
- No sensitive data in logs
- Session data encrypted in Redis
- Secure environment variables

### Rate Limiting
- Twilio built-in rate limiting
- Redis session expiry (24 hours)
- Error response throttling

### Validation
- Input sanitization
- Phone number validation
- Pincode format validation

## Troubleshooting

### Common Issues

1. **Webhook Not Receiving Messages**
   - Check Twilio webhook URL configuration
   - Verify HTTPS endpoint accessibility
   - Check ngrok for local development

2. **Redis Connection Failed**
   - Verify Redis server is running
   - Check REDIS_URL configuration
   - Ensure Redis is accessible from container

3. **Auth API Integration Failed**
   - Check AUTH_API_URL configuration
   - Verify auth service is running
   - Check network connectivity

4. **OTP Not Sent**
   - Verify auth service OTP functionality
   - Check Twilio SMS configuration
   - Verify phone number format

### Debug Mode
```bash
export FLASK_DEBUG=true
export LOG_LEVEL=DEBUG
python main.py
```

### Logs Analysis
```bash
# View container logs
docker logs whatsapp-bot

# Follow logs
docker logs -f whatsapp-bot

# Filter error logs
docker logs whatsapp-bot 2>&1 | grep ERROR
```

## Performance

### Optimization
- Redis connection pooling
- Async message processing
- Efficient session storage
- Minimal memory footprint

### Scaling
- Horizontal scaling with load balancer
- Redis cluster for high availability
- Multiple worker processes
- Container orchestration

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit pull request

## License

This project is licensed under the MIT License.

## Support

For technical support:
- Email: support@msmebazaar.com
- Documentation: [docs.msmebazaar.com](https://docs.msmebazaar.com)
- Issues: GitHub Issues