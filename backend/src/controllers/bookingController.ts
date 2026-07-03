import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Booking, { BookingStatus } from '../models/Booking.js';
import User from '../models/User.js';
import {
  createBooking as createMemoryBooking,
  findBookingById as findMemoryBookingById,
  findPendingBookingsForWorker,
  updateBookingStatus as updateMemoryBookingStatus,
  updateBookingNavigation as updateMemoryBookingNavigation,
  findUserById,
  updateUserById,
  haversineDistanceKm,
  type InMemoryBooking,
  type InMemoryGeoPoint,
} from '../utils/inMemoryStore.js';

// ---------------------------------------------------------------------------
// Shared TypeScript interfaces
// ---------------------------------------------------------------------------

interface GeoInput {
  latitude: number;
  longitude: number;
  address?: string;
}

interface ValidationError {
  field: string;
  message: string;
}

/** Shape of the "target coordinates to route to" returned by the navigation endpoints */
interface NavigationPayload {
  bookingId: string;
  status: BookingStatus;
  target: { latitude: number; longitude: number };
  destinationLocation: { latitude: number; longitude: number; address?: string };
  employerLiveLocation: { latitude: number; longitude: number; address?: string } | null;
  lastUpdatedAt: string | null;
  distanceRemainingKm: number | null;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function validateGeoPoint(point: any, fieldName: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!point || typeof point !== 'object') {
    errors.push({ field: fieldName, message: 'Required object with latitude and longitude.' });
    return errors;
  }
  if (typeof point.latitude !== 'number' || isNaN(point.latitude) || point.latitude < -90 || point.latitude > 90) {
    errors.push({ field: `${fieldName}.latitude`, message: 'Must be a number between -90 and 90.' });
  }
  if (
    typeof point.longitude !== 'number' ||
    isNaN(point.longitude) ||
    point.longitude < -180 ||
    point.longitude > 180
  ) {
    errors.push({ field: `${fieldName}.longitude`, message: 'Must be a number between -180 and 180.' });
  }
  return errors;
}

interface RequestBookingPayload {
  workerId: string;
  workerCategory: string;
  dailyWageRate: number;
  employerLocation: GeoInput;
  destinationLocation: GeoInput;
  notes?: string;
}

