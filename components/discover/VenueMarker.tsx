"use client";

import { AdvancedMarker } from "@vis.gl/react-google-maps";
import type { Venue } from "@/types/venue";

interface VenueMarkerProps {
  venue: Venue;
  isSelected: boolean;
  onClick: () => void;
  /** When true the marker is a search result: always pink, larger, always pulsing */
  isSearchResult?: boolean;
}

// White cocktail-glass SVG icon (martini silhouette)
function CocktailIcon({ size }: { size: number }) {
  const iconSize = Math.round(size * 0.52);
  return (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 24 24"
      fill="white"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", pointerEvents: "none" }}
    >
      {/* Martini glass shape */}
      <path d="M21 5H3l9 9.5V19h-3v2h8v-2h-3v-4.5L21 5zm-9 7.3L5.4 7h13.2L12 12.3z" />
    </svg>
  );
}

export default function VenueMarker({
  venue,
  isSelected,
  onClick,
  isSearchResult = false,
}: VenueMarkerProps) {
  // Search-result markers are always pink; busy venues are pink; otherwise purple
  const color = isSearchResult || venue.isBusy ? "#EC4899" : "#7C3AED";
  // Search-result markers are the largest; selected markers slightly enlarged
  const size = isSearchResult ? 44 : isSelected ? 38 : 30;

  return (
    <AdvancedMarker
      position={venue.location}
      onClick={onClick}
      zIndex={isSelected ? 10 : 1}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Pulsing pink glow ring — busy venues and search-result markers */}
        {(venue.isBusy || isSearchResult) && (
          <span
            className="marker-pulse"
            style={{
              position: "absolute",
              width: size + 16,
              height: size + 16,
              borderRadius: "50%",
              backgroundColor: "#EC4899",
              opacity: 0.35,
            }}
          />
        )}

        {/* Selection ring — shown when selected or when this is a search result */}
        {(isSelected || isSearchResult) && (
          <span
            style={{
              position: "absolute",
              width: size + 10,
              height: size + 10,
              borderRadius: "50%",
              border: `2px solid ${color}99`,
              boxSizing: "border-box",
            }}
          />
        )}

        {/* Main filled circle */}
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            backgroundColor: color,
            border: "2.5px solid rgba(255,255,255,0.85)",
            boxShadow: isSelected
              ? `0 0 0 4px ${color}40, 0 6px 16px rgba(0,0,0,0.5)`
              : venue.isBusy
              ? `0 0 12px ${color}80, 0 2px 8px rgba(0,0,0,0.4)`
              : "0 2px 8px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "width 0.15s ease, height 0.15s ease",
            userSelect: "none",
          }}
        >
          <CocktailIcon size={size} />
        </div>

        {/* Name label when selected */}
        {isSelected && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              marginTop: 6,
              backgroundColor: "rgba(13,13,26,0.92)",
              backdropFilter: "blur(6px)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: 999,
              whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
              pointerEvents: "none",
            }}
          >
            {venue.name}
          </div>
        )}
      </div>
    </AdvancedMarker>
  );
}
