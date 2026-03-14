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
}
