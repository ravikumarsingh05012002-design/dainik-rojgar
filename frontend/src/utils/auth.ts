import { authService } from '../services/api';
import { useRoleStore } from './roleStore';

/**
 * Comprehensive logout utility
 * Clears all auth tokens, user data, and resets role store
 */
export async function logout() {
  try {
    // Clear tokens and user data from AsyncStorage
    await authService.logout();
    
    // Reset zustand role store to defaults
    useRoleStore.getState().reset();
    
    console.log('Logout successful - all data cleared');
  } catch (error) {
    console.error('Error during logout:', error);
    // Still attempt to clear local state even if something fails
    useRoleStore.getState().reset();
  }
}

/**
 * Check if user is authenticated
 * Returns true if token exists in storage
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const token = await AsyncStorage.getItem('token');
    return !!token;
  } catch (error) {
    console.error('Error checking auth status:', error);
    return false;
  }
}
