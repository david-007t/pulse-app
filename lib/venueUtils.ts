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
  console.log(
    `[venueUtils] parsePlacesResponse: received ${places.length} raw place(s)`
  );

  return places
    // Only exclude venues that are PERMANENTLY closed — they no longer exist.
    // CLOSED_TEMPORARILY venues (e.g. under renovation) are kept so users can
    // see them on the map; they'll appear as "Closed" via isOpen=false.
    .filter((p) => {
      const status = p.businessStatus as string | undefined;
      const name =
        (p.displayName as { text?: string } | undefined)?.text ??
        String(p.id);

      if (status === "CLOSED_PERMANENTLY") {
        console.log(
          `[venueUtils] ✗ Excluded "${name}" (${p.id}) — CLOSED_PERMANENTLY`
        );
        return false;
      }

      // Log unexpected statuses for visibility without excluding them
      if (
        status &&
        status !== "OPERATIONAL" &&
        status !== "CLOSED_TEMPORARILY"
      ) {
        console.log(
          `[venueUtils] ⚠ Keeping "${name}" with unusual status: ${status}`
        );
      }

      return true;
    })
    .map((p): Venue | null => {
      const loc = p.location as { latitude?: number; longitude?: number } | undefined;

      // location is required — skip if missing
      if (!loc?.latitude || !loc?.longitude) {
        console.warn("[venueUtils] Skipping place with no location:", p.id);
        return null;
      }

      const displayName = p.displayName as { text?: string } | undefined;
      const currentOpeningHours = p.currentOpeningHours as
        | { openNow?: boolean }
        | undefined;

      const isOpen = currentOpeningHours?.openNow ?? false;
      const rating = (p.rating as number) ?? 0;
      const userRatingCount = (p.userRatingCount as number) ?? 0;
      const busynessLevel = getBusynessLevel(isOpen, rating, userRatingCount);
      const distance = haversineDistance(userLat, userLng, loc.latitude, loc.longitude);

      const photos = p.photos as
        | { name: string; widthPx: number; heightPx: number }[]
        | undefined;

      return {
        id: (p.id as string) ?? `unknown-${Math.random()}`,
        name: displayName?.text ?? "Unknown Venue",
        address: (p.formattedAddress as string) ?? "",
        location: { lat: loc.latitude, lng: loc.longitude },
        isOpen,
        rating,
        userRatingCount,
        priceLevel: p.priceLevel as string | undefined,
        businessStatus: (p.businessStatus as string) ?? "UNKNOWN",
        isBusy: busynessLevel >= 3,
        busynessLevel,
        distance,
        types: (p.types as string[]) ?? [],
        firstPhotoName: photos?.[0]?.name,
      };
    })
    .filter((v): v is Venue => v !== null)
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
}
