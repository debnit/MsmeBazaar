#!/usr/bin/env python3
"""
MsmeBazaar Admin Reports Generator
Generates comprehensive admin reports for business insights
"""

import os
import sys
import pandas as pd
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List
import json

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

class AdminReportsGenerator:
    """Generate comprehensive admin reports"""
    
    def __init__(self):
        self.reports_dir = "reports"
        self.timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        self.ensure_reports_directory()
    
    def ensure_reports_directory(self):
        """Ensure reports directory exists"""
        os.makedirs(self.reports_dir, exist_ok=True)
        print(f"📁 Reports directory: {os.path.abspath(self.reports_dir)}")
    
    def generate_user_metrics_report(self) -> str:
        """Generate user metrics report"""
        print("👥 Generating user metrics report...")
        
        # Placeholder data - replace with actual database queries
        user_data = {
            'metric': [
                'Total Registered Users',
                'Active Users (30 days)',
                'New Users (7 days)',
                'Seller Accounts',
                'Buyer Accounts',
                'Agent Accounts',
                'NBFC Accounts',
                'Verified Profiles',
                'Pending Verifications'
            ],
            'count': [1250, 890, 45, 320, 680, 85, 15, 950, 35],
            'change_7d': ['+3.2%', '+5.1%', '+12.5%', '+2.8%', '+4.2%', '+1.2%', '+0%', '+6.7%', '-8.5%'],
            'change_30d': ['+15.8%', '+18.2%', '+125%', '+12.1%', '+18.9%', '+6.2%', '+7.1%', '+22.3%', '-15.2%']
        }
        
        df = pd.DataFrame(user_data)
        filename = f"{self.reports_dir}/user_metrics_{self.timestamp}.csv"
        df.to_csv(filename, index=False)
        
        print(f"✅ User metrics report: {filename}")
        return filename
    
    def generate_business_performance_report(self) -> str:
        """Generate business performance report"""
        print("📊 Generating business performance report...")
        
        # Placeholder data - replace with actual database queries
        business_data = {
            'metric': [
                'Total MSME Listings',
                'Active Listings',
                'Completed Transactions',
                'Total Transaction Value (₹)',
                'Average Transaction Value (₹)',
                'Pending Applications',
                'Approved Applications',
                'Rejected Applications',
                'Commission Revenue (₹)',
                'Platform Growth Rate'
            ],
            'value': [340, 285, 89, 4500000, 50562, 25, 156, 12, 225000, '18.5%'],
            'previous_period': [320, 270, 76, 3800000, 50000, 30, 140, 15, 190000, '15.2%'],
            'change': ['+6.3%', '+5.6%', '+17.1%', '+18.4%', '+1.1%', '-16.7%', '+11.4%', '-20%', '+18.4%', '+3.3%']
        }
        
        df = pd.DataFrame(business_data)
        filename = f"{self.reports_dir}/business_performance_{self.timestamp}.csv"
        df.to_csv(filename, index=False)
        
        print(f"✅ Business performance report: {filename}")
        return filename
    
    def generate_financial_summary_report(self) -> str:
        """Generate financial summary report"""
        print("💰 Generating financial summary report...")
        
        # Placeholder data - replace with actual database queries
        financial_data = {
            'category': [
                'Platform Revenue',
                'Commission Income',
                'Subscription Fees',
                'Premium Features',
                'Transaction Fees',
                'Operational Costs',
                'Marketing Spend',
                'Technology Costs',
                'Net Profit',
                'Growth Investment'
            ],
            'current_month': [450000, 225000, 85000, 65000, 75000, 180000, 45000, 85000, 140000, 95000],
            'previous_month': [380000, 190000, 80000, 55000, 55000, 170000, 50000, 80000, 85000, 75000],
            'ytd_total': [4200000, 2100000, 850000, 580000, 670000, 1680000, 520000, 850000, 1180000, 890000],
            'change_pct': ['+18.4%', '+18.4%', '+6.3%', '+18.2%', '+36.4%', '+5.9%', '-10%', '+6.3%', '+64.7%', '+26.7%']
        }
        
        df = pd.DataFrame(financial_data)
        filename = f"{self.reports_dir}/financial_summary_{self.timestamp}.csv"
        df.to_csv(filename, index=False)
        
        print(f"✅ Financial summary report: {filename}")
        return filename
    
    def generate_system_health_report(self) -> str:
        """Generate system health and performance report"""
        print("🔧 Generating system health report...")
        
        # Placeholder data - replace with actual system metrics
        system_data = {
            'component': [
                'API Response Time (avg)',
                'Database Query Time (avg)',
                'Server Uptime',
                'Error Rate',
                'Active Sessions',
                'Cache Hit Rate',
                'Storage Usage',
                'Bandwidth Usage (GB)',
                'Security Incidents',
                'Backup Status'
            ],
            'current_value': ['245ms', '85ms', '99.97%', '0.12%', 1250, '94.5%', '68%', 450, 0, 'Success'],
            'threshold': ['<500ms', '<200ms', '>99.9%', '<0.5%', '<2000', '>90%', '<80%', '<1000', '0', 'Success'],
            'status': ['✅ Good', '✅ Good', '✅ Good', '✅ Good', '✅ Good', '✅ Good', '✅ Good', '✅ Good', '✅ Good', '✅ Good']
        }
        
        df = pd.DataFrame(system_data)
        filename = f"{self.reports_dir}/system_health_{self.timestamp}.csv"
        df.to_csv(filename, index=False)
        
        print(f"✅ System health report: {filename}")
        return filename
    
    def generate_summary_dashboard_data(self) -> str:
        """Generate summary data for admin dashboard"""
        print("📋 Generating admin dashboard summary...")
        
        summary_data = {
            'kpi': [
                'Total Revenue (₹)',
                'Active Users',
                'Completed Transactions',
                'Platform Growth',
                'Customer Satisfaction',
                'System Uptime',
                'Response Time',
                'Security Score'
            ],
            'value': [4500000, 890, 89, '18.5%', '4.7/5', '99.97%', '245ms', '95/100'],
            'target': [4000000, 800, 75, '15%', '4.5/5', '99.9%', '500ms', '90/100'],
            'status': ['🎯 Exceeded', '🎯 Exceeded', '🎯 Exceeded', '🎯 Exceeded', '🎯 Exceeded', '🎯 Exceeded', '✅ Met', '🎯 Exceeded']
        }
        
        df = pd.DataFrame(summary_data)
        filename = f"{self.reports_dir}/dashboard_summary_{self.timestamp}.csv"
        df.to_csv(filename, index=False)
        
        # Also create JSON version for API consumption
        json_filename = f"{self.reports_dir}/dashboard_summary_{self.timestamp}.json"
        summary_json = {
            'generated_at': datetime.now().isoformat(),
            'period': 'current_month',
            'kpis': summary_data
        }
        
        with open(json_filename, 'w') as f:
            json.dump(summary_json, f, indent=2)
        
        print(f"✅ Dashboard summary: {filename}")
        print(f"✅ Dashboard JSON: {json_filename}")
        return filename
    
    def generate_all_reports(self) -> List[str]:
        """Generate all admin reports"""
        print("🚀 Starting comprehensive admin report generation...")
        print(f"📅 Report timestamp: {self.timestamp}")
        
        generated_files = []
        
        try:
            # Generate all report types
            generated_files.append(self.generate_user_metrics_report())
            generated_files.append(self.generate_business_performance_report())
            generated_files.append(self.generate_financial_summary_report())
            generated_files.append(self.generate_system_health_report())
            generated_files.append(self.generate_summary_dashboard_data())
            
            print(f"\n✅ Successfully generated {len(generated_files)} reports:")
            for file in generated_files:
                file_size = os.path.getsize(file) if os.path.exists(file) else 0
                print(f"   📄 {file} ({file_size} bytes)")
            
            # Create a manifest file
            manifest = {
                'generated_at': datetime.now().isoformat(),
                'reports': generated_files,
                'total_files': len(generated_files),
                'generator_version': '1.0.0'
            }
            
            manifest_file = f"{self.reports_dir}/manifest_{self.timestamp}.json"
            with open(manifest_file, 'w') as f:
                json.dump(manifest, f, indent=2)
            
            generated_files.append(manifest_file)
            print(f"   📋 {manifest_file} (manifest)")
            
            print(f"\n🎉 Admin report generation completed successfully!")
            
        except Exception as e:
            print(f"❌ Error generating reports: {str(e)}")
            raise
        
        return generated_files

def main():
    """Main execution function"""
    print("=" * 60)
    print("🏢 MsmeBazaar Admin Reports Generator")
    print("=" * 60)
    
    try:
        generator = AdminReportsGenerator()
        generated_files = generator.generate_all_reports()
        
        print(f"\n📊 Report Generation Summary:")
        print(f"   📁 Reports directory: {os.path.abspath(generator.reports_dir)}")
        print(f"   📄 Files generated: {len(generated_files)}")
        print(f"   ⏰ Completion time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Fatal error: {str(e)}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)