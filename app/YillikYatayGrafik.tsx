"use client";

import { useEffect } from "react";

type Satir={
  yil:number;
  toplam:number;
  bolumler:{deger:number;renk:string;buton:HTMLButtonElement}[];
};

export default function YillikYatayGrafik(){
  useEffect(()=>{
    let timer:number|undefined;
    let observer:MutationObserver|null=null;

    const bul=()=>{
      const baslik=[...document.querySelectorAll<HTMLHeadingElement>("h2")]
        .find(x=>x.textContent?.trim()==="Yıllara Göre Değişim Nedenleri");
      const panel=baslik?.closest("section") as HTMLElement|null;
      const scroller=panel?.querySelector(".overflow-x-auto") as HTMLElement|null;
      if(!panel||!scroller)return null;
      return {panel,scroller};
    };

    const oku=(scroller:HTMLElement):Satir[]=>{
      const tumDivler=[...scroller.querySelectorAll<HTMLElement>("div")];
      const groups=tumDivler.find(el=>
        el.classList.contains("absolute")&&
        el.classList.contains("inset-0")&&
        el.classList.contains("flex")&&
        el.classList.contains("items-end")
      );
      if(!groups)return [];

      const sonuc:Satir[]=[];
      [...groups.children].forEach(ch=>{
        const row=ch as HTMLElement;
        const children=[...row.children] as HTMLElement[];
        if(children.length<3)return;
        const toplam=Number((children[0].textContent||"").trim())||0;
        const bars=children[1];
        const yil=Number((children[2].textContent||"").trim());
        if(!yil)return;
        const bolumler=[...bars.querySelectorAll<HTMLButtonElement>("button")].map(b=>{
          const title=b.getAttribute("title")||"";
          const m=title.match(/:\s*(\d+)/);
          const deger=m?Number(m[1]):0;
          const renk=b.style.backgroundColor||getComputedStyle(b).backgroundColor||"#94a3b8";
          return {deger,renk,buton:b};
        }).filter(x=>x.deger>0);
        sonuc.push({yil,toplam,bolumler});
      });
      return sonuc.sort((a,b)=>b.yil-a.yil);
    };

    const ciz=()=>{
      const found=bul();
      if(!found)return;
      const {panel,scroller}=found;
      const satirlar=oku(scroller);
      if(!satirlar.length)return;

      let host=panel.querySelector<HTMLElement>("[data-yatay-native='1']");
      if(!host){
        host=document.createElement("div");
        host.dataset.yatayNative="1";
        host.style.cssText="margin-top:18px;width:100%;";
        scroller.parentElement?.insertBefore(host,scroller);
      }
      scroller.style.display="none";
      host.replaceChildren();

      const maxToplam=Math.max(1,...satirlar.map(x=>x.toplam));

      const wrap=document.createElement("div");
      wrap.style.cssText="display:flex;flex-direction:column;gap:10px;width:100%;padding:4px 2px 2px;";

      satirlar.forEach(item=>{
        const row=document.createElement("div");
        row.style.cssText="display:grid;grid-template-columns:48px minmax(0,1fr) 38px;align-items:center;gap:8px;min-height:30px;width:100%;";

        const label=document.createElement("div");
        label.textContent=String(item.yil);
        label.style.cssText="text-align:right;font-size:11px;font-weight:900;color:#475569;";

        const alan=document.createElement("div");
        alan.style.cssText="height:26px;border-radius:7px;background:#f1f5f9;overflow:hidden;position:relative;";

        const bar=document.createElement("div");
        const genislik=Math.max(item.toplam?4:0,(item.toplam/maxToplam)*100);
        bar.style.cssText=`height:100%;width:${genislik}%;display:flex;overflow:hidden;border-radius:7px;`;

        item.bolumler.forEach(seg=>{
          const btn=document.createElement("button");
          btn.type="button";
          btn.title=seg.buton.title;
          btn.style.cssText=`height:100%;width:${item.toplam?(seg.deger/item.toplam)*100:0}%;min-width:${seg.deger?2:0}px;border:0;padding:0;margin:0;background:${seg.renk};display:flex;align-items:center;justify-content:center;cursor:pointer;color:white;font-size:9px;font-weight:900;line-height:1;text-shadow:0 1px 2px rgba(15,23,42,.35);`;
          if((seg.deger/item.toplam)*genislik>5)btn.textContent=String(seg.deger);
          btn.onclick=()=>seg.buton.click();
          bar.appendChild(btn);
        });

        alan.appendChild(bar);

        const total=document.createElement("div");
        total.textContent=String(item.toplam);
        total.style.cssText="font-size:11px;font-weight:900;color:#0f172a;";

        row.append(label,alan,total);
        wrap.appendChild(row);
      });

      host.appendChild(wrap);
    };

    const planla=()=>{
      if(timer)window.clearTimeout(timer);
      timer=window.setTimeout(ciz,60);
    };

    ciz();
    observer=new MutationObserver(planla);
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    window.addEventListener("resize",planla);
    window.addEventListener("pageshow",planla);

    return()=>{
      observer?.disconnect();
      window.removeEventListener("resize",planla);
      window.removeEventListener("pageshow",planla);
      if(timer)window.clearTimeout(timer);
    };
  },[]);

  return null;
}
