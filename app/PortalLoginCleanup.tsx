"use client";

import {useEffect} from "react";

export default function PortalLoginCleanup(){
  useEffect(()=>{
    const clean=()=>{
      document.querySelectorAll("button").forEach(btn=>{
        const text=(btn.textContent||"").trim().toLocaleLowerCase("tr-TR");
        if(text.includes("misafir girişi")||text.includes("görüntüleyici girişi")){
          const prev=btn.previousElementSibling;
          if(prev&&(prev.textContent||"").trim().toLocaleLowerCase("tr-TR")==="veya")prev.remove();
          btn.remove();
        }
      });
      document.getElementById("ortakKullaniciBtn")?.remove();
    };
    clean();
    const observer=new MutationObserver(clean);
    observer.observe(document.documentElement,{childList:true,subtree:true});
    window.addEventListener("trafo-open-viewer-otp",e=>{e.stopImmediatePropagation()},true);
    return()=>observer.disconnect();
  },[]);
  return null;
}
