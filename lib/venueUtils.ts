import type { Venue } from "@/types/venue";

/** Haversine distance in metres */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Format metres → "0.3 mi" (US imperial) */
export function formatDistance(metres: number): string {
  const miles = metres * 0.000621371;
  if (miles < 0.1) return "steps away";
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

/**
 * Busyness level 1–4 based on rating, review count, and time of day.
 * Returns 0 if the venue is closed.
 */
export function getBusynessLevel(
  isOpen: boolean,
  rating: number,
  userRatingCount: number
): number {
  if (!isOpen) return 0;

  const hour = new Date().getHours();
  const isNightTime = hour >= 21 || hour < 3;
  const isWeekend = [5, 6, 0].includes(new Date().getDay());

  let score = 0;
  if (rating >= 4.3) score += 2;
  else if (rating >= 4.0) score += 1;

  if (userRatingCount >= 500) score += 2;
  else if (userRatingCount >= 200) score += 1;

  if (isNightTime) score += 1;
  if (isWeekend) score += 1;

  return Math.min(4, Math.max(1, score));
}

/** Transform raw Places API (New) response into Venue objects */
export function parsePlacesResponse(
  places: Record<string, unknown>[],
  userLat: number,
  userLng: number
): Venue[] {
  return places
    .filter((p) => p.businessStatus === "OPERATIONAL")
    .map((p): Venue => {
      const loc = p.location as { latitude: number; longitude: number };
      const displayName = p.displayName as { text?: string } | undefined;
      const currentOpeningHours = p.currentOpeningHours as
        | { openNow?: boolean }
        | undefined;

      const isOpen = currentOpeningHours?.openNow ?? false;
      const rating = (p.rating as number) ?? 0;
      const userRatingCount = (p.userRatingCount as number) ?? 0;
      const busynessLevel = getBusynessLevel(isOpen, rating, userRatingCount);
      const distance = haversineDistance(
        userLat,
        userLng,
        loc.latitude,
        loc.longitude
      );

      return {
        id: p.id as string,
        name: displayName?.text ?? "Unknown Venue",
        address: (p.formattedAddress as string) ?? "",
        location: { lat: loc.latitude, lng: loc.longitude },
        isOpen,
        rating,
        userRatingCount,
        priceLevel: p.priceLevel as string | undefined,
        businessStatus: p.businessStatus as string,
        isBusy: busynessLevel >= 3,
        busynessLevel,
        distance,
      };
    })
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
}
