import type { Venue } from "@/types/venue";
import { formatDistance } from "@/lib/venueUtils";

interface VenueCardProps {
  venue: Venue;
  isSelected: boolean;
  onClick: () => void;
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

function FlameIndicator({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-0.5" style={{ lineHeight: 1 }}>
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
  const price = getPriceLabel(venue.priceLevel);

  return (
    /*
     * w-44 = 176 px.
     *
     * IMPORTANT: do NOT add `overflow-hidden` to this outer wrapper.
     * When a parent flex container has overflow-x:auto, iOS Safari uses each
     * child's "scroll-container-aware" height for the flex row height.
     * With overflow-hidden on the card + no explicit height, iOS collapsed
     * the row height to the photo (104 px) and clipped the info section.
     *
     * Instead, overflow-hidden is scoped only to the photo wrapper (top
     * corners), and the card uses an explicit minHeight to guarantee it
     * is never rendered shorter than its content.
     */
    <div
      onClick={onClick}
      className={[
        "shrink-0 w-44 rounded-2xl cursor-pointer transition-all duration-200 border",
        isSelected
          ? "border-primary shadow-[0_0_24px_rgba(124,58,237,0.4)]"
          : "border-white/10",
      ].join(" ")}
      style={{
        scrollSnapAlign: "start",
        backgroundColor: isSelected ? "rgba(22,22,42,1)" : "rgba(28,28,48,0.95)",
        minHeight: 220,
      }}
    >
      {/* ── Photo — overflow-hidden scoped to top corners only ─────── */}
      <div
        className="overflow-hidden"
        style={{ borderRadius: "16px 16px 0 0" }}
      >
        {photoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoSrc}
            alt={venue.name}
            loading="lazy"
            style={{
              width: "100%",
              height: 104,
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: 104,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              background: venue.isBusy
                ? "linear-gradient(135deg,rgba(236,72,153,0.25),rgba(124,58,237,0.2))"
                : "linear-gradient(135deg,rgba(124,58,237,0.2),rgba(13,13,26,0.5))",
            }}
          >
            {venue.isBusy ? "🔥" : "🍸"}
          </div>
        )}
      </div>

      {/* ── Info section ──────────────────────────────────────────── */}
      <div style={{ padding: "10px 12px 12px" }}>
        {/* Venue name — up to 2 lines */}
        <p
          className="text-white font-semibold"
          style={{
            fontSize: 13,
            lineHeight: 1.35,
            marginBottom: 5,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {venue.name}
        </p>

        {/* Open / Closed */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: venue.isOpen ? "#4ade80" : "#f87171",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: venue.isOpen ? "#4ade80" : "#f87171",
            }}
          >
            {venue.isOpen ? "Open now" : "Closed"}
          </span>
        </div>

        {/* Busyness flames */}
        {venue.isOpen && (
          <div style={{ marginBottom: 6 }}>
            <FlameIndicator level={venue.busynessLevel} />
          </div>
        )}

        {/* Price + Distance */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 4,
          }}
        >
          <span style={{ color: "#9CA3AF", fontSize: 11 }}>
            {price || "See at door"}
          </span>
          {venue.distance != null && (
            <span style={{ color: "#9CA3AF", fontSize: 11, flexShrink: 0 }}>
              {formatDistance(venue.distance)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
