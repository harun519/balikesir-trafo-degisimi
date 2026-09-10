"use client";

import { useEffect } from "react";

const norm=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ı/g,"i").toLocaleLowerCase("tr-TR").replace(/\s+/g," ").trim();
const bekle=(ms:number)=>new Promise<void>(r=>window.setTimeout(r,ms));
const alan=(metin:string,ad:string)=>{
  const re=new RegExp(`(?:^|\\n)${ad.replace(/[.*+?^${}()|[\\]\\]/g,"\\$&")}:\\s*([^\\n]+)`,`i`);
  const v=metin.match(re)?.[1]?.trim()||"";
  return v==="—"?"":v;
};
const gucTemizle=(v:string)=>v.replace(/\s*kva\s*$/i,"").trim();

function alanInput(baslik:string){
  const hedef=norm(baslik.replace(/\*/g,""));
  const spans=Array.from(document.querySelectorAll<HTMLSpanElement>("span"));
  const s=spans.find(x=>norm((x.textContent||"").replace(/\*/g,""))===hedef);
  return (s?.parentElement?.querySelector("input,textarea")||null) as HTMLInputElement|HTMLTextAreaElement|null;
}
function nativeDeger(el:HTMLInputElement|HTMLTextAreaElement,v:string){
  const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto,"value")?.set?.call(el,v);
  el.dispatchEvent(new Event("input",{bubbles:true}));
  el.dispatchEvent(new Event("change",{bubbles:true}));
}
async function metinDoldur(baslik:string,v:string){
  if(!v)return;
  const el=alanInput(baslik);if(!el)return;
  nativeDeger(el,v);await bekle(25);
}
async function comboDoldur(baslik:string,v:string){
  if(!v)return;
  const el=alanInput(baslik) as HTMLInputElement|null;if(!el)return;
  el.focus();nativeDeger(el,v);await bekle(70);
  el.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",code:"Enter",bubbles:true,cancelable:true}));
  await bekle(70);
}

export default function HaritaGelismisIslemler(){
 useEffect(()=>{
  const ekle=()=>{
   const harita=document.querySelector<HTMLElement>(".leaflet-container");
   if(!harita)return;
   const kart=harita.parentElement as HTMLElement|null;
   if(kart&&!kart.querySelector('[data-harita-full="1"]')){
    kart.style.position="relative";
    const b=document.createElement("button");b.type="button";b.dataset.haritaFull="1";b.textContent="⛶ Tam Ekran";b.style.cssText="position:absolute;right:12px;top:58px;z-index:800;background:#0f172a;color:#fff;border:2px solid #fff;border-radius:10px;padding:8px 11px;font-size:11px;font-weight:900;box-shadow:0 4px 14px rgba(15,23,42,.35);cursor:pointer";
    b.onclick=async()=>{try{if(!document.fullscreenElement){await kart.requestFullscreen();b.textContent="✕ Tam Ekrandan Çık";}else{await document.exitFullscreen();}}catch{}};
    const fs=()=>{b.textContent=document.fullscreenElement?"✕ Tam Ekrandan Çık":"⛶ Tam Ekran";setTimeout(()=>window.dispatchEvent(new Event("resize")),100);};
    document.addEventListener("fullscreenchange",fs);kart.appendChild(b);
   }
   document.querySelectorAll<HTMLElement>(".leaflet-popup-content").forEach(p=>{
    const txt=p.innerText||"";const lok=alan(txt,"Lokasyon ID");if(!lok)return;
    if(!p.querySelector('[data-harita-yeni="1"]')){
      const baslik=(txt.split("\n")[0]||"").replace(/^⚡\s*/,"").trim();
      const detay={
        lokasyonId:lok,
        trafoId:alan(txt,"Trafo ID"),
        ilce:alan(txt,"İlçe"),
        mahalle:alan(txt,"Mahalle"),
        tr:baslik,
        trafoTipi:/bina/i.test(alan(txt,"Montaj Tipi"))?"BİNA":/direk/i.test(alan(txt,"Montaj Tipi"))?"DİREK":"",
        guc:gucTemizle(alan(txt,"Güç")),
        gerilim:alan(txt,"Primer Gerilim"),
        marka:alan(txt,"Marka"),
        seriNo:alan(txt,"Seri No"),
        imalYili:alan(txt,"İmal Yılı")
      };
      const b=document.createElement("button");b.type="button";b.dataset.haritaYeni="1";b.textContent="➕ Değişim Kaydı Oluştur";b.style.cssText="width:100%;margin-top:8px;padding:9px 12px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-size:12px;font-weight:800;cursor:pointer";
      b.onclick=()=>window.dispatchEvent(new CustomEvent("trafo-harita-yeni-kayit",{detail:detay}));p.appendChild(b);
    }
   });
   const kartlar=Array.from(document.querySelectorAll<HTMLElement>("div")).filter(x=>norm(x.textContent||"").includes("tip uyumsuzlugu"));
   const k=kartlar.find(x=>x.children.length<8);
   if(k&&!k.dataset.uyumsuzKlik){k.dataset.uyumsuzKlik="1";k.style.cursor="pointer";k.title="Uyumsuz trafoları haritada göster";}
  };

  const yeni=async(e:Event)=>{
    const d=(e as CustomEvent).detail||{};if(!d.lokasyonId)return;
    const nav=Array.from(document.querySelectorAll<HTMLButtonElement>("nav button"));
    const b=nav.find(x=>norm(x.textContent||"").includes("yeni kayit"));
    if(!b)return;
    b.click();
    for(let i=0;i<20&&!Array.from(document.querySelectorAll("h1")).some(x=>norm(x.textContent||"").includes("yeni trafo degisim kaydi"));i++)await bekle(100);

    await comboDoldur("İlçe",d.ilce||"");
    await comboDoldur("Mahalle",d.mahalle||"");
    await metinDoldur("TR / Trafo Bölge Adı",d.tr||"");
    await metinDoldur("Lokasyon ID",String(d.lokasyonId||""));
    await metinDoldur("Trafo ID",String(d.trafoId||""));
    await comboDoldur("Trafo Tipi",d.trafoTipi||"");

    const adim2=Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(x=>norm(x.textContent||"").includes("2 sokulen trafo"));
    adim2?.click();await bekle(120);
    await comboDoldur("Gücü",d.guc||"");
    await comboDoldur("Gerilim",d.gerilim||"");
    await comboDoldur("Markası",d.marka||"");
    await metinDoldur("Seri No",d.seriNo||"");
    await metinDoldur("İmal Yılı",d.imalYili||"");
    window.scrollTo({top:0,behavior:"smooth"});
  };

  window.addEventListener("trafo-harita-yeni-kayit",yeni);
  const o=new MutationObserver(ekle);o.observe(document.body,{childList:true,subtree:true});ekle();
  return()=>{o.disconnect();window.removeEventListener("trafo-harita-yeni-kayit",yeni);};
 },[]);return null;
}
