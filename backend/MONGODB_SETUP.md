# MongoDB Atlas Setup Guide for Dainik Rojgar

Complete step-by-step guide to set up MongoDB Atlas cloud database for production.

---

## Prerequisites

- MongoDB Atlas account (free tier available)
- Email address for account creation

---

## Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Click **"Try Free"** or **"Sign Up"**
3. Create account with:
   - Email and password, OR
   - Google/GitHub SSO
4. Verify your email address

---

## Step 2: Create a New Cluster

### For Free Tier (M0 - Recommended for MVP)

1. After login, click **"Build a Database"**
2. Select **"M0 FREE"** cluster tier
3. Choose cloud provider and region:
   - **Provider**: AWS (recommended)
   - **Region**: Select closest to your users
     - For India: `ap-south-1` (Mumbai)
     - For global: `us-east-1` (N. Virginia)
4. Cluster name: `dainik-rojgar-cluster`
5. Click **"Create"**

⏱️ Cluster creation takes 1-3 minutes

---

## Step 3: Create Database User

1. Go to **Database Access** (left sidebar → Security)
2. Click **"Add New Database User"**
3. Configure user:
   - **Authentication Method**: Password
   - **Username**: `dainikrojgar_admin`
   - **Password**: Click "Autogenerate Secure Password" (save this!)
   - **Database User Privileges**:
     - Select **"Read and write to any database"**
4. Click **"Add User"**

⚠️ **Important**: Copy and save the password securely. You'll need it for connection string.

---

## Step 4: Configure Network Access

### For Development (Allow All IPs)

1. Go to **Network Access** (left sidebar → Security)
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"**
4. IP Address: `0.0.0.0/0`
5. Comment: `Allow all (for Railway/development)`
6. Click **"Confirm"**

### For Production (Recommended)

Add specific IPs:

- Railway IPs (Railway provides dynamic IPs, so use 0.0.0.0/0)
- Your office/home IP for testing

---

## Step 5: Get Connection String

1. Go to **Database** (left sidebar → Deployment)
2. Click **"Connect"** on your cluster
3. Select **"Connect your application"**
4. Driver: **Node.js**
5. Version: **5.5 or later**
6. Copy the connection string:

   ```
   mongodb+srv://dainikrojgar_admin:<password>@dainik-rojgar-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

---

## Step 6: Configure Connection String

Replace placeholders in the connection string:

### Original

```
mongodb+srv://dainikrojgar_admin:<password>@dainik-rojgar-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### Updated

```
mongodb+srv://dainikrojgar_admin:YOUR_ACTUAL_PASSWORD@dainik-rojgar-cluster.xxxxx.mongodb.net/dainik-rojgar?retryWrites=true&w=majority
```

**Changes made:**

1. Replace `<password>` with your actual password
2. Add database name `/dainik-rojgar` before `?`
3. Keep `retryWrites=true&w=majority`

---

## Step 7: Create Database and Collections

### Option A: Automatic (Recommended)

Your application will automatically create:

- Database: `dainik-rojgar`
- Collections: `users`, `jobs`, `bookings`

### Option B: Manual Setup

1. Go to **Database** → **Browse Collections**
2. Click **"Create Database"**
3. Database name: `dainik-rojgar`
4. Collection name: `users`
5. Click **"Create"**
6. Repeat for `jobs` and `bookings` collections

---

## Step 8: Create Indexes for Performance

In MongoDB Atlas → Browse Collections → Select collection → Indexes:

### Users Collection Indexes

```javascript
// 1. Phone number (unique)
{ "phone": 1 }, { unique: true }

// 2. Email (unique)
{ "email": 1 }, { unique: true }

// 3. Geospatial index for location-based queries
{ "currentLocation": "2dsphere" }

// 4. Worker category (for filtering)
{ "workerCategory": 1, "is_online": 1, "is_available": 1 }
```

### Jobs Collection Indexes

```javascript
// 1. Location-based search
{ "location": "2dsphere" }

// 2. Status and category filtering
{ "status": 1, "category": 1 }

// 3. Employer lookup
{ "employerId": 1, "status": 1 }
```

### Bookings Collection Indexes

```javascript
// 1. Worker ID lookup
{ "workerId": 1, "status": 1 }

// 2. Employer ID lookup
{ "employerId": 1, "status": 1 }

// 3. Status filtering
{ "status": 1, "createdAt": -1 }
```

---

## Step 9: Test Connection

### From Local Development

1. Update `backend/.env`:

   ```env
   MONGODB_URI=mongodb+srv://dainikrojgar_admin:YOUR_PASSWORD@dainik-rojgar-cluster.xxxxx.mongodb.net/dainik-rojgar?retryWrites=true&w=majority
   ```

2. Start backend:

   ```bash
   cd backend
   npm start
   ```

3. Check logs for:

   ```
   ✓ MongoDB connected successfully
   ```

### Test Query

```bash
curl http://localhost:5000/api/health
```

