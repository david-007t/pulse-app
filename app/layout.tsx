import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulse",
  description: "Discover, connect, and explore with Pulse",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pulse",
  },
};

export const viewport: Viewport = {
  themeColor: "#7C3AED",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-background text-text">
        <div className="flex justify-center bg-black" style={{ minHeight: "100dvh" }}>
          {/*
           * The app shell uses `min-h-dvh` (dynamic viewport height) so it
           * fills exactly the visible screen area on iOS Safari without being
           * taller than the visible viewport.  The static `min-h-screen`
           * (100vh) was causing the container to extend beyond the visible
           * area in some iOS configurations, which shifted absolute overlays
           * (card tray, search bar) out of view.
           */}
          <div
            className="relative w-full max-w-[430px] bg-background overflow-hidden flex flex-col"
            style={{ minHeight: "100dvh" }}
          >
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
