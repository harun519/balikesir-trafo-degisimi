"use client";

import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createClient, Session } from "@supabase/supabase-js";
import ExcelJS from "exceljs";

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
];
const BU_YIL = new Date().getFullYear();
const YIL_SECENEKLERI = Array.from({ length: Math.max(BU_YIL + 2, 2026) - 2017 + 1 }, (_, i) => String(2017 + i));

type Sayfa = "dashboard" | "yeni" | "kayitlar" | "arsiv" | "loglar" | "kullanicilar";
type ArsivKaydi = {
  id:string; kayit_id:number|null; yil:number; ay:string; ilce:string|null; mahalle:string|null;
  tr:string|null; lokasyon_id:string|null; trafo_id:string|null; dosya_adi:string; dosya_yolu:string;
  mime_type:string; dosya_boyutu:number|null; aciklama:string|null; yukleyen_id:string|null;
  yukleyen_email:string|null; created_at:string; updated_at:string; signed_url?:string|null;
};
type KullaniciRolu = "admin" | "editor" | "viewer";
type AppUser = { id:string; email:string|null; role:KullaniciRolu; created_at?:string; updated_at?:string; };
type AuditLog = { id:number; table_name:string; record_id:number|null; action:"INSERT"|"UPDATE"|"DELETE"; user_id:string|null; user_email:string|null; old_data:Record<string,unknown>|null; new_data:Record<string,unknown>|null; created_at:string; };
type DriveSyncLog = { id:number; baslangic:string; bitis:string|null; kaynak:string; durum:"running"|"success"|"error"; yil_sayisi:number; ay_klasoru_sayisi:number; bulunan:number; aktarilan:number; atlanan:number; hatali:number; mesaj:string|null; kullanici_email:string|null; created_at:string; };
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

export default function Home() {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url && key ? createClient(url, key) : null;
  }, []);

  const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [session,setSession]=useState<Session|null>(null); const [authKontrol,setAuthKontrol]=useState(true);
  const [girisYukleniyor,setGirisYukleniyor]=useState(false); const [authHata,setAuthHata]=useState("");
  const [misafirModu,setMisafirModu]=useState(false);
  const [sifreSifirlamaModu,setSifreSifirlamaModu]=useState(false);
  const [yeniSifre,setYeniSifre]=useState("");
  const [yeniSifreTekrar,setYeniSifreTekrar]=useState("");
  const [sifreMesaj,setSifreMesaj]=useState("");
  const [sifreIslem,setSifreIslem]=useState(false);
  const [sayfa,setSayfa]=useState<Sayfa>("dashboard"); const [kayitlar,setKayitlar]=useState<TrafoKaydi[]>([]);
  const [arsivKayitlari,setArsivKayitlari]=useState<ArsivKaydi[]>([]);
  const [arsivYukleniyor,setArsivYukleniyor]=useState(false);
  const [arsivDosya,setArsivDosya]=useState<File|null>(null);
  const [arsivYil,setArsivYil]=useState(String(new Date().getFullYear()));
  const [arsivAy,setArsivAy]=useState(AYLAR[new Date().getMonth()]);
  const [arsivIlce,setArsivIlce]=useState("");
  const [arsivMahalle,setArsivMahalle]=useState("");
  const [arsivTr,setArsivTr]=useState("");
  const [arsivLokasyon,setArsivLokasyon]=useState("");
  const [arsivTrafo,setArsivTrafo]=useState("");
  const [arsivAciklama,setArsivAciklama]=useState("");
  const [arsivFiltreYil,setArsivFiltreYil]=useState("");
  const [arsivFiltreAy,setArsivFiltreAy]=useState("");
  const [arsivFiltreIlce,setArsivFiltreIlce]=useState("");
  const [arsivArama,setArsivArama]=useState("");
  const [arsivYukleme,setArsivYukleme]=useState(false);
  const [driveAktariliyor,setDriveAktariliyor]=useState(false);
  const [driveAktarimSonucu,setDriveAktarimSonucu]=useState("");
  const [driveIlerleme,setDriveIlerleme]=useState("");
  const [driveSyncLoglar,setDriveSyncLoglar]=useState<DriveSyncLog[]>([]);
  const [topluIndiriliyor,setTopluIndiriliyor]=useState(false);
  const [veriYukleniyor,setVeriYukleniyor]=useState(false); const [genelHata,setGenelHata]=useState(""); const [basariMesaji,setBasariMesaji]=useState("");
  const [mobilMenuAcik,setMobilMenuAcik]=useState(false); const [detayKayit,setDetayKayit]=useState<TrafoKaydi|null>(null);
  const [form,setForm]=useState<FormData>(BOS_FORM); const [duzenlenenId,setDuzenlenenId]=useState<number|null>(null); const [kaydediliyor,setKaydediliyor]=useState(false); const [formAdim,setFormAdim]=useState(1);
  const [arama,setArama]=useState(""); const [filtreYil,setFiltreYil]=useState(""); const [filtreAy,setFiltreAy]=useState(""); const [filtreNeden,setFiltreNeden]=useState("");
  const [filtreIlce,setFiltreIlce]=useState(""); const [filtreBaslangic,setFiltreBaslangic]=useState(""); const [filtreBitis,setFiltreBitis]=useState("");
  const [dashboardYil,setDashboardYil]=useState(""); const [dashboardIlce,setDashboardIlce]=useState("");
  const [dashboardBaslangic,setDashboardBaslangic]=useState(""); const [dashboardBitis,setDashboardBitis]=useState("");
  const [kullaniciRolu,setKullaniciRolu]=useState<KullaniciRolu>("viewer");
  const [kullanicilar,setKullanicilar]=useState<AppUser[]>([]); const [auditLoglar,setAuditLoglar]=useState<AuditLog[]>([]);
  const [logArama,setLogArama]=useState(""); const [gecmisKayit,setGecmisKayit]=useState<TrafoKaydi|null>(null);
  const [formHatalari,setFormHatalari]=useState<string[]>([]); const [pwaGuncellemeVar,setPwaGuncellemeVar]=useState(false);
  const [dashboardHizliFiltre,setDashboardHizliFiltre]=useState<
    ""|"bu-yil"|"son30"|"ariza"|"donusum"|"guc-degisimi"|"trafo-iptal"|"yatirim"|"yeni-tesis"|"ariza-riski"|"guc-artisi"|"guc-azalisi"|"ayni-guc"
  >("");
  const [aktifAnaliz,setAktifAnaliz]=useState("dashboard");
  const [detayliKpiAcik,setDetayliKpiAcik]=useState(false);
  const [csvYukleniyor,setCsvYukleniyor]=useState(false);
  const [genelArama,setGenelArama]=useState("");
  const [genelAramaAcik,setGenelAramaAcik]=useState(false);
  const [bildirimAcik,setBildirimAcik]=useState(false);
  const [okunanBildirimler,setOkunanBildirimler]=useState<string[]>([]);
  const [yedekHazirlaniyor,setYedekHazirlaniyor]=useState(false);
  const [taslakVar,setTaslakVar]=useState(false);
  const [kontrolOnayi,setKontrolOnayi]=useState(false);
  const [favoriFiltreler,setFavoriFiltreler]=useState<FavoriFiltre[]>([]);
  const [seciliKayitlar,setSeciliKayitlar]=useState<number[]>([]);
  const [topluAlan,setTopluAlan]=useState<"ilce"|"degisim_nedeni"|"ay"|"yil">("ilce");
  const [topluDeger,setTopluDeger]=useState("");
  const [topluGuncelleniyor,setTopluGuncelleniyor]=useState(false);
  const [arsivSecili,setArsivSecili]=useState<ArsivKaydi|null>(null);
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
    const fn=(e:KeyboardEvent)=>{
      const el=e.target as HTMLElement|null;
      const yaziyor=!!el&&(["INPUT","TEXTAREA","SELECT"].includes(el.tagName)||el.isContentEditable);
      if(yaziyor)return;
      if(e.key==="/"){e.preventDefault();setGenelAramaAcik(true);setTimeout(()=>document.querySelector<HTMLInputElement>('input[placeholder*="Kayıt, trafo"]')?.focus(),0);}
      if(e.key.toLowerCase()==="n"&&duzenleyebilir){e.preventDefault();formTemizle();sayfayaGit("yeni");}
      if(e.key.toLowerCase()==="a"){e.preventDefault();sayfayaGit("arsiv");}
      if(e.key.toLowerCase()==="k"){e.preventDefault();sayfayaGit("kayitlar");}
    };
    window.addEventListener("keydown",fn);
    return ()=>window.removeEventListener("keydown",fn);
  },[duzenleyebilir]);

  useEffect(()=>{
    try{
      const raw=localStorage.getItem("trafo_okunan_bildirimler");
      if(raw){
        const arr=JSON.parse(raw);
        if(Array.isArray(arr))setOkunanBildirimler(arr.filter((x):x is string=>typeof x==="string"));
      }
    }catch{}
  },[]);

  useEffect(()=>{
    if(sayfa!=="dashboard")return;
    const ids=["degisim-nedenleri","zaman-analizi","neden-guc-analizi","ilce-analizi","trafo-guc-analizi"];
    const takip=()=>{
      const esik=window.scrollY+150;
      let aktif="dashboard";
      ids.forEach(id=>{
        const el=document.getElementById(id);
        if(el&&el.offsetTop<=esik)aktif=id;
      });
      setAktifAnaliz(aktif);
    };
    takip();
    window.addEventListener("scroll",takip,{passive:true});
    return()=>window.removeEventListener("scroll",takip);
  },[sayfa]);

  useEffect(()=>{
    if(typeof window==="undefined"||!("serviceWorker" in navigator))return;

    let reg:ServiceWorkerRegistration|null=null;
    let timer:number|undefined;
    let kapandi=false;

    const workerTakip=(worker:ServiceWorker|null)=>{
      if(!worker)return;
      const durumKontrol=()=>{
        if(worker.state==="installed"&&navigator.serviceWorker.controller&&!kapandi){
          setPwaGuncellemeVar(true);
        }
      };
      durumKontrol();
      worker.addEventListener("statechange",durumKontrol);
    };

    const kayitTakip=(r:ServiceWorkerRegistration)=>{
      if(r.waiting&&!kapandi)setPwaGuncellemeVar(true);
      workerTakip(r.installing);
    };

    const kontrol=async()=>{
      try{
        const r=reg??await navigator.serviceWorker.getRegistration();
        if(!r)return;
        reg=r;
        kayitTakip(r);
        await r.update();
        kayitTakip(r);
      }catch{}
    };

    const gorunurlukKontrol=()=>{
      if(document.visibilityState==="visible")kontrol();
    };

    navigator.serviceWorker.register("/sw.js",{updateViaCache:"none"}).then(r=>{
      if(kapandi)return;
      reg=r;
      kayitTakip(r);
      r.addEventListener("updatefound",()=>workerTakip(r.installing));
      kontrol();
      timer=window.setInterval(kontrol,60*1000);
    }).catch(()=>{});

    window.addEventListener("focus",kontrol);
    window.addEventListener("pageshow",kontrol);
    document.addEventListener("visibilitychange",gorunurlukKontrol);

    return()=>{
      kapandi=true;
      window.removeEventListener("focus",kontrol);
      window.removeEventListener("pageshow",kontrol);
      document.removeEventListener("visibilitychange",gorunurlukKontrol);
      if(timer)window.clearInterval(timer);
    };
  },[]);

  useEffect(() => {
    if(!supabase){setAuthHata("Supabase bağlantısı kurulamadı.");setAuthKontrol(false);return;}
    supabase.auth.getSession().then(({data})=>{setSession(data.session);if(data.session)setMisafirModu(false);setAuthKontrol(false);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,s)=>{
      setSession(s);
      if(s)setMisafirModu(false);
      if(event==="PASSWORD_RECOVERY"){
        setSifreSifirlamaModu(true);
        setSifreMesaj("");
      }
      setAuthKontrol(false);
    });
    return()=>subscription.unsubscribe();
  },[supabase]);

  useEffect(()=>{ if(session||misafirModu) kayitlariGetir(); else setKayitlar([]); },[session,misafirModu]);
  useEffect(()=>{ if(session||misafirModu){arsivKayitlariniGetir();driveSyncLoglariniGetir();} else {setArsivKayitlari([]);setDriveSyncLoglar([]);} },[session,misafirModu]);
  useEffect(()=>{
    if(session){kullaniciProfiliniGetir();}else{setKullaniciRolu("viewer");setKullanicilar([]);setAuditLoglar([]);}
  },[session]);
  useEffect(()=>{if(yonetici){auditLoglariGetir();kullanicilariGetir();}},[yonetici]);

  async function kullaniciProfiliniGetir(){
    if(!supabase||!session)return;
    const {data,error}=await supabase.from("app_users").select("id,email,role,created_at,updated_at").eq("id",session.user.id).maybeSingle();
    if(error){setKullaniciRolu("viewer");return;}
    setKullaniciRolu((data?.role||"viewer") as KullaniciRolu);
  }
  async function kullanicilariGetir(){
    if(!supabase)return;
    const {data}=await supabase.from("app_users").select("id,email,role,created_at,updated_at").order("email");
    setKullanicilar((data||[]) as AppUser[]);
  }
  async function auditLoglariGetir(){
    if(!supabase)return;
    const {data}=await supabase.from("trafo_audit_log").select("*").order("created_at",{ascending:false}).limit(300);
    setAuditLoglar((data||[]) as AuditLog[]);
  }
  async function driveSyncLoglariniGetir(){
    if(!supabase||!session)return;
    const {data}=await supabase.from("drive_sync_logs").select("*").order("created_at",{ascending:false}).limit(20);
    setDriveSyncLoglar((data||[]) as DriveSyncLog[]);
  }
  async function rolDegistir(id:string,role:KullaniciRolu){
    if(!supabase||!yonetici)return;
    const {error}=await supabase.from("app_users").update({role,updated_at:new Date().toISOString()}).eq("id",id);
    if(error){setGenelHata(error.message);return;}
    await kullanicilariGetir();
    setBasariMesaji("Kullanıcı yetkisi güncellendi.");setTimeout(()=>setBasariMesaji(""),2500);
  }
  function pwaGuncelle(){
    navigator.serviceWorker.getRegistration().then(reg=>{
      if(reg?.waiting){
        let yenilendi=false;
        navigator.serviceWorker.addEventListener("controllerchange",()=>{if(!yenilendi){yenilendi=true;window.location.reload();}});
        reg.waiting.postMessage({type:"SKIP_WAITING"});
      }else window.location.reload();
    });
  }

  
  async function arsivKayitlariniGetir(){
    if(!supabase)return;
    setArsivYukleniyor(true);
    const {data,error}=await supabase
      .from("trafo_form_arsivi")
      .select("*")
      .order("yil",{ascending:false})
      .order("created_at",{ascending:false});
    if(error){
      setGenelHata("Arşiv yüklenemedi: "+error.message);
      setArsivYukleniyor(false);
      return;
    }
    const liste=(data||[]) as ArsivKaydi[];
    const urlListesi=await Promise.all(liste.map(async item=>{
      const {data:urlData}=await supabase.storage
        .from("trafo-form-arsivi")
        .createSignedUrl(item.dosya_yolu,60*60);
      return {...item,signed_url:urlData?.signedUrl||null};
    }));
    setArsivKayitlari(urlListesi);
    setArsivYukleniyor(false);
  }

  function arsivDosyaSec(e:ChangeEvent<HTMLInputElement>){
    const f=e.target.files?.[0]||null;
    if(!f){setArsivDosya(null);return;}
    const izinli=["application/pdf","image/jpeg","image/png","image/webp"];
    if(!izinli.includes(f.type)){
      setGenelHata("Arşive yalnızca PDF, JPG/JPEG, PNG veya WEBP yüklenebilir.");
      e.target.value="";
      return;
    }
    if(f.size>15*1024*1024){
      setGenelHata("Arşiv dosyası en fazla 15 MB olabilir.");
      e.target.value="";
      return;
    }
    setGenelHata("");
    setArsivDosya(f);
  }

  async function arsiveYukle(){
    if(!supabase||!session||!duzenleyebilir)return;
    if(!arsivDosya){setGenelHata("Önce PDF veya görsel dosyası seçin.");return;}
    if(!arsivYil||!arsivAy){setGenelHata("Yıl ve Ay zorunludur.");return;}
    setArsivYukleme(true);setGenelHata("");
    try{
      const temizAd=arsivDosya.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g,"")
        .replace(/ı/g,"i").replace(/İ/g,"I")
        .replace(/ş/g,"s").replace(/Ş/g,"S")
        .replace(/ğ/g,"g").replace(/Ğ/g,"G")
        .replace(/ü/g,"u").replace(/Ü/g,"U")
        .replace(/ö/g,"o").replace(/Ö/g,"O")
        .replace(/ç/g,"c").replace(/Ç/g,"C")
        .replace(/[^a-zA-Z0-9._-]+/g,"_")
        .replace(/_+/g,"_")
        .replace(/^_+|_+$/g,"");
      const yilKlasor=String(arsivYil).replace(/[^0-9]/g,"");
      const ayKlasor=arsivAy.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ı/g,"i").replace(/İ/g,"I").replace(/ş/g,"s").replace(/Ş/g,"S").replace(/ğ/g,"g").replace(/Ğ/g,"G").replace(/ü/g,"u").replace(/Ü/g,"U").replace(/ö/g,"o").replace(/Ö/g,"O").replace(/ç/g,"c").replace(/Ç/g,"C").replace(/[^a-zA-Z0-9_-]+/g,"_");
      const yol=`${yilKlasor}/${ayKlasor}/${Date.now()}_${Math.random().toString(36).slice(2,8)}_${temizAd}`;
      const {error:storageError}=await supabase.storage
        .from("trafo-form-arsivi")
        .upload(yol,arsivDosya,{contentType:arsivDosya.type,upsert:false});
      if(storageError)throw storageError;

      const {error:dbError}=await supabase.from("trafo_form_arsivi").insert({
        yil:Number(arsivYil),
        ay:arsivAy,
        ilce:arsivIlce||null,
        mahalle:arsivMahalle||null,
        tr:arsivTr||null,
        lokasyon_id:arsivLokasyon||null,
        trafo_id:arsivTrafo||null,
        dosya_adi:arsivDosya.name,
        dosya_yolu:yol,
        mime_type:arsivDosya.type,
        dosya_boyutu:arsivDosya.size,
        aciklama:arsivAciklama||null,
        yukleyen_id:session.user.id,
        yukleyen_email:session.user.email||null
      });
      if(dbError){
        await supabase.storage.from("trafo-form-arsivi").remove([yol]);
        throw dbError;
      }

      setArsivDosya(null);setArsivIlce("");setArsivMahalle("");setArsivTr("");
      setArsivLokasyon("");setArsivTrafo("");setArsivAciklama("");
      const input=document.getElementById("arsiv-dosya-input") as HTMLInputElement|null;
      if(input)input.value="";
      await arsivKayitlariniGetir();
      setBasariMesaji("Dosya Trafo Form Arşivine yüklendi.");
      setTimeout(()=>setBasariMesaji(""),3000);
    }catch(err:any){
      setGenelHata("Arşiv yükleme hatası: "+(err?.message||"Bilinmeyen hata"));
    }finally{setArsivYukleme(false);}
  }

  async function googleDriveTumunuAktar(){
    if(!session||!duzenleyebilir)return;
    if(!confirm("Google Drive TUTANAKLAR klasörü şimdi senkronize edilsin mi? Yeni yıl/ay klasörleri otomatik bulunacak ve daha önce aktarılan dosyalar tekrar yüklenmeyecektir."))return;
    setDriveAktariliyor(true); setDriveAktarimSonucu(""); setDriveIlerleme("TUTANAKLAR klasörü taranıyor..."); setGenelHata("");
    try{
      const cevap=await fetch("/api/drive-aktar",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({mode:"sync"})});
      const sonuc=await cevap.json().catch(()=>({}));
      if(!cevap.ok)throw new Error(sonuc?.error||"Senkronizasyon başarısız oldu.");
      setDriveIlerleme("Tamamlandı");
      setDriveAktarimSonucu(`${Number(sonuc.yilSayisi||0)} yıl • ${Number(sonuc.ayKlasoruSayisi||0)} ay klasörü tarandı • ${Number(sonuc.bulunan||0)} dosya bulundu • ${Number(sonuc.aktarilan||0)} yeni dosya aktarıldı • ${Number(sonuc.atlanan||0)} mevcut/uygun olmayan dosya atlandı • ${Number(sonuc.hatali||0)} hata.`);
      setBasariMesaji("Google Drive senkronizasyonu tamamlandı."); await Promise.all([arsivKayitlariniGetir(),driveSyncLoglariniGetir()]); setTimeout(()=>setBasariMesaji(""),4000);
    }catch(err:any){setDriveIlerleme("");setGenelHata("Google Drive senkronizasyon hatası: "+(err?.message||"Bilinmeyen hata"));}
    finally{setDriveAktariliyor(false);}
  }


  async function arsivTopluIndir(){
    if(!session||!duzenleyebilir||!arsivFiltreYil)return;
    setTopluIndiriliyor(true);setGenelHata("");
    try{
      const q=new URLSearchParams({yil:arsivFiltreYil});
      if(arsivFiltreAy)q.set("ay",arsivFiltreAy);
      const r=await fetch(`/api/arsiv-toplu-indir?${q.toString()}`,{headers:{Authorization:`Bearer ${session.access_token}`}});
      if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j?.error||"ZIP hazırlanamadı.");}
      const blob=await r.blob();
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");a.href=url;
      a.download=`trafo-arsiv-${arsivFiltreYil}${arsivFiltreAy?`-${arsivFiltreAy}`:""}.zip`;
      document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
    }catch(e:any){setGenelHata(e?.message||"Toplu indirme başarısız oldu.");}
    finally{setTopluIndiriliyor(false);}
  }

  async function arsivDosyaSil(item:ArsivKaydi){
    if(!supabase||!yonetici)return;
    if(!confirm(`"${item.dosya_adi}" arşivden silinsin mi?`))return;
    setGenelHata("");
    const {error:storageError}=await supabase.storage.from("trafo-form-arsivi").remove([item.dosya_yolu]);
    if(storageError){setGenelHata("Dosya silinemedi: "+storageError.message);return;}
    const {error:dbError}=await supabase.from("trafo_form_arsivi").delete().eq("id",item.id);
    if(dbError){setGenelHata("Arşiv kaydı silinemedi: "+dbError.message);return;}
    setArsivKayitlari(eski=>eski.filter(x=>x.id!==item.id));
    setBasariMesaji("Arşiv dosyası silindi.");
    setTimeout(()=>setBasariMesaji(""),2500);
  }

