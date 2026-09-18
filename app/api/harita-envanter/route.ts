import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

export const dynamic="force-dynamic";
export const maxDuration=60;

const BUCKET="trafo-yedekler";
const PATH="harita/trafo-envanter.json";
const MAX_SIZE=30*1024*1024;
const MAP_CACHE="public, max-age=300";
const MAP_CDN_CACHE="public, s-maxage=7200, stale-while-revalidate=86400";

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

async function paketOku(){
  const sb=adminClient();
  await bucketHazirla(sb);
  const {data,error}=await sb.storage.from(BUCKET).download(PATH);
  if(error||!data){
    const msg=String(error?.message||"").toLowerCase();
    if(msg.includes("not found")||msg.includes("object not found")||msg.includes("404"))return null;
    throw error||new Error("Harita envanteri indirilemedi.");
  }
  const paket=JSON.parse(await data.text());
  if(!paket?.base64)throw new Error("Merkezi harita envanteri bozuk.");
  return paket;
}

export async function GET(req:NextRequest){
  try{
    const paket=await paketOku();
    if(!paket)return NextResponse.json(
      {error:"Merkezi harita envanteri henüz oluşturulmadı."},
      {status:404,headers:{"Cache-Control":"no-store"}}
    );

    if(req.nextUrl.searchParams.get("meta")==="1"){
      return NextResponse.json(
        {ok:true,version:paket.version||1,size:paket.size||0,updated_at:paket.updated_at||null,checksum:paket.checksum||null},
        {headers:{"Cache-Control":"public, max-age=60","Vercel-CDN-Cache-Control":"public, s-maxage=300, stale-while-revalidate=3600"}}
      );
    }

    const bytes=Buffer.from(paket.base64,"base64");
    const headers:Record<string,string>={
      "Content-Type":"application/zip",
      "Content-Disposition":"inline; filename=trafo-envanteri.zip",
      "Cache-Control":MAP_CACHE,
      "Vercel-CDN-Cache-Control":MAP_CDN_CACHE,
      "X-Inventory-Updated-At":paket.updated_at||"",
      "X-Inventory-Checksum":paket.checksum||""
    };
    if(paket.checksum)headers.ETag=`"${paket.checksum}"`;

    return new NextResponse(bytes,{status:200,headers});
  }catch(e:any){
    return NextResponse.json(
      {error:e?.message||"Harita envanteri alınamadı."},
      {status:500,headers:{"Cache-Control":"no-store"}}
    );
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

    const updated_at=new Date().toISOString();
    const checksum=createHash("sha256").update(Buffer.from(body)).digest("hex");
    const eski=await paketOku().catch(()=>null);
    const version=Number(eski?.version||0)+1;
    const paket=JSON.stringify({
      version,
      format:"zip-base64",
      size:body.byteLength,
      updated_at,
      checksum,
      base64:Buffer.from(body).toString("base64")
    });

    const {error}=await auth.sb.storage.from(BUCKET).upload(
      PATH,
      paket,
      {contentType:"application/json",upsert:true,cacheControl:"0"}
    );
    if(error)throw error;

    return NextResponse.json(
      {ok:true,version,size:body.byteLength,updated_at,checksum},
      {headers:{"Cache-Control":"no-store"}}
    );
  }catch(e:any){
    return NextResponse.json(
      {error:e?.message||"Harita envanteri kaydedilemedi."},
      {status:500,headers:{"Cache-Control":"no-store"}}
    );
  }
}
