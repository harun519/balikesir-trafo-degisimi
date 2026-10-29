"use client";
import {normalizeTrafoRecord,MONTHS} from "./record-validation";
import CentralPasswordChange from "./CentralPasswordChange";

import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./supabaseClient";
import { createPortal } from "react-dom";
import ExcelJS from "exceljs";
import { saveRecordReportPdf } from "./record-report-pdf";

const AYLAR = ["OCAK","ŞUBAT","MART","NİSAN","MAYIS","HAZİRAN","TEMMUZ","AĞUSTOS","EYLÜL","EKİM","KASIM","ARALIK"];

const ILCE_SECENEKLERI = ["BALYA","İVRİNDİ","SAVAŞTEPE","SINDIRGI","BİGADİÇ","DURSUNBEY","KEPSUT","SUSURLUK","ALTIEYLÜL","KARESİ"];
const KONUM_TRAFO_TIPLERI = ["DİREK","BİNA"];
const GUC_SECENEKLERI = ["25","40","50","63","80","100","125","160","200","250","315","400","500","630","800","1000","1250","1600","2500","5000","6300","10000"];
const GERILIM_SECENEKLERI = ["6,3/0,4","34,5/0,4","34,5/6,3"];
const MARKA_SECENEKLERI = ["ABB","AEG-ETİ","ALSTOM","ANKARA","AREVA","ASTOR","ATLAS","AZP","BESE","BEST","BETA","BEZ","DTS","ELEKTROMEKANİK","ELEKTROSAN","ELKİMA","ELTAŞ","EREN","ESAŞ","ESİTAŞ","ETİKETSİZ","ETİTAŞ","KAPLAN","MAKSAN","MEKSAN","MMS AŞ","ÖZÇELİK","ÖZGÜNEY","ÖZTRAFO","SEM","SÖNMEZ","STS","TİMSAN","TRAFOSAN","TRANSTEK","TEK TRAFO","MERLİNGERİN","DELFİN","NİLKAR","ELKT.MECANİCA","EFACEC","EKOS ELECTRİC","EUROPOWER","---"];
const TRAFO_TIP_SECENEKLERI = ["GEN.DEPOLU","HERMETİK","KURU TİP","DÖKME REÇİNELİ"];
const NEDENLER = [
  { ad: "ARIZA", renk: "#ef4444" },
  { ad: "DÖNÜŞÜM", renk: "#3b82f6" },
  { ad: "GÜÇ DEĞİŞİMİ", renk: "#84cc16" },
  { ad: "TRAFO İPTAL", renk: "#38bdf8" },
  { ad: "YATIRIM", renk: "#facc15" },
  { ad: "YENİ TESİS", renk: "#22d3ee" },
  { ad: "ARIZA RİSKİ", renk: "#fb7185" },
  { ad: "KISMİ ARIZALI", renk: "#f97316" },
];
const BU_YIL = new Date().getFullYear();
const YIL_SECENEKLERI = Array.from({ length: Math.max(BU_YIL + 2, 2026) - 2017 + 1 }, (_, i) => String(2017 + i));

const ANALIZ_SAYFALARI = {
  "neden-guc-analizi": {baslik:"Neden × Güç Analizi",aciklama:"Değişim nedenleri ile güç geçişlerini birlikte inceleyin."},
  "ilce-analizi": {baslik:"İlçe Analizi",aciklama:"İlçelere göre trafo değişimlerinin dağılımı."},
  "trafo-guc-analizi": {baslik:"Trafo Güç Analizi",aciklama:"Sökülen ve takılan trafo güçlerini karşılaştırın."},
} as const;
type AnalizSayfa = keyof typeof ANALIZ_SAYFALARI;
type Sayfa = "dashboard" | "yeni" | "kayitlar" | "veri-kalite" | "yedekleme" | "loglar" | "markalar" | AnalizSayfa;
type TrafoMarkasi = { id:number; ad:string; aktif:boolean; sira:number; created_at?:string; updated_at?:string; };
type KullaniciRolu = "admin" | "editor" | "viewer";
type AuditLog = { id:number; table_name:string; record_id:number|null; action:"INSERT"|"UPDATE"|"DELETE"; user_id:string|null; user_email:string|null; old_data:Record<string,unknown>|null; new_data:Record<string,unknown>|null; created_at:string; };
type ListeFiltreleri = { yil?:string; ay?:string; ilce?:string; neden?:string; arama?:string; baslangic?:string; bitis?:string; };
type FavoriFiltre = { id:string; ad:string; filtre:ListeFiltreleri; };
type ExcelOnizleme = { dosyaAdi:string; kayitlar:Record<string,unknown>[]; hatalar:string[]; };

type TrafoKaydi = {
  id:number; sira_no:number|null; yil:number|null; ay:string|null; ilce:string|null; mahalle:string|null; tr:string|null;
  lokasyon_id:string|null; trafo_id:string|null; trafo_tipi:string|null;
  sokulen_gucu:string|null; sokulen_gerilim:string|null; sokulen_markasi:string|null; sokulen_seri_no:string|null; sokulen_imal_yili:string|null;
  sokulen_trafo_tipi:string|null; sokulen_tamir_yili:string|null; sokulen_tamir_firmasi:string|null; sokulen_yuklenici:string|null;
  takilan_gucu:string|null; takilan_gerilim:string|null; takilan_markasi:string|null; takilan_seri_no:string|null; takilan_imal_yili:string|null;
  takilan_trafo_tipi:string|null; takilan_tamir_yili:string|null; takilan_tamir_firmasi:string|null;
  tarih:string|null; degisim_nedeni:string|null; aciklama:string|null; created_at?:string; updated_at?:string;
};
type FormData = {
  yil:string; ay:string; ilce:string; mahalle:string; tr:string; lokasyon_id:string; trafo_id:string; trafo_tipi:string;
  sokulen_gucu:string; sokulen_gerilim:string; sokulen_markasi:string; sokulen_seri_no:string; sokulen_imal_yili:string; sokulen_trafo_tipi:string;
  sokulen_tamir_yili:string; sokulen_tamir_firmasi:string; sokulen_yuklenici:string;
  takilan_gucu:string; takilan_gerilim:string; takilan_markasi:string; takilan_seri_no:string; takilan_imal_yili:string; takilan_trafo_tipi:string;
  takilan_tamir_yili:string; takilan_tamir_firmasi:string; tarih:string; degisim_nedeni:string; aciklama:string;
};

const BOS_FORM: FormData = {
  yil:"",ay:"",ilce:"",mahalle:"",tr:"",lokasyon_id:"",trafo_id:"",trafo_tipi:"",
  sokulen_gucu:"",sokulen_gerilim:"",sokulen_markasi:"",sokulen_seri_no:"",sokulen_imal_yili:"",sokulen_trafo_tipi:"",
  sokulen_tamir_yili:"",sokulen_tamir_firmasi:"",sokulen_yuklenici:"",
  takilan_gucu:"",takilan_gerilim:"",takilan_markasi:"",takilan_seri_no:"",takilan_imal_yili:"",takilan_trafo_tipi:"",
  takilan_tamir_yili:"",takilan_tamir_firmasi:"",tarih:"",degisim_nedeni:"",aciklama:"",
};

const inputSinif="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

// MAP_HISTORY_COMPACT_FIX_20260924
// NEW_RECORD_STEPPER_LAYOUT_FIX_20260924
const TRAFO_BRAND_CACHE_KEY="trafo_markalari_cache_v1";
const TRAFO_CACHE_KEY="trafo_degisim_cache_v1";
const TRAFO_CACHE_TIME_KEY="trafo_degisim_cache_time_v1";
const TRAFO_ROLE_CACHE_KEY="trafo_user_role_cache_v1";
const TRAFO_ROLE_CACHE_TTL=60*1000;
type SistemYedekDosyasi={name:string;created_at:string|null;updated_at:string|null;size:number;url:string};
export default function Home() {
  const supabase = useMemo(getSupabaseBrowserClient, []);

  const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [session,setSession]=useState<Session|null>(null); const [authKontrol,setAuthKontrol]=useState(true);
  const [girisYukleniyor,setGirisYukleniyor]=useState(false); const [authHata,setAuthHata]=useState("");
  const [misafirModu,setMisafirModu]=useState(false);
  const [sifreSifirlamaModu,setSifreSifirlamaModu]=useState(false);
  const [yeniSifre,setYeniSifre]=useState("");
  const [yeniSifreTekrar,setYeniSifreTekrar]=useState("");
  const [sifreMesaj,setSifreMesaj]=useState("");
  const [sifreIslem,setSifreIslem]=useState(false);
  const [sayfa,setSayfa]=useState<Sayfa>("dashboard");
  const [kayitlar,setKayitlar]=useState<TrafoKaydi[]>([]);
  const [manuelGuncelleniyor,setManuelGuncelleniyor]=useState(false);
  const [sonManuelGuncelleme,setSonManuelGuncelleme]=useState("");
  const [veriYukleniyor,setVeriYukleniyor]=useState(false); const [genelHata,setGenelHata]=useState(""); const [basariMesaji,setBasariMesaji]=useState("");
  const [mobilMenuAcik,setMobilMenuAcik]=useState(false); const [detayKayit,setDetayKayit]=useState<TrafoKaydi|null>(null);
  const [form,setForm]=useState<FormData>(BOS_FORM); const [duzenlenenId,setDuzenlenenId]=useState<number|null>(null); const [kaydediliyor,setKaydediliyor]=useState(false); const [formAdim,setFormAdim]=useState(1);
  const [arama,setArama]=useState(""); const [filtreYil,setFiltreYil]=useState(""); const [filtreAy,setFiltreAy]=useState(""); const [filtreNeden,setFiltreNeden]=useState("");
  const [filtreIlce,setFiltreIlce]=useState(""); const [filtreBaslangic,setFiltreBaslangic]=useState(""); const [filtreBitis,setFiltreBitis]=useState("");
  const [dashboardYil,setDashboardYil]=useState(""); const [dashboardIlce,setDashboardIlce]=useState("");
  const [dashboardBaslangic,setDashboardBaslangic]=useState(""); const [dashboardBitis,setDashboardBitis]=useState("");
  const [kullaniciRolu,setKullaniciRolu]=useState<KullaniciRolu>("viewer");
  const [yetkiHazir,setYetkiHazir]=useState(false);
  const [auditLoglar,setAuditLoglar]=useState<AuditLog[]>([]);
  const [trafoMarkalari,setTrafoMarkalari]=useState<TrafoMarkasi[]>([]);
  const [markaYuklendi,setMarkaYuklendi]=useState(false);
  const [markaYukleniyor,setMarkaYukleniyor]=useState(false);
  const [markaHata,setMarkaHata]=useState("");
  const [markaArama,setMarkaArama]=useState("");
  const [markaDurum,setMarkaDurum]=useState("");
  const [markaSayfa,setMarkaSayfa]=useState(1);
  const markaIstek=useRef(false);
  const markaSahibi=useRef<string|undefined>(undefined);
  const [markaYeniAd,setMarkaYeniAd]=useState("");
  const [markaDuzenlenenId,setMarkaDuzenlenenId]=useState<number|null>(null);
  const [markaDuzenlenenAd,setMarkaDuzenlenenAd]=useState("");
  const [markaIslem,setMarkaIslem]=useState(false);
  const [mahalleSecenekleri,setMahalleSecenekleri]=useState<string[]>([]);
  const [mahalleYukleniyor,setMahalleYukleniyor]=useState(false);
  const [mahalleHata,setMahalleHata]=useState("");
  const [logArama,setLogArama]=useState(""); const [gecmisKayit,setGecmisKayit]=useState<TrafoKaydi|null>(null);
  const [gecmisKapsami,setGecmisKapsami]=useState<"asset"|"location">("location");
  const [auditMore,setAuditMore]=useState(false);
  const [formHatalari,setFormHatalari]=useState<string[]>([]);
  const [dashboardHizliFiltre,setDashboardHizliFiltre]=useState<
    ""|"bu-yil"|"son30"|"ariza"|"donusum"|"guc-degisimi"|"trafo-iptal"|"yatirim"|"yeni-tesis"|"ariza-riski"|"kismi-arizali"|"guc-artisi"|"guc-azalisi"|"ayni-guc"|"tarihi-bos"
  >("");
  const [yoneticiOzetiAcik,setYoneticiOzetiAcik]=useState(false);
  const [acikIlce,setAcikIlce]=useState<string|null>(null);
  const analizSayfasi=ANALIZ_SAYFALARI[sayfa as AnalizSayfa];
  const genelGorunum=sayfa==="dashboard"||!!analizSayfasi;
  const [csvYukleniyor,setCsvYukleniyor]=useState(false);
  const [genelArama,setGenelArama]=useState("");
  const [genelAramaAcik,setGenelAramaAcik]=useState(false);
  const [yedekHazirlaniyor,setYedekHazirlaniyor]=useState(false);
  const [sunucuYedekleniyor,setSunucuYedekleniyor]=useState(false);
  const [sistemYedekleri,setSistemYedekleri]=useState<SistemYedekDosyasi[]>([]);
  const [yedekListesiYukleniyor,setYedekListesiYukleniyor]=useState(false);
  const [sunucuYedekHata,setSunucuYedekHata]=useState("");
  const [taslakVar,setTaslakVar]=useState(false);
  const [kontrolOnayi,setKontrolOnayi]=useState(false);
  const [favoriFiltreler,setFavoriFiltreler]=useState<FavoriFiltre[]>([]);
  const [seciliKayitlar,setSeciliKayitlar]=useState<number[]>([]);
  const [topluAlan,setTopluAlan]=useState<"ilce"|"degisim_nedeni"|"ay"|"yil">("ilce");
  const [topluDeger,setTopluDeger]=useState("");
  const [topluGuncelleniyor,setTopluGuncelleniyor]=useState(false);
  const [excelOnizleme,setExcelOnizleme]=useState<ExcelOnizleme|null>(null);
  const [excelIceAktariliyor,setExcelIceAktariliyor]=useState(false);

  const [acikAnalizler,setAcikAnalizler]=useState<Record<string,boolean>>({
    "degisim-nedenleri":true,
    "zaman-analizi":true,
    "neden-guc-analizi":true,
    "ilce-analizi":true,
    "trafo-guc-analizi":true,
  });

  const duzenleyebilir=!!session&&(kullaniciRolu==="admin"||kullaniciRolu==="editor");
  const silebilir=!!session&&kullaniciRolu==="admin";
  const yonetici=!!session&&kullaniciRolu==="admin";

  useEffect(() => {
    const fn=(e:KeyboardEvent)=>{ if(e.key==="Escape"){ if(gecmisKayit) setGecmisKayit(null); else if(detayKayit) setDetayKayit(null); else setMobilMenuAcik(false); } };
    window.addEventListener("keydown",fn); return()=>window.removeEventListener("keydown",fn);
  },[detayKayit,gecmisKayit]);

  useEffect(()=>{
    try{
      const t=localStorage.getItem("trafo_yeni_kayit_taslak");
      setTaslakVar(!!t);
      const f=localStorage.getItem("trafo_favori_filtreler");
      if(f){
        const arr=JSON.parse(f);
        if(Array.isArray(arr))setFavoriFiltreler(arr);
      }
    }catch{}
  },[]);

  useEffect(()=>{
    if(sayfa!=="yeni"||duzenlenenId)return;
    const dolu=Object.values(form).some(v=>String(v||"").trim());
    try{
      if(dolu){localStorage.setItem("trafo_yeni_kayit_taslak",JSON.stringify({form,formAdim,updatedAt:new Date().toISOString()}));setTaslakVar(true);}
    }catch{}
  },[form,formAdim,sayfa,duzenlenenId]);

  useEffect(()=>{
    let iptal=false;
    async function mahalleleriYukle(){
      const ilce=form.ilce.trim();
      if(!ilce){setMahalleSecenekleri([]);setMahalleHata("");setMahalleYukleniyor(false);return;}
      setMahalleYukleniyor(true);setMahalleHata("");
      const kayitMahalleleri=Array.from(new Set(kayitlar.filter(k=>norm(k.ilce)===norm(ilce)).map(k=>k.mahalle?.trim().toLocaleUpperCase("tr-TR")).filter(Boolean) as string[]));
      try{
        const r=await fetch(`/api/mahalleler?ilce=${encodeURIComponent(ilce)}`,{cache:"no-store"});
        const j=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(j?.error||"Mahalleler alınamadı.");
        const apiMahalleleri=Array.isArray(j?.mahalleler)?j.mahalleler.map((x:unknown)=>String(x).trim().toLocaleUpperCase("tr-TR")).filter(Boolean):[];
        const birlesik=Array.from(new Set([...apiMahalleleri,...kayitMahalleleri])).sort((a,b)=>a.localeCompare(b,"tr"));
        if(!iptal)setMahalleSecenekleri(birlesik);
      }catch{
        if(!iptal){
          setMahalleSecenekleri(kayitMahalleleri.sort((a,b)=>a.localeCompare(b,"tr")));
          setMahalleHata("");
        }
      }finally{if(!iptal)setMahalleYukleniyor(false);}
    }
    mahalleleriYukle();
    return()=>{iptal=true;};
  },[form.ilce,kayitlar]);

  useEffect(()=>{
    if(sayfa==="yedekleme"&&yonetici&&session)sistemYedekleriniGetir();
  },[sayfa,yonetici,session?.access_token]);

  useEffect(()=>{
    const fn=(e:KeyboardEvent)=>{
      const el=e.target as HTMLElement|null;
      const yaziyor=!!el&&(["INPUT","TEXTAREA","SELECT"].includes(el.tagName)||el.isContentEditable);
      if(yaziyor)return;
      if(e.key==="/"){e.preventDefault();setGenelAramaAcik(true);setTimeout(()=>document.querySelector<HTMLInputElement>('input[placeholder*="Kayıt, trafo"]')?.focus(),0);}
      if(e.key.toLowerCase()==="n"&&duzenleyebilir){e.preventDefault();formTemizle();sayfayaGit("yeni");}
      if(e.key.toLowerCase()==="k"){e.preventDefault();sayfayaGit("kayitlar");}
    };
    window.addEventListener("keydown",fn);
    return ()=>window.removeEventListener("keydown",fn);
  },[duzenleyebilir]);





  useEffect(() => {
    if(!supabase){setAuthHata("Supabase bağlantısı kurulamadı.");setAuthKontrol(false);return;}
    let aktif=true;
    const beklemeSiniri=window.setTimeout(()=>{
      if(aktif)setAuthKontrol(false);
    },2500);
    void supabase.auth.getSession()
      .then(({data})=>{
        if(!aktif)return;
        setSession(data.session);
        if(data.session)setMisafirModu(false);
        setAuthKontrol(false);
      })
      .catch(()=>{
        if(aktif)setAuthKontrol(false);
      })
      .finally(()=>window.clearTimeout(beklemeSiniri));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,s)=>{
      if(!aktif)return;
      window.clearTimeout(beklemeSiniri);
      setSession(s);
      if(s)setMisafirModu(false);
      if(event==="PASSWORD_RECOVERY"){
        setSifreSifirlamaModu(true);
        setSifreMesaj("");
      }
      setAuthKontrol(false);
    });
    return()=>{aktif=false;window.clearTimeout(beklemeSiniri);subscription.unsubscribe();};
  },[supabase]);

  useEffect(()=>{
    try{
      const v=JSON.parse(localStorage.getItem(TRAFO_CACHE_KEY)||"[]");
      if(Array.isArray(v))setKayitlar(v as TrafoKaydi[]);
      setSonManuelGuncelleme(localStorage.getItem(TRAFO_CACHE_TIME_KEY)||"");
    }catch{}
  },[]);

  // Manuel senkron: uygulama açılışında iş verileri Supabase’den otomatik okunmaz.
  // Son alınan kayıtlar cihaz önbelleğinden gösterilir; merkezden okuma kullanıcı isteğiyle yapılır.
  useEffect(()=>{
    setYetkiHazir(false);
    if(session){void kullaniciProfiliniGetir();}
    else{setKullaniciRolu("viewer");setAuditLoglar([]);}
  },[session]);

  async function kullaniciProfiliniGetir(){
    if(!supabase||!session)return;
    try{
      const raw=localStorage.getItem(TRAFO_ROLE_CACHE_KEY);
      const cached=raw?JSON.parse(raw):null;
      if(cached?.userId===session.user.id&&Date.now()-Number(cached.cachedAt||0)<TRAFO_ROLE_CACHE_TTL&&["admin","editor","viewer"].includes(String(cached.role))){
        setKullaniciRolu(cached.role as KullaniciRolu);
        setYetkiHazir(true);
        return;
      }
    }catch{}
    const {data,error}=await supabase.from("app_users").select("id,email,role,created_at,updated_at").eq("id",session.user.id).maybeSingle();
    const rol=data?.role;
    if(error||!data||!["admin","editor","viewer"].includes(String(rol))){
      setYetkiHazir(false);
      setKullaniciRolu("viewer");
      setAuthHata("Bu kullanıcıya Trafo Değişimi erişimi tanımlı değil. Portal Kullanıcı Yönetimi üzerinden yetki verilmelidir.");
      await supabase.auth.signOut();
      return;
    }
    setKullaniciRolu(rol as KullaniciRolu);
    setYetkiHazir(true);
    try{localStorage.setItem(TRAFO_ROLE_CACHE_KEY,JSON.stringify({userId:session.user.id,role:rol,cachedAt:Date.now()}));}catch{}
  }
  useEffect(()=>{
    markaSahibi.current=session?.user.id;
    setTrafoMarkalari([]);setMarkaYuklendi(false);setMarkaHata("");
  },[session?.user.id]);
  useEffect(()=>{
    if(!session||!yetkiHazir||!(sayfa==="markalar"||sayfa==="yeni")||markaYuklendi||markaIstek.current)return;
    try{
      const cached=JSON.parse(localStorage.getItem(TRAFO_BRAND_CACHE_KEY)||"null");
      if(cached?.userId===session.user.id&&Date.now()-cached.cachedAt<24*60*60*1000&&Array.isArray(cached.rows)&&cached.rows.every((m:TrafoMarkasi)=>typeof m.id==="number"&&typeof m.ad==="string"&&typeof m.aktif==="boolean")){
        setTrafoMarkalari(cached.rows);setMarkaYuklendi(true);return;
      }
    }catch{}
    void trafoMarkalariniGetir();
  },[session?.user.id,yetkiHazir,sayfa,markaYuklendi]);
  useEffect(()=>{if(!session)return;const refresh=()=>{void kullaniciProfiliniGetir();};window.addEventListener("focus",refresh);return()=>window.removeEventListener("focus",refresh);},[session?.user.id]);
  async function trafoMarkalariniGetir(){
    if(!supabase||!session||markaIstek.current)return;
    const owner=session.user.id;
    markaIstek.current=true;setMarkaYukleniyor(true);setMarkaHata("");
    try{
      const {data,error}=await supabase.from("trafo_markalari").select("id,ad,aktif,sira,created_at,updated_at").order("sira",{ascending:true}).order("ad",{ascending:true});
      if(markaSahibi.current!==owner)return;
      if(error)throw error;
      const rows=(data||[]) as TrafoMarkasi[];
      setTrafoMarkalari(rows);
      try{localStorage.setItem(TRAFO_BRAND_CACHE_KEY,JSON.stringify({userId:owner,cachedAt:Date.now(),rows}));}catch{}
    }catch{if(markaSahibi.current===owner)setMarkaHata("Markalar yüklenemedi. Bağlantınızı kontrol edip Yenile düğmesini kullanın.");}
    finally{markaIstek.current=false;setMarkaYukleniyor(false);if(markaSahibi.current===owner)setMarkaYuklendi(true);}
  }
  async function trafoMarkasiEkle(){
    if(!supabase||!yonetici||!markaYeniAd.trim())return;
    const ad=markaYeniAd.trim().toLocaleUpperCase("tr-TR");
    if(trafoMarkalari.some(m=>m.ad.trim().toLocaleUpperCase("tr-TR")===ad)){setMarkaHata("Bu marka zaten mevcut.");return;}
    setMarkaIslem(true);setGenelHata("");setMarkaHata("");
    const sira=(trafoMarkalari.reduce((m,x)=>Math.max(m,Number(x.sira||0)),0)||0)+10;
    const {error}=await supabase.from("trafo_markalari").insert({ad,aktif:true,sira});
    if(error)setGenelHata("Marka eklenemedi: "+error.message);
    else{setMarkaYeniAd("");await trafoMarkalariniGetir();setBasariMesaji("Trafo markası eklendi.");setTimeout(()=>setBasariMesaji(""),2500);}
    setMarkaIslem(false);
  }
  async function trafoMarkasiGuncelle(id:number){
    if(!supabase||!yonetici||!markaDuzenlenenAd.trim())return;
    setMarkaIslem(true);setGenelHata("");
    const ad=markaDuzenlenenAd.trim().toLocaleUpperCase("tr-TR");
    if(trafoMarkalari.some(m=>m.id!==id&&m.ad.trim().toLocaleUpperCase("tr-TR")===ad)){setMarkaHata("Bu marka zaten mevcut.");setMarkaIslem(false);return;}
    const {error}=await supabase.from("trafo_markalari").update({ad,updated_at:new Date().toISOString()}).eq("id",id);
    if(error)setGenelHata("Marka güncellenemedi: "+error.message);
    else{setMarkaDuzenlenenId(null);setMarkaDuzenlenenAd("");await trafoMarkalariniGetir();setBasariMesaji("Trafo markası güncellendi.");setTimeout(()=>setBasariMesaji(""),2500);}
    setMarkaIslem(false);
  }
  async function trafoMarkasiAktiflikDegistir(m:TrafoMarkasi){
    if(!supabase||!yonetici)return;
    setMarkaIslem(true);setGenelHata("");
    const {error}=await supabase.from("trafo_markalari").update({aktif:!m.aktif,updated_at:new Date().toISOString()}).eq("id",m.id);
    if(error)setGenelHata("Marka durumu değiştirilemedi: "+error.message);
    else await trafoMarkalariniGetir();
    setMarkaIslem(false);
  }
  useEffect(()=>{if(sayfa==="loglar"&&yonetici)void auditLoglariGetir();},[sayfa,yonetici]);
  async function auditLoglariGetir(older=false){
    if(!supabase)return;
    const offset=older?auditLoglar.length:0;const {data,error}=await supabase.from("trafo_audit_log").select("*").order("created_at",{ascending:false}).order("id",{ascending:false}).range(offset,offset+99);if(error){setGenelHata(error.message);return;}
    setAuditMore((data||[]).length===100);setAuditLoglar(old=>older?[...old,...(data||[]) as AuditLog[]]:(data||[]) as AuditLog[]);
  }
