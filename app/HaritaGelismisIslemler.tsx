"use client";

import { useEffect, useMemo } from "react";
import { getSupabaseBrowserClient } from "./supabaseClient";

const norm=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ı/g,"i").toLocaleLowerCase("tr-TR").replace(/\s+/g," ").trim();
const bekle=(ms:number)=>new Promise<void>(r=>window.setTimeout(r,ms));
const alan=(metin:string,ad:string)=>{const re=new RegExp(`(?:^|\\n)${ad.replace(/[.*+?^${}()|[\\]\\]/g,"\\$&")}:\\s*([^\\n]+)`,`i`);const v=metin.match(re)?.[1]?.trim()||"";return v==="—"?"":v;};
function alanInput(baslik:string,scope:ParentNode=document){const hedef=norm(baslik.replace(/\*/g,""));const spans=Array.from(scope.querySelectorAll<HTMLSpanElement>("span"));const s=spans.find(x=>norm((x.textContent||"").replace(/\*/g,""))===hedef);return (s?.parentElement?.querySelector("input,textarea")||null) as HTMLInputElement|HTMLTextAreaElement|null;}
function nativeDeger(el:HTMLInputElement|HTMLTextAreaElement,v:string){const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,"value")?.set?.call(el,v);el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));}
async function metinDoldur(baslik:string,v:string,scope:ParentNode=document){if(!v)return;const el=alanInput(baslik,scope);if(!el)return;el.focus();nativeDeger(el,v);el.blur();await bekle(60);}
async function comboDoldur(baslik:string,v:string,scope:ParentNode=document){if(!v)return;const el=alanInput(baslik,scope) as HTMLInputElement|null;if(!el)return;el.focus();await bekle(50);nativeDeger(el,v);await bekle(120);const hedef=norm(v);const sec=Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(x=>{const t=norm(x.textContent||"");return t===hedef||t.startsWith(`${hedef} `);});if(sec){sec.click();await bekle(100);return;}el.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",code:"Enter",bubbles:true,cancelable:true}));await bekle(100);}
function bolumBul(baslik:string){const h=Array.from(document.querySelectorAll<HTMLElement>("h2")).find(x=>norm(x.textContent||"")===norm(baslik));return h?.closest("div.rounded-2xl")||h?.parentElement?.parentElement?.parentElement||document;}

type HaritaRolu="admin"|"editor"|"viewer";

export default function HaritaGelismisIslemler(){
 const supabase=useMemo(getSupabaseBrowserClient,[]);
 useEffect(()=>{
  let uyduSecildi=false,fsHandler:(()=>void)|null=null,kurTimer:number|undefined,popupTimer:number|undefined,konumMarker:any=null,konumDaire:any=null;
  let kullaniciRolu:HaritaRolu="viewer",rolHazir=false;
  const duzenleyebilir=()=>rolHazir&&(kullaniciRolu==="admin"||kullaniciRolu==="editor");
  const gecmisYetkisiniUygula=()=>{
   const izin=duzenleyebilir();
   document.querySelectorAll<HTMLElement>('[data-trafo-gecmis-modal="1"]').forEach(modal=>{
    modal.querySelectorAll<HTMLButtonElement>("button").forEach(b=>{
     const t=norm(b.textContent||"");
     if(t.includes("duzenle")||t.includes("degisiklikleri kaydet")){b.hidden=!izin;b.disabled=!izin;b.setAttribute("aria-hidden",izin?"false":"true");}
    });
    const mevcut=modal.querySelector<HTMLElement>('[data-harita-viewer-note="1"]');
    if(rolHazir&&!izin&&!mevcut){
     const header=modal.querySelector<HTMLElement>('[data-trafo-gecmis-header="1"]');
     const note=document.createElement("div");note.dataset.haritaViewerNote="1";note.textContent="👁 Görüntüleyici modu · Trafo geçmişi salt okunur";note.style.cssText="margin:0 12px 8px;padding:8px 10px;border-radius:10px;background:#eef2ff;color:#4338ca;font-size:11px;font-weight:800";header?.insertAdjacentElement("afterend",note);
    }else if(izin&&mevcut)mevcut.remove();
   });
   document.querySelectorAll<HTMLButtonElement>('button[data-harita-yeni="1"]').forEach(b=>{if(izin){b.hidden=false;b.disabled=false;}else{b.remove();}});
  };
  const yetkiGetir=async()=>{
   kullaniciRolu="viewer";rolHazir=false;gecmisYetkisiniUygula();
   if(!supabase)return;
   try{
    const {data:{session}}=await supabase.auth.getSession();
    const uid=session?.user?.id;
    if(uid){const {data}=await supabase.from("app_users").select("role").eq("id",uid).maybeSingle();const r=String(data?.role||"");if(r==="admin"||r==="editor"||r==="viewer")kullaniciRolu=r as HaritaRolu;}
   }catch{}
   finally{rolHazir=true;gecmisYetkisiniUygula();popupButonlari();}
  };
  const yetkiTikla=(e:MouseEvent)=>{
   const b=(e.target as HTMLElement|null)?.closest("button") as HTMLButtonElement|null;if(!b)return;
   const t=norm(b.textContent||""),gecmis=!!b.closest('[data-trafo-gecmis-modal="1"]');
   const hassas=b.dataset.haritaYeni==="1"||(gecmis&&(t.includes("duzenle")||t.includes("degisiklikleri kaydet")));
   if(hassas&&!duzenleyebilir()){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(rolHazir)alert("Bu hesap Görüntüleyici rolünde. Harita ve trafo geçmişi salt okunurdur.");}
  };
  const uyduyuAc=()=>{if(uyduSecildi)return true;const b=Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(x=>norm(x.textContent||"").includes("uydu gorunumu"));if(b){uyduSecildi=true;b.click();return true;}return false;};
  const popupButonlari=()=>{document.querySelectorAll<HTMLElement>(".leaflet-popup-content").forEach(p=>{const txt=p.innerText||"",lok=alan(txt,"Lokasyon ID");if(!lok)return;if(!p.querySelector('[data-harita-yol="1"]')){const b=document.createElement("button");b.type="button";b.dataset.haritaYol="1";b.textContent="🧭 Yol Tarifi";b.style.cssText="width:100%;margin-top:8px;padding:9px 12px;border:0;border-radius:10px;background:#16a34a;color:#fff;font-size:12px;font-weight:800;cursor:pointer";b.onclick=()=>{const q=[alan(txt,"TR / Trafo Bölge Adı"),alan(txt,"Mahalle"),alan(txt,"İlçe")].filter(Boolean).join(" ")||lok;window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`,"_blank","noopener,noreferrer");};p.appendChild(b);}const eskiYeni=p.querySelector<HTMLButtonElement>('[data-harita-yeni="1"]');if(!duzenleyebilir()){eskiYeni?.remove();return;}if(!eskiYeni){const baslik=(txt.split("\n")[0]||"").replace(/^⚡\s*/,"").trim();const detay={lokasyonId:lok,trafoId:alan(txt,"Trafo ID"),ilce:alan(txt,"İlçe"),mahalle:alan(txt,"Mahalle"),tr:baslik,trafoTipi:/bina/i.test(alan(txt,"Montaj Tipi"))?"BİNA":/direk/i.test(alan(txt,"Montaj Tipi"))?"DİREK":""};const b=document.createElement("button");b.type="button";b.dataset.haritaYeni="1";b.textContent="➕ Değişim Kaydı Oluştur";b.style.cssText="width:100%;margin-top:8px;padding:9px 12px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-size:12px;font-weight:800;cursor:pointer";b.onclick=()=>window.dispatchEvent(new CustomEvent("trafo-harita-yeni-kayit",{detail:detay}));p.appendChild(b);}});gecmisYetkisiniUygula();};
  const kur=()=>{const harita=document.querySelector<HTMLElement>(".leaflet-container");if(!harita)return false;harita.style.position="relative";uyduyuAc();if(!harita.querySelector('[data-harita-full="1"]')){const b=document.createElement("button");b.type="button";b.dataset.haritaFull="1";b.textContent="⛶ Tam Ekran";b.style.cssText="position:absolute;right:12px;top:12px;z-index:10000;background:#0f172a;color:#fff;border:2px solid #fff;border-radius:10px;padding:8px 11px;font-size:11px;font-weight:900;box-shadow:0 4px 14px rgba(15,23,42,.25);cursor:pointer";const duzenle=()=>{const tam=document.fullscreenElement===harita;b.textContent=tam?"✕ Tam Ekrandan Çık":"⛶ Tam Ekran";if(tam){harita.style.width="100vw";harita.style.height="100vh";harita.style.minHeight="100vh";harita.style.maxHeight="100vh";harita.style.margin="0";harita.style.borderRadius="0";document.documentElement.style.overflow="hidden";document.body.style.overflow="hidden";}else{harita.style.width="";harita.style.height="";harita.style.minHeight="";harita.style.maxHeight="";harita.style.margin="";harita.style.borderRadius="";document.documentElement.style.overflow="";document.body.style.overflow="";}window.setTimeout(()=>window.dispatchEvent(new Event("resize")),150);};b.onclick=async()=>{try{if(document.fullscreenElement===harita)await document.exitFullscreen();else await harita.requestFullscreen();}catch{}};fsHandler=duzenle;document.addEventListener("fullscreenchange",duzenle);harita.appendChild(b);}
   if(!harita.querySelector('[data-harita-konum="1"]')){const b=document.createElement("button");b.type="button";b.dataset.haritaKonum="1";b.textContent="📍 Konumum";b.style.cssText="position:absolute;right:12px;top:54px;z-index:10000;background:#fff;color:#0f172a;border:2px solid #cbd5e1;border-radius:10px;padding:8px 11px;font-size:11px;font-weight:900;box-shadow:0 4px 14px rgba(15,23,42,.15);cursor:pointer";b.onclick=()=>{if(!navigator.geolocation){b.textContent="Konum desteklenmiyor";return;}b.textContent="📍 Konum alınıyor...";navigator.geolocation.getCurrentPosition(pos=>{const L=(window as any).L;let map:any=null;for(const k of Object.keys(harita as any)){const v=(harita as any)[k];if(v?.setView&&v?.addLayer){map=v;break;}}if(!map&&L){const id=(harita as any)._leaflet_id;map=(L as any)._instances?.[id];}if(!map||!L){b.textContent="📍 Konumum";return;}const lat=pos.coords.latitude,lng=pos.coords.longitude;if(konumMarker)map.removeLayer(konumMarker);if(konumDaire)map.removeLayer(konumDaire);konumDaire=L.circle([lat,lng],{radius:Math.max(pos.coords.accuracy,20),color:"#2563eb",weight:1,fillOpacity:.1}).addTo(map);konumMarker=L.circleMarker([lat,lng],{radius:8,color:"#fff",weight:3,fillColor:"#2563eb",fillOpacity:1}).addTo(map).bindPopup(`<b>📍 Konumum</b><br><span style="font-size:11px">Doğruluk: yaklaşık ${Math.round(pos.coords.accuracy)} m</span>`);map.setView([lat,lng],17);konumMarker.openPopup();b.textContent="📍 Konumum";},()=>{b.textContent="⚠ Konum alınamadı";window.setTimeout(()=>b.textContent="📍 Konumum",2200);},{enableHighAccuracy:true,timeout:10000,maximumAge:30000});};harita.appendChild(b);}return true;};
  const yeni=async(e:Event)=>{if(!duzenleyebilir()){if(rolHazir)alert("Bu hesap Görüntüleyici rolünde. Yeni değişim kaydı oluşturamaz.");return;}const d=(e as CustomEvent).detail||{};if(!d.lokasyonId)return;const b=Array.from(document.querySelectorAll<HTMLButtonElement>("nav button")).find(x=>norm(x.textContent||"").includes("yeni kayit"));if(!b)return;b.click();for(let i=0;i<30&&!Array.from(document.querySelectorAll("h1")).some(x=>norm(x.textContent||"").includes("yeni trafo degisim kaydi"));i++)await bekle(100);const konum=bolumBul("Konum Bilgileri");await comboDoldur("İlçe",d.ilce||"",konum);await comboDoldur("Mahalle",d.mahalle||"",konum);await metinDoldur("TR / Trafo Bölge Adı",d.tr||"",konum);await metinDoldur("Lokasyon ID",String(d.lokasyonId||""),konum);await metinDoldur("Trafo ID",String(d.trafoId||""),konum);await comboDoldur("Trafo Tipi",d.trafoTipi||"",konum);window.scrollTo({top:0,behavior:"smooth"});};
  const tik=()=>{if(popupTimer)window.clearTimeout(popupTimer);popupTimer=window.setTimeout(()=>{popupButonlari();gecmisYetkisiniUygula();},120);};
  const observer=new MutationObserver(()=>{if(popupTimer)window.clearTimeout(popupTimer);popupTimer=window.setTimeout(()=>{gecmisYetkisiniUygula();popupButonlari();},60);});observer.observe(document.body,{childList:true,subtree:true});
  void yetkiGetir();const authChange=supabase?.auth.onAuthStateChange(()=>{void yetkiGetir();});
  window.addEventListener("trafo-harita-yeni-kayit",yeni);document.addEventListener("click",yetkiTikla,true);document.addEventListener("click",tik,{passive:true});
  let deneme=0;if(!kur())kurTimer=window.setInterval(()=>{deneme++;if(kur()||deneme>30){if(kurTimer)window.clearInterval(kurTimer);}},300);
  return()=>{observer.disconnect();authChange?.data.subscription.unsubscribe();if(kurTimer)window.clearInterval(kurTimer);if(popupTimer)window.clearTimeout(popupTimer);window.removeEventListener("trafo-harita-yeni-kayit",yeni);document.removeEventListener("click",yetkiTikla,true);document.removeEventListener("click",tik);if(fsHandler)document.removeEventListener("fullscreenchange",fsHandler);document.documentElement.style.overflow="";document.body.style.overflow="";};
 },[supabase]);return null;
}