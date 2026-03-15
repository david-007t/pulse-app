import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/places/nearby
 *
 * Two-wave search strategy to maximise coverage while prioritising open venues.
 *
 * Wave 1 — open venues (4 parallel calls with openNow:true):
 *   Returns only currently-open places. Up to 4 × 20 = 80 open venues.
 *
 * Wave 2 — all venues (4 parallel calls, no openNow filter):
 *   Returns open + closed. Only places NOT in Wave 1 are added (the closed ones).
 *
 * Response is sorted: open venues (rating desc) → closed venues (rating desc).
 * Each place object includes an isOpenNow boolean field.
 * Fixed 3 200 m (2 mile) radius — no tiered expansion.
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
 * Four parallel type batches — each fetches up to 20 results independently,
 * giving up to 80 unique venues after deduplication.
 */
const TYPE_BATCHES = [
  ["bar", "cocktail_bar"],
  ["night_club"],
  ["pub", "sports_bar"],
  ["wine_bar", "brewery"],
];

/** Fixed search radius in metres (exactly 2 miles). */
const SEARCH_RADIUS = 3_200;

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
  openNow?: boolean;
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

/** Fetch up to MAX_PAGES pages of results for one type batch. */
async function fetchBatch(
  apiKey: string,
  lat: number,
  lng: number,
  types: string[],
  openNow?: boolean
): Promise<PlaceRaw[]> {
  const baseRequest: NearbySearchRequest = {
    includedTypes: types,
    maxResultCount: 20,
    ...(openNow ? { openNow: true } : {}),
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: SEARCH_RADIUS,
      },
    },
  };

  console.log(
    `[places/nearby] → Batch [${types.join(", ")}]` +
      `${openNow ? " [openNow]" : ""}: radius=${SEARCH_RADIUS}m, maxResultCount=20`
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
    `[places/nearby] ↳ Batch [${types.join(", ")}] total: ${allPlaces.length}`
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

  console.log(`\n[places/nearby] ▶ Two-wave venue search`);
  console.log(`  Location : (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
  console.log(`  Radius   : ${SEARCH_RADIUS}m (fixed, ~2 miles)`);
  console.log(`  Batches  : ${TYPE_BATCHES.length} types × 2 waves = ${TYPE_BATCHES.length * 2} parallel calls`);
  console.log(`  Max pages: ${MAX_PAGES} per batch`);

  // ── Wave 1: open venues only ──────────────────────────────────────────────
  console.log(`[places/nearby] ── Wave 1: open venues (openNow:true) ──`);
  const wave1Results = await Promise.all(
    TYPE_BATCHES.map((types) => fetchBatch(apiKey, lat, lng, types, true))
  );
  const wave1Places = deduplicatePlaces(wave1Results.flat());
  const wave1Ids = new Set(wave1Places.map((p) => p.id as string));
  console.log(
    `[places/nearby] Wave 1: ${wave1Results.map((b, i) => `[${TYPE_BATCHES[i].join(",")}]=${b.length}`).join(", ")}`
  );
  console.log(`[places/nearby] Wave 1 unique: ${wave1Places.length} open venue(s)`);

  // ── Wave 2: all venues — keep only closed ones not in Wave 1 ─────────────
  console.log(`[places/nearby] ── Wave 2: all venues (no openNow filter) ──`);
  const wave2Results = await Promise.all(
    TYPE_BATCHES.map((types) => fetchBatch(apiKey, lat, lng, types, false))
  );
  const wave2All = deduplicatePlaces(wave2Results.flat());
  const wave2Additions = wave2All.filter((p) => !wave1Ids.has(p.id as string));
  console.log(
    `[places/nearby] Wave 2: ${wave2Results.map((b, i) => `[${TYPE_BATCHES[i].join(",")}]=${b.length}`).join(", ")}`
  );
  console.log(
    `[places/nearby] Wave 2: ${wave2All.length} total → ${wave2Additions.length} new (closed) added`
  );

  // ── Augment with isOpenNow, sort open→closed each by rating desc ─────────
  const byRatingDesc = (a: PlaceRaw, b: PlaceRaw): number =>
    ((b.rating as number) ?? 0) - ((a.rating as number) ?? 0);

  const openPlaces = wave1Places
    .map((p) => ({ ...p, isOpenNow: true }))
    .sort(byRatingDesc);

  const closedPlaces = wave2Additions
    .map((p) => ({
      ...p,
      isOpenNow:
        ((p.currentOpeningHours as { openNow?: boolean }) ?? {}).openNow ??
        false,
    }))
    .sort(byRatingDesc);

  const finalPlaces: PlaceRaw[] = [...openPlaces, ...closedPlaces];

  // ── Summary ──────────────────────────────────────────────────────────────
  const permClosed = finalPlaces.filter(
    (p) => p.businessStatus === "CLOSED_PERMANENTLY"
  ).length;
  const tempClosed = finalPlaces.filter(
    (p) => p.businessStatus === "CLOSED_TEMPORARILY"
  ).length;

  console.log(`\n[places/nearby] ══ Summary ══`);
  console.log(`  Radius         : ${SEARCH_RADIUS}m`);
  console.log(`  Open venues    : ${openPlaces.length} (Wave 1, sorted by rating)`);
  console.log(`  Closed venues  : ${closedPlaces.length} (Wave 2 additions, sorted by rating)`);
  console.log(`  Total          : ${finalPlaces.length}`);
  console.log(`  Perm closed    : ${permClosed} (filtered by client — hidden)`);
  console.log(`  Temp closed    : ${tempClosed} (kept — shown as "Closed")`);

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
