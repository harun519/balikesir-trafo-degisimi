"use client";

import { useEffect } from "react";

declare global { interface Window { L?: any; } }

export default function HaritaUyduEtiketleri(){
  useEffect(()=>{
    let timer:number|undefined, deneme=0;
    const patch=()=>{
      const L=window.L;
      if(!L?.tileLayer)return false;
      if(L.tileLayer.__uyduEtiketPatch)return true;
      const orj=L.tileLayer.bind(L);
      const patched=((url:string,options:any={})=>{
        if(typeof url==="string"&&url.includes("World_Imagery/MapServer/tile")){
          const uydu=orj(url,options);
          const etiket=orj("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,opacity:1,attribution:"Labels © Esri",pane:"overlayPane",updateWhenIdle:true,keepBuffer:1});
          const grup=L.layerGroup([uydu,etiket]);
          grup.bringToBack=()=>{try{uydu.bringToBack?.();}catch{}return grup;};
          return grup;
        }
        return orj(url,options);
      }) as any;
      patched.__uyduEtiketPatch=true;patched.__orj=orj;L.tileLayer=patched;return true;
    };
    if(!patch())timer=window.setInterval(()=>{deneme++;if(patch()||deneme>30){if(timer)window.clearInterval(timer);}},150);
    return()=>{if(timer)window.clearInterval(timer);};
  },[]);
  return null;
}
