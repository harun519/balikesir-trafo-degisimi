import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;

const BUCKET="trafo-form-arsivi";
const ROOT=process.env.GOOGLE_DRIVE_TUTANAKLAR_FOLDER_ID||"18zcKMS0BRn18R1tjyhfmuxEdMJmqI1qW";
const FOLDER="application/vnd.google-apps.folder";
const MAX=15*1024*1024;
const ALLOWED=new Set(["application/pdf","image/jpeg","image/png","image/webp"]);
const AYLAR=["OCAK","ŞUBAT","MART","NİSAN","MAYIS","HAZİRAN","TEMMUZ","AĞUSTOS","EYLÜL","EKİM","KASIM","ARALIK"];
const ILCELER=["BALYA","İVRİNDİ","SAVAŞTEPE","SINDIRGI","BİGADİÇ","DURSUNBEY","KEPSUT","SUSURLUK","ALTIEYLÜL","KARESİ"];
type DF={id:string;name:string;mimeType:string;size?:string};

const b64=(v:string|Buffer)=>Buffer.from(v).toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
const up=(v:string)=>v.toLocaleUpperCase("tr-TR").trim();
const safe=(v:string)=>v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ı/g,"i").replace(/İ/g,"I").replace(/ş/g,"s").replace(/Ş/g,"S").replace(/ğ/g,"g").replace(/Ğ/g,"G").replace(/ü/g,"u").replace(/Ü/g,"U").replace(/ö/g,"o").replace(/Ö/g,"O").replace(/ç/g,"c").replace(/Ç/g,"C").replace(/[^a-zA-Z0-9._-]+/g,"_").replace(/_+/g,"_").replace(/^_+|_+$/g,"");

function yilOku(n:string){const s=n.trim();if(!/^\d{4}$/.test(s))return null;const y=Number(s);return y>=2000&&y<=2100?y:null}
function ayOku(n:string){const s=up(n);return AYLAR.find(a=>s===a||s.endsWith("-"+a)||s.endsWith(" "+a)||s.includes("-"+a+" "))||null}
function meta(ad:string){
  const u=up(ad.replace(/\.(pdf|jpe?g|png|webp)$/i,""));
  const ilce=ILCELER.find(x=>u.startsWith(x)||u.includes(x+" -")||u.includes(x+"-"))||null;
  let tr:string|null=u;
  if(ilce)tr=u.replace(new RegExp("^"+ilce.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\s*[-–—]?\\s*","i"),"").trim()||u;
  return {ilce,tr};
}

async function googleToken(){
  const raw=process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if(!raw)throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON ortam değişkeni eksik.");
  let sa:{client_email?:string;private_key?:string};
  try{sa=JSON.parse(raw)}catch{throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON geçerli JSON değil.")}
  if(!sa.client_email||!sa.private_key)throw new Error("Google servis hesabı JSON bilgileri eksik.");
  const now=Math.floor(Date.now()/1000);
  const h=b64(JSON.stringify({alg:"RS256",typ:"JWT"}));
  const p=b64(JSON.stringify({iss:sa.client_email,scope:"https://www.googleapis.com/auth/drive.readonly",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600}));
  const unsigned=`${h}.${p}`;
  const signer=crypto.createSign("RSA-SHA256");signer.update(unsigned);signer.end();
  const assertion=`${unsigned}.${b64(signer.sign(sa.private_key))}`;
  const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion}),cache:"no-store"});
  const j=await r.json();if(!r.ok||!j.access_token)throw new Error(j?.error_description||"Google Drive erişim anahtarı alınamadı.");
  return j.access_token as string;
}

