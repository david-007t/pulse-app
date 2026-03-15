"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useApiLoadingStatus,
} from "@vis.gl/react-google-maps";
import VenueMarker from "./VenueMarker";
import VenueBottomSheet from "./VenueBottomSheet";
import VenueDetailSheet from "./VenueDetailSheet";
import VenueListView from "./VenueListView";
import SearchBar from "./SearchBar";
import FilterBar, {
  DEFAULT_FILTERS,
  type ActiveFilters,
} from "./FilterBar";
import { parsePlacesResponse } from "@/lib/venueUtils";
import { AUBERGINE_STYLE } from "@/lib/mapStyles";
import type { Venue, VenueDetails } from "@/types/venue";

const NASHVILLE = { lat: 36.1627, lng: -86.7816 };

// Build-time constants
const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";
const USING_DEMO_MAP_ID = !process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

// Overlay top offset in px — search bar + filter bar combined height.
// Used for list-view top padding and location-denied banner.
// pt-safe (≥48) + SearchBar (50) + gap (8) + FilterBar (44) = ~150 → bump to 172 for
// Dynamic Island devices (safe-area-inset-top up to ~59 px on iPhone 14 Pro+).
const OVERLAY_TOP_OFFSET = 172;

// ---------------------------------------------------------------------------
// Filter application
// ---------------------------------------------------------------------------
function applyFilters(venues: Venue[], filters: ActiveFilters): Venue[] {
  let result = [...venues];

  // Category: bars vs clubs
  if (filters.category === "bars") {
    result = result.filter(
      (v) => v.types?.includes("bar") && !v.types?.includes("night_club")
    );
  } else if (filters.category === "clubs") {
    result = result.filter((v) => v.types?.includes("night_club"));
  }

  // Open now
  if (filters.open) {
    result = result.filter((v) => v.isOpen);
  }

  // Sort
  if (filters.sort === "distance") {
    result = [...result].sort(
      (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)
    );
  } else if (filters.sort === "rating") {
    result = [...result].sort((a, b) => b.rating - a.rating);
  } else if (filters.sort === "busiest") {
    result = [...result].sort((a, b) => b.busynessLevel - a.busynessLevel);
  }

  return result;
}

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
    if (map && center) map.panTo(center);
  }, [map, center]);
  return null;
}

// Blue dot for user's current position
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
// Fallback UI
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
        is valid and the Maps JavaScript API is enabled.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// View toggle button
