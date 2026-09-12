"use client";
import { useEffect } from "react";
export default function YillikYatayGrafik(){
 useEffect(()=>{
  const run=()=>{
   const title=[...document.querySelectorAll("h2")].find(x=>x.textContent?.trim()==="Yıllara Göre Değişim Nedenleri");
   const panel=title?.closest("section") as HTMLElement|null;if(!panel||panel.dataset.yatay==="1")return;
   const scroller=panel.querySelector(".overflow-x-auto") as HTMLElement|null;
   const chart=scroller?.firstElementChild as HTMLElement|null;const plot=chart?.firstElementChild as HTMLElement|null;
   const groups=plot?.querySelector(":scope > div.absolute.inset-0") as HTMLElement|null;if(!scroller||!chart||!plot||!groups)return;
   panel.dataset.yatay="1";scroller.style.overflowX="auto";chart.style.cssText="width:100%;min-width:720px";plot.style.cssText="height:auto;min-height:430px;padding:8px 0 16px";
   const grid=plot.querySelector(":scope > div.pointer-events-none") as HTMLElement|null;if(grid)grid.style.display="none";
   groups.style.cssText="position:relative;inset:auto;display:flex;flex-direction:column;align-items:stretch;gap:9px;padding:0 54px 0 62px;width:100%";
   const rows=[...groups.children] as HTMLElement[];
   rows.sort((a,b)=>Number(b.lastElementChild?.textContent||0)-Number(a.lastElementChild?.textContent||0)).forEach(row=>{
    groups.appendChild(row);const total=row.children[0] as HTMLElement;const bars=row.children[1] as HTMLElement;const label=row.children[2] as HTMLElement;if(!total||!bars||!label)return;
    row.style.cssText="position:relative;display:grid;grid-template-columns:1fr;min-width:0;width:100%;height:31px;flex:none;align-items:center";
    label.style.cssText="position:absolute;left:-58px;top:50%;transform:translateY(-50%);width:48px;margin:0;padding:0;border:0;text-align:right;font-size:11px;font-weight:900;color:#334155";
    total.style.cssText="position:absolute;left:calc(100% + 8px);top:50%;transform:translateY(-50%);margin:0;padding:0;background:transparent;font-size:11px;font-weight:900;color:#0f172a;white-space:nowrap";
    bars.style.cssText="height:25px;width:100%;display:flex;align-items:stretch;justify-content:flex-start;gap:0;border-radius:7px;overflow:hidden;background:#f1f5f9";
    [...bars.children].forEach(bar=>{const el=bar as HTMLElement;const title=el.getAttribute("title")||"";const m=title.match(/:\s*(\d+)/);const value=m?Number(m[1]):0;const old=parseFloat(el.style.height||"0");el.style.cssText=`height:100%;width:${old?Math.max(3,old):0}px;min-width:0;border-radius:0;position:relative;display:flex;align-items:center;justify-content:center;background-color:${el.style.backgroundColor}`;if(value>0&&old>=18){const s=document.createElement("span");s.textContent=String(value);s.style.cssText="pointer-events:none;color:white;font-size:9px;font-weight:900;line-height:1;text-shadow:0 1px 2px rgba(15,23,42,.35)";el.appendChild(s)}});
   });
  };run();const o=new MutationObserver(()=>{if(!document.querySelector('[data-yatay="1"]'))run()});o.observe(document.body,{childList:true,subtree:true});return()=>o.disconnect();
 },[]);return null;
}
