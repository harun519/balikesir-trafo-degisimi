"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "./supabaseClient";

declare global {
  interface Window {
    L?: any;
    shp?: (data: ArrayBuffer) => Promise<any>;
  }
}

type GeoFeature = { type: string; geometry: any; properties: Record<string, any> };
type GeoJSON = { type: "FeatureCollection"; features: GeoFeature[] };
type HaritaSinifi = "DIREK" | "BINA";
type DegisimFiltre = "TUMU" | "DEGISEN" | "DEGISMEYEN";
type DegisimKaydi = {
  id: number;
  trafo_id: string | null;
  lokasyon_id: string | null;
  tr: string | null;
  tarih: string | null;
  degisim_nedeni: string | null;
  aciklama: string | null;
};
type PoligonAday = {
  feature: GeoFeature;
  sinif: HaritaSinifi;
  bbox: [number, number, number, number];
  merkez: [number, number];
  ilce: string;
};

const ILCE_LISTESI = ["Altıeylül", "Karesi", "Balya", "Bigadiç", "Dursunbey", "İvrindi", "Kepsut", "Savaştepe", "Sındırgı", "Susurluk"];
const DB = "trafo-harita-db", STORE = "dosyalar", KEY = "shp-zip";
const TRAFO_CACHE_KEY="trafo_degisim_cache_v1";
function cacheDegisimleriniOku():DegisimKaydi[]{
  if(typeof window==="undefined")return [];
  try{
    const v=JSON.parse(localStorage.getItem(TRAFO_CACHE_KEY)||"[]");
    if(!Array.isArray(v))return [];
    return v.map((x:any)=>({id:Number(x?.id||0),trafo_id:x?.trafo_id??null,lokasyon_id:x?.lokasyon_id??null,tr:x?.tr??null,tarih:x?.tarih??null,degisim_nedeni:x?.degisim_nedeni??null,aciklama:x?.aciklama??null}));
  }catch{return [];}
}
const NEDEN_RENKLERI = [
  { ad: "ARIZA", renk: "#ef4444" },
  { ad: "DÖNÜŞÜM", renk: "#3b82f6" },
  { ad: "GÜÇ DEĞİŞİMİ", renk: "#84cc16" },
  { ad: "TRAFO İPTAL", renk: "#38bdf8" },
  { ad: "YATIRIM", renk: "#facc15" },
  { ad: "YENİ TESİS", renk: "#22d3ee" },
  { ad: "ARIZA RİSKİ", renk: "#fb7185" },
  { ad: "KISMİ ARIZALI", renk: "#f97316" },
];

