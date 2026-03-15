import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/places/nearby
 *
 * Fetches nearby bars / nightlife venues using Places API (New) searchNearby.
 *
 * Strategy to maximise results (Places API caps at 20 per call):
 *  1. Split the 7 venue types into 4 batches and run all 4 API calls in
 *     parallel via Promise.all() — up to 4 × 20 = 80 unique results.
 *  2. Each call also follows nextPageToken for up to MAX_PAGES pages.
 *  3. All results are deduplicated by place ID before returning.
 *  4. Fixed 2 000 m radius — no tiered expansion.
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

/** Fixed search radius in metres. */
const SEARCH_RADIUS = 2_000;

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

/** Fetch up to MAX_PAGES pages of results for one type batch. */
async function fetchBatch(
  apiKey: string,
  lat: number,
  lng: number,
  types: string[]
): Promise<PlaceRaw[]> {
  const baseRequest: NearbySearchRequest = {
    includedTypes: types,
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: SEARCH_RADIUS,
      },
    },
  };

  console.log(
    `[places/nearby] → Batch [${types.join(", ")}]: radius=${SEARCH_RADIUS}m, maxResultCount=20`
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

  console.log(`\n[places/nearby] ▶ Parallel venue search`);
  console.log(`  Location : (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
  console.log(`  Radius   : ${SEARCH_RADIUS}m (fixed)`);
  console.log(`  Batches  : ${TYPE_BATCHES.length} parallel calls, up to 20 results each`);
  console.log(`  Max pages: ${MAX_PAGES} per batch`);

  // Run all 4 type-batch searches in parallel, then merge + deduplicate
  const batchResults = await Promise.all(
    TYPE_BATCHES.map((types) => fetchBatch(apiKey, lat, lng, types))
  );

  const finalPlaces = deduplicatePlaces(batchResults.flat());

  console.log(
    `[places/nearby] Batches returned: ${batchResults.map((b, i) => `[${TYPE_BATCHES[i].join(",")}]=${b.length}`).join(", ")}`
  );
  console.log(
    `[places/nearby] Combined: ${batchResults.flat().length} total → ${finalPlaces.length} unique after dedup`
  );

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
  console.log(`  Radius         : ${SEARCH_RADIUS}m`);
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
