"use client";

import { useEffect, useMemo, useRef, useState } from "react";

declare global { interface Window { L?: any; } }

type GeoFeature={type:string;geometry:any;properties:Record<string,any>};
type GeoJSON={type:string;features:GeoFeature[]};

const ILCE_LISTESI=["Altıeylül","Karesi","Balya","Bigadiç","Dursunbey","İvrindi","Kepsut","Savaştepe","Sındırgı","Susurluk"];

async function fetchGzipJson(stem:string,hata:string){
  const counts:Record<string,number>={"trafo-noktalari":4,"trafo-binalari":5};
  const count=counts[stem];
  if(!count) throw new Error(hata);
  const parts=await Promise.all(Array.from({length:count},(_,i)=>fetch(`/mapdata/${stem}/part${String(i).padStart(2,"0")}.txt`).then(r=>{if(!r.ok)throw new Error(hata);return r.text();})));
  const bin=atob(parts.join(""));
  const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  if(typeof DecompressionStream==="undefined") throw new Error("Tarayıcınız harita verisini açmayı desteklemiyor. Tarayıcıyı güncelleyin.");
  const ds=new DecompressionStream("gzip");
  const stream=new Blob([bytes]).stream().pipeThrough(ds);
  return JSON.parse(await new Response(stream).text());
}

const escapeHtml=(v:any)=>String(v??"—").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]||c));

