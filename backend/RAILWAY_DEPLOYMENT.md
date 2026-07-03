# Railway Deployment Guide for Dainik Rojgar Backend

## Prerequisites
- [Railway Account](https://railway.app/) (free tier available)
- GitHub account with this repository pushed
- MongoDB Atlas cluster (see MONGODB_SETUP.md)
- Firebase project with service account credentials

---

## Step 1: Create Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub
5. Select the **dainik-rojgar** repository
6. Railway will auto-detect Node.js and start deploying

---

## Step 2: Configure Environment Variables

In Railway Dashboard → Your Project → Variables tab, add:

### Required Variables

```bash
NODE_ENV=production
PORT=5000

# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/dainik-rojgar?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=your-super-secure-random-string-min-32-chars
JWT_EXPIRES_IN=7d

# Firebase SMS OTP
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com

# CORS Configuration
ALLOWED_ORIGINS=https://your-frontend-domain.com,exp://your-expo-app

# Rate Limiting
OTP_RATE_LIMIT=5
OTP_EXPIRY_MINUTES=10
```

### Important Notes:

1. **MONGODB_URI**: Get this from MongoDB Atlas (see MONGODB_SETUP.md)
2. **JWT_SECRET**: Generate a strong random string:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. **FIREBASE_PRIVATE_KEY**: 
   - Must keep the escaped newlines `\n`
   - Wrap the entire key in double quotes
   - Get from Firebase Console → Service Accounts
4. **ALLOWED_ORIGINS**: Add your production frontend URL

---

## Step 3: Configure Build Settings

Railway auto-detects settings, but verify:

1. **Build Command**: `npm install && npm run build`
2. **Start Command**: `npm start`
3. **Root Directory**: `backend` (if monorepo) or `/` (if separate repo)

---

## Step 4: Add Health Check Endpoint

Railway will use `/api/health` to monitor your service (already implemented in server.ts)

---

## Step 5: Deploy

1. Railway automatically deploys on every push to main branch
2. Monitor deployment logs in Railway Dashboard
3. Once deployed, you'll get a public URL like:
   ```
   https://dainik-rojgar-backend-production.up.railway.app
   ```

---

## Step 6: Test Deployment

### Check Health Endpoint
```bash
curl https://your-railway-url.railway.app/api/health
```

Expected response:
```json
{
  "status": "Server is running",
  "timestamp": "2026-07-03T..."
}
```

### Test OTP Endpoint
```bash
curl -X POST https://your-railway-url.railway.app/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210"}'
```

---

## Monitoring & Debugging

### View Logs
- Railway Dashboard → Your Service → Logs tab
- Real-time log streaming available

### Restart Service
- Railway Dashboard → Your Service → Settings → Restart

### Rollback Deployment
- Railway Dashboard → Deployments → Select previous deployment → Redeploy

---

## Custom Domain (Optional)

1. Railway Dashboard → Your Service → Settings
2. Click **"Add Custom Domain"**
3. Enter your domain (e.g., api.dainikrojgar.com)
4. Add CNAME record to your DNS:
   ```
   CNAME  api  your-service.up.railway.app
   ```
5. Wait for DNS propagation (~5-10 minutes)

---

## Continuous Deployment

Railway automatically redeploys when you push to GitHub:

```bash
git add .
git commit -m "Update backend"
git push origin main
```

Railway will:
1. Pull latest code
2. Run `npm install && npm run build`
3. Run `npm start`
4. Update live service with zero downtime

---

## Scaling (Paid Plans)

Railway offers:
- **Vertical Scaling**: Increase CPU/RAM
- **Horizontal Scaling**: Multiple instances
- **Auto-scaling**: Based on traffic

Configure in: Settings → Resources

---

## Security Checklist

✅ All environment variables set in Railway (not in code)  
✅ MONGODB_URI uses strong password  
✅ JWT_SECRET is random and secure  
✅ Firebase private key is properly escaped  
✅ CORS origins restricted to your domains  
✅ Rate limiting enabled for OTP endpoints  
✅ HTTPS enabled (automatic on Railway)  

---

## Cost Estimation

**Railway Free Tier:**
- $5 free credit per month
- ~500 hours of usage
- Suitable for MVP/testing

**Hobby Plan ($5/month):**
- Unlimited usage
- Better performance
- Custom domains

**Pro Plan ($20/month):**
- Priority support
- Advanced monitoring
- Team features

---

## Troubleshooting

### Deployment Fails
- Check Railway logs for errors
- Verify `package.json` has correct scripts
- Ensure all dependencies are listed

### Environment Variables Not Working
- Check variable names match exactly
- Verify Firebase private key escaping
- Restart service after adding variables

### MongoDB Connection Fails
- Verify MONGODB_URI is correct
- Check MongoDB Atlas IP whitelist (add 0.0.0.0/0 for Railway)
- Ensure database user has correct permissions

### OTP Not Sending
- Check Firebase credentials are correct
- Verify FIREBASE_PRIVATE_KEY has proper newlines
- Check Railway logs for Firebase initialization errors

---

## Next Steps

1. ✅ Deploy backend to Railway
2. Update frontend `baseURL` to Railway URL
3. Test all API endpoints in production
4. Set up monitoring alerts
5. Configure database backups

---

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- MongoDB Atlas Support: https://www.mongodb.com/cloud/atlas/support
- Firebase Support: https://firebase.google.com/support
