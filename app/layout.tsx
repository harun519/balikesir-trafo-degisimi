import type { Metadata, Viewport } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import HaritaEntegrasyon from "./HaritaEntegrasyon";
import HaritaCikisFix from "./HaritaCikisFix";
import HaritaNedenFiltresi from "./HaritaNedenFiltresi";
import HaritaUyduEtiketleri from "./HaritaUyduEtiketleri";
import HaritaGelismisIslemler from "./HaritaGelismisIslemler";
import HaritaSenkronDurumu from "./HaritaSenkronDurumu";
import HaritaTabletFix from "./HaritaTabletFix";
import HaritaMenuSaglamlastirma from "./HaritaMenuSaglamlastirma";
import HaritaKayitSenkron from "./HaritaKayitSenkron";
import PwaSaglamlastirma from "./PwaSaglamlastirma";
import PortalLoginCleanup from "./PortalLoginCleanup";

export const metadata: Metadata = {
  title: "BALIKESİR TRAFO DEĞİŞİMİ",
  description: "Balıkesir Trafo Değişimi Yönetim Sistemi",
  applicationName: "BALIKESİR TRAFO DEĞİŞİMİ",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.ico", apple: "/icon-192.png" },
  appleWebApp: { capable: true, statusBarStyle: "black", title: "Trafo Değişimi" },
};

export const viewport: Viewport = {
  themeColor: "#07111f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const desktopRequestFix = `
(() => {
  try {
    const ua = navigator.userAgent || "";
    const touchMac = /Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 0;
    const phoneSizedScreen = Math.min(window.screen.width || 9999, window.screen.height || 9999) < 600;
    if (!touchMac || !phoneSizedScreen) return;

    const applyDesktopViewport = () => {
      const meta = document.querySelector('meta[name="viewport"]');
      if (!meta) return;
      const portraitWidth = Math.min(window.screen.width || 390, window.screen.height || 844);
      const landscapeWidth = Math.max(window.screen.width || 390, window.screen.height || 844);
      const deviceWidth = window.matchMedia('(orientation: landscape)').matches ? landscapeWidth : portraitWidth;
      const desktopWidth = 1180;
      const scale = Math.max(0.25, Math.min(1, deviceWidth / desktopWidth));
      meta.setAttribute('content', 'width=' + desktopWidth + ', initial-scale=' + scale.toFixed(3) + ', minimum-scale=0.2, maximum-scale=3, viewport-fit=cover');
      document.documentElement.classList.add('iphone-desktop-request');
    };

    applyDesktopViewport();
    window.addEventListener('orientationchange', () => setTimeout(applyDesktopViewport, 120));
  } catch (_) {}
})();
`;

export default function RootLayout({children}:{children:React.ReactNode}) {
  return (
    <html lang="tr">
      <body>
        <script dangerouslySetInnerHTML={{ __html: desktopRequestFix }} />
        {children}
        <PortalLoginCleanup />
        <HaritaEntegrasyon />
        <HaritaMenuSaglamlastirma />
        <HaritaKayitSenkron />
        <HaritaCikisFix />
        <HaritaNedenFiltresi />
        <HaritaUyduEtiketleri />
        <HaritaGelismisIslemler />
        <HaritaSenkronDurumu />
        <HaritaTabletFix />
        <PwaSaglamlastirma />
      </body>
    </html>
  );
}

// Kullanıcılar artık Balıkesir Sistem İşletme portalından merkezi olarak yönetilir.
