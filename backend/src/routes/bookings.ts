import express from 'express';
import {
  requestBooking,
  getWorkerPendingBookings,
  respondToBooking,
  updateBookingStatus,
  updateEmployerLiveLocation,
  getBookingNavigationPayload,
} from '../controllers/bookingController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// All booking/dispatch operations require an authenticated participant
router.post('/request', authMiddleware, requestBooking);
router.get('/worker/pending', authMiddleware, getWorkerPendingBookings);
router.patch('/:id/respond', authMiddleware, respondToBooking);
router.patch('/:id/status', authMiddleware, updateBookingStatus);
router.post('/:id/navigation', authMiddleware, updateEmployerLiveLocation);
router.get('/:id/navigation', authMiddleware, getBookingNavigationPayload);

export default router;