async function kayitlariGetir(){
    if(!supabase)return false;
    setVeriYukleniyor(true); setGenelHata("");
    const data:TrafoKaydi[]=[];let error:any=null;
    for(let offset=0;;offset+=500){const page=await supabase.from("trafo_degisim").select("*").order("tarih",{ascending:false,nullsFirst:false}).order("id",{ascending:false}).range(offset,offset+499);if(page.error){error=page.error;break;}data.push(...(page.data||[]) as TrafoKaydi[]);if((page.data||[]).length<500)break;}
    if(error){setGenelHata("Kayıtlar yüklenemedi: "+error.message);setVeriYukleniyor(false);return false;}
    const liste=(data||[]) as TrafoKaydi[];
    setKayitlar(liste);
    const simdi=new Date().toISOString();
    setSonManuelGuncelleme(simdi);
    try{
      localStorage.setItem(TRAFO_CACHE_KEY,JSON.stringify(liste));
      localStorage.setItem(TRAFO_CACHE_TIME_KEY,simdi);
    }catch{}
    window.dispatchEvent(new CustomEvent("trafo-manuel-veri-guncellendi",{detail:{kayitlar:liste,updatedAt:simdi}}));
    setVeriYukleniyor(false);
    return true;
  }

  async function manuelVerileriGuncelle(){
    if(!session||!yetkiHazir||manuelGuncelleniyor)return;
    setManuelGuncelleniyor(true);setGenelHata("");setBasariMesaji("");
    try{
      const ok=await kayitlariGetir();
      if(!ok)return;
      const ekIslemler:Promise<unknown>[]=[trafoMarkalariniGetir()];
      if(yonetici&&sayfa==="loglar")ekIslemler.push(auditLoglariGetir());
      await Promise.allSettled(ekIslemler);
      setBasariMesaji("Merkezi veriler güncellendi.");
      setTimeout(()=>setBasariMesaji(""),2500);
    }finally{setManuelGuncelleniyor(false);}
  }

  async function girisYap(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); if(!supabase)return; setGirisYukleniyor(true);setAuthHata("");
    const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
    if(error)setAuthHata("E-posta veya şifre hatalı."); setGirisYukleniyor(false);
  }
  async function sifremiUnuttum(){
    if(!supabase)return;
    const temizEmail=email.trim();
    if(!temizEmail){
      setAuthHata("Önce e-posta adresinizi yazın.");
      return;
    }
    setSifreIslem(true);
    setAuthHata("");
    setSifreMesaj("");
    const redirectTo=typeof window!=="undefined"?window.location.origin:"";
    const {error}=await supabase.auth.resetPasswordForEmail(temizEmail,{redirectTo});
    if(error){
      setAuthHata(error.message);
    }else{
      setSifreMesaj("Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Gelen kutunuzu ve spam klasörünü kontrol edin.");
    }
    setSifreIslem(false);
  }

  async function yeniSifreyiKaydet(){
    if(!supabase)return;
    if(yeniSifre.length<6){
      setSifreMesaj("Yeni şifreniz en az 6 karakter olmalıdır.");
      return;
    }
    if(yeniSifre!==yeniSifreTekrar){
      setSifreMesaj("Girdiğiniz iki şifre aynı değil.");
      return;
    }
    setSifreIslem(true);
    setSifreMesaj("");
    const {error}=await supabase.auth.updateUser({password:yeniSifre});
    if(error){
      setSifreMesaj("Şifre değiştirilemedi: "+error.message);
      setSifreIslem(false);
      return;
    }
    setYeniSifre("");
    setYeniSifreTekrar("");
    setSifreSifirlamaModu(false);
    setSifreMesaj("");
    window.alert("Şifreniz başarıyla değiştirildi. Yeni şifrenizle giriş yapabilirsiniz.");
    await supabase.auth.signOut();
    setSession(null);
    setEmail("");
    setPassword("");
    setSifreIslem(false);
  }

  function misafirGirisi(){
    setAuthHata("");
    setMisafirModu(true);
    setSession(null);
    setSayfa("dashboard");
    setMobilMenuAcik(false);
  }

  async function cikisYap(){
    if(!supabase)return;
    if(session) await supabase.auth.signOut();
    setSession(null);
    setMisafirModu(false);
    setSayfa("dashboard");
    setEmail("");
    setPassword("");
    setMobilMenuAcik(false);
  }
  useEffect(()=>{
    const fromMap=(event:Event)=>{
      if(!duzenleyebilir)return;
      const data=(event as CustomEvent).detail||{};if(!data.lokasyonId)return;
      setForm({...BOS_FORM,ilce:String(data.ilce||"").toLocaleUpperCase("tr-TR"),mahalle:String(data.mahalle||""),tr:String(data.tr||""),lokasyon_id:String(data.lokasyonId),trafo_id:String(data.trafoId||""),trafo_tipi:String(data.trafoTipi||"")});
      setDuzenlenenId(null);setFormAdim(1);setKontrolOnayi(false);setFormHatalari([]);setSayfa("yeni");setMobilMenuAcik(false);
      if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});
      window.dispatchEvent(new Event("trafo-harita-kapat"));window.scrollTo({top:0,behavior:"instant"});
    };
    window.addEventListener("trafo-harita-yeni-kayit",fromMap);return()=>window.removeEventListener("trafo-harita-yeni-kayit",fromMap);
  },[duzenleyebilir]);

  function sayfayaGit(s:Sayfa){
    if((s==="loglar"||s==="markalar")&&!yonetici)return;
    if(s==="yeni"&&!duzenleyebilir)return;
    setSayfa(s);setMobilMenuAcik(false);window.scrollTo({top:0,behavior:"instant"});
  }
  function kayitListesineGit(f:ListeFiltreleri={}){
    setArama(f.arama||"");setFiltreYil(f.yil||"");setFiltreAy(f.ay||"");setFiltreIlce(f.ilce||"");setFiltreNeden(f.neden||"");setFiltreBaslangic(f.baslangic||"");setFiltreBitis(f.bitis||"");
    setSayfa("kayitlar");setMobilMenuAcik(false);window.scrollTo({top:0,behavior:"smooth"});
  }
  function bolumeGit(id:AnalizSayfa){
    setAcikAnalizler(eski=>({...eski,[id]:true}));
    sayfayaGit(id);
  }
  function analizAcKapa(id:string){setAcikAnalizler(eski=>({...eski,[id]:!eski[id]}));}
  function formDegistir(a:keyof FormData,v:string){
    setForm(x=>{
      const yeni={...x,[a]:v};
      if(a==="tarih"&&v){const [yy,mm]=v.split("-");const mi=Number(mm)-1;if(yy)yeni.yil=yy;if(mi>=0&&mi<12)yeni.ay=AYLAR[mi];}
      return yeni;
    });
    if(formHatalari.length)setFormHatalari([]);
  }
  function formTemizle(){setForm(BOS_FORM);setDuzenlenenId(null);setFormHatalari([]);setFormAdim(1);setKontrolOnayi(false);}
  function taslakYukle(){
    try{
      const raw=localStorage.getItem("trafo_yeni_kayit_taslak");
      if(!raw)return;
      const x=JSON.parse(raw);
      if(x?.form){const eskiAdim=Number(x.formAdim)||1;setForm({...BOS_FORM,...x.form});setFormAdim(eskiAdim<=1?1:eskiAdim<=3?2:3);setTaslakVar(true);setBasariMesaji("Taslak geri yüklendi.");setTimeout(()=>setBasariMesaji(""),2500);}
    }catch{setGenelHata("Taslak okunamadı.");}
  }
  function taslakSil(){
    try{localStorage.removeItem("trafo_yeni_kayit_taslak");}catch{}
    setTaslakVar(false);
  }

  function kaydiKopyala(k:TrafoKaydi){
    if(!duzenleyebilir)return;
    setDetayKayit(null);
    setForm({
      yil:k.yil?String(k.yil):"",ay:k.ay||"",ilce:k.ilce||"",mahalle:k.mahalle||"",tr:k.tr||"",lokasyon_id:k.lokasyon_id||"",trafo_id:k.trafo_id||"",trafo_tipi:k.trafo_tipi||"",
      sokulen_gucu:k.sokulen_gucu||"",sokulen_gerilim:k.sokulen_gerilim||"",sokulen_markasi:k.sokulen_markasi||"",sokulen_seri_no:"",sokulen_imal_yili:k.sokulen_imal_yili||"",sokulen_trafo_tipi:k.sokulen_trafo_tipi||"",sokulen_tamir_yili:k.sokulen_tamir_yili||"",sokulen_tamir_firmasi:k.sokulen_tamir_firmasi||"",sokulen_yuklenici:k.sokulen_yuklenici||"",
      takilan_gucu:k.takilan_gucu||"",takilan_gerilim:k.takilan_gerilim||"",takilan_markasi:k.takilan_markasi||"",takilan_seri_no:"",takilan_imal_yili:k.takilan_imal_yili||"",takilan_trafo_tipi:k.takilan_trafo_tipi||"",takilan_tamir_yili:k.takilan_tamir_yili||"",takilan_tamir_firmasi:k.takilan_tamir_firmasi||"",
      tarih:"",degisim_nedeni:k.degisim_nedeni||"",aciklama:k.aciklama||"",
    });
    setDuzenlenenId(null);setFormAdim(1);sayfayaGit("yeni");
    setBasariMesaji("Kayıt kopyalandı. Tarih ve seri numaralarını kontrol edin.");setTimeout(()=>setBasariMesaji(""),3500);
  }

  function favoriFiltreKaydet(){
    const ad=window.prompt("Bu filtreye bir isim verin:");
    if(!ad?.trim())return;
    const item:FavoriFiltre={id:`f-${Date.now()}`,ad:ad.trim(),filtre:{yil:filtreYil,ay:filtreAy,ilce:filtreIlce,neden:filtreNeden,arama,baslangic:filtreBaslangic,bitis:filtreBitis}};
    const next=[...favoriFiltreler,item].slice(-12);
    setFavoriFiltreler(next);
    try{localStorage.setItem("trafo_favori_filtreler",JSON.stringify(next));}catch{}
  }
  function favoriFiltreUygula(f:FavoriFiltre){
    setFiltreYil(f.filtre.yil||"");setFiltreAy(f.filtre.ay||"");setFiltreIlce(f.filtre.ilce||"");setFiltreNeden(f.filtre.neden||"");setArama(f.filtre.arama||"");setFiltreBaslangic(f.filtre.baslangic||"");setFiltreBitis(f.filtre.bitis||"");
  }
  function favoriFiltreSil(id:string){
    const next=favoriFiltreler.filter(x=>x.id!==id);setFavoriFiltreler(next);
    try{localStorage.setItem("trafo_favori_filtreler",JSON.stringify(next));}catch{}
  }

  async function topluKayitGuncelle(){
    if(!supabase||!duzenleyebilir||!seciliKayitlar.length||!topluDeger.trim())return;
    setTopluGuncelleniyor(true);setGenelHata("");
    try{
      if((topluAlan==="yil"||topluAlan==="ay")&&kayitlar.some(k=>seciliKayitlar.includes(k.id)&&k.tarih))throw Error("Tarihi olan kayıtta yıl/ay tarih alanından değiştirilmelidir.");
      const veri:Record<string,unknown>={[topluAlan]:topluAlan==="yil"?Number(topluDeger):topluDeger};
      const {error}=await supabase.from("trafo_degisim").update(veri).in("id",seciliKayitlar);
      if(error)throw error;
      setBasariMesaji(`${seciliKayitlar.length} kayıt toplu güncellendi.`);setSeciliKayitlar([]);setTopluDeger("");
      await kayitlariGetir();if(yonetici&&sayfa==="loglar")await auditLoglariGetir();setTimeout(()=>setBasariMesaji(""),3000);
    }catch(e:any){setGenelHata(e?.message||"Toplu güncelleme başarısız.");}
    finally{setTopluGuncelleniyor(false);}
  }


  async function kaydet(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); if(!supabase)return;
    if(formAdim!==3){setFormAdim(3);setKontrolOnayi(false);return;}
    if(!kontrolOnayi){setGenelHata("Kaydetmeden önce Kontrol & Kaydet ekranındaki kontrol onayını işaretleyin.");return;}
    if(!duzenleyebilir){setGenelHata("Bu işlem için düzenleme yetkiniz yok.");return;}
    const hatalar:string[]=[];
    if(!form.yil)hatalar.push("Yıl");if(!form.ay)hatalar.push("Ay");if(!form.ilce)hatalar.push("İlçe");if(!form.degisim_nedeni)hatalar.push("Değişim Nedeni");
    if(!form.trafo_id&&!form.lokasyon_id&&!form.tr)hatalar.push("Trafo ID / Lokasyon ID / TR alanlarından en az biri");
    if(hatalar.length){
      setFormHatalari(hatalar);
      setGenelHata("Zorunlu alanları kontrol edin: "+hatalar.join(", "));
      const konumHatasi=hatalar.some(h=>["Yıl","Ay","İlçe","Trafo ID / Lokasyon ID / TR alanlarından en az biri"].includes(h));
      setFormAdim(konumHatasi?1:3);
      window.scrollTo({top:0,behavior:"smooth"});
      return;
    }
    setKaydediliyor(true);setGenelHata("");setBasariMesaji("");
    const veri={
      yil:Number(form.yil),ay:form.ay,ilce:form.ilce||null,mahalle:form.mahalle||null,tr:form.tr||null,lokasyon_id:form.lokasyon_id||null,
      trafo_id:form.trafo_id||null,trafo_tipi:form.trafo_tipi||null,sokulen_gucu:form.sokulen_gucu||null,sokulen_gerilim:form.sokulen_gerilim||null,
      sokulen_markasi:form.sokulen_markasi||null,sokulen_seri_no:form.sokulen_seri_no||null,sokulen_imal_yili:form.sokulen_imal_yili||null,
      sokulen_trafo_tipi:form.sokulen_trafo_tipi||null,sokulen_tamir_yili:form.sokulen_tamir_yili||null,sokulen_tamir_firmasi:form.sokulen_tamir_firmasi||null,
      sokulen_yuklenici:form.sokulen_yuklenici||null,takilan_gucu:form.takilan_gucu||null,takilan_gerilim:form.takilan_gerilim||null,
      takilan_markasi:form.takilan_markasi||null,takilan_seri_no:form.takilan_seri_no||null,takilan_imal_yili:form.takilan_imal_yili||null,
      takilan_trafo_tipi:form.takilan_trafo_tipi||null,takilan_tamir_yili:form.takilan_tamir_yili||null,takilan_tamir_firmasi:form.takilan_tamir_firmasi||null,
      tarih:form.tarih||null,degisim_nedeni:form.degisim_nedeni,aciklama:form.aciklama||null,
    };
    const kontrol=normalizeTrafoRecord(veri);if(kontrol.errors.length){setFormHatalari(kontrol.errors);setGenelHata(kontrol.errors.join(" "));setKaydediliyor(false);return;}
    Object.assign(veri,kontrol.value);
    const sonuc=duzenlenenId
      ? await supabase.from("trafo_degisim").update(veri).eq("id",duzenlenenId)
      : await supabase.from("trafo_degisim").insert(veri);
    if(sonuc.error){setGenelHata(sonuc.error.message);setKaydediliyor(false);return;}
    setBasariMesaji(duzenlenenId?"Kayıt başarıyla güncellendi.":"Yeni trafo değişim kaydı başarıyla eklendi.");
    try{localStorage.removeItem("trafo_yeni_kayit_taslak");setTaslakVar(false);}catch{}
    formTemizle();await kayitlariGetir();if(yonetici&&sayfa==="loglar")await auditLoglariGetir();setKaydediliyor(false);setSayfa("kayitlar");window.scrollTo({top:0,behavior:"smooth"});
    setTimeout(()=>setBasariMesaji(""),3000);
  }

  function kaydiDuzenle(k:TrafoKaydi){
    if(!duzenleyebilir){window.alert("Bu kayıt için düzenleme yetkiniz yok.");return;}
    setDetayKayit(null);
    setForm({
      yil:k.yil?String(k.yil):"",ay:k.ay||"",ilce:k.ilce||"",mahalle:k.mahalle||"",tr:k.tr||"",lokasyon_id:k.lokasyon_id||"",trafo_id:k.trafo_id||"",trafo_tipi:k.trafo_tipi||"",
      sokulen_gucu:k.sokulen_gucu||"",sokulen_gerilim:k.sokulen_gerilim||"",sokulen_markasi:k.sokulen_markasi||"",sokulen_seri_no:k.sokulen_seri_no||"",
      sokulen_imal_yili:k.sokulen_imal_yili||"",sokulen_trafo_tipi:k.sokulen_trafo_tipi||"",sokulen_tamir_yili:k.sokulen_tamir_yili||"",
      sokulen_tamir_firmasi:k.sokulen_tamir_firmasi||"",sokulen_yuklenici:k.sokulen_yuklenici||"",takilan_gucu:k.takilan_gucu||"",
      takilan_gerilim:k.takilan_gerilim||"",takilan_markasi:k.takilan_markasi||"",takilan_seri_no:k.takilan_seri_no||"",takilan_imal_yili:k.takilan_imal_yili||"",
      takilan_trafo_tipi:k.takilan_trafo_tipi||"",takilan_tamir_yili:k.takilan_tamir_yili||"",takilan_tamir_firmasi:k.takilan_tamir_firmasi||"",
      tarih:k.tarih||"",degisim_nedeni:k.degisim_nedeni||"",aciklama:k.aciklama||"",
    });
    setDuzenlenenId(k.id);setFormAdim(1);sayfayaGit("yeni");
  }

  async function kaydiSil(k:TrafoKaydi){
    if(!silebilir){window.alert("Kayıt silme işlemi yalnızca yönetici yetkisiyle yapılabilir.");return;}
    if(!supabase||!window.confirm(`${tarihGoster(k.tarih)} tarihli kaydı silmek istediğinize emin misiniz?`))return;
    const {error}=await supabase.from("trafo_degisim").delete().eq("id",k.id);
    if(error){setGenelHata(error.message);return;} setDetayKayit(null);await kayitlariGetir();if(yonetici&&sayfa==="loglar")await auditLoglariGetir();
  }

  const yillar=useMemo(()=>Array.from(new Set(kayitlar.map(k=>k.yil).filter(Boolean) as number[])).sort((a,b)=>b-a),[kayitlar]);
  const ilceler=useMemo(()=>Array.from(new Set([...ILCE_SECENEKLERI,...kayitlar.map(x=>x.ilce?.trim()).filter(Boolean) as string[]])).sort((a,b)=>a.localeCompare(b,"tr")),[kayitlar]);
  const markaSecenekleri=useMemo(()=>{const aktif=trafoMarkalari.filter(x=>x.aktif).map(x=>x.ad);return markaYuklendi&&!markaHata||trafoMarkalari.length?aktif:MARKA_SECENEKLERI;},[trafoMarkalari,markaYuklendi,markaHata]);
  const markaFiltreli=useMemo(()=>trafoMarkalari.filter(m=>(!markaDurum||String(m.aktif)===markaDurum)&&m.ad.toLocaleLowerCase("tr-TR").includes(markaArama.trim().toLocaleLowerCase("tr-TR"))),[trafoMarkalari,markaDurum,markaArama]);
  const markaSayfaSayisi=Math.max(1,Math.ceil(markaFiltreli.length/10));
  const markaGecerliSayfa=Math.min(markaSayfa,markaSayfaSayisi);
  const markaGorunen=markaFiltreli.slice((markaGecerliSayfa-1)*10,markaGecerliSayfa*10);
  const veriKaliteUyarilari=useMemo(()=>{
    const u:string[]=[];
    if(form.tarih&&new Date(form.tarih+"T00:00:00").getTime()>Date.now())u.push("Değişim tarihi gelecekte görünüyor.");
    if(form.tarih&&form.yil&&form.tarih.slice(0,4)!==form.yil)u.push("Tarih ile seçilen yıl uyuşmuyor.");
    if(form.sokulen_seri_no&&form.takilan_seri_no&&norm(form.sokulen_seri_no)===norm(form.takilan_seri_no))u.push("Sökülen ve takılan seri numarası aynı.");
    const diger=kayitlar.filter(k=>k.id!==duzenlenenId);
    if(form.trafo_id&&diger.some(k=>norm(k.trafo_id)===norm(form.trafo_id)&&k.tarih===form.tarih))u.push("Aynı Trafo ID ve tarihte başka kayıt var.");
    if(form.takilan_seri_no&&diger.some(k=>norm(k.takilan_seri_no)===norm(form.takilan_seri_no)))u.push("Takılan seri numarası daha önce kullanılmış.");
    return u;
  },[form,kayitlar,duzenlenenId]);

  const yilKarsilastirma=useMemo(()=>{
    const y=Number(dashboardYil||new Date().getFullYear());
    const simdi=kayitlar.filter(k=>k.yil===y).length, once=kayitlar.filter(k=>k.yil===y-1).length;
    const oran=once?((simdi-once)/once)*100:null;
    return {y,simdi,once,oran};
  },[kayitlar,dashboardYil]);

  const dashboardKayitlari=useMemo(()=>{
    const bugun=new Date();
    const bugunUtc=Date.UTC(bugun.getFullYear(),bugun.getMonth(),bugun.getDate());
    const otuzGunOnce=bugunUtc-29*86400000;
    const guc=(v:string|null)=>{if(!v)return null;const n=Number(v.replace(",",".").replace(/[^0-9.]/g,""));return Number.isFinite(n)?n:null;};

    return kayitlar.filter(k=>{
      if(dashboardYil&&String(k.yil||"")!==dashboardYil)return false;
      if(dashboardIlce&&k.ilce!==dashboardIlce)return false;
      if(dashboardBaslangic&&(!k.tarih||k.tarih<dashboardBaslangic))return false;
      if(dashboardBitis&&(!k.tarih||k.tarih>dashboardBitis))return false;
      if(dashboardHizliFiltre==="bu-yil"&&k.yil!==BU_YIL)return false;

      const nedenFiltreleri:Record<string,string>={
        ariza:"ARIZA",
        donusum:"DÖNÜŞÜM",
        "guc-degisimi":"GÜÇ DEĞİŞİMİ",
        "trafo-iptal":"TRAFO İPTAL",
        yatirim:"YATIRIM",
        "yeni-tesis":"YENİ TESİS",
        "ariza-riski":"ARIZA RİSKİ",
        "kismi-arizali":"KISMİ ARIZALI",
      };

      const seciliNeden=nedenFiltreleri[dashboardHizliFiltre];
      if(seciliNeden&&k.degisim_nedeni!==seciliNeden)return false;

      if(dashboardHizliFiltre==="tarihi-bos"&&k.tarih)return false;

      if(dashboardHizliFiltre==="son30"){
        if(!k.tarih)return false;
        const p=k.tarih.split("-");
        if(p.length!==3)return false;
        const d=Date.UTC(+p[0],+p[1]-1,+p[2]);
        if(d<otuzGunOnce||d>bugunUtc)return false;
      }

      if(dashboardHizliFiltre==="guc-artisi"){
        const s=guc(k.sokulen_gucu),t=guc(k.takilan_gucu);
        if(s===null||t===null||t<=s)return false;
      }

      if(dashboardHizliFiltre==="guc-azalisi"){
        const s=guc(k.sokulen_gucu),t=guc(k.takilan_gucu);
        if(s===null||t===null||t>=s)return false;
      }

      if(dashboardHizliFiltre==="ayni-guc"){
        const s=guc(k.sokulen_gucu),t=guc(k.takilan_gucu);
        if(s===null||t===null||t!==s)return false;
      }

      return true;
    });
  },[kayitlar,dashboardYil,dashboardIlce,dashboardBaslangic,dashboardBitis,dashboardHizliFiltre]);

  const son30Gun=useMemo(()=>{
    const b=new Date(),bu=Date.UTC(b.getFullYear(),b.getMonth(),b.getDate()),once=bu-29*86400000;
    return dashboardKayitlari.filter(k=>{if(!k.tarih)return false;const p=k.tarih.split("-");if(p.length!==3)return false;const d=Date.UTC(+p[0],+p[1]-1,+p[2]);return d>=once&&d<=bu;}).length;
  },[dashboardKayitlari]);

  const nedenSayilari=useMemo(()=>{
    const r:Record<string,number>={};NEDENLER.forEach(n=>r[n.ad]=0);
    dashboardKayitlari.forEach(k=>{if(k.degisim_nedeni&&r[k.degisim_nedeni]!==undefined)r[k.degisim_nedeni]++;});return r;
  },[dashboardKayitlari]);

  const yoneticiOzeti=useMemo(()=>{
    const gucSay:Record<string,number>={};
    const nedenSay:Record<string,number>={};
    const ilceSay:Record<string,number>={};
    dashboardKayitlari.forEach(k=>{
      if(k.takilan_gucu)gucSay[k.takilan_gucu]=(gucSay[k.takilan_gucu]||0)+1;
      if(k.degisim_nedeni)nedenSay[k.degisim_nedeni]=(nedenSay[k.degisim_nedeni]||0)+1;
      if(k.ilce)ilceSay[k.ilce]=(ilceSay[k.ilce]||0)+1;
    });
    const ilk=(r:Record<string,number>)=>Object.entries(r).sort((a,b)=>b[1]-a[1])[0]||["-",0];
    const buYil=kayitlar.filter(k=>k.yil===BU_YIL).length;
    const tarihiBos=kayitlar.filter(k=>!k.tarih).length;
    return {buYil,tarihiBos,enGuc:ilk(gucSay),enNeden:ilk(nedenSay),enIlce:ilk(ilceSay)};
  },[dashboardKayitlari,kayitlar]);

  const [veriKaliteFiltre,setVeriKaliteFiltre]=useState("tumu");
  const [veriKaliteSayfa,setVeriKaliteSayfa]=useState(1);
  const [veriKaliteArama,setVeriKaliteArama]=useState("");
  const [veriKaliteIlce,setVeriKaliteIlce]=useState("");
  useEffect(()=>{setVeriKaliteSayfa(1)},[veriKaliteFiltre,veriKaliteArama,veriKaliteIlce,kayitlar]);
  const veriKaliteMerkezi=useMemo(()=>{
    const seriSay=new Map<string,number>();
    kayitlar.forEach(k=>{const x=norm(k.takilan_seri_no);if(x)seriSay.set(x,(seriSay.get(x)||0)+1);});
    const sorunlar=[
      {id:"tarih",baslik:"Tarihi boş kayıt",aciklama:"Değişim tarihi girilmemiş kayıtlar",kayitlar:kayitlar.filter(k=>!k.tarih),ton:"amber"},
      {id:"trafo",baslik:"Trafo ID eksik",aciklama:"Trafo ID alanı boş kayıtlar",kayitlar:kayitlar.filter(k=>!k.trafo_id?.trim()),ton:"blue"},
      {id:"lokasyon",baslik:"Lokasyon ID eksik",aciklama:"Lokasyon ID alanı boş kayıtlar",kayitlar:kayitlar.filter(k=>!k.lokasyon_id?.trim()),ton:"violet"},
      {id:"marka",baslik:"Marka bilgisi eksik",aciklama:"Sökülen veya takılan marka bilgisi boş",kayitlar:kayitlar.filter(k=>!k.sokulen_markasi?.trim()||!k.takilan_markasi?.trim()),ton:"orange"},
      {id:"guc",baslik:"Trafo gücü eksik",aciklama:"Sökülen veya takılan güç bilgisi girilmemiş",kayitlar:kayitlar.filter(k=>!String(k.sokulen_gucu??"").trim()||!String(k.takilan_gucu??"").trim()),ton:"amber"},
      {id:"seri",baslik:"Tekrarlanan takılan seri no",aciklama:"İncelenecek tekrarlar; aynı trafonun taşıma geçmişi olabilir",kayitlar:kayitlar.filter(k=>{const x=norm(k.takilan_seri_no);return !!x&&(seriSay.get(x)||0)>1;}),ton:"red"},
    ];
    sorunlar.push({id:"donem",baslik:"Tarih / dönem uyuşmazlığı",aciklama:"Tarih ile yıl veya ay farklı",kayitlar:kayitlar.filter(k=>k.tarih&&(k.yil!==Number(k.tarih.slice(0,4))||k.ay!==MONTHS[Number(k.tarih.slice(5,7))-1])),ton:"red"});
    const bulguToplami=sorunlar.reduce((a,x)=>a+x.kayitlar.length,0);
    const toplam=new Set(sorunlar.flatMap(x=>x.kayitlar.map(k=>k.id))).size;
    const kayitSorunlari=new Map<number,string[]>();
    sorunlar.forEach(s=>s.kayitlar.forEach(k=>kayitSorunlari.set(k.id,[...(kayitSorunlari.get(k.id)||[]),s.baslik])));
    return {sorunlar,toplam,bulguToplami,kayitSorunlari};
  },[kayitlar]);

  const veriKaliteListe=useMemo(()=>{
    const secili=veriKaliteMerkezi.sorunlar.filter(x=>veriKaliteFiltre==="tumu"||x.id===veriKaliteFiltre);
    const ids=new Set(secili.flatMap(x=>x.kayitlar.map(k=>k.id)));
    const aranan=norm(veriKaliteArama);
    return kayitlar.filter(k=>ids.has(k.id)&&(!veriKaliteIlce||k.ilce===veriKaliteIlce)&&(!aranan||norm([k.id,k.trafo_id,k.tr,k.lokasyon_id,k.ilce,k.mahalle,k.sokulen_markasi,k.takilan_markasi,k.takilan_seri_no].join(" ")).includes(aranan))).map(k=>({kayit:k,sorunlar:veriKaliteMerkezi.kayitSorunlari.get(k.id)||[]}));
  },[kayitlar,veriKaliteMerkezi,veriKaliteFiltre,veriKaliteArama,veriKaliteIlce]);
  const veriKaliteIlceler=useMemo(()=>Array.from(new Set(kayitlar.map(k=>k.ilce).filter((x):x is string=>!!x))).sort((a,b)=>a.localeCompare(b,"tr")),[kayitlar]);

  const veriKaliteSayfaSayisi=Math.max(1,Math.ceil(veriKaliteListe.length/10));
  const veriKaliteAktifSayfa=Math.min(veriKaliteSayfa,veriKaliteSayfaSayisi);
  const veriKaliteBaslangic=(veriKaliteAktifSayfa-1)*10;
  const veriKaliteGorunen=veriKaliteListe.slice(veriKaliteBaslangic,veriKaliteBaslangic+10);

  // Hızlı filtrelerden bir değişim nedeni seçildiğinde üst KPI kartını da dinamik güncelle.
  // Tümü / Bu Yıl / Son 30 Gün / güç filtrelerinde varsayılan KPI ARIZA olarak kalır.
  const seciliNedenKpi=useMemo(()=>{
    const nedenFiltreleri:Record<string,string>={
      ariza:"ARIZA",
      donusum:"DÖNÜŞÜM",
      "guc-degisimi":"GÜÇ DEĞİŞİMİ",
      "trafo-iptal":"TRAFO İPTAL",
      yatirim:"YATIRIM",
      "yeni-tesis":"YENİ TESİS",
      "ariza-riski":"ARIZA RİSKİ",
      "kismi-arizali":"KISMİ ARIZALI",
    };
    const ad=nedenFiltreleri[dashboardHizliFiltre]||"ARIZA";
    const renk=NEDENLER.find(n=>n.ad===ad)?.renk||"#ef4444";
    return {ad,renk};
  },[dashboardHizliFiltre]);

  const yillikNedenler=useMemo(()=>{
    const ys=Array.from(new Set(dashboardKayitlari.map(x=>x.yil).filter(Boolean) as number[])).sort((a,b)=>a-b);
    return ys.map(yil=>{const s=dashboardKayitlari.filter(x=>x.yil===yil),nedenler:Record<string,number>={};NEDENLER.forEach(n=>nedenler[n.ad]=s.filter(x=>x.degisim_nedeni===n.ad).length);return{yil,nedenler,toplam:s.length};});
  },[dashboardKayitlari]);

  const aylikNedenler=useMemo(()=>AYLAR.map(ay=>{
    const s=dashboardKayitlari.filter(x=>x.ay===ay);
    const nedenler:Record<string,number>={};NEDENLER.forEach(n=>nedenler[n.ad]=s.filter(x=>x.degisim_nedeni===n.ad).length);return{ay,toplam:s.length,nedenler};
  }),[dashboardKayitlari]);

  const enCokIlce=useMemo(()=>{const s:Record<string,number>={};dashboardKayitlari.forEach(x=>{if(x.ilce)s[x.ilce]=(s[x.ilce]||0)+1;});return Object.entries(s).sort((a,b)=>b[1]-a[1])[0]||["-",0];},[dashboardKayitlari]);
  const enCokNeden=useMemo(()=>Object.entries(nedenSayilari).sort((a,b)=>Number(b[1])-Number(a[1]))[0]||["-",0],[nedenSayilari]);
  const donutGradient=useMemo(()=>{
    const t=dashboardKayitlari.length;if(!t)return"#1e293b 0% 100%";let b=0;const p:string[]=[];
    NEDENLER.forEach(n=>{const o=(nedenSayilari[n.ad]||0)/t*100;if(o>0){p.push(`${n.renk} ${b}% ${b+o}%`);b+=o;}});return p.join(", ");
  },[dashboardKayitlari,nedenSayilari]);
  const maxYillik=Math.max(1,...yillikNedenler.map(x=>Math.max(...NEDENLER.map(n=>x.nedenler[n.ad]||0))));
  const maxAylik=Math.max(1,...aylikNedenler.map(x=>Math.max(...NEDENLER.map(n=>x.nedenler[n.ad]||0))));

  const ilceAnalizi=useMemo(()=>{
    const kaynak=dashboardKayitlari;
    const sayilar:Record<string,number>={};
    kaynak.forEach(x=>{const ilce=(x.ilce||"BELİRTİLMEMİŞ").trim()||"BELİRTİLMEMİŞ";sayilar[ilce]=(sayilar[ilce]||0)+1;});
    return Object.entries(sayilar).map(([ilce,sayi])=>({ilce,sayi,oran:kaynak.length?(sayi/kaynak.length)*100:0})).sort((a,b)=>b.sayi-a.sayi);
  },[dashboardKayitlari]);


  const gucAnalizi=useMemo(()=>{
    const kaynak=dashboardKayitlari;

    const sayiDeger=(v:string|null)=>{
      if(!v)return null;
      const temiz=v.replace(",",".").replace(/[^0-9.]/g,"");
      if(!temiz)return null;
      const n=Number(temiz);
      return Number.isFinite(n)?n:null;
    };

    let artan=0,azalan=0,ayni=0,karsilastirilabilir=0;
    const takilanSayilari:Record<string,number>={};
    const sokulenSayilari:Record<string,number>={};
    const gecisler:Record<string,number>={};

    kaynak.forEach(k=>{
      const s=sayiDeger(k.sokulen_gucu);
      const t=sayiDeger(k.takilan_gucu);

      if(k.sokulen_gucu){
        const key=k.sokulen_gucu.trim();
        sokulenSayilari[key]=(sokulenSayilari[key]||0)+1;
      }
      if(k.takilan_gucu){
        const key=k.takilan_gucu.trim();
        takilanSayilari[key]=(takilanSayilari[key]||0)+1;
      }

      if(s!==null&&t!==null){
        karsilastirilabilir++;
        if(t>s)artan++;
        else if(t<s)azalan++;
        else ayni++;

        const gecis=`${k.sokulen_gucu?.trim()} → ${k.takilan_gucu?.trim()}`;
        gecisler[gecis]=(gecisler[gecis]||0)+1;
      }
    });

    const sirala=(obj:Record<string,number>)=>
      Object.entries(obj).sort((a,b)=>b[1]-a[1]);

    return{
      artan,azalan,ayni,karsilastirilabilir,
      enCokTakilan:sirala(takilanSayilari)[0]||["-",0],
      enCokSokulen:sirala(sokulenSayilari)[0]||["-",0],
      takilanSirali:sirala(takilanSayilari).slice(0,8),
      gecisSirali:sirala(gecisler).slice(0,8),
    };
  },[dashboardKayitlari]);

  const gucToplam=Math.max(1,gucAnalizi.karsilastirilabilir);
  const takilanGucKayitSayisi=dashboardKayitlari.filter(record=>!!record.takilan_gucu).length;

  const nedenGucAnalizi=useMemo(()=>{
    const sayiDeger=(v:string|null)=>{
      if(!v)return null;
      const temiz=v.replace(",",".").replace(/[^0-9.]/g,"");
      if(!temiz)return null;
      const n=Number(temiz);
      return Number.isFinite(n)?n:null;
    };

    return NEDENLER.map(neden=>{
      const kayitlarNeden=dashboardKayitlari.filter(k=>k.degisim_nedeni===neden.ad);

      let artan=0;
      let azalan=0;
      let ayni=0;
      let karsilastirilabilir=0;
      const gecisler:Record<string,number>={};

      kayitlarNeden.forEach(k=>{
        const s=sayiDeger(k.sokulen_gucu);
        const t=sayiDeger(k.takilan_gucu);

        if(s!==null&&t!==null){
          karsilastirilabilir++;

          if(t>s)artan++;
          else if(t<s)azalan++;
          else ayni++;

          const gecis=`${k.sokulen_gucu?.trim()} → ${k.takilan_gucu?.trim()}`;
          gecisler[gecis]=(gecisler[gecis]||0)+1;
        }
      });

      const enSikGecis=Object.entries(gecisler).sort((a,b)=>b[1]-a[1])[0]||["-",0];

      return{
        neden:neden.ad,
        renk:neden.renk,
        toplam:kayitlarNeden.length,
        karsilastirilabilir,
        artan,
        azalan,
        ayni,
        artisOrani:karsilastirilabilir ? (artan/karsilastirilabilir)*100 : 0,
        ayniOrani:karsilastirilabilir ? (ayni/karsilastirilabilir)*100 : 0,
        azalisOrani:karsilastirilabilir ? (azalan/karsilastirilabilir)*100 : 0,
        enSikGecis:String(enSikGecis[0]),
        enSikGecisSayisi:Number(enSikGecis[1]),
      };
    }).filter(x=>x.toplam>0);
  },[dashboardKayitlari]);

  const enYuksekArtisNedeni=[...nedenGucAnalizi].sort((a,b)=>b.artisOrani-a.artisOrani)[0]||null;
  const enDusukArtisNedeni=[...nedenGucAnalizi].sort((a,b)=>a.artisOrani-b.artisOrani)[0]||null;
  const gucDegisimiNedeni=nedenGucAnalizi.find(x=>x.neden==="GÜÇ DEĞİŞİMİ")||null;
  const arizaNedeni=nedenGucAnalizi.find(x=>x.neden==="ARIZA")||null;

  
  function norm(v:string|null|undefined){return String(v||"").trim().toLocaleUpperCase("tr-TR").replace(/\s+/g," ");}
  function eslemeAnahtari(v:string|null|undefined){
    return String(v||"")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/ı/g,"I").replace(/İ/g,"I")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g," ")
      .trim()
      .replace(/\s+/g," ");
  }
  const buAyKayitSayisi=useMemo(()=>{const d=new Date(),y=d.getFullYear(),a=AYLAR[d.getMonth()];return kayitlar.filter(k=>k.yil===y&&norm(k.ay)===norm(a)).length;},[kayitlar]);
  const genelAramaSonuclari=useMemo(()=>{
    const q=eslemeAnahtari(genelArama);
    if(q.length<2)return {kayit:[] as TrafoKaydi[]};
    const kk=kayitlar.filter(k=>eslemeAnahtari([k.tarih,k.yil,k.ay,k.ilce,k.mahalle,k.tr,k.lokasyon_id,k.trafo_id,k.sokulen_seri_no,k.takilan_seri_no,k.degisim_nedeni,k.aciklama].join(" ")).includes(q)).slice(0,6);
    return {kayit:kk};
  },[genelArama,kayitlar]);
  async function sistemYedekleriniGetir(){
    if(!session||!yonetici)return;
    setYedekListesiYukleniyor(true);setSunucuYedekHata("");
    try{
      const r=await fetch("/api/sistem-yedek",{headers:{Authorization:`Bearer ${session.access_token}`},cache:"no-store"});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(j?.error||"Yedek geçmişi alınamadı.");
      setSistemYedekleri(Array.isArray(j?.yedekler)?j.yedekler:[]);
    }catch(e:any){
      setSunucuYedekHata(e?.message||"Yedek geçmişi alınamadı.");
    }finally{setYedekListesiYukleniyor(false);}
  }

  async function sunucuYedegiAl(){
    if(!session||!yonetici)return;
    setSunucuYedekleniyor(true);setSunucuYedekHata("");
    try{
      const r=await fetch("/api/sistem-yedek",{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`,"Content-Type":"application/json"}});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(j?.error||"Sunucu yedeği alınamadı.");
      await sistemYedekleriniGetir();
    }catch(e:any){
      setSunucuYedekHata(e?.message||"Sunucu yedeği alınamadı.");
    }finally{setSunucuYedekleniyor(false);}
  }

  function baytGoster(v:number){
    if(!v)return "0 B";
    if(v<1024)return `${v} B`;
    if(v<1024*1024)return `${(v/1024).toFixed(1)} KB`;
    return `${(v/1024/1024).toFixed(1)} MB`;
  }

  function jsonSistemYedegiAl(){
    setYedekHazirlaniyor(true);
    try{
      const payload={created_at:new Date().toISOString(),trafo_degisim:kayitlar,audit_logs:yonetici?auditLoglar:[]};
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json;charset=utf-8"});
      const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`BALIKESIR_TRAFO_SISTEM_YEDEGI_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);
    }finally{setYedekHazirlaniyor(false);}
  }
const filtrelenmisKayitlar=useMemo(()=>{
    const q=arama.trim().toLocaleUpperCase("tr-TR");
    return kayitlar.filter(k=>{
      if(filtreYil&&String(k.yil||"")!==filtreYil)return false;
      if(filtreAy&&k.ay!==filtreAy)return false;
      if(filtreIlce&&k.ilce!==filtreIlce)return false;
      if(filtreNeden&&k.degisim_nedeni!==filtreNeden)return false;
      if(filtreBaslangic&&(!k.tarih||k.tarih<filtreBaslangic))return false;
      if(filtreBitis&&(!k.tarih||k.tarih>filtreBitis))return false;
      if(!q)return true;
      return [k.sira_no,k.yil,k.ay,k.ilce,k.mahalle,k.tr,k.lokasyon_id,k.trafo_id,k.trafo_tipi,k.sokulen_gucu,k.sokulen_gerilim,k.sokulen_markasi,k.sokulen_seri_no,k.sokulen_imal_yili,k.sokulen_trafo_tipi,k.sokulen_tamir_yili,k.sokulen_tamir_firmasi,k.sokulen_yuklenici,k.takilan_gucu,k.takilan_gerilim,k.takilan_markasi,k.takilan_seri_no,k.takilan_imal_yili,k.takilan_trafo_tipi,k.takilan_tamir_yili,k.takilan_tamir_firmasi,k.tarih,k.degisim_nedeni,k.aciklama].filter(v=>v!==null&&v!==undefined).join(" ").toLocaleUpperCase("tr-TR").includes(q);
    });
  },[kayitlar,arama,filtreYil,filtreAy,filtreIlce,filtreNeden,filtreBaslangic,filtreBitis]);

  const akilliFormEslesme=useMemo(()=>{
    const tid=form.trafo_id.trim().toLocaleUpperCase("tr-TR"), lid=form.lokasyon_id.trim().toLocaleUpperCase("tr-TR");
    if(!tid&&!lid)return null;
    return kayitlar.find(k=>(tid&&k.trafo_id?.trim().toLocaleUpperCase("tr-TR")===tid)||(lid&&k.lokasyon_id?.trim().toLocaleUpperCase("tr-TR")===lid))||null;
  },[kayitlar,form.trafo_id,form.lokasyon_id]);
  const gucDurumu=useMemo(()=>{
    const n=(v:string)=>{if(!v.trim())return null;const x=Number(v.replace(",",".").replace(/[^0-9.]/g,""));return Number.isFinite(x)?x:null;};
    const s=n(form.sokulen_gucu),t=n(form.takilan_gucu);if(s===null||t===null)return "";return t>s?"↗ Güç Artışı":t<s?"↘ Güç Azalışı":"→ Aynı Güç";
  },[form.sokulen_gucu,form.takilan_gucu]);
  const gecmisKayitlari=useMemo(()=>{
    if(!gecmisKayit)return [] as TrafoKaydi[];
    const tid=gecmisKayit.trafo_id?.trim(),lid=gecmisKayit.lokasyon_id?.trim(),tr=gecmisKayit.tr?.trim();
    return kayitlar.filter(k=>gecmisKapsami==="asset"?!!tid&&k.trafo_id?.trim()===tid:lid?k.lokasyon_id?.trim()===lid:!!tr&&k.tr?.trim()===tr).sort((a,b)=>(b.tarih||"").localeCompare(a.tarih||""));
  },[gecmisKayit,kayitlar,gecmisKapsami]);
  const filtrelenmisLoglar=useMemo(()=>{const q=logArama.trim().toLocaleUpperCase("tr-TR");if(!q)return auditLoglar;return auditLoglar.filter(l=>[l.action,l.user_email,l.record_id,JSON.stringify(l.old_data||{}),JSON.stringify(l.new_data||{})].join(" ").toLocaleUpperCase("tr-TR").includes(q));},[auditLoglar,logArama]);

  const detayIndex=detayKayit ? kayitlar.findIndex(k=>k.id===detayKayit.id) : -1;
  const detayOnceki=detayIndex>0 ? kayitlar[detayIndex-1] : null;
  const detaySonraki=detayIndex>=0&&detayIndex<kayitlar.length-1 ? kayitlar[detayIndex+1] : null;

  async function excelAktar(){
    if(!filtrelenmisKayitlar.length){alert("Excel'e aktarılacak kayıt bulunmuyor.");return;}
    try{
      const wb=new ExcelJS.Workbook();wb.creator="Balıkesir Trafo Değişim Yönetim Sistemi";wb.created=new Date();
      const ws=wb.addWorksheet("Trafo Değişim");ws.views=[{state:"frozen",ySplit:4}];ws.mergeCells("A1:AC1");
      const t=ws.getCell("A1");t.value="BALIKESİR TRAFO DEĞİŞİM RAPORU";t.font={name:"Arial",size:18,bold:true,color:{argb:"FFFFFFFF"}};t.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF97316"}};t.alignment={horizontal:"center",vertical:"middle"};ws.getRow(1).height=32;
      ws.mergeCells("A2:H2");ws.getCell("A2").value=`Toplam Kayıt: ${filtrelenmisKayitlar.length}`;ws.getCell("A2").font={bold:true};
      const af:string[]=[];if(filtreYil)af.push(`Yıl: ${filtreYil}`);if(filtreAy)af.push(`Ay: ${filtreAy}`);if(filtreNeden)af.push(`Neden: ${filtreNeden}`);if(arama.trim())af.push(`Arama: ${arama.trim()}`);
      ws.mergeCells("I2:P2");ws.getCell("I2").value=af.length?`Filtreler: ${af.join(" • ")}`:"Filtreler: Tüm Kayıtlar";ws.mergeCells("Q2:AC2");ws.getCell("Q2").value=`Rapor Tarihi: ${new Date().toLocaleDateString("tr-TR")}`;ws.getCell("Q2").alignment={horizontal:"right"};
      const cols=[["SIRA NO",10],["YIL",9],["AY",13],["İLÇE",16],["MAHALLE",22],["TR",30],["LOKASYON ID",16],["TRAFO ID",16],["TRAFO TİPİ",16],["SÖKÜLEN GÜCÜ",16],["SÖKÜLEN GERİLİM",18],["SÖKÜLEN MARKASI",21],["SÖKÜLEN SERİ NO",18],["SÖKÜLEN İMAL YILI",18],["SÖKÜLEN TRAFO TİPİ",22],["SÖKÜLEN TAMİR YILI",19],["SÖKÜLEN TAMİR FİRMASI",25],["SÖKÜLEN YÜKLENİCİ",23],["TAKILAN GÜCÜ",16],["TAKILAN GERİLİM",18],["TAKILAN MARKASI",21],["TAKILAN SERİ NO",18],["TAKILAN İMAL YILI",18],["TAKILAN TRAFO TİPİ",22],["TAKILAN TAMİR YILI",19],["TAKILAN TAMİR FİRMASI",25],["TARİH",15],["DEĞİŞİM NEDENİ",22],["AÇIKLAMA",40]] as const;
      cols.forEach(([h,w],i)=>{ws.getRow(4).getCell(i+1).value=h;ws.getColumn(i+1).width=w;});
      ws.getRow(4).eachCell({includeEmpty:true},c=>{c.font={name:"Arial",size:10,bold:true,color:{argb:"FFFFFFFF"}};c.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF0F172A"}};c.alignment={horizontal:"center",vertical:"middle",wrapText:true};});
      filtrelenmisKayitlar.forEach((k,i)=>{const p=k.tarih?.split("-");const d=p?.length===3?new Date(+p[0],+p[1]-1,+p[2]):k.tarih||"";
        const r=ws.addRow([k.sira_no??i+1,k.yil??"",k.ay??"",k.ilce??"",k.mahalle??"",k.tr??"",k.lokasyon_id??"",k.trafo_id??"",k.trafo_tipi??"",k.sokulen_gucu??"",k.sokulen_gerilim??"",k.sokulen_markasi??"",k.sokulen_seri_no??"",k.sokulen_imal_yili??"",k.sokulen_trafo_tipi??"",k.sokulen_tamir_yili??"",k.sokulen_tamir_firmasi??"",k.sokulen_yuklenici??"",k.takilan_gucu??"",k.takilan_gerilim??"",k.takilan_markasi??"",k.takilan_seri_no??"",k.takilan_imal_yili??"",k.takilan_trafo_tipi??"",k.takilan_tamir_yili??"",k.takilan_tamir_firmasi??"",d,k.degisim_nedeni??"",k.aciklama??""]);
        r.getCell(27).numFmt="dd.mm.yyyy";r.eachCell({includeEmpty:true},c=>{c.font={name:"Arial",size:10,color:{argb:"FF1F2937"}};c.alignment={vertical:"middle",wrapText:true};if(i%2)c.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF8FAFC"}};});
        const n=NEDENLER.find(x=>x.ad===k.degisim_nedeni);if(n){const c=r.getCell(28),renk=n.renk.slice(1).toUpperCase();c.fill={type:"pattern",pattern:"solid",fgColor:{argb:`FF${renk}`}};c.font={name:"Arial",size:10,bold:true,color:{argb:"FFFFFFFF"}};c.alignment={horizontal:"center",vertical:"middle"};}
      });
      ws.autoFilter={from:{row:4,column:1},to:{row:4,column:29}};ws.pageSetup={orientation:"landscape",fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:.25,right:.25,top:.5,bottom:.5,header:.2,footer:.2}};
      const buffer=await wb.xlsx.writeBuffer();const blob=new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});const url=URL.createObjectURL(blob);const a=document.createElement("a");
      a.href=url;a.download=`BALIKESIR_TRAFO_DEGISIMI_${new Date().toLocaleDateString("tr-TR").replaceAll(".","-")}.xlsx`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
    }catch(e){console.error(e);alert("Excel dosyası oluşturulurken hata oluştu.");}
  }

  function csvYedekAl(){
    if(!kayitlar.length){alert("Yedeklenecek kayıt bulunmuyor.");return;}
    const basliklar=["SIRA NO","YIL","AY","İLÇE","MAHALLE","TR","LOKASYON ID","TRAFO ID","TRAFO TİPİ","SÖKÜLEN GÜCÜ","SÖKÜLEN GERİLİM","SÖKÜLEN MARKASI","SÖKÜLEN SERİ NO","SÖKÜLEN İMAL YILI","SÖKÜLEN TRAFO TİPİ","SÖKÜLEN TAMİR YILI","SÖKÜLEN TAMİR FİRMASI","SÖKÜLEN YÜKLENİCİ","TAKILAN GÜCÜ","TAKILAN GERİLİM","TAKILAN MARKASI","TAKILAN SERİ NO","TAKILAN İMAL YILI","TAKILAN TRAFO TİPİ","TAKILAN TAMİR YILI","TAKILAN TAMİR FİRMASI","TARİH","DEĞİŞİM NEDENİ","AÇIKLAMA"];
    const q=(v:unknown)=>`"${String(v??"").replaceAll('"','""')}"`;
    const satirlar=kayitlar.map((k,i)=>[
      k.sira_no??i+1,k.yil??"",k.ay??"",k.ilce??"",k.mahalle??"",k.tr??"",k.lokasyon_id??"",k.trafo_id??"",k.trafo_tipi??"",
      k.sokulen_gucu??"",k.sokulen_gerilim??"",k.sokulen_markasi??"",k.sokulen_seri_no??"",k.sokulen_imal_yili??"",k.sokulen_trafo_tipi??"",k.sokulen_tamir_yili??"",k.sokulen_tamir_firmasi??"",k.sokulen_yuklenici??"",
      k.takilan_gucu??"",k.takilan_gerilim??"",k.takilan_markasi??"",k.takilan_seri_no??"",k.takilan_imal_yili??"",k.takilan_trafo_tipi??"",k.takilan_tamir_yili??"",k.takilan_tamir_firmasi??"",k.tarih??"",k.degisim_nedeni??"",k.aciklama??""
    ].map(q).join(";"));
    const icerik="\ufeff"+[basliklar.map(q).join(";"),...satirlar].join("\r\n");
    const blob=new Blob([icerik],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`BALIKESIR_TRAFO_YEDEK_${new Date().toLocaleDateString("tr-TR").replaceAll(".","-")}.csv`;a.click();URL.revokeObjectURL(url);
  }

  async function csvIceAktar(e:ChangeEvent<HTMLInputElement>){
    if(!duzenleyebilir){window.alert("CSV içe aktarma için düzenleme yetkisi gerekir.");return;}
    const file=e.target.files?.[0];e.target.value="";if(!file||!supabase)return;
    setCsvYukleniyor(true);setGenelHata("");
    try{
      const metin=await file.text();
      const satirlar=csvParse(metin);
      if(satirlar.length<2)throw new Error("CSV dosyasında veri bulunamadı.");
      const baslik=satirlar[0].map(csvBaslikNormalize);
      const idx=(ad:string)=>baslik.indexOf(csvBaslikNormalize(ad));
      const val=(row:string[],ad:string)=>{const i=idx(ad);return i>=0?(row[i]||"").trim():"";};
      const tarihDonustur=(v:string)=>{if(!v)return null;if(/^\d{4}-\d{2}-\d{2}$/.test(v))return v;const m=v.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`:null;};
      const veri=satirlar.slice(1).filter(r=>r.some(x=>x.trim())).map((r,i)=>({
        sira_no:Number(val(r,"SIRA NO"))||null,
        yil:Number(val(r,"YIL"))||null,ay:val(r,"AY")||null,ilce:val(r,"İLÇE")||null,mahalle:val(r,"MAHALLE")||null,tr:val(r,"TR")||null,lokasyon_id:val(r,"LOKASYON ID")||null,trafo_id:val(r,"TRAFO ID")||null,trafo_tipi:val(r,"TRAFO TİPİ")||null,
        sokulen_gucu:val(r,"SÖKÜLEN GÜCÜ")||null,sokulen_gerilim:val(r,"SÖKÜLEN GERİLİM")||null,sokulen_markasi:val(r,"SÖKÜLEN MARKASI")||null,sokulen_seri_no:val(r,"SÖKÜLEN SERİ NO")||null,sokulen_imal_yili:val(r,"SÖKÜLEN İMAL YILI")||null,sokulen_trafo_tipi:val(r,"SÖKÜLEN TRAFO TİPİ")||null,sokulen_tamir_yili:val(r,"SÖKÜLEN TAMİR YILI")||null,sokulen_tamir_firmasi:val(r,"SÖKÜLEN TAMİR FİRMASI")||null,sokulen_yuklenici:val(r,"SÖKÜLEN YÜKLENİCİ")||null,
        takilan_gucu:val(r,"TAKILAN GÜCÜ")||null,takilan_gerilim:val(r,"TAKILAN GERİLİM")||null,takilan_markasi:val(r,"TAKILAN MARKASI")||null,takilan_seri_no:val(r,"TAKILAN SERİ NO")||null,takilan_imal_yili:val(r,"TAKILAN İMAL YILI")||null,takilan_trafo_tipi:val(r,"TAKILAN TRAFO TİPİ")||null,takilan_tamir_yili:val(r,"TAKILAN TAMİR YILI")||null,takilan_tamir_firmasi:val(r,"TAKILAN TAMİR FİRMASI")||null,
        tarih:tarihDonustur(val(r,"TARİH")),degisim_nedeni:val(r,"DEĞİŞİM NEDENİ")||null,aciklama:val(r,"AÇIKLAMA")||null,
      }));
      if(!veri.length)throw new Error("Aktarılabilir kayıt bulunamadı.");
      if(!confirm(`${veri.length} kayıt içe aktarılacak. Devam edilsin mi?`)){setCsvYukleniyor(false);return;}
      const normalized=veri.map(v=>normalizeTrafoRecord(v));const invalid=normalized.findIndex(v=>v.errors.length);if(invalid>=0)throw Error(`Satır ${invalid+2}: ${normalized[invalid].errors.join(" ")}`);
      const {data:result,error}=await supabase.rpc("trafo_import2026",{incoming:normalized.map(v=>v.value)});if(error)throw error;if(result?.already_imported){setBasariMesaji("Bu içerik daha önce aktarılmış; tekrar kayıt eklenmedi.");return;}
      await kayitlariGetir();setBasariMesaji(`${veri.length} kayıt CSV dosyasından içe aktarıldı.`);setTimeout(()=>setBasariMesaji(""),4000);
    }catch(err){setGenelHata(`CSV içe aktarma hatası: ${err instanceof Error?err.message:String(err)}`);}finally{setCsvYukleniyor(false);}
  }


  async function excelIceAktarOnizle(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];e.target.value="";if(!file)return;
    if(!duzenleyebilir){alert("Excel içe aktarma için düzenleme yetkisi gerekir.");return;}
    try{
      const wb=new ExcelJS.Workbook();await wb.xlsx.load(await file.arrayBuffer());
      const ws=wb.worksheets[0];if(!ws)throw new Error("Çalışma sayfası bulunamadı.");
      const baslikSatiri=ws.getRow(1).values as unknown[];
      const headers=baslikSatiri.slice(1).map(x=>csvBaslikNormalize(String(x??"")));
      const aliases:Record<string,string>={
        "SIRA NO":"sira_no","YIL":"yil","AY":"ay","İLÇE":"ilce","MAHALLE":"mahalle","TR":"tr","LOKASYON ID":"lokasyon_id","TRAFO ID":"trafo_id","TRAFO TİPİ":"trafo_tipi",
        "SÖKÜLEN GÜCÜ":"sokulen_gucu","SÖKÜLEN GERİLİM":"sokulen_gerilim","SÖKÜLEN MARKASI":"sokulen_markasi","SÖKÜLEN SERİ NO":"sokulen_seri_no","SÖKÜLEN İMAL YILI":"sokulen_imal_yili","SÖKÜLEN TRAFO TİPİ":"sokulen_trafo_tipi","SÖKÜLEN TAMİR YILI":"sokulen_tamir_yili","SÖKÜLEN TAMİR FİRMASI":"sokulen_tamir_firmasi","SÖKÜLEN YÜKLENİCİ":"sokulen_yuklenici",
        "TAKILAN GÜCÜ":"takilan_gucu","TAKILAN GERİLİM":"takilan_gerilim","TAKILAN MARKASI":"takilan_markasi","TAKILAN SERİ NO":"takilan_seri_no","TAKILAN İMAL YILI":"takilan_imal_yili","TAKILAN TRAFO TİPİ":"takilan_trafo_tipi","TAKILAN TAMİR YILI":"takilan_tamir_yili","TAKILAN TAMİR FİRMASI":"takilan_tamir_firmasi","TARİH":"tarih","DEĞİŞİM NEDENİ":"degisim_nedeni","AÇIKLAMA":"aciklama"
      };
      const kayitlarOnizleme:Record<string,unknown>[]=[];const hatalar:string[]=[];
      ws.eachRow((row,rowNo)=>{
        if(rowNo===1)return;
        const vals=(row.values as unknown[]).slice(1);if(!vals.some(v=>String(v??"").trim()))return;
        const obj:Record<string,unknown>={};
        headers.forEach((h,i)=>{const key=aliases[h];if(!key)return;let v=vals[i]??null;if(key==="yil"||key==="sira_no")v=Number(v)||null;if(key==="tarih"&&v instanceof Date)v=v.toISOString().slice(0,10);obj[key]=v===null?null:String(v).trim();});
        if(!obj.yil||!obj.ay||!obj.ilce)hatalar.push(`Satır ${rowNo}: Yıl, Ay veya İlçe eksik.`);
        kayitlarOnizleme.push(obj);
      });
      if(!kayitlarOnizleme.length)throw new Error("Aktarılabilir satır bulunamadı.");
      setExcelOnizleme({dosyaAdi:file.name,kayitlar:kayitlarOnizleme,hatalar:hatalar.slice(0,30)});
    }catch(e:any){setGenelHata(e?.message||"Excel okunamadı.");}
  }
  async function excelOnizlemeyiAktar(){
    if(!supabase||!excelOnizleme||!duzenleyebilir)return;
    setExcelIceAktariliyor(true);setGenelHata("");
    try{
      const normalized=excelOnizleme.kayitlar.map(v=>normalizeTrafoRecord(v));const invalid=normalized.findIndex(v=>v.errors.length);if(invalid>=0)throw Error(`Satır ${invalid+2}: ${normalized[invalid].errors.join(" ")}`);
      const {data:result,error}=await supabase.rpc("trafo_import2026",{incoming:normalized.map(v=>v.value)});if(error)throw error;if(result?.already_imported){setBasariMesaji("Bu içerik daha önce aktarılmış; tekrar kayıt eklenmedi.");setExcelOnizleme(null);return;}
      setBasariMesaji(`${excelOnizleme.kayitlar.length} kayıt Excel'den aktarıldı.`);setExcelOnizleme(null);await kayitlariGetir();if(yonetici&&sayfa==="loglar")await auditLoglariGetir();setTimeout(()=>setBasariMesaji(""),3500);
    }catch(e:any){setGenelHata(e?.message||"Excel aktarımı başarısız.");}
    finally{setExcelIceAktariliyor(false);}
  }

  function dashboardYazdir(){
    const w=window.open("","_blank","width=1200,height=900");if(!w){alert("Rapor penceresi açılamadı.");return;}
    const nedenSatir=NEDENLER.map(n=>`<tr><td>${n.ad}</td><td>${nedenSayilari[n.ad]||0}</td></tr>`).join("");
    const ilceSatir=ilceAnalizi.map(x=>`<tr><td>${x.ilce}</td><td>${x.sayi}</td><td>%${x.oran.toFixed(1)}</td></tr>`).join("");
    const gucSatir=nedenGucAnalizi.map(x=>`<tr><td>${x.neden}</td><td>${x.karsilastirilabilir}</td><td>${x.artan}</td><td>${x.ayni}</td><td>${x.azalan}</td><td>%${x.artisOrani.toFixed(1)}</td></tr>`).join("");
    w.document.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Dashboard Raporu</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:Arial;color:#111827}h1{border-bottom:4px solid #f97316;padding-bottom:8px}.k{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0}.c{border:1px solid #ddd;padding:10px;border-radius:8px}.c b{font-size:22px;display:block;margin-top:4px}table{width:100%;border-collapse:collapse;margin:10px 0 20px}th{background:#111827;color:white}th,td{border:1px solid #ddd;padding:6px;font-size:10px}h2{margin-top:20px}</style></head><body><h1>BALIKESİR TRAFO DEĞİŞİM DASHBOARD RAPORU</h1><p>Filtre: ${dashboardYil||"Tüm Yıllar"} / ${dashboardIlce||"Tüm İlçeler"}${dashboardBaslangic?` / ${tarihGoster(dashboardBaslangic)} sonrası`:""}${dashboardBitis?` / ${tarihGoster(dashboardBitis)} öncesi`:""}${dashboardHizliFiltre?` / ${dashboardHizliFiltre}`:""}</p><div class="k"><div class="c">Toplam<b>${dashboardKayitlari.length}</b></div><div class="c">Arıza<b>${nedenSayilari["ARIZA"]||0}</b></div><div class="c">Son 30 Gün<b>${son30Gun}</b></div><div class="c">En Yoğun İlçe<b>${enCokIlce[0]}</b></div></div><h2>Değişim Nedenleri</h2><table><tr><th>Neden</th><th>Kayıt</th></tr>${nedenSatir}</table><h2>İlçe Analizi</h2><table><tr><th>İlçe</th><th>Kayıt</th><th>Pay</th></tr>${ilceSatir}</table><h2>Değişim Nedeni × Güç</h2><table><tr><th>Neden</th><th>Karşılaştırılabilir</th><th>Artan</th><th>Aynı</th><th>Azalan</th><th>Artış Oranı</th></tr>${gucSatir}</table><script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);w.document.close();
  }

  function raporuKaydet(){
    if(!filtrelenmisKayitlar.length){alert("Kaydedilecek kayıt bulunmuyor.");return;}
    try{
      saveRecordReportPdf(
        [
          {label:"No",weight:4},{label:"Tarih",weight:9},{label:"Yıl",weight:5},{label:"Ay",weight:8},
          {label:"İlçe",weight:10},{label:"Mahalle",weight:13},{label:"TR",weight:14},
          {label:"Lokasyon ID",weight:10},{label:"Trafo ID",weight:10},
          {label:"Sökülen Güç",weight:8},{label:"Sökülen Marka",weight:10},
          {label:"Takılan Güç",weight:8},{label:"Takılan Marka",weight:10},{label:"Neden",weight:13}
        ],
        filtrelenmisKayitlar.map((k,i)=>[
          k.sira_no??i+1,tarihGoster(k.tarih),k.yil,k.ay,k.ilce,k.mahalle,k.tr,
          k.lokasyon_id,k.trafo_id,k.sokulen_gucu,k.sokulen_markasi,
          k.takilan_gucu,k.takilan_markasi,k.degisim_nedeni
        ])
      );
    }catch(e:unknown){alert(e instanceof Error?e.message:"PDF kaydedilemedi.");}
  }

  if(authKontrol)return <main className="flex min-h-screen items-center justify-center bg-[#07111f] text-white"><div className="text-center"><div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-orange-500"/><p className="mt-5 text-slate-400">Sistem hazırlanıyor...</p></div></main>;

  if(sifreSifirlamaModu)return <main className="flex min-h-screen items-center justify-center bg-[#07111f] p-4 text-white">
    <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#101d30] p-6 shadow-2xl sm:p-8">
      <div className="mb-6">
        <div className="text-xs font-black tracking-[0.25em] text-orange-400">BALIKESİR</div>
        <h1 className="mt-2 text-2xl font-black">Yeni Şifre Oluştur</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Hesabınız için yeni şifrenizi belirleyin.</p>
      </div>
      <div className="space-y-4">
        <label className="block"><span className="mb-2 block text-xs font-bold text-slate-400">YENİ ŞİFRE</span><input type="password" autoComplete="new-password" value={yeniSifre} onChange={e=>setYeniSifre(e.target.value)} className={inputSinif} placeholder="En az 6 karakter"/></label>
        <label className="block"><span className="mb-2 block text-xs font-bold text-slate-400">YENİ ŞİFRE TEKRAR</span><input type="password" autoComplete="new-password" value={yeniSifreTekrar} onChange={e=>setYeniSifreTekrar(e.target.value)} className={inputSinif} placeholder="Yeni şifrenizi tekrar yazın"/></label>
        {sifreMesaj&&<div className="rounded-xl border border-red-900/70 bg-red-950/30 px-3 py-2 text-xs leading-5 text-red-300">{sifreMesaj}</div>}
        <button type="button" disabled={sifreIslem} onClick={yeniSifreyiKaydet} className="w-full rounded-xl bg-orange-500 px-4 py-3 font-black hover:bg-orange-400 disabled:opacity-50">{sifreIslem?"Kaydediliyor...":"Yeni Şifreyi Kaydet"}</button>
      </div>
    </div>
  </main>;

  if(!session&&!misafirModu)return <main className="min-h-screen bg-[#f7f9fc] text-slate-900">
    <div className="grid min-h-screen lg:grid-cols-[1.02fr_.98fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[radial-gradient(circle_at_80%_75%,rgba(249,115,22,.28),transparent_28%),radial-gradient(circle_at_15%_15%,rgba(59,130,246,.16),transparent_28%),linear-gradient(145deg,#071a34_0%,#102744_55%,#1a263d_100%)] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{backgroundImage:"linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px)",backgroundSize:"38px 38px"}}/>
        <div className="pointer-events-none absolute bottom-[-100px] right-[-70px] h-[420px] w-[420px] rounded-full border border-orange-400/20"/>
        <div className="pointer-events-none absolute bottom-[-40px] right-[-10px] h-[300px] w-[300px] rounded-full border border-orange-400/20"/>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="text-[48px] leading-none text-orange-500">⚡</div>
            <div><div className="text-[23px] font-black tracking-tight">BALIKESİR</div><div className="mt-0.5 text-sm font-bold tracking-[.1em] text-slate-300">TRAFO DEĞİŞİMİ</div></div>
          </div>

          <div className="mt-24 max-w-[610px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black text-orange-300 backdrop-blur"><span>⚡</span> TRAFO DEĞİŞİMİ YÖNETİM SİSTEMİ</div>
            <h1 className="mt-7 text-white text-5xl font-black leading-[1.05] tracking-tight xl:text-6xl">Trafo Değişim<span className="block text-orange-400">Yönetim Sistemi</span></h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 xl:text-lg">Trafo değişim kayıtlarını yönetin, istatistikleri takip edin ve değişim nedenlerini tek ekrandan analiz edin.</p>

            <div className="mt-10 grid gap-4">
              {[
                ["📋","Kayıt Yönetimi","Trafo değişim kayıtlarını kolayca oluşturun ve yönetin."],
                ["📊","İstatistik & Analiz","Yıllık, aylık ve neden bazlı analizlerle içgörü elde edin."],
                ["⚡","Güç Değişimi Takibi","Eski ve yeni güç değerlerini otomatik karşılaştırın."],
              ].map(([i,b,a])=><div key={b} className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl shadow-lg shadow-black/10 backdrop-blur">{i}</div>
                <div><div className="text-sm font-black">{b}</div><div className="mt-1 text-xs leading-5 text-slate-400">{a}</div></div>
              </div>)}
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-10">
          <div className="relative overflow-hidden rounded-3xl border border-orange-400/20 bg-[linear-gradient(135deg,rgba(249,115,22,.14),rgba(15,23,42,.35))] p-6 backdrop-blur">
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-orange-500/15 to-transparent"/>
            <div className="flex items-end justify-between gap-6">
              <div><div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-300">Enerji Altyapısı</div><div className="mt-2 max-w-sm text-sm leading-6 text-slate-300">Saha kayıtları ve değişim geçmişi tek güvenli sistemde.</div></div>
              <div className="flex items-end gap-2 opacity-80">
                <div className="h-16 w-6 rounded-t-md bg-orange-400/30"/><div className="h-24 w-8 rounded-t-md bg-orange-400/45"/><div className="h-12 w-5 rounded-t-md bg-orange-400/25"/><div className="mb-1 text-5xl">⚡</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,.07),transparent_28%),#f7f9fc] px-5 py-10 sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-100/40 blur-3xl"/>
        <div className="w-full max-w-[520px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="text-4xl text-orange-500">⚡</div>
            <div><div className="text-lg font-black text-[#12315b]">BALIKESİR</div><div className="text-xs font-bold tracking-[.08em] text-[#12315b]">TRAFO DEĞİŞİMİ</div></div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,.10)] sm:p-9">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-3xl shadow-inner">🛡️</div>
            <div className="mt-6 text-center">
              <h2 className="text-3xl font-black tracking-tight text-slate-900">Sisteme Giriş Yap</h2>
              <p className="mt-2 text-sm text-slate-500">Hesabınıza giriş yaparak devam edin.</p>
            </div>

            <form onSubmit={girisYap} autoComplete="on" className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-700">E-posta</span>
                <div className="relative"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">👤</span><input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="ornek@email.com" className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-700">Şifre</span>
                <div className="relative"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔒</span><input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Şifrenizi girin" className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></div>
              </label>

              {authHata&&<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{authHata}</div>}
              {sifreMesaj&&<div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-5 text-emerald-700">{sifreMesaj}</div>}

              <div className="flex justify-end">
                <button type="button" disabled={sifreIslem} onClick={sifremiUnuttum} className="text-sm font-black text-blue-600 transition hover:text-blue-700 disabled:opacity-50">{sifreIslem?"Gönderiliyor...":"Şifremi Unuttum"}</button>
              </div>

              <button disabled={girisYukleniyor} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-orange-200 transition hover:from-orange-600 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-50">{girisYukleniyor?"Giriş Yapılıyor...":<>Sisteme Giriş Yap <span>→</span></>}</button>

              <div className="flex items-center gap-3 py-1"><div className="h-px flex-1 bg-slate-200"/><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">veya</span><div className="h-px flex-1 bg-slate-200"/></div>

              <button type="button" onClick={()=>window.dispatchEvent(new Event("trafo-open-viewer-otp"))} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">👁 Misafir Girişi</button>

              <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-slate-400"><span>🔒</span><span>Tüm verileriniz güvenle korunmaktadır.</span></div>
            </form>
          </div>

          <div className="mt-7 text-center text-[11px] leading-5 text-slate-400">© {new Date().getFullYear()} Balıkesir Trafo Değişim Sistemi<br/>Tüm hakları saklıdır.</div>
        </div>
      </section>
    </div>
  </main>;

  return <main data-page={sayfa} data-overview={genelGorunum?"true":undefined} className="min-h-screen w-screen max-w-[100vw] overflow-x-hidden bg-[#f4f7fb] text-[#12213a]">
    {mobilMenuAcik&&<div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={()=>setMobilMenuAcik(false)}/>}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-[310px] flex-col border-r border-slate-200 bg-white text-slate-800 shadow-2xl transition-transform lg:hidden ${mobilMenuAcik?"translate-x-0":"-translate-x-full"}`}>
      <div className="flex items-start justify-between border-b border-slate-200 px-5 py-6"><div className="flex items-center gap-3"><div className="text-4xl text-orange-500">⚡</div><div><div className="text-sm font-black tracking-wide text-[#12315b]">BALIKESİR</div><div className="mt-0.5 text-xs font-bold tracking-[.08em] text-[#12315b]">TRAFO DEĞİŞİMİ</div></div></div><button onClick={()=>setMobilMenuAcik(false)} className="h-10 w-10 rounded-xl border border-slate-200 bg-slate-50 text-xl text-slate-500">×</button></div>
      <Nav sayfa={sayfa} duzenlenenId={duzenlenenId} formTemizle={formTemizle} git={sayfayaGit} bolumeGit={bolumeGit} misafirModu={misafirModu} rol={kullaniciRolu}/>
      <div className="border-t border-slate-200 p-4"><div className="mb-3 break-all text-xs text-slate-500">{misafirModu ? "👁 Görüntüleme Modu" : <>{session?.user.email}<span className="ml-2 rounded-full bg-orange-500/15 px-2 py-1 text-[9px] font-black uppercase text-orange-300">{kullaniciRolu}</span></>}</div>{!misafirModu&&<CentralPasswordChange/>}<button onClick={cikisYap} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold">Çıkış Yap</button></div>
    </aside>

    <div className="flex min-h-screen w-full max-w-full">
      <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-[248px] flex-col border-r border-slate-200 bg-white text-slate-800 lg:flex"><div className="border-b border-slate-200 px-5 py-6"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-xl text-white shadow-sm">⚡</div><div><div className="text-[15px] font-bold tracking-tight text-slate-900">BALIKESİR</div><div className="text-[10px] font-semibold tracking-[.15em] text-slate-500">TRAFO DEĞİŞİMİ</div></div></div></div><Nav sayfa={sayfa} duzenlenenId={duzenlenenId} formTemizle={formTemizle} git={sayfayaGit} bolumeGit={bolumeGit} misafirModu={misafirModu} rol={kullaniciRolu}/><div className="mt-auto border-t border-slate-200 p-4"><div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="truncate text-xs font-semibold text-slate-700">{misafirModu ? "👁 Görüntüleme Modu" : session?.user.email}</div>{!misafirModu&&<span className="mt-2 inline-flex rounded-full bg-blue-100 px-2 py-1 text-[9px] font-black uppercase text-blue-700">{kullaniciRolu}</span>}</div>{!misafirModu&&<CentralPasswordChange/>}<button onClick={cikisYap} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">↪ Çıkış Yap</button></div></aside>

      <section className="w-full min-w-0 max-w-full flex-1 overflow-x-hidden lg:ml-[248px]">
        <header className="sticky top-0 z-30 flex min-h-[64px] items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5 sm:px-5 lg:px-6"><button onClick={()=>setMobilMenuAcik(true)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-700 shadow-sm lg:hidden">☰</button>{sayfa==="yeni"&&<div id="new-record-top-brand" className="hidden min-w-[310px] items-center gap-3 lg:flex"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-lg text-blue-700">◫</div><div><div className="text-[18px] font-black tracking-tight text-slate-900">Balıkesir Trafo Değişimi</div><div className="mt-0.5 text-[10px] font-medium text-slate-400">Sürdürülebilir enerji altyapısı için güvenilir kayıt sistemi</div></div></div>}<div className="relative min-w-0 flex-1 sm:min-w-[280px] sm:max-w-xl"><div className="relative"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">⌕</span><input value={genelArama} onFocus={()=>setGenelAramaAcik(true)} onChange={e=>{setGenelArama(e.target.value);setGenelAramaAcik(true);}} placeholder="Kayıt, trafo, mahalle veya seri no ara..." className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></div>{genelAramaAcik&&genelArama.trim().length>=2&&<div className="absolute left-0 right-0 top-[54px] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,.18)]"><div className="max-h-[420px] overflow-y-auto p-2"><div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Trafo Kayıtları</div>{genelAramaSonuclari.kayit.length?genelAramaSonuclari.kayit.map(k=><button key={`k-${k.id}`} type="button" onClick={()=>{setDetayKayit(k);setGenelAramaAcik(false);}} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left hover:bg-blue-50"><div className="min-w-0"><div className="truncate text-xs font-black text-slate-800">{k.ilce||"-"} / {k.mahalle||"-"} • {k.trafo_id||k.tr||"Trafo"}</div><div className="mt-1 text-[10px] text-slate-400">{tarihGoster(k.tarih)} • {k.degisim_nedeni||"-"}</div></div><span className="text-blue-600">→</span></button>):<div className="px-3 py-2 text-xs text-slate-400">Kayıt bulunamadı.</div>}</div></div>}</div><div className="ml-auto flex items-center gap-2"><div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:flex"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">{misafirModu?"M":(session?.user.email?.charAt(0).toUpperCase()||"K")}</div><div className="min-w-0"><div className="max-w-[150px] truncate text-[11px] font-black text-slate-800">{misafirModu?"Misafir":(session?.user.email||"Kullanıcı")}</div><div className="text-[9px] text-slate-400">{misafirModu?"Görüntüleme":kullaniciRolu}</div></div></div></div></header>

        <div className="mx-auto w-full min-w-0 max-w-[1700px] p-3 sm:p-5 lg:p-6">
          
          {genelHata&&<HataKutusu>{genelHata}</HataKutusu>}{basariMesaji&&<div className="mb-5 rounded-xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">{basariMesaji}</div>}

          {genelGorunum&&<>
            <div id="dashboard-hero" className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.18em] text-blue-500">Genel Bakış</div>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{analizSayfasi?.baslik||"Dashboard"}</h1>
                <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">{analizSayfasi?.aciklama||"Trafo değişimlerinin güncel durumu ve son hareketleri."}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={manuelVerileriGuncelle} disabled={manuelGuncelleniyor||!session||!yetkiHazir} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-black text-emerald-700 shadow-sm hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60">{manuelGuncelleniyor?"⟳ Güncelleniyor…":"⟳ Verileri Güncelle"}</button>
                <button type="button" onClick={()=>sayfayaGit("kayitlar")} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-600 shadow-sm hover:bg-slate-50">📋 Kayıtlar</button>
                {duzenleyebilir&&<button type="button" onClick={()=>{formTemizle();sayfayaGit("yeni");}} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-blue-200 hover:bg-blue-700">+ Yeni Kayıt</button>}
              </div>
            </div>
            {sayfa==="dashboard"&&<div id="dashboard-kpis" className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-5">
              <OzetKart ikon="⚡" baslik="TOPLAM DEĞİŞİM" deger={String(kayitlar.length)} alt="Tüm zamanlar"/>
              <OzetKart ikon="📅" baslik="BU AY" deger={String(buAyKayitSayisi)} alt={`${AYLAR[new Date().getMonth()]} ${new Date().getFullYear()}`}/>
              <OzetKart ikon="🚨" baslik="ARIZA" deger={String(kayitlar.filter(k=>norm(k.degisim_nedeni)==="ARIZA").length)} alt="Toplam arıza kaydı"/>
                <OzetKart ikon={yilKarsilastirma.oran===null?"↔":yilKarsilastirma.oran>=0?"↗":"↘"} baslik="GEÇEN YILA GÖRE" deger={yilKarsilastirma.oran===null?"—":`${yilKarsilastirma.oran>=0?"+":""}${yilKarsilastirma.oran.toFixed(1)}%`} alt={`${yilKarsilastirma.y-1}: ${yilKarsilastirma.once} • ${yilKarsilastirma.y}: ${yilKarsilastirma.simdi}`}/>
            </div>}
            <div id="dashboard-filters" className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,.07)] ring-1 ring-slate-100">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[1fr_1fr_1fr_1fr_auto_auto] 2xl:items-end">
                <Alan baslik="YIL"><select value={dashboardYil} onChange={e=>setDashboardYil(e.target.value)} className={inputSinif}><option value="">Tüm Yıllar</option>{yillar.map(y=><option key={y}>{y}</option>)}</select></Alan>
                <Alan baslik="İLÇE"><select value={dashboardIlce} onChange={e=>setDashboardIlce(e.target.value)} className={inputSinif}><option value="">Tüm İlçeler</option>{ilceler.map(i=><option key={i}>{i}</option>)}</select></Alan>
                <Alan baslik="BAŞLANGIÇ TARİHİ"><input type="date" value={dashboardBaslangic} onChange={e=>setDashboardBaslangic(e.target.value)} className={inputSinif}/></Alan>
                <Alan baslik="BİTİŞ TARİHİ"><input type="date" value={dashboardBitis} onChange={e=>setDashboardBitis(e.target.value)} className={inputSinif}/></Alan>
                <button onClick={()=>{setDashboardYil("");setDashboardIlce("");setDashboardBaslangic("");setDashboardBitis("");setDashboardHizliFiltre("");}} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold hover:bg-slate-100 hover:text-blue-700">Filtreyi Temizle</button>
                <button type="button" onClick={()=>setYoneticiOzetiAcik(x=>!x)} className="rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-black text-indigo-700 hover:bg-indigo-100">📋 Yönetici Özeti</button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 text-xs"><span className="font-bold text-slate-500">Aktif görünüm:</span><Etiket>{dashboardYil||"Tüm Yıllar"}</Etiket><Etiket>{dashboardIlce||"Tüm İlçeler"}</Etiket>{dashboardBaslangic&&<Etiket>Başlangıç: {tarihGoster(dashboardBaslangic)}</Etiket>}{dashboardBitis&&<Etiket>Bitiş: {tarihGoster(dashboardBitis)}</Etiket>}{dashboardHizliFiltre&&<Etiket>{({
  "bu-yil":"Bu Yıl",
  son30:"Son 30 Gün",
  ariza:"Arıza",
  donusum:"Dönüşüm",
  "guc-degisimi":"Güç Değişimi",
  "trafo-iptal":"Trafo İptal",
  yatirim:"Yatırım",
  "yeni-tesis":"Yeni Tesis",
  "ariza-riski":"Arıza Riski",
  "kismi-arizali":"Kısmi Arızalı",
  "tarihi-bos":"Tarihi Boş",
  "guc-artisi":"Güç Artışı",
  "guc-azalisi":"Güç Azalışı",
  "ayni-guc":"Aynı Güç"
} as Record<string,string>)[dashboardHizliFiltre]}</Etiket>}<span className="ml-auto hidden text-slate-500 sm:inline">{dashboardKayitlari.length} kayıt</span></div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="mr-1 self-center text-[10px] font-black uppercase tracking-wider text-slate-600">Hızlı Filtre</span>
                <HizliFiltre aktif={dashboardHizliFiltre===""} onClick={()=>setDashboardHizliFiltre("")}>Tümü</HizliFiltre>
                <HizliFiltre aktif={dashboardHizliFiltre==="bu-yil"} onClick={()=>setDashboardHizliFiltre("bu-yil")}>Bu Yıl</HizliFiltre>
                <HizliFiltre aktif={dashboardHizliFiltre==="son30"} onClick={()=>setDashboardHizliFiltre("son30")}>Son 30 Gün</HizliFiltre>
                <HizliFiltre aktif={dashboardHizliFiltre==="ariza"} onClick={()=>setDashboardHizliFiltre("ariza")}>Arıza</HizliFiltre>
                <HizliFiltre aktif={dashboardHizliFiltre==="donusum"} onClick={()=>setDashboardHizliFiltre("donusum")}>Dönüşüm</HizliFiltre>
                <HizliFiltre aktif={dashboardHizliFiltre==="guc-degisimi"} onClick={()=>setDashboardHizliFiltre("guc-degisimi")}>Güç Değişimi</HizliFiltre>
                <HizliFiltre aktif={dashboardHizliFiltre==="trafo-iptal"} onClick={()=>setDashboardHizliFiltre("trafo-iptal")}>Trafo İptal</HizliFiltre>
                <HizliFiltre aktif={dashboardHizliFiltre==="yatirim"} onClick={()=>setDashboardHizliFiltre("yatirim")}>Yatırım</HizliFiltre>
                <HizliFiltre aktif={dashboardHizliFiltre==="yeni-tesis"} onClick={()=>setDashboardHizliFiltre("yeni-tesis")}>Yeni Tesis</HizliFiltre>
                <HizliFiltre aktif={dashboardHizliFiltre==="ariza-riski"} onClick={()=>setDashboardHizliFiltre("ariza-riski")}>Arıza Riski</HizliFiltre>
                <HizliFiltre aktif={dashboardHizliFiltre==="kismi-arizali"} onClick={()=>setDashboardHizliFiltre("kismi-arizali")}>Kısmi Arızalı</HizliFiltre>
                <HizliFiltre aktif={dashboardHizliFiltre==="tarihi-bos"} onClick={()=>setDashboardHizliFiltre("tarihi-bos")}>Tarihi Boş</HizliFiltre>
                <HizliFiltre aktif={dashboardHizliFiltre==="guc-artisi"} onClick={()=>setDashboardHizliFiltre("guc-artisi")}>Güç Artışı</HizliFiltre>
                <HizliFiltre aktif={dashboardHizliFiltre==="guc-azalisi"} onClick={()=>setDashboardHizliFiltre("guc-azalisi")}>Güç Azalışı</HizliFiltre>
                <HizliFiltre aktif={dashboardHizliFiltre==="ayni-guc"} onClick={()=>setDashboardHizliFiltre("ayni-guc")}>Aynı Güç</HizliFiltre>
              </div>
            </div>

            {yoneticiOzetiAcik&&<div className="mb-5 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4 shadow-[0_10px_32px_rgba(15,23,42,.07)] sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><div className="text-[10px] font-black uppercase tracking-[.16em] text-indigo-500">Yönetici Özeti</div><div className="mt-1 text-lg font-black text-slate-900">{dashboardYil||BU_YIL} görünümünün hızlı özeti</div></div>
                <button type="button" onClick={()=>setYoneticiOzetiAcik(false)} className="self-start rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-black text-indigo-600">Kapat</button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
                <MiniYoneticiKart ikon="📅" baslik="BU YIL" deger={String(yoneticiOzeti.buYil)} alt="Toplam değişim"/>
                <MiniYoneticiKart ikon="📍" baslik="EN YOĞUN İLÇE" deger={String(yoneticiOzeti.enIlce[0])} alt={`${yoneticiOzeti.enIlce[1]} kayıt`}/>
                <MiniYoneticiKart ikon="⚡" baslik="EN ÇOK TAKILAN GÜÇ" deger={`${yoneticiOzeti.enGuc[0]}${yoneticiOzeti.enGuc[0]!=="-"?" kVA":""}`} alt={`${yoneticiOzeti.enGuc[1]} kayıt`}/>
                <MiniYoneticiKart ikon="🏷️" baslik="EN SIK NEDEN" deger={String(yoneticiOzeti.enNeden[0])} alt={`${yoneticiOzeti.enNeden[1]} kayıt`}/>
                <button type="button" onClick={()=>sayfayaGit("veri-kalite")} className="col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:bg-amber-100 lg:col-span-1"><div className="text-[10px] font-black uppercase text-amber-600">VERİ KALİTESİ</div><div className="mt-1 text-2xl font-black text-amber-900">{veriKaliteMerkezi.toplam}</div><div className="mt-1 text-[10px] font-bold text-amber-700">Kontrol edilmesi gereken alan →</div></button>
              </div>
            </div>}

            {sayfa==="dashboard"&&<>
            <div id="dashboard-scope-kpis" className="grid grid-cols-2 gap-3.5 xl:grid-cols-4"><KpiKart baslik="TOPLAM KAYIT" sayi={dashboardKayitlari.length} renk="#f97316" onClick={()=>kayitListesineGit({yil:dashboardYil,ilce:dashboardIlce,baslangic:dashboardBaslangic,bitis:dashboardBitis})}/><KpiKart baslik={seciliNedenKpi.ad} sayi={nedenSayilari[seciliNedenKpi.ad]||0} renk={seciliNedenKpi.renk} onClick={()=>kayitListesineGit({yil:dashboardYil,ilce:dashboardIlce,neden:seciliNedenKpi.ad,baslangic:dashboardBaslangic,bitis:dashboardBitis})}/><OzetKart ikon="📅" baslik="SON 30 GÜN" deger={String(son30Gun)} alt="Trafo değişim kaydı"/><OzetKart ikon="📍" baslik="EN YOĞUN İLÇE" deger={String(enCokIlce[0])} alt={`${enCokIlce[1]} kayıt`} onClick={()=>enCokIlce[0]!=="-"&&kayitListesineGit({ilce:String(enCokIlce[0]),yil:dashboardYil,baslangic:dashboardBaslangic,bitis:dashboardBitis})}/></div>

            </>}

            {sayfa==="dashboard"&&<><DashboardChartRow year={dashboardYil}><div id="degisim-nedenleri" className="mt-5 grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] scroll-mt-24 items-stretch gap-3.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <Panel baslik="Değişim Nedenleri" altBaslik="Seçili filtreye göre dağılım" className="h-full" daraltilabilir acik={acikAnalizler["degisim-nedenleri"]} onToggle={()=>analizAcKapa("degisim-nedenleri")}>
                <div className="trafo-reason-layout flex min-h-[430px] flex-col"><div className="trafo-donut-wrap flex flex-1 items-center justify-center py-5"><div className="trafo-donut relative h-44 w-44 rounded-full sm:h-48 sm:w-48" style={{background:`conic-gradient(${donutGradient})`}}><div className="absolute inset-7 flex flex-col items-center justify-center rounded-full border border-slate-200 bg-white"><div className="text-3xl font-black">{dashboardKayitlari.length}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Toplam</div></div></div></div>
                  <div className="trafo-reason-list grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">{NEDENLER.map(n=><button type="button" onClick={()=>kayitListesineGit({yil:dashboardYil,ilce:dashboardIlce,neden:n.ad,baslangic:dashboardBaslangic,bitis:dashboardBitis})} key={n.ad} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/60"><div className="flex min-w-0 items-center gap-2.5"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{backgroundColor:n.renk}}/><span className="truncate text-[11px] font-bold text-slate-700">{n.ad}</span></div><span className="ml-3 text-sm font-black">{nedenSayilari[n.ad]||0} →</span></button>)}</div>
                </div>
              </Panel>
            </div>
<div id="zaman-analizi" className="min-w-0 max-w-full overflow-hidden scroll-mt-24"><Panel baslik="Yıllara Göre Değişim Nedenleri" altBaslik="Tüm yıllar için grafiği sağa-sola kaydırın" className="h-full" daraltilabilir acik={acikAnalizler["zaman-analizi"]} onToggle={()=>analizAcKapa("zaman-analizi")}><GrafikLegend/><BarChart items={yillikNedenler.map(x=>({label:String(x.yil),total:x.toplam,values:x.nedenler}))} max={maxYillik} compact onBarClick={(label,neden)=>kayitListesineGit({yil:label,ilce:dashboardIlce,neden})}/></Panel></div>

            </DashboardChartRow>
            <div id="dashboard-monthly" data-has-year={!!dashboardYil} className="mt-5 min-w-0 max-w-full overflow-hidden"><Panel baslik="Aylara Göre Değişim Nedenleri" altBaslik={dashboardYil?`${dashboardYil} yılı aylık dağılımı`:"Aylık dağılım için yukarıdan bir yıl seçin"}>{dashboardYil?<BarChart items={aylikNedenler.map(x=>({label:x.ay.substring(0,3),total:x.toplam,values:x.nedenler}))} max={maxAylik} aylik compact onBarClick={(label,neden)=>kayitListesineGit({yil:dashboardYil,ilce:dashboardIlce,ay:AYLAR.find(a=>a.substring(0,3)===label)||"",neden})}/>:<BosAlan>Aylık grafiği görüntülemek için yıl seçiniz.</BosAlan>}</Panel></div>

            </>}

            {sayfa==="neden-guc-analizi"&&<>
            <ViewportAnalysis id="neden-guc-analizi">
              <Panel
                baslik="Güç Değişim Dağılımı"
                altBaslik="Seçili filtreye göre karşılaştırılabilir kayıtlar ve güç geçişleri"
                daraltilabilir acik={acikAnalizler["neden-guc-analizi"]} onToggle={()=>analizAcKapa("neden-guc-analizi")}
              >
                <div className="ng-kpis mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <GucKpi baslik="GÜÇ ARTIRILAN" sayi={gucAnalizi.artan} alt={`%${((gucAnalizi.artan/gucToplam)*100).toFixed(1)}`} ikon="↗" ton="emerald"/>
                  <GucKpi baslik="GÜÇ AZALTILAN" sayi={gucAnalizi.azalan} alt={`%${((gucAnalizi.azalan/gucToplam)*100).toFixed(1)}`} ikon="↘" ton="red"/>
                  <GucKpi baslik="AYNI GÜÇ" sayi={gucAnalizi.ayni} alt={`%${((gucAnalizi.ayni/gucToplam)*100).toFixed(1)}`} ikon="→" ton="blue"/>
                  <GucKpi baslik="KARŞILAŞTIRILABİLEN" sayi={gucAnalizi.karsilastirilabilir} alt={`${dashboardKayitlari.length} toplam kayıttan`} ikon="⚡" ton="orange"/>
                </div>

                <div className="ng-analysis-grid">
                  <section className="ng-card ng-distribution" aria-labelledby="ng-distribution-title">
                    <div className="ng-card-heading"><h3 id="ng-distribution-title">Nedenlere Göre Güç Dağılımı</h3><p>Artan, aynı kalan ve azalan güç kayıtları</p></div>
                    <div className="ng-table-scroll" tabIndex={0} aria-label="Güç dağılımı tablosunu kaydır">
                      <table className="ng-table">
                        <colgroup><col style={{width:"24%"}}/><col style={{width:"9%"}}/><col style={{width:"17%"}}/><col style={{width:"17%"}}/><col style={{width:"17%"}}/><col style={{width:"16%"}}/></colgroup>
                        <thead><tr><th scope="col">Değişim Nedeni</th><th scope="col">Kayıt</th><th scope="col" className="ng-up">↗ Artan</th><th scope="col" className="ng-same">→ Aynı</th><th scope="col" className="ng-down">↘ Azalan</th><th scope="col">Artış Oranı</th></tr></thead>
                        <tbody>{nedenGucAnalizi.length===0&&<tr><td colSpan={6} className="ng-empty">Seçili filtrelerde kayıt bulunamadı.</td></tr>}{nedenGucAnalizi.map(item=><tr key={item.neden}>
                          <th scope="row"><span className="ng-reason"><span className="ng-dot" style={{backgroundColor:item.renk}}/>{item.neden}</span></th>
                          <td className="ng-count">{item.karsilastirilabilir}</td>
                          <td><NedenGucHucre sayi={item.artan} oran={item.artisOrani} ton="emerald"/></td>
                          <td><NedenGucHucre sayi={item.ayni} oran={item.ayniOrani} ton="blue"/></td>
                          <td><NedenGucHucre sayi={item.azalan} oran={item.azalisOrani} ton="red"/></td>
                          <td className="ng-up ng-count">%{item.artisOrani.toFixed(1)}</td>
                        </tr>)}</tbody>
                      </table>
                    </div>
                  </section>
                  <section className="ng-card ng-transitions" aria-labelledby="ng-transitions-title">
                    <div className="ng-card-heading"><h3 id="ng-transitions-title">En Sık Güç Geçişleri (kVA) <span className="ng-count-heading">Kayıt</span></h3><p>Sökülen → takılan güç (kVA)</p></div>
                    <div className="ng-transition-list" tabIndex={0} aria-label="Nedenlere göre güç geçişleri">
                      {nedenGucAnalizi.length===0&&<p className="ng-empty">Seçili filtrelerde kayıt bulunamadı.</p>}
                      {nedenGucAnalizi.map(item=><div className="ng-transition" key={item.neden}>
                        <span className="ng-reason"><span className="ng-dot" style={{backgroundColor:item.renk}}/>{item.neden}</span>
                        <strong>{item.enSikGecisSayisi?item.enSikGecis:"Veri yok"}</strong>
                        <span className="ng-transition-count" title={`${item.enSikGecisSayisi} kayıt`}>{item.enSikGecisSayisi}</span>
                      </div>)}
                    </div>
                  </section>
                </div>

                <div className="ng-highlights mt-5">
                  <h3 className="mb-3 text-sm font-black">Öne Çıkan Özetler</h3>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <OzelOzet
                      baslik="GÜÇ DEĞİŞİMİ: ARTIŞ ORANI"
                      deger={gucDegisimiNedeni ? `%${gucDegisimiNedeni.artisOrani.toFixed(1)}` : "-"}
                      alt={gucDegisimiNedeni ? `${gucDegisimiNedeni.artan} / ${gucDegisimiNedeni.karsilastirilabilir} kayıt` : "Veri yok"}
                      ton="emerald"
                    />
                    <OzelOzet
                      baslik="ARIZA: ARTIŞ ORANI"
                      deger={arizaNedeni ? `%${arizaNedeni.artisOrani.toFixed(1)}` : "-"}
                      alt={arizaNedeni ? `${arizaNedeni.artan} / ${arizaNedeni.karsilastirilabilir} kayıt` : "Veri yok"}
                      ton="red"
                    />
                    <OzelOzet
                      baslik="EN YÜKSEK ARTIŞ ORANI"
                      deger={enYuksekArtisNedeni ? `%${enYuksekArtisNedeni.artisOrani.toFixed(1)}` : "-"}
                      alt={enYuksekArtisNedeni ? enYuksekArtisNedeni.neden : "Veri yok"}
                      ton="purple"
                    />
                    <OzelOzet
                      baslik="EN DÜŞÜK ARTIŞ ORANI"
                      deger={enDusukArtisNedeni ? `%${enDusukArtisNedeni.artisOrani.toFixed(1)}` : "-"}
                      alt={enDusukArtisNedeni ? enDusukArtisNedeni.neden : "Veri yok"}
                      ton="blue"
                    />
                  </div>
                </div>
              </Panel>
            </ViewportAnalysis>

            </>}

            {sayfa==="ilce-analizi"&&<ViewportAnalysis id="ilce-analizi">
              <Panel baslik="İlçe Dağılımı" altBaslik={dashboardYil?`${dashboardYil} yılı seçili kayıtları`:"Tüm yıllar için seçili kayıtlar"} daraltilabilir acik={acikAnalizler["ilce-analizi"]} onToggle={()=>analizAcKapa("ilce-analizi")}>
                <DistrictAnalysis items={ilceAnalizi} filterKey={[dashboardYil,dashboardIlce,dashboardBaslangic,dashboardBitis,dashboardHizliFiltre].join("|")} onDistrictClick={setAcikIlce}/>
              </Panel>
            </ViewportAnalysis>}

            {sayfa==="trafo-guc-analizi"&&<>
            <ViewportAnalysis id="trafo-guc-analizi">
              <Panel
                baslik="Güç Karşılaştırması"
                altBaslik="Sökülen ve takılan trafo güçlerinin karşılaştırması"
                daraltilabilir acik={acikAnalizler["trafo-guc-analizi"]} onToggle={()=>analizAcKapa("trafo-guc-analizi")}
              >
                <div className="ng-kpis mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <GucKpi baslik="GÜÇ ARTIRILAN" sayi={gucAnalizi.artan} alt={`%${((gucAnalizi.artan/gucToplam)*100).toFixed(1)}`} ikon="↗" ton="emerald"/>
                  <GucKpi baslik="GÜÇ AZALTILAN" sayi={gucAnalizi.azalan} alt={`%${((gucAnalizi.azalan/gucToplam)*100).toFixed(1)}`} ikon="↘" ton="red"/>
                  <GucKpi baslik="AYNI GÜÇ" sayi={gucAnalizi.ayni} alt={`%${((gucAnalizi.ayni/gucToplam)*100).toFixed(1)}`} ikon="→" ton="blue"/>
                  <GucKpi baslik="KARŞILAŞTIRILABİLEN" sayi={gucAnalizi.karsilastirilabilir} alt={`${dashboardKayitlari.length} toplam kayıttan`} ikon="⚡" ton="orange"/>
                </div>

                <div className="ng-analysis-grid power-panels">
                  <section className="ng-card power-card" aria-labelledby="installed-power-title">
                    <div className="ng-card-heading power-heading"><div><h3 id="installed-power-title">En Çok Kullanılan Takılan Güçler</h3><p>İlk 8 güç değeri · toplam içindeki payı</p></div><span className="power-leading">{gucAnalizi.takilanSirali.length?`${gucAnalizi.enCokTakilan[0]} kVA`:"Veri yok"}</span></div>
                    <div className="ng-table-scroll"><table className="ng-table power-table" data-full={gucAnalizi.takilanSirali.length===8}><colgroup><col style={{width:"28%"}}/><col style={{width:"17%"}}/><col style={{width:"18%"}}/><col style={{width:"37%"}}/></colgroup><thead><tr><th scope="col">Güç (kVA)</th><th scope="col">Kayıt</th><th scope="col">Pay</th><th scope="col">Dağılım</th></tr></thead><tbody>{gucAnalizi.takilanSirali.length?gucAnalizi.takilanSirali.map(([guc,sayi])=>{
                      const share=takilanGucKayitSayisi?Number(sayi)/takilanGucKayitSayisi*100:0;
                      return <tr key={guc}><th scope="row">{guc}</th><td className="ng-count">{sayi}</td><td>%{share.toFixed(1)}</td><td><div className="power-track"><div style={{width:`${share}%`}}/></div></td></tr>;
                    }):<tr><td colSpan={4} className="ng-empty">Takılan güç verisi bulunmuyor.</td></tr>}</tbody></table></div>
                  </section>
                  <section className="ng-card power-card" aria-labelledby="power-transitions-title">
                    <div className="ng-card-heading power-heading"><div><h3 id="power-transitions-title">En Sık Güç Geçişleri</h3><p>Sökülen → takılan güç (kVA) · ilk 8 geçiş</p></div><span className="power-leading power-leading-removed">{gucAnalizi.gecisSirali.length?`${gucAnalizi.enCokSokulen[0]} kVA sökülen`:"Veri yok"}</span></div>
                    <div className="ng-table-scroll"><table className="ng-table power-table power-transition-table" data-full={gucAnalizi.gecisSirali.length===8}><colgroup><col style={{width:"40%"}}/><col style={{width:"17%"}}/><col style={{width:"18%"}}/><col style={{width:"25%"}}/></colgroup><thead><tr><th scope="col">Güç Geçişi</th><th scope="col">Kayıt</th><th scope="col">Pay</th><th scope="col">Dağılım</th></tr></thead><tbody>{gucAnalizi.gecisSirali.length?gucAnalizi.gecisSirali.map(([gecis,sayi])=>{
                      const share=Number(sayi)/gucToplam*100;
                      return <tr key={gecis}><th scope="row">{gecis}</th><td className="ng-count">{sayi}</td><td>%{share.toFixed(1)}</td><td><div className="power-track power-track-blue"><div style={{width:`${share}%`}}/></div></td></tr>;
                    }):<tr><td colSpan={4} className="ng-empty">Karşılaştırılabilir güç geçişi bulunmuyor.</td></tr>}</tbody></table></div>
                  </section>
                </div>
              </Panel>
            </ViewportAnalysis>

            </>}

          </>}

          {sayfa==="yeni"&&duzenleyebilir&&<form onSubmit={kaydet} className="space-y-5 trafo-new-record">
            <div id="new-record-hero" className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{duzenlenenId?"Trafo Kaydını Düzenle":"Yeni Trafo Değişim Kaydı"}</h1>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700">{duzenlenenId?"…11927 tokens truncated…0">＋ Yeni Marka Ekle</button>
              </div>
              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="brands-row brands-heading border-b border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500"><div>Marka</div><div>Durum</div><div className="text-right">İşlem</div></div>
                {markaGorunen.length?markaGorunen.map(m=><div key={m.id} className="brands-row brands-data items-center gap-2 border-b border-slate-100 px-4 py-3 last:border-0">
                  <div>{markaDuzenlenenId===m.id?<input autoFocus value={markaDuzenlenenAd} onChange={e=>setMarkaDuzenlenenAd(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();trafoMarkasiGuncelle(m.id);}if(e.key==="Escape"){setMarkaDuzenlenenId(null);setMarkaDuzenlenenAd("");}}} className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm font-bold outline-none ring-2 ring-blue-500/10"/>:<span className={`text-sm font-black ${m.aktif?"text-slate-800":"text-slate-400 line-through"}`}>{m.ad}</span>}</div>
                  <div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${m.aktif?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-500"}`}>{m.aktif?"AKTİF":"PASİF"}</span></div>
                  <div className="flex justify-end gap-2">{markaDuzenlenenId===m.id?<><button type="button" disabled={markaIslem} onClick={()=>trafoMarkasiGuncelle(m.id)} className="rounded-lg border border-emerald-300 px-2.5 py-2 text-xs font-bold text-emerald-700">Kaydet</button><button type="button" onClick={()=>{setMarkaDuzenlenenId(null);setMarkaDuzenlenenAd("");}} className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-bold text-slate-600">İptal</button></>:<><button type="button" onClick={()=>{setMarkaDuzenlenenId(m.id);setMarkaDuzenlenenAd(m.ad);}} className="rounded-lg border border-blue-300 px-2.5 py-2 text-xs font-bold text-blue-600">Düzenle</button><button type="button" disabled={markaIslem} onClick={()=>trafoMarkasiAktiflikDegistir(m)} className={`rounded-lg border px-2.5 py-2 text-xs font-bold ${m.aktif?"border-amber-300 text-amber-700":"border-emerald-300 text-emerald-700"}`}>{m.aktif?"Pasife Al":"Aktif Et"}</button></>}</div>
                </div>):<div className="p-6 text-center text-sm text-slate-500">{markaYukleniyor?"Markalar yükleniyor…":markaHata?"Marka listesi alınamadı.":trafoMarkalari.length?"Filtrelere uygun marka bulunamadı.":"Henüz marka eklenmemiş."}</div>}
              </div>
              <div className="brands-pagination"><span>{markaFiltreli.length?`${(markaGecerliSayfa-1)*10+1}–${Math.min(markaGecerliSayfa*10,markaFiltreli.length)}`:"0"} / {markaFiltreli.length} marka · Sayfa {markaGecerliSayfa} / {markaSayfaSayisi}</span><div><button type="button" disabled={markaGecerliSayfa===1} onClick={()=>setMarkaSayfa(markaGecerliSayfa-1)}>Önceki</button><b>{markaGecerliSayfa} / {markaSayfaSayisi}</b><button type="button" disabled={markaGecerliSayfa===markaSayfaSayisi} onClick={()=>setMarkaSayfa(markaGecerliSayfa+1)}>Sonraki</button></div></div>
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-800"><b>Not:</b> Bir markayı pasife almak eski kayıtlardaki marka bilgisini silmez; yalnızca yeni kayıt ekranındaki seçim listesinden kaldırır.</div>
            </Panel></div>
          </>}

        </div>
      </section>
    </div>
    
    {sayfa==="ilce-analizi"&&acikIlce!==null&&typeof document!=="undefined"&&createPortal(<DistrictRecordsDialog district={acikIlce} records={dashboardKayitlari.filter(record=>((record.ilce||"BELİRTİLMEMİŞ").trim()||"BELİRTİLMEMİŞ")===acikIlce)} onClose={()=>setAcikIlce(null)}/>,document.body)}
    {detayKayit&&typeof document!=="undefined"&&createPortal(<DetayModal
      kayit={detayKayit}
      kapat={()=>setDetayKayit(null)}
      duzenle={kaydiDuzenle}
      yazdir={tekKayitYazdir}
      gecmis={()=>setGecmisKayit(detayKayit)}
      duzenleyebilir={duzenleyebilir}
      onceki={detayOnceki?()=>setDetayKayit(detayOnceki):undefined}
      sonraki={detaySonraki?()=>setDetayKayit(detaySonraki):undefined}
    />,document.body)}
    {gecmisKayit&&<TrafoGecmisModal kapsam={gecmisKapsami} kapsamDegistir={setGecmisKapsami} anaKayit={gecmisKayit} kayitlar={gecmisKayitlari} kapat={()=>setGecmisKayit(null)} detay={k=>{setGecmisKayit(null);setDetayKayit(k);}}/>}

    {excelOnizleme&&<div className="fixed inset-0 z-[96] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={()=>!excelIceAktariliyor&&setExcelOnizleme(null)}><div onMouseDown={e=>e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5"><div><div className="text-[10px] font-black uppercase text-cyan-600">📤 Excel İçe Aktarma • Önizleme</div><div className="mt-1 text-lg font-black text-slate-900">{excelOnizleme.dosyaAdi}</div><div className="mt-1 text-xs text-slate-500">{excelOnizleme.kayitlar.length} satır bulundu • {excelOnizleme.hatalar.length} uyarı</div></div><button disabled={excelIceAktariliyor} onClick={()=>setExcelOnizleme(null)} className="h-9 w-9 rounded-xl border border-slate-200">×</button></div><div className="overflow-auto p-5">{excelOnizleme.hatalar.length>0&&<div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3"><div className="text-xs font-black text-amber-800">Uyarılar</div>{excelOnizleme.hatalar.slice(0,8).map(x=><div key={x} className="mt-1 text-[10px] text-amber-700">• {x}</div>)}</div>}<div className="overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50"><tr>{["YIL","AY","İLÇE","MAHALLE","TRAFO ID","TARİH","NEDEN"].map(x=><th key={x} className="px-3 py-2">{x}</th>)}</tr></thead><tbody>{excelOnizleme.kayitlar.slice(0,20).map((r,i)=><tr key={i} className="border-t border-slate-100"><td className="px-3 py-2">{String(r.yil??"")}</td><td className="px-3 py-2">{String(r.ay??"")}</td><td className="px-3 py-2">{String(r.ilce??"")}</td><td className="px-3 py-2">{String(r.mahalle??"")}</td><td className="px-3 py-2">{String(r.trafo_id??"")}</td><td className="px-3 py-2">{String(r.tarih??"")}</td><td className="px-3 py-2">{String(r.degisim_nedeni??"")}</td></tr>)}</tbody></table></div>{excelOnizleme.kayitlar.length>20&&<div className="mt-2 text-[10px] text-slate-400">İlk 20 satır gösteriliyor.</div>}</div><div className="flex justify-end gap-2 border-t border-slate-200 p-4"><button disabled={excelIceAktariliyor} onClick={()=>setExcelOnizleme(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600">Vazgeç</button><button disabled={excelIceAktariliyor||excelOnizleme.hatalar.length>0} onClick={excelOnizlemeyiAktar} className="rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-black text-white disabled:opacity-40">{excelIceAktariliyor?"Aktarılıyor...":`${excelOnizleme.kayitlar.length} Kaydı Aktar`}</button></div></div></div>}

  </main>;
}

