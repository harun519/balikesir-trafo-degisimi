import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime="nodejs";
export const dynamic="force-dynamic";

type BackupInfo={name:string;path:string;created_at:string|null}|null;

function client(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error("Supabase ayarı eksik");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}

async function latestBackup(sb:ReturnType<typeof client>):Promise<BackupInfo>{
  const bucket="trafo-yedekler";
  const {data:years}=await sb.storage.from(bucket).list("otomatik",{limit:20,sortBy:{column:"name",order:"desc"}});
  for(const y of (years||[]).filter(x=>/^\d{4}$/.test(x.name)).sort((a,b)=>b.name.localeCompare(a.name))){
    const {data:months}=await sb.storage.from(bucket).list(`otomatik/${y.name}`,{limit:20,sortBy:{column:"name",order:"desc"}});
    for(const m of (months||[]).filter(x=>/^\d{2}$/.test(x.name)).sort((a,b)=>b.name.localeCompare(a.name))){
      const prefix=`otomatik/${y.name}/${m.name}`;
      const {data:files}=await sb.storage.from(bucket).list(prefix,{limit:100,sortBy:{column:"created_at",order:"desc"}});
      const f=(files||[]).find(x=>x.name?.endsWith(".json"));
      if(f)return {name:f.name,path:`${prefix}/${f.name}`,created_at:f.created_at||f.updated_at||null};
    }
  }
  return null;
}

export async function GET(){
  const started=Date.now();
  try{
    const sb=client();
    const [{data:row,error},backup]=await Promise.all([
      sb.from("trafo_degisim").select("id,tarih").order("id",{ascending:false}).limit(1).maybeSingle(),
      latestBackup(sb)
    ]);
    if(error)throw error;
    return NextResponse.json({
      ok:true,
      service:"trafo",
      database:true,
      lastDataAt:row?.tarih||null,
      lastBackupAt:backup?.created_at||null,
      lastBackupName:backup?.name||null,
      latencyMs:Date.now()-started,
      checkedAt:new Date().toISOString(),
      backupScheduleConfigured:Boolean(process.env.CRON_SECRET)
    },{headers:{"Cache-Control":"no-store"}});
  }catch(e:any){
    return NextResponse.json({ok:false,service:"trafo",database:false,error:e?.message||"health check failed",latencyMs:Date.now()-started,checkedAt:new Date().toISOString()},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
