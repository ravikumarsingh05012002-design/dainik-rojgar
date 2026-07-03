import mongoose, { Schema, Document } from 'mongoose';

export interface IJob extends Document {
  title: string;
  description: string;
  employer: mongoose.Schema.Types.ObjectId;
  category: string;
  payRate: number;
  currency: string;
  location: {
    latitude: number;
    longitude: number;
    city: string;
    address: string;
  };
  startDate: Date;
  endDate: Date;
  duration: string; // e.g., "hourly", "daily", "weekly"
  requiredSkills?: string[];
  applicants: mongoose.Schema.Types.ObjectId[];
  status: 'open' | 'closed' | 'filled';
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: { type: String, required: true },
    payRate: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      city: { type: String },
      address: { type: String },
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    duration: { type: String, enum: ['hourly', 'daily', 'weekly', 'monthly'] },
    requiredSkills: [{ type: String }],
    applicants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: {
      type: String,
      enum: ['open', 'closed', 'filled'],
      default: 'open',
    },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IJob>('Job', JobSchema);
