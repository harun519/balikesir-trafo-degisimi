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
          [data-trafo-gecmis-modal="1"]{padding:18px!important;align-items:center!important}
          [data-trafo-gecmis-panel="1"]{height:auto!important;max-height:calc(100dvh - 110px)!important;width:min(94vw,980px)!important;border-radius:18px!important}
          [data-trafo-gecmis-header="1"]{position:sticky!important;top:0!important;z-index:20!important;background:#fff!important}
          [data-trafo-gecmis-kapat="1"]{position:sticky!important;top:0!important;right:0!important;z-index:30!important;width:48px!important;height:48px!important;background:#fee2e2!important;color:#dc2626!important;border:2px solid #fecaca!important}
          [data-trafo-gecmis-scroll="1"]{max-height:calc(100dvh - 205px)!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch!important}
        }
      `;
      document.head.appendChild(s);
    }

    // Harita ilk kez açıldıktan sonra tarayıcı oturumu boyunca sıcak tutulduğunu işaretle.
    // TrafoHarita'nın IndexedDB önbelleği ikinci açılışta merkezi ZIP indirmeden yerel kopyayı kullanabilir.
    const ac=()=>sessionStorage.setItem("trafo-harita-sicak","1");
    window.addEventListener("trafo-harita-ac",ac);
    return()=>window.removeEventListener("trafo-harita-ac",ac);
  },[]);
  return null;
}
