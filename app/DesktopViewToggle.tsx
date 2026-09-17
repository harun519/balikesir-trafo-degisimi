"use client";

import { useEffect, useMemo, useState } from "react";

const KEY = "trafo-force-desktop";
const DESKTOP_WIDTH = 1180;

function telefonCihazi() {
  if (typeof window === "undefined") return false;
  const kisaKenar = Math.min(window.screen?.width || 9999, window.screen?.height || 9999);
  return kisaKenar < 700 && (navigator.maxTouchPoints || 0) > 0;
}

export default function DesktopViewToggle() {
  const [goster, setGoster] = useState(false);
  const [masaustu, setMasaustu] = useState(false);
  const [boyut, setBoyut] = useState({ genislik: 390, yukseklik: 844 });

  const iframeModu = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("desktopFrame") === "1";
  }, []);

  useEffect(() => {
    if (iframeModu) return;

    const guncelle = () => {
      const vv = window.visualViewport;
      setBoyut({
        genislik: Math.max(320, Math.round(vv?.width || window.innerWidth || 390)),
        yukseklik: Math.max(480, Math.round(vv?.height || window.innerHeight || 844)),
      });
    };

    setGoster(telefonCihazi());
    setMasaustu(window.localStorage.getItem(KEY) === "1");
    guncelle();

    window.addEventListener("resize", guncelle);
    window.visualViewport?.addEventListener("resize", guncelle);
    return () => {
      window.removeEventListener("resize", guncelle);
      window.visualViewport?.removeEventListener("resize", guncelle);
    };
  }, [iframeModu]);

  useEffect(() => {
    if (iframeModu) return;
    if (!masaustu) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [masaustu, iframeModu]);

  if (iframeModu || !goster) return null;

  const degistir = () => {
    const yeni = !masaustu;
    window.localStorage.setItem(KEY, yeni ? "1" : "0");
    setMasaustu(yeni);
  };

  const scale = Math.min(1, boyut.genislik / DESKTOP_WIDTH);
  const iframeHeight = Math.ceil(boyut.yukseklik / scale);

  let iframeSrc = "";
  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    url.searchParams.set("desktopFrame", "1");
    iframeSrc = url.toString();
  }

  return (
    <>
      {masaustu && iframeSrc && (
        <div
          aria-label="Masaüstü görünüm"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99990,
            overflow: "hidden",
            background: "#f5f7fb",
          }}
        >
          <iframe
            src={iframeSrc}
            title="Trafo masaüstü görünümü"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: DESKTOP_WIDTH,
              height: iframeHeight,
              border: 0,
              background: "#f5f7fb",
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          />
        </div>
      )}

      <button
        type="button"
        onClick={degistir}
        aria-label={masaustu ? "Mobil görünüme geç" : "Masaüstü görünüme geç"}
        title={masaustu ? "Mobil görünüme geç" : "Masaüstü görünüme geç"}
        style={{
          position: "fixed",
          right: 12,
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
          zIndex: 99999,
          border: "1px solid rgba(148,163,184,.55)",
          borderRadius: 13,
          background: "rgba(15,23,42,.94)",
          color: "white",
          padding: "9px 12px",
          minHeight: 40,
          fontSize: 12,
          fontWeight: 800,
          lineHeight: 1,
          boxShadow: "0 10px 30px rgba(15,23,42,.28)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {masaustu ? "📱 Mobil" : "🖥 Masaüstü"}
      </button>
    </>
  );
}
