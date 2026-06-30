import { create } from 'zustand';

export type StationFilter = 'all' | 'open' | 'top_rated' | 'car_wash';
export type SortBy = 'nearby' | 'price_low' | 'price_high';

interface LocationState {
  lat: number | null;
  lon: number | null;
  name: string;
  radiusMiles: number;
  activeFilter: StationFilter;
  sortBy: SortBy;
  selectedFuel: string;
  setLocation: (lat: number, lon: number, name: string) => void;
  setRadius: (radiusMiles: number) => void;
  setFilter: (filter: StationFilter) => void;
  setSortBy: (sortBy: SortBy) => void;
  setSelectedFuel: (selectedFuel: string) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  lat: null,
  lon: null,
  name: 'Locating...',
  radiusMiles: 10,
  activeFilter: 'all',
  sortBy: 'nearby',
  selectedFuel: 'REGULAR_UNLEADED',
  setLocation: (lat, lon, name) => set({ lat, lon, name }),
  setRadius: (radiusMiles) => set({ radiusMiles }),
  setFilter: (activeFilter) => set({ activeFilter }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSelectedFuel: (selectedFuel) => set({ selectedFuel }),
}));