const norm = (v: any) => String(v ?? "").trim();
const anahtar = (v: any) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "I").replace(/İ/g, "I").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const esc = (v: any) => String(v ?? "—").replace(/[&<>'\"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c] || c));
const prop = (p: any, ...keys: string[]) => { for (const k of keys) if (p?.[k] != null && String(p[k]).trim() !== "") return p[k]; return ""; };
const shpTipiEtiket = (p: any) => anahtar(prop(p, "TIPI")) === "HARICI" ? "HARİCİ" : anahtar(prop(p, "TIPI")) === "DAHILI" ? "DAHİLİ" : norm(prop(p, "TIPI")) || "Bilinmiyor";
const haritaSinifiEtiket = (p: any) => p?.__HARITA_SINIFI === "BINA" ? "Bina Tipi" : "Direk Tipi";
const mulkiyetEtiket = (p: any) => anahtar(prop(p, "MULKIYET")) === "EDAS" ? "EDAŞ" : anahtar(prop(p, "MULKIYET")) === "DEVIRLI" ? "Devirli" : norm(prop(p, "MULKIYET")) || "Bilinmiyor";
const nedenRengi = (neden: any) => NEDEN_RENKLERI.find(x => anahtar(x.ad) === anahtar(neden))?.renk || "#64748b";

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
function scriptYukle(id: string, kaynaklar: string[], test: () => boolean) {
  return new Promise<void>((ok, no) => {
    if (test()) return ok();
    let bitti = false, sira = 0, kontrol: number | undefined;
    const tamam = () => { if (bitti) return; bitti = true; if (kontrol) window.clearInterval(kontrol); ok(); };
    const hata = () => { if (bitti) return; bitti = true; if (kontrol) window.clearInterval(kontrol); no(new Error("Kütüphane yüklenemedi")); };
    const hazirMi = () => { if (test()) { tamam(); return true; } return false; };
    const siradakiniYukle = () => {
      if (hazirMi()) return;
      document.getElementById(id)?.remove();
      const src = kaynaklar[sira++];
      if (!src) { hata(); return; }
      const sc = document.createElement("script");
      sc.id = id; sc.src = src; sc.async = true;
      sc.onload = () => { if (!hazirMi()) siradakiniYukle(); };
      sc.onerror = siradakiniYukle;
      document.body.appendChild(sc);
    };
    let eski = document.getElementById(id) as HTMLScriptElement | null;
    if (eski) {
      // SPA/PWA ilk acilista script etiketi DOM'da olup load olayi daha once kacmis olabilir.
      // Bu durumda sadece load eventini beklemek haritayi sonsuza kadar bos birakiyordu.
      if (hazirMi()) return;
      let deneme = 0;
      kontrol = window.setInterval(() => {
        if (hazirMi()) return;
        if (++deneme >= 30) { if (kontrol) window.clearInterval(kontrol); kontrol = undefined; siradakiniYukle(); }
      }, 100);
      eski.addEventListener("load", hazirMi, { once: true });
      eski.addEventListener("error", siradakiniYukle, { once: true });
      return;
    }
    siradakiniYukle();
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
  const p = String(t).slice(0, 10).split("-");
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : String(t);
}
function noktaKoordinati(f: GeoFeature): [number, number] | null {
  const g = f?.geometry;
  if (!g) return null;
  if (g.type === "Point" && Array.isArray(g.coordinates)) return [Number(g.coordinates[0]), Number(g.coordinates[1])];
  if (g.type === "MultiPoint" && Array.isArray(g.coordinates?.[0])) return [Number(g.coordinates[0][0]), Number(g.coordinates[0][1])];
  return null;
}
function tumKoordinatlar(g: any): [number, number][] {
  const out: [number, number][] = [];
  const gez = (x: any) => {
    if (!Array.isArray(x)) return;
    if (x.length >= 2 && typeof x[0] === "number" && typeof x[1] === "number") { out.push([x[0], x[1]]); return; }
    for (const y of x) gez(y);
  };
  gez(g?.coordinates);
  return out;
}
function geometriBilgisi(f: GeoFeature) {
  const pts = tumKoordinatlar(f.geometry);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, sx = 0, sy = 0;
  for (const [x, y] of pts) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); sx += x; sy += y; }
  if (!pts.length) return { bbox: [0, 0, 0, 0] as [number, number, number, number], merkez: [0, 0] as [number, number] };
  return { bbox: [minX, minY, maxX, maxY] as [number, number, number, number], merkez: [sx / pts.length, sy / pts.length] as [number, number] };
}
function halkaIcinde(pt: [number, number], ring: any[]): boolean {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = Number(ring[i]?.[0]), yi = Number(ring[i]?.[1]), xj = Number(ring[j]?.[0]), yj = Number(ring[j]?.[1]);
    const keser = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-12) + xi);
    if (keser) inside = !inside;
  }
  return inside;
}
function poligonIcinde(pt: [number, number], g: any): boolean {
  const polyIcinde = (poly: any[]) => {
    if (!Array.isArray(poly?.[0]) || !halkaIcinde(pt, poly[0])) return false;
    for (let i = 1; i < poly.length; i++) if (halkaIcinde(pt, poly[i])) return false;
    return true;
  };
  if (g?.type === "Polygon") return polyIcinde(g.coordinates || []);
  if (g?.type === "MultiPolygon") return (g.coordinates || []).some((poly: any[]) => polyIcinde(poly));
  return false;
}
function metreMesafe(a: [number, number], b: [number, number]) {
  const rad = Math.PI / 180, lat = ((a[1] + b[1]) / 2) * rad;
  const dx = (a[0] - b[0]) * 111320 * Math.cos(lat), dy = (a[1] - b[1]) * 110540;
  return Math.sqrt(dx * dx + dy * dy);
}
function shpFallbackSinifi(p: any): HaritaSinifi { return anahtar(prop(p, "TIPI")) === "DAHILI" ? "BINA" : "DIREK"; }
function poligonSinifi(p: any): HaritaSinifi { return anahtar(prop(p, "TIPI")) === "DIREK" ? "DIREK" : "BINA"; }
function noktalariSiniflandir(noktalar: GeoFeature[], poligonlar: GeoFeature[]) {
  const adaylar: PoligonAday[] = poligonlar.map(feature => {
    const geo = geometriBilgisi(feature);
    return { feature, sinif: poligonSinifi(feature.properties || {}), bbox: geo.bbox, merkez: geo.merkez, ilce: anahtar(prop(feature.properties || {}, "ILCE")) };
  });
  const ilceMap = new Map<string, PoligonAday[]>();
  for (const a of adaylar) {
    if (!ilceMap.has(a.ilce)) ilceMap.set(a.ilce, []);
    ilceMap.get(a.ilce)!.push(a);
  }
  return noktalar.map(f => {
    const p = { ...(f.properties || {}) };
    const pt = noktaKoordinati(f), ilceKey = anahtar(prop(p, "ILCE")), havuz = ilceMap.get(ilceKey) || adaylar;
    let eslesenPoligon: PoligonAday | null = null;
    if (pt) {
      for (const a of havuz) {
        const [minX, minY, maxX, maxY] = a.bbox;
        if (pt[0] < minX || pt[0] > maxX || pt[1] < minY || pt[1] > maxY) continue;
        if (poligonIcinde(pt, a.feature.geometry)) { eslesenPoligon = a; break; }
      }
      if (!eslesenPoligon) {
        let enYakin = Infinity;
        for (const a of havuz) {
          const d = metreMesafe(pt, a.merkez);
          if (d < enYakin) { enYakin = d; eslesenPoligon = a; }
        }
        if (enYakin > 75) eslesenPoligon = null;
      }
    }
    const sinif = eslesenPoligon?.sinif || shpFallbackSinifi(p), shpSinif = shpFallbackSinifi(p);
    p.__HARITA_SINIFI = sinif;
    p.__TIP_UYUMSUZ = (anahtar(prop(p, "TIPI")) === "HARICI" || anahtar(prop(p, "TIPI")) === "DAHILI") && shpSinif !== sinif;
    p.__POLIGON_TIPI = eslesenPoligon ? norm(prop(eslesenPoligon.feature.properties || {}, "TIPI")) : "";
    p.__SINIF_KAYNAK = eslesenPoligon ? "Geometri" : "SHP TIPI (yedek)";
    return { ...f, properties: p };
  });
}

