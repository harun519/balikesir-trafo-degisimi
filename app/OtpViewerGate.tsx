"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient, Session } from "@supabase/supabase-js";

export default function OtpViewerGate(){
  const supabase=useMemo(()=>{
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url&&key?createClient(url,key):null;
  },[]);

  const [session,setSession]=useState<Session|null>(null);
  const [acik,setAcik]=useState(false);
  const [email,setEmail]=useState("");
  const [kod,setKod]=useState("");
  const [adim,setAdim]=useState<"email"|"kod">("email");
  const [yukleniyor,setYukleniyor]=useState(false);
  const [mesaj,setMesaj]=useState("");
  const [hata,setHata]=useState("");

  useEffect(()=>{
    if(!supabase)return;
    supabase.auth.getSession().then(({data})=>setSession(data.session));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>setSession(s));
    return()=>subscription.unsubscribe();
  },[supabase]);

  useEffect(()=>{
    const misafirButonunuGizle=()=>{
      document.querySelectorAll("button").forEach(b=>{
        const t=(b.textContent||"").trim();
        if(t.includes("Misafir Olarak Görüntüle")){
          (b as HTMLButtonElement).style.display="none";
          (b as HTMLButtonElement).setAttribute("aria-hidden","true");
        }
      });
    };
    misafirButonunuGizle();
    const o=new MutationObserver(misafirButonunuGizle);
    o.observe(document.body,{childList:true,subtree:true});
    return()=>o.disconnect();
  },[]);

  async function kodGonder(e?:FormEvent){
    e?.preventDefault();
    if(!supabase)return;
    const temiz=email.trim().toLowerCase();
    if(!temiz){setHata("E-posta adresini yazmalısın.");return;}
    setYukleniyor(true);setHata("");setMesaj("");
    const {error}=await supabase.auth.signInWithOtp({
      email:temiz,
      options:{shouldCreateUser:true}
    });
    if(error){setHata(error.message||"Doğrulama kodu gönderilemedi.");}
    else{
      setEmail(temiz);
      setAdim("kod");
      setMesaj("E-posta adresine doğrulama kodu gönderildi. Gelen kutunu ve spam klasörünü kontrol et.");
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
    if(error||!data.session){
      setHata(error?.message||"Kod doğrulanamadı. Yeni kod isteyip tekrar dene.");
      setYukleniyor(false);
      return;
    }
    setSession(data.session);
    setAcik(false);
    setKod("");
    setAdim("email");
    setYukleniyor(false);
  }

  if(session)return null;

  return <>
    <button
      type="button"
      onClick={()=>{setAcik(true);setHata("");setMesaj("");}}
      className="fixed bottom-5 right-5 z-[120] rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-2xl transition hover:bg-blue-500"
      style={{boxShadow:"0 18px 45px rgba(37,99,235,.35)"}}
    >✉ E-posta Kodu ile Görüntüle</button>

    {acik&&<div className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" onMouseDown={e=>{if(e.target===e.currentTarget)setAcik(false)}}>
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black tracking-[.18em] text-blue-600">GÖRÜNTÜLEME GİRİŞİ</div>
            <h2 className="mt-2 text-2xl font-black">E-posta ile doğrula</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Kodla giriş yapan kullanıcı yalnızca görüntüleme yetkisiyle açılır. Yönetici girişi mevcut haliyle değişmeden kalır.</p>
          </div>
          <button type="button" onClick={()=>setAcik(false)} className="h-9 w-9 shrink-0 rounded-full border border-slate-200 bg-slate-50 text-lg text-slate-500">×</button>
        </div>

        {adim==="email"?<form onSubmit={kodGonder} className="mt-6 space-y-4">
          <label className="block"><span className="mb-2 block text-xs font-black text-slate-500">E-POSTA</span><input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ornek@firma.com" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label>
          <button disabled={yukleniyor} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-black text-white hover:bg-blue-500 disabled:opacity-50">{yukleniyor?"Gönderiliyor...":"Doğrulama Kodu Gönder"}</button>
        </form>:<form onSubmit={kodDogrula} className="mt-6 space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-700">{mesaj}</div>
          <label className="block"><span className="mb-2 block text-xs font-black text-slate-500">DOĞRULAMA KODU</span><input inputMode="numeric" autoComplete="one-time-code" value={kod} onChange={e=>setKod(e.target.value.replace(/[^0-9]/g,"").slice(0,8))} placeholder="6 haneli kod" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-xl font-black tracking-[.25em] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label>
          <button disabled={yukleniyor} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-black text-white hover:bg-blue-500 disabled:opacity-50">{yukleniyor?"Doğrulanıyor...":"Kodu Doğrula ve Görüntüle"}</button>
          <button type="button" disabled={yukleniyor} onClick={()=>kodGonder()} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Kodu Tekrar Gönder</button>
          <button type="button" onClick={()=>{setAdim("email");setKod("");setHata("");setMesaj("");}} className="w-full text-xs font-bold text-slate-500">E-posta adresini değiştir</button>
        </form>}
        {hata&&<div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">{hata}</div>}
        <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-400"><span>🔒</span><span>Bu giriş yalnızca görüntüleme yetkisi verir.</span></div>
      </div>
    </div>}
  </>;
}
