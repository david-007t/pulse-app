export default function DiscoverPage() {
  return (
    <div className="flex flex-col h-full px-4 pt-12">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Discover</h1>
        <p className="text-subtext text-sm mt-1">Find what&apos;s happening near you</p>
      </div>

      {/* Search bar */}
      <div className="bg-surface border border-border rounded-2xl px-4 py-3 flex items-center gap-3 mb-6">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className="text-subtext text-sm">Search events, people, places...</span>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {["All", "Music", "Art", "Food", "Sports", "Tech"].map((cat, i) => (
          <button
            key={cat}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              i === 0
                ? "bg-primary text-white border-primary"
                : "bg-transparent text-subtext border-border"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Placeholder cards */}
      <div className="flex flex-col gap-3">
        {[
          { title: "Electronic Nights", sub: "Club Venue · Tonight 10PM", color: "#7C3AED" },
          { title: "Street Art Walk", sub: "Downtown · Saturday 2PM", color: "#EC4899" },
          { title: "Rooftop Social", sub: "Sky Bar · Friday 7PM", color: "#7C3AED" },
        ].map((item) => (
          <div
            key={item.title}
            className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-4 active:opacity-80 transition-opacity cursor-pointer"
          >
            <div
              className="w-12 h-12 rounded-xl shrink-0"
              style={{ background: `${item.color}33` }}
            />
            <div>
              <p className="text-text font-semibold text-sm">{item.title}</p>
              <p className="text-subtext text-xs mt-0.5">{item.sub}</p>
            </div>
            <svg className="ml-auto shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
