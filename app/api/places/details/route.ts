import { NextRequest, NextResponse } from "next/server";

/**
 * Fetches full venue details from the Places API (New).
 * Used when a venue card / marker is tapped to populate VenueDetailSheet.
 */
const FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "currentOpeningHours",
  "regularOpeningHours",
  "photos",
  "editorialSummary",
  "rating",
  "userRatingCount",
  "priceLevel",
  "businessStatus",
  "websiteUri",
  "nationalPhoneNumber",
  "servesBeer",
  "servesWine",
  "servesCocktails",
  "outdoorSeating",
  "reservable",
  "types",
].join(",");

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
        "X-Goog-FieldMask": FIELD_MASK,
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

  const d = await res.json();

  // Map raw Places API (New) shape → VenueDetails
  return NextResponse.json({
    id: d.id,
    name: d.displayName?.text ?? null,
    address: d.formattedAddress ?? null,
    location: d.location
      ? { lat: d.location.latitude, lng: d.location.longitude }
      : null,
    isOpen: d.currentOpeningHours?.openNow ?? false,
    rating: d.rating ?? 0,
    userRatingCount: d.userRatingCount ?? 0,
    priceLevel: d.priceLevel ?? null,
    businessStatus: d.businessStatus ?? null,
    types: d.types ?? [],
    // Extended fields
    editorialSummary: d.editorialSummary?.text ?? null,
    websiteUri: d.websiteUri ?? null,
    nationalPhoneNumber: d.nationalPhoneNumber ?? null,
    servesBeer: d.servesBeer ?? null,
    servesWine: d.servesWine ?? null,
    servesCocktails: d.servesCocktails ?? null,
    outdoorSeating: d.outdoorSeating ?? null,
    reservable: d.reservable ?? null,
    // Up to 6 photos for the detail sheet carousel
    photos: (
      (d.photos ?? []) as { name: string; widthPx: number; heightPx: number }[]
    )
      .slice(0, 6)
      .map((p) => ({ name: p.name, widthPx: p.widthPx, heightPx: p.heightPx })),
    currentOpeningHours: d.currentOpeningHours
      ? {
          openNow: d.currentOpeningHours.openNow ?? false,
          weekdayDescriptions: d.currentOpeningHours.weekdayDescriptions ?? [],
        }
      : null,
    regularOpeningHours: d.regularOpeningHours
      ? {
          openNow: d.regularOpeningHours.openNow ?? false,
          weekdayDescriptions: d.regularOpeningHours.weekdayDescriptions ?? [],
        }
      : null,
  });
}
