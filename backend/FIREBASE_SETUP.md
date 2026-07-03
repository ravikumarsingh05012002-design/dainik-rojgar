# Firebase Setup Guide for SMS OTP Authentication

Complete guide to configure Firebase for sending OTP via SMS in Dainik Rojgar application.

---

## Prerequisites

- Google account
- Firebase project (free tier available)
- Credit card (required for SMS, but won't be charged on free tier with reasonable usage)

---

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Project name: `dainik-rojgar` or `dainik-rojgar-prod`
4. Click **"Continue"**
5. **Google Analytics**:
   - Toggle OFF (not needed for SMS)
   - Or keep ON for usage analytics
6. Click **"Create project"**
7. Wait for project creation (~30 seconds)
8. Click **"Continue"**

---

## Step 2: Enable Authentication

1. In Firebase Console → Left sidebar → **Build** → **Authentication**
2. Click **"Get started"**
3. Go to **"Sign-in method"** tab
4. Enable **"Phone"** provider:
   - Click on "Phone"
   - Toggle **"Enable"**
   - Click **"Save"**

---

## Step 3: Set Up Service Account (for Backend)

1. In Firebase Console → Click ⚙️ (Settings) → **"Project settings"**
2. Go to **"Service accounts"** tab
3. Click **"Generate new private key"**
4. Confirm by clicking **"Generate key"**
5. A JSON file will download: `dainik-rojgar-firebase-adminsdk-xxxxx.json`

⚠️ **Important**: Keep this file secure! Never commit to GitHub!

---

## Step 4: Extract Credentials from JSON

Open the downloaded JSON file. You'll see:

```json
{
  "type": "service_account",
  "project_id": "dainik-rojgar",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBg...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-abc123@dainik-rojgar.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

**Extract these 3 values:**

1. `project_id` → Use for `FIREBASE_PROJECT_ID`
2. `private_key` → Use for `FIREBASE_PRIVATE_KEY` (keep the `\n` escaped)
3. `client_email` → Use for `FIREBASE_CLIENT_EMAIL`

---

## Step 5: Configure Environment Variables

### For Local Development (.env)

```env
FIREBASE_PROJECT_ID=dainik-rojgar
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBg...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc123@dainik-rojgar.iam.gserviceaccount.com
```

⚠️ **Important Notes**:

- Keep the `\n` in the private key (they represent newlines)
- Wrap FIREBASE_PRIVATE_KEY in double quotes
- Don't add extra spaces or newlines

### For Production (Railway)

Add the same variables in Railway Dashboard → Environment Variables

---

## Step 6: Enable Cloud Functions (Optional, for actual SMS)

Firebase Admin SDK alone cannot send SMS. You need:

### Option A: Use Twilio (Recommended)

1. Create [Twilio account](https://www.twilio.com/try-twilio)
2. Get phone number
3. Install Twilio SDK:

   ```bash
   npm install twilio
   ```

4. Update `backend/src/utils/firebase.ts` to use Twilio

### Option B: Use Firebase Extensions

1. Firebase Console → Extensions
2. Install **"Trigger Email from Firestore"** (for email OTP)
3. Or use third-party SMS gateway

### Option C: Development Mode (Current)

- OTP is logged to console
- No actual SMS sent
- Perfect for testing

---

## Step 7: Update firebase.ts for Twilio (Optional)

If using Twilio for actual SMS:

```typescript
import twilio from "twilio";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

export async function sendOTP(
  phoneNumber: string,
  otp: string,
): Promise<boolean> {
  try {
    if (process.env.NODE_ENV === "development") {
      console.log(`OTP for ${phoneNumber}: ${otp}`);
      return true;
    }

    await twilioClient.messages.create({
      body: `Your Dainik Rojgar OTP is: ${otp}. Valid for 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    return true;
  } catch (error) {
    console.error("Error sending SMS:", error);
    return false;
  }
}
```

Add to .env:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

---

## Step 8: Test Firebase Integration

### Start Backend

```bash
cd backend
npm start
```

### Check Logs

```
✓ Firebase Admin SDK initialized successfully
```

### Test Send OTP

```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210"}'
```

### Expected Response (Development)

```json
{
  "message": "OTP sent successfully",
  "expiresIn": 600,
  "otp": "123456"
}
```

### Check Console Logs

```
==================================================
📱 DEVELOPMENT MODE - OTP for +919876543210
🔢 OTP CODE: 123456
==================================================
```

---

## Step 9: Production Deployment

### Railway

1. Add Firebase variables to Railway Environment Variables
2. Set `NODE_ENV=production` (OTP won't be logged)
3. Deploy backend
4. Test with actual phone number

---

## Security Best Practices

✅ **Never commit** service account JSON to GitHub  
✅ **Add to .gitignore**: `*.json` for service accounts  
✅ **Use environment variables** for all credentials  
✅ **Rotate keys** every 90 days  
✅ **Enable App Check** for frontend (prevents API abuse)  
✅ **Set up rate limiting** (already implemented in authController)  
✅ **Monitor usage** in Firebase Console

---

## Rate Limiting Configuration

Already implemented in `authController.ts`:

- **Max OTP requests**: 5 per phone number per hour
- **OTP expiry**: 10 minutes
- **Max verification attempts**: 3 per OTP

Configure in `.env`:

```env
OTP_RATE_LIMIT=5
OTP_EXPIRY_MINUTES=10
```

---

## Cost Estimation

### Firebase Free Tier (Spark Plan)

- ✅ Authentication: Unlimited
- ✅ Firestore reads: 50,000/day
- ✅ Storage: 1 GB
- ⚠️ **SMS not included** - Need third-party service

### Twilio Costs (for actual SMS)

- Trial: $15 credit (200+ SMS)
- Production: $0.0075 per SMS (Indian numbers)
- Example: 1000 OTPs/month = ~$7.50

### Recommended Budget

- Development: $0 (use console logging)
- MVP (< 100 users): $5-10/month (Twilio trial)
- Production (1000+ users): $20-50/month (Twilio paid)

---

## Troubleshooting

### Firebase Initialization Failed

**Error**: `Failed to initialize Firebase`

- ✅ Check FIREBASE_PROJECT_ID is correct
- ✅ Verify FIREBASE_PRIVATE_KEY has `\n` escaped
- ✅ Ensure FIREBASE_CLIENT_EMAIL matches service account

### Invalid Private Key

**Error**: `Error parsing private key`

- ✅ Wrap private key in double quotes
- ✅ Keep `\n` in the key (don't replace with actual newlines in .env)
- ✅ Verify no extra spaces before/after

### OTP Not Sending (Production)

**Current Setup**: Logs to console only

- ✅ Integrate Twilio or SMS gateway
- ✅ Update `sendOTP()` function in firebase.ts
- ✅ Add SMS provider credentials to .env

### Authentication Errors

**Error**: `Authentication failed`

- ✅ Regenerate service account key
- ✅ Verify project_id matches Firebase project
- ✅ Check client_email is from correct project

---

## Alternative SMS Providers

### Twilio (Recommended)

- ✅ Reliable global coverage
- ✅ Simple API
- ✅ Good documentation
- Cost: $0.0075/SMS (India)

### AWS SNS

- ✅ Pay-as-you-go
- ✅ Integrated with AWS services
- Cost: $0.00645/SMS (India)

### MessageBird

- ✅ European alternative
- ✅ Number verification included
- Cost: Similar to Twilio

### Kaleyra (India-specific)

- ✅ Local Indian provider
- ✅ Better pricing for India
- Cost: ₹0.15-0.25/SMS

---

## Testing Checklist

- [ ] Firebase project created
- [ ] Phone authentication enabled
- [ ] Service account JSON downloaded
- [ ] Environment variables configured
- [ ] Backend starts without errors
- [ ] `send-otp` endpoint works
- [ ] OTP appears in console (dev mode)
- [ ] `verify-otp` endpoint validates correctly
- [ ] Rate limiting prevents spam
- [ ] OTP expires after 10 minutes
- [ ] Failed attempts are tracked

---

## Next Steps

1. ✅ Set up Firebase project
2. ✅ Configure environment variables
3. ✅ Test in development mode
4. Choose SMS provider (Twilio recommended)
5. Integrate SMS provider
6. Test with real phone numbers
7. Deploy to production
8. Monitor usage and costs

---

## Development vs Production

### Development Mode (Current)

```typescript
if (process.env.NODE_ENV === "development") {
  console.log("OTP:", otp); // Logs to console
  return true;
}
```

### Production Mode (With Twilio)

```typescript
if (process.env.NODE_ENV === "production") {
  await twilioClient.messages.create({
    body: `Your OTP: ${otp}`,
    to: phoneNumber,
    from: twilioPhoneNumber,
  });
}
```

---

## Support Resources

- **Firebase Docs**: <https://firebase.google.com/docs/auth>
- **Firebase Console**: <https://console.firebase.google.com>
- **Twilio Docs**: <https://www.twilio.com/docs/sms>
- **Stack Overflow**: `[firebase-authentication]` tag

---

**Firebase Setup Complete!** You can now send OTPs (logged to console in dev mode). 🎉

For production SMS, integrate Twilio or another SMS provider following the optional steps above.
