import React, { useEffect, useState } from 'react';
import { Navigation, TrendingDown, TrendingUp, X, RotateCcw } from 'lucide-react';
import { useLocationStore } from '../store/locationStore';
import type { StationFilter, SortBy } from '../store/locationStore';

export const FUEL_TYPES: { key: string; label: string }[] = [
  { key: 'REGULAR_UNLEADED', label: 'Regular 87' },
  { key: 'MIDGRADE', label: 'Plus 89' },
  { key: 'PREMIUM', label: 'Premium 93' },
  { key: 'DIESEL', label: 'Diesel' },
  { key: 'E85', label: 'E85 Flex' },
  { key: 'UNL88', label: 'UNL 88' },
];

const SORT_OPTIONS: { key: SortBy; label: string; icon: React.ReactNode }[] = [
  { key: 'nearby', label: 'Nearby', icon: <Navigation size={18} /> },
  { key: 'price_low', label: 'Price (Low to High)', icon: <TrendingDown size={18} /> },
  { key: 'price_high', label: 'Price (High to Low)', icon: <TrendingUp size={18} /> },
];

const RADII = [1, 5, 10, 20, 30];

const DEFAULTS = { sort: 'nearby' as SortBy, radius: 10, filter: 'all' as StationFilter, fuel: 'REGULAR_UNLEADED' };

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function FilterModal({ open, onClose }: Props) {
  const {
    radiusMiles, setRadius,
    activeFilter, setFilter,
    sortBy, setSortBy,
    selectedFuel, setSelectedFuel,
  } = useLocationStore();

  // Draft state so changes only commit on close — keeps the modal snappy.
  const [draftSort, setDraftSort] = useState<SortBy>(sortBy);
  const [draftRadius, setDraftRadius] = useState<number>(radiusMiles);
  const [draftFilter, setDraftFilter] = useState<StationFilter>(activeFilter);
  const [draftFuel, setDraftFuel] = useState<string>(selectedFuel);

  useEffect(() => {
    if (open) {
      setDraftSort(sortBy);
      setDraftRadius(radiusMiles);
      setDraftFilter(activeFilter);
      setDraftFuel(selectedFuel);
    }
  }, [open]);

  if (!open) return null;

  const commitAndClose = () => {
    if (draftSort !== sortBy) setSortBy(draftSort);
    if (draftRadius !== radiusMiles) setRadius(draftRadius);
    if (draftFilter !== activeFilter) setFilter(draftFilter);
    if (draftFuel !== selectedFuel) setSelectedFuel(draftFuel);
    onClose();
  };

  const resetDraft = () => {
    setDraftSort(DEFAULTS.sort);
    setDraftRadius(DEFAULTS.radius);
    setDraftFilter(DEFAULTS.filter);
    setDraftFuel(DEFAULTS.fuel);
  };

  return (
    <div className="fixed inset-0 premium-modal-backdrop z-[110] flex items-end justify-center sm:items-center" onClick={commitAndClose}>
      <div data-lenis-prevent className="premium-modal w-full sm:w-[440px] max-h-[88vh] overflow-y-auto overscroll-contain p-5 pb-10 sm:pb-5" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-xl text-textPrimary">Filter &amp; Sort</h2>
          <div className="flex items-center gap-2">
            <button onClick={resetDraft} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-avatarBg text-primary font-semibold text-[13px] hover:brightness-95 transition-all">
              <RotateCcw size={14} /> Reset
            </button>
            <button onClick={commitAndClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-surfaceMuted text-textMuted hover:text-textPrimary transition-colors"><X size={18} /></button>
          </div>
        </div>

        {/* Sort By */}
        <h3 className="font-semibold text-base text-textPrimary mb-3">Sort By</h3>
        <div className="flex flex-col gap-2">
          {SORT_OPTIONS.map((opt) => {
            const active = draftSort === opt.key;
            return (
              <button key={opt.key} onClick={() => setDraftSort(opt.key)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${active ? 'border-primary bg-avatarBg' : 'border-border bg-surface hover:bg-surfaceMuted'}`}>
                <span className={active ? 'text-primary' : 'text-textMuted'}>{opt.icon}</span>
                <span className={`font-medium text-sm flex-1 text-left ${active ? 'text-primary' : 'text-textSecondary'}`}>{opt.label}</span>
                {active && <Check size={18} className="text-primary" />}
              </button>
            );
          })}
        </div>

        <div className="h-px bg-border w-full my-5" />

        {/* Search Radius */}
        <h3 className="font-semibold text-base text-textPrimary mb-3">Search Radius</h3>
        <div className="flex flex-wrap gap-2">
          {RADII.map((r) => {
            const active = draftRadius === r;
            return (
              <button key={r} onClick={() => setDraftRadius(r)}
                className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap border transition-colors ${active ? 'bg-primary border-primary text-white' : 'bg-surface border-border text-textSecondary hover:bg-surfaceMuted'}`}>
                {r} miles
              </button>
            );
          })}
        </div>

        <div className="h-px bg-border w-full my-5" />

        {/* Fuel Type (above Station Features) */}
        <h3 className="font-semibold text-base text-textPrimary mb-3">Fuel Type</h3>
        <div className="flex flex-wrap gap-2">
          {FUEL_TYPES.map((ft) => {
            const active = draftFuel === ft.key;
            return (
              <button key={ft.key} onClick={() => setDraftFuel(ft.key)}
                className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap border transition-colors ${active ? 'bg-primary border-primary text-white' : 'bg-surface border-border text-textSecondary hover:bg-surfaceMuted'}`}>
                {ft.label}
              </button>
            );
          })}
        </div>

        <button onClick={commitAndClose} className="btn-primary w-full rounded-xl py-3.5 mt-6 font-semibold text-[15px]">
          Show Results
        </button>
      </div>
    </div>
  );
}
