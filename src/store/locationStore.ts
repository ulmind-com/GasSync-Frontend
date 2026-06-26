import { create } from 'zustand';

export type StationFilter = 'all' | 'open' | 'top_rated' | 'car_wash';

interface LocationState {
  lat: number | null;
  lon: number | null;
  name: string;
  radiusMiles: number;
  activeFilter: StationFilter;
  setLocation: (lat: number, lon: number, name: string) => void;
  setRadius: (radiusMiles: number) => void;
  setFilter: (filter: StationFilter) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  lat: null,
  lon: null,
  name: 'Locating...',
  radiusMiles: 15,
  activeFilter: 'all',
  setLocation: (lat, lon, name) => set({ lat, lon, name }),
  setRadius: (radiusMiles) => set({ radiusMiles }),
  setFilter: (activeFilter) => set({ activeFilter }),
}));
