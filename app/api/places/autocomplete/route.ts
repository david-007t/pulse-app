import { NextRequest, NextResponse } from "next/server";

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
        // Bias results toward bars/clubs but also allow general locations
        // so users can search a neighborhood name
        includedPrimaryTypes: ["bar", "night_club", "establishment"],
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
  return NextResponse.json(data);
}
