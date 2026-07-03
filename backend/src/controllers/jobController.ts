import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Job from '../models/Job.js';
import { applyToJob, createJob as createMemoryJob, findJobById, findJobs, incrementJobViews } from '../utils/inMemoryStore.js';

// TypeScript Interfaces
interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

interface CreateJobRequirementPayload {
  employerId: string;
  workerCategory: string;
  requiredWorkersCount: number;
  dailyWageRate: number;
  jobDescription: string;
  geoCoordinates: GeoCoordinates;
  location?: {
    city?: string;
    address?: string;
  };
  skills?: string[];
  urgency?: 'low' | 'medium' | 'high';
  estimatedDays?: number;
}

interface ValidationError {
  field: string;
  message: string;
}

// Validation helper function
const validateJobRequirement = (payload: any): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!payload.employerId || typeof payload.employerId !== 'string' || payload.employerId.trim() === '') {
    errors.push({ field: 'employerId', message: 'Valid employer ID is required' });
  }

  if (!payload.workerCategory || typeof payload.workerCategory !== 'string' || payload.workerCategory.trim() === '') {
    errors.push({ field: 'workerCategory', message: 'Worker category is required (e.g., mason, painter, helper)' });
  }

  if (!Number.isInteger(payload.requiredWorkersCount) || payload.requiredWorkersCount <= 0) {
    errors.push({ field: 'requiredWorkersCount', message: 'Required workers count must be a positive integer' });
  }

  if (typeof payload.dailyWageRate !== 'number' || payload.dailyWageRate <= 0) {
    errors.push({ field: 'dailyWageRate', message: 'Daily wage rate must be a positive number' });
  }

  if (!payload.jobDescription || typeof payload.jobDescription !== 'string' || payload.jobDescription.trim().length < 10) {
    errors.push({ field: 'jobDescription', message: 'Job description is required and must be at least 10 characters' });
  }

  if (!payload.geoCoordinates || typeof payload.geoCoordinates !== 'object') {
    errors.push({ field: 'geoCoordinates', message: 'Geo coordinates object is required' });
  } else {
    const { latitude, longitude } = payload.geoCoordinates;
    if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
      errors.push({ field: 'geoCoordinates.latitude', message: 'Latitude must be a number between -90 and 90' });
    }
    if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
      errors.push({ field: 'geoCoordinates.longitude', message: 'Longitude must be a number between -180 and 180' });
    }
  }

  if (payload.urgency && !['low', 'medium', 'high'].includes(payload.urgency)) {
    errors.push({ field: 'urgency', message: 'Urgency must be one of: low, medium, high' });
  }

  if (payload.estimatedDays && (!Number.isInteger(payload.estimatedDays) || payload.estimatedDays <= 0)) {
    errors.push({ field: 'estimatedDays', message: 'Estimated days must be a positive integer' });
  }

  return errors;
};


