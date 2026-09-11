"use client";

import {useEffect} from "react";

export default function OtpViewerLayoutFix(){
  useEffect(()=>{
    const fix=()=>{
      const buttons=[...document.querySelectorAll<HTMLButtonElement>("button")];
      const floating=buttons.find(b=>(b.textContent||"").includes("E-posta Kodu ile Görüntüle")&&b.className.includes("fixed"));
      if(floating)floating.style.display="none";

      const guest=buttons.find(b=>(b.textContent||"").includes("Misafir Olarak Görüntüle"));
      if(!guest)return;
      guest.style.display="none";
      guest.setAttribute("aria-hidden","true");

      if(document.getElementById("otpViewerInlineTrafo"))return;
      const btn=document.createElement("button");
      btn.id="otpViewerInlineTrafo";
      btn.type="button";
      btn.textContent="✉ E-posta Kodu ile Görüntüle";
      btn.className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5 text-sm font-black text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-100";
      btn.onclick=()=>{
        const target=[...document.querySelectorAll<HTMLButtonElement>("button")].find(b=>(b.textContent||"").includes("E-posta Kodu ile Görüntüle")&&b!==btn);
        target?.click();
      };
      guest.insertAdjacentElement("afterend",btn);
    };
    fix();
    const obs=new MutationObserver(fix);
    obs.observe(document.body,{childList:true,subtree:true});
    return()=>obs.disconnect();
  },[]);
  return null;
}
