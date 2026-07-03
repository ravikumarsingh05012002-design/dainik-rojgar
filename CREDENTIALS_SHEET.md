# 🔑 Credentials Collection Sheet

Use this to track all the credentials you need during setup.

---

## 📋 Firebase Credentials ✅

**Firebase Project:** dainik-rojgar-dwa

**Project ID:** dainik-rojgar-dwa

**Private Key:** (Full key stored in backend/.env)
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDpf60lg2eggUfp
[... key truncated for display - see backend/.env for full key ...]
-----END PRIVATE KEY-----
```

**Client Email:** firebase-adminsdk-fbsvc@dainik-rojgar-dwa.iam.gserviceaccount.com

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
583f10850c31833e56c9a353218f8d631e5762339ac9dac4423f742ab2ad7128
```

---

## ✅ Environment Variables for Railway

Copy these to Railway Dashboard → Variables:

```env
NODE_ENV=production
PORT=5000

# MongoDB (UPDATE with your MongoDB Atlas connection string)
MONGODB_URI=mongodb+srv://dainikrojgar_admin:YOUR_PASSWORD@cluster.mongodb.net/dainik-rojgar?retryWrites=true&w=majority

# JWT
JWT_SECRET=583f10850c31833e56c9a353218f8d631e5762339ac9dac4423f742ab2ad7128
JWT_EXPIRES_IN=7d

# Firebase
FIREBASE_PROJECT_ID=dainik-rojgar-dwa
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDpf60lg2eggUfp\ncng04hQBLy5r8os0DV1w14PXV8EdqQv/NoaX4OtsTY+UU+sKgiMU+Wr4wvuG/xMk\nz9kndBkC8Jpl4XkOfHNLMG2ZDxWfv5tUuX6B5F3iTmKsnAru/prpNb1wayI5V1zq\nSlGogXksgXsV+c2GhG9CwmD4/D5DZ60RkhjJZWYs7hqHEmrE78GCJsUPdHJTQdte\nOHVixQM4Jd3gQ/G6jrtU5Z7RktzGNcwvjc2SgxjyV23V1VYqcRq13zok8DhaF7nZ\nxB/cNA4VEmMjEM3AXFvllHB5YF8evyfQuSCYuZxyLW8sF917zhzCgMZ8nR7y7keL\nLslcTiBNAgMBAAECggEABgHI3Iwy4EgzJ2hQe1vNk/I4yYIl3qLxYnPI6oNRbofo\nzRoEAGhC5jhglzpJc63BZUq9W8T4X5K0VWAbgA5WjmLONgzE5oCBHtASIbvnnIJ7\nZoSXIpRTbf0CQNqK1XcrWRCO3ROEf+ElfMmIrEMYcPKrzfbtOKazjg4eHImwuF8n\n1+Y80IqJeq2GnM68HLf0JLx8LfCteCpw7eReE9UvYoHnEx7VqcTmmJykCx9ZojU6\nhv7UlftbyAjn2yK327zfbqmFe5gQaj+9yaDgEbSamnPWLrh6YqJVFS6jnBU3+e0H\nv6xV6Novi1EBEryTznUUH2t5KPTEYVYkU5GTtnD+gQKBgQD+Ci5mWNzTmax1XPh+\nG0FwGD7mV237v35ctdzJai8QqFKvE4QUYpvGUpJGuU6wWsOJJN1D4SlV+TCwJ/vd\nZC9BcPA1Swc9zvT+QcQe1s9pnIbEpMX8IWxQcwYEOdTWXsE1gukaXLk7rouG8Nck\nqhgjniOh4mBlVE0ARlZ7P3NSkQKBgQDrTOtVF6eLZ/tMvmUYx25qNeGoS8k1xA/a\n7MrSgfW5hGS1LGvuQf+n8vQxkE+ZNAvPnD+iKtR7s4FA3IdT9dLULWfcSvJkLPjR\n256RyXdsbxCIi0AFrzovWuln4xnzKrvLU5HVdzQ/IbBsrJPY2hRUK2jl+tFS9gKB\nnnHFdIKX/QKBgQDgTQsE8Qchifkcsxbw+Y3AtJes95szgbPHlge4ixm9QnGnBbtD\n6IEUDcn7yhgxXCJzz+nRyleeAmS71MHsi02yIU7mLzXYnAfzCwxoElCWNk9EBxyM\nbtJdAgJY7tr+4DEF122MCjy+9nFZlwLO66Repn1drSxhq5pFWNV5AuAHEQKBgC10\nKnHBpAf2CkGE9hqXS+kQh4rvOOs9+KId5ABOQp2XyayF7EOWVECpWirI6dd6il2M\nnW5CP9G1l15kO3AoqJV8P/f6MmDPnzFK75LSDFPSEKuP2so+U0sakMQUxsqGkshw\nWFeYM2uOonobzGOznQG1cQocLZuNEmbfqLKwExoxAoGAR7IrcVY7prsB/OA62mrL\nVtmObGOcjs/Yb7EVR0F553hYfUGpvoxJm9x77zW7ezif1IUvPGmdtJoriLK69PV2\nMTk9ZxWKMcf4SlbP+oqBhdG4874W6SFzolkyf+JmOgQtPJDe21oAjUdt6qw/dDSz\n53puYGUlaNZKiMKxpxiCov4=\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@dainik-rojgar-dwa.iam.gserviceaccount.com

# CORS (UPDATE with your frontend URL after deployment)
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
