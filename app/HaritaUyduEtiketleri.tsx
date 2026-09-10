"use client";

import { useEffect } from "react";

declare global { interface Window { L?: any; } }

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

    if(!patch()) timer=window.setInterval(()=>{if(patch()&&timer)window.clearInterval(timer);},100);
    return()=>{if(timer)window.clearInterval(timer);};
  },[]);
  return null;
}
