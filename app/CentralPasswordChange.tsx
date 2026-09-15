"use client";

import {FormEvent,useEffect,useState,type CSSProperties} from "react";

const API="https://balikesir-sistem-isletme.vercel.app/api/sifre-degistir";

function findStoredEmail(){
 try{
  for(let i=0;i<localStorage.length;i++){
   const key=localStorage.key(i);if(!key)continue;
   const raw=localStorage.getItem(key);if(!raw||!raw.includes("@"))continue;
   try{
    const v=JSON.parse(raw);
    const candidates=[v?.user?.email,v?.currentSession?.user?.email,v?.session?.user?.email,v?.data?.user?.email];
    const email=candidates.find((x:any)=>typeof x==="string"&&x.includes("@"));
    if(email)return String(email).toLowerCase();
   }catch{}
  }
 }catch{}
 return "";
}

export default function CentralPasswordChange(){
 const [open,setOpen]=useState(false),[email,setEmail]=useState(""),[currentPassword,setCurrentPassword]=useState(""),[newPassword,setNewPassword]=useState(""),[repeat,setRepeat]=useState(""),[busy,setBusy]=useState(false),[msg,setMsg]=useState(""),[error,setError]=useState("");
 useEffect(()=>{if(open&&!email)setEmail(findStoredEmail())},[open,email]);
 async function submit(e:FormEvent){
  e.preventDefault();setMsg("");setError("");
  if(!email.includes("@"))return setError("Geçerli e-posta adresini girin.");
  if(newPassword.length<8)return setError("Yeni şifre en az 8 karakter olmalı.");
  if(newPassword!==repeat)return setError("Yeni şifreler eşleşmiyor.");
  if(newPassword===currentPassword)return setError("Yeni şifre mevcut şifreyle aynı olamaz.");
  setBusy(true);
  try{
   const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({identity:email.trim().toLowerCase(),currentPassword,newPassword})});
   const d=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(d?.error||"Şifre değiştirilemedi.");
   setMsg(d?.message||"Şifreniz güncellendi.");setCurrentPassword("");setNewPassword("");setRepeat("");
  }catch(err:any){setError(err?.message||"Şifre değiştirilemedi.")}finally{setBusy(false)}
 }
 return <>
  <button onClick={()=>setOpen(true)} style={s.launch}>🔐 <span>Şifremi Değiştir</span></button>
  {open&&<div style={s.overlay} onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
   <form onSubmit={submit} style={s.card}>
    <div style={s.head}><div><small style={s.kicker}>HESAP GÜVENLİĞİ</small><h2 style={s.title}>Şifremi Değiştir</h2><p style={s.sub}>Yeni şifreniz yetkiniz bulunan tüm uygulamalarda aynı olur.</p></div><button type="button" onClick={()=>setOpen(false)} style={s.close}>×</button></div>
    <label style={s.label}>E-posta<input style={s.input} type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" placeholder="kullanici@uedas.com.tr"/></label>
    <label style={s.label}>Mevcut şifre<input style={s.input} type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} autoComplete="current-password"/></label>
    <div style={s.grid}><label style={s.label}>Yeni şifre<input style={s.input} type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} autoComplete="new-password"/></label><label style={s.label}>Yeni şifre tekrar<input style={s.input} type="password" value={repeat} onChange={e=>setRepeat(e.target.value)} autoComplete="new-password"/></label></div>
    <div style={s.rule}>✓ En az 8 karakter &nbsp;·&nbsp; Mail kodu gerekmez &nbsp;·&nbsp; Rolleriniz değişmez</div>
    {error&&<div style={s.error}>{error}</div>}{msg&&<div style={s.success}>{msg}</div>}
    <button disabled={busy} style={{...s.submit,opacity:busy ? .65 : 1}}>{busy?"Güncelleniyor…":"Şifreyi Güncelle"}</button>
   </form>
  </div>}
 </>;
}

const s:Record<string,CSSProperties>={
 launch:{position:"fixed",left:8,bottom:58,zIndex:9000,width:194,border:"1px solid #cbd5e1",borderRadius:12,background:"#fff",color:"#17345f",padding:"9px 12px",fontWeight:800,boxShadow:"0 4px 14px rgba(15,23,42,.08)",cursor:"pointer",display:"flex",gap:7,alignItems:"center",justifyContent:"center",fontSize:12},
 overlay:{position:"fixed",inset:0,zIndex:20000,background:"rgba(8,20,38,.56)",backdropFilter:"blur(5px)",display:"grid",placeItems:"center",padding:16},
 card:{width:"min(560px,96vw)",background:"#fff",borderRadius:20,padding:24,boxShadow:"0 30px 90px rgba(2,12,27,.30)",border:"1px solid #dbe4ef"},
 head:{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start",marginBottom:18},kicker:{fontSize:10,fontWeight:900,letterSpacing:".12em",color:"#2563eb"},title:{margin:"4px 0 5px",fontSize:24,color:"#132642"},sub:{margin:0,fontSize:12,color:"#718096",lineHeight:1.5},close:{width:34,height:34,border:0,borderRadius:10,background:"#f1f5f9",fontSize:22,cursor:"pointer",color:"#52637a"},
 label:{display:"grid",gap:6,fontSize:11,fontWeight:800,color:"#41536c",marginTop:12},input:{height:44,border:"1px solid #d7e0ea",borderRadius:10,padding:"0 12px",fontSize:14,outline:"none",background:"#fbfdff"},grid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10},rule:{marginTop:14,padding:"10px 11px",borderRadius:9,background:"#f6f9fd",color:"#66758b",fontSize:10,fontWeight:700},error:{marginTop:12,padding:"10px 11px",borderRadius:9,background:"#fff1f2",color:"#be123c",fontSize:11,fontWeight:750},success:{marginTop:12,padding:"10px 11px",borderRadius:9,background:"#ecfdf3",color:"#087a45",fontSize:11,fontWeight:750},submit:{width:"100%",height:46,marginTop:16,border:0,borderRadius:11,background:"linear-gradient(90deg,#2563eb,#1d4ed8)",color:"#fff",fontWeight:900,cursor:"pointer"}
};
