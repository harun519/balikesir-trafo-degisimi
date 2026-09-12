"use client";

import {useEffect,useMemo,useState} from "react";
import {createPortal} from "react-dom";
import {getSupabaseBrowserClient} from "./supabaseClient";

type UserRow={id:string;email:string|null;trafoRole:"admin"|"editor"|"viewer";scadaRole:"admin"|"viewer"};

export default function OrtakKullaniciYonetimi(){
  const supabase=useMemo(getSupabaseBrowserClient,[]);
  const [open,setOpen]=useState(false);const [rows,setRows]=useState<UserRow[]>([]);const [loading,setLoading]=useState(false);const [msg,setMsg]=useState("");

  useEffect(()=>{
    const install=()=>{
      const nav=document.querySelector("nav");if(!nav||document.getElementById("ortakKullaniciBtn"))return;
      const btn=document.createElement("button");btn.id="ortakKullaniciBtn";btn.type="button";btn.textContent="👥  Ortak Kullanıcılar";btn.className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white";btn.onclick=()=>setOpen(true);nav.appendChild(btn);
    };
    install();const t=setInterval(install,700);const q=new URLSearchParams(location.search);if(q.get("kullanicilar")==="1")setOpen(true);return()=>clearInterval(t);
  },[]);

  useEffect(()=>{if(open)load()},[open]);

  async function load(){setLoading(true);setMsg("");try{
    const client=supabase;if(!client)throw new Error("Supabase bağlantısı kurulamadı.");
    const [{data:a,error:ae},{data:s,error:se}]=await Promise.all([
      client.from("app_users").select("id,email,role").order("email"),
      client.from("scada_users").select("id,email,role").order("email")
    ]);
    if(ae)throw ae;if(se)throw se;
    const map=new Map<string,UserRow>();
    for(const x of a||[])map.set(x.id,{id:x.id,email:x.email,trafoRole:x.role,scadaRole:"viewer"});
    for(const x of s||[]){const cur=map.get(x.id)||{id:x.id,email:x.email,trafoRole:"viewer",scadaRole:"viewer"};cur.scadaRole=x.role;cur.email=cur.email||x.email;map.set(x.id,cur)}
    setRows([...map.values()].sort((x,y)=>String(x.email||"").localeCompare(String(y.email||""),"tr")));
  }catch(e:any){setMsg(e?.message||"Kullanıcılar okunamadı. Admin oturumu gerekli.")}finally{setLoading(false)}}

  async function role(id:string,app:"trafo"|"scada",value:string){setMsg("");try{
    const client=supabase;if(!client)throw new Error("Supabase bağlantısı kurulamadı.");
    const table=app==="trafo"?"app_users":"scada_users";
    const {error}=await client.from(table).update({role:value,updated_at:new Date().toISOString()}).eq("id",id);
    if(error)throw error;setMsg("Yetki güncellendi.");await load();
  }catch(e:any){setMsg(e?.message||"Yetki güncellenemedi.")}}

  if(!open||typeof document==="undefined")return null;
  return createPortal(<div className="fixed inset-0 z-[2147483647] bg-slate-950/75 p-2 sm:p-5" onClick={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
    <div className="mx-auto flex h-[calc(100dvh-16px)] max-w-5xl flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl sm:h-[calc(100dvh-40px)]">
      <div className="flex items-center justify-between border-b bg-white px-4 py-3 sm:px-6"><div><h2 className="text-lg font-black text-slate-900">Ortak Kullanıcı Yönetimi</h2><p className="text-xs text-slate-500">Trafo Değişimi + SCADA Saha Kontrol yetkileri</p></div><div className="flex gap-2"><button onClick={load} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">Yenile</button><button onClick={()=>setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-2xl font-black text-red-600">×</button></div></div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
        {msg&&<div className="mb-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">{msg}</div>}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">Toplam Kullanıcı</div><div className="mt-1 text-2xl font-black text-slate-900">{rows.length}</div></div><div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">Trafo Admin</div><div className="mt-1 text-2xl font-black text-blue-600">{rows.filter(x=>x.trafoRole==="admin").length}</div></div><div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">SCADA Admin</div><div className="mt-1 text-2xl font-black text-emerald-600">{rows.filter(x=>x.scadaRole==="admin").length}</div></div></div>
        <div className="overflow-hidden rounded-2xl border bg-white"><div className="grid grid-cols-[1fr_150px_150px] gap-2 border-b bg-slate-100 px-4 py-3 text-[11px] font-black uppercase tracking-wide text-slate-500"><span>Kullanıcı</span><span>Trafo</span><span>SCADA</span></div>{loading?<div className="p-8 text-center text-sm text-slate-500">Yükleniyor...</div>:rows.map(u=><div key={u.id} className="grid grid-cols-1 gap-2 border-b px-4 py-3 last:border-0 sm:grid-cols-[1fr_150px_150px] sm:items-center"><div><div className="text-sm font-bold text-slate-800">{u.email||"E-posta yok"}</div><div className="mt-1 text-[10px] text-slate-400">{u.id.slice(0,8)}…</div></div><select value={u.trafoRole} onChange={e=>role(u.id,"trafo",e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700"><option value="admin">Admin</option><option value="editor">Editör</option><option value="viewer">Görüntüleyici</option></select><select value={u.scadaRole} onChange={e=>role(u.id,"scada",e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700"><option value="admin">Admin</option><option value="viewer">Görüntüleyici</option></select></div>)}</div>
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800"><b>Not:</b> Yeni kullanıcı ilk kez Trafo veya SCADA üzerinden giriş yaptığında listede otomatik oluşur. Buradan uygulama bazında yetkisini değiştirebilirsin.</div>
      </div>
    </div>
  </div>,document.body);
}
