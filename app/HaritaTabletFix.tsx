"use client";

import { useEffect } from "react";

export default function HaritaTabletFix(){
  useEffect(()=>{
    const id="trafo-tablet-history-fix";
    if(!document.getElementById(id)){
      const s=document.createElement("style");
      s.id=id;
      s.textContent=`
        @media (min-width:640px) and (max-width:1199px){
          [data-trafo-gecmis-modal="1"]{padding:16px!important;align-items:center!important;justify-content:center!important}
          [data-trafo-gecmis-panel="1"]{height:auto!important;max-height:calc(100dvh - 100px)!important;width:min(92vw,900px)!important;border-radius:18px!important;overflow:hidden!important}
          [data-trafo-gecmis-header="1"]{position:relative!important;z-index:20!important;background:#fff!important;padding-right:70px!important}
          [data-trafo-gecmis-kapat="1"]{position:absolute!important;top:12px!important;right:12px!important;z-index:9999!important;width:48px!important;height:48px!important;background:#fee2e2!important;color:#dc2626!important;border:2px solid #fecaca!important;border-radius:14px!important;font-size:28px!important;display:flex!important;align-items:center!important;justify-content:center!important}
          [data-trafo-gecmis-scroll="1"]{max-height:calc(100dvh - 210px)!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior:contain!important}
        }
      `;
      document.head.appendChild(s);
    }

    const duzenle=()=>{
      const baslik=Array.from(document.querySelectorAll<HTMLElement>("div")).find(x=>(x.textContent||"").trim()==="Trafo Değişim Geçmişi");
      if(!baslik)return;
      const header=baslik.parentElement?.parentElement as HTMLElement|null;
      const panel=header?.parentElement as HTMLElement|null;
      const modal=panel?.parentElement as HTMLElement|null;
      if(!header||!panel||!modal)return;
      modal.dataset.trafoGecmisModal="1";
      panel.dataset.trafoGecmisPanel="1";
      header.dataset.trafoGecmisHeader="1";
      const kapat=Array.from(header.querySelectorAll<HTMLButtonElement>("button")).find(b=>(b.textContent||"").trim()==="×");
      if(kapat)kapat.dataset.trafoGecmisKapat="1";
      const scroll=Array.from(panel.children).find(x=>x!==header) as HTMLElement|undefined;
      if(scroll)scroll.dataset.trafoGecmisScroll="1";
    };
    const tik=()=>window.setTimeout(duzenle,80);
    document.addEventListener("click",tik,{passive:true});
    window.addEventListener("trafo-harita-gecmis-ac",tik as EventListener);
    return()=>{document.removeEventListener("click",tik);window.removeEventListener("trafo-harita-gecmis-ac",tik as EventListener);};
  },[]);
  return null;
}
