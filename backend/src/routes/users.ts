import express from 'express';
import {
  getProfile,
  updateProfile,
  getNearbyAvailableWorkers,
  searchAndFilterWorkers,
  getNearestAvailableWorkers,
} from '../controllers/userController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Public — no auth required; anyone can search and browse workers
router.get('/search', searchAndFilterWorkers);
router.get('/nearby', getNearbyAvailableWorkers);
// Public — instant-dispatch discovery for the Employer's "Hire Now" flow
router.get('/nearest-available', getNearestAvailableWorkers);

router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);

export default router;
