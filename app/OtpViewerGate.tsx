"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function OtpViewerGate(){
  const supabase=useMemo(()=>{
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url&&key?createClient(url,key):null;
  },[]);
  const [acik,setAcik]=useState(false);
  const [email,setEmail]=useState("");
  const [kod,setKod]=useState("");
  const [adim,setAdim]=useState<"email"|"kod">("email");
  const [yukleniyor,setYukleniyor]=useState(false);
  const [mesaj,setMesaj]=useState("");
  const [hata,setHata]=useState("");

  useEffect(()=>{
    const yerlestir=()=>{
      const buttons=[...document.querySelectorAll<HTMLButtonElement>("button")];
      const original=buttons.find(b=>(b.textContent||"").includes("Misafir Olarak Görüntüle"));
      if(!original)return;
      original.style.display="none";
      original.setAttribute("aria-hidden","true");
      if(document.getElementById("trafoOtpViewerBtn"))return;
      const btn=document.createElement("button");
      btn.id="trafoOtpViewerBtn";
      btn.type="button";
      btn.className=original.className;
      btn.textContent="✉ E-posta Kodu ile Görüntüle";
      btn.onclick=(e)=>{e.preventDefault();e.stopPropagation();setHata("");setMesaj("");setAdim("email");setAcik(true)};
      original.insertAdjacentElement("afterend",btn);
    };
    yerlestir();
    const o=new MutationObserver(yerlestir);
    o.observe(document.body,{childList:true,subtree:true});
    return()=>o.disconnect();
  },[]);

  async function kodGonder(e?:FormEvent){
    e?.preventDefault();
    if(!supabase){setHata("Kimlik doğrulama bağlantısı kurulamadı.");return;}
    const temiz=email.trim().toLowerCase();
    if(!temiz){setHata("E-posta adresini yazmalısın.");return;}
    setYukleniyor(true);setHata("");setMesaj("");
    const {error}=await supabase.auth.signInWithOtp({email:temiz,options:{shouldCreateUser:true}});
    if(error){
      const raw=error.message||"";
      setHata(/rate limit/i.test(raw)?"Çok fazla doğrulama isteği gönderildi. Bir süre bekleyip tekrar deneyin.":(raw||"Doğrulama e-postası gönderilemedi."));
    }else{
      setEmail(temiz);setAdim("kod");setMesaj("E-postanıza gönderilen 6 haneli doğrulama kodunu aşağıya girin.");
    }
    setYukleniyor(false);
  }

  async function kodDogrula(e:FormEvent){
    e.preventDefault();
    if(!supabase)return;
    const temizKod=kod.replace(/\s+/g,"");
    if(!temizKod){setHata("E-postana gelen kodu yazmalısın.");return;}
    setYukleniyor(true);setHata("");
    const {data,error}=await supabase.auth.verifyOtp({email:email.trim().toLowerCase(),token:temizKod,type:"email"});
    if(error||!data.session){setHata(error?.message||"Kod doğrulanamadı.");setYukleniyor(false);return;}
    // Oturumu açık tutuyoruz: yeni OTP kullanıcıları veritabanında varsayılan VIEWER rolü alır.
    // Böylece anonim/misafir erişimi kullanılmadan RLS ile gerçek salt-okunur yetki uygulanır.
    localStorage.setItem("trafo_verified_viewer_email",email.trim().toLowerCase());
    setAcik(false);setKod("");setAdim("email");setYukleniyor(false);
  }

  return <>{acik&&<div className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" onMouseDown={e=>{if(e.target===e.currentTarget)setAcik(false)}}>
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl sm:p-8">
      <div className="flex items-start justify-between gap-4"><div><div className="text-xs font-black tracking-[.18em] text-blue-600">GÖRÜNTÜLEYİCİ GİRİŞİ</div><h2 className="mt-2 text-2xl font-black">E-posta ile doğrula</h2><p className="mt-2 text-sm leading-6 text-slate-500">Doğrulanan kullanıcı viewer rolüyle salt okunur açılır. Admin girişi değişmez.</p></div><button type="button" onClick={()=>setAcik(false)} className="h-9 w-9 shrink-0 rounded-full border border-slate-200 bg-slate-50 text-lg text-slate-500">×</button></div>
      {adim==="email"?<form onSubmit={kodGonder} className="mt-6 space-y-4"><label className="block"><span className="mb-2 block text-xs font-black text-slate-500">E-POSTA</span><input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ornek@firma.com" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"/></label><button disabled={yukleniyor} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-black text-white disabled:opacity-50">{yukleniyor?"Gönderiliyor...":"Doğrulama Kodu Gönder"}</button></form>:<form onSubmit={kodDogrula} className="mt-6 space-y-4"><div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-700">{mesaj}</div><label className="block"><span className="mb-2 block text-xs font-black text-slate-500">DOĞRULAMA KODU</span><input inputMode="numeric" autoComplete="one-time-code" value={kod} onChange={e=>setKod(e.target.value.replace(/[^0-9]/g,"").slice(0,8))} placeholder="6 haneli kod" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-xl font-black tracking-[.25em] outline-none focus:border-blue-500"/></label><button disabled={yukleniyor} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-black text-white disabled:opacity-50">{yukleniyor?"Doğrulanıyor...":"Kodu Doğrula ve Görüntüle"}</button><button type="button" disabled={yukleniyor} onClick={()=>kodGonder()} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600">Kodu Tekrar Gönder</button><button type="button" onClick={()=>{setAdim("email");setKod("");setHata("");setMesaj("")}} className="w-full text-xs font-bold text-slate-500">E-posta adresini değiştir</button></form>}
      {hata&&<div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">{hata}</div>}
    </div>
  </div>}</>;
}
