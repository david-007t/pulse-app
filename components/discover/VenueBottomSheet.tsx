"use client";

import { useRef, useEffect } from "react";
import VenueCard from "./VenueCard";
import type { Venue } from "@/types/venue";

interface VenueBottomSheetProps {
  venues: Venue[];
  selectedVenue: Venue | null;
  onSelect: (venue: Venue | null) => void;
  /** Called when a card is tapped — opens the detail sheet */
  onOpenDetail: (venue: Venue) => void;
  userLocation: { lat: number; lng: number };
  loading: boolean;
}

const CARD_WIDTH = 204; // w-48 (192) + gap-3 (12)

export default function VenueBottomSheet({
  venues,
  selectedVenue,
  onSelect,
  onOpenDetail,
  loading,
}: VenueBottomSheetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the selected venue's card
  useEffect(() => {
    if (!selectedVenue || !scrollRef.current) return;
    const idx = venues.findIndex((v) => v.id === selectedVenue.id);
    if (idx < 0) return;
    scrollRef.current.scrollTo({
      left: idx * CARD_WIDTH,
      behavior: "smooth",
    });
  }, [selectedVenue, venues]);

  return (
    /* Sits above the fixed bottom nav (h-16 = 64px → bottom-16) */
    <div className="absolute bottom-16 left-0 right-0 z-10 pointer-events-none">
      {/* Pill header */}
      <div className="px-4 mb-2 flex items-center justify-between pointer-events-auto">
        <span className="text-white text-xs font-semibold backdrop-blur-md bg-surface/70 border border-border/40 px-3 py-1.5 rounded-full shadow">
          {loading
            ? "Finding venues…"
            : `${venues.length} venue${venues.length !== 1 ? "s" : ""} nearby`}
        </span>

        {selectedVenue && (
          <button
            onClick={() => onSelect(null)}
            className="text-xs text-subtext backdrop-blur-md bg-surface/70 border border-border/40 px-3 py-1.5 rounded-full shadow"
          >
            Clear
          </button>
        )}
      </div>

      {/* Horizontal card strip */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-4 pb-2 pointer-events-auto"
        style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
      >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 w-48 h-[196px] rounded-2xl border border-border bg-surface/80 animate-pulse"
              />
            ))
          : venues.map((venue) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                isSelected={selectedVenue?.id === venue.id}
                onClick={() => {
                  onSelect(venue);
                  onOpenDetail(venue);
                }}
              />
            ))}
      </div>
    </div>
  );
}
