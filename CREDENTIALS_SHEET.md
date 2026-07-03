# 🔑 Credentials Collection Sheet

Use this to track all the credentials you need during setup.

---

## 📋 Firebase Credentials

**Firebase Project:** _________________________

**Project ID:** _________________________

**Private Key:** (Copy from JSON file)
```
-----BEGIN PRIVATE KEY-----
_____________________________________
_____________________________________
-----END PRIVATE KEY-----
```

**Client Email:** _________________________@_____.iam.gserviceaccount.com

---

## 🍃 MongoDB Atlas Credentials

**Cluster Name:** dainik-rojgar-cluster

**Username:** dainikrojgar_admin

**Password:** _________________________ (SAVE THIS!)

**Connection String:**
```
mongodb+srv://dainikrojgar_admin:YOUR_PASSWORD@cluster.mongodb.net/dainik-rojgar?retryWrites=true&w=majority
```

**Full Connection String (filled):**
```
_____________________________________________________________________
```

---

## 🚂 Railway Credentials

**Project Name:** _________________________

**Deployment URL:** 
```
https://_________________________.up.railway.app
```

**JWT Secret (generate with command):**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Generated JWT Secret:**
```
_____________________________________________________________________
```

---

## ✅ Environment Variables for Railway

Copy these to Railway Dashboard → Variables:

```env
NODE_ENV=production
PORT=5000

# MongoDB
MONGODB_URI=mongodb+srv://dainikrojgar_admin:YOUR_PASSWORD@cluster.mongodb.net/dainik-rojgar?retryWrites=true&w=majority

# JWT
JWT_SECRET=your-generated-secret-here
JWT_EXPIRES_IN=7d

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# CORS
ALLOWED_ORIGINS=https://your-frontend-domain.com,exp://192.168.1.100:19000

# OTP
OTP_RATE_LIMIT=5
OTP_EXPIRY_MINUTES=10
```

---

## 📝 Setup Checklist

- [ ] Firebase project created
- [ ] Firebase Phone auth enabled
- [ ] Firebase service account JSON downloaded
- [ ] Firebase credentials extracted
- [ ] MongoDB Atlas account created
- [ ] MongoDB cluster created (M0 free)
- [ ] MongoDB user created
- [ ] MongoDB network access configured (0.0.0.0/0)
- [ ] MongoDB connection string copied
- [ ] Code pushed to GitHub
- [ ] Railway account created
- [ ] Railway project created from GitHub
- [ ] Railway environment variables added (18 total)
- [ ] Railway deployed successfully
- [ ] Railway URL obtained
- [ ] Frontend API URL updated
- [ ] Local testing done
- [ ] Production testing done

---

**Print this page and fill in as you complete each setup step!**
