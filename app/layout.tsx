import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = { title: "StudyTube", description: "Scroll short clips from the best study videos on the internet." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b0d12" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
