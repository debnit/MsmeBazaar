# 🗄️ PostgreSQL Database Setup Guide

Complete guide for setting up PostgreSQL database for your MSMEBazaar application.

## 📋 Current Status
✅ **Application**: Ready for database connection  
⚪ **Database**: Needs configuration (placeholder URL detected)

## 🚀 Quick Setup Options

### Option 1: Interactive Setup (Recommended)
```bash
npm run setup:db
```
Guided setup with multiple database options.

### Option 2: Test Current Configuration
```bash
npm run test:db
```
Check if your database is working properly.

## 🎯 Database Options Comparison

| Option | Cost | Complexity | Best For | Free Tier |
|--------|------|------------|----------|-----------|
| **Docker** | Free | Easy | Development | ∞ |
| **Neon** | Free tier | Very Easy | Production | 0.5GB storage |
| **Supabase** | Free tier | Easy | Full-stack | 500MB storage |
| **Railway** | $5 credits | Easy | Small apps | $5/month |
| **Local** | Free | Medium | Development | ∞ |
| **Render** | $7/month | Easy | Production | None |

## 🐳 Option 1: Docker PostgreSQL (Recommended for Development)

### Why Docker?
- ✅ **Easiest setup** - No installation needed
- ✅ **Isolated environment** - Won't affect your system
- ✅ **Consistent across platforms** - Works on Windows, Mac, Linux
- ✅ **Easy cleanup** - Remove container when done

### Setup Steps:
```bash
# 1. Run the setup script
npm run setup:db

# 2. Choose option 2 (Docker PostgreSQL)

# 3. Start the database
docker-compose -f docker-compose.db.yml up -d

# 4. Test connection
npm run test:db

# 5. Run migrations
npm run db:push

# 6. Start your app
npm start
```

### Docker Commands:
```bash
# Start database
docker-compose -f docker-compose.db.yml up -d

# Stop database
docker-compose -f docker-compose.db.yml down

# View logs
docker-compose -f docker-compose.db.yml logs -f

# Connect to database
docker exec -it msmebazaar-postgres psql -U msmebazaar_user -d msmebazaar
```

## ⚡ Option 2: Neon (Recommended for Production)

### Why Neon?
- ✅ **Serverless PostgreSQL** - Auto-scaling
- ✅ **Generous free tier** - 0.5GB storage, 10GB transfer
- ✅ **Branching** - Git-like database branching
- ✅ **No maintenance** - Fully managed