function Nav({sayfa,duzenlenenId,formTemizle,git,bolumeGit,misafirModu,rol}:{sayfa:Sayfa;duzenlenenId:number|null;formTemizle:()=>void;git:(s:Sayfa)=>void;bolumeGit:(id:AnalizSayfa)=>void;misafirModu:boolean;rol:KullaniciRolu}){
  const duzenleyebilir=!misafirModu&&(rol==="admin"||rol==="editor");const admin=!misafirModu&&rol==="admin";
  return <nav className="flex-1 space-y-2 overflow-y-auto p-3"><MenuButonu aktif={sayfa==="dashboard"} onClick={()=>git("dashboard")}>📊 Kontrol Paneli</MenuButonu>
<div className="my-2 border-t border-slate-200 pt-2">
  <div className="mb-1 px-3 text-[9px] font-black uppercase tracking-[.18em] text-slate-600">ANALİZLER</div>
  <MenuAlt aktif={sayfa==="neden-guc-analizi"} onClick={()=>bolumeGit("neden-guc-analizi")}>⚡ Neden × Güç Analizi</MenuAlt>
  <MenuAlt aktif={sayfa==="ilce-analizi"} onClick={()=>bolumeGit("ilce-analizi")}>📍 İlçe Analizi</MenuAlt>
  <MenuAlt aktif={sayfa==="trafo-guc-analizi"} onClick={()=>bolumeGit("trafo-guc-analizi")}>↗ Trafo Güç Analizi</MenuAlt>
</div>
{duzenleyebilir&&<MenuButonu aktif={sayfa==="yeni"&&!duzenlenenId} onClick={()=>{formTemizle();git("yeni");}}>➕ Yeni Kayıt</MenuButonu>}
<MenuButonu aktif={sayfa==="kayitlar"} onClick={()=>git("kayitlar")}>📋 Trafo Kayıtları</MenuButonu>
{admin&&<div className="my-2 border-t border-slate-200 pt-2"><div className="mb-1 px-3 text-[9px] font-black uppercase tracking-[.18em] text-slate-600">YÖNETİM</div><MenuButonu aktif={sayfa==="markalar"} onClick={()=>git("markalar")}>🏷️ Trafo Markaları</MenuButonu><MenuButonu aktif={sayfa==="veri-kalite"} onClick={()=>git("veri-kalite")}>🛡️ Veri Kalitesi</MenuButonu><MenuButonu aktif={sayfa==="yedekleme"} onClick={()=>git("yedekleme")}>💾 Yedekleme Merkezi</MenuButonu></div>}</nav>;
}
function HizliFiltre({children,onClick,aktif}:{children:ReactNode;onClick:()=>void;aktif:boolean}){return <button type="button" onClick={onClick} className={`rounded-lg border px-3 py-2 text-[10px] font-black transition ${aktif?"border-orange-500 bg-orange-500/15 text-orange-300":"border-slate-300 text-slate-400 hover:bg-slate-200 hover:text-white"}`}>{children}</button>}
function MenuAlt({children,onClick,aktif=false}:{children:ReactNode;onClick:()=>void;aktif?:boolean}){return <button type="button" aria-current={aktif?"page":undefined} onClick={onClick} className={`mb-0.5 block w-full rounded-lg border px-3 py-2 text-left text-[11px] font-bold transition ${aktif?"border-orange-500/30 bg-orange-500/15 text-orange-300":"border-transparent text-slate-400 hover:bg-slate-200 hover:text-white"}`}>{children}</button>}
function Alan({baslik,children}:{baslik:string;children:ReactNode}){return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-600">{baslik}</span>{children}</label>}
function MetinAlani({baslik,deger,degistir}:{baslik:string;deger:string;degistir:(v:string)=>void}){return <Alan baslik={baslik}><input value={deger} onChange={e=>degistir(e.target.value)} className={inputSinif}/></Alan>}
function ComboAlani({baslik,deger,degistir,secenekler,listeId,gerekli=false}:{baslik:string;deger:string;degistir:(v:string)=>void;secenekler:string[];listeId:string;gerekli?:boolean}){
  const [acik,setAcik]=useState(false),[arama,setArama]=useState(""),[aktifIndex,setAktifIndex]=useState(-1);
  const [position,setPosition]=useState<{top:number;left:number;width:number;height:number}|null>(null);
  const kutuRef=useRef<HTMLDivElement>(null),anaInputRef=useRef<HTMLInputElement>(null),aramaRef=useRef<HTMLInputElement>(null),popupRef=useRef<HTMLDivElement>(null),listeRef=useRef<HTMLDivElement>(null);
  const q=arama.trim().toLocaleUpperCase("tr-TR");
  const filtreli=q?secenekler.filter(x=>x.toLocaleUpperCase("tr-TR").includes(q)):secenekler;
  const yeniDeger=arama.trim()&&!secenekler.some(x=>x.toLocaleUpperCase("tr-TR")===q)?arama.trim():"";
  const guc=listeId.includes("guc");
  const popupHeight=Math.min(360,136+(filtreli.length?filtreli.length*42:64)+(yeniDeger?42:0));
  const ac=()=>{setArama("");setAktifIndex(Math.max(0,secenekler.indexOf(deger)));setAcik(true)};
  const kapat=(focus=false)=>{setAcik(false);setArama("");if(focus)anaInputRef.current?.focus({preventScroll:true})};
  const sec=(value:string)=>{degistir(value);kapat(true)};
  useEffect(()=>{
    if(!acik)return;
    const konum=()=>{
      const r=kutuRef.current?.getBoundingClientRect();if(!r)return;
      const viewport=window.visualViewport,viewTop=viewport?.offsetTop||0,viewBottom=viewTop+(viewport?.height||window.innerHeight);
      const below=viewBottom-r.bottom-10,above=r.top-viewTop-10,down=below>=240||below>=above;
      const height=Math.min(popupHeight,Math.max(160,(down?below:above))),width=Math.min(Math.max(r.width,280),window.innerWidth-24);
      setPosition({width,height,left:Math.max(12,Math.min(r.left,window.innerWidth-width-12)),top:Math.max(viewTop+8,Math.min(down?r.bottom+7:r.top-height-7,viewBottom-height-8))});
    };
    const outside=(event:PointerEvent)=>{if(!kutuRef.current?.contains(event.target as Node)&&!popupRef.current?.contains(event.target as Node)){setAcik(false);setArama("")}};
    const focus=(event:FocusEvent)=>{if(!kutuRef.current?.contains(event.target as Node)&&!popupRef.current?.contains(event.target as Node)){setAcik(false);setArama("")}};
    const scroll=(event:Event)=>{if(!popupRef.current?.contains(event.target as Node))konum()};
    konum();document.addEventListener("pointerdown",outside);document.addEventListener("focusin",focus);document.addEventListener("scroll",scroll,true);window.addEventListener("resize",konum);window.visualViewport?.addEventListener("resize",konum);
    return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("focusin",focus);document.removeEventListener("scroll",scroll,true);window.removeEventListener("resize",konum);window.visualViewport?.removeEventListener("resize",konum)};
  },[acik,popupHeight]);
  useEffect(()=>{if(acik&&position)aramaRef.current?.focus({preventScroll:true})},[acik,!!position]);
  useEffect(()=>{
    if(!acik)return;
    const item=listeRef.current?.querySelector<HTMLElement>(`[data-index="${aktifIndex}"]`),list=listeRef.current;
    if(item&&list){if(item.offsetTop<list.scrollTop)list.scrollTop=item.offsetTop;else if(item.offsetTop+item.offsetHeight>list.scrollTop+list.clientHeight)list.scrollTop=item.offsetTop+item.offsetHeight-list.clientHeight;}
  },[acik,aktifIndex,position]);
  return <div className="block nr-select">
    <label htmlFor={`combo-${listeId}`} className="nr-field-label mb-2 block text-sm font-semibold text-slate-600">{baslik}</label>
    <div ref={kutuRef} className="nr-select-control" data-open={acik} data-filled={!!deger}>
      <input ref={anaInputRef} id={`combo-${listeId}`} role="combobox" aria-expanded={acik} aria-haspopup="listbox" aria-controls={acik?`options-${listeId}`:undefined} aria-required={gerekli} readOnly value={deger} placeholder="Seçim yapın" onClick={()=>acik?kapat():ac()} onKeyDown={event=>{if(["Enter"," ","ArrowDown","ArrowUp"].includes(event.key)){event.preventDefault();ac()}if(event.key==="Escape")kapat(true)}}/>
      <span className="nr-select-chevron" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
    </div>
    {acik&&position&&createPortal(<div ref={popupRef} className="nr-select-popup" style={{top:position.top,left:position.left,width:position.width,height:position.height}}>
      <div className="nr-select-popup-heading"><strong>{baslik.replace(" *","")}</strong><span>{filtreli.length} seçenek</span></div>
      <div className="nr-select-search"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5" stroke="currentColor" strokeWidth="1.6"/><path d="m12.5 12.5 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg><input ref={aramaRef} aria-label={`${baslik.replace(" *","")} seçeneklerinde ara`} role="combobox" aria-expanded="true" aria-controls={`options-${listeId}`} aria-autocomplete="list" aria-activedescendant={aktifIndex>=0&&filtreli[aktifIndex]?`option-${listeId}-${aktifIndex}`:undefined} value={arama} onChange={event=>{setArama(event.target.value);setAktifIndex(0)}} placeholder="Ara veya yeni değer yaz…" onKeyDown={event=>{
        if(event.key==="ArrowDown"){event.preventDefault();setAktifIndex(index=>Math.min(index+1,filtreli.length-1))}
        if(event.key==="ArrowUp"){event.preventDefault();setAktifIndex(index=>Math.max(index-1,0))}
        if(event.key==="Enter"){event.preventDefault();if(filtreli[aktifIndex])sec(filtreli[aktifIndex]);else if(yeniDeger)sec(yeniDeger)}
        if(event.key==="Escape"){event.preventDefault();event.stopPropagation();kapat(true)}
        if(event.key==="Tab"){
          event.preventDefault();
          const controls=Array.from(anaInputRef.current?.form?.querySelectorAll<HTMLElement>("input:not([type=hidden]),select,textarea,button")||[]).filter(element=>element.tabIndex>=0&&!element.hasAttribute("disabled")&&element.getClientRects().length>0);
          const index=controls.indexOf(anaInputRef.current!);kapat();(controls[index+(event.shiftKey?-1:1)]||anaInputRef.current)?.focus();
        }
      }}/></div>
      <div ref={listeRef} id={`options-${listeId}`} className="nr-select-options" role="listbox" aria-label={baslik}>
        {filtreli.length?filtreli.map((x,i)=><button key={x} data-index={i} id={`option-${listeId}-${i}`} role="option" aria-selected={x===deger} data-active={i===aktifIndex} tabIndex={-1} type="button" onPointerDown={event=>event.preventDefault()} onMouseEnter={()=>setAktifIndex(i)} onClick={()=>sec(x)}><span>{x}</span>{guc&&<small>kVA</small>}<span className="nr-select-check" aria-hidden="true">{x===deger?"✓":""}</span></button>):<p className="nr-select-empty">Eşleşen seçenek bulunamadı.</p>}
      </div>
      {yeniDeger&&<button className="nr-select-create" type="button" onPointerDown={event=>event.preventDefault()} onClick={()=>sec(yeniDeger)}>＋ “{yeniDeger}” değerini kullan</button>}
      <div className="nr-select-popup-footer"><span>{deger?`Seçili: ${deger}${guc?" kVA":""}`:"Bir seçenek seçin"}</span>{deger&&<button type="button" onClick={()=>sec("")}>Temizle</button>}</div>
    </div>,document.body)}
  </div>;
}
function SelectAlan({baslik,deger,degistir,secenekler,gerekli=false}:{baslik:string;deger:string;degistir:(v:string)=>void;secenekler:string[];gerekli?:boolean}){return <Alan baslik={baslik}><select required={gerekli} value={deger} onChange={e=>degistir(e.target.value)} className={inputSinif}><option value="">Seçiniz</option>{secenekler.map(s=><option key={s} value={s}>{s}</option>)}</select></Alan>}
function FormGrid({children}:{children:ReactNode}){return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>}
function FormBolumu({baslik,children}:{baslik:string;children:ReactNode}){return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,.07)] ring-1 ring-slate-100"><div className="border-b border-blue-100 bg-[linear-gradient(90deg,#eff6ff,#ffffff)] px-4 py-4 font-black text-[#16345e] sm:px-5">{baslik}</div><div className="p-4 sm:p-5 lg:p-6">{children}</div></section>}
function MenuButonu({aktif,onClick,children}:{aktif:boolean;onClick:()=>void;children:ReactNode}){return <button onClick={onClick} className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${aktif?"bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-200/60":"text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`}>{children}</button>}
function Etiket({children}:{children:ReactNode}){return <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-600 shadow-sm">{children}</span>}
function KpiKart({baslik,sayi,renk,onClick}:{baslik:string;sayi:number;renk:string;onClick?:()=>void}){const icerik=<><div className="h-1.5" style={{backgroundColor:renk}}/><div className="p-4"><div className="min-h-7 text-[10px] font-black uppercase tracking-wider text-slate-500">{baslik}</div><div className="mt-1 flex items-end justify-between"><div className="text-2xl font-black text-slate-900 sm:text-3xl">{sayi}</div><span className="mb-1 h-3 w-3 rounded-full shadow-sm" style={{backgroundColor:renk}}/></div></div></>;const cls="group w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-[0_10px_30px_rgba(15,23,42,.08)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_16px_40px_rgba(15,23,42,.12)]";return onClick?<button type="button" onClick={onClick} className={cls}>{icerik}</button>:<div className={cls}>{icerik}</div>}
function OzetKart({ikon,baslik,deger,alt,onClick}:{ikon:string;baslik:string;deger:string;alt:string;onClick?:()=>void}){const icerik=<div className="flex items-center gap-2 sm:gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 text-xl shadow-inner sm:h-14 sm:w-14 sm:rounded-2xl sm:text-2xl">{ikon}</div><div className="min-w-0"><div className="text-[9px] font-black uppercase tracking-wider text-slate-500 sm:text-[10px]">{baslik}</div><div className="mt-0.5 truncate text-xl font-black tracking-tight text-slate-900 sm:mt-1 sm:text-2xl">{deger}</div><div className="mt-0.5 truncate text-[10px] font-medium text-slate-400 sm:text-[11px]">{alt}</div></div></div>;const cls="w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-[0_8px_24px_rgba(15,23,42,.07)] ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_16px_40px_rgba(15,23,42,.12)] sm:rounded-2xl sm:p-4";return onClick?<button type="button" onClick={onClick} className={cls}>{icerik}</button>:<div className={cls}>{icerik}</div>}
function Panel({baslik,altBaslik,children,className="",sagIcerik,daraltilabilir=false,acik=true,onToggle}:{baslik:string;altBaslik?:string;children:ReactNode;className?:string;sagIcerik?:ReactNode;daraltilabilir?:boolean;acik?:boolean;onToggle?:()=>void}){return <section className={`w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,.07)] ring-1 ring-slate-100 sm:p-5 lg:p-6 ${className}`}><div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-black tracking-tight text-slate-900 sm:text-lg">{baslik}</h2>{altBaslik&&<p className="mt-1 text-xs font-medium text-slate-400 sm:text-sm">{altBaslik}</p>}</div><div className="flex items-center gap-2">{sagIcerik}{daraltilabilir&&<button type="button" onClick={onToggle} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-lg font-black text-slate-500 shadow-sm hover:border-blue-200 hover:text-blue-600" title={acik?"Bölümü daralt":"Bölümü aç"}>{acik?"−":"+"}</button>}</div></div>{(!daraltilabilir||acik)&&children}</section>}
function GrafikLegend(){return <div className="mt-4 flex flex-wrap gap-2">{NEDENLER.map(n=><div key={n.ad} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm"><span className="h-2.5 w-2.5 rounded-full" style={{backgroundColor:n.renk}}/><span className="text-[9px] font-black uppercase text-slate-400">{n.ad}</span></div>)}</div>}
function DistrictRecordsDialog({district,records,onClose}:{district:string;records:TrafoKaydi[];onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);
  const [search,setSearch]=useState("");
  const [selected,setSelected]=useState<TrafoKaydi|null>(null);
  const [pagination,setPagination]=useState({key:"",page:1});
  const filtered=useMemo(()=>{const query=search.trim().toLocaleLowerCase("tr-TR");return records.filter(record=>!query||[record.mahalle,record.tr,record.lokasyon_id,record.trafo_id,record.degisim_nedeni,record.tarih,record.sira_no].some(value=>String(value||"").toLocaleLowerCase("tr-TR").includes(query))).sort((a,b)=>(b.tarih||"").localeCompare(a.tarih||"")||b.id-a.id)},[records,search]);
  const key=search+"|"+filtered.map(record=>record.id).join(",");
  if(pagination.key!==key)setPagination({key,page:1});
  const pageCount=Math.max(1,Math.ceil(filtered.length/10)),page=Math.min(pageCount,pagination.key===key?pagination.page:1),start=(page-1)*10;
  useEffect(()=>{
    const element=dialog.current;if(!element)return;
    const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const overflow=document.body.style.overflow;document.body.style.overflow="hidden";element.showModal();
    return()=>{element.close();document.body.style.overflow=overflow;if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true})};
  },[]);
  return <dialog ref={dialog} className="district-record-dialog" aria-labelledby="district-dialog-title" onCancel={event=>{event.preventDefault();onClose()}} onClose={onClose} onClick={event=>{if(event.target!==event.currentTarget)return;const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)onClose()}}>
    <div className="district-dialog-shell">
      <div className="district-dialog-header"><div><h2 id="district-dialog-title">{district} · Trafo Kayıtları</h2><p>{records.length} kayıt · İlçe Analizi’nde seçili filtrelere göre</p></div><button type="button" className="district-dialog-close" aria-label="Pencereyi kapat" onClick={onClose}>×</button></div>
      {selected?<>
        <div className="district-dialog-toolbar"><button type="button" onClick={()=>setSelected(null)}>← Kayıt listesine dön</button><span>Kayıt #{selected.sira_no||selected.id} · {tarihGoster(selected.tarih)}</span></div>
        <div className="district-dialog-detail">
          <DetayBolumu baslik="Konum ve İşlem"><DetayGrid><D b="İlçe" v={selected.ilce}/><D b="Mahalle" v={selected.mahalle}/><D b="TR" v={selected.tr}/><D b="Trafo ID" v={selected.trafo_id}/><D b="Lokasyon ID" v={selected.lokasyon_id}/><D b="Yıl / Ay" v={`${selected.yil||"—"} / ${selected.ay||"—"}`}/><D b="Değişim Nedeni" v={selected.degisim_nedeni}/><D b="Trafo Tipi" v={selected.trafo_tipi}/></DetayGrid></DetayBolumu>
          <div className="district-dialog-transformers"><TrafoKarsilastirmaKart tur="eski" baslik="Sökülen Trafo" guc={selected.sokulen_gucu} gerilim={selected.sokulen_gerilim} marka={selected.sokulen_markasi} seri={selected.sokulen_seri_no} imal={selected.sokulen_imal_yili} tip={selected.sokulen_trafo_tipi} tamirYili={selected.sokulen_tamir_yili} tamirFirma={selected.sokulen_tamir_firmasi}/><TrafoKarsilastirmaKart tur="yeni" baslik="Takılan Trafo" guc={selected.takilan_gucu} gerilim={selected.takilan_gerilim} marka={selected.takilan_markasi} seri={selected.takilan_seri_no} imal={selected.takilan_imal_yili} tip={selected.takilan_trafo_tipi} tamirYili={selected.takilan_tamir_yili} tamirFirma={selected.takilan_tamir_firmasi}/></div>
          <DetayBolumu baslik="Açıklama"><p className="district-dialog-description">{selected.aciklama||"Açıklama bulunmuyor."}</p></DetayBolumu>
        </div>
      </>:<>
        <div className="district-dialog-toolbar"><label htmlFor="district-record-search">Kayıtlarda ara</label><input id="district-record-search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Mahalle, TR, trafo ID veya neden ara…"/><span>{filtered.length} kayıt</span></div>
        <div className="district-dialog-table-scroll" tabIndex={0} aria-label="İlçe trafo kayıtları tablosu"><table><colgroup><col style={{width:"11%"}}/><col style={{width:"25%"}}/><col style={{width:"19%"}}/><col style={{width:"19%"}}/><col style={{width:"17%"}}/><col style={{width:"9%"}}/></colgroup><thead><tr><th scope="col">Tarih</th><th scope="col">Mahalle / TR</th><th scope="col">Trafo / Lokasyon ID</th><th scope="col">Değişim Nedeni</th><th scope="col">Güç (kVA)</th><th scope="col">Detay</th></tr></thead><tbody>{filtered.length?filtered.slice(start,start+10).map(record=><tr key={record.id}><td>{tarihGoster(record.tarih)}</td><td><strong>{record.mahalle||"—"}</strong><small>TR: {record.tr||"—"} · #{record.sira_no||record.id}</small></td><td>{record.trafo_id||record.lokasyon_id||"—"}</td><td><span className="district-dialog-reason" style={{color:NEDENLER.find(reason=>reason.ad===record.degisim_nedeni)?.renk||"#64748b"}}>{record.degisim_nedeni||"—"}</span></td><td>{record.sokulen_gucu||"—"} → {record.takilan_gucu||"—"}</td><td><button type="button" aria-label={`Kayıt ${record.sira_no||record.id} detayını aç`} onClick={()=>setSelected(record)}>İncele</button></td></tr>):<tr><td colSpan={6} className="district-dialog-empty">Aramaya uygun kayıt bulunamadı.</td></tr>}</tbody></table></div>
        <div className="district-dialog-pagination"><span>{filtered.length?`${start+1}–${Math.min(start+10,filtered.length)}`:"0"} / {filtered.length} kayıt</span><div><button type="button" disabled={page===1} onClick={()=>setPagination({key,page:page-1})}>Önceki</button><span>Sayfa {page} / {pageCount}</span><button type="button" disabled={page===pageCount} onClick={()=>setPagination({key,page:page+1})}>Sonraki</button></div></div>
      </>}
    </div>
  </dialog>;
}
function DistrictAnalysis({items,filterKey,onDistrictClick}:{items:{ilce:string;sayi:number;oran:number}[];filterKey:string;onDistrictClick:(district:string)=>void}){
  const [pagination,setPagination]=useState({key:"",page:1});
  const key=filterKey+"|"+items.map(item=>`${item.ilce}:${item.sayi}`).join("|");
  if(pagination.key!==key)setPagination({key,page:1});
  const pageCount=Math.max(1,Math.ceil(items.length/10));
  const page=Math.min(pageCount,pagination.key===key?pagination.page:1);
  const start=(page-1)*10,visible=items.slice(start,start+10),topThree=items.slice(0,3);
  const total=items.reduce((sum,item)=>sum+item.sayi,0),topShare=topThree.reduce((sum,item)=>sum+item.oran,0);
  return <div className="district-content">
    <div className="district-kpis">
      <div><span>TOPLAM KAYIT</span><strong data-district-total>{total}</strong><small>Seçili filtrelerde</small></div>
      <div><span>KAYITLI İLÇE</span><strong>{items.length}</strong><small>Kayıt bulunan ilçeler</small></div>
      <div><span>EN YOĞUN İLÇE</span><strong className="district-leading">{items[0]?.ilce||"—"}</strong><small>{items[0]?`${items[0].sayi} kayıt · %${items[0].oran.toFixed(1)}`:"Kayıt yok"}</small></div>
      <div><span>İLK 3 İLÇENİN PAYI</span><strong>%{topShare.toFixed(1)}</strong><small>Toplam kayıt içindeki payı</small></div>
    </div>
    <div className="district-grid">
      <section className="district-card district-ranking" aria-labelledby="district-ranking-title">
        <div className="district-card-heading"><h3 id="district-ranking-title">İlçelere Göre Dağılım</h3><span>{items.length} ilçe</span></div>
        <div className="district-table-scroll" tabIndex={0} aria-label="İlçe dağılımı tablosu">
          <table className="district-table" data-full-page={visible.length===10}>
            <colgroup><col style={{width:"9%"}}/><col style={{width:"35%"}}/><col style={{width:"15%"}}/><col style={{width:"15%"}}/><col style={{width:"26%"}}/></colgroup>
            <thead><tr><th scope="col">Sıra</th><th scope="col">İlçe</th><th scope="col">Kayıt</th><th scope="col">Pay</th><th scope="col">Dağılım</th></tr></thead>
            <tbody>{visible.length?visible.map((item,index)=><tr key={item.ilce}>
              <td><span className="district-rank" data-rank={start+index+1}>{start+index+1}</span></td>
              <th scope="row"><button type="button" className="district-link" aria-label={`${item.ilce} kayıtlarını aç`} onClick={()=>onDistrictClick(item.ilce)}>{item.ilce}<span aria-hidden="true">↗</span></button></th>
              <td className="district-count">{item.sayi}</td><td>%{item.oran.toFixed(1)}</td>
              <td><div className="district-bar-track"><div style={{width:`${item.oran}%`}}/></div></td>
            </tr>):<tr><td colSpan={5} className="district-empty">Seçili filtrelerde ilçe kaydı bulunamadı.</td></tr>}</tbody>
          </table>
        </div>
        <div className="district-pagination"><span>{items.length?`${start+1}–${Math.min(start+10,items.length)}`:"0"} / {items.length} ilçe</span><div><button type="button" disabled={page===1} onClick={()=>setPagination({key,page:page-1})}>Önceki</button><span>Sayfa {page} / {pageCount}</span><button type="button" disabled={page===pageCount} onClick={()=>setPagination({key,page:page+1})}>Sonraki</button></div></div>
      </section>
      <section className="district-card district-top" aria-labelledby="district-top-title">
        <div className="district-card-heading"><h3 id="district-top-title">En Yoğun 3 İlçe</h3><span>Seçili kayıtlar</span></div>
        <div className="district-share" role="img" aria-label={`İlk üç ilçenin toplam payı yüzde ${topShare.toFixed(1)}`} style={{background:`conic-gradient(#3b82f6 ${topShare}%,#e8eef7 0)`}}><div><strong>%{topShare.toFixed(1)}</strong><span>İlk 3 ilçe</span></div></div>
        <div className="district-top-list">{topThree.length?topThree.map((item,index)=><button type="button" key={item.ilce} onClick={()=>onDistrictClick(item.ilce)} aria-label={`${item.ilce} kayıtlarını aç`}><span className="district-rank" data-rank={index+1}>{index+1}</span><span><strong>{item.ilce}</strong><small>Toplamın %{item.oran.toFixed(1)} kadarı</small></span><span className="district-top-count"><strong>{item.sayi}</strong><small>kayıt</small></span></button>):<p className="district-empty">Seçili filtrelerde ilçe kaydı bulunamadı.</p>}</div>
        <p className="district-note">Bir ilçeye tıklayarak kayıtlarını pencerede inceleyebilirsiniz.</p>
      </section>
    </div>
  </div>;
}
function ViewportAnalysis({id,children}:{id:string;children:ReactNode}){
  const container=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const element=container.current;if(!element)return;
    let frame=0;
    const measure=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
      if(window.innerWidth<768){element.style.removeProperty("--analysis-height");return;}
      const top=element.getBoundingClientRect().top+window.scrollY;
      element.style.setProperty("--analysis-height",`${Math.max(430,Math.floor(window.innerHeight-top-16))}px`);
    })};
    const observer=new ResizeObserver(measure);
    [document.getElementById("dashboard-filters"),document.getElementById("dashboard-hero")].forEach(e=>{if(e)observer.observe(e)});
    window.addEventListener("resize",measure);measure();
    return()=>{observer.disconnect();window.removeEventListener("resize",measure);cancelAnimationFrame(frame)};
  },[]);
  return <div ref={container} id={id} className="ng-viewport">{children}</div>;
}
function DashboardChartRow({year,children}:{year:string;children:ReactNode}){
  const row=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const element=row.current,monthly=document.getElementById("dashboard-monthly");
    if(!element||!monthly)return;
    let frame=0;
    const measure=()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        if(window.innerWidth<768){element.style.removeProperty("--dashboard-chart-height");return;}
        const top=element.getBoundingClientRect().top+window.scrollY;
        const available=Math.floor(window.innerHeight-top-monthly.offsetHeight-22);
        element.style.setProperty("--dashboard-chart-height",`${Math.max(230,available)}px`);
      });
    };
    const observer=new ResizeObserver(measure);
    [monthly,document.getElementById("dashboard-filters"),document.getElementById("dashboard-kpis"),document.getElementById("dashboard-hero")].forEach(e=>{if(e)observer.observe(e)});
    window.addEventListener("resize",measure);measure();
    return()=>{observer.disconnect();window.removeEventListener("resize",measure);cancelAnimationFrame(frame)};
  },[year]);
  return <div ref={row} id="dashboard-chart-row">{children}</div>;
}
function BarChart({items,max,aylik=false,compact=false,onBarClick}:{items:{label:string;total:number;values:Record<string,number>}[];max:number;aylik?:boolean;compact?:boolean;onBarClick?:(label:string,neden:string)=>void}){
  const kaydirma=useRef<HTMLDivElement>(null);
  const [scrollState,setScrollState]=useState({left:false,right:false});
  useEffect(()=>{
    const area=kaydirma.current;if(!area)return;
    const update=()=>{const left=area.scrollLeft>1,right=area.scrollLeft+area.clientWidth<area.scrollWidth-1;setScrollState(previous=>previous.left===left&&previous.right===right?previous:{left,right})};
    const observer=new ResizeObserver(update);observer.observe(area);if(area.firstElementChild)observer.observe(area.firstElementChild);
    area.addEventListener("scroll",update,{passive:true});update();
    return()=>{observer.disconnect();area.removeEventListener("scroll",update)};
  },[items.length]);
  const kaydir=(yon:-1|1)=>{
    const alan=kaydirma.current;
    if(!alan)return;
    alan.scrollBy({left:yon*Math.max(240,alan.clientWidth*.72),behavior:"smooth"});
  };
  const minGenislik=aylik?Math.max(760,items.length*66):Math.max(260,items.length*130);

  return <div className={`mt-5 w-full min-w-0 max-w-full overflow-hidden ${compact?"trafo-chart-shell":""}`}>
    <div ref={kaydirma} className="w-0 min-w-full max-w-full overflow-x-auto overscroll-x-contain pb-2" tabIndex={0} aria-label={aylik?"Aylık grafiği yatay kaydır":"Yıllık grafiği yatay kaydır"} style={{scrollbarWidth:"thin",WebkitOverflowScrolling:"touch"}}>
      <div style={{minWidth:`${minGenislik}px`,width:compact&&!aylik?`${minGenislik}px`:undefined}}>
        <div className={compact?`relative trafo-compact-chart ${aylik?"monthly":"yearly"}`:aylik?"relative h-[270px]":"relative h-[320px] sm:h-[350px]"}>
          <div className="pointer-events-none absolute inset-x-0 bottom-10 top-5 flex flex-col justify-between">
            {[1,2,3,4,5].map(i=><div key={i} className="border-t border-dashed border-slate-200"/>)}
          </div>
          <div className="trafo-chart-groups absolute inset-0 flex items-end gap-2 px-2 sm:gap-3">
            {items.map(it=><div key={it.label} className={`trafo-chart-group flex min-w-[62px] ${compact&&!aylik?"w-[118px] flex-none":"flex-1"} flex-col items-center justify-end`}>
              <div className="mb-2 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-700">{it.total}</div>
              <div className={`flex items-end justify-center gap-[2px] ${compact?"trafo-compact-bars":aylik?"h-[180px]":"h-[225px] sm:h-[255px]"}`}>
                {NEDENLER.filter(n=>(it.values[n.ad]||0)>0).map(n=>{
                  const v=it.values[n.ad]||0,h=(v/max)*100;
                  return <button type="button" onClick={()=>onBarClick?.(it.label,n.ad)} key={n.ad} title={`${it.label} - ${n.ad}: ${v} • Kayıtlara git`} aria-label={`${it.label}, ${n.ad}, ${v} kayıt`} className={`trafo-data-bar ${aylik?"w-[5px] rounded-t":"w-[7px] rounded-t-md"} ${onBarClick?"cursor-pointer hover:brightness-125":"cursor-default"}`} style={{height:compact?`${h}%`:`${Math.max(2,(v/max)*(aylik?160:225))}px`,backgroundColor:n.renk}}/>
                })}
              </div>
              <div className="mt-3 w-full border-t border-slate-200 pt-2 text-center text-[10px] font-black text-slate-500">{it.label}</div>
            </div>)}
          </div>
        </div>
      </div>
    </div>
    <div className={`trafo-chart-navigation mt-2 flex items-center justify-center gap-3 ${compact&&!aylik?"":"sm:hidden"}`}>
      <button type="button" onClick={()=>kaydir(-1)} disabled={!scrollState.left} aria-label="Grafiği sola kaydır" className="flex h-10 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-600 shadow-sm active:bg-slate-100">←</button>
      <span className="text-[10px] font-bold text-slate-400">Grafiği sağa–sola kaydır</span>
      <button type="button" onClick={()=>kaydir(1)} disabled={!scrollState.right} aria-label="Grafiği sağa kaydır" className="flex h-10 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-600 shadow-sm active:bg-slate-100">→</button>
    </div>
  </div>
}
function NedenGucHucre({sayi,oran,ton}:{sayi:number;oran:number;ton:"emerald"|"blue"|"red"}){
  const bar={
    emerald:"bg-emerald-500",
    blue:"bg-blue-500",
    red:"bg-red-500",
  }[ton];

  const text={
    emerald:"text-emerald-700",
    blue:"text-blue-700",
    red:"text-red-700",
  }[ton];

  return <div>
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-black">{sayi}</span>
      <span className={`text-[10px] font-bold ${text}`}>%{oran.toFixed(1)}</span>
    </div>
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full rounded-full ${bar}`} style={{width:`${oran}%`}}/>
    </div>
  </div>
}

function OzelOzet({baslik,deger,alt,ton}:{baslik:string;deger:string;alt:string;ton:"emerald"|"red"|"purple"|"blue"}){
  const cls={
    emerald:"border-emerald-200 bg-emerald-50 text-emerald-700",
    red:"border-red-200 bg-red-50 text-red-700",
    purple:"border-violet-200 bg-violet-50 text-violet-700",
    blue:"border-blue-200 bg-blue-50 text-blue-700",
  }[ton];

  return <div className={`rounded-2xl border p-4 shadow-sm ${cls}`}>
    <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">{baslik}</div>
    <div className="mt-3 text-2xl font-black text-slate-900">{deger}</div>
    <div className="mt-1 text-[10px] font-bold">{alt}</div>
  </div>
}
function GucKpi({baslik,sayi,alt,ikon,ton}:{baslik:string;sayi:number;alt:string;ikon:string;ton:"emerald"|"red"|"blue"|"orange"}){
  const tonlar={
    emerald:"border-emerald-200 bg-emerald-50 text-emerald-700",
    red:"border-red-200 bg-red-50 text-red-700",
    blue:"border-blue-200 bg-blue-50 text-blue-700",
    orange:"border-orange-200 bg-orange-50 text-orange-700",
  };
  return <div className={`rounded-2xl border p-4 shadow-[0_8px_24px_rgba(15,23,42,.05)] ${tonlar[ton]}`}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">{baslik}</div>
        <div className="ng-kpi-value mt-2 text-2xl font-black text-slate-900 sm:text-3xl">{sayi}</div>
        <div className="mt-1 text-[10px] font-bold">{alt}</div>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-current/15 bg-white text-xl font-black shadow-sm">{ikon}</div>
    </div>
  </div>
}
function HataKutusu({children}:{children:ReactNode}){return <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{children}</div>}
function BosAlan({children}:{children:ReactNode}){return <div className="my-6 w-full rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-7 text-center text-sm text-slate-500 sm:p-10">{children}</div>}
function NedenEtiketi({neden}:{neden:string|null}){const n=NEDENLER.find(x=>x.ad===neden);return neden?<span className="inline-flex whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-black text-white" style={{backgroundColor:n?.renk||"#475569"}}>{neden}</span>:<span className="text-slate-600">-</span>}

function RecordActions({record,gecmis,kopyala,duzenle,sil,duzenleyebilir,silebilir}:{record:TrafoKaydi;gecmis:(k:TrafoKaydi)=>void;kopyala?:(k:TrafoKaydi)=>void;duzenle:(k:TrafoKaydi)=>void;sil:(k:TrafoKaydi)=>void;duzenleyebilir:boolean;silebilir:boolean}){
  const [position,setPosition]=useState<{top:number;left:number}|null>(null);
  const trigger=useRef<HTMLButtonElement>(null),popup=useRef<HTMLDivElement>(null);
  const menuId=`record-actions-${record.id}`;
  useEffect(()=>{
    if(!position)return;
    const outside=(event:PointerEvent)=>{if(!popup.current?.contains(event.target as Node)&&!trigger.current?.contains(event.target as Node))setPosition(null)};
    const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();setPosition(null);trigger.current?.focus()}};
    const scroll=(event:Event)=>{if(!popup.current?.contains(event.target as Node))setPosition(null)};
    const close=()=>setPosition(null);
    const focus=(event:FocusEvent)=>{if(!popup.current?.contains(event.target as Node)&&!trigger.current?.contains(event.target as Node))close()};
    popup.current?.querySelector<HTMLButtonElement>("button")?.focus({preventScroll:true});
    document.addEventListener("focusin",focus);document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape);document.addEventListener("scroll",scroll,true);window.addEventListener("resize",close);
    return()=>{document.removeEventListener("focusin",focus);document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);document.removeEventListener("scroll",scroll,true);window.removeEventListener("resize",close)};
  },[position]);
  const run=(action:(k:TrafoKaydi)=>void)=>{setPosition(null);action(record)};
  return <><button ref={trigger} type="button" className="record-actions-trigger" aria-label={`Kayıt ${record.sira_no||record.id} işlemleri`} aria-expanded={!!position} aria-controls={position?menuId:undefined} onClick={()=>{
    if(position){setPosition(null);return;}
    const rect=trigger.current!.getBoundingClientRect(),height=(1+(duzenleyebilir?(kopyala?2:1):0)+(silebilir?1:0))*40+12;
    setPosition({left:Math.max(8,Math.min(rect.right-176,window.innerWidth-184)),top:Math.max(8,rect.bottom+height+8<=window.innerHeight?rect.bottom+6:rect.top-height-6)});
  }}>İşlemler <span aria-hidden="true">⌄</span></button>{position&&createPortal(<div ref={popup} id={menuId} className="record-actions-popup" role="group" aria-label={`Kayıt ${record.sira_no||record.id} işlem seçenekleri`} style={position}>
    <button type="button" onClick={()=>run(gecmis)}>Geçmişi incele</button>
    {duzenleyebilir&&kopyala&&<button type="button" onClick={()=>run(kopyala)}>Kaydı kopyala</button>}
    {duzenleyebilir&&<button type="button" onClick={()=>run(duzenle)}>Kaydı düzenle</button>}
    {silebilir&&<button type="button" className="record-action-danger" onClick={()=>run(sil)}>Kaydı sil</button>}
  </div>,document.body)}</>;
}
function KayitTablosu({kayitlar,paginationKey="",detay,duzenle,sil,gecmis,kopyala,secili=[],secimDegistir,duzenleyebilir=false,silebilir=false}:{kayitlar:TrafoKaydi[];paginationKey?:string;detay:(k:TrafoKaydi)=>void;duzenle:(k:TrafoKaydi)=>void;sil:(k:TrafoKaydi)=>void;gecmis:(k:TrafoKaydi)=>void;kopyala?:(k:TrafoKaydi)=>void;secili?:number[];secimDegistir?:(id:number)=>void;duzenleyebilir?:boolean;silebilir?:boolean}){
  const [pagination,setPagination]=useState({key:"",page:1});
  const listKey=useMemo(()=>paginationKey+"|"+kayitlar.map(k=>k.id).join(","),[kayitlar,paginationKey]);
  if(pagination.key!==listKey)setPagination({key:listKey,page:1});
  const pageSize=10,pageCount=Math.max(1,Math.ceil(kayitlar.length/pageSize));
  const pageNo=Math.min(pagination.key===listKey?pagination.page:1,pageCount);
  const visibleRecords=kayitlar.slice((pageNo-1)*pageSize,pageNo*pageSize);
  const changePage=(page:number)=>setPagination({key:listKey,page:Math.max(1,Math.min(page,pageCount))});
  const actions=(k:TrafoKaydi)=><div className="record-row-actions"><button type="button" className="record-detail-button" aria-label={`Kayıt ${k.sira_no||k.id} detayını aç`} onClick={()=>detay(k)}>Detay</button><RecordActions record={k} gecmis={gecmis} kopyala={kopyala} duzenle={duzenle} sil={sil} duzenleyebilir={duzenleyebilir} silebilir={silebilir}/></div>;
  const select=(k:TrafoKaydi)=>secimDegistir&&<input type="checkbox" aria-label={`Kayıt ${k.sira_no||k.id} seç`} checked={secili.includes(k.id)} onChange={()=>secimDegistir(k.id)}/>;
  return <>
    {duzenleyebilir&&<p className="records-selection-hint">Toplu düzenlemek için kayıtların seçim kutularını işaretleyin.</p>}
    <div className="recordMobileCards md:hidden">{visibleRecords.length?visibleRecords.map(k=><article key={k.id} className={`record-mobile-card ${secili.includes(k.id)?"record-selected":""}`}>
      <div className="record-mobile-heading"><div>{select(k)}<strong>{k.ilce||"İlçe belirtilmemiş"}</strong></div><span>{tarihGoster(k.tarih)}</span></div>
      <div className="record-mobile-location"><strong>{k.mahalle||"Mahalle belirtilmemiş"}</strong><span>TR: {k.tr||"—"}</span></div>
      <dl><div><dt>Trafo ID</dt><dd>{k.trafo_id||"—"}</dd></div><div><dt>Lokasyon ID</dt><dd>{k.lokasyon_id||"—"}</dd></div><div><dt>Yıl / Ay</dt><dd>{k.yil||"—"} / {k.ay||"—"}</dd></div><div><dt>Güç (kVA)</dt><dd>{k.sokulen_gucu||"—"} → {k.takilan_gucu||"—"}</dd></div></dl>
      <footer><NedenEtiketi neden={k.degisim_nedeni}/>{actions(k)}</footer>
    </article>):<BosAlan>Bu filtrelerde kayıt bulunamadı.</BosAlan>}</div>
    <div className={`recordTableScroll records-table-scroll hidden md:block ${secimDegistir?"recordTableSelectable":""}`} data-testid="record-table-scroll" tabIndex={0} aria-label="Trafo kayıt tablosu; dar ekranlarda yatay kaydırılabilir">
      <table className="records-table"><colgroup>{secimDegistir&&<col style={{width:"4%"}}/>}<col style={{width:"11%"}}/><col style={{width:"11%"}}/><col style={{width:"19%"}}/><col style={{width:"16%"}}/><col style={{width:"10%"}}/><col style={{width:"15%"}}/><col style={{width:secimDegistir?"14%":"18%"}}/></colgroup>
        <thead><tr>{secimDegistir&&<th scope="col">Seç</th>}{["Tarih","İlçe","Mahalle / Trafo","Trafo / Lokasyon ID","Güç (kVA)","Değişim Nedeni","İşlemler"].map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead>
        <tbody>{visibleRecords.length?visibleRecords.map(k=><tr key={k.id} className={secili.includes(k.id)?"record-selected":""}>
          {secimDegistir&&<td>{select(k)}</td>}
          <td className="record-date"><strong>{tarihGoster(k.tarih)}</strong><small>{k.yil||"—"} / {k.ay||"—"}</small></td>
          <td><span className="record-value" title={k.ilce||""}>{k.ilce||"—"}</span></td>
          <td><strong className="record-value" title={k.mahalle||""}>{k.mahalle||"—"}</strong><small className="record-value" title={k.tr||""}>TR: {k.tr||"—"}</small></td>
          <td><span className="record-value" title={`Trafo ID: ${k.trafo_id||"—"}`}>{k.trafo_id||"—"}</span><small className="record-value" title={`Lokasyon ID: ${k.lokasyon_id||"—"}`}>Lok.: {k.lokasyon_id||"—"}</small></td>
          <td className="record-power">{k.sokulen_gucu||"—"}<span aria-hidden="true"> → </span>{k.takilan_gucu||"—"}</td>
          <td><NedenEtiketi neden={k.degisim_nedeni}/></td><td>{actions(k)}</td>
        </tr>):<tr><td colSpan={secimDegistir?8:7} className="records-empty">Bu filtrelerde kayıt bulunamadı.</td></tr>}</tbody>
      </table>
    </div>
    <div className="recordPagination" aria-label="Kayıt sayfaları"><span aria-live="polite">{kayitlar.length?(pageNo-1)*pageSize+1:0}–{Math.min(pageNo*pageSize,kayitlar.length)} / {kayitlar.length} kayıt</span><div><button type="button" disabled={pageNo===1} onClick={()=>changePage(pageNo-1)}>Önceki</button><span>Sayfa {pageNo} / {pageCount}</span><button type="button" disabled={pageNo===pageCount} onClick={()=>changePage(pageNo+1)}>Sonraki</button></div></div>
  </>;
}
function LogKart({log}:{log:AuditLog}){const etiket=log.action==="INSERT"?"EKLENDİ":log.action==="UPDATE"?"DÜZENLENDİ":"SİLİNDİ";const fark=farkAlanlari(log.old_data,log.new_data).slice(0,5);return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${log.action==="INSERT"?"bg-emerald-100 text-emerald-700":log.action==="UPDATE"?"bg-blue-100 text-blue-700":"bg-red-100 text-red-700"}`}>{etiket}</span><span className="text-[10px] text-slate-500">#{log.record_id||"-"}</span></div><div className="mt-3 truncate text-xs font-black text-slate-800">{log.user_email||"Sistem"}</div><div className="mt-1 text-[10px] text-slate-500">{tarihSaatGoster(log.created_at)}</div>{fark.length>0&&<div className="mt-3 space-y-2">{fark.map(k=><div key={k} className="rounded-xl border border-slate-200 bg-slate-50 p-2"><div className="text-[9px] font-black uppercase text-slate-400">{k}</div><div className="mt-1 grid grid-cols-2 gap-2 text-[10px]"><div className="rounded-lg bg-red-50 px-2 py-1.5 text-red-700"><span className="block text-[8px] font-black">ESKİ</span>{String(log.old_data?.[k]??"—")}</div><div className="rounded-lg bg-emerald-50 px-2 py-1.5 text-emerald-700"><span className="block text-[8px] font-black">YENİ</span>{String(log.new_data?.[k]??"—")}</div></div></div>)}</div>}</div>}
function farkAlanlari(oldData:Record<string,unknown>|null,newData:Record<string,unknown>|null){const a=oldData||{},b=newData||{};return Array.from(new Set([...Object.keys(a),...Object.keys(b)])).filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k]));}
function LogSatiri({log,kayitAc}:{log:AuditLog;kayitAc:(id:number)=>void}){const fark=farkAlanlari(log.old_data,log.new_data);return <div className="rounded-2xl border border-slate-200 bg-slate-50 shadow-sm p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${log.action==="INSERT"?"bg-emerald-500/15 text-emerald-300":log.action==="UPDATE"?"bg-blue-500/15 text-blue-300":"bg-red-500/15 text-red-300"}`}>{log.action}</span><span className="text-sm font-black">Kayıt #{log.record_id||"-"}</span></div><div className="mt-2 text-xs text-slate-400">{log.user_email||"Sistem"} • {tarihSaatGoster(log.created_at)}</div></div>{log.record_id&&log.action!=="DELETE"&&<button onClick={()=>kayitAc(log.record_id!)} className="rounded-xl border border-orange-700 px-3 py-2 text-xs font-black text-orange-300">Kaydı Aç</button>}</div>{fark.length>0&&<div className="mt-4 flex flex-wrap gap-2">{fark.slice(0,12).map(k=><span key={k} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] text-slate-600">{k}: <b>{String(log.old_data?.[k]??"-")}</b> → <b className="text-orange-300">{String(log.new_data?.[k]??"-")}</b></span>)}</div>}</div>}
function TrafoGecmisModal({kapsam,kapsamDegistir,anaKayit,kayitlar,kapat,detay}:{kapsam:"asset"|"location";kapsamDegistir:(v:"asset"|"location")=>void;anaKayit:TrafoKaydi;kayitlar:TrafoKaydi[];kapat:()=>void;detay:(k:TrafoKaydi)=>void}){return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-5"><div className="flex h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-slate-300 bg-blue-50 shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-3xl"><div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5"><div><div className="text-xs font-black uppercase tracking-wider text-violet-300">🕘 Trafo Geçmişi</div><h2 className="mt-2 text-xl font-black">{anaKayit.trafo_id?`Trafo ID: ${anaKayit.trafo_id}`:anaKayit.lokasyon_id?`Lokasyon ID: ${anaKayit.lokasyon_id}`:`TR: ${anaKayit.tr||"-"}`}</h2><div className="mt-1 text-xs text-slate-500">{kayitlar.length} geçmiş kayıt bulundu</div><div className="mt-3 flex gap-2"><button type="button" aria-pressed={kapsam==="location"} onClick={()=>kapsamDegistir("location")} className="rounded-lg border px-3 py-2 text-sm">Lokasyon geçmişi</button><button type="button" disabled={!anaKayit.trafo_id} aria-pressed={kapsam==="asset"} onClick={()=>kapsamDegistir("asset")} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Fiziksel trafo geçmişi</button></div></div><button onClick={kapat} className="h-10 w-10 rounded-xl border border-slate-300 text-xl">×</button></div><div className="overflow-y-auto p-4 sm:p-5"><div className="relative ml-3 border-l border-slate-300 pl-6">{kayitlar.map((k,i)=><button type="button" onClick={()=>detay(k)} key={k.id} className="relative mb-4 block w-full rounded-2xl border border-slate-200 bg-slate-50 shadow-sm p-4 text-left transition hover:border-violet-500/50"><span className="absolute -left-[31px] top-5 h-3 w-3 rounded-full bg-violet-500 ring-4 ring-white"/><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-black">{tarihGoster(k.tarih)} • {k.ilce||"-"} / {k.mahalle||"-"}</div><NedenEtiketi neden={k.degisim_nedeni}/></div><div className="mt-3 grid gap-2 text-xs sm:grid-cols-4"><div className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-3"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm"/><span className="text-[9px] font-black uppercase tracking-wide text-red-600">Sökülen Trafo</span></div><div className="mt-2 text-base font-black text-red-800">{k.sokulen_gucu||"-"}{k.sokulen_gucu&&<span className="ml-1 text-[10px] text-red-500">kVA</span>}</div></div><div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-3"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm"/><span className="text-[9px] font-black uppercase tracking-wide text-emerald-700">Takılan Trafo</span></div><div className="mt-2 text-base font-black text-emerald-800">{k.takilan_gucu||"-"}{k.takilan_gucu&&<span className="ml-1 text-[10px] text-emerald-600">kVA</span>}</div></div><div className="rounded-xl border border-slate-200 bg-white p-3"><span className="text-[9px] font-black uppercase tracking-wide text-slate-400">Lokasyon</span><div className="mt-2 font-black text-slate-700">{k.lokasyon_id||"-"}</div></div><div className="rounded-xl border border-slate-200 bg-white p-3"><span className="text-[9px] font-black uppercase tracking-wide text-slate-400">Değişim</span><div className="mt-2 font-black text-slate-700">{gucYon(k.sokulen_gucu,k.takilan_gucu)}</div></div></div>{i===0&&<div className="mt-3 text-[10px] font-black uppercase text-violet-300">En güncel kayıt</div>}</button>)}</div></div></div></div>}
function IslemButon({onClick,cls,children}:{onClick:()=>void;cls:string;children:ReactNode}){return <button onClick={onClick} className={`rounded-xl border px-2 py-2.5 text-xs font-bold ${cls}`}>{children}</button>}
function MobilBilgi({baslik,deger}:{baslik:string;deger:string|number|null|undefined}){return <div className="bg-white p-3"><div className="text-[9px] font-black uppercase tracking-wider text-slate-500">{baslik}</div><div className="mt-1 break-words text-xs font-bold text-slate-700">{deger===null||deger===undefined||String(deger).trim()===""?"-":String(deger)}</div></div>}

function DetayModal({kayit,kapat,duzenle,yazdir,gecmis,duzenleyebilir=false,onceki,sonraki}:{kayit:TrafoKaydi;kapat:()=>void;duzenle:(k:TrafoKaydi)=>void;yazdir:(k:TrafoKaydi)=>void;gecmis:()=>void;duzenleyebilir?:boolean;onceki?:()=>void;sonraki?:()=>void}){
  return <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-0 backdrop-blur-sm sm:p-4" onMouseDown={kapat}><div onMouseDown={e=>e.stopPropagation()} className="flex h-[100dvh] w-full flex-col overflow-hidden bg-blue-50 shadow-2xl sm:h-[92vh] sm:max-w-6xl sm:rounded-3xl sm:border sm:border-slate-300"><div className="flex shrink-0 items-start justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-7 sm:py-5"><div><div className="text-[10px] font-black tracking-[.18em] text-orange-400">TRAFO DEĞİŞİM KAYDI</div><h2 className="mt-1 text-lg font-black sm:text-2xl">{kayit.ilce||"İlçe Belirtilmemiş"}{kayit.mahalle&&<span className="text-slate-400"> / {kayit.mahalle}</span>}</h2><div className="mt-3 flex flex-wrap gap-2"><Etiket>📅 {tarihGoster(kayit.tarih)}</Etiket><NedenEtiketi neden={kayit.degisim_nedeni}/></div></div><button onClick={kapat} className="h-10 w-10 rounded-xl border border-slate-300 text-xl">×</button></div>
    <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-7"><DetayBolumu baslik="📍 KONUM BİLGİLERİ"><DetayGrid><D b="Yıl" v={kayit.yil}/><D b="Ay" v={kayit.ay}/><D b="İlçe" v={kayit.ilce}/><D b="Mahalle" v={kayit.mahalle}/><D b="TR" v={kayit.tr}/><D b="Lokasyon ID" v={kayit.lokasyon_id}/><D b="Trafo ID" v={kayit.trafo_id}/><D b="Trafo Tipi" v={kayit.trafo_tipi}/></DetayGrid></DetayBolumu>
    <div className="mt-4"><DetayBolumu baslik="⚡ TRAFO DEĞİŞİMİ • ÖNCE / SONRA"><div className="grid gap-4 xl:grid-cols-[1fr_auto_1fr] xl:items-stretch"><TrafoKarsilastirmaKart tur="eski" baslik="SÖKÜLEN TRAFO" guc={kayit.sokulen_gucu} gerilim={kayit.sokulen_gerilim} marka={kayit.sokulen_markasi} seri={kayit.sokulen_seri_no} imal={kayit.sokulen_imal_yili} tip={kayit.sokulen_trafo_tipi} tamirYili={kayit.sokulen_tamir_yili} tamirFirma={kayit.sokulen_tamir_firmasi}/><div className="hidden items-center justify-center text-3xl font-black text-slate-300 xl:flex">→</div><TrafoKarsilastirmaKart tur="yeni" baslik="TAKILAN TRAFO" guc={kayit.takilan_gucu} gerilim={kayit.takilan_gerilim} marka={kayit.takilan_markasi} seri={kayit.takilan_seri_no} imal={kayit.takilan_imal_yili} tip={kayit.takilan_trafo_tipi} tamirYili={kayit.takilan_tamir_yili} tamirFirma={kayit.takilan_tamir_firmasi}/></div></DetayBolumu></div>
    <div className="mt-4"><DetayBolumu baslik="📅 İŞLEM BİLGİLERİ"><DetayGrid><D b="Tarih" v={tarihGoster(kayit.tarih)}/><D b="Değişim Nedeni" v={kayit.degisim_nedeni}/><D b="Kayıt No" v={kayit.sira_no||kayit.id}/></DetayGrid><div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 shadow-sm p-4"><div className="mb-2 text-[10px] font-black text-slate-500">AÇIKLAMA</div><div className="whitespace-pre-wrap text-sm">{kayit.aciklama||"Açıklama girilmemiş."}</div></div></DetayBolumu></div></div>
    <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 sm:px-7"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="grid grid-cols-2 gap-2"><button disabled={!onceki} onClick={onceki} className="rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-30">← Önceki</button><button disabled={!sonraki} onClick={sonraki} className="rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-30">Sonraki →</button></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-5"><button onClick={()=>yazdir(kayit)} className="rounded-xl bg-slate-700 px-3 py-2.5 text-xs font-black">🖨️ PDF</button><button onClick={gecmis} className="rounded-xl bg-violet-700 px-3 py-2.5 text-xs font-black">🕘 Geçmiş</button><button onClick={kapat} className="rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-bold">Kapat</button>{duzenleyebilir&&<button onClick={()=>duzenle(kayit)} className="rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-black">✏️ Düzenle</button>}</div></div></div></div></div>;
}
function MiniYoneticiKart({ikon,baslik,deger,alt}:{ikon:string;baslik:string;deger:string;alt:string}){return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500"><span>{ikon}</span>{baslik}</div><div className="mt-2 truncate text-xl font-black text-slate-900" title={deger}>{deger}</div><div className="mt-1 text-[10px] font-bold text-slate-400">{alt}</div></div>}
function TrafoKarsilastirmaKart({tur,baslik,guc,gerilim,marka,seri,imal,tip,tamirYili,tamirFirma}:{tur:"eski"|"yeni";baslik:string;guc:string|null;gerilim:string|null;marka:string|null;seri:string|null;imal:string|null;tip:string|null;tamirYili:string|null;tamirFirma:string|null}){const eski=tur==="eski";return <div className={`rounded-2xl border p-4 shadow-sm ${eski?"border-red-200 bg-gradient-to-br from-red-50 to-white":"border-emerald-200 bg-gradient-to-br from-emerald-50 to-white"}`}><div className={`text-[10px] font-black uppercase tracking-[.14em] ${eski?"text-red-600":"text-emerald-700"}`}>{eski?"🔴":"🟢"} {baslik}</div><div className="mt-3 flex items-end justify-between gap-3"><div><div className="text-3xl font-black text-slate-900">{guc||"-"}{guc&&<span className="ml-1 text-sm text-slate-500">kVA</span>}</div><div className="mt-1 text-xs font-black text-slate-600">{marka||"Marka belirtilmemiş"}</div></div><div className={`rounded-xl px-3 py-2 text-xs font-black ${eski?"bg-red-100 text-red-700":"bg-emerald-100 text-emerald-700"}`}>{gerilim||"-"}</div></div><div className="mt-4 grid grid-cols-2 gap-2">{[["Seri No",seri],["İmal Yılı",imal],["Trafo Tipi",tip],["Tamir Yılı",tamirYili],["Tamir Firması",tamirFirma]].map(([b,v],i)=><div key={b} className={`${i===4?"col-span-2":""} rounded-xl border border-white/80 bg-white/80 px-3 py-2`}><div className="text-[8px] font-black uppercase text-slate-400">{b}</div><div className="mt-1 truncate text-xs font-bold text-slate-700">{v||"-"}</div></div>)}</div></div>}
function DetayBolumu({baslik,children}:{baslik:string;children:ReactNode}){return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_26px_rgba(15,23,42,.06)] ring-1 ring-slate-100"><div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black">{baslik}</div><div className="p-3 sm:p-5">{children}</div></section>}
function DetayGrid({children,iki=false}:{children:ReactNode;iki?:boolean}){return <div className={iki?"grid gap-3 sm:grid-cols-2":"grid gap-3 sm:grid-cols-2 lg:grid-cols-4"}>{children}</div>}
function D({b,v}:{b:string;v:string|number|null|undefined}){return <div className="rounded-xl border border-slate-200 bg-slate-50 shadow-sm px-4 py-3"><div className="text-[10px] font-black uppercase text-slate-500">{b}</div><div className="mt-1 break-words text-sm font-bold">{v===null||v===undefined||String(v).trim()===""?"-":String(v)}</div></div>}

function tekKayitYazdir(k:TrafoKaydi){const w=window.open("","_blank","width=1000,height=900");if(!w)return;const f=(b:string,v:unknown)=>`<div><small>${b}</small><b>${esc(v as string)}</b></div>`;w.document.write(`<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4 portrait;margin:12mm}body{font-family:Arial}h1{border-bottom:4px solid #f97316}.s{border:1px solid #ddd;margin-top:12px}.h{background:#111827;color:white;padding:8px;font-weight:bold}.g{display:grid;grid-template-columns:repeat(4,1fr)}.g div{padding:8px;border:1px solid #eee}.g small{display:block;color:#777;font-size:8px}.g b{display:block;margin-top:4px;font-size:11px}</style></head><body><h1>BALIKESİR TRAFO DEĞİŞİM KAYDI</h1><div class="s"><div class="h">KONUM</div><div class="g">${f("Yıl",k.yil)}${f("Ay",k.ay)}${f("İlçe",k.ilce)}${f("Mahalle",k.mahalle)}${f("TR",k.tr)}${f("Lokasyon ID",k.lokasyon_id)}${f("Trafo ID",k.trafo_id)}${f("Trafo Tipi",k.trafo_tipi)}</div></div><div class="s"><div class="h">İŞLEM</div><div class="g">${f("Tarih",tarihGoster(k.tarih))}${f("Değişim Nedeni",k.degisim_nedeni)}${f("Kayıt No",k.sira_no||k.id)}</div></div><script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);w.document.close();}
function csvBaslikNormalize(v:string){return v.replace(/^\ufeff/,"").trim().toLocaleUpperCase("tr-TR").replace(/\s+/g," ")}
function csvParse(text:string){
  const ilk=text.split(/\r?\n/,1)[0]||"";
  const ayirici=(ilk.match(/;/g)||[]).length>=(ilk.match(/,/g)||[]).length?";":",";
  const rows:string[][]=[];let row:string[]=[],field="",quote=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){
      if(quote&&text[i+1]==='"'){field+='"';i++;}else quote=!quote;
    }else if(c===ayirici&&!quote){row.push(field);field="";}
    else if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x!==""))rows.push(row);row=[];field="";}
    else field+=c;
  }
  row.push(field);if(row.some(x=>x!==""))rows.push(row);return rows;
}
function gucYon(a:string|null,b:string|null){const n=(v:string|null)=>{if(!v)return null;const x=Number(v.replace(",",".").replace(/[^0-9.]/g,""));return Number.isFinite(x)?x:null};const x=n(a),y=n(b);if(x===null||y===null)return "—";return y>x?"↗ Artış":y<x?"↘ Azalış":"→ Aynı";}
function tarihSaatGoster(v:string|undefined|null){if(!v)return "-";const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleString("tr-TR");}
function tarihGoster(t:string|null){if(!t)return"-";const p=t.split("-");return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:t}
function esc(v:unknown){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}

