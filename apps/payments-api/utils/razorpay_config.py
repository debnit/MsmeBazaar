from dotenv import load_dotenv
import os

# Find path to D:\msmebazaar\.env.local
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
dotenv_path = os.path.join(base_dir, ".env.local")
load_dotenv(dotenv_path)

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")
