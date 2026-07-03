import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import {
  findNearbyWorkers,
  findNearestAvailableWorkers,
  searchAndFilterInMemoryWorkers,
  type ActiveChip,
  type SearchFilter,
} from '../utils/inMemoryStore.js';

// ---------------------------------------------------------------------------
// TypeScript interfaces
// ---------------------------------------------------------------------------

/** Validated + parsed form of req.query for the /nearby endpoint */
interface NearbyWorkersQuery {
  latitude: number;
  longitude: number;
  radiusInKm: number;
  category: string | null;
  page: number;
  limit: number;
}

/** Single worker profile returned to the client */
interface WorkerProfile {
  id: string;
  name: string;
  workerCategory: string;
  dailyRate: number | null;
  skills: string[];
  ratings: number;
  reviewCount: number;
  isVerified: boolean;
  is_available: boolean;
  distanceKm: number;
  location: {
    city: string;
    latitude: number;
    longitude: number;
  };
  profilePicture: string | null;
  description: string | null;
}

/** Top-level paginated response envelope */
interface PaginatedWorkersResponse {
  workers: WorkerProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  queryMeta: {
    latitude: number;
    longitude: number;
    radiusInKm: number;
    category: string | null;
  };
}

// ---------------------------------------------------------------------------
// Query parameter validation helper
// ---------------------------------------------------------------------------

interface QueryValidationError {
  field: string;
  message: string;
}

function parseNearbyQuery(
  raw: Record<string, unknown>
): { data: NearbyWorkersQuery } | { errors: QueryValidationError[] } {
  const errors: QueryValidationError[] = [];

  const lat = parseFloat(raw.latitude as string);
  const lon = parseFloat(raw.longitude as string);
  const radius = parseFloat(raw.radiusInKm as string);
  const page = parseInt((raw.page as string) || '1', 10);
  const limit = Math.min(parseInt((raw.limit as string) || '20', 10), 100);

  if (isNaN(lat) || lat < -90 || lat > 90) {
    errors.push({ field: 'latitude', message: 'Must be a number between -90 and 90.' });
  }
  if (isNaN(lon) || lon < -180 || lon > 180) {
    errors.push({ field: 'longitude', message: 'Must be a number between -180 and 180.' });
  }
  if (isNaN(radius) || radius <= 0 || radius > 200) {
    errors.push({ field: 'radiusInKm', message: 'Must be a positive number up to 200 km.' });
  }
  if (isNaN(page) || page < 1) {
    errors.push({ field: 'page', message: 'Must be a positive integer.' });
  }
  if (isNaN(limit) || limit < 1) {
    errors.push({ field: 'limit', message: 'Must be a positive integer (max 100).' });
  }

  if (errors.length > 0) return { errors };

  const category =
    raw.category && typeof raw.category === 'string' && raw.category.trim() !== ''
      ? raw.category.trim().toLowerCase()
      : null;

  return { data: { latitude: lat, longitude: lon, radiusInKm: radius, category, page, limit } };
}

// ---------------------------------------------------------------------------
// getNearbyAvailableWorkers
// ---------------------------------------------------------------------------

/**
 * GET /api/users/nearby
 *
 * Query params:
 *   latitude    — number, required
 *   longitude   — number, required
 *   radiusInKm  — number, required (max 200)
 *   category    — string, optional (e.g. "mason", "electrician")
 *   page        — integer ≥ 1, default 1
 *   limit       — integer 1–100, default 20
 *
 * Returns a paginated list of available workers sorted by distance ascending.
 * Uses MongoDB $near with a 2dsphere index when connected; falls back to an
 * in-memory Haversine calculation otherwise.
 */