### Setup Steps:
1. Go to [neon.tech](https://neon.tech/)
2. Sign up with GitHub
3. Create new project
4. Copy connection string
5. Run: `npm run setup:db` → Choose Neon
6. Paste connection string
7. Test: `npm run test:db`
8. Migrate: `npm run db:push`

### Example Connection String:
```
postgresql://username:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

## 🚀 Option 3: Supabase

### Why Supabase?
- ✅ **PostgreSQL + extras** - Auth, real-time, storage
- ✅ **Great dashboard** - Visual database management
- ✅ **Free tier** - 500MB storage, 2GB transfer
- ✅ **Built-in features** - Row-level security, APIs

### Setup Steps:
1. Go to [supabase.com](https://supabase.com/)
2. Create new project
3. Settings → Database → Connection string
4. Run: `npm run setup:db` → Choose Supabase
5. Paste connection string
6. Test: `npm run test:db`
7. Migrate: `npm run db:push`

## 🚄 Option 4: Railway

### Why Railway?
- ✅ **Simple setup** - One-click PostgreSQL
- ✅ **Good free tier** - $5/month credits
- ✅ **Easy scaling** - Upgrade when needed
- ✅ **Great for startups** - Cost-effective

### Setup Steps:
1. Go to [railway.app](https://railway.app/)
2. Sign up with GitHub
3. New Project → Add PostgreSQL
4. Variables tab → Copy DATABASE_URL
5. Run: `npm run setup:db` → Choose Railway
6. Paste DATABASE_URL
7. Test: `npm run test:db`
8. Migrate: `npm run db:push`

## 🔧 Option 5: Local PostgreSQL

### Why Local?
- ✅ **Full control** - Your machine, your rules
- ✅ **No internet required** - Work offline
- ✅ **No costs** - Completely free
- ✅ **Learning** - Understand PostgreSQL better

### Installation:

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS:
```bash
brew install postgresql
brew services start postgresql
```

#### Windows:
Download from [postgresql.org](https://www.postgresql.org/download/windows/)

### Setup Steps:
```bash
# 1. Create database and user
sudo -u postgres psql
CREATE USER msmebazaar_user WITH PASSWORD 'secure_password';
CREATE DATABASE msmebazaar OWNER msmebazaar_user;
GRANT ALL PRIVILEGES ON DATABASE msmebazaar TO msmebazaar_user;
\q

# 2. Update .env file
DATABASE_URL=postgresql://msmebazaar_user:secure_password@localhost:5432/msmebazaar

# 3. Test connection
npm run test:db

# 4. Run migrations
npm run db:push
```

## 🧪 Testing Your Database

After setup, always test your database:

```bash
# Test connection and performance
npm run test:db
```

**Expected output:**
```
✅ Database connection successful (45ms)
✅ PostgreSQL version: PostgreSQL 15.4
✅ Database permissions: CREATE, INSERT, SELECT, DROP
✅ Query performance: 12ms
🎉 Database is ready for MSMEBazaar!
```

## 🗄️ Database Schema

Your MSMEBazaar application uses these main tables:

### Core Tables:
- `users` - User accounts and profiles
- `msme_listings` - Business listings
- `transactions` - Business transactions
- `agents` - Agent information
- `nbfc_partners` - NBFC partner details

### Supporting Tables:
- `conversations` - Chat/support conversations
- `notifications` - User notifications
- `audit_logs` - System audit trail
- `documents` - Document storage metadata

### Create Schema:
```bash
# Generate and run migrations
npm run db:push

# Check tables were created
npm run test:db
```

## 🔧 Environment Configuration

Your `.env` file should contain:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@host:5432/database

# Optional: Connection Pool Settings
DB_POOL_SIZE=10
DB_CONNECTION_TIMEOUT=10000
DB_IDLE_TIMEOUT=30000

# Optional: Test Database
TEST_DATABASE_URL=postgresql://user:password@host:5432/test_database
```

## 📊 Performance Optimization

### Connection Pooling:
```env
# Adjust based on your needs
DB_POOL_SIZE=20          # Max connections
DB_CONNECTION_TIMEOUT=10000  # 10 seconds
DB_IDLE_TIMEOUT=30000    # 30 seconds
```

### Production Settings:
```env
# Production database URL with SSL
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require

# Larger pool for production
DB_POOL_SIZE=25
```

## 🚨 Troubleshooting

### Common Issues:

#### 1. "DATABASE_URL environment variable is not set"
**Solution**: Run `npm run setup:db` or manually set DATABASE_URL in `.env`

#### 2. "Connection refused"
**Solutions**:
- Check if database server is running
- Verify host and port in DATABASE_URL
- Check firewall settings

#### 3. "Authentication failed"
**Solutions**:
- Verify username/password in DATABASE_URL
- Check user permissions in database
- Ensure user exists

#### 4. "Database does not exist"
**Solutions**:
- Create the database first
- Check database name in DATABASE_URL
- Run database creation commands

#### 5. "SSL connection required"
**Solutions**:
- Add `?sslmode=require` to DATABASE_URL
- Configure SSL certificates if needed

### Debug Commands:
```bash
# Test connection manually
psql $DATABASE_URL

# Check environment variables
echo $DATABASE_URL

# View database logs (Docker)
docker-compose -f docker-compose.db.yml logs -f postgres

# Check running containers
docker ps
```

## 🔒 Security Best Practices

### 1. Environment Variables
- Never commit DATABASE_URL to git
- Use different databases for dev/prod
- Rotate passwords regularly

### 2. Database Security
- Use strong passwords
- Enable SSL in production
- Limit user permissions
- Regular backups

### 3. Connection Security
```env
# Production database with SSL
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require&connect_timeout=10
```

## 📋 Quick Commands Reference

```bash
# Setup database interactively
npm run setup:db

# Test database connection
npm run test:db

# Run database migrations
npm run db:push

# Start Docker database
docker-compose -f docker-compose.db.yml up -d

# Stop Docker database
docker-compose -f docker-compose.db.yml down

# Connect to database
psql $DATABASE_URL

# Start application
npm start
```

## 🎉 Next Steps

After database setup:

1. ✅ **Test connection**: `npm run test:db`
2. ✅ **Run migrations**: `npm run db:push`
3. ✅ **Start application**: `npm start`
4. ✅ **Configure AI services**: See `QUICK_AI_SETUP.md`
5. ✅ **Deploy to production**: See deployment guides

---

**Your database is the foundation of MSMEBazaar. Choose the option that best fits your needs and budget!**

**Recommendations:**
- **Development**: Docker PostgreSQL
- **Production**: Neon or Supabase
- **Learning**: Local PostgreSQL
- **Enterprise**: Render or Railway