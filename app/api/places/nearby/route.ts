import { NextRequest, NextResponse } from "next/server";

// Spec: https://developers.google.com/maps/documentation/places/web-service/nearby-search
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
  // types: used for Bars/Clubs category filter
  "places.types",
  // photos: first entry used as card / list-item thumbnail
  "places.photos",
].join(",");

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error("[places/nearby] ❌ GOOGLE_MAPS_API_KEY is missing from env");
    return NextResponse.json(
      { error: "GOOGLE_MAPS_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  let body: { lat?: number; lng?: number; radius?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { lat, lng, radius = 2000 } = body;

  if (typeof lat !== "number" || typeof lng !== "number") {
    console.error("[places/nearby] ❌ Missing/invalid coords:", { lat, lng });
    return NextResponse.json(
      { error: "lat and lng are required numbers" },
      { status: 400 }
    );
  }

  const requestBody = {
    includedTypes: ["bar", "night_club"],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: Number(radius), // must be numeric (not a string)
      },
    },
  };

  console.log("[places/nearby] → Request to Google Places API:", {
    endpoint: ENDPOINT,
    "X-Goog-FieldMask": FIELD_MASK,
    body: requestBody,
  });

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(requestBody),
  });

  // Read as text first so we can always log it regardless of status
  const rawText = await res.text();

  console.log("[places/nearby] ← Google response:", {
    status: res.status,
    statusText: res.statusText,
    body: rawText,
  });

  if (!res.ok) {
    console.error("[places/nearby] ❌ Google API returned error:", res.status, rawText);
    return NextResponse.json(
      { error: "Google Places API error", detail: rawText },
      { status: res.status }
    );
  }

  let data: { places?: unknown[] };
  try {
    data = JSON.parse(rawText);
  } catch {
    console.error("[places/nearby] ❌ Could not parse JSON response:", rawText);
    return NextResponse.json({ error: "Invalid JSON from Google" }, { status: 502 });
  }

  const count = Array.isArray(data.places) ? data.places.length : 0;
  console.log(`[places/nearby] ✓ Returning ${count} place(s) to client`);

  return NextResponse.json(data);
}
