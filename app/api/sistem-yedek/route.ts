import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUCKET = "trafo-yedekler";
const KEEP = 1;

function adminClient(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error("Supabase sunucu ayarları eksik.");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}

async function bucketHazirla(sb:ReturnType<typeof adminClient>){
  const {data,error}=await sb.storage.getBucket(BUCKET);
  if(data&&!error)return;
  const {error:createError}=await sb.storage.createBucket(BUCKET,{public:false,fileSizeLimit:52428800});
  if(createError&&!String(createError.message||"").toLowerCase().includes("already"))throw createError;
}

async function adminDogrula(req:NextRequest){
  const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"").trim();
  if(!token)return {ok:false as const,error:"Oturum bilgisi bulunamadı."};
  const sb=adminClient();
  const {data:{user},error}=await sb.auth.getUser(token);
  if(error||!user)return {ok:false as const,error:"Oturum doğrulanamadı."};
  const {data:profil}=await sb.from("app_users").select("role,email").eq("id",user.id).maybeSingle();
  if(profil?.role!=="admin")return {ok:false as const,error:"Bu işlem yalnızca Admin içindir."};
  return {ok:true as const,sb,user,email:profil?.email||user.email||""};
}

async function tabloGetir(sb:ReturnType<typeof adminClient>,table:string){
  const {data,error}=await sb.from(table).select("*");
  return {data:data||[],error:error?error.message:null};
}

async function sistemYedekDosyalari(sb:ReturnType<typeof adminClient>){
  const {data,error}=await sb.storage.from(BUCKET).list("sistem",{limit:100,sortBy:{column:"created_at",order:"desc"}});
  if(error)throw error;
  return (data||[]).filter(x=>x.name?.endsWith(".json"));
}

async function sistemYedekleriniTemizle(sb:ReturnType<typeof adminClient>){
  const files=await sistemYedekDosyalari(sb);
  const stale=files.slice(KEEP);
  if(stale.length){
    const {error}=await sb.storage.from(BUCKET).remove(stale.map(x=>`sistem/${x.name}`));
    if(error)throw error;
  }
  return files.slice(0,KEEP);
}

async function eskiOtomatikYedekleriTemizle(sb:ReturnType<typeof adminClient>){
  const {data:years}=await sb.storage.from(BUCKET).list("otomatik",{limit:100});
  const paths:string[]=[];
  for(const y of years||[]){
    if(!/^\d{4}$/.test(y.name||""))continue;
    const {data:months}=await sb.storage.from(BUCKET).list(`otomatik/${y.name}`,{limit:24});
    for(const m of months||[]){
      if(!/^\d{2}$/.test(m.name||""))continue;
      const {data:files}=await sb.storage.from(BUCKET).list(`otomatik/${y.name}/${m.name}`,{limit:1000});
      for(const x of files||[])if(x.name?.endsWith(".json"))paths.push(`otomatik/${y.name}/${m.name}/${x.name}`);
    }
  }
  if(paths.length){
    const {error}=await sb.storage.from(BUCKET).remove(paths);
    if(error)throw error;
  }
}

async function yedekOlustur(kaynak:"manuel"|"otomatik",email=""){
  const sb=adminClient();
  await bucketHazirla(sb);

  const [trafo,arsiv,markalar,drive,audit]=await Promise.all([
    tabloGetir(sb,"trafo_degisim"),
    tabloGetir(sb,"trafo_form_arsivi"),
    tabloGetir(sb,"trafo_markalari"),
    tabloGetir(sb,"drive_sync_logs"),
    tabloGetir(sb,"trafo_audit_log"),
  ]);

  const now=new Date();
  const damga=now.toISOString().replace(/[:.]/g,"-");
  const name=`SISTEM_YEDEGI_${damga}_${kaynak}.json`;
  const path=`sistem/${name}`;
  const payload={
    backup_version:2,
    created_at:now.toISOString(),
    kaynak,
    kullanici_email:email||null,
    tables:{
      trafo_degisim:trafo.data,
      trafo_form_arsivi:arsiv.data,
      trafo_markalari:markalar.data,
      drive_sync_logs:drive.data,
      trafo_audit_log:audit.data,
    },
    table_errors:{
      trafo_degisim:trafo.error,
      trafo_form_arsivi:arsiv.error,
      trafo_markalari:markalar.error,
      drive_sync_logs:drive.error,
      trafo_audit_log:audit.error,
    }
  };

  const body=JSON.stringify(payload,null,2);
  const {error}=await sb.storage.from(BUCKET).upload(path,body,{contentType:"application/json",upsert:false});
  if(error)throw error;
  await sistemYedekleriniTemizle(sb);
  await eskiOtomatikYedekleriTemizle(sb);
  return {name,path,size:new TextEncoder().encode(body).length,created_at:now.toISOString(),kaynak,retention:KEEP};
}

async function yedekleriListele(){
  const sb=adminClient();
  await bucketHazirla(sb);
  const files=await sistemYedekleriniTemizle(sb);
  const yedekler=await Promise.all(files.map(async x=>{
    const path=`sistem/${x.name}`;
    const {data:signed}=await sb.storage.from(BUCKET).createSignedUrl(path,60*60);
    return {
      name:x.name,
      created_at:x.created_at||null,
      updated_at:x.updated_at||null,
      size:Number(x.metadata?.size||0),
      url:signed?.signedUrl||""
    };
  }));
  return yedekler;
}

export async function GET(req:NextRequest){
  try{
    const auth=req.headers.get("authorization")||"";
    const cronSecret=process.env.CRON_SECRET||"";
    if(cronSecret&&auth===`Bearer ${cronSecret}`){
      const sonuc=await yedekOlustur("otomatik");
      return NextResponse.json({ok:true,...sonuc});
    }

    const user=await adminDogrula(req);
    if(!user.ok)return NextResponse.json({error:user.error},{status:401});
    const yedekler=await yedekleriListele();
    return NextResponse.json({ok:true,yedekler});
  }catch(e:any){
    return NextResponse.json({error:e?.message||"Yedek işlemi başarısız."},{status:500});
  }
}

export async function POST(req:NextRequest){
  try{
    const user=await adminDogrula(req);
    if(!user.ok)return NextResponse.json({error:user.error},{status:401});
    const sonuc=await yedekOlustur("manuel",user.email);
    return NextResponse.json({ok:true,...sonuc});
  }catch(e:any){
    return NextResponse.json({error:e?.message||"Yedek oluşturulamadı."},{status:500});
  }
}