export const getJobs = async (req: Request, res: Response) => {
  try {
    const { city, category, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const useMemoryStore = mongoose.connection.readyState !== 1;

    const filter: any = { status: 'open' };
    if (city) filter['location.city'] = city;
    if (category) filter.category = category;

    const jobs = useMemoryStore
      ? (await findJobs(filter)).slice(skip, skip + Number(limit)).sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
      : await Job.find(filter)
          .populate('employer', 'name profilePicture ratings')
          .skip(skip)
          .limit(Number(limit))
          .sort({ createdAt: -1 });

    const total = useMemoryStore
      ? (await findJobs(filter)).length
      : await Job.countDocuments(filter);

    res.json({
      jobs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getJobById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const useMemoryStore = mongoose.connection.readyState !== 1;

    const job = useMemoryStore
      ? await incrementJobViews(id)
      : await Job.findByIdAndUpdate(
          id,
          { $inc: { views: 1 } },
          { new: true }
        ).populate('employer', 'name profilePicture ratings description');

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const createJob = async (req: Request, res: Response) => {
  try {
    const { title, description, category, payRate, location, startDate, endDate, duration } = req.body;
    const userId = (req as any).user?.id;
    const useMemoryStore = mongoose.connection.readyState !== 1;

    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const job = useMemoryStore
      ? await createMemoryJob({
          title,
          description,
          category,
          payRate,
          currency: 'INR',
          location,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          duration,
          employer: userId,
        })
      : new Job({
          title,
          description,
          category,
          payRate,
          location,
          startDate,
          endDate,
          duration,
          employer: userId,
        });

    if (!useMemoryStore) {
      await (job as any).save();
    }
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const applyJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const useMemoryStore = mongoose.connection.readyState !== 1;

    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const job = useMemoryStore
      ? await applyToJob(id, userId)
      : await Job.findByIdAndUpdate(
          id,
          { $addToSet: { applicants: userId } },
          { new: true }
        );

    res.json({ message: 'Applied successfully', job });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

/**
 * Create a dynamic job requirement posted by an Employer (Malik)
 * Validates employer credentials, worker category, count, wage, and location
 * Stores job requirement in database or memory store
 *
 * @param {Request} req - Express request with employer job details in body
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with job ID and details or validation errors
 */
export const createJobRequirement = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract payload from request body
    const payload: CreateJobRequirementPayload = req.body;

    // Validate all required fields
    const validationErrors = validateJobRequirement(payload);
    if (validationErrors.length > 0) {
      res.status(400).json({
        message: 'Validation failed',
        errors: validationErrors,
      });
      return;
    }

    // Determine if using memory store or MongoDB
    const useMemoryStore = mongoose.connection.readyState !== 1;

    // Prepare job requirement document
    const jobRequirementData = {
      title: `${payload.requiredWorkersCount} ${payload.workerCategory}(s) needed`,
      description: payload.jobDescription,
      category: payload.workerCategory,
      payRate: payload.dailyWageRate,
      currency: 'INR',
      location: {
        city: payload.location?.city || 'Unknown',
        address: payload.location?.address || 'Not provided',
        coordinates: {
          type: 'Point',
          coordinates: [payload.geoCoordinates.longitude, payload.geoCoordinates.latitude],
        },
      },
      requiredCount: payload.requiredWorkersCount,
      employer: payload.employerId,
      skills: payload.skills || [],
      urgency: payload.urgency || 'medium',
      estimatedDays: payload.estimatedDays || 1,
      status: 'open' as const,
      applicants: [],
      views: 0,
      startDate: new Date(),
      endDate: new Date(Date.now() + (payload.estimatedDays || 1) * 24 * 60 * 60 * 1000),
      duration: String(payload.estimatedDays || 1),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let createdJob;

    if (useMemoryStore) {
      // Use in-memory store (for development without MongoDB)
      createdJob = await createMemoryJob(jobRequirementData);
    } else {
      // Use MongoDB
      createdJob = new Job(jobRequirementData);
      await (createdJob as any).save();
    }

    // Return success response with job details
    res.status(201).json({
      message: 'Job requirement posted successfully',
      job: {
        id: (createdJob as any)._id,
        title: createdJob.title,
        category: createdJob.category,
        requiredWorkers: payload.requiredWorkersCount,
        dailyWageRate: payload.dailyWageRate,
        currency: 'INR',
        location: {
          city: jobRequirementData.location.city,
          coordinates: {
            latitude: payload.geoCoordinates.latitude,
            longitude: payload.geoCoordinates.longitude,
          },
        },
        urgency: jobRequirementData.urgency,
        estimatedDays: jobRequirementData.estimatedDays,
        status: 'open',
        employerId: payload.employerId,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    // Log error for debugging
    console.error('Error creating job requirement:', error);

    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      res.status(400).json({
        message: 'Validation error',
        error: error.message,
      });
      return;
    }

    if (error.name === 'CastError') {
      res.status(400).json({
        message: 'Invalid employer ID format',
        error: error.message,
      });
      return;
    }

    // Generic server error
    res.status(500).json({
      message: 'Server error while creating job requirement',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

