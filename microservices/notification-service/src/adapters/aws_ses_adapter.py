import boto3
from ..config import settings

ses_client = boto3.client(
    "ses",
    region_name=settings.AWS_SES_REGION,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
)

async def send_email_ses(to_email: str, subject: str, body: str):
    ses_client.send_email(
        Source=f"noreply@msmebazaar.com",
        Destination={"ToAddresses": [to_email]},
        Message={
            "Subject": {"Data": subject},
            "Body": {"Text": {"Data": body}}
        }
    )
