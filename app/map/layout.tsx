import BottomNav from "@/components/BottomNav";

// Full-screen layout matching the Discover tab — map fills viewport,
// overlays (search bar, bottom sheet) are positioned inside DiscoverMap.
export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="flex-1 relative overflow-hidden">{children}</main>
      <BottomNav />
    </>
  );
}
