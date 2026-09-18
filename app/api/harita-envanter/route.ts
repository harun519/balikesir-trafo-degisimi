import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

export const dynamic="force-dynamic";
export const maxDuration=60;

const BUCKET="trafo-yedekler";
const LEGACY_PATH="harita/trafo-envanter.json";
const ZIP_PATH="harita/trafo-envanter.zip";
const META_PATH="harita/trafo-envanter-meta.json";
const MAX_SIZE=30*1024*1024;
const CDN_CACHE="public, s-maxage=7200, stale-while-revalidate=86400";
const BROWSER_CACHE="public, max-age=300";

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
  const {data:profil}=await sb.from("app_users").select("role").eq("id",user.id).maybeSingle();
  if(profil?.role!=="admin")return {ok:false as const,error:"Bu işlem yalnızca Admin içindir."};
  return {ok:true as const,sb,user};
}

function bulunamadi(error:any){
  const msg=String(error?.message||"").toLowerCase();
  return msg.includes("not found")||msg.includes("object not found")||msg.includes("404");
}

async function objeIndir(sb:ReturnType<typeof adminClient>,path:string){
  const {data,error}=await sb.storage.from(BUCKET).download(path);
  if(error||!data){
    if(bulunamadi(error))return null;
    throw error||new Error("Harita envanteri indirilemedi.");
  }
  return data;
}

async function legacyPaketOku(sb=adminClient()){
  await bucketHazirla(sb);
  const data=await objeIndir(sb,LEGACY_PATH);
  if(!data)return null;
  const paket=JSON.parse(await data.text());
  if(!paket?.base64)throw new Error("Merkezi harita envanteri bozuk.");
  return paket;
}

async function metaOku(sb=adminClient()){
  await bucketHazirla(sb);
  const data=await objeIndir(sb,META_PATH);
  if(!data)return null;
  return JSON.parse(await data.text());
}

async function zipOku(sb=adminClient()){
  await bucketHazirla(sb);
  return objeIndir(sb,ZIP_PATH);
}

async function legacyyiTasima(sb:ReturnType<typeof adminClient>,legacy:any){
  const bytes=Buffer.from(legacy.base64,"base64");
  const checksum=legacy.checksum||createHash("sha256").update(bytes).digest("hex");
  const meta={
    version:Number(legacy.version||1),
    format:"zip",
    size:Number(legacy.size||bytes.byteLength),
    updated_at:legacy.updated_at||new Date().toISOString(),
    checksum
  };
  const [{error:zipError},{error:metaError}]=await Promise.all([
    sb.storage.from(BUCKET).upload(ZIP_PATH,bytes,{contentType:"application/zip",upsert:true,cacheControl:"7200"}),
    sb.storage.from(BUCKET).upload(META_PATH,JSON.stringify(meta),{contentType:"application/json",upsert:true,cacheControl:"60"})
  ]);
  if(zipError)throw zipError;
  if(metaError)throw metaError;
  return {bytes,meta};
}

export async function GET(req:NextRequest){
  try{
    const sb=adminClient();
    await bucketHazirla(sb);

    if(req.nextUrl.searchParams.get("meta")==="1"){
      let meta=await metaOku(sb);
      if(!meta){
        const legacy=await legacyPaketOku(sb);
        if(!legacy)return NextResponse.json({error:"Merkezi harita envanteri henüz oluşturulmadı."},{status:404,headers:{"Cache-Control":"no-store"}});
        const tasinan=await legacyyiTasima(sb,legacy);
        meta=tasinan.meta;
      }
      return NextResponse.json({ok:true,...meta},{headers:{
        "Cache-Control":"public, max-age=60",
        "CDN-Cache-Control":"public, s-maxage=300, stale-while-revalidate=3600",
        "Vercel-CDN-Cache-Control":"public, s-maxage=300, stale-while-revalidate=3600"
      }});
    }

    let blob=await zipOku(sb);
    let meta=await metaOku(sb);
    let bytes:Buffer;

    if(blob){
      bytes=Buffer.from(await blob.arrayBuffer());
      if(!meta){
        meta={version:1,format:"zip",size:bytes.byteLength,updated_at:null,checksum:createHash("sha256").update(bytes).digest("hex")};
      }
    }else{
      const legacy=await legacyPaketOku(sb);
      if(!legacy)return NextResponse.json({error:"Merkezi harita envanteri henüz oluşturulmadı."},{status:404,headers:{"Cache-Control":"no-store"}});
      const tasinan=await legacyyiTasima(sb,legacy);
      bytes=tasinan.bytes;
      meta=tasinan.meta;
    }

    const headers:Record<string,string>={
      "Content-Type":"application/zip",
      "Content-Disposition":"inline; filename=trafo-envanteri.zip",
      "Cache-Control":BROWSER_CACHE,
      "CDN-Cache-Control":CDN_CACHE,
      "Vercel-CDN-Cache-Control":CDN_CACHE,
      "X-Inventory-Version":String(meta?.version||1),
      "X-Inventory-Updated-At":String(meta?.updated_at||""),
      "X-Inventory-Checksum":String(meta?.checksum||"")
    };
    if(meta?.checksum)headers.ETag=`"${meta.checksum}"`;

    return new NextResponse(bytes,{status:200,headers});
  }catch(e:any){
    return NextResponse.json({error:e?.message||"Harita envanteri alınamadı."},{status:500,headers:{"Cache-Control":"no-store"}});
  }
}

export async function POST(req:NextRequest){
  try{
    const auth=await adminDogrula(req);
    if(!auth.ok)return NextResponse.json({error:auth.error},{status:401});
    await bucketHazirla(auth.sb);

    const body=await req.arrayBuffer();
    if(!body.byteLength)return NextResponse.json({error:"ZIP dosyası boş."},{status:400});
    if(body.byteLength>MAX_SIZE)return NextResponse.json({error:"SHP ZIP dosyası 30 MB sınırını aşıyor."},{status:413});
    const ilk=new Uint8Array(body.slice(0,4));
    if(ilk[0]!==0x50||ilk[1]!==0x4b)return NextResponse.json({error:"Geçerli bir ZIP dosyası gönderilmedi."},{status:400});

    const bytes=Buffer.from(body);
    const updated_at=new Date().toISOString();
    const checksum=createHash("sha256").update(bytes).digest("hex");
    const mevcutMeta=await metaOku(auth.sb).catch(()=>null);
    const legacy=!mevcutMeta?await legacyPaketOku(auth.sb).catch(()=>null):null;
    const version=Number(mevcutMeta?.version||legacy?.version||0)+1;
    const meta={version,format:"zip",size:body.byteLength,updated_at,checksum};

    const [{error:zipError},{error:metaError}]=await Promise.all([
      auth.sb.storage.from(BUCKET).upload(ZIP_PATH,bytes,{contentType:"application/zip",upsert:true,cacheControl:"7200"}),
      auth.sb.storage.from(BUCKET).upload(META_PATH,JSON.stringify(meta),{contentType:"application/json",upsert:true,cacheControl:"60"})
    ]);
    if(zipError)throw zipError;
    if(metaError)throw metaError;

    return NextResponse.json({ok:true,...meta},{headers:{"Cache-Control":"no-store"}});
  }catch(e:any){
    return NextResponse.json({error:e?.message||"Harita envanteri kaydedilemedi."},{status:500,headers:{"Cache-Control":"no-store"}});
  }
}
