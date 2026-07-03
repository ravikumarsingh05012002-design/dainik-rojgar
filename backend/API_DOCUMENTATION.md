# Dainik Rojgar - Job Requirement API Documentation

## `POST /api/jobs/requirements` - Create Job Requirement

**Description:**
Creates a new job requirement posted by an Employer (Malik). This endpoint validates employer credentials, worker category, count, daily wage rate, and geolocation before storing the requirement.

---

## Request

### Endpoint

```
POST /api/jobs/requirements
```

### Authentication

**Required:** Yes (Bearer Token in Authorization header)

```
Authorization: Bearer <jwt_token>
```

### Headers

```
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

### Request Body Schema

```typescript
interface CreateJobRequirementPayload {
  employerId: string;                    // MongoDB ObjectId or unique employer ID
  workerCategory: string;                // e.g., "mason", "painter", "helper", "electrician", "plumber"
  requiredWorkersCount: number;          // Positive integer (>0)
  dailyWageRate: number;                 // Positive number (>0) in INR
  jobDescription: string;                // Min 10 characters
  geoCoordinates: {
    latitude: number;                    // -90 to 90
    longitude: number;                   // -180 to 180
  };
  location?: {                           // Optional location details
    city?: string;
    address?: string;
  };
  skills?: string[];                     // Optional: ["skill1", "skill2", ...]
  urgency?: "low" | "medium" | "high";   // Default: "medium"
  estimatedDays?: number;                // Positive integer (>0). Default: 1
}
```

### Example Request

```bash
curl -X POST http://localhost:5000/api/jobs/requirements \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "employerId": "507f1f77bcf86cd799439011",
    "workerCategory": "mason",
    "requiredWorkersCount": 3,
    "dailyWageRate": 500,
    "jobDescription": "Need experienced masons for foundation work and wall construction. Must have 5+ years experience.",
    "geoCoordinates": {
      "latitude": 26.9124,
      "longitude": 75.7873
    },
    "location": {
      "city": "Jaipur",
      "address": "Sector 12, Bhankrota"
    },
    "skills": ["concrete_work", "wall_building"],
    "urgency": "high",
    "estimatedDays": 7
  }'
```

---

## Response

### Success Response (201 Created)

```json
{
  "message": "Job requirement posted successfully",
  "job": {
    "id": "507f191e810c19729de860ea",
    "title": "3 mason(s) needed",
    "category": "mason",
    "requiredWorkers": 3,
    "dailyWageRate": 500,
    "currency": "INR",
    "location": {
      "city": "Jaipur",
      "coordinates": {
        "latitude": 26.9124,
        "longitude": 75.7873
      }
    },
    "urgency": "high",
    "estimatedDays": 7,
    "status": "open",
    "employerId": "507f1f77bcf86cd799439011",
    "createdAt": "2026-07-02T16:50:30.123Z"
  }
}
```

### Error Responses

#### 400 Bad Request - Validation Error

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "requiredWorkersCount",
      "message": "Required workers count must be a positive integer"
    },
    {
      "field": "geoCoordinates.latitude",
      "message": "Latitude must be a number between -90 and 90"
    }
  ]
}
```

#### 400 Bad Request - Invalid Employer ID

```json
{
  "message": "Invalid employer ID format",
  "error": "Cast to ObjectId failed for value \"invalid_id\""
}
```

#### 401 Unauthorized - Missing Authentication

```json
{
  "message": "Not authenticated"
}
```

#### 500 Internal Server Error

```json
{
  "message": "Server error while creating job requirement",
  "error": "Internal server error" // In production, error details are hidden
}
```

---

## Validation Rules

