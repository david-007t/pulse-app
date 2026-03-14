import BottomNav from "@/components/BottomNav";

export default function TabLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="flex-1 overflow-y-auto pb-16">{children}</main>
      <BottomNav />
    </>
  );
}
