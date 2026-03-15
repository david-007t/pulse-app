"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Venue, VenueDetails, VenuePhoto } from "@/types/venue";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Haversine great-circle distance between two lat/lng points.
 * Returns distance in miles.
 */
function haversineDistanceMi(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Formats a distance + travel-time string.
 * Example: "0.8 mi away · 16 min walk · 2 min drive"
 */
function formatDistanceRow(distMi: number): string {
  const distLabel =
    distMi < 0.1 ? "< 0.1 mi away" : `${distMi.toFixed(1)} mi away`;
  const walkMin = Math.max(1, Math.round((distMi / 3) * 60));
  const driveMin = Math.max(1, Math.round((distMi / 25) * 60));
  return `${distLabel} · ${walkMin} min walk · ${driveMin} min drive`;
}

function getPriceLabel(priceLevel?: string | null): string {
  switch (priceLevel) {
    case "PRICE_LEVEL_INEXPENSIVE":
      return "$";
    case "PRICE_LEVEL_MODERATE":
      return "$$";
    case "PRICE_LEVEL_EXPENSIVE":
      return "$$$";
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return "$$$$";
    default:
      return "";
  }
}

function getTodayHours(weekdayDescriptions?: string[]): string | null {
  if (!weekdayDescriptions?.length) return null;
  // weekdayDescriptions[0] = Monday in Google's locale; getDay() 0=Sun,1=Mon…6=Sat
  const dayIndex = new Date().getDay(); // 0 = Sunday
  // Google orders Mon(0)..Sun(6) but JS is Sun(0)..Sat(6)
  const googleIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  const entry = weekdayDescriptions[googleIndex];
  if (!entry) return null;
  // Strip the day name prefix, e.g. "Monday: 5:00 PM – 2:00 AM" → "5:00 PM – 2:00 AM"
  const colonIdx = entry.indexOf(":");
  return colonIdx !== -1 ? entry.slice(colonIdx + 1).trim() : entry;
}

// ── Star rating ───────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = rating >= i;
        const half = !filled && rating >= i - 0.5;
        return (
          <svg key={i} width="12" height="12" viewBox="0 0 24 24">
            <defs>
              <linearGradient id={`half-${i}`}>
                <stop offset="50%" stopColor="#FBBF24" />
                <stop offset="50%" stopColor="#374151" />
              </linearGradient>
            </defs>
            <polygon
              points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              fill={filled ? "#FBBF24" : half ? `url(#half-${i})` : "#374151"}
              stroke="none"
            />
          </svg>
        );
      })}
    </div>
  );
}

// ── Photo carousel ────────────────────────────────────────────────────────────

function PhotoCarousel({
  photos,
  venueName,
}: {
  photos: VenuePhoto[];
  venueName: string;
}) {
  const [idx, setIdx] = useState(0);
  const touchStartX = useRef(0);

  if (photos.length === 0) {
    return (
      <div
        className="w-full h-56 flex items-center justify-center text-5xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(236,72,153,0.15) 100%)",
        }}
      >
        🍸
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-56 overflow-hidden bg-surface"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        if (delta < -50 && idx < photos.length - 1) setIdx((i) => i + 1);
        if (delta > 50 && idx > 0) setIdx((i) => i - 1);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={idx}
        src={`/api/places/photo?name=${encodeURIComponent(photos[idx].name)}&maxWidth=800`}
        alt={`${venueName} photo ${idx + 1}`}
        className="w-full h-full object-cover"
        loading="lazy"
      />

      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

      {/* Dot indicators */}
      {photos.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
          {photos.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-200 ${
                i === idx ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}

      {/* Photo counter */}
      {photos.length > 1 && (
        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 text-white text-xs pointer-events-none">
          {idx + 1} / {photos.length}
        </div>
      )}
    </div>
  );
}

// ── Photo loading skeleton ────────────────────────────────────────────────────

function PhotoSkeleton() {
  return <div className="w-full h-56 bg-surface animate-pulse" />;
}

// ── Amenity pill ──────────────────────────────────────────────────────────────

function AmenityPill({
  icon,
  label,
  active,
}: {
  icon: string;
  label: string;
  active?: boolean;
}) {
  if (active === false || active === undefined) return null;
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30">
      <span className="text-sm">{icon}</span>
      <span className="text-xs text-text font-medium">{label}</span>
    </div>
  );
}

// ── Synthetic popular times ───────────────────────────────────────────────────

