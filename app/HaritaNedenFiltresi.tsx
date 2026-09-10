"use client";

import { useEffect } from "react";

const NEDENLER = [
  ["ARIZA", "#ef4444"],
  ["DÖNÜŞÜM", "#3b82f6"],
  ["GÜÇ DEĞİŞİMİ", "#84cc16"],
  ["TRAFO İPTAL", "#38bdf8"],
  ["YATIRIM", "#facc15"],
  ["YENİ TESİS", "#22d3ee"],
  ["ARIZA RİSKİ", "#fb7185"],
  ["KISMİ ARIZALI", "#f97316"],
] as const;

const renkBul = (el: HTMLElement) => {
  const html = el.innerHTML.toLowerCase().replace(/\s/g, "");
  return NEDENLER.find(([, renk]) => html.includes(renk.toLowerCase()))?.[0] || "";
};

export default function HaritaNedenFiltresi() {
  useEffect(() => {
    let secili = "";

    const uygula = () => {
      document.querySelectorAll<HTMLElement>(".leaflet-marker-pane .leaflet-marker-icon").forEach(el => {
        const neden = renkBul(el);
        if (!neden) return;
        el.style.display = !secili || neden === secili ? "" : "none";
      });
    };

    const kontrolEkle = () => {
      const butonlar = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
      const hedef = butonlar.find(b => (b.textContent || "").includes("Değişim Yapılmayanlar"));
      if (!hedef || document.querySelector('[data-neden-filtre="1"]')) return;

      const select = document.createElement("select");
      select.dataset.nedenFiltre = "1";
      select.className = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600";
      select.innerHTML = `<option value="">🎨 Tüm Değişim Nedenleri</option>${NEDENLER.map(([ad]) => `<option value="${ad}">${ad}</option>`).join("")}`;
      select.onchange = () => { secili = select.value; uygula(); };
      hedef.insertAdjacentElement("afterend", select);

      const temizle = butonlar.find(b => (b.textContent || "").includes("Filtreyi Temizle"));
      temizle?.addEventListener("click", () => {
        secili = "";
        select.value = "";
        setTimeout(uygula, 50);
      });
    };

    kontrolEkle();
    const observer = new MutationObserver(() => {
      kontrolEkle();
      if (secili) uygula();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
