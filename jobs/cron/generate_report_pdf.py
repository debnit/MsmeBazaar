#!/usr/bin/env python3
"""
Daily PDF Report Generation Job for VyapaarMitra
Generates comprehensive business reports in PDF format
Schedule: 0 7 * * * (Daily at 7 AM IST)
"""

import os
import sys
import logging
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import structlog
import asyncpg
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.linecharts import HorizontalLineChart
from reportlab.graphics.charts.piecharts import Pie
import boto3
from botocore.exceptions import ClientError
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email import encoders
import sentry_sdk

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)

class ReportGenerationError(Exception):
    """Custom exception for report generation errors"""
    pass

class VyapaarMitraReportGenerator:
    """Generate comprehensive business reports for VyapaarMitra"""
    
    def __init__(self):
        self.database_url = os.getenv("DATABASE_URL")
        self.aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
        self.aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        self.aws_bucket = os.getenv("AWS_BUCKET_NAME", "vyapaarmitra-reports")
        self.aws_region = os.getenv("AWS_REGION", "ap-south-1")
        self.sendgrid_api_key = os.getenv("SENDGRID_API_KEY")
        self.report_recipients = os.getenv("REPORT_RECIPIENTS", "admin@vyapaarmitra.in").split(",")
        
        # Initialize AWS S3 client
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=self.aws_access_key,
            aws_secret_access_key=self.aws_secret_key,
            region_name=self.aws_region
        )
        
        # Initialize Sentry
        if os.getenv("SENTRY_DSN"):
            sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"))
    
    async def connect_database(self) -> asyncpg.Connection:
        """Establish database connection"""
        try:
            conn = await asyncpg.connect(self.database_url)
            logger.info("Database connection established")
            return conn
        except Exception as e:
            logger.error("Failed to connect to database", error=str(e))
            raise ReportGenerationError(f"Database connection failed: {e}")
    
    async def fetch_business_metrics(self, conn: asyncpg.Connection, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Fetch key business metrics for the report period"""
        try:
            metrics = {}
            
            # Total registrations
            query = """
                SELECT COUNT(*) as total_registrations,
                       COUNT(CASE WHEN created_at >= $1 THEN 1 END) as new_registrations
                FROM users 
                WHERE created_at <= $2
            """
            result = await conn.fetchrow(query, start_date, end_date)
            metrics['registrations'] = dict(result)
            
            # Business verifications
            query = """
                SELECT COUNT(*) as total_businesses,
                       COUNT(CASE WHEN status = 'verified' THEN 1 END) as verified_businesses,
                       COUNT(CASE WHEN created_at >= $1 THEN 1 END) as new_businesses
                FROM businesses 
                WHERE created_at <= $2
            """
            result = await conn.fetchrow(query, start_date, end_date)
            metrics['businesses'] = dict(result)
            
            # Valuation requests
            query = """
                SELECT COUNT(*) as total_valuations,
                       COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_valuations,
                       AVG(valuation_amount) as avg_valuation,
                       COUNT(CASE WHEN created_at >= $1 THEN 1 END) as new_valuations
                FROM valuations 
                WHERE created_at <= $2
            """
            result = await conn.fetchrow(query, start_date, end_date)
            metrics['valuations'] = dict(result)
            
            # Loan applications (if implemented)
            query = """
                SELECT COUNT(*) as total_applications,
                       COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_applications,
                       SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as total_approved_amount
                FROM loan_applications 
                WHERE created_at <= $2
            """
            try:
                result = await conn.fetchrow(query, start_date, end_date)
                metrics['loans'] = dict(result) if result else {}
            except asyncpg.UndefinedTableError:
                metrics['loans'] = {'total_applications': 0, 'approved_applications': 0, 'total_approved_amount': 0}
            
            # Geographic distribution
            query = """
                SELECT state, COUNT(*) as count
                FROM businesses b
                JOIN users u ON b.user_id = u.id
                WHERE b.created_at <= $1
                GROUP BY state
                ORDER BY count DESC
                LIMIT 10
            """
            results = await conn.fetch(query, end_date)
            metrics['geographic_distribution'] = [dict(row) for row in results]
            
            # Industry distribution
            query = """
                SELECT industry_type, COUNT(*) as count
                FROM businesses
                WHERE created_at <= $1
                GROUP BY industry_type
                ORDER BY count DESC
                LIMIT 10
            """
            results = await conn.fetch(query, end_date)
            metrics['industry_distribution'] = [dict(row) for row in results]
            
            logger.info("Business metrics fetched successfully", metrics_count=len(metrics))
            return metrics
            
        except Exception as e:
            logger.error("Failed to fetch business metrics", error=str(e))
            raise ReportGenerationError(f"Metrics fetch failed: {e}")
    
    def create_pdf_report(self, metrics: Dict[str, Any], report_date: datetime) -> str:
        """Generate PDF report from metrics data"""
        try:
            filename = f"vyapaarmitra_daily_report_{report_date.strftime('%Y%m%d')}.pdf"
            filepath = f"/tmp/{filename}"
            
            # Create PDF document
            doc = SimpleDocTemplate(filepath, pagesize=A4)
            story = []
            styles = getSampleStyleSheet()
            
            # Title
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                spaceAfter=30,
                alignment=1,  # Center alignment
                textColor=colors.HexColor('#1f2937')
            )
            story.append(Paragraph("VyapaarMitra Daily Business Report", title_style))
            story.append(Spacer(1, 20))
            
            # Report date
            date_style = ParagraphStyle(
                'DateStyle',
                parent=styles['Normal'],
                fontSize=14,
                alignment=1,
                textColor=colors.HexColor('#6b7280')
            )
            story.append(Paragraph(f"Report Date: {report_date.strftime('%B %d, %Y')}", date_style))
            story.append(Spacer(1, 30))
            
            # Executive Summary
            story.append(Paragraph("Executive Summary", styles['Heading2']))
            story.append(Spacer(1, 12))
            
            summary_data = [
                ["Metric", "Total", "New (24h)", "Growth"],
                ["User Registrations", 
                 str(metrics['registrations']['total_registrations']), 
                 str(metrics['registrations']['new_registrations']),
                 f"{(metrics['registrations']['new_registrations']/max(metrics['registrations']['total_registrations']-metrics['registrations']['new_registrations'], 1)*100):.1f}%"],
                ["Business Profiles", 
                 str(metrics['businesses']['total_businesses']), 
                 str(metrics['businesses']['new_businesses']),
                 f"{(metrics['businesses']['new_businesses']/max(metrics['businesses']['total_businesses']-metrics['businesses']['new_businesses'], 1)*100):.1f}%"],
                ["Verified Businesses", 
                 str(metrics['businesses']['verified_businesses']), 
                 "-",
                 f"{(metrics['businesses']['verified_businesses']/max(metrics['businesses']['total_businesses'], 1)*100):.1f}%"],
                ["Valuations Completed", 
                 str(metrics['valuations']['completed_valuations']), 
                 str(metrics['valuations']['new_valuations']),
                 f"₹{metrics['valuations']['avg_valuation']:,.0f}" if metrics['valuations']['avg_valuation'] else "N/A"],
            ]
            
            summary_table = Table(summary_data, colWidths=[2.5*inch, 1.2*inch, 1.2*inch, 1.2*inch])
            summary_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#374151')),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb'))
            ]))
            
            story.append(summary_table)
            story.append(Spacer(1, 30))
            
            # Geographic Distribution
            if metrics['geographic_distribution']:
                story.append(Paragraph("Top States by Business Registration", styles['Heading2']))
                story.append(Spacer(1, 12))
                
                geo_data = [["State", "Number of Businesses", "Percentage"]]
                total_businesses = sum(item['count'] for item in metrics['geographic_distribution'])
                
                for item in metrics['geographic_distribution']:
                    percentage = (item['count'] / total_businesses * 100) if total_businesses > 0 else 0
                    geo_data.append([
                        item['state'] or 'Not Specified',
                        str(item['count']),
                        f"{percentage:.1f}%"
                    ])
                
                geo_table = Table(geo_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch])
                geo_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 11),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                    ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#374151')),
                    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 1), (-1, -1), 9),
                    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb'))
                ]))
                
                story.append(geo_table)
                story.append(Spacer(1, 30))
            
            # Industry Distribution
            if metrics['industry_distribution']:
                story.append(Paragraph("Top Industries by Business Count", styles['Heading2']))
                story.append(Spacer(1, 12))
                
                industry_data = [["Industry Type", "Number of Businesses", "Percentage"]]
                total_industries = sum(item['count'] for item in metrics['industry_distribution'])
                
                for item in metrics['industry_distribution']:
                    percentage = (item['count'] / total_industries * 100) if total_industries > 0 else 0
                    industry_data.append([
                        item['industry_type'] or 'Not Specified',
                        str(item['count']),
                        f"{percentage:.1f}%"
                    ])
                
                industry_table = Table(industry_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch])
                industry_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 11),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                    ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#374151')),
                    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 1), (-1, -1), 9),
                    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb'))
                ]))
                
                story.append(industry_table)
                story.append(Spacer(1, 30))
            
            # Footer
            footer_style = ParagraphStyle(
                'Footer',
                parent=styles['Normal'],
                fontSize=8,
                alignment=1,
                textColor=colors.HexColor('#9ca3af')
            )
            story.append(Spacer(1, 50))
            story.append(Paragraph(
                f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S IST')} | VyapaarMitra Business Intelligence",
                footer_style
            ))
            
            # Build PDF
            doc.build(story)
            logger.info("PDF report generated successfully", filepath=filepath)
            return filepath
            
        except Exception as e:
            logger.error("Failed to generate PDF report", error=str(e))
            raise ReportGenerationError(f"PDF generation failed: {e}")
    
    async def upload_to_s3(self, filepath: str, filename: str) -> str:
        """Upload report to S3 and return public URL"""
        try:
            s3_key = f"reports/daily/{filename}"
            
            self.s3_client.upload_file(
                filepath, 
                self.aws_bucket, 
                s3_key,
                ExtraArgs={
                    'ContentType': 'application/pdf',
                    'ACL': 'public-read'
                }
            )
            
            s3_url = f"https://{self.aws_bucket}.s3.{self.aws_region}.amazonaws.com/{s3_key}"
            logger.info("Report uploaded to S3", s3_url=s3_url)
            return s3_url
            
        except ClientError as e:
            logger.error("Failed to upload to S3", error=str(e))
            raise ReportGenerationError(f"S3 upload failed: {e}")
    
    def send_email_notification(self, s3_url: str, report_date: datetime, metrics: Dict[str, Any]):
        """Send email notification with report link"""
        try:
            # Email content
            subject = f"VyapaarMitra Daily Report - {report_date.strftime('%B %d, %Y')}"
            
            html_body = f"""
            <html>
            <head></head>
            <body>
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1f2937;">VyapaarMitra Daily Business Report</h2>
                    <p>Dear Team,</p>
                    <p>The daily business report for <strong>{report_date.strftime('%B %d, %Y')}</strong> is now available.</p>
                    
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #374151; margin-top: 0;">Quick Summary</h3>
                        <ul style="color: #6b7280;">
                            <li>New User Registrations: <strong>{metrics['registrations']['new_registrations']}</strong></li>
                            <li>New Business Profiles: <strong>{metrics['businesses']['new_businesses']}</strong></li>
                            <li>Total Verified Businesses: <strong>{metrics['businesses']['verified_businesses']}</strong></li>
                            <li>New Valuations: <strong>{metrics['valuations']['new_valuations']}</strong></li>
                        </ul>
                    </div>
                    
                    <p>
                        <a href="{s3_url}" 
                           style="background-color: #3b82f6; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 6px; display: inline-block;">
                            Download Full Report (PDF)
                        </a>
                    </p>
                    
                    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                        This report was automatically generated by the VyapaarMitra Business Intelligence system.
                    </p>
                </div>
            </body>
            </html>
            """
            
            # For now, log the email content (implement actual email sending as needed)
            logger.info("Email notification prepared", 
                       recipients=self.report_recipients, 
                       subject=subject,
                       s3_url=s3_url)
            
            # TODO: Implement actual email sending using SendGrid or SMTP
            print(f"Email would be sent to: {self.report_recipients}")
            print(f"Subject: {subject}")
            print(f"Report URL: {s3_url}")
            
        except Exception as e:
            logger.error("Failed to send email notification", error=str(e))
            # Don't raise exception here as report generation was successful
    
    async def generate_daily_report(self) -> Dict[str, Any]:
        """Main method to generate daily report"""
        try:
            report_date = datetime.now()
            start_date = report_date - timedelta(days=1)
            
            logger.info("Starting daily report generation", report_date=report_date.isoformat())
            
            # Connect to database
            conn = await self.connect_database()
            
            try:
                # Fetch metrics
                metrics = await self.fetch_business_metrics(conn, start_date, report_date)
                
                # Generate PDF
                pdf_filepath = self.create_pdf_report(metrics, report_date)
                
                # Upload to S3
                filename = os.path.basename(pdf_filepath)
                s3_url = await self.upload_to_s3(pdf_filepath, filename)
                
                # Send notification
                self.send_email_notification(s3_url, report_date, metrics)
                
                # Cleanup
                os.remove(pdf_filepath)
                
                result = {
                    "status": "success",
                    "report_date": report_date.isoformat(),
                    "s3_url": s3_url,
                    "metrics": metrics
                }
                
                logger.info("Daily report generation completed successfully", result=result)
                return result
                
            finally:
                await conn.close()
                
        except Exception as e:
            logger.error("Daily report generation failed", error=str(e))
            sentry_sdk.capture_exception(e)
            raise

async def main():
    """Main entry point for the cron job"""
    try:
        generator = VyapaarMitraReportGenerator()
        result = await generator.generate_daily_report()
        print(f"Report generation completed: {result['s3_url']}")
        return 0
        
    except Exception as e:
        logger.error("Cron job failed", error=str(e))
        print(f"Error: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())