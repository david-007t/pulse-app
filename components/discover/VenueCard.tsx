import type { Venue } from "@/types/venue";
import { formatDistance } from "@/lib/venueUtils";

interface VenueCardProps {
  venue: Venue;
  isSelected: boolean;
  onClick: () => void;
}

function FlameIndicator({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4].map((i) => (
        <span key={i} style={{ opacity: i <= level ? 1 : 0.2, fontSize: 10 }}>
          🔥
        </span>
      ))}
    </div>
  );
}

export default function VenueCard({ venue, isSelected, onClick }: VenueCardProps) {
  const photoSrc = venue.firstPhotoName
    ? `/api/places/photo?name=${encodeURIComponent(venue.firstPhotoName)}&maxWidth=384`
    : null;

  return (
    <div
      onClick={onClick}
      className={[
        "shrink-0 w-48 rounded-2xl cursor-pointer transition-all duration-200 border overflow-hidden",
        isSelected
          ? "border-primary bg-surface shadow-[0_0_24px_rgba(124,58,237,0.35)]"
          : "border-border bg-surface/90 backdrop-blur-md",
      ].join(" ")}
      style={{ scrollSnapAlign: "start" }}
    >
      {/* ── Photo / Placeholder ──────────────────────────────────────── */}
      {photoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoSrc}
          alt={venue.name}
          className="w-full h-24 object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className="w-full h-24 flex items-center justify-center text-2xl"
          style={{
            background: venue.isBusy
              ? "linear-gradient(135deg, rgba(236,72,153,0.25) 0%, rgba(124,58,237,0.2) 100%)"
              : "linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(13,13,26,0.5) 100%)",
          }}
        >
          {venue.isBusy ? "🔥" : "🍸"}
        </div>
      )}

      {/* ── Info ─────────────────────────────────────────────────────── */}
      <div className="p-3">
        {/* Name */}
        <p className="text-text font-semibold text-sm leading-tight truncate mb-1.5">
          {venue.name}
        </p>

        {/* Open / Closed */}
        <div className="flex items-center gap-1.5 mb-2">
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
            {venue.isOpen ? "Open now" : "Closed"}
          </span>
        </div>

        {/* Busyness flames */}
        {venue.isOpen && (
          <div className="mb-2.5">
            <FlameIndicator level={venue.busynessLevel} />
          </div>
        )}

        {/* Price + Distance */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-subtext text-[11px]">See at door</span>
          {venue.distance != null && (
            <span className="text-subtext text-[11px] shrink-0">
              {formatDistance(venue.distance)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
