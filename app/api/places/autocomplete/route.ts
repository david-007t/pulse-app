import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/places/autocomplete
 *
 * Wraps the Places API (New) Autocomplete endpoint.
 * Only returns suggestions for recognised drinking/nightlife venue types,
 * and filters out any suggestion whose address (secondaryText) does not
 * begin with a street number — which removes neighbourhood / city suggestions.
 */

/** Types that signal an actual physical drinking/nightlife venue. */
const AUTOCOMPLETE_TYPES = [
  "bar",
  "night_club",
  "cocktail_bar",
  "wine_bar",
  "sports_bar",
  "brewery",
  "pub",
];

/**
 * Returns true when the secondary text of an autocomplete prediction looks
 * like a street address (i.e. starts with a digit such as "402 15th St …").
 * Pure city / neighbourhood predictions ("Oakland, CA, USA") do not pass.
 */
function hasStreetAddress(secondaryText: string): boolean {
  return /^\d/.test(secondaryText.trim());
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_MAPS_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const { input, lat, lng } = await req.json();

  if (!input || typeof input !== "string") {
    return NextResponse.json({ suggestions: [] });
  }

  const res = await fetch(
    "https://places.googleapis.com/v1/places:autocomplete",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify({
        input,
        // Only match actual venue types — no generic "establishment" or areas.
        includedPrimaryTypes: AUTOCOMPLETE_TYPES,
        locationBias:
          lat && lng
            ? {
                circle: {
                  center: { latitude: lat, longitude: lng },
                  radius: 50000,
                },
              }
            : undefined,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("[places/autocomplete] Google API error:", res.status, text);
    return NextResponse.json(
      { error: "Autocomplete failed", detail: text },
      { status: res.status }
    );
  }

  const data = await res.json();

  // ── Filter out neighbourhood / city predictions ───────────────────────────
  // A valid venue suggestion has a structured-format secondary text that looks
  // like a street address ("402 15th St, Oakland, CA, USA").  Broad area
  // suggestions ("Oakland, CA, USA") are discarded.
  const suggestions: unknown[] = data.suggestions ?? [];
  const filtered = suggestions.filter((s) => {
    const pp = (s as Record<string, unknown>).placePrediction as
      | Record<string, unknown>
      | undefined;
    const sf = pp?.structuredFormat as
      | Record<string, { text?: string }>
      | undefined;
    const secondary = sf?.secondaryText?.text ?? "";
    return hasStreetAddress(secondary);
  });

  console.log(
    `[places/autocomplete] "${input}": ${suggestions.length} raw → ${filtered.length} after address filter`
  );

  return NextResponse.json({ ...data, suggestions: filtered });
}
