"use client";

import { useEffect } from "react";

export default function HaritaMenuSaglamlastirma(){
  useEffect(()=>{
    const ensure=()=>{
      const navs=Array.from(document.querySelectorAll("nav"));
      for(const nav of navs){
        if(nav.querySelector('[data-trafo-harita-menu="1"]')) continue;
        const buttons=Array.from(nav.querySelectorAll("button"));
        const target=buttons.find(b=>b.textContent?.includes("Trafo Kayıtları"));
        if(!target) continue;
        const button=document.createElement("button");
        button.type="button";
        button.dataset.trafoHaritaMenu="1";
        button.textContent="🗺️ Trafo Haritası";
        button.className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition text-slate-600 hover:bg-blue-50 hover:text-blue-700";
        button.onclick=()=>{
          window.dispatchEvent(new Event("trafo-harita-ac"));
          const aside=button.closest("aside");
          if(aside&&!window.matchMedia("(min-width: 1024px)").matches){
            const close=Array.from(aside.querySelectorAll("button")).find(x=>x.textContent?.trim()==="×");
            close?.click();
          }
          window.scrollTo({top:0,behavior:"smooth"});
        };
        target.insertAdjacentElement("afterend",button);
      }
    };
    ensure();
    const onChange=()=>{
      requestAnimationFrame(ensure);
      window.setTimeout(ensure,80);
    };
    document.addEventListener("click",onChange,true);
    window.addEventListener("focus",onChange);
    window.addEventListener("pageshow",onChange);
    document.addEventListener("visibilitychange",onChange);
    return()=>{
      document.removeEventListener("click",onChange,true);
      window.removeEventListener("focus",onChange);
      window.removeEventListener("pageshow",onChange);
      document.removeEventListener("visibilitychange",onChange);
    };
  },[]);
  return null;
}