function noktaPopup(p: any, kayitlar: DegisimKaydi[]) {
  const son = kayitlar[0], adet = kayitlar.length;
  const durum = adet > 0
    ? `<div style="margin-top:8px;padding:9px 10px;border-radius:9px;background:#f8fafc;border-left:5px solid ${nedenRengi(son?.degisim_nedeni)};color:#334155;font-weight:800"><div>🕘 ${adet} değişim kaydı</div><div style="margin-top:3px;font-size:11px">Son neden: <b>${esc(son?.degisim_nedeni || "Belirtilmemiş")}</b></div>${son?.tarih ? `<div style="margin-top:2px;font-size:10px;font-weight:700;color:#64748b">Son değişim: ${esc(tarihGoster(son.tarih))}</div>` : ""}</div>`
    : `<div style="margin-top:8px;padding:8px 10px;border-radius:9px;background:#f1f5f9;color:#64748b;font-weight:800">Değişim kaydı yok</div>`;
  const uyari = p?.__TIP_UYUMSUZ ? `<div style="margin-top:8px;padding:7px 9px;border-radius:8px;background:#fef3c7;color:#92400e;font-size:10px;font-weight:800">⚠ SHP TIPI ile geometrik sınıf uyuşmuyor</div>` : "";
  return `<div style="min-width:250px;font-family:Arial,sans-serif"><div style="font-weight:800;font-size:14px;margin-bottom:8px;color:#0f172a">⚡ ${esc(prop(p, "ADI") || "Trafo")}</div><div style="display:grid;gap:4px;font-size:12px;color:#334155"><div><b>İlçe:</b> ${esc(prop(p, "ILCE"))}</div><div><b>Mahalle:</b> ${esc(prop(p, "MAHALLE"))}</div><div><b>Montaj Tipi:</b> ${esc(haritaSinifiEtiket(p))}</div><div><b>Mülkiyet:</b> ${esc(mulkiyetEtiket(p))}</div><div><b>SHP TIPI:</b> ${esc(shpTipiEtiket(p))}</div>${p?.__POLIGON_TIPI ? `<div><b>Eşleşen Yapı:</b> ${esc(p.__POLIGON_TIPI)}</div>` : ""}<div><b>Trafo ID:</b> ${esc(prop(p, "ID"))}</div><div><b>Lokasyon ID:</b> ${esc(prop(p, "LOKASYON_I"))}</div><div><b>Güç:</b> ${esc(prop(p, "GUC"))}${prop(p, "GUC") ? " kVA" : ""}</div><div><b>Primer Gerilim:</b> ${esc(prop(p, "PRIMER_GER"))}</div><div><b>Marka:</b> ${esc(prop(p, "MARKA"))}</div><div><b>Seri No:</b> ${esc(prop(p, "SERI_NO"))}</div><div><b>İmal Yılı:</b> ${esc(prop(p, "IMAL_YILI"))}</div><div><b>Cinsi:</b> ${esc(prop(p, "CINSI"))}</div></div>${uyari}${durum}</div>`;
}
function binaPopup(p: any) {
  return `<div style="min-width:235px;font-family:Arial,sans-serif"><div style="font-weight:800;font-size:14px;margin-bottom:8px;color:#0f172a">🏢 ${esc(prop(p, "ADI") || "Trafo Binası")}</div><div style="display:grid;gap:4px;font-size:12px;color:#334155"><div><b>İlçe:</b> ${esc(prop(p, "ILCE"))}</div><div><b>Mahalle:</b> ${esc(prop(p, "MAHALLE"))}</div><div><b>Bina ID:</b> ${esc(prop(p, "ID"))}</div><div><b>Kodu:</b> ${esc(prop(p, "KODU"))}</div><div><b>Tipi:</b> ${esc(prop(p, "TIPI"))}</div><div><b>Mülkiyet:</b> ${esc(mulkiyetEtiket(p))}</div><div><b>Alt Tip:</b> ${esc(prop(p, "ALTTIP"))}</div><div><b>Gerilim:</b> ${esc(prop(p, "ISLETME_GE"))}</div></div></div>`;
}

