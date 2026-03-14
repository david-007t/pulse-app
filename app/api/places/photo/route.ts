import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy for Google Places (New) photo media.
 *
 * Usage: GET /api/places/photo?name=places/{id}/photos/{ref}&maxWidth=800
 *
 * The photo `name` is the resource name returned by the Places API, e.g.
 * "places/ChIJXXXXXXXX/photos/ATplDJYYYYYYYY".
 *
 * Fetching photos through this route keeps the Google API key server-only.
 * Responses are cached for 24 h (stale-while-revalidate 7 days).
 */
export async function GET(req: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_MAPS_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name"); // "places/{id}/photos/{ref}"
  const maxWidth = searchParams.get("maxWidth") ?? "800";

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // Validate maxWidth is a safe integer
  const maxWidthNum = Math.min(4800, Math.max(100, parseInt(maxWidth, 10) || 800));

  try {
    const googleUrl =
      `https://places.googleapis.com/v1/${name}/media` +
      `?maxWidthPx=${maxWidthNum}&key=${apiKey}`;

    const res = await fetch(googleUrl, { redirect: "follow" });

    if (!res.ok) {
      console.error("[places/photo] Google error:", res.status);
      return NextResponse.json({ error: "Photo not found" }, { status: res.status });
    }

    const imageBuffer = await res.arrayBuffer();
    const contentType = res.headers.get("Content-Type") ?? "image/jpeg";

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    console.error("[places/photo] Fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch photo" }, { status: 500 });
  }
}
