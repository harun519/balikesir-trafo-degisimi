import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;

type Entry={name:string;data:Buffer;crc:number;offset:number};

function crc32(buf:Buffer){
  let c=0xffffffff;
  for(const b of buf){
    c^=b;
    for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);
  }
  return (c^0xffffffff)>>>0;
}
function u16(n:number){const b=Buffer.alloc(2);b.writeUInt16LE(n);return b}
function u32(n:number){const b=Buffer.alloc(4);b.writeUInt32LE(n>>>0);return b}

function dosDateTime(d=new Date()){
  const year=Math.max(1980,d.getFullYear());
  const time=((d.getHours()&31)<<11)|((d.getMinutes()&63)<<5)|((Math.floor(d.getSeconds()/2))&31);
  const date=(((year-1980)&127)<<9)|(((d.getMonth()+1)&15)<<5)|(d.getDate()&31);
  return {time,date};
}
function makeZip(files:{name:string;data:Buffer}[]){
  const localParts:Buffer[]=[];const central:Buffer[]=[];let offset=0;
  const {time,date}=dosDateTime();
  for(const f of files){
    const name=Buffer.from(f.name,"utf8");
    const crc=crc32(f.data);
    const local=Buffer.concat([
      u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(time),u16(date),
      u32(crc),u32(f.data.length),u32(f.data.length),u16(name.length),u16(0),name
    ]);
    localParts.push(local,f.data);
    central.push(Buffer.concat([
      u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(time),u16(date),
      u32(crc),u32(f.data.length),u32(f.data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name
    ]));
    offset+=local.length+f.data.length;
  }
  const centralBuf=Buffer.concat(central);
  const end=Buffer.concat([
    u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),
    u32(centralBuf.length),u32(offset),u16(0)
  ]);
  return Buffer.concat([...localParts,centralBuf,end]);
}

function safe(v:string){return v.replace(/[\\/:*?"<>|]+/g,"_").trim()||"dosya"}

export async function GET(req:NextRequest){
  try{
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!anon||!key)return NextResponse.json({error:"Supabase ortam değişkenleri eksik."},{status:500});

    const authHeader=req.headers.get("authorization")||"";
    const token=authHeader.startsWith("Bearer ")?authHeader.slice(7):"";
    if(!token)return NextResponse.json({error:"Oturum bulunamadı."},{status:401});

    const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:ud,error:ue}=await auth.auth.getUser(token);
    if(ue||!ud.user)return NextResponse.json({error:"Oturum doğrulanamadı."},{status:401});

    const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:role}=await db.from("app_users").select("role").eq("id",ud.user.id).maybeSingle();
    if(!role||!["admin","editor"].includes(role.role))return NextResponse.json({error:"Toplu indirme için Admin veya Editor yetkisi gerekir."},{status:403});

    const yil=req.nextUrl.searchParams.get("yil")||"";
    const ay=req.nextUrl.searchParams.get("ay")||"";
    const ilce=req.nextUrl.searchParams.get("ilce")||"";
    if(!/^\d{4}$/.test(yil))return NextResponse.json({error:"Yıl seçilmelidir."},{status:400});

    let q=db.from("trafo_form_arsivi").select("id,yil,ay,ilce,dosya_adi,dosya_yolu,mime_type,dosya_boyutu").eq("yil",Number(yil));
    if(ay)q=q.eq("ay",ay);
    if(ilce==="DİĞER")q=q.is("ilce",null); else if(ilce)q=q.eq("ilce",ilce);
    const {data,error}=await q.order("created_at",{ascending:true});
    if(error)return NextResponse.json({error:error.message},{status:500});
    const rows=data||[];
    if(!rows.length)return NextResponse.json({error:"Bu klasörde indirilecek dosya yok."},{status:404});
    if(rows.length>80)return NextResponse.json({error:"Bu seçim 80'den fazla dosya içeriyor. Daha küçük bir ay/ilçe klasörü seç."},{status:413});

    const declared=rows.reduce((a:any,r:any)=>a+Number(r.dosya_boyutu||0),0);
    if(declared>120*1024*1024)return NextResponse.json({error:"Bu seçim 120 MB sınırını aşıyor. Daha küçük bir klasör seç."},{status:413});

    const zipFiles:{name:string;data:Buffer}[]=[];
    let total=0;
    for(const r of rows){
      const {data:file,error:fe}=await db.storage.from("trafo-form-arsivi").download(r.dosya_yolu);
      if(fe||!file)continue;
      const b=Buffer.from(await file.arrayBuffer());
      total+=b.length;
      if(total>120*1024*1024)return NextResponse.json({error:"ZIP 120 MB sınırını aşıyor. Daha küçük bir klasör seç."},{status:413});
      zipFiles.push({name:safe(r.dosya_adi),data:b});
    }
    if(!zipFiles.length)return NextResponse.json({error:"Dosyalar indirilemedi."},{status:500});

    const zip=makeZip(zipFiles);
    const ad=`trafo-arsiv-${safe(yil)}${ay?`-${safe(ay)}`:""}${ilce?`-${safe(ilce)}`:""}.zip`;
    return new NextResponse(zip,{
      status:200,
      headers:{
        "Content-Type":"application/zip",
        "Content-Disposition":`attachment; filename*=UTF-8''${encodeURIComponent(ad)}`,
        "Cache-Control":"no-store"
      }
    });
  }catch(e:any){
    return NextResponse.json({error:e?.message||"ZIP oluşturulamadı."},{status:500});
  }
}