export const getNearbyAvailableWorkers = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Parse and validate query parameters
    const parsed = parseNearbyQuery(req.query as Record<string, unknown>);
    if ('errors' in parsed) {
      res.status(400).json({
        message: 'Invalid query parameters',
        errors: parsed.errors,
      });
      return;
    }

    const { latitude, longitude, radiusInKm, category, page, limit } = parsed.data;
    const skip = (page - 1) * limit;
    const useMemoryStore = mongoose.connection.readyState !== 1;

    let workers: WorkerProfile[] = [];
    let total = 0;

    if (useMemoryStore) {
      // -----------------------------------------------------------------------
      // In-memory fallback — Haversine distance filtering
      // -----------------------------------------------------------------------
      const result = await findNearbyWorkers({
        latitude,
        longitude,
        radiusInKm,
        ...(category && { category }),
        page,
        limit,
      });

      total = result.total;
      workers = result.workers.map((u: any) => ({
        id: u._id,
        name: u.name,
        workerCategory: u.workerCategory ?? 'general',
        dailyRate: u.dailyRate ?? null,
        skills: u.skills ?? [],
        ratings: u.ratings ?? 5,
        reviewCount: u.reviewCount ?? 0,
        isVerified: u.isVerified ?? false,
        is_available: u.is_available ?? false,
        distanceKm: u.distanceKm,
        location: {
          city: u.location?.city ?? 'Unknown',
          latitude: u.location?.latitude ?? 0,
          longitude: u.location?.longitude ?? 0,
        },
        profilePicture: u.profilePicture ?? null,
        description: u.description ?? null,
      }));
    } else {
      // -----------------------------------------------------------------------
      // MongoDB — 2dsphere $near query
      // The $near operator returns documents sorted by distance ascending
      // automatically; no explicit sort needed.
      // -----------------------------------------------------------------------
      const geoQuery = {
        $near: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: radiusInKm * 1000, // MongoDB expects metres
        },
      };

      const dbFilter: Record<string, unknown> = {
        userType: 'worker',
        is_available: true,
        currentLocation: geoQuery,
        ...(category && { workerCategory: { $regex: new RegExp(`^${category}$`, 'i') } }),
      };

      // Count total matching documents (without pagination)
      // $near cannot be used with countDocuments; use aggregate or a separate
      // box query. Here we use $geoWithin for the count to avoid the limitation.
      const countFilter: Record<string, unknown> = {
        userType: 'worker',
        is_available: true,
        currentLocation: {
          $geoWithin: {
            $centerSphere: [[longitude, latitude], radiusInKm / 6371],
          },
        },
        ...(category && { workerCategory: { $regex: new RegExp(`^${category}$`, 'i') } }),
      };

      total = await User.countDocuments(countFilter);

      const docs = await User.find(dbFilter)
        .select('-password')
        .skip(skip)
        .limit(limit)
        .lean();

      workers = docs.map((u: any) => {
        // Calculate distance for response — re-use Haversine on returned docs
        const workerLat: number = u.location?.latitude ?? 0;
        const workerLon: number = u.location?.longitude ?? 0;
        const dLat = ((workerLat - latitude) * Math.PI) / 180;
        const dLon = ((workerLon - longitude) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((latitude * Math.PI) / 180) *
            Math.cos((workerLat * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
        const distanceKm = parseFloat((6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));

        return {
          id: String(u._id),
          name: u.name,
          workerCategory: (u as any).workerCategory ?? 'general',
          dailyRate: (u as any).dailyRate ?? null,
          skills: (u as any).skills ?? [],
          ratings: u.ratings ?? 5,
          reviewCount: u.reviewCount ?? 0,
          isVerified: u.isVerified,
          is_available: (u as any).is_available ?? false,
          distanceKm,
          location: {
            city: u.location?.city ?? 'Unknown',
            latitude: u.location?.latitude ?? 0,
            longitude: u.location?.longitude ?? 0,
          },
          profilePicture: u.profilePicture ?? null,
          description: u.description ?? null,
        };
      });
    }

    // 3. Build paginated response
    const totalPages = Math.ceil(total / limit);
    const response: PaginatedWorkersResponse = {
      workers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      queryMeta: {
        latitude,
        longitude,
        radiusInKm,
        category,
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('Error in getNearbyAvailableWorkers:', error);
    res.status(500).json({
      message: 'Server error while fetching nearby workers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

// ---------------------------------------------------------------------------
// Existing controllers
// ---------------------------------------------------------------------------

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { name, description, profilePicture, location } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { name, description, profilePicture, location },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// ---------------------------------------------------------------------------
// searchAndFilterWorkers
// ---------------------------------------------------------------------------

/** Validated + parsed form of req.query for the /search endpoint */
interface SearchWorkerQuery {
  q: string;
  chips: ActiveChip[];
  latitude: number | null;
  longitude: number | null;
  radiusInKm: number;
  page: number;
  limit: number;
}

/** Single worker result enriched with search metadata */
interface WorkerSearchResult {
  id: string;
  name: string;
  workerCategory: string;
  dailyRate: number | null;
  skills: string[];
  ratings: number;
  reviewCount: number;
  isVerified: boolean;
  is_available: boolean;
  distanceKm: number | null;
  relevanceScore: number;
  matchedOn: string[];
  location: { city: string; latitude: number; longitude: number };
  profilePicture: string | null;
  description: string | null;
}

/** Full paginated search response envelope */
interface SearchWorkersResponse {
  workers: WorkerSearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  queryMeta: {
    q: string;
    activeChips: ActiveChip[];
    latitude: number | null;
    longitude: number | null;
    radiusInKm: number;
  };
}

// ── Valid chip set (module-level constant, shared by parser + controller) ──
const VALID_CHIPS = new Set<string>(['near_me', 'available_today', 'top_rated']);

// ── Query parameter parser ─────────────────────────────────────────────────

function parseSearchWorkerQuery(
  raw: Record<string, unknown>,
): { data: SearchWorkerQuery } | { errors: QueryValidationError[] } {
  const errors: QueryValidationError[] = [];

  // Sanitise free-text: trim whitespace, hard-cap at 100 chars to block regex DoS
  const q = typeof raw.q === 'string' ? raw.q.trim().slice(0, 100) : '';

  // Accept "near_me,top_rated" string OR repeated ?chips= params
  const rawChips = Array.isArray(raw.chips)
    ? (raw.chips as string[])
    : typeof raw.chips === 'string'
    ? raw.chips.split(',').map((c) => c.trim())
    : [];
  const chips = rawChips.filter((c) => VALID_CHIPS.has(c)) as ActiveChip[];

  const nearMe = chips.includes('near_me');
  let latitude: number | null = null;
  let longitude: number | null = null;
  const radiusRaw = raw.radiusInKm != null ? parseFloat(raw.radiusInKm as string) : NaN;
  const radiusInKm = isNaN(radiusRaw) ? 10 : radiusRaw;

  if (nearMe) {
    latitude = parseFloat(raw.latitude as string);
    longitude = parseFloat(raw.longitude as string);
    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      errors.push({
        field: 'latitude',
        message: 'Required when near_me chip is active. Must be between -90 and 90.',
      });
    }
    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      errors.push({
        field: 'longitude',
        message: 'Required when near_me chip is active. Must be between -180 and 180.',
      });
    }
  }

  if (!isNaN(radiusRaw) && (radiusInKm <= 0 || radiusInKm > 200)) {
    errors.push({ field: 'radiusInKm', message: 'Must be between 1 and 200 km.' });
  }

  const page = parseInt((raw.page as string) || '1', 10);
  const limit = Math.min(parseInt((raw.limit as string) || '20', 10), 100);
  if (isNaN(page) || page < 1) errors.push({ field: 'page', message: 'Must be a positive integer.' });
  if (isNaN(limit) || limit < 1) errors.push({ field: 'limit', message: 'Must be a positive integer (max 100).' });

  if (errors.length > 0) return { errors };
  return {
    data: {
      q,
      chips,
      latitude: nearMe ? latitude : null,
      longitude: nearMe ? longitude : null,
      radiusInKm,
      page,
      limit,
    },
  };
}

// ── MongoDB query builders ─────────────────────────────────────────────────

/**
 * Builds the non-geospatial portion of the Mongo filter.
 * Reused as the standalone filter (no near_me) and as $geoNear's `query` field.
 */
function buildMongoBaseFilter(p: SearchWorkerQuery): Record<string, unknown> {
  const filter: Record<string, unknown> = { userType: 'worker' };

  if (p.q) {
    // $regex partial match across four indexed fields
    filter.$or = [
      { name: { $regex: p.q, $options: 'i' } },
      { workerCategory: { $regex: p.q, $options: 'i' } },
      { description: { $regex: p.q, $options: 'i' } },
      { skills: { $elemMatch: { $regex: p.q, $options: 'i' } } },
    ];
  }

  if (p.chips.includes('available_today')) filter.is_available = true;
  if (p.chips.includes('top_rated')) filter.ratings = { $gte: 4.5 };

  return filter;
}

/**
 * Determines which profile fields a query string matched.
 * Called on returned documents to annotate the response.
 */
function detectMatchedFields(doc: Record<string, any>, q: string): string[] {
  if (!q) return [];
  const lower = q.toLowerCase();
  const fields: string[] = [];
  if (doc.name?.toLowerCase().includes(lower)) fields.push('name');
  if (doc.workerCategory?.toLowerCase().includes(lower)) fields.push('workerCategory');
  if (doc.description?.toLowerCase().includes(lower)) fields.push('description');
  if ((doc.skills as string[] | undefined)?.some((s) => s.toLowerCase().includes(lower)))
    fields.push('skills');
  return fields;
}

/**
 * Composite relevance score for a MongoDB document.
 * Mirrors the in-memory formula — client receives a consistent field regardless of backend path.
 * Weights: text-match 0.35 · rating 0.40 · proximity 0.25
 */
function computeDocScore(
  doc: Record<string, any>,
  q: string,
  distanceKm: number | null,
  radiusInKm: number,
): number {
  const mf = detectMatchedFields(doc, q);
  let score = 0;
  if (mf.includes('name')) score += 0.35;
  else if (mf.length > 0) score += 0.25;
  score += ((doc.ratings ?? 0) / 5) * 0.4;
  if (distanceKm !== null && radiusInKm > 0) {
    score += Math.max(0, 1 - distanceKm / radiusInKm) * 0.25;
  }
  return parseFloat(score.toFixed(4));
}

// ── Controller ─────────────────────────────────────────────────────────────

/**
 * GET /api/users/search
 *
 * Powers the HomeScreen search bar and filter chips (Near Me, Available Today, Top Rated).
 *
 * Query params:
 *   q            — free-text search (partial match on name, category, description, skills)
 *   chips        — comma-separated active chips: near_me | available_today | top_rated
 *   latitude     — required when chips includes near_me
 *   longitude    — required when chips includes near_me
 *   radiusInKm   — proximity radius, default 10 km, max 200
 *   page         — default 1
 *   limit        — default 20, max 100
 *
 * Sorting strategy:
 *   MongoDB  — near_me active  → $geoNear aggregation; sorted ratings↓ + distanceMeters↑
 *            — near_me off     → find(); sorted ratings↓ + reviewCount↓
 *   Fallback — composite relevance score↓ → rating↓ → distance↑
 */
export const searchAndFilterWorkers = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Parse and validate all query parameters
    const parsed = parseSearchWorkerQuery(req.query as Record<string, unknown>);
    if ('errors' in parsed) {
      res.status(400).json({ message: 'Invalid query parameters', errors: parsed.errors });
      return;
    }

    const { q, chips, latitude, longitude, radiusInKm, page, limit } = parsed.data;
    const skip = (page - 1) * limit;
    const nearMe = chips.includes('near_me');
    const useMemoryStore = mongoose.connection.readyState !== 1;

    let workers: WorkerSearchResult[] = [];
    let total = 0;

    if (useMemoryStore) {
      // ── In-memory path ────────────────────────────────────────────────
      const memFilter: SearchFilter = {
        q,
        chips,
        radiusInKm,
        page,
        limit,
        ...(latitude !== null && { latitude }),
        ...(longitude !== null && { longitude }),
      };
      const result = await searchAndFilterInMemoryWorkers(memFilter);
      total = result.total;
      workers = result.workers.map((u: any) => ({
        id: u._id,
        name: u.name,
        workerCategory: u.workerCategory ?? 'general',
        dailyRate: u.dailyRate ?? null,
        skills: u.skills ?? [],
        ratings: u.ratings ?? 5,
        reviewCount: u.reviewCount ?? 0,
        isVerified: u.isVerified ?? false,
        is_available: u.is_available ?? false,
        distanceKm: u.distanceKm,
        relevanceScore: u.relevanceScore,
        matchedOn: u.matchedOn,
        location: {
          city: u.location?.city ?? 'Unknown',
          latitude: u.location?.latitude ?? 0,
          longitude: u.location?.longitude ?? 0,
        },
        profilePicture: u.profilePicture ?? null,
        description: u.description ?? null,
      }));
    } else {
      // ── MongoDB path ──────────────────────────────────────────────────
      const baseFilter = buildMongoBaseFilter(parsed.data);

      if (nearMe && latitude !== null && longitude !== null) {
        // $geoNear must be the first pipeline stage; it adds distanceMeters
        // to each document and handles maxDistance filtering automatically.
        const geoNearStage = {
          $geoNear: {
            near: { type: 'Point' as const, coordinates: [longitude, latitude] as [number, number] },
            distanceField: 'distanceMeters',
            maxDistance: radiusInKm * 1000, // MongoDB expects metres
            query: baseFilter,
            spherical: true,
          },
        };

        // Run count and data pipelines in parallel
        const [countResult, docs] = await Promise.all([
          User.aggregate([geoNearStage, { $count: 'total' }]),
          User.aggregate([
            geoNearStage,
            { $sort: { ratings: -1, distanceMeters: 1 } }, // highest rated + closest first
            { $skip: skip },
            { $limit: limit },
            { $project: { password: 0 } },
          ]),
        ]);

        total = countResult[0]?.total ?? 0;
        workers = docs.map((doc: any) => {
          const distKm = parseFloat(((doc.distanceMeters ?? 0) / 1000).toFixed(2));
          return {
            id: String(doc._id),
            name: doc.name,
            workerCategory: doc.workerCategory ?? 'general',
            dailyRate: doc.dailyRate ?? null,
            skills: doc.skills ?? [],
            ratings: doc.ratings ?? 5,
            reviewCount: doc.reviewCount ?? 0,
            isVerified: doc.isVerified ?? false,
            is_available: doc.is_available ?? false,
            distanceKm: distKm,
            relevanceScore: computeDocScore(doc, q, distKm, radiusInKm),
            matchedOn: detectMatchedFields(doc, q),
            location: {
              city: doc.location?.city ?? 'Unknown',
              latitude: doc.location?.latitude ?? 0,
              longitude: doc.location?.longitude ?? 0,
            },
            profilePicture: doc.profilePicture ?? null,
            description: doc.description ?? null,
          };
        });
      } else {
        // No proximity filter — use regular find() with compound sort
        const [countResult, docs] = await Promise.all([
          User.countDocuments(baseFilter),
          User.find(baseFilter)
            .select('-password')
            .sort({ ratings: -1, reviewCount: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        ]);

        total = countResult;
        workers = docs.map((doc: any) => ({
          id: String(doc._id),
          name: doc.name,
          workerCategory: (doc as any).workerCategory ?? 'general',
          dailyRate: (doc as any).dailyRate ?? null,
          skills: (doc as any).skills ?? [],
          ratings: doc.ratings ?? 5,
          reviewCount: doc.reviewCount ?? 0,
          isVerified: doc.isVerified,
          is_available: (doc as any).is_available ?? false,
          distanceKm: null,
          relevanceScore: computeDocScore(doc as any, q, null, radiusInKm),
          matchedOn: detectMatchedFields(doc as any, q),
          location: {
            city: doc.location?.city ?? 'Unknown',
            latitude: doc.location?.latitude ?? 0,
            longitude: doc.location?.longitude ?? 0,
          },
          profilePicture: doc.profilePicture ?? null,
          description: doc.description ?? null,
        }));
      }
    }

    // 2. Build and send the paginated response
    const totalPages = Math.ceil(total / limit);
    const response: SearchWorkersResponse = {
      workers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      queryMeta: { q, activeChips: chips, latitude, longitude, radiusInKm },
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('Error in searchAndFilterWorkers:', error);
    res.status(500).json({
      message: 'Server error while searching workers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

// ---------------------------------------------------------------------------
// getNearestAvailableWorkers — instant-dispatch discovery
// ---------------------------------------------------------------------------

/** Validated + parsed form of req.query for the /nearest-available endpoint */
interface NearestAvailableQuery {
  latitude: number;
  longitude: number;
  radiusInKm: number;
  category: string;
  page: number;
  limit: number;
}

/** Slim worker profile optimized for the dispatch "Hire Now" list */
interface DispatchWorkerProfile {
  id: string;
  name: string;
  workerCategory: string;
  dailyWageRate: number | null;
  skills: string[];
  ratings: number;
  reviewCount: number;
  isVerified: boolean;
  is_online: boolean;
  is_available: boolean;
  distanceKm: number;
  currentLocation: { latitude: number; longitude: number };
  profilePicture: string | null;
}

interface DispatchWorkersResponse {
  workers: DispatchWorkerProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  queryMeta: {
    latitude: number;
    longitude: number;
    radiusInKm: number;
    category: string;
  };
}

function parseNearestAvailableQuery(
  raw: Record<string, unknown>
): { data: NearestAvailableQuery } | { errors: QueryValidationError[] } {
  const errors: QueryValidationError[] = [];

  const lat = parseFloat(raw.latitude as string);
  const lon = parseFloat(raw.longitude as string);
  const radiusRaw = raw.radiusInKm != null ? parseFloat(raw.radiusInKm as string) : 15;
  const page = parseInt((raw.page as string) || '1', 10);
  const limit = Math.min(parseInt((raw.limit as string) || '20', 10), 100);

  if (isNaN(lat) || lat < -90 || lat > 90) {
    errors.push({ field: 'latitude', message: 'Must be a number between -90 and 90.' });
  }
  if (isNaN(lon) || lon < -180 || lon > 180) {
    errors.push({ field: 'longitude', message: 'Must be a number between -180 and 180.' });
  }
  // Dispatch radius is intentionally bounded tighter than the browse endpoint (5–15km typical use case, capped at 50)
  if (isNaN(radiusRaw) || radiusRaw <= 0 || radiusRaw > 50) {
    errors.push({ field: 'radiusInKm', message: 'Must be a positive number up to 50 km.' });
  }
  if (!raw.category || typeof raw.category !== 'string' || raw.category.trim() === '') {
    errors.push({ field: 'category', message: 'Worker category is required (e.g. "mason", "helper").' });
  }
  if (isNaN(page) || page < 1) {
    errors.push({ field: 'page', message: 'Must be a positive integer.' });
  }
  if (isNaN(limit) || limit < 1) {
    errors.push({ field: 'limit', message: 'Must be a positive integer (max 100).' });
  }

  if (errors.length > 0) return { errors };

  return {
    data: {
      latitude: lat,
      longitude: lon,
      radiusInKm: radiusRaw,
      category: (raw.category as string).trim().toLowerCase(),
      page,
      limit,
    },
  };
}

/**
 * GET /api/users/nearest-available
 *
 * Powers the Employer's "Hire Now" instant-dispatch flow. Unlike the browse
 * endpoints above, this requires BOTH is_online and is_available to be true
 * (not just is_available), and always requires a category — an employer
 * dispatching a job always knows what kind of worker they need.
 *
 * Query params:
 *   latitude    — number, required
 *   longitude   — number, required
 *   radiusInKm  — number, default 15, max 50 (typical dispatch range is 5–15km)
 *   category    — string, required (e.g. "mason", "helper", "electrician")
 *   page        — integer ≥ 1, default 1
 *   limit       — integer 1–100, default 20
 *
 * Returns workers sorted nearest-first (MongoDB $near / in-memory Haversine).
 */
export const getNearestAvailableWorkers = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = parseNearestAvailableQuery(req.query as Record<string, unknown>);
    if ('errors' in parsed) {
      res.status(400).json({ message: 'Invalid query parameters', errors: parsed.errors });
      return;
    }

    const { latitude, longitude, radiusInKm, category, page, limit } = parsed.data;
    const skip = (page - 1) * limit;
    const useMemoryStore = mongoose.connection.readyState !== 1;

    let workers: DispatchWorkerProfile[] = [];
    let total = 0;

    if (useMemoryStore) {
      // ── In-memory fallback ─────────────────────────────────────────────
      const result = await findNearestAvailableWorkers({
        latitude,
        longitude,
        radiusInKm,
        category,
        page,
        limit,
      });

      total = result.total;
      workers = result.workers.map((u: any) => ({
        id: u._id,
        name: u.name,
        workerCategory: u.workerCategory ?? category,
        dailyWageRate: u.dailyRate ?? null,
        skills: u.skills ?? [],
        ratings: u.ratings ?? 5,
        reviewCount: u.reviewCount ?? 0,
        isVerified: u.isVerified ?? false,
        is_online: u.is_online ?? false,
        is_available: u.is_available ?? false,
        distanceKm: u.distanceKm,
        currentLocation: {
          latitude: u.location?.latitude ?? 0,
          longitude: u.location?.longitude ?? 0,
        },
        profilePicture: u.profilePicture ?? null,
      }));
    } else {
      // ── MongoDB: $near sorted ascending by distance automatically ──────
      const dbFilter: Record<string, unknown> = {
        currentRole: 'worker',
        is_online: true,
        is_available: true,
        workerCategory: { $regex: new RegExp(`^${category}$`, 'i') },
        currentLocation: {
          $near: {
            $geometry: { type: 'Point', coordinates: [longitude, latitude] },
            $maxDistance: radiusInKm * 1000, // metres
          },
        },
      };

      const countFilter: Record<string, unknown> = {
        currentRole: 'worker',
        is_online: true,
        is_available: true,
        workerCategory: { $regex: new RegExp(`^${category}$`, 'i') },
        currentLocation: {
          $geoWithin: { $centerSphere: [[longitude, latitude], radiusInKm / 6371] },
        },
      };

      total = await User.countDocuments(countFilter);

      const docs = await User.find(dbFilter)
        .select('-password')
        .skip(skip)
        .limit(limit)
        .lean();

      workers = docs.map((doc: any) => {
        const workerLat: number = doc.location?.latitude ?? 0;
        const workerLon: number = doc.location?.longitude ?? 0;
        const dLat = ((workerLat - latitude) * Math.PI) / 180;
        const dLon = ((workerLon - longitude) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((latitude * Math.PI) / 180) *
            Math.cos((workerLat * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
        const distanceKm = parseFloat((6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));

        return {
          id: String(doc._id),
          name: doc.name,
          workerCategory: doc.workerCategory ?? category,
          dailyWageRate: doc.dailyRate ?? null,
          skills: doc.skills ?? [],
          ratings: doc.ratings ?? 5,
          reviewCount: doc.reviewCount ?? 0,
          isVerified: doc.isVerified ?? false,
          is_online: doc.is_online ?? false,
          is_available: doc.is_available ?? false,
          distanceKm,
          currentLocation: { latitude: workerLat, longitude: workerLon },
          profilePicture: doc.profilePicture ?? null,
        };
      });
    }

    const totalPages = Math.ceil(total / limit);
    const response: DispatchWorkersResponse = {
      workers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      queryMeta: { latitude, longitude, radiusInKm, category },
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('Error in getNearestAvailableWorkers:', error);
    res.status(500).json({
      message: 'Server error while fetching nearest available workers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

