"use client";

import { useEffect } from "react";

export default function PwaSaglamlastirma(){
  useEffect(()=>{
    if(!("serviceWorker" in navigator)) return;
    let reloading=false;
    let registration:ServiceWorkerRegistration|null=null;

    const register=async()=>{
      try{
        registration=await navigator.serviceWorker.register("/sw.js",{scope:"/",updateViaCache:"none"});
        await registration.update();
      }catch(e){
        console.warn("PWA service worker kaydı başarısız",e);
      }
    };

    const check=()=>{
      if(document.visibilityState!=="visible") return;
      registration?.update().catch(()=>{});
    };

    const controllerChange=()=>{
      if(reloading) return;
      reloading=true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange",controllerChange);
    window.addEventListener("online",check);
    window.addEventListener("pageshow",check);
    document.addEventListener("visibilitychange",check);
    register();

    return()=>{
      navigator.serviceWorker.removeEventListener("controllerchange",controllerChange);
      window.removeEventListener("online",check);
      window.removeEventListener("pageshow",check);
      document.removeEventListener("visibilitychange",check);
    };
  },[]);

  return null;
}
