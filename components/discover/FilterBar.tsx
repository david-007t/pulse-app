"use client";

// ── Types ────────────────────────────────────────────────────────────────────

export type SortFilter = "distance" | "rating" | "busiest";
export type CategoryFilter = "bars" | "clubs";

export interface ActiveFilters {
  /** Show only open venues */
  open: boolean;
  /** Sort order — mutually exclusive */
  sort: SortFilter | null;
  /** Category filter — mutually exclusive */
  category: CategoryFilter | null;
}

export const DEFAULT_FILTERS: ActiveFilters = {
  open: true,
  sort: null,
  category: null,
};

// ── Pill definitions ─────────────────────────────────────────────────────────

type PillDef =
  | { id: "open"; label: string; type: "toggle" }
  | { id: SortFilter; label: string; type: "sort" }
  | { id: CategoryFilter; label: string; type: "category" }
  | { id: "all"; label: string; type: "reset-category" };

const PILLS: PillDef[] = [
  { id: "open", label: "🟢 Open Now", type: "toggle" },
  { id: "distance", label: "📍 Nearest", type: "sort" },
  { id: "rating", label: "⭐ Top Rated", type: "sort" },
  { id: "busiest", label: "🔥 Busiest", type: "sort" },
  { id: "bars", label: "🍺 Bars", type: "category" },
  { id: "clubs", label: "🎵 Clubs", type: "category" },
  { id: "all", label: "🌟 All", type: "reset-category" },
];

// ── Component ────────────────────────────────────────────────────────────────

interface FilterBarProps {
  filters: ActiveFilters;
  onChange: (filters: ActiveFilters) => void;
}

export default function FilterBar({ filters, onChange }: FilterBarProps) {
  const handlePill = (pill: PillDef) => {
    switch (pill.type) {
      case "toggle":
        onChange({ ...filters, open: !filters.open });
        break;

      case "sort":
        onChange({
          ...filters,
          sort: filters.sort === pill.id ? null : (pill.id as SortFilter),
        });
        break;

      case "category":
        onChange({
          ...filters,
          category:
            filters.category === pill.id ? null : (pill.id as CategoryFilter),
        });
        break;

      case "reset-category":
        onChange({ ...filters, category: null });
        break;
    }
  };

  const isActive = (pill: PillDef): boolean => {
    switch (pill.type) {
      case "toggle":
        return filters.open;
      case "sort":
        return filters.sort === pill.id;
      case "category":
        return filters.category === pill.id;
      case "reset-category":
        return filters.category === null;
    }
  };

  return (
    /*
     * Same non-flex scroll pattern as VenueBottomSheet:
     * outer block div owns overflow-x-auto; inner flex row has max-content
     * width so the outer div gets the correct intrinsic height on iOS Safari.
     */
    <div
      className="overflow-x-auto"
      style={{
        scrollbarWidth: "none",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        WebkitOverflowScrolling: "touch" as any,
      }}
    >
    <div
      className="flex gap-2 pb-1"
      style={{ width: "max-content" }}
    >
      {PILLS.map((pill) => {
        const active = isActive(pill);
        return (
          <button
            key={pill.id}
            onClick={() => handlePill(pill)}
            className={[
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold",
              "border transition-all duration-150 active:scale-95",
              active
                ? "bg-primary border-primary text-white shadow-[0_0_12px_rgba(124,58,237,0.4)]"
                : "bg-surface/90 border-border text-subtext",
            ].join(" ")}
          >
            {pill.label}
          </button>
        );
      })}
    </div>
    </div>
  );
}
