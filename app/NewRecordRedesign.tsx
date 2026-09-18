"use client";
import { useEffect } from "react";

export default function NewRecordRedesign(){
  useEffect(()=>{
    const mark=()=>{
      document.querySelectorAll("form").forEach(form=>{
        const t=form.textContent||"";
        if(t.includes("Yeni Trafo Değişim Kaydı")||t.includes("Trafo Kaydını Düzenle")) form.classList.add("trafo-new-record");
        else form.classList.remove("trafo-new-record");
      });
    };
    mark();
    const o=new MutationObserver(mark);o.observe(document.body,{subtree:true,childList:true});
    return()=>o.disconnect();
  },[]);
  return null;
}
