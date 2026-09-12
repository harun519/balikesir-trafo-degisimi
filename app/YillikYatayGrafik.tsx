"use client";

import { useEffect } from "react";

export default function YillikYatayGrafik(){
  useEffect(()=>{
    const enhance=()=>{
      const headings=[...document.querySelectorAll("h2")];
      const heading=headings.find(h=>h.textContent?.trim()==="Yıllara Göre Değişim Nedenleri");
      const panel=heading?.closest("section") as HTMLElement|null;
      if(!panel||panel.dataset.yatayGrafik==="1") return;
      const scroller=panel.querySelector(".overflow-x-auto") as HTMLElement|null;
      const chart=scroller?.firstElementChild as HTMLElement|null;
      const plot=chart?.firstElementChild as HTMLElement|null;
      const groups=plot?.querySelector(":scope > div.absolute.inset-0") as HTMLElement|null;
      if(!scroller||!chart||!plot||!groups) return;
      panel.dataset.yatayGrafik="1";
      scroller.classList.add("yillik-yatay-scroller");
      chart.classList.add("yillik-yatay-chart");
      plot.classList.add("yillik-yatay-plot");
      groups.classList.add("yillik-yatay-groups");
      const years=[...groups.children] as HTMLElement[];
      years.sort((a,b)=>{
        const ya=Number(a.lastElementChild?.textContent||0), yb=Number(b.lastElementChild?.textContent||0);
        return yb-ya;
      }).forEach(row=>{
        groups.appendChild(row);
        row.classList.add("yillik-yatay-row");
        const total=row.children[0] as HTMLElement|null;
        const bars=row.children[1] as HTMLElement|null;
        const label=row.children[2] as HTMLElement|null;
        if(!total||!bars||!label) return;
        total.classList.add("yillik-yatay-total");
        bars.classList.add("yillik-yatay-bars");
        label.classList.add("yillik-yatay-label");
        [...bars.children].forEach(bar=>{
          const el=bar as HTMLElement;
          const oldHeight=parseFloat(el.style.height||"0");
          const title=el.getAttribute("title")||"";
          const match=title.match(/:\s*(\d+)/);
          const value=match?Number(match[1]):0;
          el.dataset.value=String(value);
          el.style.height="100%";
          el.style.width=oldHeight?`${Math.max(3,oldHeight)}px`:"0px";
          el.classList.add("yillik-yatay-segment");
          if(value>0){
            const span=document.createElement("span");
            span.className="yillik-yatay-value";
            span.textContent=String(value);
            el.appendChild(span);
          }
        });
      });
    };
    enhance();
    const obs=new MutationObserver(()=>{ if(!document.querySelector('[data-yatay-grafik="1"]')) enhance(); });
    obs.observe(document.body,{childList:true,subtree:true});
    return()=>obs.disconnect();
  },[]);
  return null;
}
