import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * API Configuration
 * 
 * Development: localhost:5000
 * Production: Railway deployment URL
 * 
 * To use production, update PRODUCTION_API_URL with your Railway URL
 */

const DEVELOPMENT_API_URL = 'http://localhost:5000/api';
const PRODUCTION_API_URL = 'https://dainik-rojgar-production.up.railway.app/api';

// Detect environment - React Native's __DEV__ is available globally
declare const __DEV__: boolean;
const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : true;

const API_URL = isDevelopment ? DEVELOPMENT_API_URL : PRODUCTION_API_URL;

console.log(`🌐 API Mode: ${isDevelopment ? 'Development' : 'Production'}`);
console.log(`📡 API URL: ${API_URL}`);

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// Add token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      AsyncStorage.removeItem('token');
      AsyncStorage.removeItem('user');
    }
    throw error;
  }
);

// ============================================
// AUTH SERVICES
// ============================================
export const authService = {
  // OTP-based login
  sendOTP: (phoneNumber: string) =>
    api.post('/auth/send-otp', { phoneNumber }),
  
  verifyOTP: (phoneNumber: string, otp: string) =>
    api.post('/auth/verify-otp', { phoneNumber, otp }),
  
  // Fallback email/password methods (if needed)
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  signup: (data: any) => 
    api.post('/auth/signup', data),
  
  // Role switching
  switchRole: (newRole: 'employer' | 'worker', workerCategory?: string) =>
    api.patch('/auth/switch-role', { 
      currentRole: newRole,
      workerCategory 
    }),
  
  // Token refresh
  refreshToken: () => 
    api.post('/auth/refresh-token'),
  
  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
  },
};

// ============================================
// USER SERVICES
// ============================================
export const userService = {
  // Profile operations
  getProfile: () => 
    api.get('/users/profile'),
  
  updateProfile: (data: any) => 
    api.put('/users/profile', data),
  
  // Worker discovery (Employer uses this)
  getNearestAvailableWorkers: (params: {
    latitude: number;
    longitude: number;
    category: string;
    radiusInKm?: number;
  }) => 
    api.get('/users/nearest-available', { params }),
  
  // Search workers
  searchWorkers: (params: {
    latitude: number;
    longitude: number;
    category?: string;
    minRating?: number;
    maxDistance?: number;
  }) => 
    api.get('/users/search', { params }),
  
  // Get nearby workers
  getNearbyWorkers: (params: {
    latitude: number;
    longitude: number;
    radiusInKm?: number;
  }) => 
    api.get('/users/nearby', { params }),
  
  // Update live location
  updateLiveLocation: (latitude: number, longitude: number) =>
    api.patch('/users/location', { currentLocation: { latitude, longitude } }),
  
  // Toggle online status
  toggleOnlineStatus: (isOnline: boolean) =>
    api.patch('/users/online-status', { is_online: isOnline }),
  
  // Toggle availability
  toggleAvailability: (isAvailable: boolean) =>
    api.patch('/users/availability', { is_available: isAvailable }),
};

// ============================================
// BOOKING/DISPATCH SERVICES
// ============================================
export const bookingService = {
  // Request a booking (Employer)
  requestBooking: (data: {
    workerId: string;
    workerCategory: string;
    employerLocation: { latitude: number; longitude: number };
    destinationLocation: { latitude: number; longitude: number };
    dailyWageRate: number;
  }) => 
    api.post('/bookings/request', data),
  
  // Get pending bookings for worker
  getWorkerPendingBookings: () =>
    api.get('/bookings/worker/pending'),
  
  // Accept/Decline booking
  respondToBooking: (bookingId: string, data: {
    action: 'accept' | 'decline';
  }) =>
    api.patch(`/bookings/${bookingId}/respond`, data),
  
  // Update booking status (state transitions)
  updateBookingStatus: (bookingId: string, data: {
    status: 'accepted' | 'en_route' | 'ongoing' | 'completed' | 'cancelled';
  }) =>
    api.patch(`/bookings/${bookingId}/status`, data),
  
  // Send live GPS location for current booking
  updateLiveNavigation: (bookingId: string, data: {
    latitude: number;
    longitude: number;
    timestamp?: number;
  }) =>
    api.post(`/bookings/${bookingId}/navigation`, data),
  
  // Get navigation data (where to go)
  getNavigationPayload: (bookingId: string) =>
    api.get(`/bookings/${bookingId}/navigation`),
  
  // Get booking details
  getBookingDetail: (bookingId: string) =>
    api.get(`/bookings/${bookingId}`),
  
  // Get all bookings for user (employer or worker)
  getMyBookings: (params?: { status?: string; limit?: number }) =>
    api.get('/bookings', { params }),
};

// ============================================
// JOB SERVICES
// ============================================
export const jobService = {
  getJobs: (filters?: any) => 
    api.get('/jobs', { params: filters }),
  
  getJobDetail: (id: string) => 
    api.get(`/jobs/${id}`),
  
  postJob: (data: any) => 
    api.post('/jobs', data),
  
  updateJob: (id: string, data: any) =>
    api.put(`/jobs/${id}`, data),
  
  deleteJob: (id: string) =>
    api.delete(`/jobs/${id}`),
  
  applyJob: (jobId: string) => 
    api.post(`/jobs/${jobId}/apply`),
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
export const storageService = {
  setToken: (token: string) =>
    AsyncStorage.setItem('token', token),
  
  getToken: () =>
    AsyncStorage.getItem('token'),
  
  clearToken: () =>
    AsyncStorage.removeItem('token'),
  
  setUser: (user: any) =>
    AsyncStorage.setItem('user', JSON.stringify(user)),
  
  getUser: async () => {
    const user = await AsyncStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  
  clearUser: () =>
    AsyncStorage.removeItem('user'),
};

export default api;
