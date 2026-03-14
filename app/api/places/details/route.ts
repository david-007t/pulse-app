import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_MAPS_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get("placeId");

  if (!placeId) {
    return NextResponse.json({ error: "placeId is required" }, { status: 400 });
  }

  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,location",
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("[places/details] Google API error:", res.status, text);
    return NextResponse.json(
      { error: "Place not found", detail: text },
      { status: res.status }
    );
  }

  const data = await res.json();

  return NextResponse.json({
    id: data.id,
    name: data.displayName?.text ?? null,
    address: data.formattedAddress ?? null,
    location: data.location
      ? { lat: data.location.latitude, lng: data.location.longitude }
      : null,
  });
}
