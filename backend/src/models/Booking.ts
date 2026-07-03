import mongoose, { Schema, Document } from 'mongoose';

export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'en_route'
  | 'ongoing'
  | 'completed'
  | 'cancelled';

export interface IGeoPointWithAddress {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
  address?: string;
}

export interface IStatusHistoryEntry {
  status: BookingStatus;
  timestamp: Date;
}

export interface IBooking extends Document {
  employer: mongoose.Schema.Types.ObjectId;
  worker: mongoose.Schema.Types.ObjectId;
  workerCategory: string;
  dailyWageRate: number;
  status: BookingStatus;
  // Where the employer was standing when they made the request
  employerLocation: IGeoPointWithAddress;
  // Where the job actually needs to happen (work site)
  destinationLocation: IGeoPointWithAddress;
  notes?: string;
  statusHistory: IStatusHistoryEntry[];
  // Live navigation payload — updated via the GPS webhook while a job is active
  navigation: {
    employerLiveLocation?: IGeoPointWithAddress;
    lastUpdatedAt?: Date;
  };
  requestedAt: Date;
  acceptedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GeoPointWithAddressSchema = new Schema<IGeoPointWithAddress>(
  {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true },
    address: { type: String },
  },
  { _id: false }
);

const StatusHistorySchema = new Schema<IStatusHistoryEntry>(
  {
    status: {
      type: String,
      enum: ['pending', 'accepted', 'en_route', 'ongoing', 'completed', 'cancelled'],
      required: true,
    },
    timestamp: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const BookingSchema: Schema = new Schema(
  {
    employer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    workerCategory: { type: String, required: true, trim: true },
    dailyWageRate: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'en_route', 'ongoing', 'completed', 'cancelled'],
      default: 'pending',
      required: true,
    },
    employerLocation: { type: GeoPointWithAddressSchema, required: true },
    destinationLocation: { type: GeoPointWithAddressSchema, required: true },
    notes: { type: String, maxlength: 500 },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    navigation: {
      employerLiveLocation: { type: GeoPointWithAddressSchema, required: false },
      lastUpdatedAt: { type: Date },
    },
    requestedAt: { type: Date, default: Date.now, required: true },
    acceptedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, maxlength: 300 },
  },
  { timestamps: true }
);

// Geospatial indexes power "jobs near me" and live-navigation queries
BookingSchema.index({ employerLocation: '2dsphere' });
BookingSchema.index({ destinationLocation: '2dsphere' });
BookingSchema.index({ 'navigation.employerLiveLocation': '2dsphere' });

// Powers the worker's pending-jobs polling endpoint
BookingSchema.index({ worker: 1, status: 1 });
BookingSchema.index({ employer: 1, status: 1 });

export default mongoose.model<IBooking>('Booking', BookingSchema);