async function kayitlariGetir(){
    if(!supabase)return; setVeriYukleniyor(true); setGenelHata("");
    const {data,error}=await supabase.from("trafo_degisim").select("*").order("tarih",{ascending:false,nullsFirst:false}).order("id",{ascending:false});
    if(error){setGenelHata("Kayıtlar yüklenemedi: "+error.message);setVeriYukleniyor(false);return;}
    setKayitlar((data||[]) as TrafoKaydi[]); setVeriYukleniyor(false);
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
  function sayfayaGit(s:Sayfa){
    if((s==="loglar"||s==="kullanicilar")&&!yonetici)return;
    if(s==="yeni"&&!duzenleyebilir)return;
    setSayfa(s);setMobilMenuAcik(false);if(s==="dashboard")setAktifAnaliz("dashboard");window.scrollTo({top:0,behavior:"smooth"});
  }
  function kayitListesineGit(f:ListeFiltreleri={}){
    setArama(f.arama||"");setFiltreYil(f.yil||"");setFiltreAy(f.ay||"");setFiltreIlce(f.ilce||"");setFiltreNeden(f.neden||"");setFiltreBaslangic(f.baslangic||"");setFiltreBitis(f.bitis||"");
    setSayfa("kayitlar");setMobilMenuAcik(false);window.scrollTo({top:0,behavior:"smooth"});
  }
  function bolumeGit(id:string){
    setSayfa("dashboard");
    setMobilMenuAcik(false);
    setAktifAnaliz(id);
    setAcikAnalizler(eski=>({...eski,[id]:true}));
    setTimeout(()=>document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"}),100);
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
      if(x?.form){setForm({...BOS_FORM,...x.form});setFormAdim(Number(x.formAdim)||1);setTaslakVar(true);setBasariMesaji("Taslak geri yüklendi.");setTimeout(()=>setBasariMesaji(""),2500);}
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
      const veri:Record<string,unknown>={[topluAlan]:topluAlan==="yil"?Number(topluDeger):topluDeger};
      const {error}=await supabase.from("trafo_degisim").update(veri).in("id",seciliKayitlar);
      if(error)throw error;
      setBasariMesaji(`${seciliKayitlar.length} kayıt toplu güncellendi.`);setSeciliKayitlar([]);setTopluDeger("");
      await kayitlariGetir();if(yonetici)await auditLoglariGetir();setTimeout(()=>setBasariMesaji(""),3000);
    }catch(e:any){setGenelHata(e?.message||"Toplu güncelleme başarısız.");}
    finally{setTopluGuncelleniyor(false);}
  }


  async function kaydet(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); if(!supabase)return;
    if(formAdim!==5){setFormAdim(5);setKontrolOnayi(false);return;}
    if(!kontrolOnayi){setGenelHata("Kaydetmeden önce Kontrol & Kaydet ekranındaki kontrol onayını işaretleyin.");return;}
    if(!duzenleyebilir){setGenelHata("Bu işlem için düzenleme yetkiniz yok.");return;}
    const hatalar:string[]=[];
    if(!form.yil)hatalar.push("Yıl");if(!form.ay)hatalar.push("Ay");if(!form.ilce)hatalar.push("İlçe");if(!form.tarih)hatalar.push("Tarih");if(!form.degisim_nedeni)hatalar.push("Değişim Nedeni");
    if(!form.trafo_id&&!form.lokasyon_id&&!form.tr)hatalar.push("Trafo ID / Lokasyon ID / TR alanlarından en az biri");
    if(hatalar.length){
      setFormHatalari(hatalar);
      setGenelHata("Zorunlu alanları kontrol edin: "+hatalar.join(", "));
      const konumHatasi=hatalar.some(h=>["Yıl","Ay","İlçe","Trafo ID / Lokasyon ID / TR alanlarından en az biri"].includes(h));
      setFormAdim(konumHatasi?1:4);
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
      tarih:form.tarih,degisim_nedeni:form.degisim_nedeni,aciklama:form.aciklama||null,
    };
    const sonuc=duzenlenenId
      ? await supabase.from("trafo_degisim").update(veri).eq("id",duzenlenenId)
      : await supabase.from("trafo_degisim").insert(veri);
    if(sonuc.error){setGenelHata(sonuc.error.message);setKaydediliyor(false);return;}
    setBasariMesaji(duzenlenenId?"Kayıt başarıyla güncellendi.":"Yeni trafo değişim kaydı başarıyla eklendi.");
    try{localStorage.removeItem("trafo_yeni_kayit_taslak");setTaslakVar(false);}catch{}
    formTemizle();await kayitlariGetir();if(yonetici)await auditLoglariGetir();setKaydediliyor(false);setSayfa("kayitlar");window.scrollTo({top:0,behavior:"smooth"});
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
    if(error){setGenelHata(error.message);return;} setDetayKayit(null);await kayitlariGetir();if(yonetici)await auditLoglariGetir();
  }

  const yillar=useMemo(()=>Array.from(new Set(kayitlar.map(k=>k.yil).filter(Boolean) as number[])).sort((a,b)=>b-a),[kayitlar]);
  const ilceler=useMemo(()=>Array.from(new Set([...ILCE_SECENEKLERI,...kayitlar.map(x=>x.ilce?.trim()).filter(Boolean) as string[]])).sort((a,b)=>a.localeCompare(b,"tr")),[kayitlar]);
  const sonKullanilanlar=useMemo(()=>{
    const son=[...kayitlar].sort((a,b)=>(b.updated_at||b.created_at||"").localeCompare(a.updated_at||a.created_at||"")).slice(0,80);
    const uniq=(arr:(string|null)[])=>Array.from(new Set(arr.filter(Boolean) as string[])).slice(0,6);
    return {
      ilce:uniq(son.map(x=>x.ilce)), marka:uniq(son.flatMap(x=>[x.sokulen_markasi,x.takilan_markasi])),
      guc:uniq(son.flatMap(x=>[x.sokulen_gucu,x.takilan_gucu])), gerilim:uniq(son.flatMap(x=>[x.sokulen_gerilim,x.takilan_gerilim]))
    };
  },[kayitlar]);

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
      };

      const seciliNeden=nedenFiltreleri[dashboardHizliFiltre];
      if(seciliNeden&&k.degisim_nedeni!==seciliNeden)return false;

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

  const maxIlce=Math.max(1,...ilceAnalizi.map(x=>x.sayi));

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
  function arsivGorunenAd(item:ArsivKaydi){
    const uzanti=(item.dosya_adi.match(/\.[^.]+$/)?.[0]||"").toLowerCase();
    if(item.ilce&&item.tr)return `${item.ilce} - ${item.tr}${uzanti}`;
    if(item.tr)return `${item.tr}${uzanti}`;
    return item.dosya_adi;
  }
  
  const arsivYillari=useMemo(()=>Array.from(new Set(arsivKayitlari.map(x=>String(x.yil)))).sort((a,b)=>Number(b)-Number(a)),[arsivKayitlari]);
  const arsivIlceler=useMemo(()=>Array.from(new Set(arsivKayitlari.map(x=>x.ilce).filter(Boolean) as string[])).sort((a,b)=>a.localeCompare(b,"tr")),[arsivKayitlari]);
  const sonSync=driveSyncLoglar[0]||null;
  const arsivToplamBoyut=useMemo(()=>arsivKayitlari.reduce((t,x)=>t+Number(x.dosya_boyutu||0),0),[arsivKayitlari]);
  const arsivBoyutGoster=(n:number)=>n>=1024*1024*1024?`${(n/1024/1024/1024).toFixed(2)} GB`:n>=1024*1024?`${(n/1024/1024).toFixed(1)} MB`:n>=1024?`${(n/1024).toFixed(0)} KB`:`${n} B`;
  const buAyKayitSayisi=useMemo(()=>{const d=new Date(),y=d.getFullYear(),a=AYLAR[d.getMonth()];return kayitlar.filter(k=>k.yil===y&&norm(k.ay)===norm(a)).length;},[kayitlar]);
  const genelAramaSonuclari=useMemo(()=>{
    const q=eslemeAnahtari(genelArama);
    if(q.length<2)return {kayit:[] as TrafoKaydi[],arsiv:[] as ArsivKaydi[]};
    const kk=kayitlar.filter(k=>eslemeAnahtari([k.tarih,k.yil,k.ay,k.ilce,k.mahalle,k.tr,k.lokasyon_id,k.trafo_id,k.sokulen_seri_no,k.takilan_seri_no,k.degisim_nedeni,k.aciklama].join(" ")).includes(q)).slice(0,6);
    const aa=arsivKayitlari.filter(a=>eslemeAnahtari([a.yil,a.ay,a.ilce,a.mahalle,a.tr,a.lokasyon_id,a.trafo_id,a.dosya_adi,a.aciklama].join(" ")).includes(q)).slice(0,6);
    return {kayit:kk,arsiv:aa};
  },[genelArama,kayitlar,arsivKayitlari]);
  const bildirimler=useMemo(()=>{
    const items:{id:string;ikon:string;baslik:string;alt:string;tur:"ok"|"warn"|"info"}[]=[];
    const son=driveSyncLoglar[0];
    if(son){items.push({id:`sync-${son.id}`,ikon:son.durum==="error"?"❌":"☁️",baslik:son.durum==="error"?"Drive senkronizasyon hatası":`${son.aktarilan} yeni form senkronize edildi`,alt:new Date(son.created_at).toLocaleString("tr-TR"),tur:son.durum==="error"?"warn":"ok"});}
    if(arsivKayitlari.length)items.push({id:`arsiv-${arsivKayitlari.length}-${arsivToplamBoyut}`,ikon:"📁",baslik:`Arşivde ${arsivKayitlari.length} dosya`,alt:`Toplam boyut ${arsivBoyutGoster(arsivToplamBoyut)}`,tur:"info"});
    return items.slice(0,6);
  },[driveSyncLoglar,arsivKayitlari,arsivToplamBoyut]);

  const okunmamisBildirimler=useMemo(
    ()=>bildirimler.filter(b=>!okunanBildirimler.includes(b.id)),
    [bildirimler,okunanBildirimler]
  );

  function bildirimOkunduYap(id:string){
    setOkunanBildirimler(prev=>{
      if(prev.includes(id))return prev;
      const next=[...prev,id].slice(-200);
      try{localStorage.setItem("trafo_okunan_bildirimler",JSON.stringify(next));}catch{}
      return next;
    });
  }

  function tumBildirimleriOkunduYap(){
    setOkunanBildirimler(prev=>{
      const next=Array.from(new Set([...prev,...bildirimler.map(b=>b.id)])).slice(-200);
      try{localStorage.setItem("trafo_okunan_bildirimler",JSON.stringify(next));}catch{}
      return next;
    });
  }


  function jsonSistemYedegiAl(){
    setYedekHazirlaniyor(true);
    try{
      const payload={created_at:new Date().toISOString(),trafo_degisim:kayitlar,trafo_form_arsivi:arsivKayitlari.map(({signed_url,...x})=>x),drive_sync_logs:driveSyncLoglar,audit_logs:yonetici?auditLoglar:[]};
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json;charset=utf-8"});
      const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`BALIKESIR_TRAFO_SISTEM_YEDEGI_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);
    }finally{setYedekHazirlaniyor(false);}
  }
  async function arsivYilZipIndir(yil:string){
    if(!session||!duzenleyebilir)return;
    setTopluIndiriliyor(true);setGenelHata("");
    try{
      const r=await fetch(`/api/arsiv-toplu-indir?yil=${encodeURIComponent(yil)}`,{headers:{Authorization:`Bearer ${session.access_token}`}});
      if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j?.error||"ZIP hazırlanamadı.");}
      const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`trafo-arsiv-${yil}.zip`;a.click();URL.revokeObjectURL(url);
    }catch(e:any){setGenelHata(e?.message||"Yıl arşivi indirilemedi.");}finally{setTopluIndiriliyor(false);}
  }

  const filtrelenmisArsiv=useMemo(()=>{
    const q=arsivArama.trim().toLocaleUpperCase("tr-TR");
    return arsivKayitlari.filter(x=>{
      if(arsivFiltreYil&&String(x.yil)!==arsivFiltreYil)return false;
      if(arsivFiltreAy&&x.ay!==arsivFiltreAy)return false;
      if(arsivFiltreIlce&&x.ilce!==arsivFiltreIlce)return false;
      if(q){
        const metin=[x.dosya_adi,x.ilce,x.mahalle,x.tr,x.lokasyon_id,x.trafo_id,x.aciklama]
          .map(v=>String(v||"").toLocaleUpperCase("tr-TR")).join(" ");
        if(!metin.includes(q))return false;
      }
      return true;
    });
  },[arsivKayitlari,arsivFiltreYil,arsivFiltreAy,arsivFiltreIlce,arsivArama]);

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
    const n=(v:string)=>{const x=Number(v.replace(",",".").replace(/[^0-9.]/g,""));return Number.isFinite(x)?x:null;};
    const s=n(form.sokulen_gucu),t=n(form.takilan_gucu);if(s===null||t===null)return "";return t>s?"↗ Güç Artışı":t<s?"↘ Güç Azalışı":"→ Aynı Güç";
  },[form.sokulen_gucu,form.takilan_gucu]);
  const gecmisKayitlari=useMemo(()=>{
    if(!gecmisKayit)return [] as TrafoKaydi[];
    const tid=gecmisKayit.trafo_id?.trim(),lid=gecmisKayit.lokasyon_id?.trim(),tr=gecmisKayit.tr?.trim();
    return kayitlar.filter(k=>(tid&&k.trafo_id?.trim()===tid)||(lid&&k.lokasyon_id?.trim()===lid)||(!tid&&!lid&&tr&&k.tr?.trim()===tr)).sort((a,b)=>(b.tarih||"").localeCompare(a.tarih||""));
  },[gecmisKayit,kayitlar]);
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
      for(let i=0;i<veri.length;i+=100){const {error}=await supabase.from("trafo_degisim").insert(veri.slice(i,i+100));if(error)throw error;}
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
      for(let i=0;i<excelOnizleme.kayitlar.length;i+=100){const {error}=await supabase.from("trafo_degisim").insert(excelOnizleme.kayitlar.slice(i,i+100));if(error)throw error;}
      setBasariMesaji(`${excelOnizleme.kayitlar.length} kayıt Excel'den aktarıldı.`);setExcelOnizleme(null);await kayitlariGetir();if(yonetici)await auditLoglariGetir();setTimeout(()=>setBasariMesaji(""),3500);
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

  function raporuYazdir(){
    if(!filtrelenmisKayitlar.length){alert("Yazdırılacak kayıt bulunmuyor.");return;}
    const sat=filtrelenmisKayitlar.map((k,i)=>`<tr><td>${k.sira_no??i+1}</td><td>${tarihGoster(k.tarih)}</td><td>${k.yil??""}</td><td>${k.ay??""}</td><td>${esc(k.ilce)}</td><td>${esc(k.mahalle)}</td><td>${esc(k.tr)}</td><td>${esc(k.lokasyon_id)}</td><td>${esc(k.trafo_id)}</td><td>${esc(k.sokulen_gucu)}</td><td>${esc(k.sokulen_markasi)}</td><td>${esc(k.takilan_gucu)}</td><td>${esc(k.takilan_markasi)}</td><td>${esc(k.degisim_nedeni)}</td></tr>`).join("");
    const w=window.open("","_blank","width=1400,height=900");if(!w){alert("Yazdırma penceresi açılamadı.");return;}
    w.document.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Balıkesir Trafo Değişim Raporu</title><style>@page{size:A4 landscape;margin:8mm}body{font-family:Arial;color:#111827}h1{border-bottom:4px solid #f97316;padding-bottom:8px}table{width:100%;border-collapse:collapse;font-size:8px}th{background:#111827;color:white;padding:5px}td{padding:4px;border:1px solid #d1d5db}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><h1>BALIKESİR TRAFO DEĞİŞİM RAPORU</h1><p><b>Toplam Kayıt:</b> ${filtrelenmisKayitlar.length}</p><table><thead><tr><th>No</th><th>Tarih</th><th>Yıl</th><th>Ay</th><th>İlçe</th><th>Mahalle</th><th>TR</th><th>Lokasyon ID</th><th>Trafo ID</th><th>Sökülen Güç</th><th>Sökülen Marka</th><th>Takılan Güç</th><th>Takılan Marka</th><th>Neden</th></tr></thead><tbody>${sat}</tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
    w.document.close();
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
            <h1 className="mt-7 text-5xl font-black leading-[1.05] tracking-tight xl:text-6xl">Trafo Değişim<span className="block text-orange-400">Yönetim Sistemi</span></h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 xl:text-lg">Trafo değişim kayıtlarını yönetin, istatistikleri takip edin ve değişim nedenlerini tek ekrandan analiz edin.</p>

            <div className="mt-10 grid gap-4">
              {[
                ["📋","Kayıt Yönetimi","Trafo değişim kayıtlarını kolayca oluşturun ve yönetin."],
                ["📊","İstatistik & Analiz","Yıllık, aylık ve neden bazlı analizlerle içgörü elde edin."],
                ["⚡","Güç Değişimi Takibi","Eski ve yeni güç değerlerini otomatik karşılaştırın."],
                ["☁️","Drive Senkronizasyonu","Trafo formlarınızı Google Drive ile otomatik eşitleyin."],
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
              <div><div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-300">Enerji Altyapısı</div><div className="mt-2 max-w-sm text-sm leading-6 text-slate-300">Saha kayıtları, trafo formları ve değişim geçmişi tek güvenli sistemde.</div></div>
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

              <button type="button" onClick={misafirGirisi} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">👁 Misafir Olarak Görüntüle</button>

              <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-slate-400"><span>🔒</span><span>Tüm verileriniz güvenle korunmaktadır.</span></div>
            </form>
          </div>

          <div className="mt-7 text-center text-[11px] leading-5 text-slate-400">© {new Date().getFullYear()} Balıkesir Trafo Değişim Sistemi<br/>Tüm hakları saklıdır.</div>
        </div>
      </section>
    </div>
  </main>;

  return <main className="min-h-screen w-screen max-w-[100vw] overflow-x-hidden bg-[#f4f7fb] text-[#12213a]">
    {mobilMenuAcik&&<div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={()=>setMobilMenuAcik(false)}/>}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-[310px] flex-col border-r border-slate-200 bg-white text-slate-800 shadow-2xl transition-transform lg:hidden ${mobilMenuAcik?"translate-x-0":"-translate-x-full"}`}>
      <div className="flex items-start justify-between border-b border-slate-200 px-5 py-6"><div className="flex items-center gap-3"><div className="text-4xl text-orange-500">⚡</div><div><div className="text-sm font-black tracking-wide text-[#12315b]">BALIKESİR</div><div className="mt-0.5 text-xs font-bold tracking-[.08em] text-[#12315b]">TRAFO DEĞİŞİMİ</div></div></div><button onClick={()=>setMobilMenuAcik(false)} className="h-10 w-10 rounded-xl border border-slate-200 bg-slate-50 text-xl text-slate-500">×</button></div>
      <Nav sayfa={sayfa} duzenlenenId={duzenlenenId} formTemizle={formTemizle} git={sayfayaGit} bolumeGit={bolumeGit} aktifAnaliz={aktifAnaliz} misafirModu={misafirModu} rol={kullaniciRolu}/>
      <div className="border-t border-slate-200 p-4"><div className="mb-3 break-all text-xs text-slate-500">{misafirModu ? "👁 Görüntüleme Modu" : <>{session?.user.email}<span className="ml-2 rounded-full bg-orange-500/15 px-2 py-1 text-[9px] font-black uppercase text-orange-300">{kullaniciRolu}</span></>}</div><button onClick={cikisYap} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold">Çıkış Yap</button></div>
    </aside>

    <div className="flex min-h-screen w-full max-w-full">
      <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-[248px] flex-col border-r border-slate-200 bg-white text-slate-800 shadow-[8px_0_30px_rgba(15,23,42,.06)] lg:flex"><div className="border-b border-slate-200 px-5 py-6"><div className="flex items-center gap-3"><div className="text-[42px] leading-none text-orange-500">⚡</div><div><div className="text-[19px] font-black tracking-tight text-[#12315b]">BALIKESİR</div><div className="mt-0.5 text-[12px] font-bold tracking-[.08em] text-[#12315b]">TRAFO DEĞİŞİMİ</div></div></div></div><Nav sayfa={sayfa} duzenlenenId={duzenlenenId} formTemizle={formTemizle} git={sayfayaGit} bolumeGit={bolumeGit} aktifAnaliz={aktifAnaliz} misafirModu={misafirModu} rol={kullaniciRolu}/><div className="mt-auto border-t border-slate-200 p-4"><div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="truncate text-xs font-semibold text-slate-700">{misafirModu ? "👁 Görüntüleme Modu" : session?.user.email}</div>{!misafirModu&&<span className="mt-2 inline-flex rounded-full bg-blue-100 px-2 py-1 text-[9px] font-black uppercase text-blue-700">{kullaniciRolu}</span>}</div><button onClick={cikisYap} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">↪ Çıkış Yap</button></div></aside>

      <section className="w-full min-w-0 max-w-full flex-1 overflow-x-hidden lg:ml-[248px]">
        <header className="sticky top-0 z-30 flex min-h-[76px] items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-5 lg:px-7"><button onClick={()=>setMobilMenuAcik(true)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-700 shadow-sm lg:hidden">☰</button><div className="relative min-w-0 flex-1 sm:min-w-[280px] sm:max-w-xl"><div className="relative"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">⌕</span><input value={genelArama} onFocus={()=>setGenelAramaAcik(true)} onChange={e=>{setGenelArama(e.target.value);setGenelAramaAcik(true);}} placeholder="Kayıt, trafo, mahalle, seri no veya form ara..." className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></div>{genelAramaAcik&&genelArama.trim().length>=2&&<div className="absolute left-0 right-0 top-[54px] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,.18)]"><div className="max-h-[420px] overflow-y-auto p-2"><div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Trafo Kayıtları</div>{genelAramaSonuclari.kayit.length?genelAramaSonuclari.kayit.map(k=><button key={`k-${k.id}`} type="button" onClick={()=>{setDetayKayit(k);setGenelAramaAcik(false);}} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left hover:bg-blue-50"><div className="min-w-0"><div className="truncate text-xs font-black text-slate-800">{k.ilce||"-"} / {k.mahalle||"-"} • {k.trafo_id||k.tr||"Trafo"}</div><div className="mt-1 text-[10px] text-slate-400">{tarihGoster(k.tarih)} • {k.degisim_nedeni||"-"}</div></div><span className="text-blue-600">→</span></button>):<div className="px-3 py-2 text-xs text-slate-400">Kayıt bulunamadı.</div>}<div className="mt-1 border-t border-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Arşiv Dosyaları</div>{genelAramaSonuclari.arsiv.length?genelAramaSonuclari.arsiv.map(a=><button key={`a-${a.id}`} type="button" onClick={()=>{if(a.signed_url)window.open(a.signed_url,"_blank");setGenelAramaAcik(false);}} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-blue-50"><span className="text-xl">{a.mime_type.startsWith("image/")?"🖼️":"📄"}</span><div className="min-w-0"><div className="truncate text-xs font-black text-slate-800">{a.dosya_adi}</div><div className="mt-1 text-[10px] text-slate-400">{a.yil} • {a.ay} {a.ilce?`• ${a.ilce}`:""}</div></div></button>):<div className="px-3 py-2 text-xs text-slate-400">Dosya bulunamadı.</div>}</div></div>}</div><div className="ml-auto flex items-center gap-2">{session&&duzenleyebilir&&<button type="button" disabled={driveAktariliyor} onClick={googleDriveTumunuAktar} className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 md:block">☁ {driveAktariliyor?"Senkronize ediliyor...":"Drive Senkronizasyonu"}</button>}<div className="relative"><button type="button" onClick={()=>setBildirimAcik(x=>!x)} className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm shadow-sm hover:bg-slate-50">🔔{okunmamisBildirimler.length>0&&<span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">{okunmamisBildirimler.length}</span>}</button>{bildirimAcik&&<div className="absolute right-0 top-12 z-50 w-[330px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,.18)]"><div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3"><div><div className="text-sm font-black">Bildirimler</div><div className="text-[10px] text-slate-400">Sistem ve arşiv durumu</div></div><div className="flex items-center gap-2">{okunmamisBildirimler.length>0&&<button type="button" onClick={tumBildirimleriOkunduYap} className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-[9px] font-black text-blue-700">Tümünü Oku</button>}<button onClick={()=>setBildirimAcik(false)} className="text-slate-400">×</button></div></div><div className="max-h-[360px] overflow-y-auto p-2">{bildirimler.length?bildirimler.map(b=>{const okundu=okunanBildirimler.includes(b.id);return <button key={b.id} type="button" onClick={()=>{bildirimOkunduYap(b.id);if(b.id.startsWith("arsiv-")){setSayfa("arsiv");}setBildirimAcik(false);}} className={`flex w-full gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50 ${okundu?"opacity-55":"bg-blue-50/35"}`}><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${b.tur==="warn"?"bg-red-50":b.tur==="ok"?"bg-emerald-50":"bg-blue-50"}`}>{b.ikon}</div><div className="min-w-0"><div className="flex items-center gap-2"><div className="truncate text-xs font-black text-slate-800">{b.baslik}</div>{!okundu&&<span className="h-2 w-2 shrink-0 rounded-full bg-blue-500"/>}</div><div className="mt-1 text-[10px] leading-4 text-slate-400">{b.alt}</div></div></button>}):<div className="p-6 text-center text-xs text-slate-400">Yeni bildirim yok.</div>}</div></div>}</div><div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:flex"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">H</div><div><div className="text-[11px] font-black text-slate-800">{misafirModu?"Misafir":"Admin"}</div><div className="text-[9px] text-slate-400">{misafirModu?"Görüntüleme":kullaniciRolu}</div></div></div></div></header>

        <div className="mx-auto w-full min-w-0 max-w-[1700px] p-3 sm:p-5 lg:p-6">
          {pwaGuncellemeVar&&<div className="mb-5 flex flex-col gap-3 rounded-2xl border border-orange-500/40 bg-orange-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-black text-orange-300">⚡ Yeni sürüm hazır</div><div className="mt-1 text-xs text-slate-400">Uygulamanın güncel sürümünü yükleyebilirsiniz.</div></div><button onClick={pwaGuncelle} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-black">Güncelle</button></div>}
          {genelHata&&<HataKutusu>{genelHata}</HataKutusu>}{basariMesaji&&<div className="mb-5 rounded-xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">{basariMesaji}</div>}

          {sayfa==="dashboard"&&<>
            <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <OzetKart ikon="⚡" baslik="TOPLAM DEĞİŞİM" deger={String(kayitlar.length)} alt="Tüm zamanlar"/>
              <OzetKart ikon="📅" baslik="BU AY" deger={String(buAyKayitSayisi)} alt={`${AYLAR[new Date().getMonth()]} ${new Date().getFullYear()}`}/>
              <OzetKart ikon="🚨" baslik="ARIZA" deger={String(kayitlar.filter(k=>norm(k.degisim_nedeni)==="ARIZA").length)} alt="Toplam arıza kaydı"/>
              <OzetKart ikon="📁" baslik="ARŞİV" deger={String(arsivKayitlari.length)} alt={arsivBoyutGoster(arsivToplamBoyut)}/>
              <OzetKart ikon={yilKarsilastirma.oran===null?"↔":yilKarsilastirma.oran>=0?"↗":"↘"} baslik="GEÇEN YILA GÖRE" deger={yilKarsilastirma.oran===null?"—":`${yilKarsilastirma.oran>=0?"+":""}${yilKarsilastirma.oran.toFixed(1)}%`} alt={`${yilKarsilastirma.y-1}: ${yilKarsilastirma.once} • ${yilKarsilastirma.y}: ${yilKarsilastirma.simdi}`}/>
            </div>
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,.07)] ring-1 ring-slate-100">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[1fr_1fr_1fr_1fr_auto_auto] 2xl:items-end">
                <Alan baslik="YIL"><select value={dashboardYil} onChange={e=>setDashboardYil(e.target.value)} className={inputSinif}><option value="">Tüm Yıllar</option>{yillar.map(y=><option key={y}>{y}</option>)}</select></Alan>
                <Alan baslik="İLÇE"><select value={dashboardIlce} onChange={e=>setDashboardIlce(e.target.value)} className={inputSinif}><option value="">Tüm İlçeler</option>{ilceler.map(i=><option key={i}>{i}</option>)}</select></Alan>
                <Alan baslik="BAŞLANGIÇ TARİHİ"><input type="date" value={dashboardBaslangic} onChange={e=>setDashboardBaslangic(e.target.value)} className={inputSinif}/></Alan>
                <Alan baslik="BİTİŞ TARİHİ"><input type="date" value={dashboardBitis} onChange={e=>setDashboardBitis(e.target.value)} className={inputSinif}/></Alan>
                <button onClick={()=>{setDashboardYil("");setDashboardIlce("");setDashboardBaslangic("");setDashboardBitis("");setDashboardHizliFiltre("");}} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold hover:bg-slate-100 hover:text-blue-700">Filtreyi Temizle</button>
                {duzenleyebilir&&<button onClick={()=>{formTemizle();sayfayaGit("yeni");}} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-md shadow-blue-200 transition hover:bg-blue-700">+ Yeni Trafo Kaydı</button>}
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
                <HizliFiltre aktif={dashboardHizliFiltre==="guc-artisi"} onClick={()=>setDashboardHizliFiltre("guc-artisi")}>Güç Artışı</HizliFiltre>
                <HizliFiltre aktif={dashboardHizliFiltre==="guc-azalisi"} onClick={()=>setDashboardHizliFiltre("guc-azalisi")}>Güç Azalışı</HizliFiltre>
                <HizliFiltre aktif={dashboardHizliFiltre==="ayni-guc"} onClick={()=>setDashboardHizliFiltre("ayni-guc")}>Aynı Güç</HizliFiltre>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"><KpiKart baslik="TOPLAM KAYIT" sayi={dashboardKayitlari.length} renk="#f97316" onClick={()=>kayitListesineGit({yil:dashboardYil,ilce:dashboardIlce,baslangic:dashboardBaslangic,bitis:dashboardBitis})}/><KpiKart baslik={seciliNedenKpi.ad} sayi={nedenSayilari[seciliNedenKpi.ad]||0} renk={seciliNedenKpi.renk} onClick={()=>kayitListesineGit({yil:dashboardYil,ilce:dashboardIlce,neden:seciliNedenKpi.ad,baslangic:dashboardBaslangic,bitis:dashboardBitis})}/><OzetKart ikon="📅" baslik="SON 30 GÜN" deger={String(son30Gun)} alt="Trafo değişim kaydı"/><OzetKart ikon="📍" baslik="EN YOĞUN İLÇE" deger={String(enCokIlce[0])} alt={`${enCokIlce[1]} kayıt`} onClick={()=>enCokIlce[0]!=="-"&&kayitListesineGit({ilce:String(enCokIlce[0]),yil:dashboardYil,baslangic:dashboardBaslangic,bitis:dashboardBitis})}/></div>
            <div className="mt-3"><button onClick={()=>setDetayliKpiAcik(x=>!x)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-400 hover:text-white">{detayliKpiAcik?"▲ Detaylı KPI'ları Gizle":"▼ Detaylı KPI'ları Göster"}</button>{detayliKpiAcik&&<div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">{NEDENLER.filter(n=>n.ad!=="ARIZA").map(n=><KpiKart key={n.ad} baslik={n.ad} sayi={nedenSayilari[n.ad]||0} renk={n.renk} onClick={()=>kayitListesineGit({yil:dashboardYil,ilce:dashboardIlce,neden:n.ad,baslangic:dashboardBaslangic,bitis:dashboardBitis})}/>)}</div>}</div>

            <div id="degisim-nedenleri" className="mt-5 grid scroll-mt-24 items-stretch gap-5 xl:grid-cols-[.72fr_1.28fr]">
              <Panel baslik="Değişim Nedenleri" altBaslik="Seçili filtreye göre dağılım" className="h-full" daraltilabilir acik={acikAnalizler["degisim-nedenleri"]} onToggle={()=>analizAcKapa("degisim-nedenleri")}>
                <div className="flex min-h-[430px] flex-col"><div className="flex flex-1 items-center justify-center py-5"><div className="relative h-44 w-44 rounded-full sm:h-48 sm:w-48" style={{background:`conic-gradient(${donutGradient})`}}><div className="absolute inset-7 flex flex-col items-center justify-center rounded-full border border-slate-200 bg-white"><div className="text-3xl font-black">{dashboardKayitlari.length}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Toplam</div></div></div></div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">{NEDENLER.map(n=><button type="button" onClick={()=>kayitListesineGit({yil:dashboardYil,ilce:dashboardIlce,neden:n.ad,baslangic:dashboardBaslangic,bitis:dashboardBitis})} key={n.ad} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/60"><div className="flex min-w-0 items-center gap-2.5"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{backgroundColor:n.renk}}/><span className="truncate text-[11px] font-bold text-slate-700">{n.ad}</span></div><span className="ml-3 text-sm font-black">{nedenSayilari[n.ad]||0} →</span></button>)}</div>
                </div>
              </Panel>
              <div id="zaman-analizi" className="scroll-mt-24"><Panel baslik="Yıllara Göre Değişim Nedenleri" altBaslik="Her renk ayrı bir değişim nedenini gösterir" className="h-full" daraltilabilir acik={acikAnalizler["zaman-analizi"]} onToggle={()=>analizAcKapa("zaman-analizi")}><GrafikLegend/><BarChart items={yillikNedenler.map(x=>({label:String(x.yil),total:x.toplam,values:x.nedenler}))} max={maxYillik} onBarClick={(label,neden)=>kayitListesineGit({yil:label,ilce:dashboardIlce,neden})}/></Panel></div>
            </div>

            <div className="mt-5"><Panel baslik="Aylara Göre Değişim Nedenleri" altBaslik={dashboardYil?`${dashboardYil} yılı aylık dağılımı`:"Aylık dağılım için yukarıdan bir yıl seçin"}><GrafikLegend/>{dashboardYil?<BarChart items={aylikNedenler.map(x=>({label:x.ay.substring(0,3),total:x.toplam,values:x.nedenler}))} max={maxAylik} aylik onBarClick={(label,neden)=>kayitListesineGit({yil:dashboardYil,ilce:dashboardIlce,ay:AYLAR.find(a=>a.substring(0,3)===label)||"",neden})}/>:<BosAlan>Aylık grafiği görüntülemek için yıl seçiniz.</BosAlan>}</Panel></div>

            <div className="mt-5 scroll-mt-24" id="neden-guc-analizi">
              <Panel
                baslik="Değişim Nedeni × Güç Analizi"
                altBaslik="Değişim nedenlerine göre güç artışı / aynı / azalış dağılımı ve öne çıkan geçişler"
                daraltilabilir acik={acikAnalizler["neden-guc-analizi"]} onToggle={()=>analizAcKapa("neden-guc-analizi")}
              >
                <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <GucKpi baslik="GÜÇ ARTIRILAN" sayi={gucAnalizi.artan} alt={`%${((gucAnalizi.artan/gucToplam)*100).toFixed(1)}`} ikon="↗" ton="emerald"/>
                  <GucKpi baslik="GÜÇ AZALTILAN" sayi={gucAnalizi.azalan} alt={`%${((gucAnalizi.azalan/gucToplam)*100).toFixed(1)}`} ikon="↘" ton="red"/>
                  <GucKpi baslik="AYNI GÜÇ" sayi={gucAnalizi.ayni} alt={`%${((gucAnalizi.ayni/gucToplam)*100).toFixed(1)}`} ikon="→" ton="blue"/>
                  <GucKpi baslik="KARŞILAŞTIRILABİLEN" sayi={gucAnalizi.karsilastirilabilir} alt={`${dashboardKayitlari.length} toplam kayıttan`} ikon="⚡" ton="orange"/>
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-[1.7fr_.9fr]">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 shadow-sm p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-black">Değişim Nedenine Göre Güç Dağılımı</div>
                        <div className="mt-1 text-xs text-slate-500">Her neden için karşılaştırılabilir güç kayıtları</div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <div className="min-w-[760px]">
                        <div className="grid grid-cols-[1.35fr_.55fr_1fr_1fr_1fr_.7fr] gap-3 border-b border-slate-200 px-3 pb-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                          <div>Değişim Nedeni</div>
                          <div>Kayıt</div>
                          <div className="text-emerald-400">↗ Artan</div>
                          <div className="text-blue-400">→ Aynı</div>
                          <div className="text-red-400">↘ Azalan</div>
                          <div>Artış Oranı</div>
                        </div>

                        <div className="mt-2 space-y-2">
                          {nedenGucAnalizi.map(item=>(
                            <div
                              key={item.neden}
                              className="grid grid-cols-[1.35fr_.55fr_1fr_1fr_1fr_.7fr] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="h-3 w-3 shrink-0 rounded-full" style={{backgroundColor:item.renk}}/>
                                <span className="truncate text-xs font-black">{item.neden}</span>
                              </div>

                              <div className="text-sm font-black">{item.karsilastirilabilir}</div>

                              <NedenGucHucre sayi={item.artan} oran={item.artisOrani} ton="emerald"/>
                              <NedenGucHucre sayi={item.ayni} oran={item.ayniOrani} ton="blue"/>
                              <NedenGucHucre sayi={item.azalan} oran={item.azalisOrani} ton="red"/>

                              <div className="text-sm font-black text-emerald-400">
                                %{item.artisOrani.toFixed(1)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 shadow-sm p-4 sm:p-5">
                    <div>
                      <div className="text-sm font-black">Nedene Göre En Sık Güç Geçişleri</div>
                      <div className="mt-1 text-xs text-slate-500">Sökülen → takılan güç</div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {nedenGucAnalizi.map(item=>(
                        <div key={item.neden} className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{backgroundColor:item.renk}}/>
                              <span className="truncate text-xs font-black">{item.neden}</span>
                            </div>
                            <span className="text-[10px] text-slate-500">En sık geçiş</span>
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-3">
                            <div className="truncate text-sm font-black">{item.enSikGecis} kVA</div>
                            <span className="shrink-0 rounded-full bg-orange-500/15 px-2.5 py-1 text-[10px] font-black text-orange-300">
                              {item.enSikGecisSayisi} kayıt
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-3 text-sm font-black">Öne Çıkan Özetler</div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <OzelOzet
                      baslik="GÜÇ DEĞİŞİMİ KAYITLARINDA GERÇEK ARTIŞ ORANI"
                      deger={gucDegisimiNedeni ? `%${gucDegisimiNedeni.artisOrani.toFixed(1)}` : "-"}
                      alt={gucDegisimiNedeni ? `${gucDegisimiNedeni.artan} / ${gucDegisimiNedeni.karsilastirilabilir} kayıt` : "Veri yok"}
                      ton="emerald"
                    />
                    <OzelOzet
                      baslik="ARIZA KAYITLARINDA GERÇEK ARTIŞ ORANI"
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
            </div>

            <div className="mt-5 scroll-mt-24" id="ilce-analizi">
              <Panel
                baslik="İlçe Analizi"
                altBaslik={dashboardYil ? `${dashboardYil} yılı ilçe bazlı trafo değişim dağılımı` : "Tüm yıllar için ilçe bazlı trafo değişim dağılımı"}
                daraltilabilir acik={acikAnalizler["ilce-analizi"]} onToggle={()=>analizAcKapa("ilce-analizi")}
              >
                <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
                  <div className="space-y-3">
                    {ilceAnalizi.length===0 ? (
                      <BosAlan>İlçe analizi için kayıt bulunmuyor.</BosAlan>
                    ) : (
                      ilceAnalizi.map((item,index)=>(
                        <button type="button" onClick={()=>kayitListesineGit({yil:dashboardYil,ilce:item.ilce,baslangic:dashboardBaslangic,bitis:dashboardBitis})} key={item.ilce} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-[0_8px_24px_rgba(15,23,42,.06)] transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-md">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                                index===0 ? "bg-amber-100 text-amber-700" :
                                index===1 ? "bg-slate-200 text-slate-700" :
                                index===2 ? "bg-orange-100 text-orange-700" :
                                "bg-blue-50 text-blue-700"
                              }`}>
                                {index+1}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-black text-slate-800">{item.ilce}</div>
                                <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  Toplam içindeki payı %{item.oran.toFixed(1)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-black">{item.sayi}</div>
                              <div className="text-[10px] text-slate-500">kayıt</div>
                            </div>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all" style={{width:`${Math.max(3,(item.sayi/maxIlce)*100)}%`}} />
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,.06)]">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">EN YOĞUN 3 İLÇE</div>
                      <div className="mt-4 space-y-3">
                        {ilceAnalizi.slice(0,3).map((item,index)=>(
                          <button type="button" onClick={()=>kayitListesineGit({yil:dashboardYil,ilce:item.ilce,baslangic:dashboardBaslangic,bitis:dashboardBitis})} key={item.ilce} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-orange-500/40">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{index===0 ? "🥇" : index===1 ? "🥈" : "🥉"}</span>
                              <div>
                                <div className="text-sm font-black">{item.ilce}</div>
                                <div className="text-[10px] text-slate-500">%{item.oran.toFixed(1)}</div>
                              </div>
                            </div>
                            <div className="text-lg font-black">{item.sayi}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,.06)]">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">ÖZET</div>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="text-[10px] text-slate-500">İlçe Sayısı</div>
                          <div className="mt-1 text-2xl font-black">{ilceAnalizi.length}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="text-[10px] text-slate-500">Toplam Kayıt</div>
                          <div className="mt-1 text-2xl font-black">{ilceAnalizi.reduce((toplam,item)=>toplam+item.sayi,0)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Panel>
            </div>

            <div className="mt-5 scroll-mt-24" id="trafo-guc-analizi">
              <Panel
                baslik="Trafo Güç Analizi"
                altBaslik="Sökülen ve takılan trafo güçlerinin karşılaştırması"
                daraltilabilir acik={acikAnalizler["trafo-guc-analizi"]} onToggle={()=>analizAcKapa("trafo-guc-analizi")}
              >
                <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <GucKpi baslik="GÜÇ ARTIRILAN" sayi={gucAnalizi.artan} alt={`%${((gucAnalizi.artan/gucToplam)*100).toFixed(1)}`} ikon="↗" ton="emerald"/>
                  <GucKpi baslik="GÜÇ AZALTILAN" sayi={gucAnalizi.azalan} alt={`%${((gucAnalizi.azalan/gucToplam)*100).toFixed(1)}`} ikon="↘" ton="red"/>
                  <GucKpi baslik="AYNI GÜÇ" sayi={gucAnalizi.ayni} alt={`%${((gucAnalizi.ayni/gucToplam)*100).toFixed(1)}`} ikon="→" ton="blue"/>
                  <GucKpi baslik="KARŞILAŞTIRILABİLEN" sayi={gucAnalizi.karsilastirilabilir} alt={`${dashboardKayitlari.length} toplam kayıttan`} ikon="⚡" ton="orange"/>
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,.06)]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-black">En Çok Kullanılan Takılan Güçler</div>
                        <div className="mt-1 text-xs text-slate-500">İlk 8 güç değeri</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-right">
                        <div className="text-[9px] font-black uppercase text-slate-500">En Çok</div>
                        <div className="text-sm font-black text-orange-400">{String(gucAnalizi.enCokTakilan[0])} kVA</div>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {gucAnalizi.takilanSirali.length ? gucAnalizi.takilanSirali.map(([guc,sayi],index)=>{
                        const max=Math.max(1,Number(gucAnalizi.takilanSirali[0]?.[1]||1));
                        return <div key={guc}>
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <span className="font-black">{index+1}. {guc} kVA</span>
                            <span className="font-bold text-slate-400">{sayi} kayıt</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full rounded-full bg-orange-500" style={{width:`${Math.max(4,(Number(sayi)/max)*100)}%`}}/>
                          </div>
                        </div>
                      }) : <BosAlan>Takılan güç verisi bulunmuyor.</BosAlan>}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,.06)]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-black">En Sık Güç Geçişleri</div>
                        <div className="mt-1 text-xs text-slate-500">Sökülen güç → takılan güç</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-right">
                        <div className="text-[9px] font-black uppercase text-slate-500">En Çok Sökülen</div>
                        <div className="text-sm font-black text-slate-200">{String(gucAnalizi.enCokSokulen[0])} kVA</div>
                      </div>
                    </div>

                    <div className="mt-5 space-y-2">
                      {gucAnalizi.gecisSirali.length ? gucAnalizi.gecisSirali.map(([gecis,sayi],index)=>(
                        <div key={gecis} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-xs font-black text-slate-400">{index+1}</div>
                            <div className="truncate text-sm font-black">{gecis} kVA</div>
                          </div>
                          <div className="shrink-0 rounded-full bg-orange-500/15 px-3 py-1 text-xs font-black text-orange-300">{sayi} kayıt</div>
                        </div>
                      )) : <BosAlan>Karşılaştırılabilir güç geçişi bulunmuyor.</BosAlan>}
                    </div>
                  </div>
                </div>
              </Panel>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <OzetKart ikon={sonSync?.durum==="error"?"🔴":"☁️"} baslik="SON DRIVE SYNC" deger={sonSync?`${sonSync.aktarilan} yeni`:"—"} alt={sonSync?`${new Date(sonSync.created_at).toLocaleString("tr-TR")} • ${sonSync.durum==="success"?"Başarılı":"Hata"}`:"Henüz senkronizasyon kaydı yok"}/>
            </div>
            <div className="mt-5"><Panel baslik="Son Trafo Değişimleri" altBaslik="Sistemdeki son 8 kayıt" sagIcerik={<button onClick={()=>sayfayaGit("kayitlar")} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200">Tüm Kayıtlar →</button>}><KayitTablosu kayitlar={kayitlar.slice(0,8)} detay={setDetayKayit} duzenle={kaydiDuzenle} sil={kaydiSil} gecmis={setGecmisKayit} kopyala={kaydiKopyala} duzenleyebilir={duzenleyebilir} silebilir={silebilir}/></Panel></div>
            <div className="mt-5"><Panel baslik="Son İşlem Özeti" altBaslik={yonetici?"Son kayıt değişiklikleri ve yapan kullanıcı":"Sistemdeki son güncellenen kayıtlar"} sagIcerik={yonetici?<button onClick={()=>sayfayaGit("loglar")} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold">Tüm Loglar →</button>:undefined}>{yonetici&&auditLoglar.length?<div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{auditLoglar.slice(0,6).map(l=><LogKart key={l.id} log={l}/>)}</div>:<div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[...kayitlar].sort((a,b)=>(b.updated_at||b.created_at||"").localeCompare(a.updated_at||a.created_at||"")).slice(0,6).map(k=><button key={k.id} onClick={()=>setDetayKayit(k)} className="rounded-2xl border border-slate-200 bg-slate-50 shadow-sm p-4 text-left hover:border-orange-500/40"><div className="text-xs font-black text-orange-300">{k.ilce||"-"} / {k.mahalle||"-"}</div><div className="mt-2 text-sm font-black">Trafo ID: {k.trafo_id||"-"}</div><div className="mt-2 text-[10px] text-slate-500">Son işlem: {tarihSaatGoster(k.updated_at||k.created_at)}</div></button>)}</div>}</Panel></div>
            <div className="mt-5"><Panel baslik="☁️ Drive Senkronizasyon Sağlığı" altBaslik="Son çalışma, hata durumu ve aktarım özeti"><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className={`rounded-2xl border p-4 ${sonSync?.durum==="error"?"border-red-200 bg-red-50":sonSync?.durum==="running"?"border-blue-200 bg-blue-50":"border-emerald-200 bg-emerald-50"}`}><div className="text-[10px] font-black uppercase text-slate-500">Durum</div><div className="mt-2 text-lg font-black">{!sonSync?"Kayıt Yok":sonSync.durum==="error"?"❌ Hata":sonSync.durum==="running"?"↻ Çalışıyor":"✅ Sağlıklı"}</div></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-black uppercase text-slate-500">Son Çalışma</div><div className="mt-2 text-sm font-black">{sonSync?new Date(sonSync.created_at).toLocaleString("tr-TR"):"—"}</div></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-black uppercase text-slate-500">Son Aktarım</div><div className="mt-2 text-xl font-black">{sonSync?.aktarilan??0}</div><div className="text-[10px] text-slate-400">yeni dosya</div></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-black uppercase text-slate-500">Hata</div><div className="mt-2 text-xl font-black">{sonSync?.hatali??0}</div><div className="text-[10px] text-slate-400">{sonSync?.mesaj||"Son işlem mesajı yok"}</div></div></div></Panel></div>
            <div className="mt-5"><Panel baslik="⚡ Son Sistem Hareketleri" altBaslik="Kayıt işlemleri ve Drive senkronizasyonları tek akışta"><div className="mt-4 grid gap-3 lg:grid-cols-2">{[...(yonetici?auditLoglar.slice(0,4).map(l=>({id:`a-${l.id}`,tarih:l.created_at,ikon:l.action==="INSERT"?"➕":l.action==="UPDATE"?"✏️":"🗑️",baslik:`Kayıt ${l.action==="INSERT"?"eklendi":l.action==="UPDATE"?"güncellendi":"silindi"}`,alt:`#${l.record_id||"-"} • ${l.user_email||"Kullanıcı"}`})):[]),...driveSyncLoglar.slice(0,4).map(l=>({id:`s-${l.id}`,tarih:l.created_at,ikon:l.durum==="error"?"❌":"☁️",baslik:l.durum==="error"?"Drive senkronizasyon hatası":"Drive senkronizasyonu tamamlandı",alt:`${l.aktarilan} yeni • ${l.atlanan} atlandı`}))].sort((a,b)=>b.tarih.localeCompare(a.tarih)).slice(0,6).map(x=><div key={x.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">{x.ikon}</div><div className="min-w-0"><div className="truncate text-xs font-black text-slate-800">{x.baslik}</div><div className="mt-1 truncate text-[10px] text-slate-400">{x.alt}</div></div><div className="ml-auto shrink-0 text-[9px] text-slate-400">{new Date(x.tarih).toLocaleDateString("tr-TR")}</div></div>)}</div></Panel></div>

          </>}

          {sayfa==="yeni"&&duzenleyebilir&&<form onSubmit={kaydet} className="space-y-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{duzenlenenId?"Trafo Kaydını Düzenle":"Yeni Trafo Değişim Kaydı"}</h1>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700">{duzenlenenId?"Düzenleniyor":"Taslak"}</span>
                </div>
                <p className="mt-2 text-sm text-slate-500">Bilgileri 5 kısa adımda tamamlayın. Girdiğiniz değerler adımlar arasında korunur.</p>{taslakVar&&!duzenlenenId&&<div className="mt-3 flex flex-wrap items-center gap-2"><span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-black text-blue-700">💾 Kaydedilmiş taslak var</span><button type="button" onClick={taslakYukle} className="rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-blue-700">Taslağı Yükle</button><button type="button" onClick={taslakSil} className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-red-600">Sil</button></div>}
              </div>
              <div className="flex flex-wrap gap-2">
                {duzenlenenId&&<button type="button" onClick={()=>{formTemizle();sayfayaGit("kayitlar");}} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600 shadow-sm hover:bg-slate-50">Vazgeç</button>}
                <button type="button" onClick={()=>setFormAdim(5)} className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-blue-200 transition hover:bg-blue-700">✓ Kontrol & Kaydet</button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-[0_10px_32px_rgba(15,23,42,.07)]">
              <div className="grid min-w-[760px] grid-cols-5">
                {[
                  ["1","Konum Bilgileri","İlçe, mahalle ve lokasyon"],
                  ["2","Sökülen Trafo","Mevcut trafo bilgileri"],
                  ["3","Takılan Trafo","Yeni trafo bilgileri"],
                  ["4","Değişim Bilgisi","Tarih, neden ve açıklama"],
                  ["5","Kontrol & Kaydet","Özet ve son kontrol"],
                ].map((a,i)=>{
                  const n=i+1,aktif=formAdim===n,tamam=formAdim>n;
                  return <button type="button" key={n} onClick={()=>setFormAdim(n)} className={`relative flex min-h-[92px] items-center gap-3 border-b-4 px-4 text-left transition ${aktif?"border-blue-600 bg-blue-50/60":"border-transparent hover:bg-slate-50"}`}>
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${aktif?"bg-blue-600 text-white shadow-md shadow-blue-200":tamam?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-500"}`}>{tamam?"✓":a[0]}</span>
                    <span className="min-w-0"><span className={`block text-xs font-black ${aktif?"text-blue-700":"text-slate-800"}`}>{a[1]}</span><span className="mt-1 block text-[9px] leading-4 text-slate-400">{a[2]}</span></span>
                  </button>
                })}
              </div>
            </div>

            {formHatalari.length>0&&<div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm"><div className="font-black text-red-700">⚠ Zorunlu alanları tamamlayın</div><div className="mt-2 text-sm text-red-600">{formHatalari.join(" • ")}</div></div>}

            {akilliFormEslesme&&!duzenlenenId&&<div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><div className="font-black text-blue-800">🧠 Bu trafo daha önce kayıtlı</div><div className="mt-1 text-xs text-slate-500">Son kayıt: {tarihGoster(akilliFormEslesme.tarih)} • {akilliFormEslesme.ilce||"-"} / {akilliFormEslesme.mahalle||"-"}</div></div><div className="flex gap-2"><button type="button" onClick={()=>setGecmisKayit(akilliFormEslesme)} className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-black text-blue-700">Geçmişi Gör</button><button type="button" onClick={()=>setForm(x=>({...x,ilce:x.ilce||akilliFormEslesme.ilce||"",mahalle:x.mahalle||akilliFormEslesme.mahalle||"",tr:x.tr||akilliFormEslesme.tr||"",lokasyon_id:x.lokasyon_id||akilliFormEslesme.lokasyon_id||"",trafo_tipi:x.trafo_tipi||akilliFormEslesme.trafo_tipi||""}))} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white">Konumu Doldur</button></div></div>}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0">
                {formAdim===1&&<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_32px_rgba(15,23,42,.07)] sm:p-6">
                  <div className="flex items-start gap-3 border-b border-slate-100 pb-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">📍</div>
                    <div><h2 className="text-lg font-black text-slate-900">Konum Bilgileri</h2><p className="mt-1 text-xs text-slate-500">Trafo değişiminin gerçekleştiği konum ve sistem bilgilerini girin.</p></div>
                  </div>
                  <div className="mt-6"><FormGrid><ComboAlani baslik="Yıl *" deger={form.yil} degistir={v=>formDegistir("yil",v)} secenekler={YIL_SECENEKLERI} listeId="yil" gerekli/><SelectAlan baslik="Ay *" deger={form.ay} degistir={v=>formDegistir("ay",v)} secenekler={AYLAR} gerekli/><ComboAlani baslik="İlçe *" deger={form.ilce} degistir={v=>formDegistir("ilce",v)} secenekler={ILCE_SECENEKLERI} listeId="ilce" gerekli/><MetinAlani baslik="Mahalle" deger={form.mahalle} degistir={v=>formDegistir("mahalle",v)}/><MetinAlani baslik="TR / Trafo Bölge Adı" deger={form.tr} degistir={v=>formDegistir("tr",v)}/><MetinAlani baslik="Lokasyon ID" deger={form.lokasyon_id} degistir={v=>formDegistir("lokasyon_id",v)}/><MetinAlani baslik="Trafo ID" deger={form.trafo_id} degistir={v=>formDegistir("trafo_id",v)}/><ComboAlani baslik="Trafo Tipi" deger={form.trafo_tipi} degistir={v=>formDegistir("trafo_tipi",v)} secenekler={KONUM_TRAFO_TIPLERI} listeId="konumtip"/></FormGrid></div>
                  <div className="mt-4 flex flex-wrap items-center gap-2"><span className="text-[10px] font-black uppercase text-slate-400">Son kullanılan ilçeler</span>{sonKullanilanlar.ilce.map(x=><button type="button" key={x} onClick={()=>formDegistir("ilce",x)} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-blue-50">{x}</button>)}</div>
                  <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/60 p-4"><div className="text-xs font-black text-blue-700">ⓘ Bilgi</div><div className="mt-1 text-[11px] leading-5 text-slate-500">Trafo ID, Lokasyon ID veya TR alanlarından en az birini girin. Bu bilgiler geçmiş kayıt ve form eşleştirmesinde kullanılır.</div></div>
                </div>}

                {formAdim===2&&<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_32px_rgba(15,23,42,.07)] sm:p-6">
                  <div className="flex items-start gap-3 border-b border-slate-100 pb-5"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-xl">🔴</div><div><h2 className="text-lg font-black text-slate-900">Sökülen Trafo</h2><p className="mt-1 text-xs text-slate-500">Sahadan sökülen mevcut trafonun bilgilerini girin.</p></div></div>
                  <div className="mt-6"><FormGrid><ComboAlani baslik="Gücü" deger={form.sokulen_gucu} degistir={v=>formDegistir("sokulen_gucu",v)} secenekler={GUC_SECENEKLERI} listeId="sguc"/><ComboAlani baslik="Gerilim" deger={form.sokulen_gerilim} degistir={v=>formDegistir("sokulen_gerilim",v)} secenekler={GERILIM_SECENEKLERI} listeId="sger"/><ComboAlani baslik="Markası" deger={form.sokulen_markasi} degistir={v=>formDegistir("sokulen_markasi",v)} secenekler={MARKA_SECENEKLERI} listeId="smarka"/><MetinAlani baslik="Seri No" deger={form.sokulen_seri_no} degistir={v=>formDegistir("sokulen_seri_no",v)}/><MetinAlani baslik="İmal Yılı" deger={form.sokulen_imal_yili} degistir={v=>formDegistir("sokulen_imal_yili",v)}/><ComboAlani baslik="Trafo Tipi" deger={form.sokulen_trafo_tipi} degistir={v=>formDegistir("sokulen_trafo_tipi",v)} secenekler={TRAFO_TIP_SECENEKLERI} listeId="stip"/><MetinAlani baslik="Tamir Yılı" deger={form.sokulen_tamir_yili} degistir={v=>formDegistir("sokulen_tamir_yili",v)}/><MetinAlani baslik="Tamir Firması" deger={form.sokulen_tamir_firmasi} degistir={v=>formDegistir("sokulen_tamir_firmasi",v)}/><MetinAlani baslik="Yüklenici" deger={form.sokulen_yuklenici} degistir={v=>formDegistir("sokulen_yuklenici",v)}/></FormGrid></div>
                  <div className="mt-4 space-y-2"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-black uppercase text-slate-400">Son güçler</span>{sonKullanilanlar.guc.map(x=><button type="button" key={x} onClick={()=>formDegistir("sokulen_gucu",x)} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600">{x}</button>)}</div><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-black uppercase text-slate-400">Son markalar</span>{sonKullanilanlar.marka.map(x=><button type="button" key={x} onClick={()=>formDegistir("sokulen_markasi",x)} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600">{x}</button>)}</div></div>
                </div>}

                {formAdim===3&&<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_32px_rgba(15,23,42,.07)] sm:p-6">
                  <div className="flex items-start gap-3 border-b border-slate-100 pb-5"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl">🟢</div><div><h2 className="text-lg font-black text-slate-900">Takılan Trafo</h2><p className="mt-1 text-xs text-slate-500">Sahaya takılan yeni trafonun bilgilerini girin.</p></div></div>
                  <div className="mt-6"><FormGrid><ComboAlani baslik="Gücü" deger={form.takilan_gucu} degistir={v=>formDegistir("takilan_gucu",v)} secenekler={GUC_SECENEKLERI} listeId="tguc"/><ComboAlani baslik="Gerilim" deger={form.takilan_gerilim} degistir={v=>formDegistir("takilan_gerilim",v)} secenekler={GERILIM_SECENEKLERI} listeId="tger"/><ComboAlani baslik="Markası" deger={form.takilan_markasi} degistir={v=>formDegistir("takilan_markasi",v)} secenekler={MARKA_SECENEKLERI} listeId="tmarka"/><MetinAlani baslik="Seri No" deger={form.takilan_seri_no} degistir={v=>formDegistir("takilan_seri_no",v)}/><MetinAlani baslik="İmal Yılı" deger={form.takilan_imal_yili} degistir={v=>formDegistir("takilan_imal_yili",v)}/><ComboAlani baslik="Trafo Tipi" deger={form.takilan_trafo_tipi} degistir={v=>formDegistir("takilan_trafo_tipi",v)} secenekler={TRAFO_TIP_SECENEKLERI} listeId="ttip"/><MetinAlani baslik="Tamir Yılı" deger={form.takilan_tamir_yili} degistir={v=>formDegistir("takilan_tamir_yili",v)}/><MetinAlani baslik="Tamir Firması" deger={form.takilan_tamir_firmasi} degistir={v=>formDegistir("takilan_tamir_firmasi",v)}/></FormGrid></div>
                  {gucDurumu&&<div className={`mt-6 rounded-xl border p-4 ${gucDurumu.includes("Artışı")?"border-emerald-200 bg-emerald-50":gucDurumu.includes("Azalışı")?"border-red-200 bg-red-50":"border-blue-200 bg-blue-50"}`}><div className="text-xs font-black text-slate-800">⚡ Otomatik Güç Karşılaştırması</div><div className="mt-2 flex items-center gap-4 text-sm"><span><b>{form.sokulen_gucu||"-"}</b> kVA</span><span>→</span><span><b>{form.takilan_gucu||"-"}</b> kVA</span><span className="ml-auto font-black">{gucDurumu}</span></div></div>}
                </div>}

                {formAdim===4&&<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_32px_rgba(15,23,42,.07)] sm:p-6">
                  <div className="flex items-start gap-3 border-b border-slate-100 pb-5"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-xl">📅</div><div><h2 className="text-lg font-black text-slate-900">Değişim Bilgisi</h2><p className="mt-1 text-xs text-slate-500">İşlemin tarihini, değişim nedenini ve açıklamayı tamamlayın.</p></div></div>
                  <div className="mt-6"><FormGrid><Alan baslik="Tarih *"><input type="date" required value={form.tarih} onChange={e=>formDegistir("tarih",e.target.value)} className={inputSinif}/><span className="mt-1 block text-[10px] text-slate-400">Tarih seçildiğinde Yıl ve Ay otomatik doldurulur.</span></Alan><SelectAlan baslik="Değişim Nedeni *" deger={form.degisim_nedeni} degistir={v=>formDegistir("degisim_nedeni",v)} secenekler={NEDENLER.map(n=>n.ad)} gerekli/></FormGrid><div className="mt-4"><Alan baslik="Açıklama"><textarea rows={5} value={form.aciklama} onChange={e=>formDegistir("aciklama",e.target.value)} placeholder="İşlemle ilgili not veya açıklama..." className={inputSinif}/></Alan></div></div>
                </div>}

                {formAdim===5&&<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_32px_rgba(15,23,42,.07)] sm:p-6">
                  <div className="flex items-start gap-3 border-b border-slate-100 pb-5"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl">✓</div><div><h2 className="text-lg font-black text-slate-900">Kontrol & Kaydet</h2><p className="mt-1 text-xs text-slate-500">Kaydetmeden önce temel bilgileri son kez kontrol edin.</p></div></div><div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={kontrolOnayi} onChange={e=>setKontrolOnayi(e.target.checked)} className="mt-0.5 h-5 w-5 rounded border-slate-300 text-emerald-600"/><div><div className="text-sm font-black text-amber-900">Bilgileri kontrol ettim</div><div className="mt-1 text-xs leading-5 text-amber-700">Aşağıdaki özet bilgileri kontrol ettim ve kaydı tamamlamaya hazırım.</div></div></label></div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {[
                      ["Konum",`${form.ilce||"-"}${form.mahalle?` / ${form.mahalle}`:""}`],
                      ["Yıl / Ay",`${form.yil||"-"} / ${form.ay||"-"}`],
                      ["TR",form.tr||"-"],
                      ["Lokasyon ID",form.lokasyon_id||"-"],
                      ["Trafo ID",form.trafo_id||"-"],
                      ["Değişim Tarihi",form.tarih? tarihGoster(form.tarih):"-"],
                      ["Sökülen Trafo",`${form.sokulen_markasi||"-"} • ${form.sokulen_gucu||"-"} kVA`],
                      ["Takılan Trafo",`${form.takilan_markasi||"-"} • ${form.takilan_gucu||"-"} kVA`],
                      ["Değişim Nedeni",form.degisim_nedeni||"-"],
                      ["Güç Durumu",gucDurumu||"-"],
                    ].map(([b,d])=><div key={b} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">{b}</div><div className="mt-1 text-sm font-black text-slate-800">{d}</div></div>)}
                  </div>
                  {form.aciklama&&<div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Açıklama</div><div className="mt-2 text-sm leading-6 text-slate-600">{form.aciklama}</div></div>}
                  <button type="submit" disabled={kaydediliyor} className="mt-6 w-full rounded-xl bg-blue-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{kaydediliyor?"Kaydediliyor...":duzenlenenId?"✓ Değişiklikleri Kaydet":"✓ Trafo Kaydını Kaydet"}</button>
                </div>}
              </div>

              <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_32px_rgba(15,23,42,.07)] xl:sticky xl:top-[96px]">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-lg">🗂️</div><div><div className="text-base font-black text-slate-900">Kayıt Özeti</div><div className="mt-0.5 text-[10px] text-slate-400">Girdiğiniz bilgiler anlık görünür.</div></div></div>
                <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"><span className="text-xs font-bold text-slate-600">Kayıt Durumu</span><span className="flex items-center gap-2 text-xs font-black text-amber-700"><span className="h-2 w-2 rounded-full bg-amber-400"/> {duzenlenenId?"Düzenleniyor":"Taslak"}</span></div>
                <div className="mt-5 space-y-3 text-xs">
                  {[
                    ["📍","İlçe / Mahalle",`${form.ilce||"-"}${form.mahalle?` / ${form.mahalle}`:""}`],
                    ["#","Lokasyon ID",form.lokasyon_id||"-"],
                    ["⚡","Trafo ID",form.trafo_id||"-"],
                    ["🔴","Sökülen",form.sokulen_gucu?`${form.sokulen_gucu} kVA`:"-"],
                    ["🟢","Takılan",form.takilan_gucu?`${form.takilan_gucu} kVA`:"-"],
                    ["📅","Değişim Tarihi",form.tarih?tarihGoster(form.tarih):"-"],
                    ["👷","Yüklenici",form.sokulen_yuklenici||"-"],
                  ].map(([i,b,d])=><div key={b} className="grid grid-cols-[22px_95px_minmax(0,1fr)] items-center gap-2"><span className="text-center text-slate-400">{i}</span><span className="font-bold text-slate-500">{b}</span><span className="truncate text-right font-black text-slate-800" title={d}>{d}</span></div>)}
                </div>
                <div className={`mt-6 rounded-xl border p-4 ${gucDurumu.includes("Artışı")?"border-emerald-200 bg-emerald-50":gucDurumu.includes("Azalışı")?"border-red-200 bg-red-50":"border-blue-200 bg-blue-50"}`}>
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-600">⚡ Otomatik Güç Karşılaştırması</div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center"><div><div className="text-[9px] text-slate-400">Eski Güç</div><div className="mt-1 text-sm font-black">{form.sokulen_gucu||"-"}</div></div><div><div className="text-[9px] text-slate-400">Yeni Güç</div><div className="mt-1 text-sm font-black">{form.takilan_gucu||"-"}</div></div><div><div className="text-[9px] text-slate-400">Durum</div><div className="mt-1 text-[10px] font-black">{gucDurumu||"-"}</div></div></div>
                </div>
              </aside>
            </div>

            {veriKaliteUyarilari.length>0&&<div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm"><div className="text-sm font-black text-amber-800">🛡️ Veri Kalite Kontrolü</div><div className="mt-2 grid gap-2 sm:grid-cols-2">{veriKaliteUyarilari.map(x=><div key={x} className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-700">⚠ {x}</div>)}</div></div>}

            <div className="sticky bottom-3 z-20 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_12px_40px_rgba(15,23,42,.12)] backdrop-blur">
              <button type="button" disabled={formAdim===1} onClick={()=>{setKontrolOnayi(false);setFormAdim(x=>Math.max(1,x-1));}} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-30">← Geri</button>
              <div className="hidden text-[10px] font-bold text-slate-400 sm:block">Adım {formAdim} / 5</div>
              {formAdim<5?<button type="button" onClick={()=>{setKontrolOnayi(false);setFormAdim(x=>Math.min(5,x+1));}} className="rounded-xl bg-blue-600 px-6 py-3 text-xs font-black text-white shadow-md shadow-blue-200 transition hover:bg-blue-700">{formAdim===4?"Kontrol Et →":"Devam Et →"}</button>:<button type="submit" disabled={kaydediliyor||!kontrolOnayi} className="rounded-xl bg-emerald-600 px-6 py-3 text-xs font-black text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">{kaydediliyor?"Kaydediliyor...":duzenlenenId?"Değişiklikleri Kaydet":"Kaydı Tamamla ✓"}</button>}
            </div>
          </form>}

          {sayfa==="kayitlar"&&<>
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white shadow-[0_8px_26px_rgba(15,23,42,.06)] ring-1 ring-slate-100 p-4">
              <div className="mb-3 text-xs font-black uppercase tracking-wider text-slate-500">🔎 Gelişmiş Arama ve Filtre</div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><input value={arama} onChange={e=>setArama(e.target.value)} placeholder="Trafo ID, seri no, mahalle, firma, açıklama..." className={inputSinif}/><select value={filtreYil} onChange={e=>setFiltreYil(e.target.value)} className={inputSinif}><option value="">Tüm Yıllar</option>{yillar.map(y=><option key={y}>{y}</option>)}</select><select value={filtreAy} onChange={e=>setFiltreAy(e.target.value)} className={inputSinif}><option value="">Tüm Aylar</option>{AYLAR.map(a=><option key={a}>{a}</option>)}</select><select value={filtreIlce} onChange={e=>setFiltreIlce(e.target.value)} className={inputSinif}><option value="">Tüm İlçeler</option>{ilceler.map(i=><option key={i}>{i}</option>)}</select><select value={filtreNeden} onChange={e=>setFiltreNeden(e.target.value)} className={inputSinif}><option value="">Tüm Nedenler</option>{NEDENLER.map(n=><option key={n.ad}>{n.ad}</option>)}</select><input type="date" value={filtreBaslangic} onChange={e=>setFiltreBaslangic(e.target.value)} className={inputSinif} title="Başlangıç tarihi"/><input type="date" value={filtreBitis} onChange={e=>setFiltreBitis(e.target.value)} className={inputSinif} title="Bitiş tarihi"/></div><div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" onClick={favoriFiltreKaydet} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">⭐ Filtreyi Kaydet</button>{favoriFiltreler.map(f=><div key={f.id} className="flex overflow-hidden rounded-xl border border-slate-200 bg-white"><button type="button" onClick={()=>favoriFiltreUygula(f)} className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-blue-50">{f.ad}</button><button type="button" onClick={()=>favoriFiltreSil(f.id)} className="border-l border-slate-200 px-2 text-xs text-red-500">×</button></div>)}</div>
              <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap items-center gap-3"><div className="text-sm text-slate-400"><b className="text-white">{filtrelenmisKayitlar.length}</b> kayıt görüntüleniyor.</div><button type="button" onClick={()=>{setArama("");setFiltreYil("");setFiltreAy("");setFiltreIlce("");setFiltreNeden("");setFiltreBaslangic("");setFiltreBitis("");}} className="rounded-xl border border-orange-500 bg-orange-500/15 px-4 py-2 text-sm font-black text-orange-300 transition hover:bg-orange-500 hover:text-white">🧹 Filtreyi Temizle</button></div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5"><button onClick={raporuYazdir} className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-black">🖨️ PDF / Yazdır</button><button onClick={excelAktar} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black">📥 Excel&apos;e Aktar</button><button onClick={csvYedekAl} className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black">💾 CSV Yedek</button>{duzenleyebilir&&<label className="cursor-pointer rounded-xl bg-violet-700 px-4 py-3 text-center text-sm font-black">{csvYukleniyor?"Aktarılıyor...":"📤 CSV İçe Aktar"}<input type="file" accept=".csv,text/csv" className="hidden" disabled={csvYukleniyor} onChange={csvIceAktar}/></label>}{duzenleyebilir&&<label className="cursor-pointer rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-black text-white shadow-sm transition hover:bg-emerald-700">📤 Excel İçe Aktar<input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={excelIceAktarOnizle}/></label>}</div></div></div>
            <Panel baslik="Trafo Değişim Kayıtları" altBaslik="Detay, geçmiş, kopyalama, seçim ve toplu düzenleme">
              {duzenleyebilir&&<div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 lg:flex-row lg:items-center"><div className="text-xs font-black text-slate-600">{seciliKayitlar.length} kayıt seçili</div><select value={topluAlan} onChange={e=>{setTopluAlan(e.target.value as typeof topluAlan);setTopluDeger("");}} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"><option value="ilce">İlçe</option><option value="degisim_nedeni">Değişim Nedeni</option><option value="ay">Ay</option><option value="yil">Yıl</option></select>{topluAlan==="ilce"?<select value={topluDeger} onChange={e=>setTopluDeger(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"><option value="">Seçiniz</option>{ilceler.map(x=><option key={x}>{x}</option>)}</select>:topluAlan==="degisim_nedeni"?<select value={topluDeger} onChange={e=>setTopluDeger(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"><option value="">Seçiniz</option>{NEDENLER.map(x=><option key={x.ad}>{x.ad}</option>)}</select>:topluAlan==="ay"?<select value={topluDeger} onChange={e=>setTopluDeger(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"><option value="">Seçiniz</option>{AYLAR.map(x=><option key={x}>{x}</option>)}</select>:<select value={topluDeger} onChange={e=>setTopluDeger(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"><option value="">Seçiniz</option>{YIL_SECENEKLERI.map(x=><option key={x}>{x}</option>)}</select>}<button type="button" disabled={!seciliKayitlar.length||!topluDeger||topluGuncelleniyor} onClick={topluKayitGuncelle} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white disabled:opacity-40">{topluGuncelleniyor?"Güncelleniyor...":"Toplu Güncelle"}</button>{seciliKayitlar.length>0&&<button type="button" onClick={()=>setSeciliKayitlar([])} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500">Seçimi Temizle</button>}</div>}
              {veriYukleniyor?<BosAlan>Kayıtlar yükleniyor...</BosAlan>:<KayitTablosu kayitlar={filtrelenmisKayitlar} detay={setDetayKayit} duzenle={kaydiDuzenle} sil={kaydiSil} gecmis={setGecmisKayit} kopyala={kaydiKopyala} secili={seciliKayitlar} secimDegistir={(id)=>setSeciliKayitlar(x=>x.includes(id)?x.filter(y=>y!==id):[...x,id])} duzenleyebilir={duzenleyebilir} silebilir={silebilir}/>}
            </Panel>
          </>}

          
          {sayfa==="arsiv"&&<>
            <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <OzetKart ikon="📁" baslik="TOPLAM DOSYA" deger={String(arsivKayitlari.length)} alt="Arşivdeki tüm formlar"/>
              <OzetKart ikon="💾" baslik="TOPLAM BOYUT" deger={arsivBoyutGoster(arsivToplamBoyut)} alt="Supabase arşiv alanı"/>
              <OzetKart ikon="🗓️" baslik="YIL SAYISI" deger={String(arsivYillari.length)} alt={arsivYillari.length?`${arsivYillari[arsivYillari.length-1]} - ${arsivYillari[0]}`:"Arşiv boş"}/>
              <OzetKart ikon={sonSync?.durum==="error"?"❌":"☁️"} baslik="SON SENKRON" deger={sonSync?`${sonSync.aktarilan} yeni`:"—"} alt={sonSync?new Date(sonSync.created_at).toLocaleString("tr-TR"):"Henüz kayıt yok"}/>
            </div>
            <Panel baslik="☁️ Google Drive Senkronizasyonu" altBaslik="TUTANAKLAR • Her gün otomatik + istediğinde manuel senkronizasyon">
              <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 shadow-inner">
                <div className="text-sm font-black text-blue-800">Otomatik Trafo Form Arşivi senkronizasyonu</div>
                <div className="mt-2 text-xs leading-5 text-slate-600">TUTANAKLAR altındaki yıl ve ay klasörleri otomatik bulunur. Yeni PDF/JPG/JPEG/PNG/WEBP dosyaları arşive kopyalanır; daha önce aktarılan Drive dosyaları tekrar yüklenmez. Otomatik görev günde 1 kez çalışır. Beklemek istemezsen aşağıdaki butonu kullanabilirsin.</div>
                {driveIlerleme&&<div className="mt-3 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-700 shadow-sm">↻ {driveIlerleme}</div>}
                {driveAktarimSonucu&&<div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">✓ {driveAktarimSonucu}</div>}
                <div className="mt-4 flex justify-end"><button type="button" disabled={driveAktariliyor} onClick={googleDriveTumunuAktar} className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{driveAktariliyor?"Senkronize ediliyor...":"☁️ Şimdi Senkronize Et"}</button></div>
              </div>
            </Panel>

            <div className={`${duzenleyebilir?"mt-5":""} rounded-2xl border border-slate-200 bg-white shadow-[0_8px_26px_rgba(15,23,42,.06)] ring-1 ring-slate-100 p-4`}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-slate-500">📁 TRAFO FORM ARŞİVİ</div>
                  <div className="mt-1 text-xs text-slate-500">Yıl → Ay → Dosyalar</div>
                </div>
                <div className="flex gap-2">
                  {duzenleyebilir&&arsivFiltreYil&&<button type="button" disabled={topluIndiriliyor} onClick={arsivTopluIndir} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 shadow-sm disabled:opacity-50">{topluIndiriliyor?"ZIP hazırlanıyor...":"⬇ ZIP İndir"}</button>}
                  <button onClick={()=>{arsivKayitlariniGetir();driveSyncLoglariniGetir();}} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50">↻ Yenile</button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 text-xs font-bold text-slate-600">
                <button type="button" onClick={()=>{setArsivFiltreYil("");setArsivFiltreAy("");setArsivArama("");setArsivFiltreIlce("");}} className={`${!arsivFiltreYil?"text-blue-600":"text-slate-500 hover:text-blue-600"}`}>📁 Arşiv</button>
                {arsivFiltreYil&&<><span className="text-slate-700">›</span><button type="button" onClick={()=>{setArsivFiltreAy("");setArsivArama("");setArsivFiltreIlce("");}} className={`${!arsivFiltreAy?"text-blue-600":"text-slate-500 hover:text-blue-600"}`}>📁 {arsivFiltreYil}</button></>}
                {arsivFiltreAy&&<><span className="text-slate-700">›</span><span className="text-blue-600">📁 {arsivFiltreAy}</span></>}
              </div>

              {arsivFiltreYil&&arsivFiltreAy&&<div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input value={arsivArama} onChange={e=>setArsivArama(e.target.value)} placeholder="Bu ayda dosya, TR, mahalle ara..." className={inputSinif}/>
                <select value={arsivFiltreIlce} onChange={e=>setArsivFiltreIlce(e.target.value)} className={inputSinif}><option value="">Tüm İlçeler</option>{arsivIlceler.map(i=><option key={i}>{i}</option>)}</select>
              </div>}
            </div>

            <div className="mt-4">
              {arsivYukleniyor?<div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_26px_rgba(15,23,42,.06)] ring-1 ring-slate-100 p-8 text-center text-slate-500">Arşiv yükleniyor...</div>:
              !arsivFiltreYil?
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  {arsivYillari.map(y=>{const adet=arsivKayitlari.filter(x=>String(x.yil)===y).length;return <button type="button" key={y} onClick={()=>{setArsivFiltreYil(y);setArsivFiltreAy("");setArsivArama("");setArsivFiltreIlce("");}} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-[0_8px_22px_rgba(15,23,42,.06)] transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/60 hover:shadow-md"><div className="text-3xl">📁</div><div className="mt-2 text-base font-black group-hover:text-orange-300">{y}</div><div className="mt-1 text-[10px] font-bold text-slate-500">{adet} dosya</div></button>})}
                </div>
              :!arsivFiltreAy?
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  {AYLAR.filter(a=>arsivKayitlari.some(x=>String(x.yil)===arsivFiltreYil&&x.ay===a)).map(a=>{const adet=arsivKayitlari.filter(x=>String(x.yil)===arsivFiltreYil&&x.ay===a).length;return <button type="button" key={a} onClick={()=>{setArsivFiltreAy(a);setArsivArama("");setArsivFiltreIlce("");}} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-[0_8px_22px_rgba(15,23,42,.06)] transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/60 hover:shadow-md"><div className="text-3xl">📁</div><div className="mt-2 truncate text-sm font-black group-hover:text-orange-300">{a}</div><div className="mt-1 text-[10px] font-bold text-slate-500">{adet} dosya</div></button>})}
                </div>
              :filtrelenmisArsiv.length===0?<BosAlan>Bu ayda dosya bulunmuyor.</BosAlan>:
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,.06)]">
                  <div className="hidden grid-cols-[minmax(0,1fr)_120px_100px_110px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 md:grid">
                    <div>Dosya Adı</div><div>İlçe</div><div>Tür</div><div>İşlem</div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {filtrelenmisArsiv.map(item=>{const gorsel=item.mime_type.startsWith("image/");return <div key={item.id} className="grid gap-2 px-3 py-3 transition hover:bg-blue-50/60 md:grid-cols-[minmax(0,1fr)_120px_100px_110px] md:items-center md:gap-3 md:px-4">
                      <button type="button" disabled={!item.signed_url} onClick={()=>item.signed_url&&window.open(item.signed_url,"_blank")} className="flex min-w-0 items-center gap-3 text-left disabled:opacity-50"><span className="shrink-0 text-2xl">{gorsel?"🖼️":"📄"}</span><span className="min-w-0"><span className="block truncate text-xs font-black text-slate-800 sm:text-sm" title={item.dosya_adi}>{arsivGorunenAd(item)}</span><span className="mt-0.5 block truncate text-[10px] text-slate-500">{item.dosya_adi}</span></span></button>
                      <div className="text-[10px] font-bold text-slate-500 md:text-xs">{item.ilce||"—"}</div>
                      <div><span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-black text-slate-600">{gorsel?"GÖRSEL":"PDF"}</span></div>
                      <div className="flex gap-2"><button type="button" onClick={()=>setArsivSecili(item)} className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-black text-blue-700">Bilgi</button><button type="button" disabled={!item.signed_url} onClick={()=>item.signed_url&&window.open(item.signed_url,"_blank")} className="rounded-md bg-orange-500 px-2.5 py-1.5 text-[10px] font-black text-white disabled:opacity-40">Aç</button>{yonetici&&<button type="button" onClick={()=>arsivDosyaSil(item)} className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[10px] font-black text-red-600">Sil</button>}</div>
                    </div>})}
                  </div>
                </div>}
            </div>

            {session&&<div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-[0_8px_26px_rgba(15,23,42,.06)] ring-1 ring-slate-100 p-4">
              <div className="flex items-center justify-between gap-3"><div><div className="text-sm font-black">🕘 Senkronizasyon Geçmişi</div><div className="mt-1 text-xs text-slate-500">Son otomatik ve manuel Drive işlemleri</div></div><button onClick={driveSyncLoglariniGetir} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50">↻</button></div>
              <div className="mt-3 space-y-2">{driveSyncLoglar.length?driveSyncLoglar.slice(0,8).map(l=><div key={l.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 shadow-sm px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"><div><div className={`text-xs font-black ${l.durum==="success"?"text-emerald-700":l.durum==="error"?"text-red-700":"text-blue-700"}`}>{l.durum==="success"?"✅ Başarılı":l.durum==="error"?"❌ Hata":"↻ Çalışıyor"} • {l.kaynak==="cron"?"Otomatik":"Manuel"}</div><div className="mt-1 text-[10px] text-slate-500">{new Date(l.created_at).toLocaleString("tr-TR")}{l.kullanici_email?` • ${l.kullanici_email}`:""}</div>{l.mesaj&&<div className="mt-1 text-[10px] text-red-600">{l.mesaj}</div>}</div><div className="text-[10px] font-bold text-slate-400">{l.aktarilan} yeni • {l.atlanan} atlandı • {l.hatali} hata</div></div>):<div className="text-xs text-slate-500">Henüz senkronizasyon kaydı yok.</div>}</div>
            </div>}
          </>}

          {sayfa==="dashboard"&&yonetici&&<div className="mt-5"><Panel baslik="🛡️ Sistem Yedeği" altBaslik="Kayıtlar, arşiv metadatası ve yıllık form paketleri"><div className="mt-4 grid gap-3 md:grid-cols-3"><button type="button" onClick={excelAktar} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left transition hover:border-emerald-300"><div className="text-2xl">📊</div><div className="mt-2 text-sm font-black text-emerald-800">Tüm Kayıtları Excel</div><div className="mt-1 text-[10px] text-emerald-600">Aktif filtre yoksa tüm trafo kayıtları</div></button><button type="button" onClick={jsonSistemYedegiAl} disabled={yedekHazirlaniyor} className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left transition hover:border-blue-300 disabled:opacity-50"><div className="text-2xl">💾</div><div className="mt-2 text-sm font-black text-blue-800">Sistem JSON Yedeği</div><div className="mt-1 text-[10px] text-blue-600">Kayıt + arşiv metadata + loglar</div></button><div className="rounded-2xl border border-violet-200 bg-violet-50 p-4"><div className="text-2xl">🗜️</div><div className="mt-2 text-sm font-black text-violet-800">Yıllık Form ZIP</div><div className="mt-2 flex flex-wrap gap-1.5">{arsivYillari.slice(0,8).map(y=><button type="button" key={y} disabled={topluIndiriliyor} onClick={()=>arsivYilZipIndir(y)} className="rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-violet-700 hover:bg-violet-100">{y}</button>)}</div></div></div></Panel></div>}\n\n          {sayfa==="loglar"&&yonetici&&<>
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white shadow-[0_8px_26px_rgba(15,23,42,.06)] ring-1 ring-slate-100 p-4"><div className="flex flex-col gap-3 sm:flex-row"><input value={logArama} onChange={e=>setLogArama(e.target.value)} placeholder="Kullanıcı, kayıt no veya değişen değer ara..." className={inputSinif}/><button onClick={auditLoglariGetir} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-black">↻ Yenile</button></div></div>
            <Panel baslik="Değişiklik Geçmişi / Log" altBaslik="Yeni kayıt, düzenleme ve silme işlemleri veritabanı tarafından otomatik kaydedilir"><div className="mt-5 space-y-3">{filtrelenmisLoglar.length?filtrelenmisLoglar.map(l=><LogSatiri key={l.id} log={l} kayitAc={(id)=>{const k=kayitlar.find(x=>x.id===id);if(k)setDetayKayit(k);}}/>):<BosAlan>Henüz log kaydı bulunmuyor.</BosAlan>}</div></Panel>
          </>}

          {sayfa==="kullanicilar"&&yonetici&&<>
            <Panel baslik="Kullanıcı Yetkileri" altBaslik="Admin: tüm işlemler • Editor: ekleme/düzenleme • Viewer: yalnız görüntüleme"><div className="mt-5 space-y-3">{kullanicilar.map(u=><div key={u.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 shadow-sm p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-black">{u.email||u.id}</div><div className="mt-1 text-[10px] text-slate-500">Kullanıcı ID: {u.id}</div></div><select disabled={u.id===session?.user.id} title={u.id===session?.user.id?"Kendi yönetici yetkiniz buradan değiştirilemez.":"Kullanıcı yetkisini değiştir"} value={u.role} onChange={e=>rolDegistir(u.id,e.target.value as KullaniciRolu)} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"><option value="admin">Yönetici (Admin)</option><option value="editor">Düzenleyici (Editor)</option><option value="viewer">Görüntüleyici (Viewer)</option></select></div>)}</div><div className="mt-5 rounded-xl border border-amber-800/50 bg-amber-950/20 p-4 text-xs leading-6 text-amber-200">Yeni kullanıcı hesabını Supabase Authentication bölümünden oluşturduğunuzda kullanıcı burada otomatik görünür ve başlangıç yetkisi <b>viewer</b> olur.</div></Panel>
          </>}
        </div>
      </section>
    </div>
    <button type="button" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} className="fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-orange-500/40 bg-orange-500 text-xl font-black text-white shadow-2xl hover:bg-orange-400" title="Yukarı çık">↑</button>
    
    {gecmisKayit&&<TrafoGecmisModal anaKayit={gecmisKayit} kayitlar={gecmisKayitlari} kapat={()=>setGecmisKayit(null)} detay={k=>{setGecmisKayit(null);setDetayKayit(k);}}/>}
    {arsivSecili&&<div className="fixed inset-0 z-[95] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={()=>setArsivSecili(null)}><div onMouseDown={e=>e.stopPropagation()} className="w-full max-w-lg rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-3xl"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-wider text-blue-600">📁 Arşiv Dosyası</div><div className="mt-2 break-words text-lg font-black text-slate-900">{arsivSecili.dosya_adi}</div></div><button onClick={()=>setArsivSecili(null)} className="h-9 w-9 rounded-xl border border-slate-200">×</button></div><div className="mt-5 grid grid-cols-2 gap-3">{[["Yıl",arsivSecili.yil],["Ay",arsivSecili.ay],["İlçe",arsivSecili.ilce||"—"],["Mahalle",arsivSecili.mahalle||"—"],["Boyut",arsivBoyutGoster(Number(arsivSecili.dosya_boyutu||0))],["Eklenme",new Date(arsivSecili.created_at).toLocaleString("tr-TR")]].map(([a,b])=><div key={String(a)} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[9px] font-black uppercase text-slate-400">{a}</div><div className="mt-1 text-xs font-black text-slate-700">{String(b)}</div></div>)}</div><div className="mt-5 flex justify-end gap-2">{arsivSecili.signed_url&&<button onClick={()=>window.open(arsivSecili.signed_url!,"_blank")} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white">Dosyayı Aç</button>}<button onClick={()=>setArsivSecili(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600">Kapat</button></div></div></div>}

    {excelOnizleme&&<div className="fixed inset-0 z-[96] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={()=>!excelIceAktariliyor&&setExcelOnizleme(null)}><div onMouseDown={e=>e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5"><div><div className="text-[10px] font-black uppercase text-cyan-600">📤 Excel İçe Aktarma • Önizleme</div><div className="mt-1 text-lg font-black text-slate-900">{excelOnizleme.dosyaAdi}</div><div className="mt-1 text-xs text-slate-500">{excelOnizleme.kayitlar.length} satır bulundu • {excelOnizleme.hatalar.length} uyarı</div></div><button disabled={excelIceAktariliyor} onClick={()=>setExcelOnizleme(null)} className="h-9 w-9 rounded-xl border border-slate-200">×</button></div><div className="overflow-auto p-5">{excelOnizleme.hatalar.length>0&&<div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3"><div className="text-xs font-black text-amber-800">Uyarılar</div>{excelOnizleme.hatalar.slice(0,8).map(x=><div key={x} className="mt-1 text-[10px] text-amber-700">• {x}</div>)}</div>}<div className="overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50"><tr>{["YIL","AY","İLÇE","MAHALLE","TRAFO ID","TARİH","NEDEN"].map(x=><th key={x} className="px-3 py-2">{x}</th>)}</tr></thead><tbody>{excelOnizleme.kayitlar.slice(0,20).map((r,i)=><tr key={i} className="border-t border-slate-100"><td className="px-3 py-2">{String(r.yil??"")}</td><td className="px-3 py-2">{String(r.ay??"")}</td><td className="px-3 py-2">{String(r.ilce??"")}</td><td className="px-3 py-2">{String(r.mahalle??"")}</td><td className="px-3 py-2">{String(r.trafo_id??"")}</td><td className="px-3 py-2">{String(r.tarih??"")}</td><td className="px-3 py-2">{String(r.degisim_nedeni??"")}</td></tr>)}</tbody></table></div>{excelOnizleme.kayitlar.length>20&&<div className="mt-2 text-[10px] text-slate-400">İlk 20 satır gösteriliyor.</div>}</div><div className="flex justify-end gap-2 border-t border-slate-200 p-4"><button disabled={excelIceAktariliyor} onClick={()=>setExcelOnizleme(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600">Vazgeç</button><button disabled={excelIceAktariliyor||excelOnizleme.hatalar.length>0} onClick={excelOnizlemeyiAktar} className="rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-black text-white disabled:opacity-40">{excelIceAktariliyor?"Aktarılıyor...":`${excelOnizleme.kayitlar.length} Kaydı Aktar`}</button></div></div></div>}

  </main>;
}

function Nav({sayfa,duzenlenenId,formTemizle,git,bolumeGit,aktifAnaliz,misafirModu,rol}:{sayfa:Sayfa;duzenlenenId:number|null;formTemizle:()=>void;git:(s:Sayfa)=>void;bolumeGit:(id:string)=>void;aktifAnaliz:string;misafirModu:boolean;rol:KullaniciRolu}){
  const duzenleyebilir=!misafirModu&&(rol==="admin"||rol==="editor");const admin=!misafirModu&&rol==="admin";
  return <nav className="flex-1 space-y-2 overflow-y-auto p-3"><MenuButonu aktif={sayfa==="dashboard"} onClick={()=>git("dashboard")}>📊 Kontrol Paneli</MenuButonu>
<div className="my-2 border-t border-slate-200 pt-2">
  <div className="mb-1 px-3 text-[9px] font-black uppercase tracking-[.18em] text-slate-600">ANALİZLER</div>
  <MenuAlt aktif={aktifAnaliz==="degisim-nedenleri"} onClick={()=>bolumeGit("degisim-nedenleri")}>◉ Değişim Nedenleri</MenuAlt>
  <MenuAlt aktif={aktifAnaliz==="zaman-analizi"} onClick={()=>bolumeGit("zaman-analizi")}>▥ Yıllık / Aylık Analiz</MenuAlt>
  <MenuAlt aktif={aktifAnaliz==="neden-guc-analizi"} onClick={()=>bolumeGit("neden-guc-analizi")}>⚡ Neden × Güç Analizi</MenuAlt>
  <MenuAlt aktif={aktifAnaliz==="ilce-analizi"} onClick={()=>bolumeGit("ilce-analizi")}>📍 İlçe Analizi</MenuAlt>
  <MenuAlt aktif={aktifAnaliz==="trafo-guc-analizi"} onClick={()=>bolumeGit("trafo-guc-analizi")}>↗ Trafo Güç Analizi</MenuAlt>
</div>
{duzenleyebilir&&<MenuButonu aktif={sayfa==="yeni"&&!duzenlenenId} onClick={()=>{formTemizle();git("yeni");}}>➕ Yeni Kayıt</MenuButonu>}
<MenuButonu aktif={sayfa==="kayitlar"} onClick={()=>git("kayitlar")}>📋 Trafo Kayıtları</MenuButonu>
<MenuButonu aktif={sayfa==="arsiv"} onClick={()=>git("arsiv")}>📁 Trafo Form Arşivi</MenuButonu>
{admin&&<div className="my-2 border-t border-slate-200 pt-2"><div className="mb-1 px-3 text-[9px] font-black uppercase tracking-[.18em] text-slate-600">YÖNETİM</div><MenuButonu aktif={sayfa==="loglar"} onClick={()=>git("loglar")}>🕘 Değişiklik Logları</MenuButonu><MenuButonu aktif={sayfa==="kullanicilar"} onClick={()=>git("kullanicilar")}>👥 Kullanıcı Yetkileri</MenuButonu></div>}</nav>;
}
function HizliFiltre({children,onClick,aktif}:{children:ReactNode;onClick:()=>void;aktif:boolean}){return <button type="button" onClick={onClick} className={`rounded-lg border px-3 py-2 text-[10px] font-black transition ${aktif?"border-orange-500 bg-orange-500/15 text-orange-300":"border-slate-300 text-slate-400 hover:bg-slate-200 hover:text-white"}`}>{children}</button>}
function MenuAlt({children,onClick,aktif=false}:{children:ReactNode;onClick:()=>void;aktif?:boolean}){return <button onClick={onClick} className={`mb-0.5 block w-full rounded-lg border px-3 py-2 text-left text-[11px] font-bold transition ${aktif?"border-orange-500/30 bg-orange-500/15 text-orange-300":"border-transparent text-slate-400 hover:bg-slate-200 hover:text-white"}`}>{children}</button>}
function Alan({baslik,children}:{baslik:string;children:ReactNode}){return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-600">{baslik}</span>{children}</label>}
function MetinAlani({baslik,deger,degistir}:{baslik:string;deger:string;degistir:(v:string)=>void}){return <Alan baslik={baslik}><input value={deger} onChange={e=>degistir(e.target.value)} className={inputSinif}/></Alan>}
function ComboAlani({baslik,deger,degistir,secenekler,listeId,gerekli=false}:{baslik:string;deger:string;degistir:(v:string)=>void;secenekler:string[];listeId:string;gerekli?:boolean}){
  const [acik,setAcik]=useState(false);
  const [arama,setArama]=useState("");
  const [aktifIndex,setAktifIndex]=useState(-1);
  const kutuRef=useRef<HTMLDivElement|null>(null);
  const anaInputRef=useRef<HTMLInputElement|null>(null);
  const secenekRefleri=useRef<(HTMLButtonElement|null)[]>([]);

  const q=arama.trim().toLocaleUpperCase("tr-TR");
  const filtreli=q?secenekler.filter(x=>x.toLocaleUpperCase("tr-TR").includes(q)):secenekler;
  const tur=listeId.includes("guc")?"guc":listeId.includes("ger")?"gerilim":listeId.includes("marka")?"marka":listeId.includes("tip")?"tip":"genel";
  const ikon=tur==="guc"?"⚡":tur==="gerilim"?"🔌":tur==="marka"?"🏷️":tur==="tip"?"◈":"•";
  const ek=tur==="guc"?" kVA":"";

  useEffect(()=>{
    if(!acik)return;
    const kapat=(e:MouseEvent|TouchEvent)=>{
      if(kutuRef.current&&!kutuRef.current.contains(e.target as Node)){
        if(arama.trim()){
          const tam=secenekler.find(x=>x.toLocaleUpperCase("tr-TR")===arama.trim().toLocaleUpperCase("tr-TR"));
          if(tam)degistir(tam);
        }
        setAcik(false);
        setArama("");
      }
    };
    document.addEventListener("mousedown",kapat);
    document.addEventListener("touchstart",kapat);
    return ()=>{
      document.removeEventListener("mousedown",kapat);
      document.removeEventListener("touchstart",kapat);
    };
  },[acik,arama,secenekler,degistir]);

  useEffect(()=>{
    if(!acik)return;
    setAktifIndex(filtreli.length?0:-1);
  },[arama,acik]);

  useEffect(()=>{
    if(aktifIndex<0)return;
    secenekRefleri.current[aktifIndex]?.scrollIntoView({block:"nearest"});
  },[aktifIndex]);

  function sec(x:string){
    degistir(x);
    setArama("");
    setAcik(false);
    setTimeout(()=>anaInputRef.current?.focus(),0);
  }

  function commitEt(){
    if(aktifIndex>=0&&filtreli[aktifIndex]){
      degistir(filtreli[aktifIndex]);
    }else if(arama.trim()){
      degistir(arama.trim());
    }
  }

  return <div className="block">
    <span className="mb-2 block text-sm font-semibold text-slate-600">{baslik}</span>
    <div ref={kutuRef} className="relative">
      <div className="relative">
        <input
          ref={anaInputRef}
          required={gerekli}
          autoComplete="off"
          value={acik?arama:deger}
          onFocus={e=>{
            setAcik(true);
            setArama("");
            setAktifIndex(0);
          }}
          onChange={e=>{
            setArama(e.target.value);
            setAcik(true);
            setAktifIndex(0);
          }}
          onKeyDown={e=>{
            if(e.key==="ArrowDown"){
              e.preventDefault();
              setAcik(true);
              setAktifIndex(i=>filtreli.length?Math.min(i+1,filtreli.length-1):-1);
              return;
            }
            if(e.key==="ArrowUp"){
              e.preventDefault();
              setAktifIndex(i=>filtreli.length?Math.max(i-1,0):-1);
              return;
            }
            if(e.key==="Enter"){
              e.preventDefault();
              commitEt();
              setArama("");
              setAcik(false);
              return;
            }
            if(e.key==="Escape"){
              e.preventDefault();
              setArama("");
              setAcik(false);
              return;
            }
            if(e.key==="Tab"){
              commitEt();
              setArama("");
              setAcik(false);
              return;
            }
          }}
          placeholder="Seçiniz veya yazınız"
          className={`w-full rounded-xl border bg-white px-3.5 py-2.5 pr-10 text-sm font-bold text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 ${acik?"border-blue-400 ring-2 ring-blue-500/10":"border-slate-300 hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"}`}
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={e=>e.preventDefault()}
          onClick={()=>{
            if(acik){
              setAcik(false);
              setArama("");
            }else{
              setAcik(true);
              setArama("");
              setTimeout(()=>anaInputRef.current?.focus(),0);
            }
          }}
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[10px] text-slate-400 hover:bg-slate-100"
        >▼</button>
      </div>

      {acik&&<div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[80] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,.16)]">
        <div className="max-h-56 overflow-y-auto p-1.5">
          {filtreli.length?filtreli.map((x,i)=>{
            const secili=x===deger;
            const aktif=i===aktifIndex;
            return <button
              ref={el=>{secenekRefleri.current[i]=el;}}
              key={x}
              type="button"
              tabIndex={-1}
              onMouseEnter={()=>setAktifIndex(i)}
              onMouseDown={e=>e.preventDefault()}
              onClick={()=>sec(x)}
              className={`mb-0.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition ${
                secili?"bg-blue-600 text-white":
                aktif?"bg-blue-100 text-blue-800 ring-1 ring-blue-200":
                "text-slate-700 hover:bg-blue-50"
              }`}
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[12px] ${secili?"bg-white/15":aktif?"bg-white":"bg-slate-100"}`}>{ikon}</span>
              <span className="text-xs font-bold">{x}{ek}</span>
              {secili&&<span className="ml-auto text-xs">✓</span>}
            </button>
          }):<div className="p-3 text-center text-xs text-slate-400">Eşleşen seçenek yok.</div>}

          {arama.trim()&&!secenekler.some(x=>x.toLocaleUpperCase("tr-TR")===arama.trim().toLocaleUpperCase("tr-TR"))&&
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={e=>e.preventDefault()}
              onClick={()=>sec(arama.trim())}
              className="mt-1 flex w-full items-center gap-2 rounded-lg border border-dashed border-blue-200 bg-blue-50/70 px-2.5 py-2 text-left text-blue-700"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-xs">＋</span>
              <span className="text-xs font-bold">“{arama.trim()}” değerini kullan</span>
            </button>}
        </div>
      </div>}
    </div>
  </div>
}
function SelectAlan({baslik,deger,degistir,secenekler,gerekli=false}:{baslik:string;deger:string;degistir:(v:string)=>void;secenekler:string[];gerekli?:boolean}){return <Alan baslik={baslik}><select required={gerekli} value={deger} onChange={e=>degistir(e.target.value)} className={inputSinif}><option value="">Seçiniz</option>{secenekler.map(s=><option key={s} value={s}>{s}</option>)}</select></Alan>}
function FormGrid({children}:{children:ReactNode}){return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>}
function FormBolumu({baslik,children}:{baslik:string;children:ReactNode}){return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,.07)] ring-1 ring-slate-100"><div className="border-b border-blue-100 bg-[linear-gradient(90deg,#eff6ff,#ffffff)] px-4 py-4 font-black text-[#16345e] sm:px-5">{baslik}</div><div className="p-4 sm:p-5 lg:p-6">{children}</div></section>}
function MenuButonu({aktif,onClick,children}:{aktif:boolean;onClick:()=>void;children:ReactNode}){return <button onClick={onClick} className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${aktif?"bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-200/60":"text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`}>{children}</button>}
function Etiket({children}:{children:ReactNode}){return <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-600 shadow-sm">{children}</span>}
function KpiKart({baslik,sayi,renk,onClick}:{baslik:string;sayi:number;renk:string;onClick?:()=>void}){const icerik=<><div className="h-1.5" style={{backgroundColor:renk}}/><div className="p-4"><div className="min-h-7 text-[10px] font-black uppercase tracking-wider text-slate-500">{baslik}</div><div className="mt-1 flex items-end justify-between"><div className="text-2xl font-black text-slate-900 sm:text-3xl">{sayi}</div><span className="mb-1 h-3 w-3 rounded-full shadow-sm" style={{backgroundColor:renk}}/></div></div></>;const cls="group w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-[0_10px_30px_rgba(15,23,42,.08)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_16px_40px_rgba(15,23,42,.12)]";return onClick?<button type="button" onClick={onClick} className={cls}>{icerik}</button>:<div className={cls}>{icerik}</div>}
function OzetKart({ikon,baslik,deger,alt,onClick}:{ikon:string;baslik:string;deger:string;alt:string;onClick?:()=>void}){const icerik=<div className="flex items-center gap-3"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 text-2xl shadow-inner">{ikon}</div><div className="min-w-0"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{baslik}</div><div className="mt-1 truncate text-2xl font-black tracking-tight text-slate-900">{deger}</div><div className="mt-0.5 text-[11px] font-medium text-slate-400">{alt}</div></div></div>;const cls="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-[0_10px_30px_rgba(15,23,42,.08)] ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_16px_40px_rgba(15,23,42,.12)]";return onClick?<button type="button" onClick={onClick} className={cls}>{icerik}</button>:<div className={cls}>{icerik}</div>}
function Panel({baslik,altBaslik,children,className="",sagIcerik,daraltilabilir=false,acik=true,onToggle}:{baslik:string;altBaslik?:string;children:ReactNode;className?:string;sagIcerik?:ReactNode;daraltilabilir?:boolean;acik?:boolean;onToggle?:()=>void}){return <section className={`w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,.07)] ring-1 ring-slate-100 sm:p-5 lg:p-6 ${className}`}><div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-black tracking-tight text-slate-900 sm:text-lg">{baslik}</h2>{altBaslik&&<p className="mt-1 text-xs font-medium text-slate-400 sm:text-sm">{altBaslik}</p>}</div><div className="flex items-center gap-2">{sagIcerik}{daraltilabilir&&<button type="button" onClick={onToggle} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-lg font-black text-slate-500 shadow-sm hover:border-blue-200 hover:text-blue-600" title={acik?"Bölümü daralt":"Bölümü aç"}>{acik?"−":"+"}</button>}</div></div>{(!daraltilabilir||acik)&&children}</section>}
function GrafikLegend(){return <div className="mt-4 flex flex-wrap gap-2">{NEDENLER.map(n=><div key={n.ad} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm"><span className="h-2.5 w-2.5 rounded-full" style={{backgroundColor:n.renk}}/><span className="text-[9px] font-black uppercase text-slate-400">{n.ad}</span></div>)}</div>}
function BarChart({items,max,aylik=false,onBarClick}:{items:{label:string;total:number;values:Record<string,number>}[];max:number;aylik?:boolean;onBarClick?:(label:string,neden:string)=>void}){return <div className="mt-5 w-full min-w-0 max-w-full overflow-x-auto"><div className={aylik?"min-w-[620px] sm:min-w-[900px]":"w-full min-w-0 sm:min-w-[760px]"}><div className={aylik?"relative h-[270px]":"relative h-[320px] sm:h-[350px]"}><div className="pointer-events-none absolute inset-x-0 bottom-10 top-5 flex flex-col justify-between">{[1,2,3,4,5].map(i=><div key={i} className="border-t border-dashed border-slate-200"/>)}</div><div className="absolute inset-0 flex items-end gap-1 px-1 sm:gap-3 sm:px-2">{items.map(it=><div key={it.label} className="flex min-w-[34px] flex-1 flex-col items-center justify-end sm:min-w-[62px]"><div className="mb-2 rounded-full bg-slate-100 px-1.5 py-1 text-slate-700 text-[8px] font-black sm:px-2 sm:text-[9px]">{it.total}</div><div className={`flex items-end gap-px sm:gap-[2px] ${aylik?"h-[180px]":"h-[225px] sm:h-[255px]"}`}>{NEDENLER.map(n=>{const v=it.values[n.ad]||0,h=v?Math.max(5,(v/max)*(aylik?160:225)):0;return <button type="button" onClick={()=>v&&onBarClick?.(it.label,n.ad)} key={n.ad} title={`${it.label} - ${n.ad}: ${v}${v?" • Kayıtlara git":""}`} className={`${aylik?"w-[4px] rounded-t sm:w-[5px]":"w-[3px] rounded-t sm:w-[7px] sm:rounded-t-md"} ${v&&onBarClick?"cursor-pointer hover:brightness-125":"cursor-default"}`} style={{height:`${h}px`,backgroundColor:n.renk}}/>})}</div><div className="mt-3 w-full border-t border-slate-200 pt-2 text-center text-[9px] font-black text-slate-500 sm:text-[10px]">{it.label}</div></div>)}</div></div></div></div>}
function NedenGucHucre({sayi,oran,ton}:{sayi:number;oran:number;ton:"emerald"|"blue"|"red"}){
  const bar={
    emerald:"bg-emerald-500",
    blue:"bg-blue-500",
    red:"bg-red-500",
  }[ton];

  const text={
    emerald:"text-emerald-400",
    blue:"text-blue-400",
    red:"text-red-400",
  }[ton];

  return <div>
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-black">{sayi}</span>
      <span className={`text-[10px] font-bold ${text}`}>%{oran.toFixed(1)}</span>
    </div>
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full rounded-full ${bar}`} style={{width:`${Math.max(oran>0?3:0,oran)}%`}}/>
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
        <div className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">{sayi}</div>
        <div className="mt-1 text-[10px] font-bold">{alt}</div>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-current/15 bg-white text-xl font-black shadow-sm">{ikon}</div>
    </div>
  </div>
}
function HataKutusu({children}:{children:ReactNode}){return <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{children}</div>}
function BosAlan({children}:{children:ReactNode}){return <div className="my-6 w-full rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-7 text-center text-sm text-slate-500 sm:p-10">{children}</div>}
function NedenEtiketi({neden}:{neden:string|null}){const n=NEDENLER.find(x=>x.ad===neden);return neden?<span className="inline-flex whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-black text-white" style={{backgroundColor:n?.renk||"#475569"}}>{neden}</span>:<span className="text-slate-600">-</span>}

function KayitTablosu({kayitlar,detay,duzenle,sil,gecmis,kopyala,secili=[],secimDegistir,duzenleyebilir=false,silebilir=false}:{kayitlar:TrafoKaydi[];detay:(k:TrafoKaydi)=>void;duzenle:(k:TrafoKaydi)=>void;sil:(k:TrafoKaydi)=>void;gecmis:(k:TrafoKaydi)=>void;kopyala?:(k:TrafoKaydi)=>void;secili?:number[];secimDegistir?:(id:number)=>void;duzenleyebilir?:boolean;silebilir?:boolean}){
  if(!kayitlar.length)return <BosAlan>Bu filtrelerde kayıt bulunamadı.</BosAlan>;
  return <>
    <div className="mt-5 space-y-3 md:hidden">{kayitlar.map(k=><div key={k.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${secili.includes(k.id)?"border-blue-300 ring-2 ring-blue-100":"border-slate-200"}`}><div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4"><div className="flex min-w-0 items-start gap-3">{secimDegistir&&<input type="checkbox" checked={secili.includes(k.id)} onChange={()=>secimDegistir(k.id)} className="mt-1 h-4 w-4"/>}<div><div className="text-xs font-bold text-orange-500">{tarihGoster(k.tarih)}</div><div className="mt-1 text-base font-black text-slate-900">{k.ilce||"İlçe belirtilmemiş"}{k.mahalle?` / ${k.mahalle}`:""}</div></div></div><NedenEtiketi neden={k.degisim_nedeni}/></div><div className="grid grid-cols-2 gap-px bg-slate-100"><MobilBilgi baslik="Yıl / Ay" deger={`${k.yil||"-"} / ${k.ay||"-"}`}/><MobilBilgi baslik="Trafo ID" deger={k.trafo_id}/><MobilBilgi baslik="Lokasyon ID" deger={k.lokasyon_id}/><MobilBilgi baslik="TR" deger={k.tr}/></div><div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-5"><IslemButon onClick={()=>detay(k)} cls="border-orange-300 text-orange-600">Detay</IslemButon><IslemButon onClick={()=>gecmis(k)} cls="border-violet-300 text-violet-600">Geçmiş</IslemButon>{duzenleyebilir&&kopyala&&<IslemButon onClick={()=>kopyala(k)} cls="border-cyan-300 text-cyan-700">Kopyala</IslemButon>}{duzenleyebilir&&<IslemButon onClick={()=>duzenle(k)} cls="border-blue-300 text-blue-600">Düzenle</IslemButon>}{silebilir&&<IslemButon onClick={()=>sil(k)} cls="border-red-300 text-red-600">Sil</IslemButon>}</div></div>)}</div>

    <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50"><tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">{secimDegistir&&<th className="px-3 py-3">Seç</th>}{["Tarih","Yıl","Ay","İlçe","Mahalle","Konum","Trafo ID","Değişim Nedeni","İşlem"].map(h=><th key={h} className="px-3 py-3">{h}</th>)}</tr></thead><tbody>{kayitlar.map(k=><tr key={k.id} className={`border-b border-slate-100 transition hover:bg-blue-50/60 ${secili.includes(k.id)?"bg-blue-50/60":""}`}>{secimDegistir&&<td className="px-3 py-3.5"><input type="checkbox" checked={secili.includes(k.id)} onChange={()=>secimDegistir(k.id)} className="h-4 w-4"/></td>}<td className="px-3 py-3.5 font-semibold">{tarihGoster(k.tarih)}</td><td className="px-3 py-3.5">{k.yil||"-"}</td><td className="px-3 py-3.5">{k.ay||"-"}</td><td className="px-3 py-3.5">{k.ilce||"-"}</td><td className="px-3 py-3.5">{k.mahalle||"-"}</td><td className="px-3 py-3.5">{k.lokasyon_id||"-"}</td><td className="px-3 py-3.5">{k.trafo_id||"-"}</td><td className="px-3 py-3.5"><NedenEtiketi neden={k.degisim_nedeni}/></td><td className="whitespace-nowrap px-3 py-3.5 text-right"><button onClick={()=>detay(k)} className="mr-1 rounded-lg border border-orange-300 px-2.5 py-2 text-xs font-bold text-orange-600">Detay</button><button onClick={()=>gecmis(k)} className="mr-1 rounded-lg border border-violet-300 px-2.5 py-2 text-xs font-bold text-violet-600">Geçmiş</button>{duzenleyebilir&&kopyala&&<button onClick={()=>kopyala(k)} className="mr-1 rounded-lg border border-cyan-300 px-2.5 py-2 text-xs font-bold text-cyan-700">Kopyala</button>}{duzenleyebilir&&<button onClick={()=>duzenle(k)} className="mr-1 rounded-lg border border-blue-300 px-2.5 py-2 text-xs font-bold text-blue-600">Düzenle</button>}{silebilir&&<button onClick={()=>sil(k)} className="rounded-lg border border-red-300 px-2.5 py-2 text-xs font-bold text-red-600">Sil</button>}</td></tr>)}</tbody></table></div>
  </>;
}
function LogKart({log}:{log:AuditLog}){const etiket=log.action==="INSERT"?"EKLENDİ":log.action==="UPDATE"?"DÜZENLENDİ":"SİLİNDİ";const fark=farkAlanlari(log.old_data,log.new_data).slice(0,5);return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${log.action==="INSERT"?"bg-emerald-100 text-emerald-700":log.action==="UPDATE"?"bg-blue-100 text-blue-700":"bg-red-100 text-red-700"}`}>{etiket}</span><span className="text-[10px] text-slate-500">#{log.record_id||"-"}</span></div><div className="mt-3 truncate text-xs font-black text-slate-800">{log.user_email||"Sistem"}</div><div className="mt-1 text-[10px] text-slate-500">{tarihSaatGoster(log.created_at)}</div>{fark.length>0&&<div className="mt-3 space-y-2">{fark.map(k=><div key={k} className="rounded-xl border border-slate-200 bg-slate-50 p-2"><div className="text-[9px] font-black uppercase text-slate-400">{k}</div><div className="mt-1 grid grid-cols-2 gap-2 text-[10px]"><div className="rounded-lg bg-red-50 px-2 py-1.5 text-red-700"><span className="block text-[8px] font-black">ESKİ</span>{String(log.old_data?.[k]??"—")}</div><div className="rounded-lg bg-emerald-50 px-2 py-1.5 text-emerald-700"><span className="block text-[8px] font-black">YENİ</span>{String(log.new_data?.[k]??"—")}</div></div></div>)}</div>}</div>}
function farkAlanlari(oldData:Record<string,unknown>|null,newData:Record<string,unknown>|null){const a=oldData||{},b=newData||{};return Array.from(new Set([...Object.keys(a),...Object.keys(b)])).filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k]));}
function LogSatiri({log,kayitAc}:{log:AuditLog;kayitAc:(id:number)=>void}){const fark=farkAlanlari(log.old_data,log.new_data);return <div className="rounded-2xl border border-slate-200 bg-slate-50 shadow-sm p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${log.action==="INSERT"?"bg-emerald-500/15 text-emerald-300":log.action==="UPDATE"?"bg-blue-500/15 text-blue-300":"bg-red-500/15 text-red-300"}`}>{log.action}</span><span className="text-sm font-black">Kayıt #{log.record_id||"-"}</span></div><div className="mt-2 text-xs text-slate-400">{log.user_email||"Sistem"} • {tarihSaatGoster(log.created_at)}</div></div>{log.record_id&&log.action!=="DELETE"&&<button onClick={()=>kayitAc(log.record_id!)} className="rounded-xl border border-orange-700 px-3 py-2 text-xs font-black text-orange-300">Kaydı Aç</button>}</div>{fark.length>0&&<div className="mt-4 flex flex-wrap gap-2">{fark.slice(0,12).map(k=><span key={k} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] text-slate-600">{k}: <b>{String(log.old_data?.[k]??"-")}</b> → <b className="text-orange-300">{String(log.new_data?.[k]??"-")}</b></span>)}</div>}</div>}
function TrafoGecmisModal({anaKayit,kayitlar,kapat,detay}:{anaKayit:TrafoKaydi;kayitlar:TrafoKaydi[];kapat:()=>void;detay:(k:TrafoKaydi)=>void}){return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-5"><div className="flex h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-slate-300 bg-blue-50 shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-3xl"><div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5"><div><div className="text-xs font-black uppercase tracking-wider text-violet-300">🕘 Trafo Geçmişi</div><h2 className="mt-2 text-xl font-black">{anaKayit.trafo_id?`Trafo ID: ${anaKayit.trafo_id}`:anaKayit.lokasyon_id?`Lokasyon ID: ${anaKayit.lokasyon_id}`:`TR: ${anaKayit.tr||"-"}`}</h2><div className="mt-1 text-xs text-slate-500">{kayitlar.length} geçmiş kayıt bulundu</div></div><button onClick={kapat} className="h-10 w-10 rounded-xl border border-slate-300 text-xl">×</button></div><div className="overflow-y-auto p-4 sm:p-5"><div className="relative ml-3 border-l border-slate-300 pl-6">{kayitlar.map((k,i)=><button type="button" onClick={()=>detay(k)} key={k.id} className="relative mb-4 block w-full rounded-2xl border border-slate-200 bg-slate-50 shadow-sm p-4 text-left transition hover:border-violet-500/50"><span className="absolute -left-[31px] top-5 h-3 w-3 rounded-full bg-violet-500 ring-4 ring-white"/><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-black">{tarihGoster(k.tarih)} • {k.ilce||"-"} / {k.mahalle||"-"}</div><NedenEtiketi neden={k.degisim_nedeni}/></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><div><span className="text-slate-500">Sökülen</span><div className="font-black">{k.sokulen_gucu||"-"} kVA</div></div><div><span className="text-slate-500">Takılan</span><div className="font-black">{k.takilan_gucu||"-"} kVA</div></div><div><span className="text-slate-500">Lokasyon</span><div className="font-black">{k.lokasyon_id||"-"}</div></div><div><span className="text-slate-500">Sıra</span><div className="font-black">#{k.sira_no||k.id}</div></div></div>{i===0&&<div className="mt-3 text-[10px] font-black uppercase text-violet-300">En güncel kayıt</div>}</button>)}</div></div></div></div>}
function IslemButon({onClick,cls,children}:{onClick:()=>void;cls:string;children:ReactNode}){return <button onClick={onClick} className={`rounded-xl border px-2 py-2.5 text-xs font-bold ${cls}`}>{children}</button>}
function MobilBilgi({baslik,deger}:{baslik:string;deger:string|number|null|undefined}){return <div className="bg-white p-3"><div className="text-[9px] font-black uppercase tracking-wider text-slate-500">{baslik}</div><div className="mt-1 break-words text-xs font-bold text-slate-700">{deger===null||deger===undefined||String(deger).trim()===""?"-":String(deger)}</div></div>}

function DetayModal({kayit,kapat,duzenle,yazdir,gecmis,duzenleyebilir=false,onceki,sonraki}:{kayit:TrafoKaydi;kapat:()=>void;duzenle:(k:TrafoKaydi)=>void;yazdir:(k:TrafoKaydi)=>void;gecmis:()=>void;duzenleyebilir?:boolean;onceki?:()=>void;sonraki?:()=>void}){
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-0 backdrop-blur-sm sm:p-4" onMouseDown={kapat}><div onMouseDown={e=>e.stopPropagation()} className="flex h-[100dvh] w-full flex-col overflow-hidden bg-blue-50 shadow-2xl sm:h-[92vh] sm:max-w-6xl sm:rounded-3xl sm:border sm:border-slate-300"><div className="flex shrink-0 items-start justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-7 sm:py-5"><div><div className="text-[10px] font-black tracking-[.18em] text-orange-400">TRAFO DEĞİŞİM KAYDI</div><h2 className="mt-1 text-lg font-black sm:text-2xl">{kayit.ilce||"İlçe Belirtilmemiş"}{kayit.mahalle&&<span className="text-slate-400"> / {kayit.mahalle}</span>}</h2><div className="mt-3 flex flex-wrap gap-2"><Etiket>📅 {tarihGoster(kayit.tarih)}</Etiket><NedenEtiketi neden={kayit.degisim_nedeni}/></div></div><button onClick={kapat} className="h-10 w-10 rounded-xl border border-slate-300 text-xl">×</button></div>
    <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-7"><DetayBolumu baslik="📍 KONUM BİLGİLERİ"><DetayGrid><D b="Yıl" v={kayit.yil}/><D b="Ay" v={kayit.ay}/><D b="İlçe" v={kayit.ilce}/><D b="Mahalle" v={kayit.mahalle}/><D b="TR" v={kayit.tr}/><D b="Lokasyon ID" v={kayit.lokasyon_id}/><D b="Trafo ID" v={kayit.trafo_id}/><D b="Trafo Tipi" v={kayit.trafo_tipi}/></DetayGrid></DetayBolumu>
    <div className="mt-4 grid gap-4 xl:grid-cols-2"><DetayBolumu baslik="🔴 SÖKÜLEN TRAFO"><DetayGrid iki><D b="Gücü" v={kayit.sokulen_gucu}/><D b="Gerilim" v={kayit.sokulen_gerilim}/><D b="Markası" v={kayit.sokulen_markasi}/><D b="Seri No" v={kayit.sokulen_seri_no}/><D b="İmal Yılı" v={kayit.sokulen_imal_yili}/><D b="Trafo Tipi" v={kayit.sokulen_trafo_tipi}/><D b="Tamir Yılı" v={kayit.sokulen_tamir_yili}/><D b="Tamir Firması" v={kayit.sokulen_tamir_firmasi}/><D b="Yüklenici" v={kayit.sokulen_yuklenici}/></DetayGrid></DetayBolumu><DetayBolumu baslik="🟢 TAKILAN TRAFO"><DetayGrid iki><D b="Gücü" v={kayit.takilan_gucu}/><D b="Gerilim" v={kayit.takilan_gerilim}/><D b="Markası" v={kayit.takilan_markasi}/><D b="Seri No" v={kayit.takilan_seri_no}/><D b="İmal Yılı" v={kayit.takilan_imal_yili}/><D b="Trafo Tipi" v={kayit.takilan_trafo_tipi}/><D b="Tamir Yılı" v={kayit.takilan_tamir_yili}/><D b="Tamir Firması" v={kayit.takilan_tamir_firmasi}/></DetayGrid></DetayBolumu></div>
    <div className="mt-4"><DetayBolumu baslik="📅 İŞLEM BİLGİLERİ"><DetayGrid><D b="Tarih" v={tarihGoster(kayit.tarih)}/><D b="Değişim Nedeni" v={kayit.degisim_nedeni}/><D b="Kayıt No" v={kayit.sira_no||kayit.id}/></DetayGrid><div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 shadow-sm p-4"><div className="mb-2 text-[10px] font-black text-slate-500">AÇIKLAMA</div><div className="whitespace-pre-wrap text-sm">{kayit.aciklama||"Açıklama girilmemiş."}</div></div></DetayBolumu></div></div>
    <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 sm:px-7"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="grid grid-cols-2 gap-2"><button disabled={!onceki} onClick={onceki} className="rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-30">← Önceki</button><button disabled={!sonraki} onClick={sonraki} className="rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-30">Sonraki →</button></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-5"><button onClick={()=>yazdir(kayit)} className="rounded-xl bg-slate-700 px-3 py-2.5 text-xs font-black">🖨️ PDF</button><button onClick={gecmis} className="rounded-xl bg-violet-700 px-3 py-2.5 text-xs font-black">🕘 Geçmiş</button><button onClick={kapat} className="rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-bold">Kapat</button>{duzenleyebilir&&<button onClick={()=>duzenle(kayit)} className="rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-black">✏️ Düzenle</button>}</div></div></div></div></div>;
}
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
function tarihSaatGoster(v:string|undefined|null){if(!v)return "-";const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleString("tr-TR");}
function tarihGoster(t:string|null){if(!t)return"-";const p=t.split("-");return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:t}
function esc(v:unknown){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
