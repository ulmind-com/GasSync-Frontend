// ============================================================
// GasSync - Brand Logo Detection & URL Helper
// ============================================================
// Replaces Google Places Photos API (FREE alternative)
// Uses Clearbit Logo API (free, no API key) + fallback icon

// ─── Brand → Logo URL Map ───────────────────────────────────
const BRAND_LOGOS: Record<string, string> = {
  // US Brands
  'shell': 'https://logo.clearbit.com/shell.com',
  'chevron': 'https://logo.clearbit.com/chevron.com',
  'exxon': 'https://logo.clearbit.com/exxonmobil.com',
  'mobil': 'https://logo.clearbit.com/exxonmobil.com',
  'exxonmobil': 'https://logo.clearbit.com/exxonmobil.com',
  'bp': 'https://logo.clearbit.com/bp.com',
  'sunoco': 'https://logo.clearbit.com/sunoco.com',
  'marathon': 'https://logo.clearbit.com/marathonpetroleum.com',
  'circle k': 'https://logo.clearbit.com/circlek.com',
  'circlek': 'https://logo.clearbit.com/circlek.com',
  'speedway': 'https://logo.clearbit.com/speedway.com',
  'valero': 'https://logo.clearbit.com/valero.com',
  'costco': 'https://logo.clearbit.com/costco.com',
  "sam's club": 'https://logo.clearbit.com/samsclub.com',
  'sams club': 'https://logo.clearbit.com/samsclub.com',
  'wawa': 'https://logo.clearbit.com/wawa.com',
  'sheetz': 'https://logo.clearbit.com/sheetz.com',
  'quiktrip': 'https://logo.clearbit.com/quiktrip.com',
  'qt': 'https://logo.clearbit.com/quiktrip.com',
  'pilot': 'https://logo.clearbit.com/pilotflyingj.com',
  'flying j': 'https://logo.clearbit.com/pilotflyingj.com',
  'loves': 'https://logo.clearbit.com/loves.com',
  "love's": 'https://logo.clearbit.com/loves.com',
  'casey': 'https://logo.clearbit.com/caseys.com',
  "casey's": 'https://logo.clearbit.com/caseys.com',
  'murphy': 'https://logo.clearbit.com/murphyusa.com',
  'murphyusa': 'https://logo.clearbit.com/murphyusa.com',
  'racetrac': 'https://logo.clearbit.com/racetrac.com',
  'phillips 66': 'https://logo.clearbit.com/phillips66.com',
  'conoco': 'https://logo.clearbit.com/conocophillips.com',
  'conocophillips': 'https://logo.clearbit.com/conocophillips.com',
  'sinclair': 'https://logo.clearbit.com/sinclairoil.com',
  'citgo': 'https://logo.clearbit.com/citgo.com',
  'gulf': 'https://logo.clearbit.com/gulfoil.com',
  '7-eleven': 'https://logo.clearbit.com/7-eleven.com',
  'seven eleven': 'https://logo.clearbit.com/7-eleven.com',
  'kwik trip': 'https://logo.clearbit.com/kwiktrip.com',
  'kwiktrip': 'https://logo.clearbit.com/kwiktrip.com',
  'buc-ee': 'https://logo.clearbit.com/buc-ees.com',
  "buc-ee's": 'https://logo.clearbit.com/buc-ees.com',
  'bucees': 'https://logo.clearbit.com/buc-ees.com',
  'arco': 'https://logo.clearbit.com/arco.com',
  'ampm': 'https://logo.clearbit.com/ampm.com',
  'am pm': 'https://logo.clearbit.com/ampm.com',
  'texaco': 'https://logo.clearbit.com/texaco.com',
  'total': 'https://logo.clearbit.com/totalenergies.com',
  'totalenergies': 'https://logo.clearbit.com/totalenergies.com',
  'esso': 'https://logo.clearbit.com/esso.com',

  // Indian Brands
  'indian oil': 'https://logo.clearbit.com/iocl.com',
  'iocl': 'https://logo.clearbit.com/iocl.com',
  'hindustan petroleum': 'https://logo.clearbit.com/hindustanpetroleum.com',
  'hpcl': 'https://logo.clearbit.com/hindustanpetroleum.com',
  'hp petroleum': 'https://logo.clearbit.com/hindustanpetroleum.com',
  'bharat petroleum': 'https://logo.clearbit.com/bharatpetroleum.in',
  'bpcl': 'https://logo.clearbit.com/bharatpetroleum.in',
  'reliance': 'https://logo.clearbit.com/ril.com',
  'nayara': 'https://logo.clearbit.com/nayaraenergy.com',
  'nayara energy': 'https://logo.clearbit.com/nayaraenergy.com',

  // UK / European Brands
  'sainsbury': 'https://logo.clearbit.com/sainsburys.co.uk',
  'tesco': 'https://logo.clearbit.com/tesco.com',
  'morrisons': 'https://logo.clearbit.com/morrisons.com',
  'asda': 'https://logo.clearbit.com/asda.com',
  'jet': 'https://logo.clearbit.com/jetfuel.com',
  'aral': 'https://logo.clearbit.com/aral.de',
  'repsol': 'https://logo.clearbit.com/repsol.com',
  'cepsa': 'https://logo.clearbit.com/cepsa.com',
  'orlen': 'https://logo.clearbit.com/orlen.pl',
  'omv': 'https://logo.clearbit.com/omv.com',
  'mol': 'https://logo.clearbit.com/mol.hu',
};

// Default fallback image for unknown brands (High quality Unsplash gas station photo)
const DEFAULT_FUEL_ICON = 'https://images.unsplash.com/photo-1545089309-84d728511d73?auto=format&fit=crop&q=80&w=800';

/**
 * Detect the brand from a station name.
 * Returns the matched brand key or null.
 */
export function detectBrand(stationName: string): string | null {
  if (!stationName) return null;
  const lower = stationName.toLowerCase().trim();

  // Try exact-ish matches first (longer brand names before shorter)
  const sortedBrands = Object.keys(BRAND_LOGOS).sort((a, b) => b.length - a.length);
  for (const brand of sortedBrands) {
    if (lower.includes(brand)) {
      return brand;
    }
  }
  return null;
}

/**
 * Get the brand logo URL for a station name.
 * Returns Clearbit logo URL or a default gas station icon.
 */
export function getBrandLogoUrl(stationName: string): string {
  const brand = detectBrand(stationName);
  return brand ? BRAND_LOGOS[brand] : DEFAULT_FUEL_ICON;
}

/**
 * Get the best available image URL for a station.
 * Priority: brand logo > default icon
 * (photoRef is ignored since we're removing Google Photos API)
 */
export function getStationImageUrl(stationName: string, _photoRef?: string | null): string {
  return getBrandLogoUrl(stationName);
}
