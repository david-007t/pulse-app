import BottomNav from "@/components/BottomNav";

// Full-screen: map fills the viewport; overlays (search bar, bottom sheet) sit on top.
// No pb-16 — DiscoverMap positions its own overlays relative to the fixed BottomNav.
export default function DiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="flex-1 relative overflow-hidden">{children}</main>
      <BottomNav />
    </>
  );
}
