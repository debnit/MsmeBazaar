# 🔧 Supabase Connection Fix

## 🎯 **Current Issue**
We're getting "Tenant or user not found" which means we need the exact connection string from your Supabase dashboard.

## 📋 **Your Project Details**
- **Password**: `8RsNtK68wgKbXq4h` ✅
- **Project ID**: `wqgdrpiicynzclvathgo` ✅
- **Issue**: Need correct connection string format

## 🔗 **Get the Correct Connection String**

### **Step 1: Go to Your Supabase Dashboard**
1. Open your browser
2. Go to [supabase.com](https://supabase.com/)
3. Sign in to your account
4. Select your **MSMEBazaar** project

### **Step 2: Get Connection String**
1. Click **Settings** (gear icon in left sidebar)
2. Click **Database** 
3. Scroll down to **Connection string** section
4. Click **URI** tab (not Session mode)
5. **Copy the complete string**

### **Step 3: What to Look For**
Your connection string should be one of these formats:

**Format 1 (Pooled - Recommended):**
```
postgresql://postgres.wqgdrpiicynzclvathgo:8RsNtK68wgKbXq4h@aws-0-[region].pooler.supabase.com:6543/postgres
```

**Format 2 (Direct):**
```
postgresql://postgres:8RsNtK68wgKbXq4h@db.wqgdrpiicynzclvathgo.supabase.co:5432/postgres
```

**Format 3 (With SSL):**
```
postgresql://postgres:8RsNtK68wgKbXq4h@db.wqgdrpiicynzclvathgo.supabase.co:5432/postgres?sslmode=require
```

### **Step 4: Update Your Configuration**
Once you have the exact string, run:

```bash
# Option A: Use our setup script
npm run setup:db
# Choose Supabase and paste your string

# Option B: Manual update
# Edit .env file and replace DATABASE_URL with your exact string
```

### **Step 5: Test Connection**
```bash
npm run test:db
```

## 🎯 **Expected Success Output**
```
✅ Database connection successful (67ms)
✅ PostgreSQL version: PostgreSQL 15.1
✅ Database info:
   Database: postgres
   User: postgres
   Server: [your-supabase-host]
✅ Database permissions: CREATE, INSERT, SELECT, DROP
✅ Query performance: 23ms
🎉 Database is ready for MSMEBazaar!
```

## 🚨 **Common Issues & Solutions**

### **"Tenant or user not found"**
- ✅ **We got this** - means wrong connection format
- **Fix**: Get exact string from Supabase dashboard

### **"Connection refused" or "Network unreachable"**
- Check internet connection
- Try different connection format (pooled vs direct)
- Verify region in connection string

### **"Authentication failed"**
- Verify password is exactly: `8RsNtK68wgKbXq4h`
- Check for extra spaces in connection string

## 💡 **Pro Tips**

### **Connection String Checklist:**
- [ ] Contains your password: `8RsNtK68wgKbXq4h`
- [ ] Contains your project ID: `wqgdrpiicynzclvathgo`
- [ ] Copied from Supabase dashboard (not manually typed)
- [ ] No extra spaces or line breaks
- [ ] Complete string from start to end

### **If Still Having Issues:**
1. Try the **Session mode** connection string instead of URI
2. Check if your Supabase project is fully initialized (wait 5 minutes)
3. Verify your internet connection can reach Supabase
4. Try from a different network if possible

## 🔄 **Quick Fix Steps**

1. **Go to Supabase Dashboard** → Your Project
2. **Settings** → **Database** 
3. **Connection string** → **URI** tab
4. **Copy the complete string**
5. **Run**: `npm run setup:db` → Choose Supabase → Paste string
6. **Test**: `npm run test:db`

---

## 🎯 **We're Very Close!**

The connection is working (we're reaching Supabase), we just need the exact connection string format from your dashboard. Once we get that, your MSMEBazaar database will be fully operational! 🚀