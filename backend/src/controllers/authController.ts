import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { createUser, findUserByEmail, updateUserById } from '../utils/inMemoryStore.js';
import { sendOTP as firebaseSendOTP, generateOTP, validatePhoneNumber } from '../utils/firebase.js';
import { otpStore } from '../utils/otpStore.js';
import type { AuthRequest } from '../middleware/auth.js';

interface BasicUserRecord {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  currentRole?: 'worker' | 'employer';
  workerCategory?: string | null;
  dailyRate?: number | null;
  skills?: string[];
  is_online?: boolean;
  is_available?: boolean;
}

const getAuthUserId = (req: AuthRequest): string | undefined => {
  const { user } = req;
  if (!user || typeof user === 'string') return undefined;
  if ('id' in user && typeof user.id === 'string') return user.id;
  return undefined;
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, userType, city } = req.body;
    const useMemoryStore = mongoose.connection.readyState !== 1;

    // Check if user exists
    const existingUser = useMemoryStore
      ? await findUserByEmail(email)
      : await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = useMemoryStore
      ? await createUser({
          name,
          email,
          phone,
          password: hashedPassword,
          userType,
          location: { city },
        })
      : new User({
          name,
          email,
          phone,
          password: hashedPassword,
          userType,
          location: { city },
        });

    if (!useMemoryStore && user instanceof User) {
      await user.save();
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const useMemoryStore = mongoose.connection.readyState !== 1;

    // Find user
    const user = useMemoryStore
      ? await findUserByEmail(email)
      : await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// ---------------------------------------------------------------------------
// switchRole — instant dual-role toggle (Employer ⇄ Worker)
// ---------------------------------------------------------------------------

const VALID_ROLES = new Set(['worker', 'employer']);
const VALID_CATEGORIES = new Set([
  'helper',
  'mason',
  'electrician',
  'painter',
  'plumber',
  'carpenter',
  'welder',
  'driver',
  'general',
]);

/** Extra profile fields required only when switching into the worker role */
interface WorkerProfilePayload {
  workerCategory: string;
  dailyWageRate: number;
  skills?: string[];
  is_online?: boolean;
  is_available?: boolean;
}

interface SwitchRolePayload {
  currentRole: 'worker' | 'employer';
  workerProfile?: WorkerProfilePayload;
}

interface RoleValidationError {
  field: string;
  message: string;
}

/**
 * Validates the switchRole request body.
 * workerProfile is only required (and only validated) when currentRole === 'worker'.
 */
function validateSwitchRolePayload(body: unknown): RoleValidationError[] {
  const data = body as Partial<SwitchRolePayload>;
  const errors: RoleValidationError[] = [];

  if (!data.currentRole || typeof data.currentRole !== 'string' || !VALID_ROLES.has(data.currentRole)) {
    errors.push({ field: 'currentRole', message: "Must be either 'worker' or 'employer'." });
    return errors; // Nothing else to validate without a valid role
  }

  if (data.currentRole === 'worker') {
    const wp = data.workerProfile;
    if (!wp || typeof wp !== 'object') {
      errors.push({
        field: 'workerProfile',
        message: 'Required when switching to the worker role.',
      });
      return errors;
    }

    if (!wp.workerCategory || typeof wp.workerCategory !== 'string' || wp.workerCategory.trim() === '') {
      errors.push({ field: 'workerProfile.workerCategory', message: 'Worker category is required.' });
    } else if (!VALID_CATEGORIES.has(wp.workerCategory.trim().toLowerCase())) {
      errors.push({
        field: 'workerProfile.workerCategory',
        message: `Must be one of: ${Array.from(VALID_CATEGORIES).join(', ')}.`,
      });
    }

    if (typeof wp.dailyWageRate !== 'number' || isNaN(wp.dailyWageRate) || wp.dailyWageRate <= 0) {
      errors.push({ field: 'workerProfile.dailyWageRate', message: 'Must be a positive number.' });
    }

    if (wp.skills !== undefined && !Array.isArray(wp.skills)) {
      errors.push({ field: 'workerProfile.skills', message: 'Must be an array of strings.' });
    }
  }

  return errors;
}

/**
 * PATCH /api/auth/switch-role  (requires authMiddleware)
 *
 * Flips the authenticated user's currentRole instantly based on a frontend
 * toggle event. When switching into 'worker', the caller must also supply
 * workerProfile { workerCategory, dailyWageRate, skills?, is_online?, is_available? }
 * so the specialized worker fields stay in sync.
 *
 * Body:
 *   { currentRole: 'worker' | 'employer', workerProfile?: {...} }
 *
 * Responses:
 *   200 — { message, token, user }
 *   400 — { message, errors: RoleValidationError[] }
 *   401 — { message } (missing/invalid auth token)
 *   404 — { message } (user not found)
 *   500 — { message, error }
 */
export const switchRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getAuthUserId(req as AuthRequest);
    if (!userId) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const payload = req.body as SwitchRolePayload;
    const errors = validateSwitchRolePayload(payload);
    if (errors.length > 0) {
      res.status(400).json({ message: 'Invalid role switch payload', errors });
      return;
    }

    const useMemoryStore = mongoose.connection.readyState !== 1;

    // Build the field patch shared by both storage backends
    const patch: Record<string, unknown> = { currentRole: payload.currentRole };
    if (payload.currentRole === 'worker' && payload.workerProfile) {
      patch.workerCategory = payload.workerProfile.workerCategory.trim().toLowerCase();
      patch.dailyRate = payload.workerProfile.dailyWageRate; // canonical field name on the schema
      if (payload.workerProfile.skills) patch.skills = payload.workerProfile.skills;
      patch.is_online = payload.workerProfile.is_online ?? true;
      patch.is_available = payload.workerProfile.is_available ?? true;
    } else if (payload.currentRole === 'employer') {
      // Employers are never dispatch targets — force worker status flags off
      patch.is_online = false;
      patch.is_available = false;
    }

    const updatedUser = useMemoryStore
      ? await updateUserById(userId, patch)
      : await User.findByIdAndUpdate(userId, patch, { new: true }).select('-password');

    if (!updatedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const safeUser = updatedUser as BasicUserRecord;

    // Re-sign the token so downstream requests can trust the new role without
    // an extra DB round trip (DB remains the ultimate source of truth).
    const token = jwt.sign(
      { id: safeUser._id, email: safeUser.email, currentRole: payload.currentRole },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: `Role switched to ${payload.currentRole}`,
      token,
      user: {
        id: safeUser._id,
        name: safeUser.name,
        email: safeUser.email,
        currentRole: safeUser.currentRole,
        workerCategory: safeUser.workerCategory ?? null,
        dailyRate: safeUser.dailyRate ?? null,
        skills: safeUser.skills ?? [],
        is_online: safeUser.is_online ?? false,
        is_available: safeUser.is_available ?? false,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error in switchRole:', error);
    res.status(500).json({
      message: 'Server error while switching role',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    });
  }
};

// ---------------------------------------------------------------------------
// SMS OTP Authentication - Send OTP
// ---------------------------------------------------------------------------

/**
 * Send OTP to phone number via SMS (Firebase)
 * Rate limited to prevent abuse
 */
export const sendOTPToPhone = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber } = req.body;

    // Validate phone number format
    if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
      res.status(400).json({
        message: 'Invalid phone number. Must be in format: +919876543210',
      });
      return;
    }

    // Check if OTP already exists and is still valid
    const timeRemaining = otpStore.getTimeRemaining(phoneNumber);
    if (timeRemaining && timeRemaining > 0) {
      res.status(429).json({
        message: `Please wait ${Math.ceil(timeRemaining / 60)} minutes before requesting a new OTP`,
        retryAfter: timeRemaining,
      });
      return;
    }

    // Generate 6-digit OTP
    const otp = generateOTP();

    // Store OTP in memory
    otpStore.set(phoneNumber, otp);

    // Send OTP via Firebase SMS
    const sent = await firebaseSendOTP(phoneNumber, otp);

    if (!sent) {
      otpStore.delete(phoneNumber);
      res.status(500).json({
        message: 'Failed to send OTP. Please try again.',
      });
      return;
    }

    res.status(200).json({
      message: 'OTP sent successfully',
      expiresIn: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10) * 60, // in seconds
      // In development, include OTP in response for testing
      ...(process.env.NODE_ENV === 'development' && { otp }),
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error sending OTP:', error);
    res.status(500).json({
      message: 'Server error while sending OTP',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    });
  }
};

