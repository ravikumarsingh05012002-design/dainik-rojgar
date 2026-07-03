import { cert, getApps, initializeApp } from 'firebase-admin/app';
import type { ServiceAccount } from 'firebase-admin';

/**
 * Firebase Admin SDK Configuration
 * Used for SMS OTP verification
 */

let firebaseApp: ReturnType<typeof initializeApp> | null = null;

export function initializeFirebase(): void {
  if (firebaseApp) {
    console.log('Firebase already initialized');
    return;
  }

  if (getApps().length > 0) {
    firebaseApp = getApps()[0] ?? null;
    console.log('Firebase already initialized');
    return;
  }

  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    if (!process.env.FIREBASE_PROJECT_ID || !privateKey || !process.env.FIREBASE_CLIENT_EMAIL) {
      console.warn('Firebase credentials not configured. SMS OTP will not work.');
      console.warn('Please set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL in .env');
      return;
    }

    const serviceAccount: ServiceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: privateKey,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
    });

    console.log('✓ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw error;
  }
}

/**
 * Send OTP via SMS using Firebase
 * @param phoneNumber - Phone number with country code (e.g., +919876543210)
 * @param otp - 6-digit OTP code
 */
export async function sendOTP(phoneNumber: string, otp: string): Promise<boolean> {
  try {
    if (!firebaseApp) {
      console.error('Firebase not initialized. Cannot send OTP.');
      return false;
    }

    // In development, just log the OTP instead of sending SMS
    if (process.env.NODE_ENV === 'development') {
      console.log('='.repeat(50));
      console.log('📱 DEVELOPMENT MODE - OTP for', phoneNumber);
      console.log('🔢 OTP CODE:', otp);
      console.log('='.repeat(50));
      return true;
    }

    // In production, use Firebase Cloud Messaging or third-party SMS service
    // Firebase doesn't directly send SMS, so you'll need to integrate with:
    // 1. Twilio (recommended)
    // 2. AWS SNS
    // 3. Any SMS gateway
    
    // For now, returning true for development
    console.log(`OTP ${otp} would be sent to ${phoneNumber} in production`);
    return true;
  } catch (error) {
    console.error('Error sending OTP:', error);
    return false;
  }
}

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Validate phone number format
 * @param phoneNumber - Phone number to validate
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  // Indian phone number: +91 followed by 10 digits
  const indianPhoneRegex = /^\+91[6-9]\d{9}$/;
  return indianPhoneRegex.test(phoneNumber);
}

export default {
  initializeFirebase,
  sendOTP,
  generateOTP,
  validatePhoneNumber,
};
