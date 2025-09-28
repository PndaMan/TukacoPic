import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set, get) => ({
  // State
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,

  // Actions
  setUser: (user) => set({ user }),

  setTokens: (accessToken) => set({
    accessToken,
    isAuthenticated: true
  }),

  clearAuth: () => set({
    user: null,
    accessToken: null,
    isAuthenticated: false
  }),

  setLoading: (isLoading) => set({ isLoading }),

  // Auth methods
  login: async (username, password) => {
    try {
      set({ isLoading: true });

      const response = await api.post('/token/', {
        username,
        password
      });

      const { access } = response.data;

      // Store access token in memory
      set({
        accessToken: access,
        isAuthenticated: true,
        isLoading: false
      });

      // Fetch user profile
      const profileResponse = await api.get('/profile/');
      set({ user: profileResponse.data.user });

      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed'
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
    } catch (error) {
      set({ isLoading: false });
      return {
        success: false,
        error: error.response?.data || 'Registration failed'
      };
    }
  },

  logout: async () => {
    try {
      // Clear the refresh token cookie by calling a logout endpoint
      // Note: We could add a logout endpoint in Django that clears the cookie
      await api.post('/logout/').catch(() => {
        // Ignore errors - we still want to clear local state
      });
    } finally {
      // Clear local auth state
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false
      });

      // Clear axios header
      delete api.defaults.headers.common['Authorization'];
    }
  },

  // Check if user is authenticated (for app initialization)
  checkAuth: async () => {
    try {
      // Try to refresh the token using the httpOnly cookie
      const response = await api.post('/token/refresh/');
      const { access } = response.data;

      set({
        accessToken: access,
        isAuthenticated: true
      });

      // Fetch user profile
      const profileResponse = await api.get('/profile/');
      set({ user: profileResponse.data.user });

      return true;
    } catch (error) {
      // If refresh fails, user is not authenticated
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false
      });
      return false;
    }
  }
}));

export default useAuthStore;