async function liste(token:string,id:string):Promise<DF[]>{
  const all:DF[]=[];let pt="";
  do{
    const q=new URLSearchParams({q:`'${id}' in parents and trashed = false`,fields:"nextPageToken,files(id,name,mimeType,size)",pageSize:"1000",supportsAllDrives:"true",includeItemsFromAllDrives:"true"});
    if(pt)q.set("pageToken",pt);
    const r=await fetch(`https://www.googleapis.com/drive/v3/files?${q}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
    const j=await r.json();if(!r.ok)throw new Error(j?.error?.message||"Google Drive klasörü okunamadı.");
    all.push(...(j.files||[]));pt=j.nextPageToken||"";
  }while(pt);
  return all;
}

async function indir(token:string,id:string){
  const r=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
  if(!r.ok)throw new Error(`Drive dosyası indirilemedi (${r.status})`);
  return Buffer.from(await r.arrayBuffer());
}

async function sync(actor:{id:string|null;email:string|null}){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error("Supabase sunucu ortam değişkenleri eksik.");

  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const token=await googleToken();

  // Mevcut arşiv yollarını TEK sorguda alıyoruz.
  // Böylece her Drive dosyası için ayrı Supabase sorgusu yapıp süre kaybetmiyoruz.
  const {data:mevcutRows,error:mevcutErr}=await db
    .from("trafo_form_arsivi")
    .select("dosya_yolu")
    .limit(5000);

  if(mevcutErr)throw new Error("Arşiv listesi okunamadı: "+mevcutErr.message);
  const mevcutYollar=new Set((mevcutRows||[]).map((r:any)=>String(r.dosya_yolu||"")));

  const root=await liste(token,ROOT);
  const yillar=root
    .map(x=>({...x,yil:yilOku(x.name)}))
    .filter(x=>x.mimeType===FOLDER&&x.yil!==null)
    .sort((a,b)=>(a.yil as number)-(b.yil as number));

  let ayKlasoruSayisi=0,bulunan=0,aktarilan=0,atlanan=0,hatali=0;
  const detaylar:any[]=[];

  // Önce tüm yıl/ay klasörlerini keşfet.
  const ayKlasorleri:{yil:number;ay:string;id:string}[]=[];
  for(const yf of yillar){
    const yi=await liste(token,yf.id);
    for(const x of yi){
      if(x.mimeType!==FOLDER)continue;
      const ay=ayOku(x.name);
      if(!ay)continue;
      ayKlasorleri.push({yil:yf.yil as number,ay,id:x.id});
    }
  }
  ayKlasoruSayisi=ayKlasorleri.length;

  // Ay klasörlerini küçük gruplar halinde paralel tara.
  // Bu, 53 klasörü tek tek beklemekten çok daha hızlıdır.
  const GRUP=8;
  const adaylar:{yil:number;ay:string;file:DF}[]=[];

  for(let i=0;i<ayKlasorleri.length;i+=GRUP){
    const grup=ayKlasorleri.slice(i,i+GRUP);
    const sonuclar=await Promise.all(
      grup.map(async k=>({
        klasor:k,
        files:(await liste(token,k.id)).filter(x=>ALLOWED.has(x.mimeType))
      }))
    );

    for(const s of sonuclar){
      bulunan+=s.files.length;
      for(const f of s.files)adaylar.push({yil:s.klasor.yil,ay:s.klasor.ay,file:f});
    }
  }

  // Yalnızca YENİ dosyaları işle.
  for(const item of adaylar){
    const {yil,ay,file:f}=item;
    try{
      const path=`${yil}/${safe(ay)}/drive_${f.id}_${safe(f.name)||"dosya"}`;

      if(mevcutYollar.has(path)){
        atlanan++;
        continue;
      }

      if(Number(f.size||0)>MAX){
        atlanan++;
        detaylar.push({yil,ay,dosya:f.name,durum:"atlandi",mesaj:"15 MB sınırı"});
        continue;
      }

      const buf=await indir(token,f.id);
      if(buf.length>MAX){
        atlanan++;
        detaylar.push({yil,ay,dosya:f.name,durum:"atlandi",mesaj:"15 MB sınırı"});
        continue;
      }

      const {error:se}=await db.storage.from(BUCKET).upload(path,buf,{
        contentType:f.mimeType,
        upsert:false
      });
      if(se)throw new Error("Storage: "+se.message);

      const m=meta(f.name);
      const {error:ie}=await db.from("trafo_form_arsivi").insert({
        yil,
        ay,
        ilce:m.ilce,
        mahalle:null,
        tr:m.tr,
        lokasyon_id:null,
        trafo_id:null,
        dosya_adi:f.name,
        dosya_yolu:path,
        mime_type:f.mimeType,
        dosya_boyutu:buf.length,
        aciklama:`Google Drive otomatik senkronizasyon • Drive ID: ${f.id}`,
        yukleyen_id:actor.id,
        yukleyen_email:actor.email
      });

      if(ie){
        await db.storage.from(BUCKET).remove([path]);
        throw new Error("Veritabanı: "+ie.message);
      }

      mevcutYollar.add(path);
      aktarilan++;
      detaylar.push({yil,ay,dosya:f.name,durum:"aktarildi"});
    }catch(e:any){
      hatali++;
      detaylar.push({
        yil,
        ay,
        dosya:f.name,
        durum:"hata",
        mesaj:e?.message||"Bilinmeyen hata"
      });
    }
  }

  return {
    yilSayisi:yillar.length,
    ayKlasoruSayisi,
    bulunan,
    aktarilan,
    atlanan,
    hatali,
    detaylar
  };
}

async function logBaslat(kaynak:string,email:string|null){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return null;
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data}=await db.from("drive_sync_logs").insert({
    kaynak,
    durum:"running",
    kullanici_email:email,
    baslangic:new Date().toISOString()
  }).select("id").maybeSingle();
  return data?.id||null;
}

async function logBitir(id:number|null,durum:"success"|"error",sonuc:any,mesaj:string|null=null){
  if(!id)return;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return;
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  await db.from("drive_sync_logs").update({
    bitis:new Date().toISOString(),
    durum,
    yil_sayisi:Number(sonuc?.yilSayisi||0),
    ay_klasoru_sayisi:Number(sonuc?.ayKlasoruSayisi||0),
    bulunan:Number(sonuc?.bulunan||0),
    aktarilan:Number(sonuc?.aktarilan||0),
    atlanan:Number(sonuc?.atlanan||0),
    hatali:Number(sonuc?.hatali||0),
    mesaj
  }).eq("id",id);
}

async function metadataYedegiAl(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return;
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const [{data:kayitlar,error:e1},{data:arsiv,error:e2},{data:sync,error:e3}]=await Promise.all([
    db.from("trafo_degisim").select("*").order("id"),
    db.from("trafo_form_arsivi").select("*").order("created_at"),
    db.from("drive_sync_logs").select("*").order("created_at",{ascending:false}).limit(500)
  ]);
  if(e1||e2||e3)throw new Error("Yedek verileri okunamadı.");
  const now=new Date();
  const pad=(n:number)=>String(n).padStart(2,"0");
  const ad=`${now.getUTCFullYear()}-${pad(now.getUTCMonth()+1)}-${pad(now.getUTCDate())}_trafo_metadata.json`;
  const body=Buffer.from(JSON.stringify({created_at:now.toISOString(),trafo_degisim:kayitlar||[],trafo_form_arsivi:arsiv||[],drive_sync_logs:sync||[]},null,2),"utf8");
  const {error}=await db.storage.from("trafo-yedekler").upload(ad,body,{contentType:"application/json",upsert:true});
  if(error)throw new Error("Yedek Storage hatası: "+error.message);
}

export async function GET(req:NextRequest){
  let logId:number|null=null;
  try{
    const secret=process.env.CRON_SECRET;
    if(!secret)return NextResponse.json({error:"CRON_SECRET ortam değişkeni eksik."},{status:500});
    if(req.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({error:"Yetkisiz cron isteği."},{status:401});
    logId=await logBaslat("cron","vercel-cron@otomatik");
    const sonuc=await sync({id:null,email:"vercel-cron@otomatik"});
    await metadataYedegiAl();
    await logBitir(logId,"success",sonuc,null);
    return NextResponse.json({otomatik:true,yedek:true,...sonuc});
  }catch(e:any){
    await logBitir(logId,"error",{},e?.message||"Otomatik senkronizasyon hatası.");
    return NextResponse.json({error:e?.message||"Otomatik senkronizasyon hatası."},{status:500});
  }
}

export async function POST(req:NextRequest){
  let logId:number|null=null;
  try{
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!anon||!key)return NextResponse.json({error:"Supabase sunucu ortam değişkenleri eksik."},{status:500});
    const a=req.headers.get("authorization")||"",token=a.startsWith("Bearer ")?a.slice(7):"";
    if(!token)return NextResponse.json({error:"Oturum bulunamadı."},{status:401});
    const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:ud,error:ue}=await auth.auth.getUser(token);if(ue||!ud.user)return NextResponse.json({error:"Oturum doğrulanamadı."},{status:401});
    const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:r,error:re}=await db.from("app_users").select("role").eq("id",ud.user.id).maybeSingle();
    if(re)return NextResponse.json({error:"Kullanıcı yetkisi okunamadı: "+re.message},{status:500});
    if(!r||!["admin","editor"].includes(r.role))return NextResponse.json({error:"Admin veya Editor yetkisi gerekir."},{status:403});
    logId=await logBaslat("manual",ud.user.email||null);
    const sonuc=await sync({id:ud.user.id,email:ud.user.email||null});
    await logBitir(logId,"success",sonuc,null);
    return NextResponse.json({otomatik:false,...sonuc});
  }catch(e:any){
    await logBitir(logId,"error",{},e?.message||"Google Drive senkronizasyon hatası.");
    return NextResponse.json({error:e?.message||"Google Drive senkronizasyon hatası."},{status:500});
  }
}
