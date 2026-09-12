"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, Session } from "@supabase/supabase-js";
import TrafoHarita from "../TrafoHarita";

export default function HaritaPage(){
  const supabase=useMemo(getSupabaseBrowserClient,[]);
  const [session,setSession]=useState<Session|null>(null);
  const [kontrol,setKontrol]=useState(true);

  useEffect(()=>{
    if(!supabase){setKontrol(false);return;}
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setKontrol(false);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
    return()=>subscription.unsubscribe();
  },[supabase]);

  if(kontrol) return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-600">Harita erişimi kontrol ediliyor...</div></main>;
  if(!session) return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"><div className="text-3xl">🔒</div><h1 className="mt-3 text-xl font-black text-slate-900">Oturum gerekli</h1><p className="mt-2 text-sm text-slate-500">Trafo envanter haritası yalnızca giriş yapmış kullanıcılar tarafından görüntülenebilir.</p><a href="/" className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700">Giriş ekranına dön</a></div></main>;

  return <main className="min-h-screen bg-slate-50 p-3 sm:p-5 lg:p-6"><div className="mx-auto max-w-[1600px]"><div className="mb-4 flex items-center justify-between gap-3"><div><h1 className="text-xl font-black text-slate-900 sm:text-2xl">Trafo Haritası</h1><p className="mt-1 text-xs text-slate-500">Balıkesir trafo envanteri</p></div><a href="/" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50">← Ana Uygulama</a></div><TrafoHarita/></div></main>;
}
