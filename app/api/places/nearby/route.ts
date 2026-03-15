import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/places/nearby
 *
 * Fetches nearby bars / nightlife venues using Places API (New) searchNearby.
 *
 * Strategy to maximise results:
 *  1. Search with ALL 8 venue types in a single request (maxResultCount=20).
 *  2. If the response contains a nextPageToken, fetch up to 2 more pages
 *     (total cap: 3 pages × 20 = 60 results).
 *  3. If accumulated results < MIN_RESULTS_THRESHOLD, expand the search
 *     radius and repeat (1 000 m → 2 000 m → 5 000 m).
 *  4. Deduplicate across all pages/radii by place ID before returning.
 */

const ENDPOINT = "https://places.googleapis.com/v1/places:searchNearby";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.currentOpeningHours",
  "places.businessStatus",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.types",
  "places.photos",
].join(",");

/**
 * All nightlife / bar venue types from Places API (New) Table A.
 * Previously only "bar" and "night_club" were used — that missed cocktail
 * bars, pubs, lounges, breweries, etc.
 */
const INCLUDED_TYPES = [
  "bar",
  "night_club",
  "pub",
  "cocktail_bar",
  "wine_bar",
  "sports_bar",
  "brewery",
  "lounge",
];

/**
 * Tiered radii in metres.
 * Start tight (1 km) and expand only when results are sparse, so city-centre
 * users aren't drowned in distant venues.
 */
const SEARCH_RADII = [1_000, 2_000, 5_000];

/** Minimum venues before we accept a radius tier and stop expanding. */
const MIN_RESULTS_THRESHOLD = 10;

/** Maximum pages of pagination to attempt per radius tier. */
const MAX_PAGES = 3;

/** Debug: venue we explicitly check for in results. */
const DEBUG_VENUE_NAME = "The Hatch Oakland";
const DEBUG_VENUE_ADDR = "402 15th St";

// ─── Types ────────────────────────────────────────────────────────────────────

type PlaceRaw = Record<string, unknown>;

interface NearbySearchRequest {
  includedTypes?: string[];
  maxResultCount?: number;
  locationRestriction?: {
    circle: {
      center: { latitude: number; longitude: number };
      radius: number;
    };
  };
  pageToken?: string;
}

interface NearbySearchResponse {
  places?: PlaceRaw[];
  nextPageToken?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchOnePage(
  apiKey: string,
  body: NearbySearchRequest
): Promise<{ places: PlaceRaw[]; nextPageToken?: string }> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  const rawText = await res.text();

  if (!res.ok) {
    console.error(
      `[places/nearby] ❌ API error ${res.status}:`,
      rawText.slice(0, 400)
    );
    return { places: [] };
  }

  let data: NearbySearchResponse;
  try {
    data = JSON.parse(rawText) as NearbySearchResponse;
  } catch {
    console.error(
      "[places/nearby] ❌ JSON parse failed:",
      rawText.slice(0, 200)
    );
    return { places: [] };
  }

  const places = data.places ?? [];
  const hasMore = !!data.nextPageToken;
  console.log(
    `[places/nearby]   ↳ page returned ${places.length} place(s)` +
      (hasMore ? ` | nextPageToken present` : " | no more pages")
  );

  return { places, nextPageToken: data.nextPageToken };
}

/** Fetch up to MAX_PAGES pages of results for a given radius. */
async function fetchAllPagesForRadius(
  apiKey: string,
  lat: number,
  lng: number,
  radius: number
): Promise<PlaceRaw[]> {
  console.log(`[places/nearby] ── Radius ${radius}m ──`);

  const baseRequest: NearbySearchRequest = {
    includedTypes: INCLUDED_TYPES,
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius,
      },
    },
  };

  console.log(
    `[places/nearby] → Request: radius=${radius}m, ` +
      `types=[${INCLUDED_TYPES.join(", ")}], maxResultCount=20`
  );

  const allPlaces: PlaceRaw[] = [];
  let pageToken: string | undefined;
  let page = 1;

  while (page <= MAX_PAGES) {
    console.log(`[places/nearby]   Page ${page}/${MAX_PAGES}...`);

    // For pagination: subsequent requests only need the pageToken.
    // The Places API (New) re-uses the original search params server-side.
    const requestBody: NearbySearchRequest =
      page === 1 ? baseRequest : { pageToken };

    const { places, nextPageToken } = await fetchOnePage(apiKey, requestBody);
    allPlaces.push(...places);

    if (!nextPageToken) break; // no more pages available
    pageToken = nextPageToken;
    page++;
  }

  console.log(
    `[places/nearby] Radius ${radius}m total (pre-dedup): ${allPlaces.length}`
  );
  return allPlaces;
}

