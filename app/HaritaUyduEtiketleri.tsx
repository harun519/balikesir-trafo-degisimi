"use client";

import { useEffect } from "react";

declare global { interface Window { L?: any; } }

const norm=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ı/g,"i").toLocaleLowerCase("tr-TR").replace(/\s+/g," ").trim();

export default function HaritaUyduEtiketleri(){
  useEffect(()=>{
    let timer:number|undefined;

    const patch=()=>{
      const L=window.L;
      if(!L?.tileLayer||L.tileLayer.__uyduEtiketPatch)return !!L?.tileLayer?.__uyduEtiketPatch;

      const orj=L.tileLayer.bind(L);
      const patched=((url:string,options:any={})=>{
        if(typeof url==="string"&&url.includes("World_Imagery/MapServer/tile")){
          const uydu=orj(url,options);
          const etiket=orj(
            "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
            {maxZoom:19,opacity:1,attribution:"Labels © Esri",pane:"overlayPane"}
          );
          const grup=L.layerGroup([uydu,etiket]);
          grup.bringToBack=()=>{try{uydu.bringToBack?.();}catch{} return grup;};
          return grup;
        }
        return orj(url,options);
      }) as any;
      patched.__uyduEtiketPatch=true;
      patched.__orj=orj;
      L.tileLayer=patched;
      return true;
    };

    const uyduyaGec=()=>{
      const harita=document.querySelector<HTMLElement>(".leaflet-container");
      if(!harita||harita.dataset.varsayilanUydu==="1")return;
      const kart=harita.closest("div")?.parentElement||document;
      const butonlar=Array.from(kart.querySelectorAll<HTMLButtonElement>("button"));
      const uydu=butonlar.find(b=>norm(b.textContent||"")==="uydu"||norm(b.textContent||"").includes("uydu gorunumu"));
      if(!uydu)return;
      harita.dataset.varsayilanUydu="1";
      uydu.click();
      setTimeout(()=>window.dispatchEvent(new Event("resize")),150);
    };

    if(!patch()) timer=window.setInterval(()=>{if(patch()&&timer)window.clearInterval(timer);},100);
    const observer=new MutationObserver(()=>uyduyaGec());
    observer.observe(document.body,{childList:true,subtree:true});
    const ilk=window.setInterval(uyduyaGec,200);
    window.setTimeout(()=>window.clearInterval(ilk),5000);
    uyduyaGec();

    return()=>{if(timer)window.clearInterval(timer);window.clearInterval(ilk);observer.disconnect();};
  },[]);
  return null;
}
