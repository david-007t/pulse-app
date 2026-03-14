const friends = [
  { name: "Alex Rivera", status: "At Electronic Nights", online: true },
  { name: "Mia Chen", status: "Heading to Rooftop Social", online: true },
  { name: "Jordan Lee", status: "Last seen 2h ago", online: false },
  { name: "Sam Patel", status: "At Street Art Walk", online: true },
  { name: "Taylor Kim", status: "Last seen yesterday", online: false },
];

export default function FriendsPage() {
  return (
    <div className="flex flex-col h-full px-4 pt-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Friends</h1>
          <p className="text-subtext text-sm mt-1">3 online now</p>
        </div>
        <button className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Online friends avatars */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-1">
        {friends.filter((f) => f.online).map((f) => (
          <div key={f.name} className="flex flex-col items-center gap-1 shrink-0">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent" />
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-background" />
            </div>
            <span className="text-xs text-subtext w-12 text-center truncate">{f.name.split(" ")[0]}</span>
          </div>
        ))}
      </div>

      {/* All friends list */}
      <p className="text-subtext text-xs font-semibold uppercase tracking-wider mb-3">All Friends</p>
      <div className="flex flex-col gap-2">
        {friends.map((friend) => (
          <div
            key={friend.name}
            className="bg-surface border border-border rounded-2xl p-3 flex items-center gap-3 cursor-pointer active:opacity-80 transition-opacity"
          >
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/60 to-accent/60" />
              {friend.online && (
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-surface" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-text text-sm font-semibold">{friend.name}</p>
              <p className="text-subtext text-xs truncate">{friend.status}</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
