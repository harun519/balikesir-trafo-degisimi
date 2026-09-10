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

type Durum = "TUMU" | "DEGISEN" | "DEGISMEYEN";

const renkBul = (el: HTMLElement) => {
  const html = el.innerHTML.toLowerCase().replace(/\s/g, "");
  return NEDENLER.find(([, renk]) => html.includes(renk.toLowerCase()))?.[0] || "";
};

export default function HaritaNedenFiltresi() {
  useEffect(() => {
    let seciliNeden = "";
    let durum: Durum = "TUMU";

    const markerlariUygula = () => {
      document.querySelectorAll<HTMLElement>(".leaflet-marker-pane .leaflet-marker-icon").forEach(el => {
        const neden = renkBul(el);
        let goster = true;
        if (seciliNeden) goster = neden === seciliNeden;
        else if (durum === "DEGISEN") goster = !!neden;
        else if (durum === "DEGISMEYEN") goster = !neden;
        el.style.display = goster ? "" : "none";
      });
      gorunumuGuncelle();
    };

    const gorunumuGuncelle = () => {
      document.querySelectorAll<HTMLElement>("[data-harita-hizli]").forEach(el => {
        const aktif = el.dataset.haritaHizli === durum;
        el.style.background = aktif ? "#0f172a" : "#ffffff";
        el.style.color = aktif ? "#ffffff" : "#475569";
        el.style.borderColor = aktif ? "#0f172a" : "#cbd5e1";
      });
      document.querySelectorAll<HTMLElement>("[data-harita-neden]").forEach(el => {
        const aktif = el.dataset.haritaNeden === seciliNeden;
        el.style.outline = aktif ? "3px solid #0f172a" : "none";
        el.style.outlineOffset = aktif ? "2px" : "0";
        el.style.fontWeight = aktif ? "900" : "700";
      });
      const select = document.querySelector<HTMLSelectElement>('[data-neden-filtre="1"]');
      if (select && select.value !== seciliNeden) select.value = seciliNeden;
    };

    const nedenSec = (neden: string) => {
      seciliNeden = seciliNeden === neden ? "" : neden;
      if (seciliNeden) durum = "DEGISEN";
      markerlariUygula();
    };

    const durumSec = (yeni: Durum) => {
      durum = yeni;
      if (yeni !== "DEGISEN") seciliNeden = "";
      markerlariUygula();
    };

    const selectEkle = () => {
      const butonlar = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
      const hedef = butonlar.find(b => (b.textContent || "").includes("Değişim Yapılmayanlar"));
      if (!hedef || document.querySelector('[data-neden-filtre="1"]')) return;
      const select = document.createElement("select");
      select.dataset.nedenFiltre = "1";
      select.className = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600";
      select.innerHTML = `<option value="">🎨 Tüm Değişim Nedenleri</option>${NEDENLER.map(([ad]) => `<option value="${ad}">${ad}</option>`).join("")}`;
      select.onchange = () => {
        seciliNeden = select.value;
        durum = seciliNeden ? "DEGISEN" : "TUMU";
        markerlariUygula();
      };
      hedef.insertAdjacentElement("afterend", select);
    };

    const lejantEkle = () => {
      const harita = document.querySelector<HTMLElement>(".leaflet-container");
      if (!harita || harita.querySelector('[data-harita-lejant="1"]')) return;

      const kutu = document.createElement("div");
      kutu.dataset.haritaLejant = "1";
      kutu.style.cssText = "position:absolute;left:12px;bottom:24px;z-index:820;width:min(330px,calc(100% - 24px));background:rgba(255,255,255,.96);border:1px solid #cbd5e1;border-radius:14px;padding:10px;box-shadow:0 8px 28px rgba(15,23,42,.22);backdrop-filter:blur(8px);font-family:inherit";
      kutu.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px">
          <div style="font-size:11px;font-weight:900;color:#0f172a">🎨 HARİTA FİLTRESİ</div>
          <div style="font-size:9px;color:#64748b">Renge tıkla → filtrele</div>
        </div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:9px">
          <button type="button" data-harita-hizli="TUMU" style="border:1px solid #cbd5e1;border-radius:8px;padding:5px 8px;font-size:9px;font-weight:900;cursor:pointer">Tümü</button>
          <button type="button" data-harita-hizli="DEGISEN" style="border:1px solid #cbd5e1;border-radius:8px;padding:5px 8px;font-size:9px;font-weight:900;cursor:pointer">✓ Değişim Yapılan</button>
          <button type="button" data-harita-hizli="DEGISMEYEN" style="border:1px solid #cbd5e1;border-radius:8px;padding:5px 8px;font-size:9px;font-weight:900;cursor:pointer">○ Değişim Yapılmayan</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">
          ${NEDENLER.map(([ad,renk]) => `<button type="button" data-harita-neden="${ad}" style="display:flex;align-items:center;gap:7px;border:1px solid #e2e8f0;background:#fff;border-radius:8px;padding:6px 7px;font-size:9px;color:#334155;text-align:left;cursor:pointer"><span style="width:11px;height:11px;min-width:11px;border-radius:3px;background:${renk};box-shadow:0 0 0 1px rgba(15,23,42,.15)"></span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ad}</span></button>`).join("")}
        </div>`;

      kutu.querySelectorAll<HTMLButtonElement>("[data-harita-hizli]").forEach(b => {
        b.onclick = e => { e.stopPropagation(); durumSec(b.dataset.haritaHizli as Durum); };
      });
      kutu.querySelectorAll<HTMLButtonElement>("[data-harita-neden]").forEach(b => {
        b.onclick = e => { e.stopPropagation(); nedenSec(b.dataset.haritaNeden || ""); };
      });
      harita.appendChild(kutu);
      gorunumuGuncelle();
    };

    const temizleBagla = () => {
      const temizle = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(b => (b.textContent || "").includes("Filtreyi Temizle"));
      if (!temizle || temizle.dataset.nedenTemizleBagli) return;
      temizle.dataset.nedenTemizleBagli = "1";
      temizle.addEventListener("click", () => {
        seciliNeden = "";
        durum = "TUMU";
        setTimeout(markerlariUygula, 80);
      });
    };

    const kur = () => {
      selectEkle();
      lejantEkle();
      temizleBagla();
      if (seciliNeden || durum !== "TUMU") markerlariUygula();
    };

    kur();
    const observer = new MutationObserver(() => kur());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
