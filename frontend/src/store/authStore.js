import { create } from 'zustand';
import api from '../utils/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  subscription: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  loading: false,
  initialized: false,

  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ accessToken, refreshToken });
  },

  clearAuth: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, subscription: null, accessToken: null, refreshToken: null });
  },

  initialize: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return set({ initialized: true });

    try {
      set({ loading: true });
      const { data } = await api.get('/auth/me');
      set({ user: data.user, subscription: data.subscription, initialized: true, loading: false });
    } catch {
      get().clearAuth();
      set({ initialized: true, loading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('api/auth/login', { email, password });
    get().setTokens(data.accessToken, data.refreshToken);
    set({ user: data.user, subscription: data.subscription });
    return data;
  },

  register: async (payload) => {
    const { data } = await api.post('api/auth/register', payload);
    get().setTokens(data.accessToken, data.refreshToken);
    set({ user: data.user, subscription: null });
    return data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout', { refreshToken: get().refreshToken });
    } catch {}
    get().clearAuth();
  },

  refreshUser: async () => {
    const { data } = await api.get('/auth/me');
    set({ user: data.user, subscription: data.subscription });
  },
}));
