import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

interface User {
  id: number;
  username: string;
  email: string;
  profile_picture?: string;
  banner_image?: string;
  badge?: string;
  bio?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: {
    username: string;
    email: string;
    password: string;
  }) => Promise<{ success: boolean; error?: any }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  setUser: (user) => set({ user }),

  login: async (username, password) => {
    try {
      set({ isLoading: true });

      const response = await api.post('/token/', { username, password });
      const { access, refresh } = response.data;

      await SecureStore.setItemAsync('accessToken', access);
      if (refresh) {
        await SecureStore.setItemAsync('refreshToken', refresh);
      }

      // Fetch user profile
      const profileResponse = await api.get('/profile/');
      set({
        user: profileResponse.data.user,
        isAuthenticated: true,
        isLoading: false,
      });

      return { success: true };
    } catch (error: any) {
      set({ isLoading: false });
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed',
      };
    }
  },

  register: async (userData) => {
    try {
      set({ isLoading: true });
      await api.post('/users/register/', userData);

      // Auto-login after registration
      const loginResult = await get().login(userData.username, userData.password);
      set({ isLoading: false });
      return loginResult;
    } catch (error: any) {
      set({ isLoading: false });
      return {
        success: false,
        error: error.response?.data || 'Registration failed',
      };
    }
  },

  logout: async () => {
    // Set state first to prevent further authenticated requests
    set({
      user: null,
      isAuthenticated: false,
    });
    try {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
    } catch {
      // Ignore cleanup errors
    }
  },

  checkAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        set({ isInitialized: true });
        return false;
      }

      const profileResponse = await api.get('/profile/');
      set({
        user: profileResponse.data.user,
        isAuthenticated: true,
        isInitialized: true,
      });
      return true;
    } catch {
      // Try refresh
      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const response = await api.post('/token/refresh/', {
          refresh: refreshToken,
        });
        const { access, refresh } = response.data;

        await SecureStore.setItemAsync('accessToken', access);
        if (refresh) {
          await SecureStore.setItemAsync('refreshToken', refresh);
        }

        const profileResponse = await api.get('/profile/');
        set({
          user: profileResponse.data.user,
          isAuthenticated: true,
          isInitialized: true,
        });
        return true;
      } catch {
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        set({
          user: null,
          isAuthenticated: false,
          isInitialized: true,
        });
        return false;
      }
    }
  },
}));
