"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

declare global {
  interface Window {
    L?: any;
    shp?: (data: ArrayBuffer) => Promise<any>;
  }
}

type GeoFeature = { type: string; geometry: any; properties: Record<string, any> };
type GeoJSON = { type: "FeatureCollection"; features: GeoFeature[] };
type DegisimKaydi = { id: number; trafo_id: string | null; lokasyon_id: string | null; tr: string | null; tarih: string | null };

const ILCE_LISTESI = ["Altıeylül", "Karesi", "Balya", "Bigadiç", "Dursunbey", "İvrindi", "Kepsut", "Savaştepe", "Sındırgı", "Susurluk"];
const DB = "trafo-harita-db", STORE = "dosyalar", KEY = "shp-zip";
const norm = (v: any) => String(v ?? "").trim();
const anahtar = (v: any) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "I").replace(/İ/g, "I").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const esc = (v: any) => String(v ?? "—").replace(/[&<>'\"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c] || c));
const prop = (p: any, ...keys: string[]) => { for (const k of keys) if (p?.[k] != null && String(p[k]).trim() !== "") return p[k]; return ""; };
const tipiEtiket = (p: any) => anahtar(prop(p, "TIPI")) === "HARICI" ? "Direk Tipi" : anahtar(prop(p, "TIPI")) === "DAHILI" ? "Bina Tipi" : norm(prop(p, "TIPI")) || "Bilinmiyor";

function dbAc() {
  return new Promise<IDBDatabase>((ok, no) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
}
async function kaydetBlob(blob: Blob) {
  const db = await dbAc();
  await new Promise<void>((ok, no) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, KEY);
    tx.oncomplete = () => ok();
    tx.onerror = () => no(tx.error);
  });
  db.close();
}
async function okuBlob() {
  const db = await dbAc();
  const v = await new Promise<any>((ok, no) => {
    const tx = db.transaction(STORE, "readonly");
    const r = tx.objectStore(STORE).get(KEY);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
  db.close();
  return v as Blob | undefined;
}
function scriptYukle(id: string, src: string, test: () => boolean) {
  return new Promise<void>((ok, no) => {
    if (test()) return ok();
    const eski = document.getElementById(id) as HTMLScriptElement | null;
    if (eski) {
      eski.addEventListener("load", () => ok(), { once: true });
      eski.addEventListener("error", () => no(new Error("Kütüphane yüklenemedi")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.id = id; s.src = src; s.onload = () => ok(); s.onerror = () => no(new Error("Kütüphane yüklenemedi"));
    document.body.appendChild(s);
  });
}
function koleksiyonlar(x: any): GeoJSON[] {
  if (!x) return [];
  if (Array.isArray(x)) return x.flatMap(koleksiyonlar);
  if (x.type === "FeatureCollection" && Array.isArray(x.features)) return [x];
  return [];
}
function ayir(x: any) {
  const cols = koleksiyonlar(x), nokta: GeoFeature[] = [], bina: GeoFeature[] = [];
  for (const c of cols) for (const f of c.features || []) {
    const t = f?.geometry?.type || "";
    if (t === "Point" || t === "MultiPoint") nokta.push(f);
    else if (t.includes("Polygon")) bina.push(f);
  }
  return { nokta: { type: "FeatureCollection", features: nokta } as GeoJSON, bina: { type: "FeatureCollection", features: bina } as GeoJSON };
}
function tarihGoster(t: string | null) {
  if (!t) return "—";
  const p = t.split("-");
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : t;
}
function noktaPopup(p: any, adet: number, sonTarih: string | null) {
  const durum = adet > 0
    ? `<div style="margin-top:8px;padding:8px 10px;border-radius:9px;background:${adet > 1 ? "#f3e8ff" : "#ecfdf5"};color:${adet > 1 ? "#6d28d9" : "#047857"};font-weight:800"><div>🕘 ${adet} değişim kaydı</div>${sonTarih ? `<div style="margin-top:3px;font-size:10px;font-weight:700;opacity:.8">Son değişim: ${esc(tarihGoster(sonTarih))}</div>` : ""}</div>`
    : `<div style="margin-top:8px;padding:8px 10px;border-radius:9px;background:#fff7ed;color:#c2410c;font-weight:800">Değişim kaydı yok</div>`;
  return `<div style="min-width:245px;font-family:Arial,sans-serif"><div style="font-weight:800;font-size:14px;margin-bottom:8px;color:#0f172a">⚡ ${esc(prop(p, "ADI") || "Trafo")}</div><div style="display:grid;gap:4px;font-size:12px;color:#334155"><div><b>İlçe:</b> ${esc(prop(p, "ILCE"))}</div><div><b>Mahalle:</b> ${esc(prop(p, "MAHALLE"))}</div><div><b>Tipi:</b> ${esc(tipiEtiket(p))}</div><div><b>Mülkiyet:</b> ${esc(prop(p, "MULKIYET"))}</div><div><b>Trafo ID:</b> ${esc(prop(p, "ID"))}</div><div><b>Lokasyon ID:</b> ${esc(prop(p, "LOKASYON_I"))}</div><div><b>Güç:</b> ${esc(prop(p, "GUC"))}${prop(p, "GUC") ? " kVA" : ""}</div><div><b>Primer Gerilim:</b> ${esc(prop(p, "PRIMER_GER"))}</div><div><b>Marka:</b> ${esc(prop(p, "MARKA"))}</div><div><b>Seri No:</b> ${esc(prop(p, "SERI_NO"))}</div><div><b>İmal Yılı:</b> ${esc(prop(p, "IMAL_YILI"))}</div><div><b>Cinsi:</b> ${esc(prop(p, "CINSI"))}</div></div>${durum}</div>`;
}
function binaPopup(p: any) {
  return `<div style="min-width:235px;font-family:Arial,sans-serif"><div style="font-weight:800;font-size:14px;margin-bottom:8px;color:#0f172a">🏢 ${esc(prop(p, "ADI") || "Trafo Binası")}</div><div style="display:grid;gap:4px;font-size:12px;color:#334155"><div><b>İlçe:</b> ${esc(prop(p, "ILCE"))}</div><div><b>Mahalle:</b> ${esc(prop(p, "MAHALLE"))}</div><div><b>Bina ID:</b> ${esc(prop(p, "ID"))}</div><div><b>Kodu:</b> ${esc(prop(p, "KODU"))}</div><div><b>Alt Tip:</b> ${esc(prop(p, "ALTTIP"))}</div><div><b>Gerilim:</b> ${esc(prop(p, "ISLETME_GE"))}</div></div></div>`;
}

export default function TrafoHarita() {
  const mapEl = useRef<HTMLDivElement | null>(null), mapRef = useRef<any>(null), pointLayer = useRef<any>(null), buildingLayer = useRef<any>(null), tileLayer = useRef<any>(null), pointData = useRef<GeoJSON | null>(null), buildingData = useRef<GeoJSON | null>(null);
  const [hazir, setHazir] = useState(false), [veriHazir, setVeriHazir] = useState(false), [hata, setHata] = useState(""), [durum, setDurum] = useState("Merkezi envanter kontrol ediliyor..."), [dosyaAdi, setDosyaAdi] = useState("");
  const [ilce, setIlce] = useState(""), [arama, setArama] = useState(""), [tipFiltre, setTipFiltre] = useState<"" | "HARICI" | "DAHILI">(""), [noktaAcik, setNoktaAcik] = useState(true), [binaAcik, setBinaAcik] = useState(true), [noktaSayisi, setNoktaSayisi] = useState(0), [binaSayisi, setBinaSayisi] = useState(0), [direkTipiSayisi, setDirekTipiSayisi] = useState(0), [binaTipiSayisi, setBinaTipiSayisi] = useState(0), [haritaTipi, setHaritaTipi] = useState<"standart" | "uydu">("standart");
  const [degisimKayitlari, setDegisimKayitlari] = useState<DegisimKaydi[]>([]), [degisimYukleniyor, setDegisimYukleniyor] = useState(true), [sadeceDegisen, setSadeceDegisen] = useState(false), [eslesenSayisi, setEslesenSayisi] = useState(0), [tekDegisimSayisi, setTekDegisimSayisi] = useState(0), [cokDegisimSayisi, setCokDegisimSayisi] = useState(0);
  const [merkezi, setMerkezi] = useState(false), [adminMi, setAdminMi] = useState(false), [envanterIslem, setEnvanterIslem] = useState(false);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url && key ? createClient(url, key) : null;
  }, []);
  const degisimIndex = useMemo(() => {
    const idx = new Map<string, Set<number>>(), byId = new Map<number, DegisimKaydi>();
    for (const k of degisimKayitlari) {
      byId.set(k.id, k);
      const a = anahtar(k.lokasyon_id);
      if (!a) continue;
      if (!idx.has(a)) idx.set(a, new Set());
      idx.get(a)!.add(k.id);
    }
    return { idx, byId };
  }, [degisimKayitlari]);
  const eslesen = (p: any) => {
    const a = anahtar(prop(p, "LOKASYON_I"));
    if (!a) return [];
    const ids = degisimIndex.idx.get(a);
    if (!ids) return [];
    return Array.from(ids).map(id => degisimIndex.byId.get(id)).filter(Boolean) as DegisimKaydi[];
  };

  const veriyiKur = (x: any, ad: string) => {
    const a = ayir(x);
    const noktaFeatures = a.nokta.features.filter(f => anahtar(prop(f.properties || {}, "MULKIYET")) !== "OZEL");
    const binaFeatures = a.bina.features.filter(f => anahtar(prop(f.properties || {}, "MULKIYET")) !== "OZEL");
    pointData.current = { type: "FeatureCollection", features: noktaFeatures };
    buildingData.current = { type: "FeatureCollection", features: binaFeatures };
    setDosyaAdi(ad); setVeriHazir(true); setDurum(`${noktaFeatures.length.toLocaleString("tr-TR")} trafo noktası • ${binaFeatures.length.toLocaleString("tr-TR")} trafo binası • özel mülkiyet hariç`); setHata("");
  };
  const zipOku = async (blob: Blob, ad: string) => {
    if (!window.shp) throw new Error("SHP okuyucu hazır değil");
    setDurum("Trafo envanteri hazırlanıyor...");
    veriyiKur(await window.shp(await blob.arrayBuffer()), ad);
  };
  async function oturumBilgisi() {
    if (!supabase) return { session: null, admin: false };
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { session: null, admin: false };
    const { data: profil } = await supabase.from("app_users").select("role").eq("id", session.user.id).maybeSingle();
    const admin = profil?.role === "admin"; setAdminMi(admin); return { session, admin };
  }
  async function merkezeAktar(blob: Blob, sessToken?: string) {
    const token = sessToken || ((await oturumBilgisi()).session?.access_token || "");
    if (!token) throw new Error("Merkezi envanter güncellemesi için admin oturumu gerekli.");
    const r = await fetch("/api/harita-envanter", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/zip" }, body: blob });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error || "Merkezi envanter kaydedilemedi.");
    setMerkezi(true);
  }

  useEffect(() => {
    let kapandi = false;
    const yukle = async () => {
      setDegisimYukleniyor(true);
      try {
        if (!supabase) throw new Error("Supabase ayarları bulunamadı");
        const { data, error } = await supabase.from("trafo_degisim").select("id,trafo_id,lokasyon_id,tr,tarih").order("tarih", { ascending: false, nullsFirst: false });
        if (error) throw error;
        if (!kapandi) setDegisimKayitlari((data || []) as DegisimKaydi[]);
      } catch (e: any) { if (!kapandi) setHata(h => h || `Değişim kayıtları eşleştirilemedi: ${e?.message || "bilinmeyen hata"}`); }
      finally { if (!kapandi) setDegisimYukleniyor(false); }
    };
    yukle(); oturumBilgisi().catch(() => {});
    return () => { kapandi = true; };
  }, [supabase]);

  useEffect(() => {
    let kapandi = false;
    const baslat = async () => {
      try {
        if (!document.getElementById("leaflet-css-trafo")) {
          const l = document.createElement("link"); l.id = "leaflet-css-trafo"; l.rel = "stylesheet"; l.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(l);
        }
        await Promise.all([
          scriptYukle("leaflet-js-trafo", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", () => !!window.L),
          scriptYukle("shpjs-trafo", "https://unpkg.com/shpjs@6.1.0/dist/shp.js", () => !!window.shp)
        ]);
        if (kapandi || !mapEl.current) return;
        const L = window.L;
        const map = L.map(mapEl.current, { zoomControl: true, preferCanvas: true, renderer: L.canvas({ padding: .5, tolerance: 12 }) }).setView([39.65, 27.9], 9);
        tileLayer.current = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20, attribution: '&copy; OpenStreetMap' }).addTo(map);
        mapRef.current = map; setHazir(true);

        let merkezVar = false;
        try {
          const r = await fetch("/api/harita-envanter", { cache: "no-store" });
          if (r.ok) {
            const blob = await r.blob();
            if (!kapandi) { await zipOku(blob, "Merkezi trafo envanteri"); setMerkezi(true); merkezVar = true; try { await kaydetBlob(blob); } catch {} }
          } else if (r.status !== 404) {
            const j = await r.json().catch(() => ({})); throw new Error(j?.error || "Merkezi envanter indirilemedi.");
          }
        } catch (e: any) { if (!kapandi) setHata(h => h || `Merkezi envanter: ${e?.message || "bağlantı hatası"}`); }

        if (!merkezVar && !kapandi) {
          const eski = await okuBlob().catch(() => undefined);
          if (eski) {
            await zipOku(eski, "Bu cihazdaki envanter");
            const { session, admin } = await oturumBilgisi().catch(() => ({ session: null, admin: false }));
            if (admin && session) {
              try { setDurum("İlk merkezi envanter oluşturuluyor..."); await merkezeAktar(eski, session.access_token); if (!kapandi) { setDosyaAdi("Merkezi trafo envanteri"); setDurum("Merkezi envanter oluşturuldu • artık tüm cihazlarda otomatik açılır"); } }
              catch (e: any) { if (!kapandi) setHata(h => h || `Merkezi aktarım: ${e?.message || "başarısız"}`); }
            }
          } else if (!kapandi) setDurum("Merkezi envanter henüz yok • admin kullanıcı bir kez SHP envanteri yüklemeli");
        }
      } catch (e: any) { if (!kapandi) setHata(e?.message || "Harita yüklenemedi"); }
    };
    baslat();
    return () => { kapandi = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [supabase]);

  useEffect(() => {
    if (!hazir || !mapRef.current || !window.L) return;
    const L = window.L, map = mapRef.current;
    if (tileLayer.current) map.removeLayer(tileLayer.current);
    tileLayer.current = haritaTipi === "uydu"
      ? L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Tiles © Esri" })
      : L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20, attribution: '&copy; OpenStreetMap' });
    tileLayer.current.addTo(map); tileLayer.current.bringToBack?.(); setTimeout(() => map.invalidateSize(), 80);
  }, [haritaTipi, hazir]);

  useEffect(() => {
    if (!hazir || !veriHazir || !mapRef.current || !window.L || !pointData.current || !buildingData.current) return;
    const L = window.L, map = mapRef.current;
    if (pointLayer.current) { map.removeLayer(pointLayer.current); pointLayer.current = null; }
    if (buildingLayer.current) { map.removeLayer(buildingLayer.current); buildingLayer.current = null; }
    const q = arama.trim().toLocaleLowerCase("tr-TR");
    const temelUygun = (f: GeoFeature) => {
      const p = f.properties || {}, fi = norm(prop(p, "ILCE", "ilce"));
      if (ilce && fi.toLocaleLowerCase("tr-TR") !== ilce.toLocaleLowerCase("tr-TR")) return false;
      if (tipFiltre && anahtar(prop(p, "TIPI")) !== tipFiltre) return false;
      if (q && !["ADI", "ID", "GIS_ID", "LOKASYON_I", "KODU", "MAHALLE", "MARKA", "SERI_NO", "SERI_NUMAR", "GUC", "TIPI"].some(k => norm(p[k]).toLocaleLowerCase("tr-TR").includes(q))) return false;
      return true;
    };
    const tumFiltreli = pointData.current.features.filter(temelUygun);
    let eslesenToplam = 0, tek = 0, cok = 0;
    for (const f of tumFiltreli) { const n = eslesen(f.properties || {}).length; if (n > 0) { eslesenToplam++; if (n === 1) tek++; else cok++; } }
    setEslesenSayisi(eslesenToplam); setTekDegisimSayisi(tek); setCokDegisimSayisi(cok);

    const pts = { type: "FeatureCollection", features: pointData.current.features.filter(f => temelUygun(f) && (!sadeceDegisen || eslesen(f.properties || {}).length > 0)) } as GeoJSON;
    const bins = { type: "FeatureCollection", features: buildingData.current.features.filter(f => {
      const p = f.properties || {}, fi = norm(prop(p, "ILCE", "ilce"));
      if (ilce && fi.toLocaleLowerCase("tr-TR") !== ilce.toLocaleLowerCase("tr-TR")) return false;
      if (!q) return true;
      return ["ADI", "ID", "KODU", "MAHALLE"].some(k => norm(p[k]).toLocaleLowerCase("tr-TR").includes(q));
    }) } as GeoJSON;

    setNoktaSayisi(pts.features.length); setBinaSayisi(bins.features.length);
    setDirekTipiSayisi(pts.features.filter(f => anahtar(prop(f.properties || {}, "TIPI")) === "HARICI").length);
    setBinaTipiSayisi(pts.features.filter(f => anahtar(prop(f.properties || {}, "TIPI")) === "DAHILI").length);

    if (binaAcik && !sadeceDegisen) buildingLayer.current = L.geoJSON(bins, { style: () => ({ color: "#6d28d9", weight: 1.5, fillColor: "#8b5cf6", fillOpacity: .16 }), onEachFeature: (f: any, l: any) => l.bindPopup(binaPopup(f.properties || {}), { maxWidth: 320 }) }).addTo(map);
    if (noktaAcik) pointLayer.current = L.geoJSON(pts, {
      pointToLayer: (f: any, ll: any) => {
        const p = f.properties || {}, n = eslesen(p).length, fill = n > 1 ? "#8b5cf6" : n === 1 ? "#10b981" : "#f97316", tip = anahtar(prop(p, "TIPI"));
        const html = tip === "HARICI"
          ? `<div style="position:relative;width:22px;height:22px;filter:drop-shadow(0 1px 2px rgba(15,23,42,.35))"><div style="position:absolute;left:1px;top:0;width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-bottom:20px solid white"></div><div style="position:absolute;left:4px;top:4px;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:14px solid ${fill}"></div></div>`
          : `<div style="width:18px;height:18px;border:3px solid white;border-radius:2px;background:${fill};box-shadow:0 1px 3px rgba(15,23,42,.4)"></div>`;
        return L.marker(ll, { icon: L.divIcon({ className: "", html, iconSize: [22, 22], iconAnchor: [11, 11] }), interactive: true });
      },
      onEachFeature: (f: any, l: any) => {
        const kayitlar = eslesen(f.properties || {}).sort((a, b) => String(b.tarih || "").localeCompare(String(a.tarih || "")));
        l.bindPopup(noktaPopup(f.properties || {}, kayitlar.length, kayitlar[0]?.tarih || null), { maxWidth: 340 });
      }
    }).addTo(map);

    const layers = [pointLayer.current, buildingLayer.current].filter(Boolean);
    if (layers.length) {
      const bounds = L.featureGroup(layers).getBounds();
      if (bounds.isValid() && (ilce || q || tipFiltre || sadeceDegisen)) map.fitBounds(bounds.pad(.08), { maxZoom: q ? 17 : 12 });
      else if (bounds.isValid()) map.fitBounds(bounds.pad(.04), { maxZoom: 11 });
    }
  }, [hazir, veriHazir, ilce, arama, tipFiltre, noktaAcik, binaAcik, sadeceDegisen, degisimKayitlari]);

  const adminGuncelle = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    if (!f.name.toLowerCase().endsWith(".zip")) { setHata("SHP dosyalarını içeren ZIP seçmelisiniz."); return; }
    setEnvanterIslem(true); setHata("");
    try { await zipOku(f, "Merkezi trafo envanteri"); await merkezeAktar(f); await kaydetBlob(f); setMerkezi(true); setDurum("Merkezi envanter güncellendi • tüm cihazlar yeni veriyi kullanacak"); }
    catch (err: any) { setHata(err?.message || "Merkezi envanter güncellenemedi"); }
    finally { setEnvanterIslem(false); }
  };
  const tumunuGoster = () => { setIlce(""); setArama(""); setTipFiltre(""); setSadeceDegisen(false); mapRef.current?.closePopup(); mapRef.current?.setView([39.65, 27.9], 9); };
  const toplam = useMemo(() => noktaSayisi + binaSayisi, [noktaSayisi, binaSayisi]);

  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Kart ikon="⚡" baslik="TRAFO NOKTALARI" deger={veriHazir ? String(noktaSayisi) : "—"} alt={`${direkTipiSayisi} direk tipi • ${binaTipiSayisi} bina tipi`} />
      <Kart ikon="🕘" baslik="DEĞİŞİM GÖRMÜŞ" deger={veriHazir && !degisimYukleniyor ? String(eslesenSayisi) : "—"} alt={`${tekDegisimSayisi} tek • ${cokDegisimSayisi} çoklu değişim`} />
      <Kart ikon="🏢" baslik="TRAFO BİNALARI" deger={veriHazir ? String(binaSayisi) : "—"} alt="Filtrelenen bina" />
      <Kart ikon="📍" baslik="İLÇE" deger={ilce || "Tümü"} alt="Aktif harita filtresi" />
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,.07)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="flex flex-wrap items-center gap-2"><div className="text-sm font-black text-slate-800">🗺️ Trafo Envanteri</div>{merkezi && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-black text-emerald-700">☁ MERKEZİ</span>}</div><div className="mt-1 text-xs text-slate-500">{dosyaAdi || "Trafo envanteri hazırlanıyor"}{durum && ` • ${durum}`}{degisimYukleniyor ? " • değişim kayıtları eşleştiriliyor..." : ` • ${degisimKayitlari.length} değişim kaydı tarandı`}</div></div>
        {adminMi && <label className={`cursor-pointer rounded-xl px-4 py-2.5 text-xs font-black text-white shadow-sm ${envanterIslem ? "bg-slate-400" : "bg-blue-600 hover:bg-blue-700"}`}>☁ {envanterIslem ? "Güncelleniyor..." : "Envanteri Güncelle"}<input type="file" accept=".zip,application/zip" onChange={adminGuncelle} disabled={envanterIslem} className="hidden" /></label>}
      </div>
      {veriHazir && <><div className="my-4 border-t border-slate-100" />
        <div className="grid gap-3 lg:grid-cols-[190px_190px_minmax(0,1fr)_auto]">
          <select value={ilce} onChange={e => setIlce(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">Tüm İlçeler</option>{ILCE_LISTESI.map(x => <option key={x}>{x}</option>)}</select>
          <select value={tipFiltre} onChange={e => setTipFiltre(e.target.value as "" | "HARICI" | "DAHILI")} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">Tüm Tipler</option><option value="HARICI">▲ Direk Tipi</option><option value="DAHILI">■ Bina Tipi</option></select>
          <input value={arama} onChange={e => setArama(e.target.value)} placeholder="Trafo adı, ID, mahalle, marka, seri no, güç ara..." className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
          <button type="button" onClick={tumunuGoster} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600">Filtreyi Temizle</button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <button onClick={() => setNoktaAcik(v => !v)} className={`rounded-xl border px-3 py-2 text-xs font-black ${noktaAcik ? "border-orange-200 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-500"}`}>⚡ Trafo Noktaları ({noktaSayisi})</button>
          <button onClick={() => setBinaAcik(v => !v)} disabled={sadeceDegisen} className={`rounded-xl border px-3 py-2 text-xs font-black disabled:opacity-40 ${binaAcik ? "border-violet-200 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-500"}`}>🏢 Trafo Binaları ({binaSayisi})</button>
          <button onClick={() => setSadeceDegisen(v => !v)} className={`rounded-xl border px-3 py-2 text-xs font-black ${sadeceDegisen ? "border-emerald-300 bg-emerald-600 text-white" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>🕘 {sadeceDegisen ? "Tüm Trafoları Göster" : "Sadece Değişim Yapılanlar"}</button>
          <button onClick={() => setHaritaTipi(x => x === "standart" ? "uydu" : "standart")} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">{haritaTipi === "standart" ? "🛰️ Uydu Görünümü" : "🗺️ Standart Harita"}</button>
          <span className="ml-auto text-[11px] font-bold text-slate-400">Görünen toplam: {toplam}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-bold text-slate-500"><span>▲ Direk tipi (TIPI=HARİCİ)</span><span>■ Bina tipi (TIPI=DAHİLİ)</span><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-orange-500" />Değişim kaydı yok</span><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />1 değişim</span><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-violet-500" />2+ değişim</span></div>
      </>}
    </div>

    {hata && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{hata}</div>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,.08)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><div className="text-sm font-black text-slate-800">Balıkesir Trafo Envanter Haritası</div><div className="mt-0.5 text-[10px] text-slate-400">▲ Direk tipi • ■ Bina tipi • Turuncu: kayıt yok • Yeşil: 1 değişim • Mor: 2+ değişim</div></div><span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${hazir && veriHazir ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{hazir && veriHazir ? "HARİTA HAZIR" : "YÜKLENİYOR"}</span></div>
      <div ref={mapEl} className="h-[72vh] min-h-[580px] w-full" />
    </div>
  </div>;
}

function Kart({ ikon, baslik, deger, alt }: { ikon: string; baslik: string; deger: string; alt: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">{ikon}</div><div className="min-w-0"><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">{baslik}</div><div className="mt-1 truncate text-xl font-black text-slate-900">{deger}</div><div className="mt-0.5 truncate text-[10px] text-slate-400">{alt}</div></div></div></div>;
}
