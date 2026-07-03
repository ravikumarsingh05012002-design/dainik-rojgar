# ✅ Production Deployment Checklist

Track your progress through production deployment.

---

## 📦 Pre-Deployment (Already Complete)

- [x] Backend code complete (1,842 lines)
- [x] Frontend code complete (5,998 lines)
- [x] Firebase OTP integration done
- [x] MongoDB schemas defined
- [x] Railway config files created
- [x] Environment variable templates created
- [x] TypeScript builds with zero errors
- [x] All documentation written

**Status: ✅ 100% Ready for Deployment**

---

## 🔥 Step 1: Firebase Setup (15 min)

### Create Project
- [ ] Opened https://console.firebase.google.com/
- [ ] Logged in with Google account
- [ ] Clicked "Add project"
- [ ] Named project: `dainik-rojgar`
- [ ] Disabled Google Analytics (optional)
- [ ] Project created successfully

### Enable Phone Authentication
- [ ] Navigated to Authentication section
- [ ] Clicked "Get started"
- [ ] Went to "Sign-in method" tab
- [ ] Found "Phone" provider
- [ ] Enabled Phone authentication
- [ ] Saved changes

### Create Service Account
- [ ] Went to Project Settings (⚙️ icon)
- [ ] Clicked "Service accounts" tab
- [ ] Clicked "Generate new private key"
- [ ] Downloaded JSON file
- [ ] Saved file securely (DO NOT COMMIT TO GIT)

### Extract Credentials
- [ ] Opened JSON file in text editor
- [ ] Copied `project_id` → saved in CREDENTIALS_SHEET.md
- [ ] Copied `private_key` → saved in CREDENTIALS_SHEET.md
- [ ] Copied `client_email` → saved in CREDENTIALS_SHEET.md

### Update Local .env
- [ ] Opened `backend/.env`
- [ ] Updated `FIREBASE_PROJECT_ID`
- [ ] Updated `FIREBASE_PRIVATE_KEY` (with \n escaped)
- [ ] Updated `FIREBASE_CLIENT_EMAIL`
- [ ] Saved file

**Firebase Status: [ ] Complete**

---

## 🍃 Step 2: MongoDB Atlas Setup (15 min)

### Create Account
- [ ] Opened https://www.mongodb.com/cloud/atlas
- [ ] Clicked "Try Free" or "Sign Up"
- [ ] Created account (email or Google)
- [ ] Verified email address

### Create Cluster
- [ ] Clicked "Build a Database"
- [ ] Selected "M0 FREE" tier
- [ ] Chose AWS as provider
- [ ] Selected region (ap-south-1 for India)
- [ ] Named cluster: `dainik-rojgar-cluster`
- [ ] Clicked "Create"
- [ ] Waited 1-3 minutes for cluster creation

### Create Database User
- [ ] Went to "Database Access" (Security)
- [ ] Clicked "Add New Database User"
- [ ] Username: `dainikrojgar_admin`
- [ ] Clicked "Autogenerate Secure Password"
- [ ] **COPIED PASSWORD** → saved in CREDENTIALS_SHEET.md
- [ ] Selected "Read and write to any database"
- [ ] Clicked "Add User"

### Configure Network Access
- [ ] Went to "Network Access" (Security)
- [ ] Clicked "Add IP Address"
- [ ] Clicked "Allow Access from Anywhere"
- [ ] Verified IP: `0.0.0.0/0`
- [ ] Added comment: "Railway and development"
- [ ] Clicked "Confirm"

### Get Connection String
- [ ] Went to "Database" (Deployment)
- [ ] Clicked "Connect" on cluster
- [ ] Selected "Connect your application"
- [ ] Driver: Node.js, Version: 5.5+
- [ ] Copied connection string
- [ ] Replaced `<password>` with actual password
- [ ] Added database name: `/dainik-rojgar` before `?`
- [ ] Saved full connection string in CREDENTIALS_SHEET.md

### Update Local .env
- [ ] Opened `backend/.env`
- [ ] Updated `MONGODB_URI` with full connection string
- [ ] Saved file

**MongoDB Status: [ ] Complete**

---

## 🧪 Step 3: Local Testing (10 min)

### Test Backend Locally
- [ ] Opened terminal in `backend/` folder
- [ ] Ran `npm start`
- [ ] Verified output shows:
  - [ ] ✓ Firebase initialized
  - [ ] ✓ MongoDB connected
  - [ ] ✓ Server running on port 5000

### Test Health Endpoint
- [ ] Opened browser: http://localhost:5000/api/health
- [ ] Received JSON response with status

### Test OTP Endpoint
- [ ] Used curl or Postman to POST to `/api/auth/send-otp`
- [ ] Sent phone number: `+919876543210`
- [ ] Received success response
- [ ] Checked terminal for OTP log (development mode)
- [ ] Verified OTP appears in console

### Test OTP Verification
- [ ] Used curl or Postman to POST to `/api/auth/verify-otp`
- [ ] Sent phone number and OTP from previous step
- [ ] Received JWT token in response
- [ ] Verified user created in MongoDB Atlas

**Local Testing Status: [ ] Complete**

---

## 🐙 Step 4: GitHub Setup (5 min)

### Initialize Git (if not done)
- [ ] Opened terminal in project root
- [ ] Ran `git init`
- [ ] Ran `git add .`
- [ ] Ran `git commit -m "Initial commit - production ready"`

### Create GitHub Repository
- [ ] Went to https://github.com/new
- [ ] Repository name: `dainik-rojgar`
- [ ] Visibility: Public or Private
- [ ] **Did NOT** initialize with README (already exists)
- [ ] Clicked "Create repository"

