import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Import routes
import authRoutes from './routes/auth';
import jobRoutes from './routes/jobs';
import userRoutes from './routes/users';
import bookingRoutes from './routes/bookings';

// Import utilities
import { initializeFirebase } from './utils/firebase';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dainik-rojgar';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.warn('MongoDB connection unavailable. Continuing without a database for local development.', error);
  }
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'Server is running', timestamp: new Date() });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    status: err.status || 500,
  });
});

// Start server
const startServer = async () => {
  // Initialize Firebase for SMS OTP
  try {
    initializeFirebase();
  } catch (error) {
    console.warn('Firebase initialization failed. SMS OTP features will not work.', error);
  }

  // Connect to database
  await connectDB();
  
  app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`✓ Server running on port ${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✓ API URL: http://localhost:${PORT}`);
    console.log('='.repeat(50));
  });
};

startServer();

export default app;