/** Deduplicate by place ID, keeping first occurrence. */
function deduplicatePlaces(places: PlaceRaw[]): PlaceRaw[] {
  const seen = new Set<string>();
  return places.filter((p) => {
    const id = p.id as string | undefined;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/** Check whether The Hatch Oakland is present — and log exactly why if not. */
function debugHatchCheck(places: PlaceRaw[]): void {
  const match = places.find((p) => {
    const name =
      ((p.displayName as { text?: string }) ?? {}).text?.toLowerCase() ?? "";
    const addr = (p.formattedAddress as string)?.toLowerCase() ?? "";
    return (
      name.includes("hatch") ||
      addr.includes(DEBUG_VENUE_ADDR.toLowerCase())
    );
  });

  if (match) {
    const name =
      ((match.displayName as { text?: string }) ?? {}).text ?? "?";
    const addr = (match.formattedAddress as string) ?? "?";
    const status = (match.businessStatus as string) ?? "UNKNOWN";
    const openNow = (
      (match.currentOpeningHours as { openNow?: boolean }) ?? {}
    ).openNow;
    const types = ((match.types as string[]) ?? []).join(", ");
    console.log(
      `[places/nearby] ✅ DEBUG "${DEBUG_VENUE_NAME}" FOUND:`,
      { name, addr, status, openNow, types, id: match.id }
    );
  } else {
    console.log(
      `[places/nearby] ❌ DEBUG "${DEBUG_VENUE_NAME}" NOT in results ` +
        `(total venues: ${places.length}).`
    );
    console.log(
      `[places/nearby]   Possible reasons: outside search radius, ` +
        `permanently closed, not typed as bar/nightclub/lounge/pub, ` +
        `or ranked below top-20 by Google.`
    );
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error("[places/nearby] ❌ GOOGLE_MAPS_API_KEY missing from env");
    return NextResponse.json(
      { error: "GOOGLE_MAPS_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  let body: { lat?: number; lng?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { lat, lng } = body;

  if (typeof lat !== "number" || typeof lng !== "number") {
    console.error("[places/nearby] ❌ Missing/invalid coords:", { lat, lng });
    return NextResponse.json(
      { error: "lat and lng are required numbers" },
      { status: 400 }
    );
  }

  console.log(`\n[places/nearby] ▶ Tiered venue search`);
  console.log(`  Location : (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
  console.log(`  Types    : [${INCLUDED_TYPES.join(", ")}]`);
  console.log(
    `  Radii    : ${SEARCH_RADII.join("m → ")}m` +
      ` (stop when ≥${MIN_RESULTS_THRESHOLD} results)`
  );
  console.log(`  Max pages: ${MAX_PAGES} per radius tier`);

  let finalPlaces: PlaceRaw[] = [];
  let usedRadius = 0;

  for (const radius of SEARCH_RADII) {
    const raw = await fetchAllPagesForRadius(apiKey, lat, lng, radius);
    const deduped = deduplicatePlaces(raw);
    usedRadius = radius;

    console.log(
      `[places/nearby] Radius ${radius}m → ${deduped.length} unique venue(s)`
    );

    // Always keep the largest result set seen so far
    if (deduped.length > finalPlaces.length) {
      finalPlaces = deduped;
    }

    if (deduped.length >= MIN_RESULTS_THRESHOLD) {
      console.log(
        `[places/nearby] ✓ Threshold met at ${radius}m — stopping expansion`
      );
      break;
    }

    if (radius !== SEARCH_RADII[SEARCH_RADII.length - 1]) {
      console.log(
        `[places/nearby] Only ${deduped.length} venues at ${radius}m — ` +
          `expanding radius...`
      );
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const permClosed = finalPlaces.filter(
    (p) => p.businessStatus === "CLOSED_PERMANENTLY"
  ).length;
  const tempClosed = finalPlaces.filter(
    (p) => p.businessStatus === "CLOSED_TEMPORARILY"
  ).length;
  const openNow = finalPlaces.filter(
    (p) =>
      ((p.currentOpeningHours as { openNow?: boolean }) ?? {}).openNow === true
  ).length;

  console.log(`\n[places/nearby] ══ Summary ══`);
  console.log(`  Final radius   : ${usedRadius}m`);
  console.log(`  Unique venues  : ${finalPlaces.length}`);
  console.log(`  Perm closed    : ${permClosed} (filtered by client — hidden)`);
  console.log(`  Temp closed    : ${tempClosed} (kept — shown as "Closed")`);
  console.log(`  Open now       : ${openNow}`);

  // ── Full venue roster ─────────────────────────────────────────────────────
  console.log(`\n[places/nearby] ── Venue roster ──`);
  finalPlaces.forEach((p, i) => {
    const name =
      ((p.displayName as { text?: string }) ?? {}).text ?? "Unknown";
    const status = (p.businessStatus as string) ?? "UNKNOWN";
    const open =
      ((p.currentOpeningHours as { openNow?: boolean }) ?? {}).openNow;
    const types = ((p.types as string[]) ?? []).slice(0, 4).join(", ");
    const addr = (p.formattedAddress as string) ?? "";
    console.log(
      `  [${String(i + 1).padStart(2)}] "${name}"` +
        ` | ${status} | open=${open}` +
        ` | [${types}]` +
        ` | ${addr}`
    );
  });

  // ── The Hatch Oakland debug check ────────────────────────────────────────
  debugHatchCheck(finalPlaces);

  return NextResponse.json({ places: finalPlaces });
}
