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
        <span
          key={i}
          style={{ opacity: i <= level ? 1 : 0.2, fontSize: 11 }}
        >
          🔥
        </span>
      ))}
    </div>
  );
}

export default function VenueCard({ venue, isSelected, onClick }: VenueCardProps) {
  return (
    <div
      onClick={onClick}
      className={`shrink-0 w-48 rounded-2xl p-4 cursor-pointer transition-all duration-200 border ${
        isSelected
          ? "border-primary bg-surface shadow-[0_0_24px_rgba(124,58,237,0.35)]"
          : "border-border bg-surface/90 backdrop-blur-md"
      }`}
      style={{ scrollSnapAlign: "start" }}
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center text-lg"
        style={{
          backgroundColor: venue.isBusy
            ? "rgba(236,72,153,0.18)"
            : "rgba(124,58,237,0.18)",
        }}
      >
        {venue.isBusy ? "🔥" : "🍸"}
      </div>

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

      {/* Busyness */}
      {venue.isOpen && (
        <div className="mb-2.5">
          <FlameIndicator level={venue.busynessLevel} />
        </div>
      )}

      {/* Cover + Distance */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-subtext text-[11px]">See at door</span>
        {venue.distance != null && (
          <span className="text-subtext text-[11px] shrink-0">
            {formatDistance(venue.distance)}
          </span>
        )}
      </div>
    </div>
  );
}
