"use client";

import { useEffect } from "react";

const DIRTY_KEY="trafo_harita_kayit_dirty";
const TARGET_KEY="trafo_harita_reload_target";

export default function HaritaKayitSenkron(){
  useEffect(()=>{
    let refreshTimers:number[]=[];

    const temizleTimer=()=>{
      refreshTimers.forEach(id=>window.clearTimeout(id));
      refreshTimers=[];
    };

    const haritayiYenile=(gecikmeler:number[]=[0,450])=>{
      temizleTimer();
      refreshTimers=gecikmeler.map(ms=>window.setTimeout(()=>{
        window.dispatchEvent(new Event("trafo-harita-veri-yenile"));
      },ms));
    };

    const onUpdated=()=>{
      try{sessionStorage.setItem(DIRTY_KEY,"1");}catch{}
      haritayiYenile([80,500,1400]);
    };

    // Harita her açıldığında değişim kayıtlarını yeniden çek.
    // Böylece haritadan yeni değişim girildikten sonra sayfayı F5 ile
    // yenilemeye gerek kalmadan işaret rengi / geçmiş bilgisi güncellenir.
    const onMapOpen=()=>{
      try{sessionStorage.removeItem(DIRTY_KEY);}catch{}
      haritayiYenile([80,500]);
    };

    // Ana kayıt formu kaydedildiğinde Supabase isteğinin tamamlanma süresini
    // de hesaba katarak birkaç kez hafif tazeleme tetikle.
    const onSubmit=(e:SubmitEvent)=>{
      const form=e.target as HTMLFormElement|null;
      if(!form)return;
      const metin=(form.innerText||"").toLocaleLowerCase("tr-TR");
      if(!metin.includes("değişim")&&!metin.includes("trafo"))return;
      try{sessionStorage.setItem(DIRTY_KEY,"1");}catch{}
      haritayiYenile([350,1000,2200]);
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
    window.addEventListener("trafo-harita-ac",onMapOpen as EventListener);
    document.addEventListener("submit",onSubmit as EventListener,true);
    document.addEventListener("click",onNav,true);
    reopen();
    return()=>{
      temizleTimer();
      window.removeEventListener("trafo-kayit-guncellendi",onUpdated as EventListener);
      window.removeEventListener("trafo-harita-ac",onMapOpen as EventListener);
      document.removeEventListener("submit",onSubmit as EventListener,true);
      document.removeEventListener("click",onNav,true);
    };
  },[]);
  return null;
}
