type InMemoryUser = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  userType: 'worker' | 'employer';
  // Dynamic, switchable role — mirrors User.ts currentRole
  currentRole?: 'worker' | 'employer';
  profilePicture?: string;
  description?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    city?: string;
  };
  // Worker-specific fields (mirrors User.ts schema additions)
  is_available?: boolean;
  is_online?: boolean;
  workerCategory?: string;
  dailyRate?: number;
  skills?: string[];
  ratings?: number;
  reviewCount?: number;
  isVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type InMemoryJob = {
  _id: string;
  title: string;
  description: string;
  employer: string;
  category: string;
  payRate: number;
  currency: string;
  location: {
    latitude?: number;
    longitude?: number;
    city?: string;
    address?: string;
  };
  startDate: Date;
  endDate: Date;
  duration: string;
  requiredSkills?: string[];
  applicants: string[];
  status: 'open' | 'closed' | 'filled';
  views: number;
  createdAt: Date;
  updatedAt: Date;
};

const users: InMemoryUser[] = [];
const jobs: InMemoryJob[] = [];
let nextUserId = 1;
let nextJobId = 1;

export const useInMemoryStore = () => true;

export const findUserByEmail = async (email: string) => {
  return users.find((user) => user.email === email) || null;
};

export const createUser = async (payload: Omit<InMemoryUser, '_id' | 'createdAt' | 'updatedAt'>) => {
  const user: InMemoryUser = {
    ...payload,
    _id: `user_${nextUserId++}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  users.push(user);
  return user;
};

export const findUserById = async (id: string) => {
  return users.find((user) => user._id === id) || null;
};

export const updateUserById = async (
  id: string,
  patch: Partial<Omit<InMemoryUser, '_id' | 'createdAt'>>
) => {
  const user = users.find((entry) => entry._id === id);
  if (!user) return null;
  Object.assign(user, patch, { updatedAt: new Date() });
  return user;
};

export const findJobs = async (filter: Partial<InMemoryJob> = {}) => {
  return jobs.filter((job) => {
    if (filter.status && job.status !== filter.status) return false;
    if (filter.category && job.category !== filter.category) return false;
    if (filter.employer && job.employer !== filter.employer) return false;
    return true;
  });
};

export const findJobById = async (id: string) => {
  return jobs.find((job) => job._id === id) || null;
};

export const createJob = async (payload: Omit<InMemoryJob, '_id' | 'createdAt' | 'updatedAt' | 'views' | 'status' | 'applicants'> & { status?: InMemoryJob['status']; applicants?: string[]; views?: number }) => {
  const job: InMemoryJob = {
    ...payload,
    _id: `job_${nextJobId++}`,
    applicants: payload.applicants || [],
    views: payload.views || 0,
    status: payload.status || 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  jobs.push(job);
  return job;
};

export const applyToJob = async (jobId: string, userId: string) => {
  const job = jobs.find((entry) => entry._id === jobId);
  if (!job) return null;
  if (!job.applicants.includes(userId)) {
    job.applicants.push(userId);
  }
  job.updatedAt = new Date();
  return job;
};

export const incrementJobViews = async (jobId: string) => {
  const job = jobs.find((entry) => entry._id === jobId);
  if (!job) return null;
  job.views += 1;
  job.updatedAt = new Date();
  return job;
};

// ---------------------------------------------------------------------------
// Geospatial helpers (used when MongoDB is unavailable)
// ---------------------------------------------------------------------------

/**
 * Haversine formula — returns great-circle distance between two coordinates
 * in kilometres.
 */
export const haversineDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export type NearbyWorkerFilter = {
  latitude: number;
  longitude: number;
  radiusInKm: number;
  category?: string;
  page?: number;
  limit?: number;
};

export type NearbyWorkerResult = InMemoryUser & { distanceKm: number };

/**
 * In-memory fallback for MongoDB $near queries.
 * Filters workers by availability, optional category, and proximity radius.
 * Returns a paginated slice sorted by distance ascending.
 */
export const findNearbyWorkers = async (
  filter: NearbyWorkerFilter
): Promise<{ workers: NearbyWorkerResult[]; total: number }> => {
  const { latitude, longitude, radiusInKm, category, page = 1, limit = 20 } = filter;

  const matched: NearbyWorkerResult[] = [];

  for (const user of users) {
    if (user.userType !== 'worker') continue;
    if (!user.is_available) continue;
    if (category && user.workerCategory?.toLowerCase() !== category.toLowerCase()) continue;

    const lat = user.location?.latitude;
    const lon = user.location?.longitude;
    if (lat == null || lon == null) continue;

    const dist = haversineDistanceKm(latitude, longitude, lat, lon);
    if (dist > radiusInKm) continue;

    matched.push({ ...user, distanceKm: parseFloat(dist.toFixed(2)) });
  }

  // Sort by closest first (mirrors MongoDB $near default ordering)
  matched.sort((a, b) => a.distanceKm - b.distanceKm);

  const total = matched.length;
  const skip = (page - 1) * limit;
  const workers = matched.slice(skip, skip + limit);

  return { workers, total };
};

// ---------------------------------------------------------------------------
// Text search + multi-chip filtering (in-memory fallback)
// ---------------------------------------------------------------------------

export type ActiveChip = 'near_me' | 'available_today' | 'top_rated';

export type SearchFilter = {
  q: string;
  chips: ActiveChip[];
  latitude?: number;
  longitude?: number;
  radiusInKm?: number;
  page?: number;
  limit?: number;
};

export type SearchedWorkerResult = InMemoryUser & {
  distanceKm: number | null;
  relevanceScore: number;
  matchedOn: string[];
};

/** Partial case-insensitive text match across name, category, description, and skills. */
const matchesQuery = (
  user: InMemoryUser,
  q: string,
): { matched: boolean; fields: string[] } => {
  const lower = q.toLowerCase();
  const fields: string[] = [];
  if (user.name.toLowerCase().includes(lower)) fields.push('name');
  if (user.workerCategory?.toLowerCase().includes(lower)) fields.push('workerCategory');
  if (user.description?.toLowerCase().includes(lower)) fields.push('description');
  if (user.skills?.some((s) => s.toLowerCase().includes(lower))) fields.push('skills');
  return { matched: fields.length > 0, fields };
};

/**
 * Composite relevance score [0–1].
 * Weights: text-match 0.35 · rating 0.40 · proximity 0.25
 */
const computeWorkerScore = (
  user: InMemoryUser,
  matchedFields: string[],
  distanceKm: number | null,
  radiusInKm: number,
): number => {
  let score = 0;
  if (matchedFields.includes('name')) score += 0.35;
  else if (matchedFields.length > 0) score += 0.25;
  score += ((user.ratings ?? 0) / 5) * 0.4;
  if (distanceKm !== null && radiusInKm > 0) {
    score += Math.max(0, 1 - distanceKm / radiusInKm) * 0.25;
  }
  return parseFloat(score.toFixed(4));
};

/**
 * In-memory fallback for searchAndFilterWorkers.
 * Runs text matching, chip filters (available_today, top_rated, near_me)
 * and optional Haversine proximity in a single linear pass.
 * Result is sorted: composite score↓ → rating↓ → distance↑.
 */
export const searchAndFilterInMemoryWorkers = async (
  filter: SearchFilter,
): Promise<{ workers: SearchedWorkerResult[]; total: number }> => {
  const { q, chips, latitude, longitude, radiusInKm = 10, page = 1, limit = 20 } = filter;

  const nearMe = chips.includes('near_me');
  const availableToday = chips.includes('available_today');
  const topRated = chips.includes('top_rated');

  const matched: SearchedWorkerResult[] = [];

  for (const user of users) {
    if (user.userType !== 'worker') continue;

    // ── Chip: available_today ────────────────────────────────────────────
    if (availableToday && !user.is_available) continue;

    // ── Chip: top_rated ──────────────────────────────────────────────────
    if (topRated && (user.ratings ?? 0) < 4.5) continue;

    // ── Text search (skip filter only when q is non-empty) ───────────────
    let matchedOn: string[] = [];
    if (q) {
      const { matched: hit, fields } = matchesQuery(user, q);
      if (!hit) continue;
      matchedOn = fields;
    }

    // ── Chip: near_me (Haversine) ─────────────────────────────────────────
    let distanceKm: number | null = null;
    if (nearMe) {
      if (latitude == null || longitude == null) continue;
      const lat = user.location?.latitude;
      const lon = user.location?.longitude;
      if (lat == null || lon == null) continue;
      distanceKm = parseFloat(haversineDistanceKm(latitude, longitude, lat, lon).toFixed(2));
      if (distanceKm > radiusInKm) continue;
    }

    matched.push({
      ...user,
      distanceKm,
      relevanceScore: computeWorkerScore(user, matchedOn, distanceKm, radiusInKm),
      matchedOn,
    });
  }

  // Sort: score↓ → rating↓ → distance↑
  matched.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
    if ((b.ratings ?? 0) !== (a.ratings ?? 0)) return (b.ratings ?? 0) - (a.ratings ?? 0);
    if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
    return 0;
  });

  const total = matched.length;
  const skip = (page - 1) * limit;
  return { workers: matched.slice(skip, skip + limit), total };
};

// ---------------------------------------------------------------------------
// Instant-dispatch worker discovery (in-memory fallback)
// ---------------------------------------------------------------------------

export type NearestAvailableWorkerFilter = {
  latitude: number;
  longitude: number;
  radiusInKm: number;
  category?: string;
  page?: number;
  limit?: number;
};

export type NearestAvailableWorkerResult = InMemoryUser & { distanceKm: number };

/**
 * In-memory fallback for the instant-dispatch discovery query.
 * Stricter than findNearbyWorkers — requires currentRole === 'worker',
 * is_online === true AND is_available === true (both flags, not just one),
 * since this powers the live "Hire Now" dispatch flow rather than passive browsing.
 * Sorted by distance ascending (nearest first).
 */
export const findNearestAvailableWorkers = async (
  filter: NearestAvailableWorkerFilter
): Promise<{ workers: NearestAvailableWorkerResult[]; total: number }> => {
  const { latitude, longitude, radiusInKm, category, page = 1, limit = 20 } = filter;

  const matched: NearestAvailableWorkerResult[] = [];

  for (const user of users) {
    const role = user.currentRole ?? user.userType;
    if (role !== 'worker') continue;
    if (!user.is_online) continue;
    if (!user.is_available) continue;
    if (category && user.workerCategory?.toLowerCase() !== category.toLowerCase()) continue;

    const lat = user.location?.latitude;
    const lon = user.location?.longitude;
    if (lat == null || lon == null) continue;

    const dist = haversineDistanceKm(latitude, longitude, lat, lon);
    if (dist > radiusInKm) continue;

    matched.push({ ...user, distanceKm: parseFloat(dist.toFixed(2)) });
  }

  matched.sort((a, b) => a.distanceKm - b.distanceKm);

  const total = matched.length;
  const skip = (page - 1) * limit;
  return { workers: matched.slice(skip, skip + limit), total };
};

// ---------------------------------------------------------------------------
// Booking / dispatch store (in-memory fallback)
// ---------------------------------------------------------------------------

export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'en_route'
  | 'ongoing'
  | 'completed'
  | 'cancelled';

export type InMemoryGeoPoint = { latitude: number; longitude: number; address?: string };

export type InMemoryBooking = {
  _id: string;
  employerId: string;
  workerId: string;
  workerCategory: string;
  dailyWageRate: number;
  status: BookingStatus;
  employerLocation: InMemoryGeoPoint;
  destinationLocation: InMemoryGeoPoint;
  notes?: string;
  statusHistory: { status: BookingStatus; timestamp: Date }[];
  navigation: {
    employerLiveLocation?: InMemoryGeoPoint;
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
};

const bookings: InMemoryBooking[] = [];
let nextBookingId = 1;

export const createBooking = async (
  payload: Omit<
    InMemoryBooking,
    | '_id'
    | 'status'
    | 'statusHistory'
    | 'navigation'
    | 'requestedAt'
    | 'createdAt'
    | 'updatedAt'
  >
): Promise<InMemoryBooking> => {
  const now = new Date();
  const booking: InMemoryBooking = {
    ...payload,
    _id: `booking_${nextBookingId++}`,
    status: 'pending',
    statusHistory: [{ status: 'pending', timestamp: now }],
    navigation: {},
    requestedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  bookings.push(booking);
  return booking;
};

export const findBookingById = async (id: string): Promise<InMemoryBooking | null> => {
  return bookings.find((b) => b._id === id) || null;
};

/** Polling endpoint backing store — pending job alerts for a given worker, oldest first. */
export const findPendingBookingsForWorker = async (
  workerId: string
): Promise<InMemoryBooking[]> => {
  return bookings
    .filter((b) => b.workerId === workerId && b.status === 'pending')
    .sort((a, b) => a.requestedAt.getTime() - b.requestedAt.getTime());
};

export const updateBookingStatus = async (
  id: string,
  status: BookingStatus,
  extra: Partial<
    Pick<InMemoryBooking, 'acceptedAt' | 'startedAt' | 'completedAt' | 'cancelledAt' | 'cancellationReason'>
  > = {}
): Promise<InMemoryBooking | null> => {
  const booking = bookings.find((b) => b._id === id);
  if (!booking) return null;
  const now = new Date();
  booking.status = status;
  booking.statusHistory.push({ status, timestamp: now });
  Object.assign(booking, extra);
  booking.updatedAt = now;
  return booking;
};

/** Webhook backing store — persists the employer's latest GPS ping for a booking. */
export const updateBookingNavigation = async (
  id: string,
  employerLiveLocation: InMemoryGeoPoint
): Promise<InMemoryBooking | null> => {
  const booking = bookings.find((b) => b._id === id);
  if (!booking) return null;
  booking.navigation = { employerLiveLocation, lastUpdatedAt: new Date() };
  booking.updatedAt = new Date();
  return booking;
};
