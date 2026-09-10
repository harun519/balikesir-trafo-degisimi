"use client";

import { useEffect } from "react";

const norm=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("tr-TR");

export default function HaritaGelismisIslemler(){
 useEffect(()=>{
  const ekle=()=>{
   const harita=document.querySelector<HTMLElement>(".leaflet-container");
   if(!harita)return;
   const kart=harita.parentElement as HTMLElement|null;
   if(kart&&!kart.querySelector('[data-harita-full="1"]')){
    kart.style.position="relative";
    const b=document.createElement("button");b.type="button";b.dataset.haritaFull="1";b.textContent="⛶ Tam Ekran";b.style.cssText="position:absolute;right:12px;top:58px;z-index:800;background:#0f172a;color:#fff;border:2px solid #fff;border-radius:10px;padding:8px 11px;font-size:11px;font-weight:900;box-shadow:0 4px 14px rgba(15,23,42,.35);cursor:pointer";
    b.onclick=async()=>{try{if(!document.fullscreenElement){await kart.requestFullscreen();b.textContent="✕ Tam Ekrandan Çık";}else{await document.exitFullscreen();}}catch{}};
    document.addEventListener("fullscreenchange",()=>{b.textContent=document.fullscreenElement?"✕ Tam Ekrandan Çık":"⛶ Tam Ekran";setTimeout(()=>window.dispatchEvent(new Event("resize")),100);});kart.appendChild(b);
   }
   document.querySelectorAll<HTMLElement>(".leaflet-popup-content").forEach(p=>{
    const txt=p.innerText||"";const lok=txt.match(/Lokasyon ID:\s*([^\n]+)/)?.[1]?.trim()||"";if(!lok||lok==="—")return;
    if(!p.querySelector('[data-harita-yeni="1"]')){const b=document.createElement("button");b.type="button";b.dataset.haritaYeni="1";b.textContent="➕ Değişim Kaydı Oluştur";b.style.cssText="width:100%;margin-top:8px;padding:9px 12px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-size:12px;font-weight:800;cursor:pointer";b.onclick=()=>{window.dispatchEvent(new CustomEvent("trafo-harita-yeni-kayit",{detail:{lokasyonId:lok}}));};p.appendChild(b);}
   });
   const kartlar=Array.from(document.querySelectorAll<HTMLElement>("div")).filter(x=>norm(x.textContent||"").includes("tip uyumsuzlugu"));
   const k=kartlar.find(x=>x.children.length<8);
   if(k&&!k.dataset.uyumsuzKlik){k.dataset.uyumsuzKlik="1";k.style.cursor="pointer";k.title="Uyumsuz trafoları haritada göster";k.onclick=()=>{const inp=Array.from(document.querySelectorAll<HTMLInputElement>('input[placeholder*="Trafo"]'))[0];if(inp){const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;setter?.call(inp,"uyumsuz");inp.dispatchEvent(new Event("input",{bubbles:true}));}};}
  };
  const yeni=(e:Event)=>{const lok=(e as CustomEvent).detail?.lokasyonId;if(!lok)return;const nav=Array.from(document.querySelectorAll<HTMLButtonElement>("nav button"));const b=nav.find(x=>norm(x.textContent||"").includes("yeni")&&norm(x.textContent||"").includes("kay"));if(b){b.click();setTimeout(()=>{const inputs=Array.from(document.querySelectorAll<HTMLInputElement>("input"));const i=inputs.find(x=>norm(x.placeholder||"").includes("lokasyon")||norm(x.parentElement?.textContent||"").includes("lokasyon id"));if(i&&!i.value){const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;setter?.call(i,String(lok));i.dispatchEvent(new Event("input",{bubbles:true}));i.dispatchEvent(new Event("change",{bubbles:true}));}},300);}};
  window.addEventListener("trafo-harita-yeni-kayit",yeni);const o=new MutationObserver(ekle);o.observe(document.body,{childList:true,subtree:true});ekle();return()=>{o.disconnect();window.removeEventListener("trafo-harita-yeni-kayit",yeni);};
 },[]);return null;
}
