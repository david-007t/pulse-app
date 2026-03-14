export default function MapPage() {
  return (
    <div className="relative h-[calc(100vh-4rem)] flex flex-col">
      {/* Map placeholder */}
      <div className="flex-1 bg-surface flex items-center justify-center relative overflow-hidden">
        {/* Grid overlay to suggest a map */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(#7C3AED 1px, transparent 1px), linear-gradient(90deg, #7C3AED 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="flex flex-col items-center gap-3 z-10">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
              <line x1="9" y1="3" x2="9" y2="18" />
              <line x1="15" y1="6" x2="15" y2="21" />
            </svg>
          </div>
          <p className="text-subtext text-sm">Map coming soon</p>
        </div>

        {/* Dot markers */}
        {[
          { top: "30%", left: "25%" },
          { top: "45%", left: "60%" },
          { top: "65%", left: "40%" },
        ].map((pos, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 rounded-full border-2 border-white"
            style={{ ...pos, backgroundColor: i === 1 ? "#EC4899" : "#7C3AED" }}
          />
        ))}
      </div>

      {/* Bottom sheet */}
      <div className="bg-surface border-t border-border px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-text font-semibold text-sm">Nearby</p>
          <span className="text-xs text-primary font-medium">3 events</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {["Electronic Nights", "Street Art Walk", "Rooftop Social"].map((name) => (
            <div key={name} className="shrink-0 bg-background border border-border rounded-xl px-3 py-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 mb-2" />
              <p className="text-text text-xs font-medium w-24">{name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