function getHourBusyness(hour: number, busynessLevel: number): number {
  const BASE: Record<number, number> = {
    0: 0.82, 1: 0.65, 2: 0.38, 3: 0.08, 4: 0.04, 5: 0.03,
    6: 0.04, 7: 0.05, 8: 0.06, 9: 0.07, 10: 0.08, 11: 0.1,
    12: 0.12, 13: 0.11, 14: 0.1, 15: 0.13, 16: 0.16, 17: 0.2,
    18: 0.3, 19: 0.45, 20: 0.58, 21: 0.7, 22: 0.82, 23: 0.9,
  };
  const base = BASE[hour] ?? 0.05;
  const modifier = (busynessLevel - 2) * 0.06;
  return Math.min(1, Math.max(0.03, base + modifier));
}

function PopularTimesChart({ busynessLevel }: { busynessLevel: number }) {
  const currentHour = new Date().getHours();
  // Show 12pm → 4am (the nightlife window): 12,13,...23,0,1,2,3
  const hours = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3];

  const labels: Record<number, string> = {
    12: "12p", 15: "3p", 18: "6p", 21: "9p", 0: "12a", 3: "3a",
  };

  return (
    <div>
      <div className="flex items-end gap-1 h-16">
        {hours.map((h) => {
          const pct = getHourBusyness(h, busynessLevel);
          const isCurrent = h === currentHour;
          return (
            <div key={h} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className="w-full rounded-sm transition-all"
                style={{
                  height: `${Math.round(pct * 56)}px`,
                  minHeight: 3,
                  background: isCurrent
                    ? "linear-gradient(180deg, #EC4899 0%, #7C3AED 100%)"
                    : pct > 0.6
                    ? "rgba(124,58,237,0.7)"
                    : "rgba(124,58,237,0.3)",
                }}
              />
            </div>
          );
        })}
      </div>
      {/* Hour labels */}
      <div className="flex gap-1 mt-1">
        {hours.map((h) => (
          <div key={h} className="flex-1 text-center">
            {labels[h] ? (
              <span className="text-[9px] text-subtext">{labels[h]}</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Skeleton line helper ──────────────────────────────────────────────────────

function SkeletonLine({ w = "w-full", h = "h-3" }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} rounded bg-surface/80 animate-pulse`} />;
}

// ── Main component ────────────────────────────────────────────────────────────

interface VenueDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  venue: Venue | null;
  details: VenueDetails | null;
  loading: boolean;
  /** User's current GPS position — used to show distance + travel time */
  userLocation?: { lat: number; lng: number } | null;
}

export default function VenueDetailSheet({
  isOpen,
  onClose,
  venue,
  details,
  loading,
  userLocation,
}: VenueDetailSheetProps) {
  // Mount/unmount with animation
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Drag-to-dismiss state
  const [dragY, setDragY] = useState(0);
  const dragStartRef = useRef<number | null>(null);

  // Hours expansion
  const [hoursExpanded, setHoursExpanded] = useState(false);

  // ── Animation lifecycle ─────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setDragY(0);
      setHoursExpanded(false);
      setIsMounted(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isMounted && isOpen) {
      // Double rAF to ensure layout has painted before triggering transition
      const raf = requestAnimationFrame(() =>
        requestAnimationFrame(() => setIsVisible(true))
      );
      return () => cancelAnimationFrame(raf);
    }
    if (isMounted && !isOpen) {
      setIsVisible(false);
      const t = setTimeout(() => {
        setIsMounted(false);
        setDragY(0);
      }, 380);
      return () => clearTimeout(t);
    }
  }, [isMounted, isOpen]);

  // ── Drag handlers ───────────────────────────────────────────────────────
  const handleDragStart = useCallback((clientY: number) => {
    dragStartRef.current = clientY;
  }, []);

  const handleDragMove = useCallback((clientY: number) => {
    if (dragStartRef.current === null) return;
    const delta = clientY - dragStartRef.current;
    if (delta > 0) setDragY(delta);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragY > 120) {
      onClose();
    } else {
      setDragY(0);
    }
    dragStartRef.current = null;
  }, [dragY, onClose]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isMounted || !venue) return null;

  // ── Derived data ──────────────────────────────────────────────────────
  const price = getPriceLabel(details?.priceLevel ?? venue.priceLevel);

  // Distance from user to this venue (updates automatically as userLocation prop changes)
  const distanceRow =
    userLocation && venue.location?.lat != null && venue.location?.lng != null
      ? formatDistanceRow(
          haversineDistanceMi(
            userLocation.lat,
            userLocation.lng,
            venue.location.lat,
            venue.location.lng
          )
        )
      : null;
  const todayHours = getTodayHours(
    details?.currentOpeningHours?.weekdayDescriptions ??
      details?.regularOpeningHours?.weekdayDescriptions
  );
  const allWeekHours =
    details?.regularOpeningHours?.weekdayDescriptions ??
    details?.currentOpeningHours?.weekdayDescriptions ??
    [];
  const photos = details?.photos ?? [];

  const amenities = [
    { icon: "🌿", label: "Outdoor", active: details?.outdoorSeating },
    { icon: "🍸", label: "Cocktails", active: details?.servesCocktails },
    { icon: "🍺", label: "Beer", active: details?.servesBeer },
    { icon: "🍷", label: "Wine", active: details?.servesWine },
    { icon: "📅", label: "Reservable", active: details?.reservable },
  ];
  const hasAmenities = amenities.some((a) => a.active === true);

  const isDragging = dragStartRef.current !== null;

  return (
    <div className="absolute inset-0 z-40" style={{ pointerEvents: "auto" }}>
      {/* ── Backdrop ────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: `rgba(0,0,0,${isVisible ? 0.65 : 0})`,
          backdropFilter: `blur(${isVisible ? 3 : 0}px)`,
          transition: "background-color 0.35s ease, backdrop-filter 0.35s ease",
        }}
        onClick={handleClose}
      />

      {/* ── Sheet ───────────────────────────────────────────────────── */}
      <div
        className="absolute left-0 right-0 flex flex-col rounded-t-3xl overflow-hidden shadow-2xl"
        style={{
          bottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
          maxHeight: "88vh",
          backgroundColor: "#16162A",
          transform: isVisible
            ? `translateY(${dragY}px)`
            : "translateY(100%)",
          transition: isDragging
            ? "none"
            : "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* ── Drag handle ───────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
          onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
          onTouchEnd={handleDragEnd}
          onMouseDown={(e) => handleDragStart(e.clientY)}
          onMouseMove={(e) =>
            dragStartRef.current !== null && handleDragMove(e.clientY)
          }
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* ── Scrollable content ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Photos */}
          {loading ? (
            <PhotoSkeleton />
          ) : (
            <PhotoCarousel photos={photos} venueName={venue.name} />
          )}

          <div className="px-5 pt-5 pb-8 space-y-5">
            {/* ── Header: name, rating, price, open/close ────────────── */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-text font-bold text-xl leading-tight flex-1">
                  {venue.name}
                </h2>
                {/* Close button */}
                <button
                  onClick={handleClose}
                  className="flex-shrink-0 w-8 h-8 rounded-full bg-surface/80 border border-border flex items-center justify-center"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#9CA3AF"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Rating row */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {venue.rating > 0 && (
                  <>
                    <StarRating rating={venue.rating} />
                    <span className="text-text font-semibold text-sm">
                      {venue.rating.toFixed(1)}
                    </span>
                    {venue.userRatingCount > 0 && (
                      <span className="text-subtext text-xs">
                        ({venue.userRatingCount.toLocaleString()})
                      </span>
                    )}
                  </>
                )}
                {price && (
                  <>
                    <span className="text-border/60">·</span>
                    <span className="text-subtext text-sm font-medium">
                      {price}
                    </span>
                  </>
                )}
              </div>

              {/* Open/close badge */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    venue.isOpen
                      ? "bg-green-400/15 text-green-400 border border-green-400/30"
                      : "bg-red-400/15 text-red-400 border border-red-400/30"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      venue.isOpen ? "bg-green-400" : "bg-red-400"
                    }`}
                  />
                  {venue.isOpen ? "Open now" : "Closed"}
                </span>
                {todayHours && (
                  <span className="text-subtext text-xs">{todayHours}</span>
                )}
              </div>

              {/* Distance + travel time */}
              {distanceRow && (
                <p className="text-xs mt-1.5" style={{ color: "#9CA3AF" }}>
                  📍 {distanceRow}
                </p>
              )}
            </div>

            {/* ── Editorial summary ─────────────────────────────────── */}
            {loading ? (
              <div className="space-y-2">
                <SkeletonLine w="w-full" />
                <SkeletonLine w="w-4/5" />
              </div>
            ) : details?.editorialSummary ? (
              <p className="text-subtext text-sm leading-relaxed">
                {details.editorialSummary}
              </p>
            ) : null}

            {/* ── Amenities ─────────────────────────────────────────── */}
            {loading ? (
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-20 rounded-full bg-surface/60 animate-pulse"
                  />
                ))}
              </div>
            ) : hasAmenities ? (
              <>
                <div className="h-px bg-border/40" />
                <div>
                  <p className="text-subtext text-xs font-semibold uppercase tracking-wider mb-3">
                    Amenities
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {amenities.map((a) => (
                      <AmenityPill
                        key={a.label}
                        icon={a.icon}
                        label={a.label}
                        active={a.active ?? undefined}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : null}

            {/* ── Hours ─────────────────────────────────────────────── */}
            <div className="h-px bg-border/40" />
            <div>
              <button
                onClick={() => setHoursExpanded((v) => !v)}
                className="w-full flex items-center justify-between"
              >
                <p className="text-subtext text-xs font-semibold uppercase tracking-wider">
                  Hours
                </p>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9CA3AF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className={`transition-transform ${
                    hoursExpanded ? "rotate-180" : ""
                  }`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {loading ? (
                <div className="mt-3 space-y-2">
                  {[1, 2].map((i) => (
                    <SkeletonLine key={i} w={i === 1 ? "w-3/4" : "w-2/3"} />
                  ))}
                </div>
              ) : hoursExpanded && allWeekHours.length > 0 ? (
                <div className="mt-3 space-y-1.5">
                  {allWeekHours.map((line, i) => {
                    const colonIdx = line.indexOf(":");
                    const day = colonIdx !== -1 ? line.slice(0, colonIdx) : line;
                    const time =
                      colonIdx !== -1 ? line.slice(colonIdx + 1).trim() : "";
                    const todayIdx =
                      new Date().getDay() === 0
                        ? 6
                        : new Date().getDay() - 1;
                    const isToday = i === todayIdx;
                    return (
                      <div
                        key={i}
                        className={`flex justify-between text-xs ${
                          isToday ? "text-text font-semibold" : "text-subtext"
                        }`}
                      >
                        <span>{day}</span>
                        <span>{time}</span>
                      </div>
                    );
                  })}
                </div>
              ) : !hoursExpanded && todayHours ? (
                <p className="mt-2 text-subtext text-xs">
                  Today: {todayHours}
                </p>
              ) : null}
            </div>

            {/* ── Popular times ─────────────────────────────────────── */}
            <div className="h-px bg-border/40" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-subtext text-xs font-semibold uppercase tracking-wider">
                  Popular Times
                </p>
                <span className="text-subtext/60 text-[10px]">
                  estimated
                </span>
              </div>
              <PopularTimesChart busynessLevel={venue.busynessLevel} />
            </div>

            {/* ── Action buttons ────────────────────────────────────── */}
            <div className="h-px bg-border/40" />
            <div className="space-y-3">
              <button
                className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-all active:scale-[0.98]"
                style={{
                  background:
                    "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
                  boxShadow: "0 4px 16px rgba(124,58,237,0.4)",
                }}
                onClick={() =>
                  console.log("[VenueDetailSheet] Going Tonight →", venue.name)
                }
              >
                ✈️ Going Tonight
              </button>
              <button
                className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-all active:scale-[0.98]"
                style={{
                  background:
                    "linear-gradient(135deg, #EC4899 0%, #DB2777 100%)",
                  boxShadow: "0 4px 16px rgba(236,72,153,0.4)",
                }}
                onClick={() =>
                  console.log("[VenueDetailSheet] Vibe Check →", venue.name)
                }
              >
                🔥 Vibe Check
              </button>
            </div>

            {/* ── Contact info ──────────────────────────────────────── */}
            {(details?.websiteUri || details?.nationalPhoneNumber) && (
              <>
                <div className="h-px bg-border/40" />
                <div className="flex flex-wrap gap-3">
                  {details.websiteUri && (
                    <a
                      href={details.websiteUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary text-sm hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                      Website
                    </a>
                  )}
                  {details.nationalPhoneNumber && (
                    <a
                      href={`tel:${details.nationalPhoneNumber}`}
                      className="flex items-center gap-2 text-primary text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3 1h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 21 16z" />
                      </svg>
                      {details.nationalPhoneNumber}
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
