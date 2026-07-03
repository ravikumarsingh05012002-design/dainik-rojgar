import express from 'express';
import { signup, login, switchRole, sendOTPToPhone, verifyOTPAndLogin } from '../controllers/authController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Traditional email/password auth
router.post('/signup', signup);
router.post('/login', login);

// OTP-based phone authentication
router.post('/send-otp', sendOTPToPhone);
router.post('/verify-otp', verifyOTPAndLogin);

// Role switching (requires authentication)
router.patch('/switch-role', authMiddleware, switchRole);

export default router;

