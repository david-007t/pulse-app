import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/places/nearby
 *
 * Two-wave searchText strategy for broader venue coverage.
 *
 * Wave 1 — open venues (6 parallel text searches with openNow:true):
 *   Natural-language queries capture venues that type-based searches miss.
 *   Up to 6 × 20 = 120 open venue candidates, deduplicated before use.
 *
 * Wave 2 — all venues (same 6 queries, no openNow filter):
 *   Only places NOT already in Wave 1 are appended (the closed ones).
 *
 * Response is sorted: open venues (rating desc) → closed venues (rating desc).
 * Each place object includes an isOpenNow boolean field.
 * Fixed 3 200 m (2 mile) locationRestriction radius (hard boundary).
 */

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

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
  "places.websiteUri",
  "places.nationalPhoneNumber",
].join(",");

/**
 * Six natural-language queries run in parallel per wave.
 * Text search captures venue categories that structured type searches miss
 * (e.g. venues with "bar" as a secondary type, hotel bars, rooftop lounges).
 */
/**
 * Wave 1 uses these queries with openNow:true (API flag, not text).
 * Wave 2 re-uses the neutral variants below so the text doesn't bias
 * Google toward currently-open venues when we want closed ones too.
 */
const TEXT_QUERIES = [
  "bars near me",
  "nightclubs near me",
  "cocktail bars near me",
  "pubs and sports bars near me",
  "wine bars and breweries near me",
  "clubs near me",
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

interface TextSearchRequest {
  textQuery?: string;
  maxResultCount?: number;
  openNow?: boolean;
  locationRestriction?: {
    rectangle: {
      low: { latitude: number; longitude: number };
      high: { latitude: number; longitude: number };
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
  body: TextSearchRequest
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

/** Fetch up to MAX_PAGES pages of results for one text query. */
async function fetchBatch(
  apiKey: string,
  lat: number,
  lng: number,
  query: string,
  openNow?: boolean
): Promise<PlaceRaw[]> {
  const baseRequest: TextSearchRequest = {
    textQuery: query,
    maxResultCount: 20,
    ...(openNow ? { openNow: true } : {}),
    locationRestriction: {
      rectangle: {
        low:  { latitude: lat - 0.029, longitude: lng - 0.036 },
        high: { latitude: lat + 0.029, longitude: lng + 0.036 },
      },
    },
  };

  console.log(
    `[places/nearby] → "${query}"` +
      `${openNow ? " [openNow]" : ""}: radius=${SEARCH_RADIUS}m, maxResultCount=20`
  );

  const allPlaces: PlaceRaw[] = [];
  let pageToken: string | undefined;
  let page = 1;

  while (page <= MAX_PAGES) {
    console.log(`[places/nearby]   Page ${page}/${MAX_PAGES}...`);

    // For pagination: subsequent requests only need the pageToken.
    // The Places API (New) re-uses the original search params server-side.
    const requestBody: TextSearchRequest =
      page === 1 ? baseRequest : { pageToken };

    const { places, nextPageToken } = await fetchOnePage(apiKey, requestBody);
    allPlaces.push(...places);

    if (!nextPageToken) break; // no more pages available
    pageToken = nextPageToken;
    page++;
  }

  console.log(
    `[places/nearby] ↳ "${query}" total: ${allPlaces.length}`
  );
  return allPlaces;
}

/**
 * Place types that represent actual nightlife / drinking venues.
 * Any result that does NOT include at least one of these is discarded.
 */
const VALID_VENUE_TYPES = new Set([
  "bar",
  "night_club",
  "cocktail_bar",
  "wine_bar",
  "sports_bar",
  "brewery",
  "pub",
  "brewpub",
  "beer_garden",
  "live_music_venue",
]);

/**
 * Returns true only if the place passes all quality gates:
 *  1. Has a display name, formatted address, and location.
 *  2. Address starts with a street number (filters out neighborhoods / areas).
 *  3. Has at least one recognised venue type.
 *  4. Is NOT permanently closed.
 */
function isValidVenue(p: PlaceRaw): boolean {
  const name = ((p.displayName as { text?: string }) ?? {}).text;
  const addr = p.formattedAddress as string | undefined;
  const loc = p.location;

  // ① Required fields
  if (!name || !addr || !loc) return false;

  // ② Address must begin with a digit (e.g. "402 15th St …")
  //    Neighborhoods / districts usually start with a letter.
  if (!/^\d/.test(addr.trim())) return false;

  // ③ Must include at least one recognised venue type
  const types = (p.types as string[] | undefined) ?? [];
  if (!types.some((t) => VALID_VENUE_TYPES.has(t))) return false;

  // ④ Drop permanently closed venues server-side
  if ((p.businessStatus as string) === "CLOSED_PERMANENTLY") return false;

  return true;
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

  console.log(`\n[places/nearby] ▶ Two-wave text search`);
  console.log(`  Location : (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
  console.log(`  Radius   : ${SEARCH_RADIUS}m (fixed, ~2 miles)`);
  console.log(`  Queries  : ${TEXT_QUERIES.length} × 2 waves = ${TEXT_QUERIES.length * 2} parallel calls`);
  console.log(`  Max pages: ${MAX_PAGES} per query`);

  // ── Wave 1: open venues only ──────────────────────────────────────────────
  console.log(`[places/nearby] ── Wave 1: open venues (openNow:true) ──`);
  const wave1Results = await Promise.all(
    TEXT_QUERIES.map((query) => fetchBatch(apiKey, lat, lng, query, true))
  );
  const wave1Places = deduplicatePlaces(wave1Results.flat());
  const wave1Ids = new Set(wave1Places.map((p) => p.id as string));
  console.log(
    `[places/nearby] Wave 1: ${wave1Results.map((b, i) => `"${TEXT_QUERIES[i].split(" ")[0]}"=${b.length}`).join(", ")}`
  );
  console.log(`[places/nearby] Wave 1 unique: ${wave1Places.length} open venue(s)`);

  // ── Wave 2: all venues — keep only closed ones not in Wave 1 ─────────────
  console.log(`[places/nearby] ── Wave 2: all venues (no openNow filter) ──`);
  const wave2Results = await Promise.all(
    TEXT_QUERIES.map((query) => fetchBatch(apiKey, lat, lng, query, false))
  );
  const wave2All = deduplicatePlaces(wave2Results.flat());
  const wave2Additions = wave2All.filter((p) => !wave1Ids.has(p.id as string));
  console.log(
    `[places/nearby] Wave 2: ${wave2Results.map((b, i) => `"${TEXT_QUERIES[i].split(" ")[0]}"=${b.length}`).join(", ")}`
  );
  console.log(
    `[places/nearby] Wave 2: ${wave2All.length} total → ${wave2Additions.length} new (closed) added`
  );

  // ── Strict venue validation ───────────────────────────────────────────────
  const validOpenPlaces = wave1Places.filter(isValidVenue);
  const validClosedPlaces = wave2Additions.filter(isValidVenue);

  console.log(
    `[places/nearby] Validation: open ${wave1Places.length}→${validOpenPlaces.length} kept` +
      ` | closed ${wave2Additions.length}→${validClosedPlaces.length} kept`
  );

  // ── Augment with isOpenNow, sort open→closed each by rating desc ─────────
  const byRatingDesc = (a: PlaceRaw, b: PlaceRaw): number =>
    ((b.rating as number) ?? 0) - ((a.rating as number) ?? 0);

  const openPlaces = validOpenPlaces
    .map((p) => ({ ...p, isOpenNow: true }))
    .sort(byRatingDesc);

  const closedPlaces = validClosedPlaces
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
