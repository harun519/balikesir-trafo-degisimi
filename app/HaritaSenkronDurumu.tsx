"use client";

import { useEffect } from "react";

const tarihSaat=(v:string|null|undefined)=>{if(!v)return"—";try{return new Intl.DateTimeFormat("tr-TR",{dateStyle:"short",timeStyle:"short"}).format(new Date(v));}catch{return v||"—";}};
const boyut=(n:number)=>n?`${(n/1024/1024).toFixed(1)} MB`:"—";

export default function HaritaSenkronDurumu(){
 useEffect(()=>{
  let ilkChecksum="";
  let durdu=false;
  let timer:number|undefined;

  const kutuGuncelle=(meta:any)=>{
    const baslik=Array.from(document.querySelectorAll<HTMLElement>("div")).find(x=>x.textContent?.trim()==="🗺️ Trafo Envanteri");
    if(!baslik)return;
    const ust=baslik.parentElement?.parentElement?.parentElement;
    if(!ust)return;
    let kutu=ust.querySelector<HTMLElement>('[data-envanter-senkron="1"]');
    if(!kutu){
      kutu=document.createElement("div");
      kutu.dataset.envanterSenkron="1";
      kutu.style.cssText="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:10px;font-weight:800;color:#475569";
      ust.appendChild(kutu);
    }
    kutu.innerHTML=`<span style="display:inline-flex;align-items:center;gap:5px;border:1px solid #bbf7d0;background:#f0fdf4;color:#15803d;border-radius:999px;padding:5px 8px">● SENKRON</span><span>Son güncelleme: <b>${tarihSaat(meta.updated_at)}</b></span><span>• Sürüm: <b>v${meta.version||1}</b></span><span>• Boyut: <b>${boyut(Number(meta.size||0))}</b></span>`;
  };

  const kontrol=async()=>{
    try{
      const r=await fetch("/api/harita-envanter?meta=1",{cache:"no-store"});
      if(!r.ok)return;
      const meta=await r.json();
      if(durdu)return;
      kutuGuncelle(meta);
      const checksum=String(meta.checksum||`${meta.version||""}-${meta.updated_at||""}`);
      if(!ilkChecksum){ilkChecksum=checksum;return;}
      if(checksum&&checksum!==ilkChecksum){
        ilkChecksum=checksum;
        const harita=document.querySelector(".leaflet-container");
        if(harita){window.location.reload();}
      }
    }catch{}
  };

  kontrol();
  timer=window.setInterval(kontrol,60000);
  const o=new MutationObserver(()=>kutuGuncelle({}));
  o.observe(document.body,{childList:true,subtree:true});
  return()=>{durdu=true;if(timer)window.clearInterval(timer);o.disconnect();};
 },[]);
 return null;
}
