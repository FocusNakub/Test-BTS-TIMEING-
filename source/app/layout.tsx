import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://bangkok-rail-daily-2026.pp5074160.chatgpt.site"),
  title: "Bangkok Rail Daily",
  description: "ดูสถานะเหตุขัดข้อง ขบวนถัดไปโดยประมาณ และความหนาแน่นคาดการณ์ของรถไฟฟ้ากรุงเทพ",
  manifest: "./manifest.webmanifest",
  appleWebApp: { capable: true, title: "Rail Daily", statusBarStyle: "black-translucent" },
  icons: { icon: "./icon-192.png", apple: "./icon-192.png" },
  openGraph: {
    title: "Bangkok Rail Daily",
    description: "สถานะรถไฟฟ้ากรุงเทพ ขบวนถัดไป และความหนาแน่นคาดการณ์",
    images: [{ url: "/og.png", width: 1732, height: 909, alt: "Bangkok Rail Daily" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bangkok Rail Daily",
    description: "สถานะรถไฟฟ้ากรุงเทพ ขบวนถัดไป และความหนาแน่นคาดการณ์",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#0b2428" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
