"use client";

import { useEffect, useState } from "react";

const KEY = "trafo-force-desktop";

function telefonCihazi() {
  if (typeof window === "undefined") return false;
  const kisaKenar = Math.min(window.screen?.width || 9999, window.screen?.height || 9999);
  return kisaKenar < 700 && (navigator.maxTouchPoints || 0) > 0;
}

export default function DesktopViewToggle() {
  const [goster, setGoster] = useState(false);
  const [masaustu, setMasaustu] = useState(false);

  useEffect(() => {
    setGoster(telefonCihazi());
    setMasaustu(window.localStorage.getItem(KEY) === "1");
  }, []);

  if (!goster) return null;

  const degistir = () => {
    const yeni = !masaustu;
    window.localStorage.setItem(KEY, yeni ? "1" : "0");
    window.location.reload();
  };

  return (
    <button
      type="button"
      onClick={degistir}
      aria-label={masaustu ? "Mobil görünüme geç" : "Masaüstü görünüme geç"}
      title={masaustu ? "Mobil görünüme geç" : "Masaüstü görünüme geç"}
      style={{
        position: "fixed",
        right: 14,
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
        zIndex: 99999,
        border: "1px solid rgba(148,163,184,.55)",
        borderRadius: 14,
        background: "rgba(15,23,42,.94)",
        color: "white",
        padding: "10px 13px",
        minHeight: 42,
        fontSize: 12,
        fontWeight: 800,
        boxShadow: "0 10px 30px rgba(15,23,42,.28)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        transform: masaustu ? "scale(2.65)" : "none",
        transformOrigin: "bottom right",
      }}
    >
      {masaustu ? "📱 Mobil" : "🖥 Masaüstü"}
    </button>
  );
}
