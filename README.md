# Dainik Rojgar 🏢👷

A mobile application connecting daily wage workers with local employers for job opportunities.

## Project Overview

Dainik Rojgar is a two-sided marketplace that:
- **For Workers**: Provides access to daily job opportunities based on location
- **For Employers**: Allows posting job listings and hiring workers

## Tech Stack

- **Frontend**: React Native (Expo)
- **Backend**: Node.js + Express
- **Database**: MongoDB (or PostgreSQL)
- **Authentication**: JWT
- **Real-time Updates**: WebSockets

## Project Structure

```
Dainik Rojgar/
├── frontend/              # React Native Expo app
│   ├── src/
│   ├── app.json
│   ├── package.json
│   └── ...
├── backend/               # Node.js Express API
│   ├── src/
│   ├── .env
│   ├── package.json
│   └── ...
├── README.md
└── .gitignore
```

## Quick Start

### Frontend Setup
```bash
cd frontend
npm install
npx expo start
```

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

## Features

- [x] User Authentication (Login/Signup)
- [x] Worker Profiles
- [x] Employer Profiles
- [ ] Job Listing Feed
- [ ] Job Posting
- [ ] Real-time Chat
- [ ] Payment Integration
- [ ] Reviews & Ratings

## Development

- Frontend runs on Expo (http://localhost:19000)
- Backend runs on http://localhost:5000

## Environment Setup

Create `.env` files in both frontend and backend directories with necessary environment variables.

## Contributing

Please read our contributing guidelines before submitting pull requests.

## License

MIT
