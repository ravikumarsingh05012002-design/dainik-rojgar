import express from 'express';
import { getJobs, getJobById, createJob, applyJob, createJobRequirement } from '../controllers/jobController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.get('/', getJobs);
router.get('/:id', getJobById);
router.post('/', authMiddleware, createJob);
router.post('/requirements', authMiddleware, createJobRequirement);
router.post('/:id/apply', authMiddleware, applyJob);

export default router;

