import mongoose, { Schema, Document } from 'mongoose';

export interface IGeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  password: string;
  userType: 'worker' | 'employer';
  // Dynamic, switchable role — the "active" identity the app currently presents.
  // Defaults to userType at signup, but can be flipped instantly via switchRole().
  currentRole: 'worker' | 'employer';
  profilePicture?: string;
  description?: string;
  location: {
    latitude: number;
    longitude: number;
    city: string;
  };
  // GeoJSON Point field for 2dsphere spatial queries — the single source of
  // truth for "where is this user right now" (kept in sync with location).
  currentLocation?: IGeoPoint;
  // Worker-specific fields (only meaningful when currentRole === 'worker')
  is_available?: boolean;
  is_online?: boolean;
  workerCategory?: string;
  dailyRate?: number;
  skills?: string[];
  ratings?: number;
  reviewCount?: number;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GeoPointSchema = new Schema<IGeoPoint>(
  {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
  { _id: false }
);

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    userType: { type: String, enum: ['worker', 'employer'], required: true },
    currentRole: { type: String, enum: ['worker', 'employer'] },
    profilePicture: { type: String },
    description: { type: String },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      city: { type: String },
    },
    // GeoJSON Point — kept in sync with location.latitude/longitude on write
    currentLocation: { type: GeoPointSchema, index: false },
    // Worker-specific fields
    is_available: { type: Boolean, default: false },
    is_online: { type: Boolean, default: false },
    workerCategory: { type: String, trim: true },
    dailyRate: { type: Number, min: 0 },
    skills: [{ type: String }],
    ratings: { type: Number, default: 5 },
    reviewCount: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Default currentRole to userType at document creation time if not supplied
UserSchema.pre('validate', function (next) {
  const doc = this as unknown as IUser;
  if (!doc.currentRole) {
    doc.currentRole = doc.userType;
  }
  next();
});

// 2dsphere index enables $near / $geoWithin geospatial queries
UserSchema.index({ currentLocation: '2dsphere' });

// Compound index to speed up the common "browse workers" query pattern
UserSchema.index({ userType: 1, is_available: 1, workerCategory: 1 });

// Compound index to speed up instant-dispatch worker discovery
UserSchema.index({ currentRole: 1, is_online: 1, is_available: 1, workerCategory: 1 });

export default mongoose.model<IUser>('User', UserSchema);
