import os
from datetime import datetime
from utils.report_generator import generate_excel_report, upload_to_drive
from utils.twilio_alert import send_whatsapp_alert

# Step 1: Generate report
report_path = generate_excel_report()

# Step 2: Upload to Google Drive
drive_url = upload_to_drive(report_path)

# Step 3: WhatsApp notify
send_whatsapp_alert(
    to=os.getenv("ADMIN_PHONE"),
    message=f"📊 MSME Admin Report ({datetime.now().strftime('%d-%b')}): {drive_url}"
)

