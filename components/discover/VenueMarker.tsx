"use client";

import { AdvancedMarker } from "@vis.gl/react-google-maps";
import type { Venue } from "@/types/venue";

interface VenueMarkerProps {
  venue: Venue;
  isSelected: boolean;
  onClick: () => void;
}

export default function VenueMarker({
  venue,
  isSelected,
  onClick,
}: VenueMarkerProps) {
  const color = venue.isBusy ? "#EC4899" : "#7C3AED";
  const size = isSelected ? 38 : 30;

  return (
    <AdvancedMarker
      position={venue.location}
      onClick={onClick}
      zIndex={isSelected ? 10 : 1}
    >
      <div
        style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {/* Pulsing ring — only for busy venues */}
        {venue.isBusy && (
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

        {/* Selected ring */}
        {isSelected && (
          <span
            style={{
              position: "absolute",
              width: size + 10,
              height: size + 10,
              borderRadius: "50%",
              border: "2px solid rgba(124,58,237,0.6)",
              boxSizing: "border-box",
            }}
          />
        )}

        {/* Main dot */}
        <div
          onClick={onClick}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            backgroundColor: color,
            border: "2.5px solid rgba(255,255,255,0.85)",
            boxShadow: isSelected
              ? `0 0 0 4px ${color}40, 0 6px 16px rgba(0,0,0,0.5)`
              : "0 2px 8px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "width 0.15s ease, height 0.15s ease",
            fontSize: isSelected ? 16 : 13,
            userSelect: "none",
          }}
        >
          🍸
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
