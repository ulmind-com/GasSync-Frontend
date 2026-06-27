import axios from 'axios';


// Backend base URL. Set VITE_API_URL (e.g. on Vercel) to call the backend
// directly; otherwise fall back to the relative path served by the Vite dev
// proxy / the vercel.json rewrite.
export const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

// In-memory token cache for faster access and as fallback
let cachedToken: string | null = null;

export const setCachedToken = (token: string | null) => {
  cachedToken = token;
};

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor to inject JWT token automatically
api.interceptors.request.use(async (config) => {
  // Try localStorage first, fall back to in-memory cache
  let token: string | null = null;
  try {
    token = localStorage.getItem('accessToken');
  } catch (e) {
    // localStorage can fail in some strict environments (e.g. private browsing)
    console.warn('[Axios] localStorage read failed, using cached token');
  }
  
  if (!token && cachedToken) {
    token = cachedToken;
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    // Keep cache in sync
    if (token !== cachedToken) {
      cachedToken = token;
    }
  }
  return config;
});
