# Dainik Rojgar - Architecture & Design

## System Overview

Dainik Rojgar is a mobile-first marketplace connecting daily wage workers with local employers. The application uses a client-server architecture with a React Native frontend and Node.js backend.

## Technology Stack

### Frontend
- **Framework**: React Native (Expo)
- **Navigation**: React Navigation
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Location Services**: Expo Location

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT
- **Language**: TypeScript

### Database
- **Primary**: MongoDB
- **Optional**: PostgreSQL (future)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           React Native Mobile App (Expo)             │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │   │
│  │  │  Screens    │  │  Components  │  │  Services  │  │   │
│  │  │  - Auth     │  │  - UI        │  │  - API     │  │   │
│  │  │  - Jobs     │  │  - Forms     │  │  - Storage │  │   │
│  │  │  - Profile  │  │              │  │            │  │   │
│  │  └─────────────┘  └──────────────┘  └────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↕ (HTTP/REST)
┌─────────────────────────────────────────────────────────────┐
│                     SERVER LAYER                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Express.js REST API                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │   │
│  │  │   Routes     │  │ Controllers  │  │ Middleware │ │   │
│  │  │  - /auth     │  │  - Auth      │  │  - Auth    │ │   │
│  │  │  - /jobs     │  │  - Jobs      │  │  - CORS    │ │   │
│  │  │  - /users    │  │  - Users     │  │  - Logging │ │   │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Models & Database Logic                             │   │
│  │  ┌──────────────┐  ┌──────────────┐                 │   │
│  │  │ User Model   │  │ Job Model    │                 │   │
│  │  │              │  │              │                 │   │
│  │  └──────────────┘  └──────────────┘                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↕ (MongoDB Driver)
┌─────────────────────────────────────────────────────────────┐
│                   DATA LAYER                                 │
│              MongoDB Database                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Users         │  │Jobs          │  │Applications  │      │
│  │- id          │  │- id          │  │- jobId       │      │
│  │- email       │  │- title       │  │- userId      │      │
│  │- password    │  │- description │  │- status      │      │
│  │- userType    │  │- payRate     │  │- appliedAt   │      │
│  │- location    │  │- location    │  │              │      │
│  │- ratings     │  │- applicants  │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Data Models

### User Model
```typescript
interface User {
  _id: ObjectId
  name: string
  email: string (unique)
  phone: string
  password: string (hashed)
  userType: "worker" | "employer"
  profilePicture?: string
  description?: string
  location: {
    latitude: number
    longitude: number
    city: string
  }
  ratings: number (1-5)
  reviewCount: number
  isVerified: boolean
  createdAt: Date
  updatedAt: Date
}
```

### Job Model
```typescript
interface Job {
  _id: ObjectId
  title: string
  description: string
  employer: ObjectId (ref: User)
  category: string
  payRate: number
  currency: string
  location: {
    latitude: number
    longitude: number
    city: string
    address: string
  }
  startDate: Date
  endDate: Date
  duration: "hourly" | "daily" | "weekly" | "monthly"
  requiredSkills?: string[]
  applicants: ObjectId[] (ref: User)
  status: "open" | "closed" | "filled"
  views: number
  createdAt: Date
  updatedAt: Date
}
```

## API Design

### RESTful Endpoints

#### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

#### Jobs
- `GET /api/jobs?city=&category=&page=&limit=` - List jobs with filters
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs` - Create job (employer only)
- `POST /api/jobs/:id/apply` - Apply for job (worker only)
- `PUT /api/jobs/:id` - Update job (owner only)
- `DELETE /api/jobs/:id` - Delete job (owner only)

#### Users
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/:id` - Get user public profile
- `POST /api/users/reviews` - Post review (future)

## Authentication Flow

1. **Sign Up**
   - User provides: name, email, phone, password, user type
   - Backend: Hash password → Create user → Generate JWT token
   - Frontend: Store token in AsyncStorage → Navigate to home

2. **Login**
   - User provides: email, password
   - Backend: Verify credentials → Generate JWT token
   - Frontend: Store token → Auto-login on app start

3. **Protected Routes**
   - Frontend: Include token in Authorization header
   - Backend: Validate token → Proceed or reject request

## State Management

Using Zustand for simple, efficient state management:

```typescript
// Example store
import create from 'zustand';

interface AuthStore {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  login: (user, token) => set({ user, token }),
  logout: () => set({ user: null, token: null }),
}));
```

## File Structure

```
frontend/
├── src/
│   ├── screens/              # Full-screen components
│   │   ├── LoginScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── JobDetailScreen.tsx
│   │   └── ...
│   ├── components/           # Reusable components
│   │   ├── JobCard.tsx
│   │   ├── UserCard.tsx
│   │   └── ...
│   ├── services/             # API & external services
│   │   ├── api.ts           # Axios instance & interceptors
│   │   ├── authService.ts
│   │   └── jobService.ts
│   ├── navigation/           # Navigation setup
│   │   └── RootNavigator.tsx
│   ├── utils/                # Helper functions
│   │   ├── storage.ts       # AsyncStorage helpers
│   │   └── ...
│   └── stores/               # Zustand stores
│       ├── authStore.ts
│       └── jobStore.ts
└── App.tsx

backend/
├── src/
│   ├── models/               # Database schemas
│   │   ├── User.ts
│   │   ├── Job.ts
│   │   └── ...
│   ├── controllers/          # Route handlers
│   │   ├── authController.ts
│   │   ├── jobController.ts
│   │   └── userController.ts
│   ├── routes/               # API routes
│   │   ├── auth.ts
│   │   ├── jobs.ts
│   │   └── users.ts
│   ├── middleware/           # Express middleware
│   │   ├── auth.ts          # JWT verification
│   │   └── ...
│   ├── utils/                # Helper functions
│   ├── config/               # Configuration files
│   └── server.ts            # Entry point
```

## Security Considerations

1. **Password Hashing**: bcryptjs with salt rounds = 10
2. **JWT Secrets**: Use strong, random secret keys
3. **CORS**: Configure allowed origins
4. **Validation**: Input validation on both client and server
5. **Environment Variables**: Never commit sensitive data
6. **HTTPS**: Use in production
7. **Rate Limiting**: Implement for auth endpoints (future)

## Scalability Features

1. **Database Indexing**: 
   - email field indexed for quick lookup
   - location fields for geo-queries

2. **API Pagination**: Jobs list supports pagination

3. **Caching**: Can add Redis for session caching (future)

4. **Load Balancing**: Can scale horizontally with PM2/Docker

## Testing Strategy

- **Unit Tests**: Components and utilities
- **Integration Tests**: API endpoints
- **E2E Tests**: Full user flows (future)

## Deployment

### Frontend
- Expo EAS Build for iOS/Android builds
- Expo Updates for OTA updates

### Backend
- Docker containerization
- PM2 process management
- Cloud deployment (AWS, Heroku, DigitalOcean)

## Future Enhancements

1. Real-time notifications (WebSocket)
2. In-app messaging/chat
3. Payment integration (Stripe/Razorpay)
4. Reviews & ratings system
5. Advanced search & filters
6. Maps integration
7. Push notifications
8. Video verification
9. Analytics dashboard
10. Admin panel

## Performance Optimizations

1. Image compression and lazy loading
2. Query optimization with MongoDB indexes
3. Response caching
4. CDN for static assets
5. Database query pagination
6. Component code splitting

## Monitoring & Logging

- Server-side logging with Winston/Morgan
- Error tracking (Sentry optional)
- Performance monitoring
- User analytics
