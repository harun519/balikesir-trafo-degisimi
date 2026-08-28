"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
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

type Sayfa = "dashboard" | "yeni" | "kayitlar";
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

const inputSinif = "w-full rounded-xl border border-slate-700 bg-[#07111f] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-500";

export default function Home() {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url && key ? createClient(url, key) : null;
  }, []);

  const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [session,setSession]=useState<Session|null>(null); const [authKontrol,setAuthKontrol]=useState(true);
  const [girisYukleniyor,setGirisYukleniyor]=useState(false); const [authHata,setAuthHata]=useState("");
  const [sayfa,setSayfa]=useState<Sayfa>("dashboard"); const [kayitlar,setKayitlar]=useState<TrafoKaydi[]>([]);
  const [veriYukleniyor,setVeriYukleniyor]=useState(false); const [genelHata,setGenelHata]=useState(""); const [basariMesaji,setBasariMesaji]=useState("");
  const [mobilMenuAcik,setMobilMenuAcik]=useState(false); const [detayKayit,setDetayKayit]=useState<TrafoKaydi|null>(null);
  const [form,setForm]=useState<FormData>(BOS_FORM); const [duzenlenenId,setDuzenlenenId]=useState<number|null>(null); const [kaydediliyor,setKaydediliyor]=useState(false);
  const [arama,setArama]=useState(""); const [filtreYil,setFiltreYil]=useState(""); const [filtreAy,setFiltreAy]=useState(""); const [filtreNeden,setFiltreNeden]=useState("");
  const [dashboardYil,setDashboardYil]=useState(""); const [dashboardIlce,setDashboardIlce]=useState("");

  useEffect(() => {
    const fn=(e:KeyboardEvent)=>{ if(e.key==="Escape"){ if(detayKayit) setDetayKayit(null); else setMobilMenuAcik(false); } };
    window.addEventListener("keydown",fn); return()=>window.removeEventListener("keydown",fn);
  },[detayKayit]);

  useEffect(() => {
    if(!supabase){setAuthHata("Supabase bağlantısı kurulamadı.");setAuthKontrol(false);return;}
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthKontrol(false);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);setAuthKontrol(false);});
    return()=>subscription.unsubscribe();
  },[supabase]);

  useEffect(()=>{ if(session) kayitlariGetir(); else setKayitlar([]); },[session]);

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
  async function cikisYap(){ if(!supabase)return; await supabase.auth.signOut(); setSession(null);setSayfa("dashboard");setEmail("");setPassword("");setMobilMenuAcik(false); }
  function sayfayaGit(s:Sayfa){setSayfa(s);setMobilMenuAcik(false);window.scrollTo({top:0,behavior:"smooth"});}
  function bolumeGit(id:string){
    setSayfa("dashboard");
    setMobilMenuAcik(false);
    setTimeout(()=>document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"}),80);
  }
  function formDegistir(a:keyof FormData,v:string){setForm(x=>({...x,[a]:v}));}
  function formTemizle(){setForm(BOS_FORM);setDuzenlenenId(null);}

  async function kaydet(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); if(!supabase)return;
    if(!form.yil||!form.ay||!form.tarih||!form.degisim_nedeni){setGenelHata("Yıl, Ay, Tarih ve Değişim Nedeni zorunludur.");return;}
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
    formTemizle();await kayitlariGetir();setKaydediliyor(false);setSayfa("kayitlar");window.scrollTo({top:0,behavior:"smooth"});
    setTimeout(()=>setBasariMesaji(""),3000);
  }

  function kaydiDuzenle(k:TrafoKaydi){
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
    setDuzenlenenId(k.id);sayfayaGit("yeni");
  }

  async function kaydiSil(k:TrafoKaydi){
    if(!supabase||!window.confirm(`${tarihGoster(k.tarih)} tarihli kaydı silmek istediğinize emin misiniz?`))return;
    const {error}=await supabase.from("trafo_degisim").delete().eq("id",k.id);
    if(error){setGenelHata(error.message);return;} setDetayKayit(null);await kayitlariGetir();
  }

  const yillar=useMemo(()=>Array.from(new Set(kayitlar.map(k=>k.yil).filter(Boolean) as number[])).sort((a,b)=>b-a),[kayitlar]);
  const ilceler=useMemo(()=>Array.from(new Set([...ILCE_SECENEKLERI,...kayitlar.map(x=>x.ilce?.trim()).filter(Boolean) as string[]])).sort((a,b)=>a.localeCompare(b,"tr")),[kayitlar]);
  const dashboardKayitlari=useMemo(()=>kayitlar.filter(k=>(!dashboardYil||String(k.yil||"")===dashboardYil)&&(!dashboardIlce||k.ilce===dashboardIlce)),[kayitlar,dashboardYil,dashboardIlce]);

  const son30Gun=useMemo(()=>{
    const b=new Date(),bu=Date.UTC(b.getFullYear(),b.getMonth(),b.getDate()),once=bu-29*86400000;
    return dashboardKayitlari.filter(k=>{if(!k.tarih)return false;const p=k.tarih.split("-");if(p.length!==3)return false;const d=Date.UTC(+p[0],+p[1]-1,+p[2]);return d>=once&&d<=bu;}).length;
  },[dashboardKayitlari]);

  const nedenSayilari=useMemo(()=>{
    const r:Record<string,number>={};NEDENLER.forEach(n=>r[n.ad]=0);
    dashboardKayitlari.forEach(k=>{if(k.degisim_nedeni&&r[k.degisim_nedeni]!==undefined)r[k.degisim_nedeni]++;});return r;
  },[dashboardKayitlari]);

  const yillikNedenler=useMemo(()=>{
    const base=dashboardIlce?kayitlar.filter(x=>x.ilce===dashboardIlce):kayitlar;
    return [...yillar].reverse().map(yil=>{const s=base.filter(x=>x.yil===yil),nedenler:Record<string,number>={};NEDENLER.forEach(n=>nedenler[n.ad]=s.filter(x=>x.degisim_nedeni===n.ad).length);return{yil,nedenler,toplam:s.length};});
  },[kayitlar,yillar,dashboardIlce]);

  const aylikNedenler=useMemo(()=>AYLAR.map(ay=>{
    const s=kayitlar.filter(x=>String(x.yil||"")===dashboardYil&&x.ay===ay&&(!dashboardIlce||x.ilce===dashboardIlce));
    const nedenler:Record<string,number>={};NEDENLER.forEach(n=>nedenler[n.ad]=s.filter(x=>x.degisim_nedeni===n.ad).length);return{ay,toplam:s.length,nedenler};
  }),[kayitlar,dashboardYil,dashboardIlce]);

  const enCokIlce=useMemo(()=>{const s:Record<string,number>={};dashboardKayitlari.forEach(x=>{if(x.ilce)s[x.ilce]=(s[x.ilce]||0)+1;});return Object.entries(s).sort((a,b)=>b[1]-a[1])[0]||["-",0];},[dashboardKayitlari]);
  const enCokNeden=useMemo(()=>Object.entries(nedenSayilari).sort((a,b)=>b[1]-a[1])[0]||["-",0],[nedenSayilari]);
  const donutGradient=useMemo(()=>{
    const t=dashboardKayitlari.length;if(!t)return"#1e293b 0% 100%";let b=0;const p:string[]=[];
    NEDENLER.forEach(n=>{const o=(nedenSayilari[n.ad]||0)/t*100;if(o>0){p.push(`${n.renk} ${b}% ${b+o}%`);b+=o;}});return p.join(", ");
  },[dashboardKayitlari,nedenSayilari]);
  const maxYillik=Math.max(1,...yillikNedenler.map(x=>Math.max(...NEDENLER.map(n=>x.nedenler[n.ad]||0))));
  const maxAylik=Math.max(1,...aylikNedenler.map(x=>Math.max(...NEDENLER.map(n=>x.nedenler[n.ad]||0))));

  const ilceAnalizi=useMemo(()=>{
    const kaynak=dashboardYil
      ? kayitlar.filter(x=>String(x.yil||"")===dashboardYil)
      : kayitlar;

    const sayilar:Record<string,number>={};

    kaynak.forEach(x=>{
      const ilce=(x.ilce||"BELİRTİLMEMİŞ").trim()||"BELİRTİLMEMİŞ";
      sayilar[ilce]=(sayilar[ilce]||0)+1;
    });

    return Object.entries(sayilar)
      .map(([ilce,sayi])=>({
        ilce,
        sayi,
        oran:kaynak.length ? (sayi/kaynak.length)*100 : 0,
      }))
      .sort((a,b)=>b.sayi-a.sayi);
  },[kayitlar,dashboardYil]);

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

  const filtrelenmisKayitlar=useMemo(()=>{
    const q=arama.trim().toLocaleUpperCase("tr-TR");
    return kayitlar.filter(k=>{
      if(filtreYil&&String(k.yil||"")!==filtreYil)return false;if(filtreAy&&k.ay!==filtreAy)return false;if(filtreNeden&&k.degisim_nedeni!==filtreNeden)return false;if(!q)return true;
      return [k.ilce,k.mahalle,k.tr,k.lokasyon_id,k.trafo_id,k.sokulen_markasi,k.sokulen_seri_no,k.takilan_markasi,k.takilan_seri_no,k.degisim_nedeni].filter(Boolean).join(" ").toLocaleUpperCase("tr-TR").includes(q);
    });
  },[kayitlar,arama,filtreYil,filtreAy,filtreNeden]);

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

  function raporuYazdir(){
    if(!filtrelenmisKayitlar.length){alert("Yazdırılacak kayıt bulunmuyor.");return;}
    const sat=filtrelenmisKayitlar.map((k,i)=>`<tr><td>${k.sira_no??i+1}</td><td>${tarihGoster(k.tarih)}</td><td>${k.yil??""}</td><td>${k.ay??""}</td><td>${esc(k.ilce)}</td><td>${esc(k.mahalle)}</td><td>${esc(k.tr)}</td><td>${esc(k.lokasyon_id)}</td><td>${esc(k.trafo_id)}</td><td>${esc(k.sokulen_gucu)}</td><td>${esc(k.sokulen_markasi)}</td><td>${esc(k.takilan_gucu)}</td><td>${esc(k.takilan_markasi)}</td><td>${esc(k.degisim_nedeni)}</td></tr>`).join("");
    const w=window.open("","_blank","width=1400,height=900");if(!w){alert("Yazdırma penceresi açılamadı.");return;}
    w.document.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Balıkesir Trafo Değişim Raporu</title><style>@page{size:A4 landscape;margin:8mm}body{font-family:Arial;color:#111827}h1{border-bottom:4px solid #f97316;padding-bottom:8px}table{width:100%;border-collapse:collapse;font-size:8px}th{background:#111827;color:white;padding:5px}td{padding:4px;border:1px solid #d1d5db}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><h1>BALIKESİR TRAFO DEĞİŞİM RAPORU</h1><p><b>Toplam Kayıt:</b> ${filtrelenmisKayitlar.length}</p><table><thead><tr><th>No</th><th>Tarih</th><th>Yıl</th><th>Ay</th><th>İlçe</th><th>Mahalle</th><th>TR</th><th>Lokasyon ID</th><th>Trafo ID</th><th>Sökülen Güç</th><th>Sökülen Marka</th><th>Takılan Güç</th><th>Takılan Marka</th><th>Neden</th></tr></thead><tbody>${sat}</tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
    w.document.close();
  }

  if(authKontrol)return <main className="flex min-h-screen items-center justify-center bg-[#07111f] text-white"><div className="text-center"><div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-orange-500"/><p className="mt-5 text-slate-400">Sistem hazırlanıyor...</p></div></main>;

  if(!session)return <main className="min-h-screen bg-slate-950 text-white"><div className="flex min-h-screen">
    <section className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-14 lg:flex"><div><div className="inline-flex rounded-2xl bg-orange-500 px-4 py-3 font-bold">⚡ BALIKESİR TRAFO</div><h1 className="mt-10 text-5xl font-black">Trafo Değişim<span className="block text-orange-400">Yönetim Sistemi</span></h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">Trafo değişim kayıtlarını yönetin, istatistikleri takip edin ve değişim nedenlerini tek ekrandan analiz edin.</p></div></section>
    <section className="flex w-full items-center justify-center p-5 lg:w-1/2"><div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl"><div className="text-sm font-bold uppercase tracking-widest text-orange-400">Yönetim Paneli</div><h2 className="mt-2 mb-8 text-3xl font-black">Giriş Yap</h2>
      <form onSubmit={girisYap} autoComplete="on" className="space-y-5"><Alan baslik="E-posta"><input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} className={inputSinif}/></Alan><Alan baslik="Şifre"><input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className={inputSinif}/></Alan>{authHata&&<HataKutusu>{authHata}</HataKutusu>}<button disabled={girisYukleniyor} className="w-full rounded-xl bg-orange-500 px-4 py-3 font-black hover:bg-orange-400">{girisYukleniyor?"Giriş Yapılıyor...":"Sisteme Giriş Yap"}</button></form>
    </div></section></div></main>;

  return <main className="min-h-screen bg-[#07111f] text-white">
    {mobilMenuAcik&&<div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={()=>setMobilMenuAcik(false)}/>}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-[310px] flex-col border-r border-slate-800 bg-[#0b1628] shadow-2xl transition-transform lg:hidden ${mobilMenuAcik?"translate-x-0":"-translate-x-full"}`}>
      <div className="flex items-start justify-between border-b border-slate-800 px-5 py-6"><div><div className="text-xs font-bold tracking-[.22em] text-orange-400">BALIKESİR</div><div className="mt-1 text-xl font-black">⚡ TRAFO YÖNETİMİ</div></div><button onClick={()=>setMobilMenuAcik(false)} className="h-10 w-10 rounded-xl border border-slate-700 text-xl">×</button></div>
      <Nav sayfa={sayfa} duzenlenenId={duzenlenenId} formTemizle={formTemizle} git={sayfayaGit}/>
      <div className="border-t border-slate-800 p-4"><div className="mb-3 break-all text-xs text-slate-500">{session.user.email}</div><button onClick={cikisYap} className="w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold">Çıkış Yap</button></div>
    </aside>

    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-800 bg-[#0b1628] lg:flex"><div className="border-b border-slate-800 px-5 py-6"><div className="text-xs font-bold tracking-[.22em] text-orange-400">BALIKESİR</div><div className="mt-1 text-xl font-black">⚡ TRAFO<br/>YÖNETİMİ</div></div><Nav sayfa={sayfa} duzenlenenId={duzenlenenId} formTemizle={formTemizle} git={sayfayaGit}/><div className="border-t border-slate-800 p-3"><div className="mb-3 truncate text-xs text-slate-500">{session.user.email}</div><button onClick={cikisYap} className="w-full rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold">Çıkış Yap</button></div></aside>

      <section className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-800 bg-[#0b1628]/95 px-4 py-3 backdrop-blur sm:px-5 sm:py-4 lg:px-7"><button onClick={()=>setMobilMenuAcik(true)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-[#07111f] text-xl lg:hidden">☰</button><div className="min-w-0"><h1 className="truncate text-lg font-black sm:text-xl lg:text-2xl">{sayfa==="dashboard"?"Trafo Değişim Kontrol Paneli":sayfa==="yeni"?(duzenlenenId?"Trafo Kaydını Düzenle":"Yeni Trafo Değişim Kaydı"):"Trafo Değişim Kayıtları"}</h1><p className="mt-1 hidden text-xs text-slate-500 sm:block">BALIKESİR TRAFO DEĞİŞİM YÖNETİM SİSTEMİ</p></div></header>

        <div className="p-3 sm:p-5 lg:p-7">
          {genelHata&&<HataKutusu>{genelHata}</HataKutusu>}{basariMesaji&&<div className="mb-5 rounded-xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">{basariMesaji}</div>}

          {sayfa==="dashboard"&&<>
            <div className="mb-4 rounded-2xl border border-slate-800 bg-[#101d30] p-4 shadow-xl">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto_auto] xl:items-end">
                <Alan baslik="YIL"><select value={dashboardYil} onChange={e=>setDashboardYil(e.target.value)} className={inputSinif}><option value="">Tüm Yıllar</option>{yillar.map(y=><option key={y}>{y}</option>)}</select></Alan>
                <Alan baslik="İLÇE"><select value={dashboardIlce} onChange={e=>setDashboardIlce(e.target.value)} className={inputSinif}><option value="">Tüm İlçeler</option>{ilceler.map(i=><option key={i}>{i}</option>)}</select></Alan>
                <button onClick={()=>{setDashboardYil("");setDashboardIlce("");}} className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold hover:bg-slate-800">Filtreyi Temizle</button>
                <button onClick={()=>{formTemizle();sayfayaGit("yeni");}} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black hover:bg-orange-400">+ Yeni Trafo Kaydı</button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3 text-xs"><span className="font-bold text-slate-500">Aktif görünüm:</span><Etiket>{dashboardYil||"Tüm Yıllar"}</Etiket><Etiket>{dashboardIlce||"Tüm İlçeler"}</Etiket><span className="ml-auto hidden text-slate-500 sm:inline">{dashboardKayitlari.length} kayıt</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"><KpiKart baslik="TOPLAM KAYIT" sayi={dashboardKayitlari.length} renk="#f97316"/>{NEDENLER.map(n=><KpiKart key={n.ad} baslik={n.ad} sayi={nedenSayilari[n.ad]||0} renk={n.renk}/>)}</div>
            <div className="mt-4 grid gap-3 md:grid-cols-3"><OzetKart ikon="📅" baslik="SON 30 GÜN" deger={String(son30Gun)} alt="Trafo değişim kaydı"/><OzetKart ikon="📍" baslik="EN ÇOK DEĞİŞİM YAPILAN İLÇE" deger={String(enCokIlce[0])} alt={`${enCokIlce[1]} kayıt`}/><OzetKart ikon="⚡" baslik="EN ÇOK DEĞİŞİM NEDENİ" deger={String(enCokNeden[0])} alt={`${enCokNeden[1]} kayıt`}/></div>

            <div className="mt-5 grid items-stretch gap-5 xl:grid-cols-[.72fr_1.28fr]">
              <Panel baslik="Değişim Nedenleri" altBaslik="Seçili filtreye göre dağılım" className="h-full">
                <div className="flex min-h-[430px] flex-col"><div className="flex flex-1 items-center justify-center py-5"><div className="relative h-44 w-44 rounded-full sm:h-48 sm:w-48" style={{background:`conic-gradient(${donutGradient})`}}><div className="absolute inset-7 flex flex-col items-center justify-center rounded-full border border-slate-800 bg-[#101d30]"><div className="text-3xl font-black">{dashboardKayitlari.length}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Toplam</div></div></div></div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">{NEDENLER.map(n=><div key={n.ad} className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#07111f] px-3 py-2.5"><div className="flex min-w-0 items-center gap-2.5"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{backgroundColor:n.renk}}/><span className="truncate text-[11px] font-bold text-slate-300">{n.ad}</span></div><span className="ml-3 text-sm font-black">{nedenSayilari[n.ad]||0}</span></div>)}</div>
                </div>
              </Panel></div>
              <div id="zaman-analizi" className="scroll-mt-24"><Panel baslik="Yıllara Göre Değişim Nedenleri" altBaslik="Her renk ayrı bir değişim nedenini gösterir" className="h-full"><GrafikLegend/><BarChart items={yillikNedenler.map(x=>({label:String(x.yil),total:x.toplam,values:x.nedenler}))} max={maxYillik}/></Panel></div>
            </div>

            <div className="mt-5"><Panel baslik="Aylara Göre Değişim Nedenleri" altBaslik={dashboardYil?`${dashboardYil} yılı aylık dağılımı`:"Aylık dağılım için yukarıdan bir yıl seçin"}><GrafikLegend/>{dashboardYil?<BarChart items={aylikNedenler.map(x=>({label:x.ay.substring(0,3),total:x.toplam,values:x.nedenler}))} max={maxAylik} aylik/>:<BosAlan>Aylık grafiği görüntülemek için yıl seçiniz.</BosAlan>}</Panel></div>

            <div className="mt-5 scroll-mt-24" id="neden-guc-analizi">
              <Panel
                baslik="Değişim Nedeni × Güç Analizi"
                altBaslik="Değişim nedenlerine göre güç artışı / aynı / azalış dağılımı ve öne çıkan geçişler"
              >
                <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <GucKpi baslik="GÜÇ ARTIRILAN" sayi={gucAnalizi.artan} alt={`%${((gucAnalizi.artan/gucToplam)*100).toFixed(1)}`} ikon="↗" ton="emerald"/>
                  <GucKpi baslik="GÜÇ AZALTILAN" sayi={gucAnalizi.azalan} alt={`%${((gucAnalizi.azalan/gucToplam)*100).toFixed(1)}`} ikon="↘" ton="red"/>
                  <GucKpi baslik="AYNI GÜÇ" sayi={gucAnalizi.ayni} alt={`%${((gucAnalizi.ayni/gucToplam)*100).toFixed(1)}`} ikon="→" ton="blue"/>
                  <GucKpi baslik="KARŞILAŞTIRILABİLEN" sayi={gucAnalizi.karsilastirilabilir} alt={`${dashboardKayitlari.length} toplam kayıttan`} ikon="⚡" ton="orange"/>
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-[1.7fr_.9fr]">
                  <div className="rounded-2xl border border-slate-800 bg-[#07111f] p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-black">Değişim Nedenine Göre Güç Dağılımı</div>
                        <div className="mt-1 text-xs text-slate-500">Her neden için karşılaştırılabilir güç kayıtları</div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <div className="min-w-[760px]">
                        <div className="grid grid-cols-[1.35fr_.55fr_1fr_1fr_1fr_.7fr] gap-3 border-b border-slate-800 px-3 pb-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
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
                              className="grid grid-cols-[1.35fr_.55fr_1fr_1fr_1fr_.7fr] items-center gap-3 rounded-xl border border-slate-800 bg-[#101d30] px-3 py-3"
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

                  <div className="rounded-2xl border border-slate-800 bg-[#07111f] p-4 sm:p-5">
                    <div>
                      <div className="text-sm font-black">Nedene Göre En Sık Güç Geçişleri</div>
                      <div className="mt-1 text-xs text-slate-500">Sökülen → takılan güç</div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {nedenGucAnalizi.map(item=>(
                        <div key={item.neden} className="rounded-xl border border-slate-800 bg-[#101d30] p-3">
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
              >
                <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
                  <div className="space-y-3">
                    {ilceAnalizi.length===0 ? (
                      <BosAlan>İlçe analizi için kayıt bulunmuyor.</BosAlan>
                    ) : (
                      ilceAnalizi.map((item,index)=>(
                        <div key={item.ilce} className="rounded-2xl border border-slate-800 bg-[#07111f] p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                                index===0 ? "bg-amber-500/20 text-amber-300" :
                                index===1 ? "bg-slate-400/15 text-slate-300" :
                                index===2 ? "bg-orange-800/30 text-orange-300" :
                                "bg-slate-800 text-slate-500"
                              }`}>
                                {index+1}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-black text-slate-100">{item.ilce}</div>
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
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                            <div className="h-full rounded-full bg-orange-500 transition-all" style={{width:`${Math.max(3,(item.sayi/maxIlce)*100)}%`}} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-800 bg-[#07111f] p-5">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">EN YOĞUN 3 İLÇE</div>
                      <div className="mt-4 space-y-3">
                        {ilceAnalizi.slice(0,3).map((item,index)=>(
                          <div key={item.ilce} className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#101d30] px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{index===0 ? "🥇" : index===1 ? "🥈" : "🥉"}</span>
                              <div>
                                <div className="text-sm font-black">{item.ilce}</div>
                                <div className="text-[10px] text-slate-500">%{item.oran.toFixed(1)}</div>
                              </div>
                            </div>
                            <div className="text-lg font-black">{item.sayi}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-[#07111f] p-5">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">ÖZET</div>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-slate-800 bg-[#101d30] p-4">
                          <div className="text-[10px] text-slate-500">İlçe Sayısı</div>
                          <div className="mt-1 text-2xl font-black">{ilceAnalizi.length}</div>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-[#101d30] p-4">
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
              >
                <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <GucKpi baslik="GÜÇ ARTIRILAN" sayi={gucAnalizi.artan} alt={`%${((gucAnalizi.artan/gucToplam)*100).toFixed(1)}`} ikon="↗" ton="emerald"/>
                  <GucKpi baslik="GÜÇ AZALTILAN" sayi={gucAnalizi.azalan} alt={`%${((gucAnalizi.azalan/gucToplam)*100).toFixed(1)}`} ikon="↘" ton="red"/>
                  <GucKpi baslik="AYNI GÜÇ" sayi={gucAnalizi.ayni} alt={`%${((gucAnalizi.ayni/gucToplam)*100).toFixed(1)}`} ikon="→" ton="blue"/>
                  <GucKpi baslik="KARŞILAŞTIRILABİLEN" sayi={gucAnalizi.karsilastirilabilir} alt={`${dashboardKayitlari.length} toplam kayıttan`} ikon="⚡" ton="orange"/>
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-[#07111f] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-black">En Çok Kullanılan Takılan Güçler</div>
                        <div className="mt-1 text-xs text-slate-500">İlk 8 güç değeri</div>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-[#101d30] px-3 py-2 text-right">
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
                          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                            <div className="h-full rounded-full bg-orange-500" style={{width:`${Math.max(4,(Number(sayi)/max)*100)}%`}}/>
                          </div>
                        </div>
                      }) : <BosAlan>Takılan güç verisi bulunmuyor.</BosAlan>}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-[#07111f] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-black">En Sık Güç Geçişleri</div>
                        <div className="mt-1 text-xs text-slate-500">Sökülen güç → takılan güç</div>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-[#101d30] px-3 py-2 text-right">
                        <div className="text-[9px] font-black uppercase text-slate-500">En Çok Sökülen</div>
                        <div className="text-sm font-black text-slate-200">{String(gucAnalizi.enCokSokulen[0])} kVA</div>
                      </div>
                    </div>

                    <div className="mt-5 space-y-2">
                      {gucAnalizi.gecisSirali.length ? gucAnalizi.gecisSirali.map(([gecis,sayi],index)=>(
                        <div key={gecis} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#101d30] px-4 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-black text-slate-400">{index+1}</div>
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

            <div className="mt-5"><Panel baslik="Son Trafo Değişimleri" altBaslik="Sistemdeki son 8 kayıt" sagIcerik={<button onClick={()=>sayfayaGit("kayitlar")} className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">Tüm Kayıtlar →</button>}><KayitTablosu kayitlar={kayitlar.slice(0,8)} detay={setDetayKayit} duzenle={kaydiDuzenle} sil={kaydiSil}/></Panel></div>
          </>}

          {sayfa==="yeni"&&<form onSubmit={kaydet} className="space-y-5">
            <FormBolumu baslik="📍 KONUM BİLGİLERİ"><FormGrid><ComboAlani baslik="Yıl *" deger={form.yil} degistir={v=>formDegistir("yil",v)} secenekler={YIL_SECENEKLERI} listeId="yil" gerekli/><SelectAlan baslik="Ay *" deger={form.ay} degistir={v=>formDegistir("ay",v)} secenekler={AYLAR} gerekli/><ComboAlani baslik="İlçe" deger={form.ilce} degistir={v=>formDegistir("ilce",v)} secenekler={ILCE_SECENEKLERI} listeId="ilce"/><MetinAlani baslik="Mahalle" deger={form.mahalle} degistir={v=>formDegistir("mahalle",v)}/><MetinAlani baslik="TR" deger={form.tr} degistir={v=>formDegistir("tr",v)}/><MetinAlani baslik="Lokasyon ID" deger={form.lokasyon_id} degistir={v=>formDegistir("lokasyon_id",v)}/><MetinAlani baslik="Trafo ID" deger={form.trafo_id} degistir={v=>formDegistir("trafo_id",v)}/><ComboAlani baslik="Trafo Tipi" deger={form.trafo_tipi} degistir={v=>formDegistir("trafo_tipi",v)} secenekler={KONUM_TRAFO_TIPLERI} listeId="konumtip"/></FormGrid></FormBolumu>
            <FormBolumu baslik="🔴 SÖKÜLEN TRAFO"><FormGrid><ComboAlani baslik="Gücü" deger={form.sokulen_gucu} degistir={v=>formDegistir("sokulen_gucu",v)} secenekler={GUC_SECENEKLERI} listeId="sguc"/><ComboAlani baslik="Gerilim" deger={form.sokulen_gerilim} degistir={v=>formDegistir("sokulen_gerilim",v)} secenekler={GERILIM_SECENEKLERI} listeId="sger"/><ComboAlani baslik="Markası" deger={form.sokulen_markasi} degistir={v=>formDegistir("sokulen_markasi",v)} secenekler={MARKA_SECENEKLERI} listeId="smarka"/><MetinAlani baslik="Seri No" deger={form.sokulen_seri_no} degistir={v=>formDegistir("sokulen_seri_no",v)}/><MetinAlani baslik="İmal Yılı" deger={form.sokulen_imal_yili} degistir={v=>formDegistir("sokulen_imal_yili",v)}/><ComboAlani baslik="Trafo Tipi" deger={form.sokulen_trafo_tipi} degistir={v=>formDegistir("sokulen_trafo_tipi",v)} secenekler={TRAFO_TIP_SECENEKLERI} listeId="stip"/><MetinAlani baslik="Tamir Yılı" deger={form.sokulen_tamir_yili} degistir={v=>formDegistir("sokulen_tamir_yili",v)}/><MetinAlani baslik="Tamir Firması" deger={form.sokulen_tamir_firmasi} degistir={v=>formDegistir("sokulen_tamir_firmasi",v)}/><MetinAlani baslik="Yüklenici" deger={form.sokulen_yuklenici} degistir={v=>formDegistir("sokulen_yuklenici",v)}/></FormGrid></FormBolumu>
            <FormBolumu baslik="🟢 TAKILAN TRAFO"><FormGrid><ComboAlani baslik="Gücü" deger={form.takilan_gucu} degistir={v=>formDegistir("takilan_gucu",v)} secenekler={GUC_SECENEKLERI} listeId="tguc"/><ComboAlani baslik="Gerilim" deger={form.takilan_gerilim} degistir={v=>formDegistir("takilan_gerilim",v)} secenekler={GERILIM_SECENEKLERI} listeId="tger"/><ComboAlani baslik="Markası" deger={form.takilan_markasi} degistir={v=>formDegistir("takilan_markasi",v)} secenekler={MARKA_SECENEKLERI} listeId="tmarka"/><MetinAlani baslik="Seri No" deger={form.takilan_seri_no} degistir={v=>formDegistir("takilan_seri_no",v)}/><MetinAlani baslik="İmal Yılı" deger={form.takilan_imal_yili} degistir={v=>formDegistir("takilan_imal_yili",v)}/><ComboAlani baslik="Trafo Tipi" deger={form.takilan_trafo_tipi} degistir={v=>formDegistir("takilan_trafo_tipi",v)} secenekler={TRAFO_TIP_SECENEKLERI} listeId="ttip"/><MetinAlani baslik="Tamir Yılı" deger={form.takilan_tamir_yili} degistir={v=>formDegistir("takilan_tamir_yili",v)}/><MetinAlani baslik="Tamir Firması" deger={form.takilan_tamir_firmasi} degistir={v=>formDegistir("takilan_tamir_firmasi",v)}/></FormGrid></FormBolumu>
            <FormBolumu baslik="📅 İŞLEM BİLGİLERİ"><FormGrid><Alan baslik="Tarih *"><input type="date" required value={form.tarih} onChange={e=>formDegistir("tarih",e.target.value)} className={inputSinif}/></Alan><SelectAlan baslik="Değişim Nedeni *" deger={form.degisim_nedeni} degistir={v=>formDegistir("degisim_nedeni",v)} secenekler={NEDENLER.map(n=>n.ad)} gerekli/></FormGrid><div className="mt-4"><Alan baslik="Açıklama"><textarea rows={4} value={form.aciklama} onChange={e=>formDegistir("aciklama",e.target.value)} className={inputSinif}/></Alan></div></FormBolumu>
            <div className="sticky bottom-0 z-10 flex flex-col gap-2 border-t border-slate-800 bg-[#07111f]/95 py-3 backdrop-blur sm:static sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent">{duzenlenenId&&<button type="button" onClick={()=>{formTemizle();sayfayaGit("kayitlar");}} className="rounded-xl border border-slate-700 px-6 py-3 font-bold">Vazgeç</button>}<button disabled={kaydediliyor} className="rounded-xl bg-orange-500 px-8 py-3 font-black hover:bg-orange-400">{kaydediliyor?"Kaydediliyor...":duzenlenenId?"Değişiklikleri Kaydet":"Trafo Kaydını Kaydet"}</button></div>
          </form>}

          {sayfa==="kayitlar"&&<>
            <div className="mb-5 rounded-2xl border border-slate-800 bg-[#101d30] p-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><input value={arama} onChange={e=>setArama(e.target.value)} placeholder="Ara..." className={inputSinif}/><select value={filtreYil} onChange={e=>setFiltreYil(e.target.value)} className={inputSinif}><option value="">Tüm Yıllar</option>{yillar.map(y=><option key={y}>{y}</option>)}</select><select value={filtreAy} onChange={e=>setFiltreAy(e.target.value)} className={inputSinif}><option value="">Tüm Aylar</option>{AYLAR.map(a=><option key={a}>{a}</option>)}</select><select value={filtreNeden} onChange={e=>setFiltreNeden(e.target.value)} className={inputSinif}><option value="">Tüm Nedenler</option>{NEDENLER.map(n=><option key={n.ad}>{n.ad}</option>)}</select></div><div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="text-sm text-slate-400"><b className="text-white">{filtrelenmisKayitlar.length}</b> kayıt görüntüleniyor.</div><div className="grid gap-2 sm:grid-cols-2"><button onClick={raporuYazdir} className="rounded-xl bg-slate-700 px-5 py-3 text-sm font-black">🖨️ PDF / Yazdır</button><button onClick={excelAktar} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black">📥 Excel&apos;e Aktar</button></div></div></div>
            <Panel baslik="Trafo Değişim Kayıtları" altBaslik="Detayları görüntüleyebilir, düzenleyebilir veya silebilirsiniz">{veriYukleniyor?<BosAlan>Kayıtlar yükleniyor...</BosAlan>:<KayitTablosu kayitlar={filtrelenmisKayitlar} detay={setDetayKayit} duzenle={kaydiDuzenle} sil={kaydiSil}/>}</Panel>
          </>}
        </div>
      </section>
    </div>
    {detayKayit&&<DetayModal kayit={detayKayit} kapat={()=>setDetayKayit(null)} duzenle={kaydiDuzenle} yazdir={tekKayitYazdir}/>}
  </main>;
}

function Nav({sayfa,duzenlenenId,formTemizle,git}:{sayfa:Sayfa;duzenlenenId:number|null;formTemizle:()=>void;git:(s:Sayfa)=>void}){
  return <nav className="flex-1 space-y-2 overflow-y-auto p-3"><MenuButonu aktif={sayfa==="dashboard"} onClick={()=>git("dashboard")}>📊 Kontrol Paneli</MenuButonu>
<div className="my-2 border-t border-slate-800 pt-2">
  <div className="mb-1 px-3 text-[9px] font-black uppercase tracking-[.18em] text-slate-600">ANALİZLER</div>
  <MenuAlt onClick={()=>bolumeGit("degisim-nedenleri")}>◉ Değişim Nedenleri</MenuAlt>
  <MenuAlt onClick={()=>bolumeGit("zaman-analizi")}>▥ Yıllık / Aylık Analiz</MenuAlt>
  <MenuAlt onClick={()=>bolumeGit("neden-guc-analizi")}>⚡ Neden × Güç Analizi</MenuAlt>
  <MenuAlt onClick={()=>bolumeGit("ilce-analizi")}>📍 İlçe Analizi</MenuAlt>
  <MenuAlt onClick={()=>bolumeGit("trafo-guc-analizi")}>↗ Trafo Güç Analizi</MenuAlt>
</div>
<MenuButonu aktif={sayfa==="yeni"&&!duzenlenenId} onClick={()=>{formTemizle();git("yeni");}}>➕ Yeni Kayıt</MenuButonu>
<MenuButonu aktif={sayfa==="kayitlar"} onClick={()=>git("kayitlar")}>📋 Trafo Kayıtları</MenuButonu></nav>;
}
function MenuAlt({children,onClick}:{children:ReactNode;onClick:()=>void}){return <button onClick={onClick} className="mb-0.5 block w-full rounded-lg px-3 py-2 text-left text-[11px] font-bold text-slate-400 transition hover:bg-slate-800 hover:text-white">{children}</button>}
function Alan({baslik,children}:{baslik:string;children:ReactNode}){return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-300">{baslik}</span>{children}</label>}
function MetinAlani({baslik,deger,degistir}:{baslik:string;deger:string;degistir:(v:string)=>void}){return <Alan baslik={baslik}><input value={deger} onChange={e=>degistir(e.target.value)} className={inputSinif}/></Alan>}
function ComboAlani({baslik,deger,degistir,secenekler,listeId,gerekli=false}:{baslik:string;deger:string;degistir:(v:string)=>void;secenekler:string[];listeId:string;gerekli?:boolean}){return <Alan baslik={baslik}><div className="relative"><input list={listeId} required={gerekli} autoComplete="off" value={deger} onChange={e=>degistir(e.target.value)} placeholder="Seçiniz veya yazınız" className={`${inputSinif} pr-10`}/><div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500">▼</div><datalist id={listeId}>{secenekler.map(s=><option key={s} value={s}/>)}</datalist></div></Alan>}
function SelectAlan({baslik,deger,degistir,secenekler,gerekli=false}:{baslik:string;deger:string;degistir:(v:string)=>void;secenekler:string[];gerekli?:boolean}){return <Alan baslik={baslik}><select required={gerekli} value={deger} onChange={e=>degistir(e.target.value)} className={inputSinif}><option value="">Seçiniz</option>{secenekler.map(s=><option key={s} value={s}>{s}</option>)}</select></Alan>}
function FormGrid({children}:{children:ReactNode}){return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>}
function FormBolumu({baslik,children}:{baslik:string;children:ReactNode}){return <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#101d30]"><div className="border-b border-slate-800 bg-[#0b1628] px-4 py-4 font-black sm:px-5">{baslik}</div><div className="p-4 sm:p-5 lg:p-6">{children}</div></section>}
function MenuButonu({aktif,onClick,children}:{aktif:boolean;onClick:()=>void;children:ReactNode}){return <button onClick={onClick} className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${aktif?"bg-orange-500 text-white":"text-slate-300 hover:bg-slate-800"}`}>{children}</button>}
function Etiket({children}:{children:ReactNode}){return <span className="rounded-full border border-slate-700 bg-[#07111f] px-3 py-1.5 font-bold text-slate-300">{children}</span>}
function KpiKart({baslik,sayi,renk}:{baslik:string;sayi:number;renk:string}){return <div className="group overflow-hidden rounded-2xl border border-slate-800 bg-[#101d30] shadow-lg transition hover:-translate-y-0.5 hover:border-slate-700"><div className="h-1.5" style={{backgroundColor:renk}}/><div className="p-4"><div className="min-h-7 text-[10px] font-black uppercase tracking-wider text-slate-500">{baslik}</div><div className="mt-1 flex items-end justify-between"><div className="text-2xl font-black sm:text-3xl">{sayi}</div><span className="mb-1 h-2.5 w-2.5 rounded-full" style={{backgroundColor:renk}}/></div></div></div>}
function OzetKart({ikon,baslik,deger,alt}:{ikon:string;baslik:string;deger:string;alt:string}){return <div className="rounded-2xl border border-slate-800 bg-[#101d30] p-4 shadow-lg"><div className="flex items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-[#07111f] text-xl">{ikon}</div><div className="min-w-0"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{baslik}</div><div className="mt-1 truncate text-lg font-black sm:text-xl">{deger}</div><div className="mt-0.5 text-[11px] text-slate-500">{alt}</div></div></div></div>}
function Panel({baslik,altBaslik,children,className="",sagIcerik}:{baslik:string;altBaslik?:string;children:ReactNode;className?:string;sagIcerik?:ReactNode}){return <section className={`rounded-2xl border border-slate-800 bg-[#101d30] p-4 shadow-lg sm:p-5 lg:p-6 ${className}`}><div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-black sm:text-lg">{baslik}</h2>{altBaslik&&<p className="mt-1 text-xs text-slate-500 sm:text-sm">{altBaslik}</p>}</div>{sagIcerik}</div>{children}</section>}
function GrafikLegend(){return <div className="mt-4 flex flex-wrap gap-2">{NEDENLER.map(n=><div key={n.ad} className="flex items-center gap-2 rounded-full border border-slate-800 bg-[#07111f] px-2.5 py-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{backgroundColor:n.renk}}/><span className="text-[9px] font-black uppercase text-slate-400">{n.ad}</span></div>)}</div>}
function BarChart({items,max,aylik=false}:{items:{label:string;total:number;values:Record<string,number>}[];max:number;aylik?:boolean}){return <div className="mt-5 overflow-x-auto"><div className={aylik?"min-w-[900px]":"min-w-[760px]"}><div className={aylik?"relative h-[270px]":"relative h-[350px]"}><div className="pointer-events-none absolute inset-x-0 bottom-10 top-5 flex flex-col justify-between">{[1,2,3,4,5].map(i=><div key={i} className="border-t border-dashed border-slate-800"/>)}</div><div className="absolute inset-0 flex items-end gap-3 px-2">{items.map(it=><div key={it.label} className="flex min-w-[62px] flex-1 flex-col items-center justify-end"><div className="mb-2 rounded-full bg-[#07111f] px-2 py-1 text-[9px] font-black">{it.total}</div><div className={`flex items-end gap-[2px] ${aylik?"h-[180px]":"h-[255px]"}`}>{NEDENLER.map(n=>{const v=it.values[n.ad]||0,h=v?Math.max(6,(v/max)*(aylik?160:225)):0;return <div key={n.ad} title={`${it.label} - ${n.ad}: ${v}`} className={aylik?"w-[5px] rounded-t":"w-[7px] rounded-t-md"} style={{height:`${h}px`,backgroundColor:n.renk}}/>})}</div><div className="mt-3 w-full border-t border-slate-700 pt-2 text-center text-[10px] font-black text-slate-500">{it.label}</div></div>)}</div></div></div></div>}
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
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
      <div className={`h-full rounded-full ${bar}`} style={{width:`${Math.max(oran>0?3:0,oran)}%`}}/>
    </div>
  </div>
}

function OzelOzet({baslik,deger,alt,ton}:{baslik:string;deger:string;alt:string;ton:"emerald"|"red"|"purple"|"blue"}){
  const cls={
    emerald:"border-emerald-900/60 bg-emerald-950/15 text-emerald-400",
    red:"border-red-900/60 bg-red-950/15 text-red-400",
    purple:"border-violet-900/60 bg-violet-950/15 text-violet-400",
    blue:"border-blue-900/60 bg-blue-950/15 text-blue-400",
  }[ton];

  return <div className={`rounded-2xl border p-4 ${cls}`}>
    <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">{baslik}</div>
    <div className="mt-3 text-2xl font-black text-white">{deger}</div>
    <div className="mt-1 text-[10px] font-bold">{alt}</div>
  </div>
}

function GucKpi({baslik,sayi,alt,ikon,ton}:{baslik:string;sayi:number;alt:string;ikon:string;ton:"emerald"|"red"|"blue"|"orange"}){
  const tonlar={
    emerald:"border-emerald-900/60 bg-emerald-950/20 text-emerald-400",
    red:"border-red-900/60 bg-red-950/20 text-red-400",
    blue:"border-blue-900/60 bg-blue-950/20 text-blue-400",
    orange:"border-orange-900/60 bg-orange-950/20 text-orange-400",
  };
  return <div className={`rounded-2xl border p-4 ${tonlar[ton]}`}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">{baslik}</div>
        <div className="mt-2 text-2xl font-black text-white sm:text-3xl">{sayi}</div>
        <div className="mt-1 text-[10px] font-bold">{alt}</div>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-current/20 bg-[#07111f] text-xl font-black">{ikon}</div>
    </div>
  </div>
}
function HataKutusu({children}:{children:ReactNode}){return <div className="mb-5 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">{children}</div>}
function BosAlan({children}:{children:ReactNode}){return <div className="my-6 w-full rounded-xl border border-dashed border-slate-700 p-7 text-center text-sm text-slate-500 sm:p-10">{children}</div>}
function NedenEtiketi({neden}:{neden:string|null}){const n=NEDENLER.find(x=>x.ad===neden);return neden?<span className="inline-flex whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-black text-white" style={{backgroundColor:n?.renk||"#475569"}}>{neden}</span>:<span className="text-slate-600">-</span>}

function KayitTablosu({kayitlar,detay,duzenle,sil}:{kayitlar:TrafoKaydi[];detay:(k:TrafoKaydi)=>void;duzenle:(k:TrafoKaydi)=>void;sil:(k:TrafoKaydi)=>void}){
  if(!kayitlar.length)return <BosAlan>Henüz kayıt bulunmuyor.</BosAlan>;
  return <><div className="mt-5 space-y-3 md:hidden">{kayitlar.map(k=><div key={k.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-[#07111f]"><div className="flex items-start justify-between gap-3 border-b border-slate-800 p-4"><div className="min-w-0"><div className="text-xs font-bold text-orange-400">{tarihGoster(k.tarih)}</div><div className="mt-1 text-base font-black">{k.ilce||"İlçe belirtilmemiş"}{k.mahalle?` / ${k.mahalle}`:""}</div></div><NedenEtiketi neden={k.degisim_nedeni}/></div><div className="grid grid-cols-2 gap-px bg-slate-800"><MobilBilgi baslik="Yıl / Ay" deger={`${k.yil||"-"} / ${k.ay||"-"}`}/><MobilBilgi baslik="Trafo ID" deger={k.trafo_id}/><MobilBilgi baslik="Lokasyon ID" deger={k.lokasyon_id}/><MobilBilgi baslik="TR" deger={k.tr}/></div><div className="grid grid-cols-3 gap-2 p-3"><IslemButon onClick={()=>detay(k)} cls="border-orange-700 text-orange-300">Detay</IslemButon><IslemButon onClick={()=>duzenle(k)} cls="border-blue-700 text-blue-300">Düzenle</IslemButon><IslemButon onClick={()=>sil(k)} cls="border-red-800 text-red-300">Sil</IslemButon></div></div>)}</div>
  <div className="mt-4 hidden overflow-x-auto md:block"><table className="min-w-full text-left text-sm"><thead><tr className="border-b border-slate-700 text-[10px] uppercase text-slate-500">{["Tarih","Yıl","Ay","İlçe","Mahalle","Konum","Trafo ID","Değişim Nedeni","İşlem"].map(h=><th key={h} className="px-3 py-3">{h}</th>)}</tr></thead><tbody>{kayitlar.map(k=><tr key={k.id} className="border-b border-slate-800/80 hover:bg-slate-800/30"><td className="px-3 py-3.5 font-semibold">{tarihGoster(k.tarih)}</td><td className="px-3 py-3.5">{k.yil||"-"}</td><td className="px-3 py-3.5">{k.ay||"-"}</td><td className="px-3 py-3.5">{k.ilce||"-"}</td><td className="px-3 py-3.5">{k.mahalle||"-"}</td><td className="px-3 py-3.5">{k.lokasyon_id||"-"}</td><td className="px-3 py-3.5">{k.trafo_id||"-"}</td><td className="px-3 py-3.5"><NedenEtiketi neden={k.degisim_nedeni}/></td><td className="whitespace-nowrap px-3 py-3.5 text-right"><button onClick={()=>detay(k)} className="mr-2 rounded-lg border border-orange-700 px-3 py-2 text-xs font-bold text-orange-300">Detay</button><button onClick={()=>duzenle(k)} className="mr-2 rounded-lg border border-blue-700 px-3 py-2 text-xs font-bold text-blue-300">Düzenle</button><button onClick={()=>sil(k)} className="rounded-lg border border-red-800 px-3 py-2 text-xs font-bold text-red-300">Sil</button></td></tr>)}</tbody></table></div></>;
}
function IslemButon({onClick,cls,children}:{onClick:()=>void;cls:string;children:ReactNode}){return <button onClick={onClick} className={`rounded-xl border px-2 py-2.5 text-xs font-bold ${cls}`}>{children}</button>}
function MobilBilgi({baslik,deger}:{baslik:string;deger:string|number|null|undefined}){return <div className="bg-[#101d30] p-3"><div className="text-[9px] font-black uppercase tracking-wider text-slate-500">{baslik}</div><div className="mt-1 break-words text-xs font-bold text-slate-200">{deger===null||deger===undefined||String(deger).trim()===""?"-":String(deger)}</div></div>}

function DetayModal({kayit,kapat,duzenle,yazdir}:{kayit:TrafoKaydi;kapat:()=>void;duzenle:(k:TrafoKaydi)=>void;yazdir:(k:TrafoKaydi)=>void}){
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-0 backdrop-blur-sm sm:p-4" onMouseDown={kapat}><div onMouseDown={e=>e.stopPropagation()} className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0b1628] shadow-2xl sm:h-[92vh] sm:max-w-6xl sm:rounded-3xl sm:border sm:border-slate-700"><div className="flex shrink-0 items-start justify-between border-b border-slate-800 bg-[#101d30] px-4 py-4 sm:px-7 sm:py-5"><div><div className="text-[10px] font-black tracking-[.18em] text-orange-400">TRAFO DEĞİŞİM KAYDI</div><h2 className="mt-1 text-lg font-black sm:text-2xl">{kayit.ilce||"İlçe Belirtilmemiş"}{kayit.mahalle&&<span className="text-slate-400"> / {kayit.mahalle}</span>}</h2><div className="mt-3 flex flex-wrap gap-2"><Etiket>📅 {tarihGoster(kayit.tarih)}</Etiket><NedenEtiketi neden={kayit.degisim_nedeni}/></div></div><button onClick={kapat} className="h-10 w-10 rounded-xl border border-slate-700 text-xl">×</button></div>
    <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-7"><DetayBolumu baslik="📍 KONUM BİLGİLERİ"><DetayGrid><D b="Yıl" v={kayit.yil}/><D b="Ay" v={kayit.ay}/><D b="İlçe" v={kayit.ilce}/><D b="Mahalle" v={kayit.mahalle}/><D b="TR" v={kayit.tr}/><D b="Lokasyon ID" v={kayit.lokasyon_id}/><D b="Trafo ID" v={kayit.trafo_id}/><D b="Trafo Tipi" v={kayit.trafo_tipi}/></DetayGrid></DetayBolumu>
    <div className="mt-4 grid gap-4 xl:grid-cols-2"><DetayBolumu baslik="🔴 SÖKÜLEN TRAFO"><DetayGrid iki><D b="Gücü" v={kayit.sokulen_gucu}/><D b="Gerilim" v={kayit.sokulen_gerilim}/><D b="Markası" v={kayit.sokulen_markasi}/><D b="Seri No" v={kayit.sokulen_seri_no}/><D b="İmal Yılı" v={kayit.sokulen_imal_yili}/><D b="Trafo Tipi" v={kayit.sokulen_trafo_tipi}/><D b="Tamir Yılı" v={kayit.sokulen_tamir_yili}/><D b="Tamir Firması" v={kayit.sokulen_tamir_firmasi}/><D b="Yüklenici" v={kayit.sokulen_yuklenici}/></DetayGrid></DetayBolumu><DetayBolumu baslik="🟢 TAKILAN TRAFO"><DetayGrid iki><D b="Gücü" v={kayit.takilan_gucu}/><D b="Gerilim" v={kayit.takilan_gerilim}/><D b="Markası" v={kayit.takilan_markasi}/><D b="Seri No" v={kayit.takilan_seri_no}/><D b="İmal Yılı" v={kayit.takilan_imal_yili}/><D b="Trafo Tipi" v={kayit.takilan_trafo_tipi}/><D b="Tamir Yılı" v={kayit.takilan_tamir_yili}/><D b="Tamir Firması" v={kayit.takilan_tamir_firmasi}/></DetayGrid></DetayBolumu></div>
    <div className="mt-4"><DetayBolumu baslik="📅 İŞLEM BİLGİLERİ"><DetayGrid><D b="Tarih" v={tarihGoster(kayit.tarih)}/><D b="Değişim Nedeni" v={kayit.degisim_nedeni}/><D b="Kayıt No" v={kayit.sira_no||kayit.id}/></DetayGrid><div className="mt-4 rounded-xl border border-slate-800 bg-[#07111f] p-4"><div className="mb-2 text-[10px] font-black text-slate-500">AÇIKLAMA</div><div className="whitespace-pre-wrap text-sm">{kayit.aciklama||"Açıklama girilmemiş."}</div></div></DetayBolumu></div></div>
    <div className="grid shrink-0 grid-cols-3 gap-2 border-t border-slate-800 bg-[#101d30] px-3 py-3 sm:flex sm:justify-end sm:px-7"><button onClick={()=>yazdir(kayit)} className="rounded-xl bg-slate-700 px-3 py-2.5 text-xs font-black">🖨️ PDF</button><button onClick={kapat} className="rounded-xl border border-slate-700 px-3 py-2.5 text-xs font-bold">Kapat</button><button onClick={()=>duzenle(kayit)} className="rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-black">✏️ Düzenle</button></div></div></div>;
}
function DetayBolumu({baslik,children}:{baslik:string;children:ReactNode}){return <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#101d30]"><div className="border-b border-slate-800 bg-[#07111f] px-4 py-3 text-sm font-black">{baslik}</div><div className="p-3 sm:p-5">{children}</div></section>}
function DetayGrid({children,iki=false}:{children:ReactNode;iki?:boolean}){return <div className={iki?"grid gap-3 sm:grid-cols-2":"grid gap-3 sm:grid-cols-2 lg:grid-cols-4"}>{children}</div>}
function D({b,v}:{b:string;v:string|number|null|undefined}){return <div className="rounded-xl border border-slate-800 bg-[#07111f] px-4 py-3"><div className="text-[10px] font-black uppercase text-slate-500">{b}</div><div className="mt-1 break-words text-sm font-bold">{v===null||v===undefined||String(v).trim()===""?"-":String(v)}</div></div>}

function tekKayitYazdir(k:TrafoKaydi){const w=window.open("","_blank","width=1000,height=900");if(!w)return;const f=(b:string,v:unknown)=>`<div><small>${b}</small><b>${esc(v as string)}</b></div>`;w.document.write(`<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4 portrait;margin:12mm}body{font-family:Arial}h1{border-bottom:4px solid #f97316}.s{border:1px solid #ddd;margin-top:12px}.h{background:#111827;color:white;padding:8px;font-weight:bold}.g{display:grid;grid-template-columns:repeat(4,1fr)}.g div{padding:8px;border:1px solid #eee}.g small{display:block;color:#777;font-size:8px}.g b{display:block;margin-top:4px;font-size:11px}</style></head><body><h1>BALIKESİR TRAFO DEĞİŞİM KAYDI</h1><div class="s"><div class="h">KONUM</div><div class="g">${f("Yıl",k.yil)}${f("Ay",k.ay)}${f("İlçe",k.ilce)}${f("Mahalle",k.mahalle)}${f("TR",k.tr)}${f("Lokasyon ID",k.lokasyon_id)}${f("Trafo ID",k.trafo_id)}${f("Trafo Tipi",k.trafo_tipi)}</div></div><div class="s"><div class="h">İŞLEM</div><div class="g">${f("Tarih",tarihGoster(k.tarih))}${f("Değişim Nedeni",k.degisim_nedeni)}${f("Kayıt No",k.sira_no||k.id)}</div></div><script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);w.document.close();}
function tarihGoster(t:string|null){if(!t)return"-";const p=t.split("-");return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:t}
function esc(v:unknown){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
