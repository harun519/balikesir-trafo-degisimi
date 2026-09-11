"use client";

import { useEffect } from "react";

declare global { interface Window { L?: any; } }

export default function HaritaUyduEtiketleri(){
  useEffect(()=>{
    let timer:number|undefined, deneme=0;

    // Tablet/telefon tarafında binlerce HTML marker sürükleme sırasında GPU'yu kilitliyordu.
    // Marker yapısına dokunmadan sadece hareket esnasında pahalı katmanları gizleyip hareket bitince geri getiriyoruz.
    if(!document.getElementById("trafo-tablet-perf-css")){
      const st=document.createElement("style");
      st.id="trafo-tablet-perf-css";
      st.textContent=`
        .leaflet-marker-pane{will-change:transform;transform:translateZ(0)}
        .leaflet-marker-icon{transition:none!important;animation:none!important}
        @media (hover:none), (pointer:coarse), (max-width:1200px){
          .leaflet-dragging .leaflet-marker-pane,
          .leaflet-zoom-anim .leaflet-marker-pane{visibility:hidden!important}
          .leaflet-dragging .leaflet-overlay-pane,
          .leaflet-zoom-anim .leaflet-overlay-pane{visibility:hidden!important}
          .leaflet-marker-icon>div{filter:none!important}
          .leaflet-marker-icon>div>div{box-shadow:none!important}
          .leaflet-container{touch-action:none}
        }
      `;
      document.head.appendChild(st);
    }

    const patch=()=>{
      const L=window.L;
      if(!L?.tileLayer || !L?.map)return false;

      if(!L.map.__tabletPerfPatch){
        const orjMap=L.map.bind(L);
        const patchedMap=((el:any, options:any={})=>orjMap(el,{
          ...options,
          preferCanvas: options?.preferCanvas ?? true,
          zoomAnimation: options?.zoomAnimation ?? false,
          fadeAnimation: options?.fadeAnimation ?? false,
          markerZoomAnimation: options?.markerZoomAnimation ?? false,
          inertia: options?.inertia ?? true,
          inertiaDeceleration: options?.inertiaDeceleration ?? 4200,
          inertiaMaxSpeed: options?.inertiaMaxSpeed ?? 900,
          worldCopyJump: options?.worldCopyJump ?? false,
        })) as any;
        patchedMap.__tabletPerfPatch=true;
        patchedMap.__orj=orjMap;
        L.map=patchedMap;
      }

      if(!L.tileLayer.__uyduEtiketPatch){
        const orj=L.tileLayer.bind(L);
        const patched=((url:string,options:any={})=>{
          const hafifOptions={updateWhenIdle:true,updateWhenZooming:false,keepBuffer:1,...options};
          if(typeof url==="string"&&url.includes("World_Imagery/MapServer/tile")){
            const uydu=orj(url,hafifOptions);
            const etiket=orj("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",{
              maxZoom:19,opacity:1,attribution:"Labels © Esri",pane:"overlayPane",updateWhenIdle:true,updateWhenZooming:false,keepBuffer:1
            });
            const grup=L.layerGroup([uydu,etiket]);
            grup.bringToBack=()=>{try{uydu.bringToBack?.();}catch{}return grup;};
            return grup;
          }
          return orj(url,hafifOptions);
        }) as any;
        patched.__uyduEtiketPatch=true;
        patched.__orj=orj;
        L.tileLayer=patched;
      }
      return true;
    };

    if(!patch())timer=window.setInterval(()=>{
      deneme++;
      if(patch()||deneme>30){if(timer)window.clearInterval(timer);}
    },150);

    return()=>{if(timer)window.clearInterval(timer);};
  },[]);
  return null;
}