// ---------------------------------------------------------------------------
// SMS OTP Authentication - Verify OTP
// ---------------------------------------------------------------------------

/**
 * Verify OTP and create/login user
 * Creates user if doesn't exist, logs in if exists
 */
export const verifyOTPAndLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber, otp, name } = req.body;

    // Validate inputs
    if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
      res.status(400).json({
        message: 'Invalid phone number',
      });
      return;
    }

    if (!otp || otp.length !== 6) {
      res.status(400).json({
        message: 'Invalid OTP format. Must be 6 digits.',
      });
      return;
    }

    // Verify OTP
    const verification = otpStore.verify(phoneNumber, otp);
    if (!verification.valid) {
      res.status(400).json({
        message: verification.message,
      });
      return;
    }

    const useMemoryStore = mongoose.connection.readyState !== 1;

    // Find or create user
    let user: BasicUserRecord | null = useMemoryStore
      ? null // Memory store doesn't support direct query, fallback to model
      : ((await User.findOne({ phone: phoneNumber })) as unknown as BasicUserRecord | null);

    if (!user) {
      // Create new user
      const userData = {
        name: name || `User_${phoneNumber.slice(-4)}`,
        phone: phoneNumber,
        email: `${phoneNumber.replace('+', '')}@dainikrojgar.app`, // Auto-generated email
        password: await bcrypt.hash(Math.random().toString(36), 10), // Random password (not used)
        currentRole: 'employer' as const,
        userType: 'employer' as const,
      };

      if (useMemoryStore) {
        user = (await createUser(userData)) as unknown as BasicUserRecord;
      } else {
        const createdUser = new User(userData);
        await createdUser.save();
        user = createdUser as unknown as BasicUserRecord;
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, phone: user.phone, currentRole: user.currentRole },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        currentRole: user.currentRole,
        is_online: user.is_online || false,
        is_available: user.is_available || false,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error verifying OTP:', error);
    res.status(500).json({
      message: 'Server error while verifying OTP',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    });
  }
};

