"use client";

import { useEffect, useState } from "react";
import TrafoHarita from "./TrafoHarita";

const EVENT_AC="trafo-harita-ac";

export default function HaritaEntegrasyon(){
  const [acik,setAcik]=useState(false);

  useEffect(()=>{const ac=()=>setAcik(true);window.addEventListener(EVENT_AC,ac);return()=>window.removeEventListener(EVENT_AC,ac);},[]);
  useEffect(()=>{const menudeBaskaSekme=(e:MouseEvent)=>{const hedef=e.target as HTMLElement|null;const buton=hedef?.closest("nav button") as HTMLButtonElement|null;if(!buton)return;if(buton.dataset.trafoHaritaMenu==="1")return;setAcik(false);};document.addEventListener("click",menudeBaskaSekme,true);return()=>document.removeEventListener("click",menudeBaskaSekme,true);},[]);

  useEffect(()=>{const ekle=()=>{document.querySelectorAll("nav").forEach(nav=>{if(nav.querySelector('[data-trafo-harita-menu="1"]'))return;const hedef=Array.from(nav.querySelectorAll("button")).find(b=>b.textContent?.includes("Trafo Kayıtları"));if(!hedef)return;const b=document.createElement("button");b.type="button";b.dataset.trafoHaritaMenu="1";b.textContent="🗺️ Trafo Haritası";b.className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition text-slate-600 hover:bg-blue-50 hover:text-blue-700";b.onclick=()=>{window.dispatchEvent(new Event(EVENT_AC));const mobilAside=b.closest("aside");if(mobilAside&&!window.matchMedia("(min-width: 1024px)").matches){const kapat=Array.from(mobilAside.querySelectorAll("button")).find(x=>x.textContent?.trim()==="×") as HTMLButtonElement|undefined;kapat?.click();}window.scrollTo({top:0,behavior:"smooth"});};hedef.insertAdjacentElement("afterend",b);});};ekle();const observer=new MutationObserver(ekle);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect();},[]);

  useEffect(()=>{document.querySelectorAll<HTMLElement>('[data-trafo-harita-menu="1"]').forEach(b=>{b.className=acik?"w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-200/60":"w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition text-slate-600 hover:bg-blue-50 hover:text-blue-700";});},[acik]);

  useEffect(()=>{
    if(!acik)return;
    const popupButonuEkle=()=>{
      document.querySelectorAll<HTMLElement>(".leaflet-popup-content").forEach(popup=>{
        if(popup.querySelector('[data-harita-gecmis="1"]'))return;
        const metin=popup.innerText||"";
        if(!metin.includes("Lokasyon ID:"))return;
        const lokasyonId=metin.match(/Lokasyon ID:\s*([^\n]+)/)?.[1]?.trim()||"";
        if(!lokasyonId||lokasyonId==="—")return;
        const b=document.createElement("button");b.type="button";b.dataset.haritaGecmis="1";b.textContent="🕘 Trafo Geçmişini Gör";b.style.cssText="width:100%;margin-top:10px;padding:9px 12px;border:0;border-radius:10px;background:#6d28d9;color:white;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(109,40,217,.22)";
        b.onclick=e=>{e.preventDefault();e.stopPropagation();window.dispatchEvent(new CustomEvent("trafo-harita-gecmis-ac",{detail:{lokasyonId}}));};popup.appendChild(b);
      });
    };
    popupButonuEkle();const observer=new MutationObserver(popupButonuEkle);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect();
  },[acik]);

  if(!acik)return null;
  return <div className="fixed inset-x-0 bottom-0 top-[76px] z-[29] overflow-y-auto bg-[#f4f7fb] lg:left-[248px]"><div className="mx-auto w-full max-w-[1700px] p-3 sm:p-5 lg:p-6"><div className="mb-5"><div className="text-[10px] font-black uppercase tracking-[.18em] text-blue-500">Şebeke Envanteri</div><h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">🗺️ Trafo Haritası</h1><p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">Balıkesir trafo noktaları ve trafo bina envanteri.</p></div><TrafoHarita/></div></div>;
}
