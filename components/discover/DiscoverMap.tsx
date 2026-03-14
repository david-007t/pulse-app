"use client";

import { useState, useEffect, useCallback } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useApiLoadingStatus,
} from "@vis.gl/react-google-maps";
import VenueMarker from "./VenueMarker";
import VenueBottomSheet from "./VenueBottomSheet";
import SearchBar from "./SearchBar";
import { parsePlacesResponse } from "@/lib/venueUtils";
import { AUBERGINE_STYLE } from "@/lib/mapStyles";
import type { Venue } from "@/types/venue";

const NASHVILLE = { lat: 36.1627, lng: -86.7816 };

// Build-time constants — safe to read at module scope in client components
const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
// Always provide a mapId so AdvancedMarker never warns about "no valid Map ID".
// DEMO_MAP_ID enables the vector renderer in development without a Cloud Console ID.
// When NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID is set we use the real Cloud Console ID,
// which also picks up the aubergine style configured there.
const MAP_ID =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

// True when we're falling back to DEMO_MAP_ID (vector renderer, no Cloud Console style)
const USING_DEMO_MAP_ID = !process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

// ---------------------------------------------------------------------------
// MapController — child of <Map> so it can call useMap()
// ---------------------------------------------------------------------------
function MapController({
  center,
}: {
  center: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (map && center) {
      map.panTo(center);
    }
  }, [map, center]);
  return null;
}

// Blue dot for the user's current position
function UserDot({ position }: { position: { lat: number; lng: number } }) {
  return (
    <AdvancedMarker position={position} zIndex={20}>
      <div style={{ position: "relative", width: 16, height: 16 }}>
        <div
          className="user-dot-pulse"
          style={{
            position: "absolute",
            inset: -6,
            borderRadius: "50%",
            backgroundColor: "#60A5FA",
            opacity: 0.35,
          }}
        />
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            backgroundColor: "#3B82F6",
            border: "2.5px solid white",
            boxShadow: "0 2px 8px rgba(59,130,246,0.6)",
          }}
        />
      </div>
    </AdvancedMarker>
  );
}

// ---------------------------------------------------------------------------
// Fallback UI helpers
// ---------------------------------------------------------------------------
function MapConfigError() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-8">
      <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl">
        🗺️
      </div>
      <p className="text-text font-semibold text-center">Map not configured</p>
      <p className="text-subtext text-sm text-center leading-relaxed">
        Add{" "}
        <code className="text-primary bg-surface px-1.5 py-0.5 rounded text-xs">
          NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        </code>{" "}
        to your{" "}
        <code className="text-primary bg-surface px-1.5 py-0.5 rounded text-xs">
          .env.local
        </code>{" "}
        to enable the live map.
      </p>
    </div>
  );
}

function MapLoadingState() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin"
          style={{ animationDuration: "0.8s" }}
        />
        <p className="text-subtext text-sm">Loading map…</p>
      </div>
    </div>
  );
}

function MapErrorState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-8">
      <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center text-2xl">
        ⚠️
      </div>
      <p className="text-text font-semibold text-center">
        Couldn&apos;t load the map
      </p>
      <p className="text-subtext text-sm text-center leading-relaxed">
        Check that your{" "}
        <code className="text-primary bg-surface px-1.5 py-0.5 rounded text-xs">
          NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        </code>{" "}
        is valid and that the Maps JavaScript API is enabled in your Google
        Cloud project.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MapInner — lives inside <APIProvider>, can use useApiLoadingStatus