---

## Step 10: Configure for Production (Railway)

In Railway Dashboard → Environment Variables:

```env
MONGODB_URI=mongodb+srv://dainikrojgar_admin:YOUR_PASSWORD@dainik-rojgar-cluster.xxxxx.mongodb.net/dainik-rojgar?retryWrites=true&w=majority
```

⚠️ **Security Note**: Never commit this connection string to GitHub!

---

## Data Backup & Recovery

### Automatic Backups (Paid Tiers Only)

- M10+ clusters include automated backups
- Point-in-time recovery available

### Manual Export (Free Tier)

```bash
# Using MongoDB Compass (GUI)
1. Download MongoDB Compass
2. Connect using connection string
3. Export collections to JSON/CSV

# Using mongodump (CLI)
mongodump --uri="mongodb+srv://..." --out=./backup
```

---

## Monitoring & Alerts

### Set Up Alerts

1. Go to **Alerts** (left sidebar)
2. Click **"Create Alert"**
3. Configure alerts for:
   - High connection count
   - High CPU usage
   - Low disk space
   - Query performance issues

### Monitor Performance

1. Go to **Metrics** (left sidebar → Deployment)
2. View:
   - Operations per second
   - Connections
   - Network traffic
   - Query performance

---

## Free Tier Limitations

**M0 (Free) Cluster:**

- ✅ 512 MB storage
- ✅ Shared CPU
- ✅ Shared RAM
- ✅ Suitable for 1000+ users
- ⚠️ No automated backups
- ⚠️ No auto-scaling

**When to Upgrade:**

- Storage > 400 MB
- Consistent high traffic
- Need guaranteed performance
- Production critical application

**Upgrade Path:**

- **M10** ($0.08/hour = ~$60/month): 10GB storage, dedicated CPU
- **M20** ($0.20/hour = ~$150/month): 20GB storage, better performance

---

## Security Best Practices

✅ **Strong Password**: Use generated password (32+ characters)  
✅ **IP Whitelist**: Restrict to known IPs when possible  
✅ **Least Privilege**: Database users have minimum required permissions  
✅ **Encryption**: Automatic at-rest and in-transit encryption  
✅ **Audit Logs**: Enable in Security → Advanced Settings  
✅ **Regular Updates**: Keep MongoDB driver updated  

---

## Troubleshooting

### Connection Failed

**Error**: `MongoNetworkError: failed to connect`

- ✅ Check Network Access whitelist includes your IP
- ✅ Verify password has no special characters (URL encode if needed)
- ✅ Ensure connection string has database name

### Authentication Failed

**Error**: `MongoServerError: Authentication failed`

- ✅ Verify username is correct
- ✅ Check password (no extra spaces)
- ✅ Ensure user has database access permissions

### Slow Queries

- ✅ Create indexes for frequently queried fields
- ✅ Use MongoDB Atlas Performance Advisor
- ✅ Review query patterns in Metrics

### Out of Storage (Free Tier)

- ✅ Delete old test data
- ✅ Optimize document structure
- ✅ Consider upgrading to M10

---

## Cost Optimization Tips

1. **Use Free Tier** for MVP testing
2. **Clean up test data** regularly
3. **Create proper indexes** to reduce query load
4. **Monitor usage** in Atlas Dashboard
5. **Upgrade only when needed** (500+ active users)

---

## Migration from Local to Atlas

```bash
# 1. Export from local MongoDB
mongodump --uri="mongodb://localhost:27017/dainik-rojgar" --out=./local-backup

# 2. Import to Atlas
mongorestore --uri="mongodb+srv://username:password@cluster.mongodb.net/dainik-rojgar" ./local-backup/dainik-rojgar
```

---

## Next Steps

1. ✅ Set up MongoDB Atlas cluster
2. ✅ Create database user
3. ✅ Whitelist IPs (0.0.0.0/0 for Railway)
4. ✅ Get connection string
5. ✅ Test local connection
6. ✅ Add to Railway environment variables
7. ✅ Deploy and verify production connection
8. Create indexes for performance
9. Set up monitoring alerts
10. Configure backup strategy

---

## Support Resources

- **MongoDB University**: Free courses - <https://university.mongodb.com>
- **Documentation**: <https://docs.atlas.mongodb.com>
- **Community Forums**: <https://community.mongodb.com>
- **Support Tickets**: Available for paid tiers

---

## Connection String Examples

### Development (Local)

```env
MONGODB_URI=mongodb://localhost:27017/dainik-rojgar
```

### Production (Atlas)

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dainik-rojgar?retryWrites=true&w=majority
```

### With Special Characters in Password

```env
# If password is: P@ss#w0rd!
# URL encode: P%40ss%23w0rd%21
MONGODB_URI=mongodb+srv://username:P%40ss%23w0rd%21@cluster.mongodb.net/dainik-rojgar
```

---

**Setup Complete!** Your MongoDB Atlas database is ready for production use. 🎉