| Field | Type | Constraints | Example |
| ------- | ------ | ----------- | --------- |
| `employerId` | string | Non-empty, valid MongoDB ID | `"507f1f77bcf86cd799439011"` |
| `workerCategory` | string | Non-empty | `"mason"`, `"painter"`, `"helper"` |
| `requiredWorkersCount` | number | Integer > 0 | `3`, `5`, `10` |
| `dailyWageRate` | number | Number > 0 | `500`, `750.50`, `1000` |
| `jobDescription` | string | Min 10 characters | `"Need 3 experienced masons..."` |
| `geoCoordinates.latitude` | number | -90 to 90 | `26.9124`, `0`, `-45.5` |
| `geoCoordinates.longitude` | number | -180 to 180 | `75.7873`, `0`, `-120.3` |
| `urgency` | string | `"low"`, `"medium"`, `"high"` | `"high"` |
| `estimatedDays` | number | Integer > 0 | `1`, `7`, `30` |

---

## Features

✅ **Robust Validation**

- All required fields validated with detailed error messages
- Geographic coordinate validation (latitude/longitude ranges)
- Type safety with TypeScript interfaces

✅ **Error Handling**

- Structured JSON error responses
- Specific HTTP status codes (400, 401, 500)
- Development vs. production error visibility
- MongoDB-specific error handling (ValidationError, CastError)

✅ **Database Flexibility**

- Works with both MongoDB and in-memory store
- Automatic fallback if database is unavailable
- Proper geolocation storage with Point coordinates

✅ **Production Ready**

- Async/await for clean code flow
- Proper middleware integration
- Authentication required
- Secure error logging
- Automatic date calculations (start/end dates, duration)

---

## Integration Example (Node.js/Axios)

```typescript
import axios from 'axios';

interface JobRequirement {
  employerId: string;
  workerCategory: string;
  requiredWorkersCount: number;
  dailyWageRate: number;
  jobDescription: string;
  geoCoordinates: { latitude: number; longitude: number };
}

async function postJobRequirement(
  jobData: JobRequirement,
  authToken: string
) {
  try {
    const response = await axios.post(
      'http://localhost:5000/api/jobs/requirements',
      jobData,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    console.log('✅ Job Posted:', response.data.job);
    return response.data.job;
  } catch (error: any) {
    if (error.response?.status === 400) {
      console.error('❌ Validation Error:', error.response.data.errors);
    } else if (error.response?.status === 401) {
      console.error('❌ Authentication Error: Invalid token');
    } else {
      console.error('❌ Server Error:', error.message);
    }
  }
}

// Usage
const jobRequirement: JobRequirement = {
  employerId: '507f1f77bcf86cd799439011',
  workerCategory: 'mason',
  requiredWorkersCount: 3,
  dailyWageRate: 500,
  jobDescription:
    'Need experienced masons for foundation work and wall construction.',
  geoCoordinates: {
    latitude: 26.9124,
    longitude: 75.7873,
  },
};

postJobRequirement(jobRequirement, 'your_jwt_token');
```

---

## Files Modified

1. **[jobController.ts](src/controllers/jobController.ts)**
   - Added `CreateJobRequirementPayload` interface
   - Added `GeoCoordinates` interface
   - Added `ValidationError` interface
   - Added `validateJobRequirement()` validation helper
   - Added `createJobRequirement()` controller function

2. **[jobs.ts](src/routes/jobs.ts)**
   - Imported `createJobRequirement` from controller
   - Added new route: `POST /requirements`
   - Protected with `authMiddleware`

---

## Status Codes

| Code | Meaning | When Used |
| ------ | --------- | ----------- |
| 201 | Created | Job requirement successfully created |
| 400 | Bad Request | Validation errors or invalid data format |
| 401 | Unauthorized | Missing or invalid authentication token |
| 500 | Internal Server Error | Database error or unexpected server error |

---

## Notes

- The function automatically calculates `startDate` (now) and `endDate` based on `estimatedDays`
- Default `urgency` is `"medium"` if not provided
- Default `estimatedDays` is `1` if not provided
- All timestamps are stored in UTC and returned as ISO 8601 strings
- Geolocation data is stored in GeoJSON Point format for efficient spatial queries
- Database fallback ensures the system works even without MongoDB connection
