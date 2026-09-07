import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API = "https://api.turkiyeapi.dev/v2";

function norm(v:string){
  return v
    .trim()
    .toLocaleUpperCase("tr-TR")
    .replace(/İ/g,"I")
    .replace(/Ş/g,"S")
    .replace(/Ğ/g,"G")
    .replace(/Ü/g,"U")
    .replace(/Ö/g,"O")
    .replace(/Ç/g,"C")
    .replace(/[^A-Z0-9]/g,"");
}

async function jsonGet(url:string){
  const r=await fetch(url,{headers:{Accept:"application/json"},next:{revalidate:86400}});
  const j=await r.json().catch(()=>null);
  if(!r.ok)throw new Error(j?.message||j?.error||`Dış servis hatası (${r.status})`);
  return j;
}

export async function GET(req:NextRequest){
  try{
    const ilce=req.nextUrl.searchParams.get("ilce")?.trim()||"";
    if(!ilce)return NextResponse.json({error:"İlçe bilgisi gerekli."},{status:400});

    // Balıkesir provinceId = 10
    const districtJson=await jsonGet(`${API}/districts?provinceId=10&search=${encodeURIComponent(ilce)}&limit=100&fields=id,name,provinceId`);
    const districts=Array.isArray(districtJson?.data)?districtJson.data:[];
    const district=districts.find((x:any)=>norm(String(x?.name||""))===norm(ilce));
    if(!district?.id)return NextResponse.json({error:`${ilce} ilçesi bulunamadı.`},{status:404});

    const mahalleJson=await jsonGet(`${API}/districts/${district.id}/neighborhoods?limit=1000&fields=id,name,districtId`);
    const liste=(Array.isArray(mahalleJson?.data)?mahalleJson.data:[])
      .map((x:any)=>String(x?.name||"").trim())
      .filter(Boolean)
      .sort((a:string,b:string)=>a.localeCompare(b,"tr"));

    return NextResponse.json({
      ilce:district.name,
      districtId:district.id,
      mahalleler:Array.from(new Set(liste)),
      kaynak:"TurkiyeAPI",
      datasetVersion:mahalleJson?.meta?.datasetVersion||districtJson?.meta?.datasetVersion||null,
      lastUpdated:mahalleJson?.meta?.lastUpdated||districtJson?.meta?.lastUpdated||null,
    });
  }catch(err){
    return NextResponse.json({error:err instanceof Error?err.message:"Mahalleler alınamadı."},{status:500});
  }
}
