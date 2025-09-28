import axios from 'axios';
import useAuthStore from '../store/authStore';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  withCredentials: true, // Important: this allows cookies to be sent
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If we get a 401 and haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
        const response = await axios.post(
          `${baseURL}/token/refresh/`,
          {},
          { withCredentials: true }
        );

        const { access } = response.data;

        // Update the access token in store
        useAuthStore.getState().setTokens(access);

        // Update the original request with new token
        originalRequest.headers.Authorization = `Bearer ${access}`;

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear auth state
        useAuthStore.getState().clearAuth();

        // Don't redirect here - let the app's routing handle it
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;