// ---------------------------------------------------------------------------
function ViewToggleButton({
  view,
  onToggle,
}: {
  view: "map" | "list";
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex-shrink-0 w-11 h-11 rounded-2xl bg-surface/95 backdrop-blur-lg border border-border flex items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-all active:scale-95"
      aria-label={view === "map" ? "Switch to list view" : "Switch to map view"}
    >
      {view === "map" ? (
        // List icon
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      ) : (
        // Map icon
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
          <line x1="9" y1="3" x2="9" y2="18" />
          <line x1="15" y1="6" x2="15" y2="21" />
        </svg>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// MapInner — lives inside <APIProvider>, holds all interactive state
// ---------------------------------------------------------------------------
function MapInner() {
  const apiStatus = useApiLoadingStatus();

  // ── Core state ──────────────────────────────────────────────────────────
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

  // ── View & filter state ────────────────────────────────────────────────
  const [view, setView] = useState<"map" | "list">("map");
  const [filters, setFilters] = useState<ActiveFilters>(DEFAULT_FILTERS);

  // ── Detail sheet state ─────────────────────────────────────────────────
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailVenue, setDetailVenue] = useState<Venue | null>(null);
  const [venueDetails, setVenueDetails] = useState<VenueDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Search-result state ─────────────────────────────────────────────────
  // Tracks the venue selected from the search autocomplete. Rendered as a
  // distinct pink marker even if it isn't in the current nearby results.
  const [searchedVenue, setSearchedVenue] = useState<Venue | null>(null);

  // ── Geolocation ─────────────────────────────────────────────────────────
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

  // ── Fetch nearby venues ─────────────────────────────────────────────────
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
    if (mapCenter) fetchVenues(mapCenter.lat, mapCenter.lng);
  }, [mapCenter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Open detail sheet ───────────────────────────────────────────────────
  const openDetail = useCallback(async (venue: Venue) => {
    setDetailVenue(venue);
    setVenueDetails(null);
    setIsDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await fetch(
        `/api/places/details?placeId=${encodeURIComponent(venue.id)}`
      );
      const data = await res.json();
      setVenueDetails(data as VenueDetails);
    } catch (err) {
      console.error("[DiscoverMap] openDetail error:", err);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setIsDetailOpen(false);
  }, []);

  // ── Search selection ────────────────────────────────────────────────────
  const handleSearchSelect = useCallback(
    (lat: number, lng: number, label: string, placeId: string) => {
      // Re-centre map and refresh nearby venues for the searched area
      setMapCenter({ lat, lng });

      // Build a minimal Venue so we can open the detail sheet immediately.
      // openDetail fetches the full VenueDetails (hours, photos, etc.) by ID.
      // The searched venue is shown regardless of Open Now filter or distance.
      const placeholder: Venue = {
        id: placeId,
        name: label,
        address: "",
        location: { lat, lng },
        isOpen: false,
        rating: 0,
        userRatingCount: 0,
        businessStatus: "OPERATIONAL",
        isBusy: false,
        busynessLevel: 0,
        types: [],
      };

      setSearchedVenue(placeholder);
      openDetail(placeholder);
    },
    [openDetail]
  );

  // ── Search clear ────────────────────────────────────────────────────────
  const handleSearchClear = useCallback(() => {
    setSearchedVenue(null);
    closeDetail();
  }, [closeDetail]);

  // ── Marker click ────────────────────────────────────────────────────────
  const handleMarkerClick = useCallback(
    (venue: Venue) => {
      setSelectedVenue((prev) => (prev?.id === venue.id ? null : venue));
      openDetail(venue);
    },
    [openDetail]
  );

  // ── Filtered venues ─────────────────────────────────────────────────────
  const filteredVenues = useMemo(
    () => applyFilters(venues, filters),
    [venues, filters]
  );

  // Apply limit on top of filtered results
  const displayedVenues = useMemo(
    () =>
      filters.limit === null
        ? filteredVenues
        : filteredVenues.slice(0, filters.limit),
    [filteredVenues, filters.limit]
  );

  // Step limit up: 5 → 10 → 20 → All (null)
  const handleShowMore = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      limit:
        prev.limit === 5 ? 10
        : prev.limit === 10 ? 20
        : null,
    }));
  }, []);

  // Keep selectedVenue in sync with displayed list
  useEffect(() => {
    if (
      selectedVenue &&
      !displayedVenues.find((v) => v.id === selectedVenue.id)
    ) {
      setSelectedVenue(null);
    }
  }, [displayedVenues, selectedVenue]);

  const initialCenter = userLocation ?? NASHVILLE;

  // ── API status gates ─────────────────────────────────────────────────────
  if (apiStatus === "LOADING") return <MapLoadingState />;
  if (apiStatus === "FAILED" || apiStatus === "AUTH_FAILURE")
    return <MapErrorState />;

  return (
    <>
      {/* ── Map (hidden in list view) ──────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{ visibility: view === "map" ? "visible" : "hidden" }}
      >
        <Map
          mapId={MAP_ID}
          defaultCenter={initialCenter}
          defaultZoom={15}
          disableDefaultUI
          gestureHandling="greedy"
          style={{ width: "100%", height: "100%" }}
          styles={AUBERGINE_STYLE}
          clickableIcons={false}
          colorScheme="DARK"
        >
          {userLocation && <UserDot position={userLocation} />}

          {/* Regular venue markers — skip the searched venue (rendered below) */}
          {displayedVenues
            .filter((v) => v.id !== searchedVenue?.id)
            .map((venue) => (
              <VenueMarker
                key={venue.id}
                venue={venue}
                isSelected={selectedVenue?.id === venue.id}
                onClick={() => handleMarkerClick(venue)}
              />
            ))}

          {/* Search-result marker — always pink + large, unaffected by filters */}
          {searchedVenue && (
            <VenueMarker
              key={`search-${searchedVenue.id}`}
              venue={searchedVenue}
              isSelected
              isSearchResult
              onClick={() => openDetail(searchedVenue)}
            />
          )}

          <MapController center={mapCenter} />
        </Map>
      </div>

      {/* ── List view ──────────────────────────────────────────────── */}
      {view === "list" && (
        <VenueListView
          venues={displayedVenues}
          totalBeforeLimit={filteredVenues.length}
          loading={loading}
          onOpenDetail={openDetail}
          onShowMore={handleShowMore}
          topOffset={OVERLAY_TOP_OFFSET}
        />
      )}

      {/* ── Top overlays: Search + Toggle + Filters ─────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-12 space-y-2">
        {/* Search row */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchBar
              onSelect={handleSearchSelect}
              onClear={handleSearchClear}
              userLocation={userLocation ?? NASHVILLE}
            />
          </div>
          <ViewToggleButton
            view={view}
            onToggle={() => setView((v) => (v === "map" ? "list" : "map"))}
          />
        </div>

        {/* Filter pills */}
        <FilterBar filters={filters} onChange={setFilters} />
      </div>

      {/* ── Location denied banner ──────────────────────────────────── */}
      {locationDenied && (
        <div
          className="absolute left-4 right-4 z-20 mt-3"
          style={{ top: OVERLAY_TOP_OFFSET + 8 }}
        >
          <div className="bg-surface/90 backdrop-blur border border-border rounded-xl px-3 py-2 flex items-center gap-2 shadow">
            <span className="text-xs">📍</span>
            <p className="text-subtext text-xs">
              Showing Nashville, TN — our MVP launch city
            </p>
          </div>
        </div>
      )}

      {/* ── Venue bottom sheet (map view only) ─────────────────────── */}
      {view === "map" && (
        <VenueBottomSheet
          venues={displayedVenues}
          selectedVenue={selectedVenue}
          onSelect={setSelectedVenue}
          onOpenDetail={openDetail}
          userLocation={userLocation ?? NASHVILLE}
          loading={loading}
        />
      )}

      {/* ── Venue detail sheet (both views) ────────────────────────── */}
      <VenueDetailSheet
        isOpen={isDetailOpen}
        onClose={closeDetail}
        venue={detailVenue}
        details={venueDetails}
        loading={detailLoading}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// DiscoverMap — outer shell: guards missing API key, provides APIProvider
// ---------------------------------------------------------------------------
export default function DiscoverMap() {
  if (!MAPS_API_KEY) return <MapConfigError />;

  return (
    <div
      className={`relative h-full w-full${USING_DEMO_MAP_ID ? " pulse-map-dark" : ""}`}
    >
      {/* Suppress Google's own error overlay; we render our own */}
      <style>{`.gm-err-container { display: none !important; }`}</style>

      <APIProvider apiKey={MAPS_API_KEY}>
        <MapInner />
      </APIProvider>
    </div>
  );
}