function validateRequestBookingPayload(body: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!body.workerId || typeof body.workerId !== 'string' || body.workerId.trim() === '') {
    errors.push({ field: 'workerId', message: 'Worker ID is required.' });
  }
  if (!body.workerCategory || typeof body.workerCategory !== 'string' || body.workerCategory.trim() === '') {
    errors.push({ field: 'workerCategory', message: 'Worker category is required.' });
  }
  if (typeof body.dailyWageRate !== 'number' || isNaN(body.dailyWageRate) || body.dailyWageRate <= 0) {
    errors.push({ field: 'dailyWageRate', message: 'Must be a positive number.' });
  }
  errors.push(...validateGeoPoint(body.employerLocation, 'employerLocation'));
  errors.push(...validateGeoPoint(body.destinationLocation, 'destinationLocation'));
  if (body.notes !== undefined && (typeof body.notes !== 'string' || body.notes.length > 500)) {
    errors.push({ field: 'notes', message: 'Must be a string of 500 characters or fewer.' });
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Booking state machine
// ---------------------------------------------------------------------------

/**
 * Explicit transitions allowed through PATCH /:id/status.
 * Note: pending → accepted/cancelled is intentionally excluded here — that
 * initial decision is only made through the dedicated /:id/respond endpoint,
 * which also carries the side-effect of flipping the worker's availability.
 */
const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: [],
  accepted: ['en_route', 'cancelled'],
  en_route: ['ongoing', 'cancelled'],
  ongoing: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

// ---------------------------------------------------------------------------
// requestBooking — POST /api/bookings/request
// ---------------------------------------------------------------------------

/**
 * Employer selects a nearby worker and hits "Hire Now". Writes a `pending`
 * booking document capturing the employer's live coordinates and the work
 * site destination. Fails fast if the target worker is not currently
 * online + available.
 */
export const requestBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const employerId = (req as any).user?.id;
    if (!employerId) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const payload = req.body as RequestBookingPayload;
    const errors = validateRequestBookingPayload(payload);
    if (errors.length > 0) {
      res.status(400).json({ message: 'Invalid booking request payload', errors });
      return;
    }

    const useMemoryStore = mongoose.connection.readyState !== 1;

    // 1. Verify the target worker exists, is a worker, and is dispatch-ready
    const worker = useMemoryStore
      ? await findUserById(payload.workerId)
      : await User.findById(payload.workerId).lean();

    if (!worker) {
      res.status(404).json({ message: 'Worker not found' });
      return;
    }

    const workerRole = (worker as any).currentRole ?? (worker as any).userType;
    if (workerRole !== 'worker') {
      res.status(400).json({ message: 'Target user is not currently in the worker role' });
      return;
    }
    if (!(worker as any).is_online || !(worker as any).is_available) {
      res.status(409).json({ message: 'Worker is not currently online and available for dispatch' });
      return;
    }

    // 2. Create the booking document
    let booking: any;
    if (useMemoryStore) {
      booking = await createMemoryBooking({
        employerId,
        workerId: payload.workerId,
        workerCategory: payload.workerCategory,
        dailyWageRate: payload.dailyWageRate,
        employerLocation: {
          latitude: payload.employerLocation.latitude,
          longitude: payload.employerLocation.longitude,
          address: payload.employerLocation.address,
        },
        destinationLocation: {
          latitude: payload.destinationLocation.latitude,
          longitude: payload.destinationLocation.longitude,
          address: payload.destinationLocation.address,
        },
        notes: payload.notes,
      });
    } else {
      booking = new Booking({
        employer: employerId,
        worker: payload.workerId,
        workerCategory: payload.workerCategory,
        dailyWageRate: payload.dailyWageRate,
        status: 'pending',
        employerLocation: {
          type: 'Point',
          coordinates: [payload.employerLocation.longitude, payload.employerLocation.latitude],
          address: payload.employerLocation.address,
        },
        destinationLocation: {
          type: 'Point',
          coordinates: [payload.destinationLocation.longitude, payload.destinationLocation.latitude],
          address: payload.destinationLocation.address,
        },
        notes: payload.notes,
        statusHistory: [{ status: 'pending', timestamp: new Date() }],
      });
      await booking.save();
    }

    res.status(201).json({
      message: 'Booking request created. Waiting for worker to accept.',
      booking: {
        id: booking._id,
        status: booking.status,
        workerId: payload.workerId,
        employerId,
        workerCategory: payload.workerCategory,
        dailyWageRate: payload.dailyWageRate,
        employerLocation: payload.employerLocation,
        destinationLocation: payload.destinationLocation,
        requestedAt: booking.requestedAt ?? new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error in requestBooking:', error);
    if (error.name === 'CastError') {
      res.status(400).json({ message: 'Invalid worker ID format', error: error.message });
      return;
    }
    res.status(500).json({
      message: 'Server error while creating booking request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

// ---------------------------------------------------------------------------
// getWorkerPendingBookings — GET /api/bookings/worker/pending
// ---------------------------------------------------------------------------

/**
 * Polling endpoint. The worker's client calls this every few seconds to
 * check for new job alerts assigned to them, oldest request first.
 */
export const getWorkerPendingBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const workerId = (req as any).user?.id;
    if (!workerId) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const useMemoryStore = mongoose.connection.readyState !== 1;

    let bookings: any[];
    if (useMemoryStore) {
      bookings = await findPendingBookingsForWorker(workerId);
    } else {
      bookings = await Booking.find({ worker: workerId, status: 'pending' })
        .sort({ requestedAt: 1 })
        .populate('employer', 'name profilePicture phone')
        .lean();
    }

    const formatted = bookings.map((b: any) => ({
      id: b._id,
      status: b.status,
      workerCategory: b.workerCategory,
      dailyWageRate: b.dailyWageRate,
      employer: useMemoryStore
        ? { id: b.employerId }
        : { id: b.employer?._id, name: b.employer?.name, profilePicture: b.employer?.profilePicture },
      employerLocation: useMemoryStore
        ? b.employerLocation
        : { latitude: b.employerLocation.coordinates[1], longitude: b.employerLocation.coordinates[0], address: b.employerLocation.address },
      destinationLocation: useMemoryStore
        ? b.destinationLocation
        : { latitude: b.destinationLocation.coordinates[1], longitude: b.destinationLocation.coordinates[0], address: b.destinationLocation.address },
      notes: b.notes ?? null,
      requestedAt: b.requestedAt,
    }));

    res.status(200).json({ bookings: formatted, count: formatted.length });
  } catch (error: any) {
    console.error('Error in getWorkerPendingBookings:', error);
    res.status(500).json({
      message: 'Server error while fetching pending bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

// ---------------------------------------------------------------------------
// respondToBooking — PATCH /api/bookings/:id/respond
// ---------------------------------------------------------------------------

/**
 * Worker accepts or denies a pending job alert.
 * On accept: booking → 'accepted', worker.is_available → false (removed from dispatch pool).
 * On deny: booking → 'cancelled' with a system-generated reason.
 */
export const respondToBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const workerId = (req as any).user?.id;
    if (!workerId) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const { action } = req.body as { action: 'accept' | 'deny' };

    if (action !== 'accept' && action !== 'deny') {
      res.status(400).json({
        message: 'Invalid action',
        errors: [{ field: 'action', message: "Must be 'accept' or 'deny'." }],
      });
      return;
    }

    const useMemoryStore = mongoose.connection.readyState !== 1;

    const booking = useMemoryStore
      ? await findMemoryBookingById(id)
      : await Booking.findById(id);

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    const bookingWorkerId = useMemoryStore ? (booking as InMemoryBooking).workerId : String((booking as any).worker);
    if (bookingWorkerId !== workerId) {
      res.status(403).json({ message: 'This booking is not assigned to you' });
      return;
    }

    if ((booking as any).status !== 'pending') {
      res.status(409).json({ message: `Booking already ${(booking as any).status}; cannot respond again.` });
      return;
    }

    let updatedBooking: any;
    if (action === 'accept') {
      const now = new Date();
      updatedBooking = useMemoryStore
        ? await updateMemoryBookingStatus(id, 'accepted', { acceptedAt: now })
        : await Booking.findByIdAndUpdate(
            id,
            { status: 'accepted', acceptedAt: now, $push: { statusHistory: { status: 'accepted', timestamp: now } } },
            { new: true }
          );

      // Worker is now committed to this job — remove from the dispatch pool
      if (useMemoryStore) {
        await updateUserById(workerId, { is_available: false });
      } else {
        await User.findByIdAndUpdate(workerId, { is_available: false });
      }
    } else {
      const now = new Date();
      updatedBooking = useMemoryStore
        ? await updateMemoryBookingStatus(id, 'cancelled', {
            cancelledAt: now,
            cancellationReason: 'Declined by worker',
          })
        : await Booking.findByIdAndUpdate(
            id,
            {
              status: 'cancelled',
              cancelledAt: now,
              cancellationReason: 'Declined by worker',
              $push: { statusHistory: { status: 'cancelled', timestamp: now } },
            },
            { new: true }
          );
    }

    res.status(200).json({
      message: action === 'accept' ? 'Booking accepted' : 'Booking declined',
      booking: {
        id: updatedBooking._id,
        status: updatedBooking.status,
        acceptedAt: updatedBooking.acceptedAt ?? null,
        cancelledAt: updatedBooking.cancelledAt ?? null,
        cancellationReason: updatedBooking.cancellationReason ?? null,
      },
    });
  } catch (error: any) {
    console.error('Error in respondToBooking:', error);
    if (error.name === 'CastError') {
      res.status(400).json({ message: 'Invalid booking ID format', error: error.message });
      return;
    }
    res.status(500).json({
      message: 'Server error while responding to booking',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

// ---------------------------------------------------------------------------
// updateBookingStatus — PATCH /api/bookings/:id/status
// ---------------------------------------------------------------------------

/**
 * Drives the booking through its remaining lifecycle transitions
 * (accepted → en_route → ongoing → completed), or cancels it early.
 * Either party (employer or worker) may call this, provided they are one of
 * the two participants on the booking and the transition is legal.
 */
export const updateBookingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const { status: nextStatus, cancellationReason } = req.body as {
      status: BookingStatus;
      cancellationReason?: string;
    };

    const VALID_STATUSES: BookingStatus[] = [
      'pending',
      'accepted',
      'en_route',
      'ongoing',
      'completed',
      'cancelled',
    ];
    if (!nextStatus || !VALID_STATUSES.includes(nextStatus)) {
      res.status(400).json({
        message: 'Invalid status',
        errors: [{ field: 'status', message: `Must be one of: ${VALID_STATUSES.join(', ')}.` }],
      });
      return;
    }

    const useMemoryStore = mongoose.connection.readyState !== 1;
    const booking = useMemoryStore ? await findMemoryBookingById(id) : await Booking.findById(id);

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    const employerId = useMemoryStore ? (booking as InMemoryBooking).employerId : String((booking as any).employer);
    const workerId = useMemoryStore ? (booking as InMemoryBooking).workerId : String((booking as any).worker);
    if (userId !== employerId && userId !== workerId) {
      res.status(403).json({ message: 'You are not a participant on this booking' });
      return;
    }

    const currentStatus: BookingStatus = (booking as any).status;
    const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(nextStatus)) {
      res.status(409).json({
        message: `Cannot transition booking from '${currentStatus}' to '${nextStatus}'.`,
        allowedNextStates: allowed,
      });
      return;
    }

    const now = new Date();
    const extra: Record<string, unknown> = {};
    if (nextStatus === 'ongoing') extra.startedAt = now;
    if (nextStatus === 'completed') extra.completedAt = now;
    if (nextStatus === 'cancelled') {
      extra.cancelledAt = now;
      extra.cancellationReason = cancellationReason || 'Cancelled by participant';
    }

    const updatedBooking = useMemoryStore
      ? await updateMemoryBookingStatus(id, nextStatus, extra as any)
      : await Booking.findByIdAndUpdate(
          id,
          { status: nextStatus, ...extra, $push: { statusHistory: { status: nextStatus, timestamp: now } } },
          { new: true }
        );

    // Free the worker back up once the job wraps up or is cancelled mid-flight
    if (nextStatus === 'completed' || nextStatus === 'cancelled') {
      if (useMemoryStore) {
        await updateUserById(workerId, { is_available: true });
      } else {
        await User.findByIdAndUpdate(workerId, { is_available: true });
      }
    }

    res.status(200).json({
      message: `Booking status updated to '${nextStatus}'`,
      booking: {
        id: (updatedBooking as any)._id,
        status: (updatedBooking as any).status,
        startedAt: (updatedBooking as any).startedAt ?? null,
        completedAt: (updatedBooking as any).completedAt ?? null,
        cancelledAt: (updatedBooking as any).cancelledAt ?? null,
        cancellationReason: (updatedBooking as any).cancellationReason ?? null,
      },
    });
  } catch (error: any) {
    console.error('Error in updateBookingStatus:', error);
    if (error.name === 'CastError') {
      res.status(400).json({ message: 'Invalid booking ID format', error: error.message });
      return;
    }
    res.status(500).json({
      message: 'Server error while updating booking status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

// ---------------------------------------------------------------------------
// updateEmployerLiveLocation — POST /api/bookings/:id/navigation (webhook)
// ---------------------------------------------------------------------------

/**
 * GPS webhook. The employer's device pings this periodically with their live
 * coordinates so the worker's map layer can recompute the route in real time.
 * Only the employer on the booking may post; the booking must be active
 * (accepted, en_route, or ongoing).
 */
export const updateEmployerLiveLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const employerId = (req as any).user?.id;
    if (!employerId) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const errors = validateGeoPoint(req.body, 'location');
    if (errors.length > 0) {
      res.status(400).json({ message: 'Invalid location payload', errors });
      return;
    }
    const { latitude, longitude, address } = req.body as GeoInput;

    const useMemoryStore = mongoose.connection.readyState !== 1;
    const booking = useMemoryStore ? await findMemoryBookingById(id) : await Booking.findById(id);

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    const bookingEmployerId = useMemoryStore
      ? (booking as InMemoryBooking).employerId
      : String((booking as any).employer);
    if (bookingEmployerId !== employerId) {
      res.status(403).json({ message: 'This booking does not belong to you' });
      return;
    }

    const activeStates: BookingStatus[] = ['accepted', 'en_route', 'ongoing'];
    if (!activeStates.includes((booking as any).status)) {
      res.status(409).json({
        message: `Navigation updates are only accepted while the booking is active (${activeStates.join(', ')}).`,
      });
      return;
    }

    const liveLocation: InMemoryGeoPoint = { latitude, longitude, address };

    const updatedBooking = useMemoryStore
      ? await updateMemoryBookingNavigation(id, liveLocation)
      : await Booking.findByIdAndUpdate(
          id,
          {
            'navigation.employerLiveLocation': {
              type: 'Point',
              coordinates: [longitude, latitude],
              address,
            },
            'navigation.lastUpdatedAt': new Date(),
          },
          { new: true }
        );

    const destination = useMemoryStore
      ? (updatedBooking as InMemoryBooking).destinationLocation
      : {
          latitude: (updatedBooking as any).destinationLocation.coordinates[1],
          longitude: (updatedBooking as any).destinationLocation.coordinates[0],
          address: (updatedBooking as any).destinationLocation.address,
        };

    const distanceRemainingKm = parseFloat(
      haversineDistanceKm(latitude, longitude, destination.latitude, destination.longitude).toFixed(2)
    );

    res.status(200).json({
      message: 'Live location updated',
      navigation: {
        bookingId: (updatedBooking as any)._id,
        employerLiveLocation: { latitude, longitude, address: address ?? null },
        destinationLocation: destination,
        distanceRemainingKm,
        lastUpdatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error in updateEmployerLiveLocation:', error);
    if (error.name === 'CastError') {
      res.status(400).json({ message: 'Invalid booking ID format', error: error.message });
      return;
    }
    res.status(500).json({
      message: 'Server error while updating live location',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

// ---------------------------------------------------------------------------
// getBookingNavigationPayload — GET /api/bookings/:id/navigation
// ---------------------------------------------------------------------------

/**
 * Worker's map layer polls this to fetch the latest routing target: the
 * employer's most recent live GPS ping if one has arrived, otherwise the
 * originally requested destination coordinates.
 */
export const getBookingNavigationPayload = async (req: Request, res: Response): Promise<void> => {
  try {
    const workerId = (req as any).user?.id;
    if (!workerId) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const useMemoryStore = mongoose.connection.readyState !== 1;
    const booking = useMemoryStore ? await findMemoryBookingById(id) : await Booking.findById(id);

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    const bookingWorkerId = useMemoryStore ? (booking as InMemoryBooking).workerId : String((booking as any).worker);
    if (bookingWorkerId !== workerId) {
      res.status(403).json({ message: 'This booking is not assigned to you' });
      return;
    }

    const destinationLocation = useMemoryStore
      ? (booking as InMemoryBooking).destinationLocation
      : {
          latitude: (booking as any).destinationLocation.coordinates[1],
          longitude: (booking as any).destinationLocation.coordinates[0],
          address: (booking as any).destinationLocation.address,
        };

    const rawLiveLocation = useMemoryStore
      ? (booking as InMemoryBooking).navigation?.employerLiveLocation ?? null
      : (booking as any).navigation?.employerLiveLocation
      ? {
          latitude: (booking as any).navigation.employerLiveLocation.coordinates[1],
          longitude: (booking as any).navigation.employerLiveLocation.coordinates[0],
          address: (booking as any).navigation.employerLiveLocation.address,
        }
      : null;

    const lastUpdatedAt = useMemoryStore
      ? (booking as InMemoryBooking).navigation?.lastUpdatedAt ?? null
      : (booking as any).navigation?.lastUpdatedAt ?? null;

    // Route to the employer's latest live ping if available, else the fixed job-site destination
    const target = rawLiveLocation ?? destinationLocation;

    // Best-effort distance-remaining: worker's last known location → target
    const worker = useMemoryStore ? await findUserById(workerId) : await User.findById(workerId).lean();
    const workerLat = useMemoryStore ? (worker as any)?.location?.latitude : (worker as any)?.location?.latitude;
    const workerLon = useMemoryStore ? (worker as any)?.location?.longitude : (worker as any)?.location?.longitude;

    const distanceRemainingKm =
      workerLat != null && workerLon != null
        ? parseFloat(haversineDistanceKm(workerLat, workerLon, target.latitude, target.longitude).toFixed(2))
        : null;

    const response: NavigationPayload = {
      bookingId: (booking as any)._id,
      status: (booking as any).status,
      target: { latitude: target.latitude, longitude: target.longitude },
      destinationLocation,
      employerLiveLocation: rawLiveLocation,
      lastUpdatedAt: lastUpdatedAt ? new Date(lastUpdatedAt).toISOString() : null,
      distanceRemainingKm,
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('Error in getBookingNavigationPayload:', error);
    if (error.name === 'CastError') {
      res.status(400).json({ message: 'Invalid booking ID format', error: error.message });
      return;
    }
    res.status(500).json({
      message: 'Server error while fetching navigation payload',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};