export default function TrafoHarita(){
  const mapEl=useRef<HTMLDivElement|null>(null);
  const mapRef=useRef<any>(null);
  const pointLayerRef=useRef<any>(null);
  const buildingLayerRef=useRef<any>(null);
  const pointDataRef=useRef<GeoJSON|null>(null);
  const buildingDataRef=useRef<GeoJSON|null>(null);
  const [hazir,setHazir]=useState(false);
  const [hata,setHata]=useState("");
  const [ilce,setIlce]=useState("");
  const [arama,setArama]=useState("");
  const [noktaAcik,setNoktaAcik]=useState(true);
  const [binaAcik,setBinaAcik]=useState(true);
  const [noktaSayisi,setNoktaSayisi]=useState(0);
  const [binaSayisi,setBinaSayisi]=useState(0);

  useEffect(()=>{
    let kapandi=false;
    const cssId="leaflet-css-trafo";
    if(!document.getElementById(cssId)){
      const link=document.createElement("link"); link.id=cssId; link.rel="stylesheet"; link.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(link);
    }
    const baslat=async()=>{
      if(!window.L){
        await new Promise<void>((resolve,reject)=>{
          const mevcut=document.getElementById("leaflet-js-trafo") as HTMLScriptElement|null;
          if(mevcut){ mevcut.addEventListener("load",()=>resolve(),{once:true}); mevcut.addEventListener("error",()=>reject(new Error("Leaflet yüklenemedi")),{once:true}); return; }
          const s=document.createElement("script"); s.id="leaflet-js-trafo"; s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; s.onload=()=>resolve(); s.onerror=()=>reject(new Error("Leaflet yüklenemedi")); document.body.appendChild(s);
        });
      }
      const [p,b]=await Promise.all([
        fetchGzipJson("trafo-noktalari","Trafo noktaları okunamadı"),
        fetchGzipJson("trafo-binalari","Trafo binaları okunamadı"),
      ]);
      if(kapandi||!mapEl.current)return;
      pointDataRef.current=p; buildingDataRef.current=b;
      const L=window.L;
      const map=L.map(mapEl.current,{zoomControl:true,preferCanvas:true}).setView([39.65,27.9],9);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:20,attribution:'&copy; OpenStreetMap'}).addTo(map);
      mapRef.current=map; setHazir(true);
    };
    baslat().catch(e=>!kapandi&&setHata(e?.message||"Harita yüklenemedi"));
    return()=>{kapandi=true; if(mapRef.current){mapRef.current.remove(); mapRef.current=null;}};
  },[]);

  useEffect(()=>{
    if(!hazir||!mapRef.current||!window.L||!pointDataRef.current||!buildingDataRef.current)return;
    const L=window.L, map=mapRef.current;
    if(pointLayerRef.current){map.removeLayer(pointLayerRef.current);pointLayerRef.current=null;}
    if(buildingLayerRef.current){map.removeLayer(buildingLayerRef.current);buildingLayerRef.current=null;}
    const q=arama.trim().toLocaleLowerCase("tr-TR");
    const uygun=(f:GeoFeature)=>{
      const p=f.properties||{};
      if(ilce&&p.ilce!==ilce)return false;
      if(!q)return true;
      return [p.adi,p.id,p.gis_id,p.lokasyon_id,p.kodu,p.mahalle,p.marka,p.seri_no].some(v=>String(v??"").toLocaleLowerCase("tr-TR").includes(q));
    };
    const points={type:"FeatureCollection",features:pointDataRef.current.features.filter(uygun)};
    const buildings={type:"FeatureCollection",features:buildingDataRef.current.features.filter(uygun)};
    setNoktaSayisi(points.features.length); setBinaSayisi(buildings.features.length);

    if(binaAcik){
      buildingLayerRef.current=L.geoJSON(buildings,{style:()=>({color:"#7c3aed",weight:1.5,fillColor:"#a78bfa",fillOpacity:.18}),onEachFeature:(f:any,l:any)=>{
        const p=f.properties||{}; l.bindPopup(`<div style="min-width:240px;font-family:Arial"><div style="font-weight:800;font-size:14px;margin-bottom:8px">🏢 ${escapeHtml(p.adi)}</div><div><b>İlçe:</b> ${escapeHtml(p.ilce)}</div><div><b>Mahalle:</b> ${escapeHtml(p.mahalle)}</div><div><b>Bina ID:</b> ${escapeHtml(p.id)}</div><div><b>Kodu:</b> ${escapeHtml(p.kodu)}</div><div><b>Tip:</b> ${escapeHtml(p.tipi)}</div><div><b>Alt tip:</b> ${escapeHtml(p.alttip)}</div><div><b>Gerilim:</b> ${escapeHtml(p.gerilim)}</div></div>`);
      }}).addTo(map);
    }
    if(noktaAcik){
      pointLayerRef.current=L.geoJSON(points,{pointToLayer:(_f:any,latlng:any)=>L.circleMarker(latlng,{radius:5,color:"#ea580c",weight:1.5,fillColor:"#f97316",fillOpacity:.82}),onEachFeature:(f:any,l:any)=>{
        const p=f.properties||{}; l.bindPopup(`<div style="min-width:250px;font-family:Arial"><div style="font-weight:800;font-size:14px;margin-bottom:8px">⚡ ${escapeHtml(p.adi)}</div><div><b>İlçe:</b> ${escapeHtml(p.ilce)}</div><div><b>Mahalle:</b> ${escapeHtml(p.mahalle)}</div><div><b>Trafo ID:</b> ${escapeHtml(p.id)}</div><div><b>Lokasyon ID:</b> ${escapeHtml(p.lokasyon_id)}</div><div><b>Güç:</b> ${escapeHtml(p.guc)} kVA</div><div><b>Primer:</b> ${escapeHtml(p.primer)} V</div><div><b>Marka:</b> ${escapeHtml(p.marka)}</div><div><b>Seri No:</b> ${escapeHtml(p.seri_no)}</div><div><b>İmal Yılı:</b> ${escapeHtml(p.imal_yili)}</div></div>`);
      }}).addTo(map);
    }
    const layers=[pointLayerRef.current,buildingLayerRef.current].filter(Boolean);
    if((ilce||q)&&layers.length){
      const group=L.featureGroup(layers); const bounds=group.getBounds(); if(bounds.isValid())map.fitBounds(bounds.pad(.08),{maxZoom:q?17:12});
    }
  },[hazir,ilce,arama,noktaAcik,binaAcik]);

  const toplam=useMemo(()=>noktaSayisi+binaSayisi,[noktaSayisi,binaSayisi]);
  return <div className="space-y-4">
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,.07)]">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
        <label className="block min-w-[210px]"><span className="mb-2 block text-sm font-semibold text-slate-600">İLÇE</span><select value={ilce} onChange={e=>setIlce(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500"><option value="">Tüm İlçeler</option>{ILCE_LISTESI.map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="block flex-1"><span className="mb-2 block text-sm font-semibold text-slate-600">TRAFO / ID / MAHALLE ARA</span><input value={arama} onChange={e=>setArama(e.target.value)} placeholder="Örn. TR-19, 16957, Paşa Alanı..." className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500"/></label>
        <button type="button" onClick={()=>{setIlce("");setArama("");if(mapRef.current)mapRef.current.setView([39.65,27.9],9);}} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-50">Filtreyi Temizle</button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <button onClick={()=>setNoktaAcik(v=>!v)} className={`rounded-xl border px-3 py-2 text-xs font-black ${noktaAcik?"border-orange-200 bg-orange-50 text-orange-700":"border-slate-200 bg-white text-slate-500"}`}>⚡ Trafo Noktaları ({noktaSayisi})</button>
        <button onClick={()=>setBinaAcik(v=>!v)} className={`rounded-xl border px-3 py-2 text-xs font-black ${binaAcik?"border-violet-200 bg-violet-50 text-violet-700":"border-slate-200 bg-white text-slate-500"}`}>🏢 Trafo Binaları ({binaSayisi})</button>
        <span className="ml-auto text-[11px] font-bold text-slate-400">Görünen toplam: {toplam}</span>
      </div>
    </div>
    {hata&&<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{hata}</div>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,.08)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><div className="text-sm font-black text-slate-800">🗺️ Balıkesir Trafo Envanter Haritası</div><div className="mt-0.5 text-[10px] text-slate-400">SHP envanterinden oluşturuldu • noktaya veya bina alanına tıklayın</div></div>{!hazir&&!hata&&<div className="text-xs font-bold text-blue-600">Harita yükleniyor...</div>}</div>
      <div ref={mapEl} className="h-[70vh] min-h-[520px] w-full" />
    </div>
  </div>;
}
