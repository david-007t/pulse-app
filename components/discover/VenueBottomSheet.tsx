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

// w-44 (176px) + gap-3 (12px)
const CARD_WIDTH = 188;

export default function VenueBottomSheet({
  venues,
  selectedVenue,
  onSelect,
  onOpenDetail,
  loading,
}: VenueBottomSheetProps) {
  // scrollRef goes on the *outer* overflow-x-auto div (not the inner flex row)
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the selected venue's card
  useEffect(() => {
    if (!selectedVenue || !scrollRef.current) return;
    const idx = venues.findIndex((v) => v.id === selectedVenue.id);
    if (idx < 0) return;
    scrollRef.current.scrollTo({ left: idx * CARD_WIDTH, behavior: "smooth" });
  }, [selectedVenue, venues]);

  return (
    /*
     * Positioned exactly above the fixed bottom nav (64 px = h-16).
     * Inline style avoids Tailwind's rem-based spacing (which varies with
     * user font-size settings) and makes the value explicit for iOS.
     */
    <div
      className="absolute left-0 right-0 z-10 pointer-events-none"
      style={{ bottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* ── Glass tray panel ──────────────────────────────────────────── */}
      <div
        className="rounded-t-3xl border-t border-white/10 pointer-events-auto"
        style={{
          backgroundColor: "rgba(22, 22, 42, 0.97)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.6), 0 -1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div
            className="w-10 h-1 rounded-full"
            style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
          />
        </div>

        {/* Header: venue count + Clear */}
        <div className="px-4 pb-2.5 flex items-center justify-between">
          <span className="text-white/80 text-xs font-semibold tracking-wide uppercase">
            {loading
              ? "Finding venues…"
              : `${venues.length} venue${venues.length !== 1 ? "s" : ""} nearby`}
          </span>

          {selectedVenue && (
            <button
              onClick={() => onSelect(null)}
              className="text-subtext text-xs px-2.5 py-1 rounded-full border border-white/10 active:opacity-60 transition-opacity"
            >
              Clear
            </button>
          )}
        </div>

        {/*
         * ── Horizontal card scroll ─────────────────────────────────────
         *
         * iOS Safari bug: `flex + overflow-x-auto` containers can collapse
         * their block-axis height when children overflow horizontally,
         * clipping everything below the first child (i.e., the photo).
         *
         * Fix: block-level outer div owns `overflow-x: auto`; a separate
         * inner flex div with `width: max-content` gives the outer div a
         * reliable intrinsic height equal to the tallest card.
         */}
        <div
          ref={scrollRef}
          className="overflow-x-auto"
          style={{
            scrollbarWidth: "none",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            WebkitOverflowScrolling: "touch" as any,
          }}
        >
          <div
            className="flex gap-3 px-4 pb-4"
            style={{ width: "max-content", scrollSnapType: "x mandatory" }}
          >
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
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
      </div>
    </div>
  );
}

// Skeleton card — matches VenueCard dimensions exactly
function SkeletonCard() {
  return (
    <div
      className="shrink-0 rounded-2xl border border-white/8 overflow-hidden animate-pulse"
      style={{
        width: 176,
        backgroundColor: "rgba(30, 30, 52, 0.9)",
        scrollSnapAlign: "start",
      }}
    >
      <div style={{ height: 104, backgroundColor: "rgba(42,42,69,0.6)" }} />
      <div className="p-3 space-y-2">
        <div className="h-3.5 rounded" style={{ width: "75%", backgroundColor: "rgba(42,42,69,0.8)" }} />
        <div className="h-3 rounded" style={{ width: "50%", backgroundColor: "rgba(42,42,69,0.8)" }} />
        <div className="h-3 rounded" style={{ width: "60%", backgroundColor: "rgba(42,42,69,0.8)" }} />
      </div>
    </div>
  );
}