### Push to GitHub
- [ ] Copied repository URL
- [ ] Ran `git remote add origin <URL>`
- [ ] Ran `git branch -M main`
- [ ] Ran `git push -u origin main`
- [ ] Verified code appears on GitHub

**GitHub Status: [ ] Complete**

---

## 🚂 Step 5: Railway Deployment (20 min)

### Create Railway Account
- [ ] Opened https://railway.app/
- [ ] Clicked "Start a New Project" or "Login"
- [ ] Selected "Login with GitHub"
- [ ] Authorized Railway to access GitHub
- [ ] Account created successfully

### Create New Project
- [ ] Clicked "New Project"
- [ ] Selected "Deploy from GitHub repo"
- [ ] Found and selected `dainik-rojgar` repository
- [ ] Confirmed main branch
- [ ] Railway started building automatically

### Generate JWT Secret
- [ ] Opened terminal
- [ ] Ran: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Copied generated secret → saved in CREDENTIALS_SHEET.md

### Add Environment Variables
- [ ] Went to project → Variables tab
- [ ] Added all 18 variables:

**Server:**
- [ ] `NODE_ENV=production`
- [ ] `PORT=5000`

**Database:**
- [ ] `MONGODB_URI=` (from MongoDB Atlas)

**JWT:**
- [ ] `JWT_SECRET=` (generated above)
- [ ] `JWT_EXPIRES_IN=7d`

**Firebase:**
- [ ] `FIREBASE_PROJECT_ID=` (from Firebase)
- [ ] `FIREBASE_PRIVATE_KEY=` (from Firebase, with \n)
- [ ] `FIREBASE_CLIENT_EMAIL=` (from Firebase)

**CORS:**
- [ ] `ALLOWED_ORIGINS=https://your-frontend.com,exp://192.168.1.100:19000`

**OTP:**
- [ ] `OTP_RATE_LIMIT=5`
- [ ] `OTP_EXPIRY_MINUTES=10`

### Wait for Deployment
- [ ] Monitored "Deployments" tab
- [ ] Waited for "Deploy successful" (2-3 min)
- [ ] No errors in build logs

### Get Deployment URL
- [ ] Went to Settings tab
- [ ] Found "Domains" section
- [ ] Copied deployment URL
- [ ] Saved in CREDENTIALS_SHEET.md
- [ ] Example: `https://dainik-rojgar-production.up.railway.app`

**Railway Status: [ ] Complete**

---

## 📱 Step 6: Update Frontend (5 min)

### Update API URL
- [ ] Opened `frontend/src/services/api.ts`
- [ ] Found line: `const PRODUCTION_API_URL = ...`
- [ ] Replaced with actual Railway URL
- [ ] Saved file

### Test Frontend Build
- [ ] Opened terminal in `frontend/` folder
- [ ] Ran `npm start`
- [ ] Verified console shows correct API URL
- [ ] App launches without errors

**Frontend Status: [ ] Complete**

---

## 🧪 Step 7: Production Testing (10 min)

### Test Health Endpoint
- [ ] Opened browser
- [ ] Navigated to: `https://your-railway-url.up.railway.app/api/health`
- [ ] Received JSON response with status

### Test OTP Flow (Production)
- [ ] Used curl or Postman
- [ ] POST to `https://your-railway-url.up.railway.app/api/auth/send-otp`
- [ ] Sent real phone number
- [ ] Received success response
- [ ] **Note:** OTP won't actually send (needs Twilio integration)
- [ ] But should see success response and no errors

### Check Railway Logs
- [ ] Went to Railway Dashboard → Logs
- [ ] Verified:
  - [ ] ✓ Firebase initialized
  - [ ] ✓ MongoDB connected
  - [ ] ✓ Server running
  - [ ] No errors in logs

### Test from Mobile App
- [ ] Started frontend app
- [ ] Attempted OTP login
- [ ] Verified API calls reach Railway
- [ ] Checked Railway logs for requests

**Production Testing Status: [ ] Complete**

---

## 🎉 Final Verification

### Backend
- [ ] Railway deployment successful
- [ ] All environment variables set (18 total)
- [ ] Health endpoint responds
- [ ] Firebase initialized (check logs)
- [ ] MongoDB connected (check logs)
- [ ] No errors in Railway logs

### Frontend
- [ ] Production API URL updated
- [ ] App builds successfully
- [ ] API calls reach Railway backend
- [ ] No console errors

### Database
- [ ] MongoDB cluster active
- [ ] Database user created
- [ ] Network access configured
- [ ] Can connect from Railway

### Authentication
- [ ] Firebase project active
- [ ] Phone authentication enabled
- [ ] Service account credentials working
- [ ] OTP endpoints functional

**Overall Status: [ ] 🎊 PRODUCTION READY!**

---

## 📊 Deployment Summary

**Total Time Spent:** _____ minutes

**Services Deployed:**
- ✅ Backend: Railway
- ✅ Database: MongoDB Atlas (M0 Free)
- ✅ Auth: Firebase
- ✅ Code: GitHub

**Monthly Cost:** $0 (all free tiers)

**Deployment URL:** _________________________________

**Next Steps:**
- [ ] Integrate Twilio for real SMS
- [ ] Set up monitoring alerts
- [ ] Configure custom domain (optional)
- [ ] Enable database backups
- [ ] Add analytics tracking

---

**Congratulations! Your app is live! 🚀**

Share your Railway URL to start testing with real users!
