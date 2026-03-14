export interface VenuePhoto {
  /** Resource name used with /api/places/photo — e.g. "places/{id}/photos/{ref}" */
  name: string;
  widthPx: number;
  heightPx: number;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  isOpen: boolean;
  rating: number;
  userRatingCount: number;
  priceLevel?: string;
  businessStatus: string;
  isBusy: boolean;
  busynessLevel: number; // 1–4 flames
  distance?: number; // metres from user
  /** Google place types, e.g. ["bar", "establishment"] */
  types?: string[];
  /** First photo resource name — used for card / list-item thumbnails */
  firstPhotoName?: string;
}

/** Extended venue data fetched from /api/places/details */
export interface VenueDetails extends Venue {
  photos?: VenuePhoto[];
  editorialSummary?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  servesBeer?: boolean;
  servesWine?: boolean;
  servesCocktails?: boolean;
  outdoorSeating?: boolean;
  reservable?: boolean;
  currentOpeningHours?: {
    openNow: boolean;
    weekdayDescriptions?: string[];
  };
  regularOpeningHours?: {
    openNow: boolean;
    weekdayDescriptions?: string[];
  };
}
