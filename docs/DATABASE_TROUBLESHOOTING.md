# 🔧 Database Connection Troubleshooting Guide

## Common Database Connection Errors

### 1. WebSocket Connection Error (Error Code 1006)

**Error Message:**
```
Database health check failed: ErrorEvent {
  _closeCode: 1006,
  _closeFrameReceived: false,
  _closeFrameSent: false
}
```

**Root Cause:** 
Your application is trying to connect to a PostgreSQL database using WebSocket protocol, but the database doesn't support WebSocket connections.

**Fix:**
1. **Check your `DATABASE_URL` format:**
   ```bash
   # ❌ Wrong - WebSocket URL for regular PostgreSQL
   DATABASE_URL="wss://user:password@host:5432/dbname"
   
   # ✅ Correct - Standard PostgreSQL URL
   DATABASE_URL="postgres://user:password@host:5432/dbname"
   ```

2. **For Render PostgreSQL:**
   - Use the **Internal Database URL** (starts with `postgres://`)
   - NOT the External URL (which might be configured for WebSocket)

### 2. Connection Refused (ECONNREFUSED)

**Error Message:**
```
Error: connect ECONNREFUSED 10.211.24.215:443
```

**Root Cause:** 
Application trying to connect to wrong IP/port or service not running.

**Fix:**
1. **Verify DATABASE_URL:**
   ```bash
   # Check your environment variable
   echo $DATABASE_URL
   ```

2. **For Production Databases:**
   - Render: Use Internal URL (`postgres://...`)
   - Railway: Use provided connection string
   - Neon: Use connection string from dashboard

### 3. Authentication Failures

**Error Message:**
```
Database connection failed: password authentication failed
```

**Fix:**
1. **Double-check credentials in your DATABASE_URL**
2. **Ensure no special characters need URL encoding**
3. **Verify database user has proper permissions**

## Database URL Format Guide

### Standard PostgreSQL
```bash
# Format
DATABASE_URL="postgres://username:password@host:port/database"

# Example
DATABASE_URL="postgres://myuser:mypass@localhost:5432/mydb"
```

### Neon (Serverless PostgreSQL)
```bash
# Neon supports both formats
DATABASE_URL="postgres://username:password@host.neon.tech:5432/database"
# OR WebSocket (if using Neon's serverless features)
DATABASE_URL="wss://username:password@host.neon.tech/database"
```

### Railway
```bash
DATABASE_URL="postgres://postgres:password@containers-us-west-1.railway.app:5432/railway"
```

### Render
```bash
# Use INTERNAL URL for better performance and security
DATABASE_URL="postgres://username:password@dpg-xxxxx-a.oregon-postgres.render.com:5432/dbname"
```

## Platform-Specific Setup

### 🚀 Render
1. **Create PostgreSQL Database:**
   - Go to Render Dashboard
   - Click "New" → "PostgreSQL"
   - Choose a name and region
   - Click "Create Database"

2. **Get Connection String:**
   - Go to your database in Render
   - Copy the **Internal Database URL**
   - Set as `DATABASE_URL` in your web service

3. **Set Environment Variable:**
   ```bash
   # In Render Web Service Environment Variables
   DATABASE_URL=postgres://username:password@dpg-xxxxx-a.oregon-postgres.render.com:5432/dbname_xxxx
   ```

### 🚂 Railway
1. **Add PostgreSQL:**
   - In Railway project
   - Click "New" → "Database" → "Add PostgreSQL"
   
2. **Get Connection String:**
   - Go to PostgreSQL service
   - Copy connection string from "Connect" tab
   - Set as environment variable

### ⚡ Neon
1. **Create Database:**
   - Go to Neon Console
   - Create new project
   - Copy connection string

2. **Choose Connection Type:**
   ```bash
   # For standard connection
   DATABASE_URL="postgres://..."
   
   # For serverless/edge functions (WebSocket)
   DATABASE_URL="wss://..."
   ```

## Testing Database Connection

### Manual Testing
```bash
# Test with psql
psql "postgres://username:password@host:port/database"

# Test with curl (for HTTP-based databases)
curl -X POST "https://your-db-api/health"
```

### Application Testing
Our application automatically tests the database connection on startup. Check the logs for:

```
🔍 Testing database connection...
✅ Database connection successful (123ms)
```

Or error messages:
```
❌ Database connection failed: [error details]
🔧 WebSocket Connection Troubleshooting:
1. If using Render PostgreSQL, use the postgres:// URL (Internal Database URL)
2. If using Neon, make sure the URL includes neon.tech domain
3. Check that your DATABASE_URL environment variable is correctly set
4. Verify network connectivity to the database server
```

## Environment Variable Checklist

- [ ] `DATABASE_URL` is set correctly
- [ ] URL format matches your database type
- [ ] No typos in username/password
- [ ] Host and port are correct
- [ ] Database name exists
- [ ] User has proper permissions

## Common Mistakes

1. **Using External URL instead of Internal URL** (Render)
2. **Wrong protocol** (`wss://` vs `postgres://`)
3. **Missing environment variables** in production
4. **Firewall blocking connections**
5. **Database not provisioned** or still starting up

## Need Help?

If you're still having issues:

1. **Check the application logs** for detailed error messages
2. **Verify your DATABASE_URL format** matches your database provider
3. **Test connection manually** with `psql` or database client
4. **Check network connectivity** from your deployment environment

## Quick Fix Commands

```bash
# Check if DATABASE_URL is set
echo $DATABASE_URL

# Test PostgreSQL connection
psql $DATABASE_URL -c "SELECT 1;"

# Check application logs
tail -f /var/log/app.log
```