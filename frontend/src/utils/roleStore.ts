import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Lightweight global app-role state with AsyncStorage persistence.
 * Mirrors the backend's `currentRole` field on the User model — flipping
 * this value is what the RoleToggleSwitch component does on the
 * Auth/Role-Selection screen (and, later, from an in-app profile switch).
 */
export type AppRole = 'employer' | 'worker';

interface RoleState {
  currentRole: AppRole;
  isOnline: boolean; // worker-only: Go Online / Go Offline
  setRole: (role: AppRole) => void;
  setOnline: (online: boolean) => void;
  reset: () => void; // Clear state on logout
}

export const useRoleStore = create<RoleState>()(
  persist(
    (set) => ({
      currentRole: 'employer',
      isOnline: false,
      setRole: (role) => set({ currentRole: role }),
      setOnline: (online) => set({ isOnline: online }),
      reset: () => set({ currentRole: 'employer', isOnline: false }),
    }),
    {
      name: 'role-storage', // unique name for AsyncStorage key
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
