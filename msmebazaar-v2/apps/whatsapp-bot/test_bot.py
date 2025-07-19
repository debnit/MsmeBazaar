import unittest
from unittest.mock import Mock, patch, MagicMock
import json
from datetime import datetime
import redis
from main import WhatsAppBot, OnboardingStep, UserSession

class TestWhatsAppBot(unittest.TestCase):
    
    def setUp(self):
        """Set up test fixtures"""
        self.bot = WhatsAppBot()
        self.test_phone = "whatsapp:+919876543210"
        self.test_session = UserSession(
            phone_number=self.test_phone,
            current_step=OnboardingStep.WELCOME,
            data={},
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
    
    def test_phone_validation(self):
        """Test phone number validation"""
        # Valid numbers
        self.assertTrue(self.bot.validate_phone_number("9876543210"))
        self.assertTrue(self.bot.validate_phone_number("919876543210"))
        self.assertTrue(self.bot.validate_phone_number("+919876543210"))
        
        # Invalid numbers
        self.assertFalse(self.bot.validate_phone_number("123456789"))
        self.assertFalse(self.bot.validate_phone_number("5876543210"))
        self.assertFalse(self.bot.validate_phone_number("abc123"))
    
    def test_pincode_validation(self):
        """Test pincode validation"""
        # Valid pincodes
        self.assertTrue(self.bot.validate_pincode("400001"))
        self.assertTrue(self.bot.validate_pincode("110001"))
        
        # Invalid pincodes
        self.assertFalse(self.bot.validate_pincode("12345"))
        self.assertFalse(self.bot.validate_pincode("1234567"))
        self.assertFalse(self.bot.validate_pincode("abc123"))
    
    def test_phone_formatting(self):
        """Test phone number formatting"""
        self.assertEqual(self.bot.format_phone_number("9876543210"), "+919876543210")
        self.assertEqual(self.bot.format_phone_number("919876543210"), "+919876543210")
        self.assertEqual(self.bot.format_phone_number("+919876543210"), "+919876543210")
    
    def test_sector_selection(self):
        """Test sector selection processing"""
        # Valid selections
        self.assertEqual(self.bot.process_sector_selection("1"), "Manufacturing")
        self.assertEqual(self.bot.process_sector_selection("2"), "Services")
        self.assertEqual(self.bot.process_sector_selection("technology"), "Technology")
        
        # Invalid selections
        self.assertIsNone(self.bot.process_sector_selection("0"))
        self.assertIsNone(self.bot.process_sector_selection("99"))
        self.assertIsNone(self.bot.process_sector_selection("invalid"))
    
    def test_welcome_flow(self):
        """Test welcome message handling"""
        response = self.bot.handle_welcome(self.test_session)
        
        self.assertIn("Welcome to MSMEBazaar", response)
        self.assertIn("full name", response)
        self.assertEqual(self.test_session.current_step, OnboardingStep.NAME)
    
    def test_name_input(self):
        """Test name input handling"""
        # Valid name
        response = self.bot.handle_name_input(self.test_session, "John Doe")
        self.assertIn("Nice to meet you, John Doe", response)
        self.assertEqual(self.test_session.data['name'], "John Doe")
        self.assertEqual(self.test_session.current_step, OnboardingStep.SECTOR)
        
        # Invalid name
        response = self.bot.handle_name_input(self.test_session, "J")
        self.assertIn("valid name", response)
        self.assertEqual(self.test_session.current_step, OnboardingStep.NAME)
    
    def test_sector_input(self):
        """Test sector input handling"""
        # Valid sector
        response = self.bot.handle_sector_input(self.test_session, "1")
        self.assertIn("Manufacturing", response)
        self.assertEqual(self.test_session.data['sector'], "Manufacturing")
        self.assertEqual(self.test_session.current_step, OnboardingStep.PINCODE)
        
        # Invalid sector
        response = self.bot.handle_sector_input(self.test_session, "99")
        self.assertIn("valid sector", response)
        self.assertEqual(self.test_session.current_step, OnboardingStep.SECTOR)
    
    def test_pincode_input(self):
        """Test pincode input handling"""
        # Valid pincode
        response = self.bot.handle_pincode_input(self.test_session, "400001")
        self.assertIn("400001", response)
        self.assertEqual(self.test_session.data['pincode'], "400001")
        self.assertEqual(self.test_session.current_step, OnboardingStep.PHONE)
        
        # Invalid pincode
        response = self.bot.handle_pincode_input(self.test_session, "12345")
        self.assertIn("valid 6-digit pincode", response)
        self.assertEqual(self.test_session.current_step, OnboardingStep.PINCODE)
    
    def test_phone_input(self):
        """Test phone input handling"""
        # Valid phone
        response = self.bot.handle_phone_input(self.test_session, "9876543210")
        self.assertIn("+919876543210", response)
        self.assertEqual(self.test_session.data['phone'], "+919876543210")
        self.assertEqual(self.test_session.current_step, OnboardingStep.CONFIRMATION)
        
        # Invalid phone
        response = self.bot.handle_phone_input(self.test_session, "123456789")
        self.assertIn("valid Indian mobile number", response)
        self.assertEqual(self.test_session.current_step, OnboardingStep.PHONE)
    
    @patch('main.WhatsAppBot.send_otp_to_auth_service')
    def test_confirmation_yes(self, mock_send_otp):
        """Test confirmation with YES response"""
        # Setup session data
        self.test_session.data = {
            'name': 'John Doe',
            'sector': 'Technology',
            'pincode': '400001',
            'phone': '+919876543210'
        }
        
        # Mock successful OTP response
        mock_send_otp.return_value = {"success": True}
        
        response = self.bot.handle_confirmation(self.test_session, "YES")
        
        self.assertIn("Registration successful", response)
        self.assertIn("OTP has been sent", response)
        self.assertEqual(self.test_session.current_step, OnboardingStep.COMPLETED)
        mock_send_otp.assert_called_once()
    
    @patch('main.WhatsAppBot.send_otp_to_auth_service')
    def test_confirmation_no(self, mock_send_otp):
        """Test confirmation with NO response"""
        response = self.bot.handle_confirmation(self.test_session, "NO")
        
        self.assertIn("start over", response)
        self.assertEqual(self.test_session.current_step, OnboardingStep.WELCOME)
        self.assertEqual(self.test_session.data, {})
        mock_send_otp.assert_not_called()
    
    def test_help_command(self):
        """Test help command"""
        response = self.bot.handle_help()
        
        self.assertIn("MSMEBazaar Help", response)
        self.assertIn("RESTART", response)
        self.assertIn("HELP", response)
        self.assertIn("SUPPORT", response)
    
    def test_restart_command(self):
        """Test restart command"""
        # Set some data first
        self.test_session.data = {'name': 'John'}
        self.test_session.current_step = OnboardingStep.SECTOR
        
        response = self.bot.handle_restart(self.test_session)
        
        self.assertIn("Restarting registration", response)
        self.assertEqual(self.test_session.current_step, OnboardingStep.WELCOME)
        self.assertEqual(self.test_session.data, {})
    
    @patch('main.requests.post')
    def test_send_otp_to_auth_service_success(self, mock_post):
        """Test successful OTP sending to auth service"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"success": True}
        mock_post.return_value = mock_response
        
        result = self.bot.send_otp_to_auth_service("+919876543210", {"name": "John"})
        
        self.assertTrue(result["success"])
        mock_post.assert_called_once()
    
    @patch('main.requests.post')
    def test_send_otp_to_auth_service_failure(self, mock_post):
        """Test failed OTP sending to auth service"""
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.text = "Bad request"
        mock_post.return_value = mock_response
        
        result = self.bot.send_otp_to_auth_service("+919876543210", {"name": "John"})
        
        self.assertFalse(result["success"])
        self.assertIn("error", result)
    
    @patch('main.redis_client')
    def test_session_management(self, mock_redis):
        """Test session save and retrieve"""
        # Mock Redis operations
        mock_redis.get.return_value = json.dumps({
            'current_step': 'name',
            'data': {'name': 'John'},
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        })
        
        # Test session retrieval
        session = self.bot.get_user_session(self.test_phone)
        self.assertIsNotNone(session)
        self.assertEqual(session.current_step, OnboardingStep.NAME)
        self.assertEqual(session.data['name'], 'John')
        
        # Test session saving
        self.bot.save_user_session(self.test_session)
        mock_redis.setex.assert_called_once()

class TestWebhookIntegration(unittest.TestCase):
    
    def setUp(self):
        """Set up test fixtures"""
        from main import app
        self.app = app.test_client()
        self.app.testing = True
    
    @patch('main.bot.process_message')
    def test_webhook_endpoint(self, mock_process):
        """Test webhook endpoint"""
        mock_process.return_value = "Test response"
        
        response = self.app.post('/webhook', data={
            'From': 'whatsapp:+919876543210',
            'Body': 'Hello'
        })
        
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Test response', response.data)
        mock_process.assert_called_once_with('whatsapp:+919876543210', 'Hello')
    
    @patch('main.redis_client')
    def test_health_endpoint(self, mock_redis):
        """Test health check endpoint"""
        mock_redis.ping.return_value = True
        
        with patch('main.requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_get.return_value = mock_response
            
            response = self.app.get('/health')
            
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertEqual(data['status'], 'healthy')
    
    @patch('main.redis_client')
    def test_stats_endpoint(self, mock_redis):
        """Test stats endpoint"""
        mock_redis.keys.return_value = ['whatsapp_session:+919876543210']
        mock_redis.get.return_value = json.dumps({
            'current_step': 'name',
            'data': {},
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        })
        
        response = self.app.get('/stats')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['total_sessions'], 1)
        self.assertIn('step_distribution', data)

if __name__ == '__main__':
    unittest.main()