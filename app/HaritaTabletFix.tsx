"use client";

import { useEffect } from "react";

function gecmisModaliniDuzelt(){
  const baslik=Array.from(document.querySelectorAll<HTMLElement>("div")).find(x=>(x.textContent||"").trim()==="Trafo Değişim Geçmişi");
  if(!baslik)return false;
  const header=baslik.parentElement?.parentElement as HTMLElement|null;
  const panel=header?.parentElement as HTMLElement|null;
  const modal=panel?.parentElement as HTMLElement|null;
  if(!header||!panel||!modal)return false;
  modal.dataset.trafoGecmisModal="1";
  panel.dataset.trafoGecmisPanel="1";
  header.dataset.trafoGecmisHeader="1";
  const kapat=Array.from(header.querySelectorAll<HTMLButtonElement>("button")).find(b=>(b.textContent||"").trim()==="×");
  if(kapat)kapat.dataset.trafoGecmisKapat="1";
  const scroll=Array.from(panel.children).find(x=>x!==header) as HTMLElement|undefined;
  if(scroll)scroll.dataset.trafoGecmisScroll="1";
  return true;
}

let resizeBekliyor=false;
function haritayiCanlandir(){
  if(resizeBekliyor)return;
  resizeBekliyor=true;
  requestAnimationFrame(()=>{
    window.dispatchEvent(new Event("resize"));
    window.setTimeout(()=>{resizeBekliyor=false;},180);
  });
}

export default function HaritaTabletFix(){
  useEffect(()=>{
    const cssId="trafo-tablet-history-fix-v3";
    if(!document.getElementById(cssId)){
      const s=document.createElement("style");
      s.id=cssId;
      s.textContent=`
        @media (min-width:640px) and (max-width:1199px){
          [data-trafo-gecmis-modal="1"]{padding:16px!important;align-items:center!important;justify-content:center!important;overflow:hidden!important}
          [data-trafo-gecmis-panel="1"]{height:calc(100dvh - 96px)!important;max-height:calc(100dvh - 96px)!important;width:min(94vw,980px)!important;border-radius:18px!important;overflow:hidden!important;position:relative!important}
          [data-trafo-gecmis-header="1"]{position:relative!important;z-index:20!important;background:#fff!important;padding-right:76px!important;flex-shrink:0!important}
          [data-trafo-gecmis-kapat="1"]{position:absolute!important;top:10px!important;right:10px!important;z-index:99999!important;width:50px!important;height:50px!important;min-width:50px!important;min-height:50px!important;background:#fee2e2!important;color:#dc2626!important;border:2px solid #fecaca!important;border-radius:14px!important;font-size:30px!important;display:flex!important;align-items:center!important;justify-content:center!important;touch-action:manipulation!important;cursor:pointer!important}
          [data-trafo-gecmis-scroll="1"]{min-height:0!important;max-height:none!important;flex:1 1 auto!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior:contain!important}
          .leaflet-map-pane,.leaflet-tile-pane,.leaflet-marker-pane{will-change:transform}
          .leaflet-marker-icon,.leaflet-marker-shadow{transition:none!important;animation:none!important}
          .leaflet-popup{will-change:auto!important}
        }
      `;
      document.head.appendChild(s);
    }

    let timer:number|undefined;
    const baslat=()=>{
      if(timer)window.clearInterval(timer);
      let deneme=0;
      if(gecmisModaliniDuzelt())return;
      timer=window.setInterval(()=>{
        deneme++;
        if(gecmisModaliniDuzelt()||deneme>=8){
          if(timer)window.clearInterval(timer);
          timer=undefined;
        }
      },160);
    };
    const click=(e:MouseEvent)=>{
      const el=e.target as HTMLElement|null;
      const t=el?.closest("button,a")?.textContent?.toLocaleLowerCase("tr")||"";
      if(t.includes("trafo haritası")||t.includes("harita"))haritayiCanlandir();
    };
    const resume=()=>haritayiCanlandir();
    const visibility=()=>{if(document.visibilityState==="visible")resume()};

    document.addEventListener("click",click,true);
    window.addEventListener("trafo-harita-gecmis-ac",baslat as EventListener);
    window.addEventListener("trafo-app-resume",resume as EventListener);
    window.addEventListener("pageshow",resume);
    document.addEventListener("visibilitychange",visibility);

    return()=>{
      document.removeEventListener("click",click,true);
      window.removeEventListener("trafo-harita-gecmis-ac",baslat as EventListener);
      window.removeEventListener("trafo-app-resume",resume as EventListener);
      window.removeEventListener("pageshow",resume);
      document.removeEventListener("visibilitychange",visibility);
      if(timer)window.clearInterval(timer);
    };
  },[]);
  return null;
}
