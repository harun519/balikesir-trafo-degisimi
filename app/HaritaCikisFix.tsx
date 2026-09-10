"use client";

import { useEffect } from "react";

export default function HaritaCikisFix(){
  useEffect(()=>{
    const onClick=(e:MouseEvent)=>{
      const el=(e.target as HTMLElement|null)?.closest("button,a") as HTMLElement|null;
      if(!el)return;
      const text=(el.textContent||"").trim();
      if(!text.includes("Çıkış Yap"))return;

      // Harita overlay'i açıksa önce uygulamanın normal sayfasına dön.
      const menuButtons=Array.from(document.querySelectorAll<HTMLButtonElement>("nav button"));
      const dashboard=menuButtons.find(b=>
        (b.textContent||"").includes("Kontrol Paneli") ||
        (b.textContent||"").includes("Dashboard")
      );
      dashboard?.click();
    };

    document.addEventListener("click",onClick,true);
    return()=>document.removeEventListener("click",onClick,true);
  },[]);

  return null;
}
