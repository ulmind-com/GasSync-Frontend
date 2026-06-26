import { create } from 'zustand';

import { api, setCachedToken } from '../lib/axios';

interface User {
  id: string;
  _id?: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  preferredFuelType: string;
  pushNotificationsEnabled: boolean;
  favorites: any[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  setFavorites: (favorites: any[]) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  login: async (token, user) => {
    localStorage.setItem('accessToken', token);
    setCachedToken(token);
    set({ token, user });
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore errors on logout
    }
    localStorage.removeItem('accessToken');
    setCachedToken(null);
    set({ token: null, user: null });
  },
  fetchUser: async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setCachedToken(null);
        set({ isLoading: false });
        return;
      }
      
      setCachedToken(token);
      const response = await api.get('/auth/me');
      set({ user: response.data.data, token, isLoading: false });
    } catch (error) {
      localStorage.removeItem('accessToken');
      setCachedToken(null);
      set({ user: null, token: null, isLoading: false });
    }
  },
  setFavorites: (favorites) => set((state) => ({
    user: state.user ? { ...state.user, favorites } : null
  })),
}));
