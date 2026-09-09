import type { Metadata, Viewport } from "next";
import "./globals.css";
import HaritaEntegrasyon from "./HaritaEntegrasyon";

export const metadata: Metadata = {
  title: "BALIKESİR TRAFO DEĞİŞİMİ",
  description: "Balıkesir Trafo Değişimi Yönetim Sistemi",
  applicationName: "BALIKESİR TRAFO DEĞİŞİMİ",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "Trafo Değişimi",
  },
};

export const viewport: Viewport = {
  themeColor: "#07111f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}<HaritaEntegrasyon /></body>
    </html>
  );
}
