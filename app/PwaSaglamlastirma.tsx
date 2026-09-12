"use client";

import { useEffect } from "react";

export default function PwaSaglamlastirma(){
  useEffect(()=>{
    if(!("serviceWorker" in navigator)) return;
    let applyingUpdate=false;
    let registration:ServiceWorkerRegistration|null=null;
    let banner:HTMLDivElement|null=null;

    const removeBanner=()=>{banner?.remove();banner=null};
    const showUpdate=(worker:ServiceWorker)=>{
      if(banner||!navigator.serviceWorker.controller)return;
      banner=document.createElement("div");
      banner.id="trafo-pwa-update";
      banner.style.cssText="position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483000;width:min(92vw,430px);padding:11px 12px;border-radius:14px;background:#0f172a;color:#fff;box-shadow:0 12px 35px #0007;display:flex;align-items:center;gap:10px;font:600 12px Arial,sans-serif;border:1px solid #ffffff22";
      const text=document.createElement("span");
      text.textContent="Yeni sürüm hazır.";
      text.style.cssText="flex:1";
      const btn=document.createElement("button");
      btn.type="button";btn.textContent="Güncelle";
      btn.style.cssText="border:0;border-radius:10px;background:#2563eb;color:#fff;padding:9px 13px;font-weight:800;cursor:pointer";
      btn.onclick=()=>{
        applyingUpdate=true;
        try{sessionStorage.setItem("trafoResumeScroll",String(window.scrollY||0))}catch{}
        btn.textContent="Güncelleniyor…";btn.disabled=true;
        worker.postMessage({type:"SKIP_WAITING"});
      };
      banner.append(text,btn);document.body.appendChild(banner);
    };

    const watchRegistration=(reg:ServiceWorkerRegistration)=>{
      if(reg.waiting)showUpdate(reg.waiting);
      reg.addEventListener("updatefound",()=>{
        const w=reg.installing;if(!w)return;
        w.addEventListener("statechange",()=>{
          if(w.state==="installed"&&navigator.serviceWorker.controller)showUpdate(w);
        });
      });
    };

    const register=async()=>{
      try{
        registration=await navigator.serviceWorker.register("/sw.js",{scope:"/",updateViaCache:"none"});
        watchRegistration(registration);
        await registration.update();
      }catch(e){console.warn("PWA service worker kaydı başarısız",e)}
    };

    const resume=()=>{
      if(document.visibilityState!=="visible")return;
      registration?.update().catch(()=>{});
      window.dispatchEvent(new CustomEvent("trafo-app-resume"));
      try{
        const y=Number(sessionStorage.getItem("trafoResumeScroll")||"");
        if(Number.isFinite(y)&&y>0){requestAnimationFrame(()=>window.scrollTo({top:y}));sessionStorage.removeItem("trafoResumeScroll")}
      }catch{}
    };
    const visibility=()=>{if(document.visibilityState==="visible")resume()};
    const controllerChange=()=>{
      if(!applyingUpdate)return;
      removeBanner();
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange",controllerChange);
    window.addEventListener("online",resume);
    window.addEventListener("pageshow",resume);
    document.addEventListener("visibilitychange",visibility);
    register();

    return()=>{
      removeBanner();
      navigator.serviceWorker.removeEventListener("controllerchange",controllerChange);
      window.removeEventListener("online",resume);
      window.removeEventListener("pageshow",resume);
      document.removeEventListener("visibilitychange",visibility);
    };
  },[]);
  return null;
}