// ---------------------------------------------------------------------------
function MapInner() {
  const apiStatus = useApiLoadingStatus();

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mapCenter, setMapCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

  // ── Geolocation ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLocation(NASHVILLE);
      setMapCenter(NASHVILLE);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setMapCenter(loc);
      },
      () => {
        setLocationDenied(true);
        setUserLocation(NASHVILLE);
        setMapCenter(NASHVILLE);
      },
      { timeout: 6000 }
    );
  }, []);

  // ── Fetch nearby venues ───────────────────────────────────────────────────
  const fetchVenues = useCallback(
    async (lat: number, lng: number) => {
      setLoading(true);
      try {
        const res = await fetch("/api/places/nearby", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng }),
        });
        const data = await res.json();
        console.log("[DiscoverMap] /api/places/nearby response:", {
          status: res.status,
          placeCount: Array.isArray(data.places) ? data.places.length : 0,
          error: data.error ?? null,
        });
        const parsed = parsePlacesResponse(
          data.places ?? [],
          userLocation?.lat ?? lat,
          userLocation?.lng ?? lng
        );
        console.log(`[DiscoverMap] Parsed ${parsed.length} venue(s) to display`);
        setVenues(parsed);
      } catch (err) {
        console.error("[DiscoverMap] fetchVenues error:", err);
      } finally {
        setLoading(false);
      }
    },
    [userLocation]
  );

  useEffect(() => {
    if (mapCenter) {
      fetchVenues(mapCenter.lat, mapCenter.lng);
    }
  }, [mapCenter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search selection ──────────────────────────────────────────────────────
  const handleSearchSelect = useCallback((lat: number, lng: number) => {
    setMapCenter({ lat, lng });
  }, []);

  const handleMarkerClick = useCallback((venue: Venue) => {
    setSelectedVenue((prev) => (prev?.id === venue.id ? null : venue));
  }, []);

  const initialCenter = userLocation ?? NASHVILLE;

  // ── API status gates ──────────────────────────────────────────────────────
  if (apiStatus === "LOADING") return <MapLoadingState />;
  if (apiStatus === "FAILED" || apiStatus === "AUTH_FAILURE")
    return <MapErrorState />;

  return (
    <>
      {/* ── Map ──────────────────────────────────────────────────────── */}
      <Map
        /*
         * MAP_ID is always set (DEMO_MAP_ID in dev, Cloud Console ID in prod).
         * With DEMO_MAP_ID → vector renderer, styles prop is ignored, so we
         * apply a CSS canvas filter (.pulse-map-dark) to fake the dark theme.
         * With a real Cloud Console ID → configure aubergine style there.
         */
        mapId={MAP_ID}
        defaultCenter={initialCenter}
        defaultZoom={15}
        disableDefaultUI
        gestureHandling="greedy"
        style={{ width: "100%", height: "100%" }}
        // styles prop only works on raster renderer (no mapId).
        // Kept here as a no-op safety net; real dark theme via CSS or Cloud Console.
        styles={AUBERGINE_STYLE}
      >
        {userLocation && <UserDot position={userLocation} />}

        {venues.map((venue) => (
          <VenueMarker
            key={venue.id}
            venue={venue}
            isSelected={selectedVenue?.id === venue.id}
            onClick={() => handleMarkerClick(venue)}
          />
        ))}

        <MapController center={mapCenter} />
      </Map>

      {/* ── Search bar overlay ───────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-12">
        <SearchBar
          onSelect={handleSearchSelect}
          userLocation={userLocation ?? NASHVILLE}
        />
      </div>

      {/* ── Location denied banner ───────────────────────────────────── */}
      {locationDenied && (
        <div className="absolute top-[4.5rem] left-4 right-4 z-20 mt-3">
          <div className="bg-surface/90 backdrop-blur border border-border rounded-xl px-3 py-2 flex items-center gap-2 shadow">
            <span className="text-xs">📍</span>
            <p className="text-subtext text-xs">
              Showing Nashville, TN — our MVP launch city
            </p>
          </div>
        </div>
      )}

      {/* ── Venue bottom sheet ───────────────────────────────────────── */}
      <VenueBottomSheet
        venues={venues}
        selectedVenue={selectedVenue}
        onSelect={setSelectedVenue}
        userLocation={userLocation ?? NASHVILLE}
        loading={loading}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// DiscoverMap — outer shell: guards missing key, provides APIProvider
// ---------------------------------------------------------------------------
export default function DiscoverMap() {
  if (!MAPS_API_KEY) return <MapConfigError />;

  return (
    <div
      className={`relative h-full w-full${USING_DEMO_MAP_ID ? " pulse-map-dark" : ""}`}
    >
      {/* Suppress Google's own error overlay — we render our own */}
      <style>{`.gm-err-container { display: none !important; }`}</style>

      <APIProvider apiKey={MAPS_API_KEY}>
        <MapInner />
      </APIProvider>
    </div>
  );
}
