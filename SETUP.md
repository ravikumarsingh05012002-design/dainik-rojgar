# Getting Started - Dainik Rojgar

## Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- MongoDB (local or Atlas)
- Expo CLI (for mobile development)

## Project Setup

### 1. Install Dependencies

From the root directory:
```bash
npm run install-all
```

Or manually:
```bash
# Install root dependencies
npm install

# Install backend dependencies
npm install --prefix backend

# Install frontend dependencies
npm install --prefix frontend
```

### 2. Environment Setup

Create a `.env` file in the `backend` directory:

```bash
cd backend
cp .env.example .env
```

Then edit `.env` with your configuration:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/dainik-rojgar
JWT_SECRET=your-secret-key
```

### 3. Start Development Servers

#### Option A: Run both concurrently
```bash
npm run dev
```

#### Option B: Run separately

**Backend:**
```bash
npm run backend
```

**Frontend:**
```bash
npm run frontend
```

## Project Structure

```
Dainik Rojgar/
├── frontend/                    # React Native (Expo) App
│   ├── src/
│   │   ├── screens/            # Screen components
│   │   ├── components/         # Reusable components
│   │   ├── services/           # API services
│   │   ├── navigation/         # Navigation setup
│   │   └── utils/              # Utility functions
│   ├── App.tsx                 # Root component
│   ├── app.json                # Expo configuration
│   └── package.json
│
├── backend/                     # Node.js Express API
│   ├── src/
│   │   ├── models/             # Database schemas
│   │   ├── controllers/        # Route handlers
│   │   ├── routes/             # API routes
│   │   ├── middleware/         # Express middleware
│   │   └── server.ts           # Entry point
│   ├── .env.example            # Environment template
│   ├── tsconfig.json           # TypeScript config
│   └── package.json
│
└── README.md
```

## Key Features Implemented

- ✅ User authentication (sign up/login)
- ✅ Two user types (Worker & Employer)
- ✅ Job listing with filtering
- ✅ Job application system
- ✅ User profiles
- ✅ Location-based job search

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user
- `POST /api/auth/login` - Login user

### Jobs
- `GET /api/jobs` - Get all jobs (with filters)
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs` - Post new job (authenticated)
- `POST /api/jobs/:id/apply` - Apply for job (authenticated)

### Users
- `GET /api/users/profile` - Get user profile (authenticated)
- `PUT /api/users/profile` - Update profile (authenticated)

## Development Tips

1. **Mobile Development**: Use Expo Go app to test on your phone
2. **API Testing**: Use Postman to test endpoints
3. **Database**: Set up MongoDB locally or use MongoDB Atlas
4. **Hot Reload**: Both frontend and backend support hot reload during development

## Next Steps

1. Connect to MongoDB
2. Implement remaining screens (HomeScreen, PostJobScreen, etc.)
3. Add location services
4. Implement real-time chat
5. Add payment integration
6. Deploy to production

## Troubleshooting

**Port already in use:**
```bash
# Backend
lsof -i :5000
kill -9 <PID>

# Frontend
npx expo-cli start -c
```

**MongoDB connection error:**
- Verify MongoDB is running
- Check connection string in `.env`

## Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Navigation](https://reactnavigation.org)
- [Express.js](https://expressjs.com)
- [MongoDB](https://www.mongodb.com)
