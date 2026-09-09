"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function HaritaKisayol(){
  const supabase=useMemo(()=>{
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url&&key?createClient(url,key):null;
  },[]);
  const [giris,setGiris]=useState(false);
  useEffect(()=>{
    if(!supabase)return;
    supabase.auth.getSession().then(({data})=>setGiris(!!data.session));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setGiris(!!s));
    return()=>subscription.unsubscribe();
  },[supabase]);
  if(!giris || typeof window!=="undefined" && window.location.pathname!=="/") return null;
  return <a href="/harita" className="fixed bottom-5 right-5 z-[9999] flex items-center gap-2 rounded-2xl border border-blue-200 bg-white/95 px-4 py-3 text-xs font-black text-blue-700 shadow-xl backdrop-blur hover:bg-blue-50 sm:bottom-6 sm:right-6">🗺️ Trafo Haritası</a>;
}
