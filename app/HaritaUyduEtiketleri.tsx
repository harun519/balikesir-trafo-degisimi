"use client";

import { useEffect } from "react";

declare global {
  interface Window { L?: any; }
}

export default function HaritaUyduEtiketleri(){
  useEffect(()=>{
    let etiketKatmani:any=null;
    let sonHarita:any=null;

    const haritayiBul=()=>{
      const el=document.querySelector<HTMLElement>(".leaflet-container");
      if(!el||!window.L)return null;
      const id=(el as any)._leaflet_id;
      if(!id)return null;
      const map=(window.L as any)._mapById?.[id];
      if(map)return map;
      return null;
    };

    // Leaflet map nesnesi DOM'dan doğrudan alınamadığı için katmanları mevcut tile pane üzerinden yönetiyoruz.
    const uygula=()=>{
      const container=document.querySelector<HTMLElement>(".leaflet-container");
      if(!container||!window.L)return;
      const tilePane=container.querySelector<HTMLElement>(".leaflet-tile-pane");
      if(!tilePane)return;
      const imgler=Array.from(tilePane.querySelectorAll<HTMLImageElement>("img.leaflet-tile"));
      const uydu=imgler.some(i=>i.src.includes("World_Imagery"));
      const mevcut=container.querySelector<HTMLElement>('[data-uydu-etiket-pane="1"]');
      if(!uydu){ mevcut?.remove(); return; }
      if(mevcut)return;

      const mapEl:any=container;
      // Leaflet map instance is referenced by event targets; use zoom control click event fallback.
      const zoomBtn=container.querySelector<HTMLElement>(".leaflet-control-zoom-in");
      let map:any=null;
      if(zoomBtn){
        const events=(zoomBtn as any)._leaflet_events;
        if(events) for(const k of Object.keys(events)){ const ctx=events[k]?.[0]?.ctx; if(ctx?._container===container){map=ctx;break;} }
      }
      if(!map)return;
      sonHarita=map;
      etiketKatmani=window.L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,pane:"overlayPane",opacity:1,attribution:"Labels © Esri"});
      etiketKatmani.addTo(map);
      const pane=etiketKatmani.getPane?.();
      if(pane){pane.dataset.uyduEtiketPane="1";pane.style.pointerEvents="none";}
    };

    const o=new MutationObserver(()=>setTimeout(uygula,30));
    o.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["src"]});
    const t=window.setInterval(uygula,800);
    uygula();
    return()=>{o.disconnect();window.clearInterval(t);try{if(etiketKatmani&&sonHarita)sonHarita.removeLayer(etiketKatmani);}catch{}};
  },[]);
  return null;
}
