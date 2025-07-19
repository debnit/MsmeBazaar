#!/usr/bin/env python3
"""
Google Sheets Analytics Sync Job for VyapaarMitra
Syncs business analytics and KPIs to Google Sheets for stakeholder access
Schedule: 0 */6 * * * (Every 6 hours)
"""

import os
import sys
import json
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import structlog
import asyncpg
import pandas as pd
from google.oauth2.service_account import Credentials
import gspread
from gspread import Worksheet
import httplib2
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
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

class GoogleSheetsError(Exception):
    """Custom exception for Google Sheets operations"""
    pass

class VyapaarMitraGoogleSheetsSync:
    """Sync VyapaarMitra analytics to Google Sheets"""
    
    def __init__(self):
        self.database_url = os.getenv("DATABASE_URL")
        self.google_credentials_json = os.getenv("GOOGLE_CREDENTIALS_JSON")
        self.google_spreadsheet_id = os.getenv("GOOGLE_SPREADSHEET_ID")
        self.google_drive_folder_id = os.getenv("GOOGLE_DRIVE_FOLDER_ID")
        
        # Initialize Sentry
        if os.getenv("SENTRY_DSN"):
            sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"))
        
        # Initialize Google API clients
        self._setup_google_clients()
    
    def _setup_google_clients(self):
        """Setup Google API clients with service account authentication"""
        try:
            if not self.google_credentials_json:
                raise GoogleSheetsError("GOOGLE_CREDENTIALS_JSON environment variable not set")
            
            # Parse credentials from JSON string
            credentials_info = json.loads(self.google_credentials_json)
            
            # Define required scopes
            scopes = [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/drive.file'
            ]
            
            # Create credentials
            self.credentials = Credentials.from_service_account_info(
                credentials_info, 
                scopes=scopes
            )
            
            # Initialize gspread client
            self.gc = gspread.authorize(self.credentials)
            
            # Initialize Google Drive API client
            self.drive_service = build('drive', 'v3', credentials=self.credentials)
            
            logger.info("Google API clients initialized successfully")
            
        except Exception as e:
            logger.error("Failed to setup Google API clients", error=str(e))
            raise GoogleSheetsError(f"Google API setup failed: {e}")
    
    async def connect_database(self) -> asyncpg.Connection:
        """Establish database connection"""
        try:
            conn = await asyncpg.connect(self.database_url)
            logger.info("Database connection established")
            return conn
        except Exception as e:
            logger.error("Failed to connect to database", error=str(e))
            raise GoogleSheetsError(f"Database connection failed: {e}")
    
    async def fetch_analytics_data(self, conn: asyncpg.Connection) -> Dict[str, Any]:
        """Fetch comprehensive analytics data from database"""
        try:
            analytics = {}
            
            # User registration metrics (last 30 days trend)
            query = """
                SELECT DATE(created_at) as date, COUNT(*) as registrations
                FROM users 
                WHERE created_at >= NOW() - INTERVAL '30 days'
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            """
            results = await conn.fetch(query)
            analytics['user_registrations_trend'] = [dict(row) for row in results]
            
            # Business verification metrics
            query = """
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as total_businesses,
                    COUNT(CASE WHEN status = 'verified' THEN 1 END) as verified_businesses,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_businesses,
                    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_businesses
                FROM businesses 
                WHERE created_at >= NOW() - INTERVAL '30 days'
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            """
            results = await conn.fetch(query)
            analytics['business_verification_trend'] = [dict(row) for row in results]
            
            # Valuation request metrics
            query = """
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as total_valuations,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_valuations,
                    AVG(valuation_amount) as avg_valuation_amount,
                    SUM(valuation_amount) as total_valuation_amount
                FROM valuations 
                WHERE created_at >= NOW() - INTERVAL '30 days'
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            """
            results = await conn.fetch(query)
            analytics['valuation_trend'] = [dict(row) for row in results]
            
            # Geographic distribution
            query = """
                SELECT 
                    COALESCE(u.state, 'Unknown') as state,
                    COUNT(DISTINCT u.id) as user_count,
                    COUNT(DISTINCT b.id) as business_count,
                    COUNT(DISTINCT v.id) as valuation_count
                FROM users u
                LEFT JOIN businesses b ON u.id = b.user_id
                LEFT JOIN valuations v ON u.id = v.user_id
                WHERE u.created_at >= NOW() - INTERVAL '90 days'
                GROUP BY u.state
                ORDER BY user_count DESC
                LIMIT 20
            """
            results = await conn.fetch(query)
            analytics['geographic_distribution'] = [dict(row) for row in results]
            
            # Industry analysis
            query = """
                SELECT 
                    COALESCE(industry_type, 'Unknown') as industry,
                    COUNT(*) as business_count,
                    COUNT(CASE WHEN status = 'verified' THEN 1 END) as verified_count,
                    AVG(CASE WHEN v.valuation_amount IS NOT NULL THEN v.valuation_amount END) as avg_valuation
                FROM businesses b
                LEFT JOIN valuations v ON b.id = v.business_id
                WHERE b.created_at >= NOW() - INTERVAL '90 days'
                GROUP BY industry_type
                ORDER BY business_count DESC
                LIMIT 15
            """
            results = await conn.fetch(query)
            analytics['industry_analysis'] = [dict(row) for row in results]
            
            # Monthly summary metrics
            query = """
                SELECT 
                    DATE_TRUNC('month', created_at) as month,
                    'users' as metric_type,
                    COUNT(*) as count
                FROM users 
                WHERE created_at >= NOW() - INTERVAL '12 months'
                GROUP BY DATE_TRUNC('month', created_at)
                
                UNION ALL
                
                SELECT 
                    DATE_TRUNC('month', created_at) as month,
                    'businesses' as metric_type,
                    COUNT(*) as count
                FROM businesses 
                WHERE created_at >= NOW() - INTERVAL '12 months'
                GROUP BY DATE_TRUNC('month', created_at)
                
                UNION ALL
                
                SELECT 
                    DATE_TRUNC('month', created_at) as month,
                    'valuations' as metric_type,
                    COUNT(*) as count
                FROM valuations 
                WHERE created_at >= NOW() - INTERVAL '12 months'
                GROUP BY DATE_TRUNC('month', created_at)
                
                ORDER BY month DESC, metric_type
            """
            results = await conn.fetch(query)
            analytics['monthly_summary'] = [dict(row) for row in results]
            
            # Platform usage statistics
            query = """
                SELECT 
                    COUNT(DISTINCT id) as total_users,
                    COUNT(DISTINCT CASE WHEN last_login >= NOW() - INTERVAL '7 days' THEN id END) as active_users_7d,
                    COUNT(DISTINCT CASE WHEN last_login >= NOW() - INTERVAL '30 days' THEN id END) as active_users_30d,
                    COUNT(DISTINCT CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN id END) as new_users_30d
                FROM users
            """
            result = await conn.fetchrow(query)
            analytics['platform_stats'] = dict(result) if result else {}
            
            logger.info("Analytics data fetched successfully", data_sets=len(analytics))
            return analytics
            
        except Exception as e:
            logger.error("Failed to fetch analytics data", error=str(e))
            raise GoogleSheetsError(f"Analytics fetch failed: {e}")
    
    def create_or_update_spreadsheet(self, analytics: Dict[str, Any]) -> str:
        """Create or update the analytics spreadsheet"""
        try:
            if self.google_spreadsheet_id:
                # Use existing spreadsheet
                spreadsheet = self.gc.open_by_key(self.google_spreadsheet_id)
                logger.info("Using existing spreadsheet", spreadsheet_id=self.google_spreadsheet_id)
            else:
                # Create new spreadsheet
                spreadsheet_name = f"VyapaarMitra Analytics - {datetime.now().strftime('%Y-%m')}"
                spreadsheet = self.gc.create(spreadsheet_name)
                
                # Move to Drive folder if specified
                if self.google_drive_folder_id:
                    self.drive_service.files().update(
                        fileId=spreadsheet.id,
                        addParents=self.google_drive_folder_id,
                        removeParents='root'
                    ).execute()
                
                logger.info("Created new spreadsheet", 
                           spreadsheet_id=spreadsheet.id, 
                           name=spreadsheet_name)
            
            # Update worksheets with analytics data
            self._update_user_registrations_sheet(spreadsheet, analytics['user_registrations_trend'])
            self._update_business_verification_sheet(spreadsheet, analytics['business_verification_trend'])
            self._update_valuation_trends_sheet(spreadsheet, analytics['valuation_trend'])
            self._update_geographic_distribution_sheet(spreadsheet, analytics['geographic_distribution'])
            self._update_industry_analysis_sheet(spreadsheet, analytics['industry_analysis'])
            self._update_monthly_summary_sheet(spreadsheet, analytics['monthly_summary'])
            self._update_platform_stats_sheet(spreadsheet, analytics['platform_stats'])
            
            return spreadsheet.id
            
        except Exception as e:
            logger.error("Failed to create/update spreadsheet", error=str(e))
            raise GoogleSheetsError(f"Spreadsheet update failed: {e}")
    
    def _get_or_create_worksheet(self, spreadsheet, name: str, rows: int = 1000, cols: int = 26) -> Worksheet:
        """Get existing worksheet or create new one"""
        try:
            return spreadsheet.worksheet(name)
        except gspread.WorksheetNotFound:
            return spreadsheet.add_worksheet(title=name, rows=rows, cols=cols)
    
    def _update_user_registrations_sheet(self, spreadsheet, data: List[Dict[str, Any]]):
        """Update user registrations trend sheet"""
        try:
            worksheet = self._get_or_create_worksheet(spreadsheet, "User Registrations")
            
            # Clear existing data
            worksheet.clear()
            
            # Headers
            headers = ["Date", "New Registrations", "Cumulative Total"]
            worksheet.append_row(headers)
            
            # Data rows
            cumulative = 0
            for row in reversed(data):  # Reverse to get chronological order
                cumulative += row['registrations']
                worksheet.append_row([
                    row['date'].strftime('%Y-%m-%d'),
                    row['registrations'],
                    cumulative
                ])
            
            # Format headers
            worksheet.format('A1:C1', {
                'backgroundColor': {'red': 0.9, 'green': 0.9, 'blue': 0.9},
                'textFormat': {'bold': True}
            })
            
            logger.info("Updated user registrations sheet", rows_added=len(data))
            
        except Exception as e:
            logger.error("Failed to update user registrations sheet", error=str(e))
            raise
    
    def _update_business_verification_sheet(self, spreadsheet, data: List[Dict[str, Any]]):
        """Update business verification trend sheet"""
        try:
            worksheet = self._get_or_create_worksheet(spreadsheet, "Business Verification")
            
            # Clear existing data
            worksheet.clear()
            
            # Headers
            headers = ["Date", "Total Businesses", "Verified", "Pending", "Rejected", "Verification Rate %"]
            worksheet.append_row(headers)
            
            # Data rows
            for row in reversed(data):
                verification_rate = (row['verified_businesses'] / max(row['total_businesses'], 1)) * 100
                worksheet.append_row([
                    row['date'].strftime('%Y-%m-%d'),
                    row['total_businesses'],
                    row['verified_businesses'],
                    row['pending_businesses'],
                    row['rejected_businesses'],
                    f"{verification_rate:.1f}%"
                ])
            
            # Format headers
            worksheet.format('A1:F1', {
                'backgroundColor': {'red': 0.9, 'green': 0.9, 'blue': 0.9},
                'textFormat': {'bold': True}
            })
            
            logger.info("Updated business verification sheet", rows_added=len(data))
            
        except Exception as e:
            logger.error("Failed to update business verification sheet", error=str(e))
            raise
    
    def _update_valuation_trends_sheet(self, spreadsheet, data: List[Dict[str, Any]]):
        """Update valuation trends sheet"""
        try:
            worksheet = self._get_or_create_worksheet(spreadsheet, "Valuation Trends")
            
            # Clear existing data
            worksheet.clear()
            
            # Headers
            headers = ["Date", "Total Requests", "Completed", "Avg Valuation (₹)", "Total Value (₹)", "Completion Rate %"]
            worksheet.append_row(headers)
            
            # Data rows
            for row in reversed(data):
                completion_rate = (row['completed_valuations'] / max(row['total_valuations'], 1)) * 100
                avg_valuation = row['avg_valuation_amount'] or 0
                total_value = row['total_valuation_amount'] or 0
                
                worksheet.append_row([
                    row['date'].strftime('%Y-%m-%d'),
                    row['total_valuations'],
                    row['completed_valuations'],
                    f"₹{avg_valuation:,.0f}",
                    f"₹{total_value:,.0f}",
                    f"{completion_rate:.1f}%"
                ])
            
            # Format headers
            worksheet.format('A1:F1', {
                'backgroundColor': {'red': 0.9, 'green': 0.9, 'blue': 0.9},
                'textFormat': {'bold': True}
            })
            
            logger.info("Updated valuation trends sheet", rows_added=len(data))
            
        except Exception as e:
            logger.error("Failed to update valuation trends sheet", error=str(e))
            raise
    
    def _update_geographic_distribution_sheet(self, spreadsheet, data: List[Dict[str, Any]]):
        """Update geographic distribution sheet"""
        try:
            worksheet = self._get_or_create_worksheet(spreadsheet, "Geographic Distribution")
            
            # Clear existing data
            worksheet.clear()
            
            # Headers
            headers = ["State", "Users", "Businesses", "Valuations", "Business/User Ratio", "Valuation/Business Ratio"]
            worksheet.append_row(headers)
            
            # Data rows
            for row in data:
                business_user_ratio = (row['business_count'] / max(row['user_count'], 1)) * 100
                valuation_business_ratio = (row['valuation_count'] / max(row['business_count'], 1)) * 100
                
                worksheet.append_row([
                    row['state'],
                    row['user_count'],
                    row['business_count'],
                    row['valuation_count'],
                    f"{business_user_ratio:.1f}%",
                    f"{valuation_business_ratio:.1f}%"
                ])
            
            # Format headers
            worksheet.format('A1:F1', {
                'backgroundColor': {'red': 0.9, 'green': 0.9, 'blue': 0.9},
                'textFormat': {'bold': True}
            })
            
            logger.info("Updated geographic distribution sheet", rows_added=len(data))
            
        except Exception as e:
            logger.error("Failed to update geographic distribution sheet", error=str(e))
            raise
    
    def _update_industry_analysis_sheet(self, spreadsheet, data: List[Dict[str, Any]]):
        """Update industry analysis sheet"""
        try:
            worksheet = self._get_or_create_worksheet(spreadsheet, "Industry Analysis")
            
            # Clear existing data
            worksheet.clear()
            
            # Headers
            headers = ["Industry", "Business Count", "Verified Count", "Verification Rate %", "Avg Valuation (₹)"]
            worksheet.append_row(headers)
            
            # Data rows
            for row in data:
                verification_rate = (row['verified_count'] / max(row['business_count'], 1)) * 100
                avg_valuation = row['avg_valuation'] or 0
                
                worksheet.append_row([
                    row['industry'],
                    row['business_count'],
                    row['verified_count'],
                    f"{verification_rate:.1f}%",
                    f"₹{avg_valuation:,.0f}" if avg_valuation > 0 else "N/A"
                ])
            
            # Format headers
            worksheet.format('A1:E1', {
                'backgroundColor': {'red': 0.9, 'green': 0.9, 'blue': 0.9},
                'textFormat': {'bold': True}
            })
            
            logger.info("Updated industry analysis sheet", rows_added=len(data))
            
        except Exception as e:
            logger.error("Failed to update industry analysis sheet", error=str(e))
            raise
    
    def _update_monthly_summary_sheet(self, spreadsheet, data: List[Dict[str, Any]]):
        """Update monthly summary sheet"""
        try:
            worksheet = self._get_or_create_worksheet(spreadsheet, "Monthly Summary")
            
            # Clear existing data
            worksheet.clear()
            
            # Reorganize data by month
            monthly_data = {}
            for row in data:
                month_key = row['month'].strftime('%Y-%m')
                if month_key not in monthly_data:
                    monthly_data[month_key] = {'month': month_key}
                monthly_data[month_key][row['metric_type']] = row['count']
            
            # Headers
            headers = ["Month", "Users", "Businesses", "Valuations"]
            worksheet.append_row(headers)
            
            # Data rows
            for month_key in sorted(monthly_data.keys(), reverse=True):
                row_data = monthly_data[month_key]
                worksheet.append_row([
                    month_key,
                    row_data.get('users', 0),
                    row_data.get('businesses', 0),
                    row_data.get('valuations', 0)
                ])
            
            # Format headers
            worksheet.format('A1:D1', {
                'backgroundColor': {'red': 0.9, 'green': 0.9, 'blue': 0.9},
                'textFormat': {'bold': True}
            })
            
            logger.info("Updated monthly summary sheet", months_added=len(monthly_data))
            
        except Exception as e:
            logger.error("Failed to update monthly summary sheet", error=str(e))
            raise
    
    def _update_platform_stats_sheet(self, spreadsheet, data: Dict[str, Any]):
        """Update platform statistics sheet"""
        try:
            worksheet = self._get_or_create_worksheet(spreadsheet, "Platform Stats")
            
            # Clear existing data
            worksheet.clear()
            
            # Current timestamp
            current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S IST')
            
            # Headers and data
            stats_data = [
                ["Metric", "Value", "Last Updated"],
                ["Total Users", data.get('total_users', 0), current_time],
                ["Active Users (7 days)", data.get('active_users_7d', 0), current_time],
                ["Active Users (30 days)", data.get('active_users_30d', 0), current_time],
                ["New Users (30 days)", data.get('new_users_30d', 0), current_time],
                ["", "", ""],
                ["Calculated Metrics", "", ""],
                ["7-day Activity Rate", f"{(data.get('active_users_7d', 0) / max(data.get('total_users', 1), 1) * 100):.1f}%", current_time],
                ["30-day Activity Rate", f"{(data.get('active_users_30d', 0) / max(data.get('total_users', 1), 1) * 100):.1f}%", current_time],
                ["30-day Growth Rate", f"{(data.get('new_users_30d', 0) / max(data.get('total_users', 1) - data.get('new_users_30d', 0), 1) * 100):.1f}%", current_time]
            ]
            
            # Add all rows
            for row in stats_data:
                worksheet.append_row(row)
            
            # Format headers
            worksheet.format('A1:C1', {
                'backgroundColor': {'red': 0.9, 'green': 0.9, 'blue': 0.9},
                'textFormat': {'bold': True}
            })
            
            worksheet.format('A7:C7', {
                'backgroundColor': {'red': 0.8, 'green': 0.8, 'blue': 0.8},
                'textFormat': {'bold': True}
            })
            
            logger.info("Updated platform stats sheet")
            
        except Exception as e:
            logger.error("Failed to update platform stats sheet", error=str(e))
            raise
    
    async def sync_analytics_to_google_sheets(self) -> Dict[str, Any]:
        """Main method to sync analytics to Google Sheets"""
        try:
            sync_time = datetime.now()
            logger.info("Starting Google Sheets sync", sync_time=sync_time.isoformat())
            
            # Connect to database
            conn = await self.connect_database()
            
            try:
                # Fetch analytics data
                analytics = await self.fetch_analytics_data(conn)
                
                # Create/update spreadsheet
                spreadsheet_id = self.create_or_update_spreadsheet(analytics)
                
                # Generate spreadsheet URL
                spreadsheet_url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}"
                
                result = {
                    "status": "success",
                    "sync_time": sync_time.isoformat(),
                    "spreadsheet_id": spreadsheet_id,
                    "spreadsheet_url": spreadsheet_url,
                    "data_sets_synced": len(analytics)
                }
                
                logger.info("Google Sheets sync completed successfully", result=result)
                return result
                
            finally:
                await conn.close()
                
        except Exception as e:
            logger.error("Google Sheets sync failed", error=str(e))
            sentry_sdk.capture_exception(e)
            raise

async def main():
    """Main entry point for the cron job"""
    try:
        syncer = VyapaarMitraGoogleSheetsSync()
        result = await syncer.sync_analytics_to_google_sheets()
        print(f"Google Sheets sync completed: {result['spreadsheet_url']}")
        return 0
        
    except Exception as e:
        logger.error("Cron job failed", error=str(e))
        print(f"Error: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())