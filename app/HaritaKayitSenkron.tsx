"use client";

import { useEffect } from "react";

const DIRTY_KEY="trafo_harita_kayit_dirty";
const TARGET_KEY="trafo_harita_reload_target";

export default function HaritaKayitSenkron(){
  useEffect(()=>{
    const onUpdated=()=>{
      try{sessionStorage.setItem(DIRTY_KEY,"1");}catch{}
    };

    const onNav=(e:MouseEvent)=>{
      const b=(e.target as HTMLElement|null)?.closest("nav button") as HTMLButtonElement|null;
      if(!b||!b.textContent?.includes("Trafo Kayıtları"))return;
      let dirty=false;
      try{dirty=sessionStorage.getItem(DIRTY_KEY)==="1";}catch{}
      if(!dirty)return;
      e.preventDefault();
      e.stopImmediatePropagation();
      try{
        sessionStorage.removeItem(DIRTY_KEY);
        sessionStorage.setItem(TARGET_KEY,"kayitlar");
      }catch{}
      window.location.reload();
    };

    const reopen=()=>{
      let target="";
      try{target=sessionStorage.getItem(TARGET_KEY)||"";}catch{}
      if(target!=="kayitlar")return;
      let deneme=0;
      const id=window.setInterval(()=>{
        const b=Array.from(document.querySelectorAll<HTMLButtonElement>("nav button")).find(x=>x.textContent?.includes("Trafo Kayıtları"));
        if(b){
          window.clearInterval(id);
          try{sessionStorage.removeItem(TARGET_KEY);}catch{}
          b.click();
          window.scrollTo({top:0,behavior:"auto"});
          return;
        }
        deneme++;
        if(deneme>30)window.clearInterval(id);
      },150);
    };

    window.addEventListener("trafo-kayit-guncellendi",onUpdated as EventListener);
    document.addEventListener("click",onNav,true);
    reopen();
    return()=>{
      window.removeEventListener("trafo-kayit-guncellendi",onUpdated as EventListener);
      document.removeEventListener("click",onNav,true);
    };
  },[]);
  return null;
}
