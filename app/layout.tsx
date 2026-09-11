import type { Metadata, Viewport } from "next";
import "./globals.css";
import HaritaEntegrasyon from "./HaritaEntegrasyon";
import HaritaCikisFix from "./HaritaCikisFix";
import HaritaNedenFiltresi from "./HaritaNedenFiltresi";
import HaritaUyduEtiketleri from "./HaritaUyduEtiketleri";
import HaritaGelismisIslemler from "./HaritaGelismisIslemler";
import HaritaSenkronDurumu from "./HaritaSenkronDurumu";
import HaritaTabletFix from "./HaritaTabletFix";
import OtpViewerGate from "./OtpViewerGate";

export const metadata: Metadata = {
  title: "BALIKESİR TRAFO DEĞİŞİMİ",
  description: "Balıkesir Trafo Değişimi Yönetim Sistemi",
  applicationName: "BALIKESİR TRAFO DEĞİŞİMİ",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.ico", apple: "/icon-192.png" },
  appleWebApp: { capable: true, statusBarStyle: "black", title: "Trafo Değişimi" },
};
export const viewport: Viewport = { themeColor: "#07111f", width: "device-width", initialScale: 1, viewportFit: "cover" };
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="tr"><body>{children}<OtpViewerGate /><HaritaEntegrasyon /><HaritaCikisFix /><HaritaNedenFiltresi /><HaritaUyduEtiketleri /><HaritaGelismisIslemler /><HaritaSenkronDurumu /><HaritaTabletFix /></body></html>;
}

// Tablet geçmiş penceresi düzeltmesi: HaritaTabletFix global olarak etkin.
