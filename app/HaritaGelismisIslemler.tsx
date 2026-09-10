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

function alanInput(baslik:string,scope:ParentNode=document){
  const hedef=norm(baslik.replace(/\*/g,""));
  const spans=Array.from(scope.querySelectorAll<HTMLSpanElement>("span"));
  const s=spans.find(x=>norm((x.textContent||"").replace(/\*/g,""))===hedef);
  return (s?.parentElement?.querySelector("input,textarea")||null) as HTMLInputElement|HTMLTextAreaElement|null;
}
function nativeDeger(el:HTMLInputElement|HTMLTextAreaElement,v:string){
  const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto,"value")?.set?.call(el,v);
  el.dispatchEvent(new Event("input",{bubbles:true}));
  el.dispatchEvent(new Event("change",{bubbles:true}));
}
async function metinDoldur(baslik:string,v:string,scope:ParentNode=document){
  if(!v)return;
  const el=alanInput(baslik,scope);if(!el)return;
  el.focus();nativeDeger(el,v);el.blur();await bekle(60);
}
async function comboDoldur(baslik:string,v:string,scope:ParentNode=document){
  if(!v)return;
  const el=alanInput(baslik,scope) as HTMLInputElement|null;if(!el)return;
  el.focus();await bekle(50);nativeDeger(el,v);await bekle(120);
  const hedef=norm(v);
  const secenekler=Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
  const sec=secenekler.find(x=>{
    const t=norm(x.textContent||"");
    return t===hedef||t===`${hedef} kva`||t.startsWith(`${hedef} `);
  });
  if(sec){sec.click();await bekle(100);return;}
  el.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",code:"Enter",bubbles:true,cancelable:true}));
  await bekle(100);
}
function bolumBul(baslik:string){
  const h=Array.from(document.querySelectorAll<HTMLElement>("h2"))
    .find(x=>norm(x.textContent||"")===norm(baslik));
  return h?.closest("div.rounded-2xl")||h?.parentElement?.parentElement?.parentElement||document;
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
    for(let i=0;i<30&&!Array.from(document.querySelectorAll("h1")).some(x=>norm(x.textContent||"").includes("yeni trafo degisim kaydi"));i++)await bekle(100);

    const konum=bolumBul("Konum Bilgileri");
    await comboDoldur("İlçe",d.ilce||"",konum);
    await comboDoldur("Mahalle",d.mahalle||"",konum);
    await metinDoldur("TR / Trafo Bölge Adı",d.tr||"",konum);
    await metinDoldur("Lokasyon ID",String(d.lokasyonId||""),konum);
    await metinDoldur("Trafo ID",String(d.trafoId||""),konum);
    await comboDoldur("Trafo Tipi",d.trafoTipi||"",konum);

    const adim2=Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(x=>norm(x.textContent||"").includes("sokulen trafo"));
    if(adim2){adim2.click();}
    for(let i=0;i<20&&!Array.from(document.querySelectorAll("h2")).some(x=>norm(x.textContent||"")==="sokulen trafo");i++)await bekle(100);
    const sokulen=bolumBul("Sökülen Trafo");
    await comboDoldur("Gücü",d.guc||"",sokulen);
    await comboDoldur("Gerilim",d.gerilim||"",sokulen);
    await comboDoldur("Markası",d.marka||"",sokulen);
    await metinDoldur("Seri No",d.seriNo||"",sokulen);
    await metinDoldur("İmal Yılı",d.imalYili||"",sokulen);
    window.scrollTo({top:0,behavior:"smooth"});
  };

  window.addEventListener("trafo-harita-yeni-kayit",yeni);
  const o=new MutationObserver(ekle);o.observe(document.body,{childList:true,subtree:true});ekle();
  return()=>{o.disconnect();window.removeEventListener("trafo-harita-yeni-kayit",yeni);};
 },[]);return null;
}
