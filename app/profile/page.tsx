const stats = [
  { label: "Events", value: "24" },
  { label: "Friends", value: "128" },
  { label: "Photos", value: "63" },
];

const settings = [
  { label: "Edit Profile", icon: "✏️" },
  { label: "Notifications", icon: "🔔" },
  { label: "Privacy", icon: "🔒" },
  { label: "Help & Support", icon: "❓" },
];

export default function ProfilePage() {
  return (
    <div className="flex flex-col h-full pt-12">
      {/* Header */}
      <div className="px-4 flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text">Profile</h1>
        <button className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Avatar + name */}
      <div className="flex flex-col items-center px-4 mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent mb-3" />
        <h2 className="text-text font-bold text-lg">Your Name</h2>
        <p className="text-subtext text-sm">@username · San Francisco, CA</p>

        {/* Edit button */}
        <button className="mt-3 px-6 py-1.5 rounded-full border border-primary text-primary text-sm font-medium">
          Edit Profile
        </button>
      </div>

      {/* Stats */}
      <div className="mx-4 bg-surface border border-border rounded-2xl flex divide-x divide-border mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="flex-1 flex flex-col items-center py-4">
            <span className="text-text font-bold text-lg">{stat.value}</span>
            <span className="text-subtext text-xs mt-0.5">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Settings list */}
      <div className="px-4 flex flex-col gap-2">
        {settings.map((item) => (
          <button
            key={item.label}
            className="bg-surface border border-border rounded-2xl px-4 py-3.5 flex items-center gap-3 w-full text-left active:opacity-80 transition-opacity"
          >
            <span className="text-base">{item.icon}</span>
            <span className="text-text text-sm font-medium flex-1">{item.label}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>

      {/* Sign out */}
      <div className="px-4 mt-4">
        <button className="w-full py-3.5 rounded-2xl border border-accent/30 text-accent text-sm font-medium active:opacity-80 transition-opacity">
          Sign Out
        </button>
      </div>
    </div>
  );
}
