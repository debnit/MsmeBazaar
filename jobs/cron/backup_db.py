#!/usr/bin/env python3
"""
Database Backup Job for VyapaarMitra
Creates automated backups with compression and cloud storage
Schedule: 0 0 * * 0 (Weekly on Sunday at midnight)
"""

import os
import sys
import asyncio
import subprocess
import gzip
import shutil
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import structlog
import boto3
from botocore.exceptions import ClientError
import requests
import json
import tempfile
from pathlib import Path
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

class BackupError(Exception):
    """Custom exception for backup operations"""
    pass

class VyapaarMitraBackupManager:
    """Automated database backup and management for VyapaarMitra"""
    
    def __init__(self):
        self.database_url = os.getenv("DATABASE_URL")
        self.aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
        self.aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        self.aws_bucket = os.getenv("AWS_BACKUP_BUCKET", "vyapaarmitra-backups")
        self.aws_region = os.getenv("AWS_REGION", "ap-south-1")
        self.slack_webhook_url = os.getenv("SLACK_WEBHOOK_URL")
        self.telegram_bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        self.telegram_chat_id = os.getenv("TELEGRAM_CHAT_ID")
        self.retention_days = int(os.getenv("BACKUP_RETENTION_DAYS", "30"))
        
        # Initialize AWS S3 client
        if self.aws_access_key and self.aws_secret_key:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=self.aws_access_key,
                aws_secret_access_key=self.aws_secret_key,
                region_name=self.aws_region
            )
        else:
            self.s3_client = None
            logger.warning("AWS credentials not provided, backups will be local only")
        
        # Initialize Sentry
        if os.getenv("SENTRY_DSN"):
            sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"))
    
    def create_database_backup(self) -> str:
        """Create a PostgreSQL database backup using pg_dump"""
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f"vyapaarmitra_backup_{timestamp}.sql"
            backup_path = f"/tmp/{backup_filename}"
            
            logger.info("Starting database backup", filename=backup_filename)
            
            # Construct pg_dump command
            cmd = [
                "pg_dump",
                "--no-password",
                "--verbose",
                "--clean",
                "--no-acl",
                "--no-owner",
                "--format=c",  # Custom format for better compression
                "--file", backup_path,
                self.database_url
            ]
            
            # Execute pg_dump
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=3600  # 1 hour timeout
            )
            
            if result.returncode != 0:
                error_msg = f"pg_dump failed: {result.stderr}"
                logger.error("Database backup failed", error=error_msg)
                raise BackupError(error_msg)
            
            # Verify backup file exists and has content
            if not os.path.exists(backup_path) or os.path.getsize(backup_path) == 0:
                raise BackupError("Backup file is empty or doesn't exist")
            
            file_size = os.path.getsize(backup_path)
            logger.info("Database backup completed", 
                       filepath=backup_path, 
                       file_size_mb=f"{file_size / 1024 / 1024:.2f}")
            
            return backup_path
            
        except subprocess.TimeoutExpired:
            logger.error("Database backup timed out")
            raise BackupError("Backup operation timed out")
        except Exception as e:
            logger.error("Failed to create database backup", error=str(e))
            raise BackupError(f"Backup creation failed: {e}")
    
    def compress_backup(self, backup_path: str) -> str:
        """Compress backup file using gzip"""
        try:
            compressed_path = f"{backup_path}.gz"
            
            logger.info("Compressing backup file", source=backup_path)
            
            with open(backup_path, 'rb') as f_in:
                with gzip.open(compressed_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            # Remove original uncompressed file
            os.remove(backup_path)
            
            original_size = os.path.getsize(backup_path) if os.path.exists(backup_path) else 0
            compressed_size = os.path.getsize(compressed_path)
            compression_ratio = (1 - compressed_size / max(original_size, 1)) * 100
            
            logger.info("Backup compression completed", 
                       compressed_path=compressed_path,
                       compressed_size_mb=f"{compressed_size / 1024 / 1024:.2f}",
                       compression_ratio=f"{compression_ratio:.1f}%")
            
            return compressed_path
            
        except Exception as e:
            logger.error("Failed to compress backup", error=str(e))
            raise BackupError(f"Compression failed: {e}")
    
    def upload_to_s3(self, backup_path: str) -> str:
        """Upload backup to S3 and return S3 URL"""
        try:
            if not self.s3_client:
                raise BackupError("S3 client not initialized")
            
            filename = os.path.basename(backup_path)
            s3_key = f"database_backups/{datetime.now().strftime('%Y/%m')}/{filename}"
            
            logger.info("Uploading backup to S3", s3_key=s3_key)
            
            # Upload with metadata
            self.s3_client.upload_file(
                backup_path,
                self.aws_bucket,
                s3_key,
                ExtraArgs={
                    'Metadata': {
                        'backup_date': datetime.now().isoformat(),
                        'database': 'vyapaarmitra',
                        'backup_type': 'full',
                        'compression': 'gzip'
                    },
                    'StorageClass': 'STANDARD_IA'  # Infrequent Access for cost optimization
                }
            )
            
            s3_url = f"s3://{self.aws_bucket}/{s3_key}"
            logger.info("Backup uploaded to S3 successfully", s3_url=s3_url)
            return s3_url
            
        except ClientError as e:
            logger.error("Failed to upload backup to S3", error=str(e))
            raise BackupError(f"S3 upload failed: {e}")
    
    def cleanup_old_backups(self):
        """Remove old backups based on retention policy"""
        try:
            if not self.s3_client:
                logger.warning("S3 client not available, skipping cleanup")
                return
            
            cutoff_date = datetime.now() - timedelta(days=self.retention_days)
            logger.info("Cleaning up old backups", 
                       retention_days=self.retention_days,
                       cutoff_date=cutoff_date.isoformat())
            
            # List objects in backup folder
            response = self.s3_client.list_objects_v2(
                Bucket=self.aws_bucket,
                Prefix="database_backups/"
            )
            
            deleted_count = 0
            total_size_freed = 0
            
            if 'Contents' in response:
                for obj in response['Contents']:
                    if obj['LastModified'].replace(tzinfo=None) < cutoff_date:
                        # Delete old backup
                        self.s3_client.delete_object(
                            Bucket=self.aws_bucket,
                            Key=obj['Key']
                        )
                        deleted_count += 1
                        total_size_freed += obj['Size']
                        logger.info("Deleted old backup", 
                                   key=obj['Key'], 
                                   last_modified=obj['LastModified'])
            
            logger.info("Backup cleanup completed", 
                       deleted_count=deleted_count,
                       size_freed_mb=f"{total_size_freed / 1024 / 1024:.2f}")
            
        except Exception as e:
            logger.error("Failed to cleanup old backups", error=str(e))
            # Don't raise exception as this is not critical
    
    def send_slack_notification(self, success: bool, backup_info: Dict[str, Any]):
        """Send backup status notification to Slack"""
        try:
            if not self.slack_webhook_url:
                logger.info("Slack webhook not configured, skipping notification")
                return
            
            if success:
                color = "good"
                title = "✅ Database Backup Successful"
                text = f"VyapaarMitra database backup completed successfully"
                fields = [
                    {
                        "title": "Backup File",
                        "value": backup_info.get('filename', 'N/A'),
                        "short": True
                    },
                    {
                        "title": "File Size",
                        "value": backup_info.get('file_size', 'N/A'),
                        "short": True
                    },
                    {
                        "title": "S3 Location",
                        "value": backup_info.get('s3_url', 'Local only'),
                        "short": False
                    },
                    {
                        "title": "Backup Time",
                        "value": backup_info.get('backup_time', 'N/A'),
                        "short": True
                    }
                ]
            else:
                color = "danger"
                title = "❌ Database Backup Failed"
                text = f"VyapaarMitra database backup failed"
                fields = [
                    {
                        "title": "Error",
                        "value": backup_info.get('error', 'Unknown error'),
                        "short": False
                    },
                    {
                        "title": "Failed At",
                        "value": backup_info.get('failed_time', 'N/A'),
                        "short": True
                    }
                ]
            
            payload = {
                "channel": "#infrastructure",
                "username": "VyapaarMitra Backup Bot",
                "icon_emoji": ":floppy_disk:",
                "attachments": [
                    {
                        "color": color,
                        "title": title,
                        "text": text,
                        "fields": fields,
                        "footer": "VyapaarMitra Infrastructure",
                        "ts": int(datetime.now().timestamp())
                    }
                ]
            }
            
            response = requests.post(
                self.slack_webhook_url,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                logger.info("Slack notification sent successfully")
            else:
                logger.error("Failed to send Slack notification", 
                           status_code=response.status_code,
                           response=response.text)
                
        except Exception as e:
            logger.error("Failed to send Slack notification", error=str(e))
            # Don't raise exception as notification failure shouldn't stop backup
    
    def send_telegram_notification(self, success: bool, backup_info: Dict[str, Any]):
        """Send backup status notification to Telegram"""
        try:
            if not self.telegram_bot_token or not self.telegram_chat_id:
                logger.info("Telegram credentials not configured, skipping notification")
                return
            
            if success:
                emoji = "✅"
                status = "SUCCESS"
                message = f"{emoji} *VyapaarMitra Database Backup {status}*\n\n"
                message += f"📁 File: `{backup_info.get('filename', 'N/A')}`\n"
                message += f"📊 Size: `{backup_info.get('file_size', 'N/A')}`\n"
                message += f"☁️ S3: `{backup_info.get('s3_url', 'Local only')}`\n"
                message += f"🕐 Time: `{backup_info.get('backup_time', 'N/A')}`"
            else:
                emoji = "❌"
                status = "FAILED"
                message = f"{emoji} *VyapaarMitra Database Backup {status}*\n\n"
                message += f"❗ Error: `{backup_info.get('error', 'Unknown error')}`\n"
                message += f"🕐 Failed at: `{backup_info.get('failed_time', 'N/A')}`"
            
            url = f"https://api.telegram.org/bot{self.telegram_bot_token}/sendMessage"
            payload = {
                "chat_id": self.telegram_chat_id,
                "text": message,
                "parse_mode": "Markdown"
            }
            
            response = requests.post(url, json=payload, timeout=30)
            
            if response.status_code == 200:
                logger.info("Telegram notification sent successfully")
            else:
                logger.error("Failed to send Telegram notification", 
                           status_code=response.status_code,
                           response=response.text)
                
        except Exception as e:
            logger.error("Failed to send Telegram notification", error=str(e))
    
    def get_backup_statistics(self) -> Dict[str, Any]:
        """Get backup statistics from S3"""
        try:
            if not self.s3_client:
                return {"total_backups": 0, "total_size_mb": 0}
            
            response = self.s3_client.list_objects_v2(
                Bucket=self.aws_bucket,
                Prefix="database_backups/"
            )
            
            total_backups = 0
            total_size = 0
            
            if 'Contents' in response:
                total_backups = len(response['Contents'])
                total_size = sum(obj['Size'] for obj in response['Contents'])
            
            return {
                "total_backups": total_backups,
                "total_size_mb": round(total_size / 1024 / 1024, 2),
                "bucket": self.aws_bucket
            }
            
        except Exception as e:
            logger.error("Failed to get backup statistics", error=str(e))
            return {"total_backups": 0, "total_size_mb": 0, "error": str(e)}
    
    async def create_backup(self) -> Dict[str, Any]:
        """Main method to create and manage database backup"""
        backup_start_time = datetime.now()
        backup_info = {
            "backup_time": backup_start_time.isoformat(),
            "status": "started"
        }
        
        try:
            logger.info("Starting VyapaarMitra database backup process")
            
            # Create database backup
            backup_path = self.create_database_backup()
            backup_info["original_path"] = backup_path
            
            # Compress backup
            compressed_path = self.compress_backup(backup_path)
            backup_info["compressed_path"] = compressed_path
            backup_info["filename"] = os.path.basename(compressed_path)
            
            # Get file size
            file_size = os.path.getsize(compressed_path)
            backup_info["file_size"] = f"{file_size / 1024 / 1024:.2f} MB"
            backup_info["file_size_bytes"] = file_size
            
            # Upload to S3 if configured
            if self.s3_client:
                s3_url = self.upload_to_s3(compressed_path)
                backup_info["s3_url"] = s3_url
                
                # Cleanup old backups
                self.cleanup_old_backups()
            
            # Cleanup local files
            if os.path.exists(compressed_path):
                os.remove(compressed_path)
                logger.info("Local backup file cleaned up")
            
            # Calculate backup duration
            backup_duration = datetime.now() - backup_start_time
            backup_info["duration_seconds"] = backup_duration.total_seconds()
            backup_info["status"] = "success"
            
            # Get backup statistics
            stats = self.get_backup_statistics()
            backup_info["statistics"] = stats
            
            logger.info("Database backup completed successfully", 
                       duration_seconds=backup_info["duration_seconds"],
                       file_size=backup_info["file_size"])
            
            # Send success notifications
            self.send_slack_notification(True, backup_info)
            self.send_telegram_notification(True, backup_info)
            
            return backup_info
            
        except Exception as e:
            error_msg = str(e)
            backup_info.update({
                "status": "failed",
                "error": error_msg,
                "failed_time": datetime.now().isoformat()
            })
            
            logger.error("Database backup failed", error=error_msg)
            sentry_sdk.capture_exception(e)
            
            # Send failure notifications
            self.send_slack_notification(False, backup_info)
            self.send_telegram_notification(False, backup_info)
            
            raise

async def main():
    """Main entry point for the backup cron job"""
    try:
        backup_manager = VyapaarMitraBackupManager()
        result = await backup_manager.create_backup()
        
        print(f"Backup completed successfully")
        print(f"File: {result.get('filename', 'N/A')}")
        print(f"Size: {result.get('file_size', 'N/A')}")
        print(f"Duration: {result.get('duration_seconds', 0):.1f} seconds")
        if result.get('s3_url'):
            print(f"S3 URL: {result['s3_url']}")
        
        return 0
        
    except Exception as e:
        logger.error("Backup cron job failed", error=str(e))
        print(f"Error: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())