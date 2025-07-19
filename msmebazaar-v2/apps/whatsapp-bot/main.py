import os
import json
import logging
import re
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from twilio.rest import Client
from twilio.twiml.messaging_response import MessagingResponse
import redis
import requests
from dataclasses import dataclass
from enum import Enum
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Configuration
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_WHATSAPP_NUMBER = os.getenv('TWILIO_WHATSAPP_NUMBER', 'whatsapp:+14155238886')
AUTH_API_URL = os.getenv('AUTH_API_URL', 'http://localhost:8001')
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
WEB_APP_URL = os.getenv('WEB_APP_URL', 'http://localhost:3000')

# Initialize Twilio client
twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# Initialize Redis client
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

class OnboardingStep(Enum):
    WELCOME = "welcome"
    NAME = "name"
    SECTOR = "sector"
    PINCODE = "pincode"
    PHONE = "phone"
    CONFIRMATION = "confirmation"
    COMPLETED = "completed"

@dataclass
class UserSession:
    phone_number: str
    current_step: OnboardingStep
    data: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

class WhatsAppBot:
    def __init__(self):
        self.sectors = [
            "Manufacturing", "Services", "Technology", "Healthcare", 
            "Education", "Agriculture", "Retail", "Construction",
            "Food & Beverage", "Textile", "Automotive", "Other"
        ]
        
    def get_user_session(self, phone_number: str) -> Optional[UserSession]:
        """Get user session from Redis"""
        try:
            session_data = redis_client.get(f"whatsapp_session:{phone_number}")
            if session_data:
                data = json.loads(session_data)
                return UserSession(
                    phone_number=phone_number,
                    current_step=OnboardingStep(data['current_step']),
                    data=data['data'],
                    created_at=datetime.fromisoformat(data['created_at']),
                    updated_at=datetime.fromisoformat(data['updated_at'])
                )
        except Exception as e:
            logger.error(f"Error getting user session: {e}")
        return None
    
    def save_user_session(self, session: UserSession):
        """Save user session to Redis"""
        try:
            session_data = {
                'current_step': session.current_step.value,
                'data': session.data,
                'created_at': session.created_at.isoformat(),
                'updated_at': session.updated_at.isoformat()
            }
            redis_client.setex(
                f"whatsapp_session:{session.phone_number}",
                timedelta(hours=24),
                json.dumps(session_data)
            )
        except Exception as e:
            logger.error(f"Error saving user session: {e}")
    
    def create_new_session(self, phone_number: str) -> UserSession:
        """Create new user session"""
        return UserSession(
            phone_number=phone_number,
            current_step=OnboardingStep.WELCOME,
            data={},
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
    
    def send_message(self, to: str, message: str):
        """Send WhatsApp message via Twilio"""
        try:
            twilio_client.messages.create(
                body=message,
                from_=TWILIO_WHATSAPP_NUMBER,
                to=to
            )
            logger.info(f"Message sent to {to}")
        except Exception as e:
            logger.error(f"Error sending message to {to}: {e}")
    
    def validate_phone_number(self, phone: str) -> bool:
        """Validate Indian phone number"""
        # Remove spaces and special characters
        phone = re.sub(r'[^\d]', '', phone)
        
        # Check if it's a valid Indian mobile number
        if len(phone) == 10 and phone.startswith(('6', '7', '8', '9')):
            return True
        elif len(phone) == 12 and phone.startswith('91') and phone[2:3] in ['6', '7', '8', '9']:
            return True
        elif len(phone) == 13 and phone.startswith('+91') and phone[3:4] in ['6', '7', '8', '9']:
            return True
        
        return False
    
    def validate_pincode(self, pincode: str) -> bool:
        """Validate Indian pincode"""
        return re.match(r'^\d{6}$', pincode) is not None
    
    def format_phone_number(self, phone: str) -> str:
        """Format phone number to standard format"""
        phone = re.sub(r'[^\d]', '', phone)
        
        if len(phone) == 10:
            return f"+91{phone}"
        elif len(phone) == 12 and phone.startswith('91'):
            return f"+{phone}"
        elif len(phone) == 13 and phone.startswith('+91'):
            return phone
        
        return phone
    
    def get_sectors_menu(self) -> str:
        """Get formatted sectors menu"""
        menu = "Please select your business sector:\n\n"
        for i, sector in enumerate(self.sectors, 1):
            menu += f"{i}. {sector}\n"
        menu += "\nReply with the number of your choice."
        return menu
    
    def process_sector_selection(self, message: str) -> Optional[str]:
        """Process sector selection"""
        try:
            choice = int(message.strip())
            if 1 <= choice <= len(self.sectors):
                return self.sectors[choice - 1]
        except ValueError:
            pass
        
        # Check if user typed sector name directly
        message_lower = message.lower().strip()
        for sector in self.sectors:
            if sector.lower() in message_lower:
                return sector
        
        return None
    
    def send_otp_to_auth_service(self, phone_number: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Send OTP request to auth service"""
        try:
            payload = {
                "phone_number": phone_number,
                "user_type": "MSME",
                "metadata": {
                    "source": "whatsapp",
                    "onboarding_data": user_data
                }
            }
            
            response = requests.post(
                f"{AUTH_API_URL}/api/send-otp",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Auth service error: {response.status_code} - {response.text}")
                return {"success": False, "error": "Authentication service error"}
                
        except Exception as e:
            logger.error(f"Error calling auth service: {e}")
            return {"success": False, "error": "Connection error"}
    
    def handle_welcome(self, session: UserSession) -> str:
        """Handle welcome message"""
        session.current_step = OnboardingStep.NAME
        session.updated_at = datetime.now()
        self.save_user_session(session)
        
        return """🌟 Welcome to MSMEBazaar! 🌟

I'll help you get started with your business registration.

Let's begin with some basic information:

👤 What's your full name?"""
    
    def handle_name_input(self, session: UserSession, message: str) -> str:
        """Handle name input"""
        name = message.strip()
        
        if len(name) < 2:
            return "Please enter a valid name (at least 2 characters)."
        
        session.data['name'] = name
        session.current_step = OnboardingStep.SECTOR
        session.updated_at = datetime.now()
        self.save_user_session(session)
        
        return f"Nice to meet you, {name}! 👋\n\n{self.get_sectors_menu()}"
    
    def handle_sector_input(self, session: UserSession, message: str) -> str:
        """Handle sector selection"""
        sector = self.process_sector_selection(message)
        
        if not sector:
            return f"Please select a valid sector:\n\n{self.get_sectors_menu()}"
        
        session.data['sector'] = sector
        session.current_step = OnboardingStep.PINCODE
        session.updated_at = datetime.now()
        self.save_user_session(session)
        
        return f"Great! You selected *{sector}* 🏢\n\n📍 Now, please enter your business pincode (6 digits):"
    
    def handle_pincode_input(self, session: UserSession, message: str) -> str:
        """Handle pincode input"""
        pincode = message.strip()
        
        if not self.validate_pincode(pincode):
            return "Please enter a valid 6-digit pincode (e.g., 400001)."
        
        session.data['pincode'] = pincode
        session.current_step = OnboardingStep.PHONE
        session.updated_at = datetime.now()
        self.save_user_session(session)
        
        return f"Perfect! Pincode *{pincode}* noted 📍\n\n📱 Please enter your mobile number (10 digits):"
    
    def handle_phone_input(self, session: UserSession, message: str) -> str:
        """Handle phone number input"""
        phone = message.strip()
        
        if not self.validate_phone_number(phone):
            return "Please enter a valid Indian mobile number (10 digits starting with 6, 7, 8, or 9)."
        
        formatted_phone = self.format_phone_number(phone)
        session.data['phone'] = formatted_phone
        session.current_step = OnboardingStep.CONFIRMATION
        session.updated_at = datetime.now()
        self.save_user_session(session)
        
        return f"""📋 Please confirm your details:

👤 Name: {session.data['name']}
🏢 Sector: {session.data['sector']}
📍 Pincode: {session.data['pincode']}
📱 Phone: {formatted_phone}

Reply with:
✅ *YES* to confirm
❌ *NO* to restart"""
    
    def handle_confirmation(self, session: UserSession, message: str) -> str:
        """Handle confirmation"""
        response = message.strip().upper()
        
        if response == 'YES':
            # Send OTP via auth service
            otp_response = self.send_otp_to_auth_service(
                session.data['phone'],
                session.data
            )
            
            if otp_response.get('success', False):
                session.current_step = OnboardingStep.COMPLETED
                session.updated_at = datetime.now()
                self.save_user_session(session)
                
                login_url = f"{WEB_APP_URL}/login?phone={session.data['phone']}&source=whatsapp"
                
                return f"""🎉 Registration successful!

📱 An OTP has been sent to {session.data['phone']}

🔗 Click here to complete your login:
{login_url}

Or visit: {WEB_APP_URL}/login

Welcome to MSMEBazaar! 🚀"""
            else:
                error_msg = otp_response.get('error', 'Unknown error')
                return f"❌ Sorry, there was an error: {error_msg}\n\nPlease try again later or contact support."
        
        elif response == 'NO':
            # Restart the process
            session.current_step = OnboardingStep.WELCOME
            session.data = {}
            session.updated_at = datetime.now()
            self.save_user_session(session)
            
            return "🔄 Let's start over!\n\n" + self.handle_welcome(session)
        
        else:
            return "Please reply with *YES* to confirm or *NO* to restart."
    
    def handle_completed(self, session: UserSession) -> str:
        """Handle completed state"""
        login_url = f"{WEB_APP_URL}/login?phone={session.data['phone']}&source=whatsapp"
        
        return f"""You've already completed registration! 🎉

🔗 Login here: {login_url}

Need help? Reply with *HELP*
Want to restart? Reply with *RESTART*"""
    
    def handle_help(self) -> str:
        """Handle help command"""
        return """🆘 MSMEBazaar Help

Available commands:
• *RESTART* - Start registration again
• *HELP* - Show this help message
• *SUPPORT* - Contact support

For technical support:
📧 support@msmebazaar.com
📞 +91-XXXXXXXXXX

Business hours: Mon-Fri 9AM-6PM IST"""
    
    def handle_restart(self, session: UserSession) -> str:
        """Handle restart command"""
        session.current_step = OnboardingStep.WELCOME
        session.data = {}
        session.updated_at = datetime.now()
        self.save_user_session(session)
        
        return "🔄 Restarting registration...\n\n" + self.handle_welcome(session)
    
    def process_message(self, from_number: str, message: str) -> str:
        """Process incoming WhatsApp message"""
        # Get or create user session
        session = self.get_user_session(from_number)
        if not session:
            session = self.create_new_session(from_number)
        
        # Handle special commands
        message_upper = message.strip().upper()
        if message_upper == 'HELP':
            return self.handle_help()
        elif message_upper == 'RESTART':
            return self.handle_restart(session)
        elif message_upper in ['HI', 'HELLO', 'START'] and session.current_step == OnboardingStep.WELCOME:
            return self.handle_welcome(session)
        
        # Handle based on current step
        if session.current_step == OnboardingStep.WELCOME:
            return self.handle_welcome(session)
        elif session.current_step == OnboardingStep.NAME:
            return self.handle_name_input(session, message)
        elif session.current_step == OnboardingStep.SECTOR:
            return self.handle_sector_input(session, message)
        elif session.current_step == OnboardingStep.PINCODE:
            return self.handle_pincode_input(session, message)
        elif session.current_step == OnboardingStep.PHONE:
            return self.handle_phone_input(session, message)
        elif session.current_step == OnboardingStep.CONFIRMATION:
            return self.handle_confirmation(session, message)
        elif session.current_step == OnboardingStep.COMPLETED:
            return self.handle_completed(session)
        
        return "I didn't understand that. Reply with *HELP* for assistance."

# Initialize bot
bot = WhatsAppBot()

@app.route('/webhook', methods=['POST'])
def webhook():
    """Handle incoming WhatsApp messages"""
    try:
        # Get message details
        from_number = request.form.get('From')
        message_body = request.form.get('Body', '').strip()
        
        logger.info(f"Received message from {from_number}: {message_body}")
        
        # Process the message
        response_text = bot.process_message(from_number, message_body)
        
        # Create Twilio response
        response = MessagingResponse()
        response.message(response_text)
        
        logger.info(f"Sent response to {from_number}: {response_text}")
        
        return str(response)
        
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        
        # Send error response
        response = MessagingResponse()
        response.message("Sorry, I encountered an error. Please try again later or contact support.")
        return str(response)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Check Redis connection
        redis_client.ping()
        
        # Check auth service
        auth_response = requests.get(f"{AUTH_API_URL}/health", timeout=5)
        auth_healthy = auth_response.status_code == 200
        
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "redis": "healthy",
                "auth_service": "healthy" if auth_healthy else "unhealthy"
            }
        })
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/stats', methods=['GET'])
def get_stats():
    """Get bot statistics"""
    try:
        # Get session statistics from Redis
        session_keys = redis_client.keys("whatsapp_session:*")
        total_sessions = len(session_keys)
        
        # Count by step
        step_counts = {}
        for key in session_keys:
            session_data = json.loads(redis_client.get(key))
            step = session_data.get('current_step', 'unknown')
            step_counts[step] = step_counts.get(step, 0) + 1
        
        return jsonify({
            "total_sessions": total_sessions,
            "step_distribution": step_counts,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/send-broadcast', methods=['POST'])
def send_broadcast():
    """Send broadcast message to all users"""
    try:
        data = request.get_json()
        message = data.get('message')
        target_step = data.get('target_step')  # Optional: target specific step
        
        if not message:
            return jsonify({"error": "Message is required"}), 400
        
        # Get all sessions
        session_keys = redis_client.keys("whatsapp_session:*")
        sent_count = 0
        
        for key in session_keys:
            try:
                session_data = json.loads(redis_client.get(key))
                
                # Filter by step if specified
                if target_step and session_data.get('current_step') != target_step:
                    continue
                
                # Extract phone number from key
                phone_number = key.replace("whatsapp_session:", "")
                
                # Send message
                bot.send_message(phone_number, message)
                sent_count += 1
                
            except Exception as e:
                logger.error(f"Error sending broadcast to {key}: {e}")
        
        return jsonify({
            "message": "Broadcast sent",
            "sent_count": sent_count,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error sending broadcast: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)