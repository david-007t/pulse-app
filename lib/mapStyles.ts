/**
 * Pulse dark map theme.
 *
 * Hides all POI icons, transit icons, and restaurant markers so only
 * Pulse's own venue markers are visible. Street names and neighborhood
 * labels are kept; neighborhood labels are styled in Pulse purple.
 *
 * Applied via the Map `styles` prop when no custom Map ID is configured.
 * When NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID is set (recommended for production),
 * apply this style in Google Cloud Console → Maps Platform → Map Styles.
 */
export const AUBERGINE_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry",           stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill",   stylers: [{ color: "#ffffff" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2d2d44" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca3af" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0d1b2a" }],
  },
  // Hide all POI icons and labels (restaurants, shops, etc.)
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }],
  },
  // Parks: keep geometry visible but no icons
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#1a2e1a" }, { visibility: "on" }],
  },
  // Hide all transit icons and lines
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
  // Neighbourhood labels in Pulse purple
  {
    featureType: "administrative.neighborhood",
    elementType: "labels.text.fill",
    stylers: [{ color: "#7C3AED" }],
  },
];