export default function TrafoHarita() {
  const mapEl = useRef<HTMLDivElement | null>(null), mapRef = useRef<any>(null), pointLayer = useRef<any>(null), buildingLayer = useRef<any>(null), tileLayer = useRef<any>(null), labelLayers = useRef<any[]>([]), pointData = useRef<GeoJSON | null>(null), buildingData = useRef<GeoJSON | null>(null);
  const [hazir, setHazir] = useState(false), [veriHazir, setVeriHazir] = useState(false), [hata, setHata] = useState(""), [durum, setDurum] = useState("Merkezi envanter kontrol ediliyor..."), [dosyaAdi, setDosyaAdi] = useState("");
  const [ilce, setIlce] = useState(""), [arama, setArama] = useState(""), [tipFiltre, setTipFiltre] = useState<"" | "DIREK" | "BINA">(""), [mulkiyetFiltre, setMulkiyetFiltre] = useState<"" | "EDAS" | "DEVIRLI">(""), [degisimFiltre, setDegisimFiltre] = useState<DegisimFiltre>("TUMU"), [noktaAcik, setNoktaAcik] = useState(true), [binaAcik, setBinaAcik] = useState(true), [noktaSayisi, setNoktaSayisi] = useState(0), [binaSayisi, setBinaSayisi] = useState(0), [direkTipiSayisi, setDirekTipiSayisi] = useState(0), [binaTipiSayisi, setBinaTipiSayisi] = useState(0), [uyumsuzSayisi, setUyumsuzSayisi] = useState(0), [haritaTipi, setHaritaTipi] = useState<"standart" | "uydu">("standart");
  const [degisimKayitlari, setDegisimKayitlari] = useState<DegisimKaydi[]>([]), [degisimYukleniyor, setDegisimYukleniyor] = useState(false), [eslesenSayisi, setEslesenSayisi] = useState(0), [tekDegisimSayisi, setTekDegisimSayisi] = useState(0), [cokDegisimSayisi, setCokDegisimSayisi] = useState(0);
  const [merkezi, setMerkezi] = useState(false), [adminMi, setAdminMi] = useState(false), [envanterIslem, setEnvanterIslem] = useState(false);

  const supabase = useMemo(getSupabaseBrowserClient, []);
  const degisimIndex = useMemo(() => {
    const idx = new Map<string, DegisimKaydi[]>();
    for (const k of degisimKayitlari) {
      const a = anahtar(k.lokasyon_id);
      if (!a) continue;
      if (!idx.has(a)) idx.set(a, []);
      idx.get(a)!.push(k);
    }
    idx.forEach(v => v.sort((a, b) => String(b.tarih || "").localeCompare(String(a.tarih || ""))));
    return idx;
  }, [degisimKayitlari]);
  const eslesen = (p: any) => degisimIndex.get(anahtar(prop(p, "LOKASYON_I"))) || [];

  const veriyiKur = (x: any, ad: string) => {
    const a = ayir(x);
    const hamNoktalar = a.nokta.features.filter(f => anahtar(prop(f.properties || {}, "MULKIYET")) !== "OZEL");
    const binaFeatures = a.bina.features.filter(f => anahtar(prop(f.properties || {}, "MULKIYET")) !== "OZEL");
    const noktaFeatures = noktalariSiniflandir(hamNoktalar, binaFeatures);
    pointData.current = { type: "FeatureCollection", features: noktaFeatures };
    buildingData.current = { type: "FeatureCollection", features: binaFeatures };
    setUyumsuzSayisi(noktaFeatures.filter(f => !!f.properties?.__TIP_UYUMSUZ).length);
    setDosyaAdi(ad); setVeriHazir(true); setDurum(`${noktaFeatures.length.toLocaleString("tr-TR")} trafo noktası • ${binaFeatures.length.toLocaleString("tr-TR")} yapı poligonu • geometrik tip ayrımı • özel mülkiyet hariç`); setHata("");
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
    const cacheYukle = () => {
      if(kapandi)return;
      setDegisimYukleniyor(true);
      setDegisimKayitlari(cacheDegisimleriniOku());
      setDegisimYukleniyor(false);
      setHata(h => h.startsWith("Değişim kayıtları eşleştirilemedi:") ? "" : h);
    };
    const manuelGuncelleme = (e:Event) => {
      if(kapandi)return;
      const liste=(e as CustomEvent).detail?.kayitlar;
      if(Array.isArray(liste)){
        setDegisimKayitlari(liste.map((x:any)=>({id:Number(x?.id||0),trafo_id:x?.trafo_id??null,lokasyon_id:x?.lokasyon_id??null,tr:x?.tr??null,tarih:x?.tarih??null,degisim_nedeni:x?.degisim_nedeni??null,aciklama:x?.aciklama??null})));
        setDegisimYukleniyor(false);
      }else cacheYukle();
    };
    cacheYukle();
    oturumBilgisi().catch(() => {});
    window.addEventListener("trafo-harita-veri-yenile", cacheYukle as EventListener);
    window.addEventListener("trafo-manuel-veri-guncellendi", manuelGuncelleme as EventListener);
    return () => {
      kapandi = true;
      window.removeEventListener("trafo-harita-veri-yenile", cacheYukle as EventListener);
      window.removeEventListener("trafo-manuel-veri-guncellendi", manuelGuncelleme as EventListener);
    };
  }, [supabase]);

  useEffect(() => {
    let kapandi = false;
    const baslat = async () => {
      try {
        // shpjs does not publish TypeScript declarations, but its runtime export is stable.
        // @ts-expect-error shpjs has no bundled declaration file
        const [leafletMod, shpMod] = await Promise.all([import("leaflet"), import("shpjs")]);
        window.L = leafletMod.default || leafletMod;
        window.shp = (shpMod.default || shpMod.parseZip) as typeof window.shp;
        if (kapandi) return;
        // Harita sekmesi ilk acilirken React portal/DOM yerlesimi bir frame gecikebiliyor.
        // Container gercekten DOM'a ve olcuye kavusana kadar kisa sure bekle.
        for (let i=0; i<30 && !kapandi; i++) {
          const el=mapEl.current;
          if (el && el.isConnected && el.clientWidth>0 && el.clientHeight>0) break;
          await new Promise(r=>window.setTimeout(r,50));
        }
        if (kapandi || !mapEl.current || !mapEl.current.isConnected) return;
        const L = window.L;
        if (!L) throw new Error("Harita kütüphanesi hazır değil");
        if (mapRef.current) { try { mapRef.current.remove(); } catch {} mapRef.current=null; }
        const map = L.map(mapEl.current, { zoomControl: true, preferCanvas: true, renderer: L.canvas({ padding: .5, tolerance: 12 }) }).setView([39.65, 27.9], 9);
        tileLayer.current = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20, attribution: '&copy; OpenStreetMap' }).addTo(map);
        mapRef.current = map;
        // Ilk gorunumde gizli/yeniden boyutlanan container kaynakli gri-bos haritayi engelle.
        requestAnimationFrame(()=>{ try { map.invalidateSize({pan:false}); } catch {} });
        window.setTimeout(()=>{ try { map.invalidateSize({pan:false}); } catch {} },120);
        window.setTimeout(()=>{ try { map.invalidateSize({pan:false}); } catch {} },450);
        setHazir(true);
        let merkezVar = false;
        try {
          const r = await fetch("/api/harita-envanter");
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
    labelLayers.current.forEach(layer => { try { map.removeLayer(layer); } catch {} });
    labelLayers.current = [];
    const tileOlustur = L.tileLayer.__orj || L.tileLayer.bind(L);
    if (haritaTipi === "uydu") {
      tileLayer.current = tileOlustur("https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Tiles © Esri", updateWhenIdle: true, keepBuffer: 2 }).addTo(map);
      if (!map.getPane("uyduEtiketPane")) {
        const pane = map.createPane("uyduEtiketPane");
        pane.style.zIndex = "450";
        pane.style.pointerEvents = "none";
      }
      labelLayers.current = [
        tileOlustur("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, pane: "uyduEtiketPane", opacity: 1, updateWhenIdle: true, keepBuffer: 2 }),
        tileOlustur("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, pane: "uyduEtiketPane", opacity: 1, attribution: "Labels © Esri", updateWhenIdle: true, keepBuffer: 2 })
      ];
      labelLayers.current.forEach(layer => layer.addTo(map));
    } else {
      tileLayer.current = tileOlustur("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20, attribution: '&copy; OpenStreetMap', updateWhenIdle: true, keepBuffer: 2 }).addTo(map);
    }
    tileLayer.current.bringToBack?.();
    requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    window.setTimeout(() => { map.invalidateSize({ pan: false }); tileLayer.current?.redraw?.(); labelLayers.current.forEach(layer => layer.redraw?.()); }, 180);
  }, [haritaTipi, hazir]);

  useEffect(() => {
    if (!hazir || !mapRef.current || !mapEl.current) return;
    const map = mapRef.current, el = mapEl.current;
    let frame = 0, timer = 0;
    const canlandir = () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      frame = requestAnimationFrame(() => {
        map.invalidateSize({ pan: false });
        timer = window.setTimeout(() => map.invalidateSize({ pan: false }), 240);
      });
    };
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(canlandir) : null;
    observer?.observe(el);
    window.addEventListener("trafo-harita-gorundu", canlandir);
    window.addEventListener("orientationchange", canlandir);
    const visibility = () => { if (document.visibilityState === "visible") canlandir(); };
    document.addEventListener("visibilitychange", visibility);
    canlandir();
    return () => {
      observer?.disconnect();
      window.removeEventListener("trafo-harita-gorundu", canlandir);
      window.removeEventListener("orientationchange", canlandir);
      document.removeEventListener("visibilitychange", visibility);
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [hazir]);

  useEffect(() => {
    if (!hazir || !veriHazir || !mapRef.current || !window.L || !pointData.current || !buildingData.current) return;
    const L = window.L, map = mapRef.current;
    if (pointLayer.current) { map.removeLayer(pointLayer.current); pointLayer.current = null; }
    if (buildingLayer.current) { map.removeLayer(buildingLayer.current); buildingLayer.current = null; }
    const q = arama.trim().toLocaleLowerCase("tr-TR");
    const temelUygun = (f: GeoFeature) => {
      const p = f.properties || {}, fi = norm(prop(p, "ILCE", "ilce"));
      if (ilce && fi.toLocaleLowerCase("tr-TR") !== ilce.toLocaleLowerCase("tr-TR")) return false;
      if (tipFiltre && p.__HARITA_SINIFI !== tipFiltre) return false;
      if (mulkiyetFiltre && anahtar(prop(p, "MULKIYET")) !== mulkiyetFiltre) return false;
      if (q) {
        const alanlar = ["ADI", "ID", "GIS_ID", "LOKASYON_I", "KODU", "MAHALLE", "MARKA", "SERI_NO", "SERI_NUMAR", "GUC", "TIPI"].map(k => norm(p[k]));
        alanlar.push(haritaSinifiEtiket(p), p.__HARITA_SINIFI === "DIREK" ? "direk üçgen harici" : "bina kare dahili", mulkiyetEtiket(p));
        if (!alanlar.some(v => v.toLocaleLowerCase("tr-TR").includes(q))) return false;
      }
      return true;
    };
    const tumFiltreli = pointData.current.features.filter(temelUygun);
    let eslesenToplam = 0, tek = 0, cok = 0;
    for (const f of tumFiltreli) { const n = eslesen(f.properties || {}).length; if (n > 0) { eslesenToplam++; if (n === 1) tek++; else cok++; } }
    setEslesenSayisi(eslesenToplam); setTekDegisimSayisi(tek); setCokDegisimSayisi(cok);

    const pts = { type: "FeatureCollection", features: pointData.current.features.filter(f => {
      if (!temelUygun(f)) return false;
      const n = eslesen(f.properties || {}).length;
      if (degisimFiltre === "DEGISEN" && n === 0) return false;
      if (degisimFiltre === "DEGISMEYEN" && n > 0) return false;
      return true;
    }) } as GeoJSON;
    const bins = { type: "FeatureCollection", features: buildingData.current.features.filter(f => {
      const p = f.properties || {}, fi = norm(prop(p, "ILCE", "ilce"));
      if (ilce && fi.toLocaleLowerCase("tr-TR") !== ilce.toLocaleLowerCase("tr-TR")) return false;
      if (mulkiyetFiltre && anahtar(prop(p, "MULKIYET")) !== mulkiyetFiltre) return false;
      if (!q) return true;
      return ["ADI", "ID", "KODU", "MAHALLE", "MULKIYET", "TIPI"].some(k => norm(p[k]).toLocaleLowerCase("tr-TR").includes(q));
    }) } as GeoJSON;

    setNoktaSayisi(pts.features.length); setBinaSayisi(bins.features.length);
    setDirekTipiSayisi(pts.features.filter(f => f.properties?.__HARITA_SINIFI === "DIREK").length);
    setBinaTipiSayisi(pts.features.filter(f => f.properties?.__HARITA_SINIFI === "BINA").length);
    setUyumsuzSayisi(pointData.current.features.filter(f => !!f.properties?.__TIP_UYUMSUZ).length);

    if (binaAcik && degisimFiltre === "TUMU") buildingLayer.current = L.geoJSON(bins, { style: () => ({ color: "#6d28d9", weight: 1.5, fillColor: "#8b5cf6", fillOpacity: .16 }), onEachFeature: (f: any, l: any) => l.bindPopup(binaPopup(f.properties || {}), { maxWidth: 320 }) }).addTo(map);
    if (noktaAcik) pointLayer.current = L.geoJSON(pts, {
      pointToLayer: (f: any, ll: any) => {
        const p = f.properties || {}, kayitlar = eslesen(p), son = kayitlar[0], fill = kayitlar.length ? nedenRengi(son?.degisim_nedeni) : "#94a3b8", sinif = p.__HARITA_SINIFI as HaritaSinifi;
        const html = sinif === "DIREK"
          ? `<div style="position:relative;width:30px;height:30px;filter:drop-shadow(0 2px 3px rgba(15,23,42,.55))"><div style="position:absolute;left:1px;top:0;width:0;height:0;border-left:14px solid transparent;border-right:14px solid transparent;border-bottom:28px solid #ffffff"></div><div style="position:absolute;left:5px;top:5px;width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-bottom:20px solid ${fill}"></div></div>`
          : `<div style="width:24px;height:24px;border:4px solid #ffffff;border-radius:2px;background:${fill};box-shadow:0 2px 4px rgba(15,23,42,.55)"></div>`;
        return L.marker(ll, { icon: L.divIcon({ className: "", html, iconSize: [30, 30], iconAnchor: [15, 15] }), interactive: true, riseOnHover: true });
      },
      onEachFeature: (f: any, l: any) => {
        const kayitlar = eslesen(f.properties || {});
        l.bindPopup(noktaPopup(f.properties || {}, kayitlar), { maxWidth: 350 });
      }
    }).addTo(map);

    const layers = [pointLayer.current, buildingLayer.current].filter(Boolean);
    if (layers.length) {
      const bounds = L.featureGroup(layers).getBounds();
      if (bounds.isValid() && (ilce || q || tipFiltre || mulkiyetFiltre || degisimFiltre !== "TUMU")) map.fitBounds(bounds.pad(.08), { maxZoom: q ? 17 : 12 });
      else if (bounds.isValid()) map.fitBounds(bounds.pad(.04), { maxZoom: 11 });
    }
    requestAnimationFrame(() => map.invalidateSize({ pan: false }));
  }, [hazir, veriHazir, ilce, arama, tipFiltre, mulkiyetFiltre, degisimFiltre, noktaAcik, binaAcik, degisimKayitlari]);

  const adminGuncelle = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    if (!f.name.toLowerCase().endsWith(".zip")) { setHata("SHP dosyalarını içeren ZIP seçmelisiniz."); return; }
    setEnvanterIslem(true); setHata("");
    try { await zipOku(f, "Merkezi trafo envanteri"); await merkezeAktar(f); await kaydetBlob(f); setMerkezi(true); setDurum("Merkezi envanter güncellendi • tüm cihazlar yeni veriyi kullanacak"); }
    catch (err: any) { setHata(err?.message || "Merkezi envanter güncellenemedi"); }
    finally { setEnvanterIslem(false); }
  };
  const tumunuGoster = () => { setIlce(""); setArama(""); setTipFiltre(""); setMulkiyetFiltre(""); setDegisimFiltre("TUMU"); mapRef.current?.closePopup(); mapRef.current?.setView([39.65, 27.9], 9); };
  const toplam = useMemo(() => noktaSayisi + binaSayisi, [noktaSayisi, binaSayisi]);

  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Kart ikon="⚡" baslik="TRAFO NOKTALARI" deger={veriHazir ? String(noktaSayisi) : "—"} alt={`${direkTipiSayisi} direk tipi • ${binaTipiSayisi} bina tipi`} />
      <Kart ikon="🕘" baslik="DEĞİŞİM GÖRMÜŞ" deger={veriHazir && !degisimYukleniyor ? String(eslesenSayisi) : "—"} alt={`${tekDegisimSayisi} tek • ${cokDegisimSayisi} çoklu değişim`} />
      <Kart ikon="⚠️" baslik="TIP UYUMSUZLUĞU" deger={veriHazir ? String(uyumsuzSayisi) : "—"} alt="SHP tipi / geometrik sınıf" />
      <Kart ikon="📍" baslik="İLÇE" deger={ilce || "Tümü"} alt="Aktif harita filtresi" />
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,.07)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="flex flex-wrap items-center gap-2"><div className="text-sm font-black text-slate-800">🗺️ Trafo Envanteri</div>{merkezi && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-black text-emerald-700">☁ MERKEZİ</span>}</div><div className="mt-1 text-xs text-slate-500">{dosyaAdi || "Trafo envanteri hazırlanıyor"}{durum && ` • ${durum}`}{degisimYukleniyor ? " • değişim kayıtları eşleştiriliyor..." : ` • ${degisimKayitlari.length} değişim kaydı tarandı`}</div></div>
        {adminMi && <label className={`cursor-pointer rounded-xl px-4 py-2.5 text-xs font-black text-white shadow-sm ${envanterIslem ? "bg-slate-400" : "bg-blue-600 hover:bg-blue-700"}`}>☁ {envanterIslem ? "Güncelleniyor..." : "Envanteri Güncelle"}<input type="file" accept=".zip,application/zip" onChange={adminGuncelle} disabled={envanterIslem} className="hidden" /></label>}
      </div>
      {veriHazir && <><div className="my-4 border-t border-slate-100" />
        <div className="grid gap-3 lg:grid-cols-[175px_175px_175px_minmax(0,1fr)_auto]">
          <select value={ilce} onChange={e => setIlce(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">Tüm İlçeler</option>{ILCE_LISTESI.map(x => <option key={x}>{x}</option>)}</select>
          <select value={tipFiltre} onChange={e => setTipFiltre(e.target.value as "" | "DIREK" | "BINA")} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">Tüm Tipler</option><option value="DIREK">▲ Direk Tipi</option><option value="BINA">■ Bina Tipi</option></select>
          <select value={mulkiyetFiltre} onChange={e => setMulkiyetFiltre(e.target.value as "" | "EDAS" | "DEVIRLI")} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">Tüm Mülkiyetler</option><option value="EDAS">EDAŞ</option><option value="DEVIRLI">Devirli</option></select>
          <input value={arama} onChange={e => setArama(e.target.value)} placeholder="Trafo adı, Lokasyon ID, Trafo ID, mahalle, marka, seri no, güç, direk/bina tipi ara..." className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
          <button type="button" onClick={tumunuGoster} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600">Filtreyi Temizle</button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <button onClick={() => setNoktaAcik(v => !v)} className={`rounded-xl border px-3 py-2 text-xs font-black ${noktaAcik ? "border-slate-300 bg-slate-100 text-slate-700" : "border-slate-200 bg-white text-slate-500"}`}>⚡ Trafo Noktaları ({noktaSayisi})</button>
          <button onClick={() => setBinaAcik(v => !v)} disabled={degisimFiltre !== "TUMU"} className={`rounded-xl border px-3 py-2 text-xs font-black disabled:opacity-40 ${binaAcik ? "border-violet-200 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-500"}`}>🏢 Yapı Poligonları ({binaSayisi})</button>
          <button onClick={() => setDegisimFiltre(v => v === "DEGISEN" ? "TUMU" : "DEGISEN")} className={`rounded-xl border px-3 py-2 text-xs font-black ${degisimFiltre === "DEGISEN" ? "border-emerald-300 bg-emerald-600 text-white" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>🕘 Değişim Yapılanlar</button>
          <button onClick={() => setDegisimFiltre(v => v === "DEGISMEYEN" ? "TUMU" : "DEGISMEYEN")} className={`rounded-xl border px-3 py-2 text-xs font-black ${degisimFiltre === "DEGISMEYEN" ? "border-slate-400 bg-slate-600 text-white" : "border-slate-200 bg-slate-50 text-slate-600"}`}>○ Değişim Yapılmayanlar</button>
          <button onClick={() => setHaritaTipi(x => x === "standart" ? "uydu" : "standart")} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">{haritaTipi === "standart" ? "🛰️ Uydu Görünümü" : "🗺️ Standart Harita"}</button>
          <span className="ml-auto text-[11px] font-bold text-slate-400">Görünen toplam: {toplam}</span>
        </div>
      </>}
      <div data-trafo-harita-lejant="1" className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-[10px] font-bold text-slate-600">
        <span>▲ Direk tipi</span><span>■ Bina tipi</span><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-slate-400" />Değişim yok</span>
        {NEDEN_RENKLERI.map(x => <span key={x.ad}><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: x.renk }} />{x.ad}</span>)}
      </div>
    </div>

    {hata && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{hata}</div>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,.08)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><div className="text-sm font-black text-slate-800">Balıkesir Trafo Envanter Haritası</div><div className="mt-0.5 text-[10px] text-slate-400">Sembol şekli montaj tipini, renk ise son değişim nedenini gösterir.</div></div><span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${hazir && veriHazir ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{hazir && veriHazir ? "HARİTA HAZIR" : "YÜKLENİYOR"}</span></div>
      <div ref={mapEl} className="h-[72vh] min-h-[580px] w-full" />
    </div>
  </div>;
}

function Kart({ ikon, baslik, deger, alt }: { ikon: string; baslik: string; deger: string; alt: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">{ikon}</div><div className="min-w-0"><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">{baslik}</div><div className="mt-1 truncate text-xl font-black text-slate-900">{deger}</div><div className="mt-0.5 truncate text-[10px] text-slate-400">{alt}</div></div></div></div>;
}
