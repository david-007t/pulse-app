import BottomNav from "@/components/BottomNav";

export default function TabLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="flex-1 overflow-hidden">{children}</main>
      <BottomNav />
    </>
  );
}
