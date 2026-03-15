"use client";

import type { Venue } from "@/types/venue";
import { formatDistance } from "@/lib/venueUtils";

interface VenueListViewProps {
  venues: Venue[];
  /** Total venues before any limit was applied — used for "Showing X of Y" */
  totalBeforeLimit?: number;
  loading: boolean;
  onOpenDetail: (venue: Venue) => void;
  /** Called when the user taps "Show more" — steps limit up to the next tier */
  onShowMore?: () => void;
  /** px from top to clear the search bar + filter bar overlay */
  topOffset?: number;
}

function getPriceLabel(priceLevel?: string): string {
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

function StarRating({ rating }: { rating: number }) {
  if (!rating) return null;
  return (
    <span className="text-xs text-subtext">
      ⭐ {rating.toFixed(1)}
    </span>
  );
}

function FlameRow({ level }: { level: number }) {
  return (
    <span className="text-xs">
      {Array.from({ length: 4 }).map((_, i) => (
        <span key={i} style={{ opacity: i < level ? 1 : 0.2 }}>
          🔥
        </span>
      ))}
    </span>
  );
}

function SkeletonItem() {
  return (
    <div className="flex items-start gap-3 px-4 py-4 border-b border-border/40 animate-pulse">
      <div className="w-[72px] h-[72px] rounded-xl bg-surface/60 flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-4 bg-surface/60 rounded w-3/4" />
        <div className="h-3 bg-surface/60 rounded w-1/2" />
        <div className="h-3 bg-surface/60 rounded w-2/3" />
      </div>
    </div>
  );
}

function VenueListItem({
  venue,
  onOpenDetail,
}: {
  venue: Venue;
  onOpenDetail: (v: Venue) => void;
}) {
  const photoSrc = venue.firstPhotoName
    ? `/api/places/photo?name=${encodeURIComponent(venue.firstPhotoName)}&maxWidth=144`
    : null;
  const price = getPriceLabel(venue.priceLevel);

  return (
    <button
      onClick={() => onOpenDetail(venue)}
      className="w-full flex items-start gap-3 px-4 py-4 border-b border-border/40 active:bg-surface/50 transition-colors text-left"
    >
      {/* ── Thumbnail ──────────────────────────────────────────────── */}
      <div className="w-[72px] h-[72px] rounded-xl overflow-hidden flex-shrink-0">
        {photoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoSrc}
            alt={venue.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-xl"
            style={{
              background: venue.isBusy
                ? "linear-gradient(135deg,rgba(236,72,153,0.25),rgba(124,58,237,0.2))"
                : "linear-gradient(135deg,rgba(124,58,237,0.2),rgba(13,13,26,0.5))",
            }}
          >
            {venue.isBusy ? "🔥" : "🍸"}
          </div>
        )}
      </div>

      {/* ── Info ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-text font-semibold text-base leading-tight truncate">
          {venue.name}
        </p>

        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              venue.isOpen ? "bg-green-400" : "bg-red-400"
            }`}
          />
          <span
            className={`text-xs font-medium ${
              venue.isOpen ? "text-green-400" : "text-red-400"
            }`}
          >
            {venue.isOpen ? "Open" : "Closed"}
          </span>
          {price && (
            <>
              <span className="text-subtext/40 text-xs">·</span>
              <span className="text-subtext text-xs">{price}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <StarRating rating={venue.rating} />
          {venue.isOpen && venue.busynessLevel > 0 && (
            <FlameRow level={venue.busynessLevel} />
          )}
          {venue.distance != null && (
            <span className="text-xs text-subtext">
              {formatDistance(venue.distance)}
            </span>
          )}
        </div>
      </div>

      {/* ── Chevron ─────────────────────────────────────────────────── */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#9CA3AF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-shrink-0 mt-2"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

export default function VenueListView({
  venues,
  totalBeforeLimit,
  loading,
  onOpenDetail,
  onShowMore,
  topOffset = 164,
}: VenueListViewProps) {
  // Show the banner only when a limit is actually cutting results short
  const isLimited =
    !loading &&
    venues.length > 0 &&
    totalBeforeLimit != null &&
    totalBeforeLimit > venues.length;

  // Whether stepping up is still possible (null limit = All, no more steps)
  const canShowMore = isLimited && onShowMore != null;

  return (
    <div
      className="absolute inset-0 overflow-y-auto bg-background"
      style={{ paddingTop: topOffset, paddingBottom: 80 }}
    >
      {/* ── "Showing X of Y" banner ─────────────────────────────────── */}
      {isLimited && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40">
          <p className="text-subtext text-xs">
            Showing{" "}
            <span className="text-text font-semibold">{venues.length}</span>
            {" "}of{" "}
            <span className="text-text font-semibold">{totalBeforeLimit}</span>
            {" "}venues
          </p>
          {canShowMore && (
            <button
              onClick={onShowMore}
              className="text-primary text-xs font-semibold active:opacity-60 transition-opacity"
            >
              Show more ›
            </button>
          )}
        </div>
      )}

      {/* ── Venue rows / skeletons / empty state ─────────────────────── */}
      {loading ? (
        Array.from({ length: 6 }).map((_, i) => <SkeletonItem key={i} />)
      ) : venues.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 px-8">
          <span className="text-4xl opacity-40">🍸</span>
          <p className="text-subtext text-sm text-center">
            No venues match your filters. Try adjusting the filters above.
          </p>
        </div>
      ) : (
        venues.map((venue) => (
          <VenueListItem key={venue.id} venue={venue} onOpenDetail={onOpenDetail} />
        ))
      )}
    </div>
  );
}
