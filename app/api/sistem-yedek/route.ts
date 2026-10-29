import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {createHash} from 'crypto';
export const dynamic='force-dynamic';export const maxDuration=60;
const BUCKET='trafo-yedekler',KEEP=3,MAX_BYTES=20*1024*1024;
function client(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw Error('Sunucu ayarları eksik');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
async function admin(req:NextRequest){const sb=client(),token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');if(!token)throw Object.assign(Error('Oturum gerekli'),{status:401});const {data,error}=await sb.auth.getUser(token);if(error||!data.user)throw Object.assign(Error('Geçersiz oturum'),{status:401});const {data:p}=await sb.from('app_users').select('role').eq('id',data.user.id).maybeSingle();if(p?.role!=='admin')throw Object.assign(Error('Yönetici yetkisi gerekli'),{status:403});return sb}
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function list(sb:ReturnType<typeof client>){
 const out:any[]=[];const scan=async(prefix:string)=>{const {data,error}=await sb.storage.from(BUCKET).list(prefix,{limit:1000,sortBy:{column:'created_at',order:'desc'}});if(error)throw error;return data||[]};
 for(const f of await scan('sistem'))if(f.id&&f.name.endsWith('.json'))out.push({...f,path:'sistem/'+f.name});
 for(const y of await scan('otomatik'))if(!y.id)for(const m of await scan('otomatik/'+y.name))if(!m.id)for(const f of await scan(`otomatik/${y.name}/${m.name}`))if(f.id&&f.name.endsWith('.json'))out.push({...f,path:`otomatik/${y.name}/${m.name}/${f.name}`});
 return out.sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
}
async function read(sb:ReturnType<typeof client>,path:string){if(!/^(sistem\/|otomatik\/)/.test(path)||path.includes('..')||!path.endsWith('.json'))throw Error('Geçersiz yedek yolu');const {data,error}=await sb.storage.from(BUCKET).download(path);if(error||!data)throw Error('Yedek okunamadı');const j=JSON.parse(await data.text());const rows=j.tables?.trafo_degisim||j.trafo_degisim;if(!Array.isArray(rows)||!rows.length)throw Error('Geçersiz veya boş yedek');if(j.table_errors&&Object.values(j.table_errors).some(Boolean))throw Error('Eksik tablo içeren yedek geri yüklenemez');if(j.checksum&&j.checksum!==createHash('sha256').update(JSON.stringify(j.tables)).digest('hex'))throw Error('Yedek içerik doğrulaması başarısız');return j}
async function backup(sb:ReturnType<typeof client>,source:string){
 const {data:tables,error}=await sb.rpc('trafo_snapshot2026');if(error||!tables||!Array.isArray(tables.trafo_degisim))throw Error('Yedek kaynağı okunamadı; eski yedekler korundu.');
 const now=new Date(),name=`SISTEM_YEDEGI_${now.toISOString().replace(/[:.]/g,'-')}_${source}.json`,path='sistem/'+name,checksum=createHash('sha256').update(JSON.stringify(tables)).digest('hex');
 const body=JSON.stringify({backup_version:4,created_at:now.toISOString(),kaynak:source,tables,checksum,table_errors:{},summary:{trafo:tables.trafo_degisim.length,markalar:tables.trafo_markalari.length,audit:tables.trafo_audit_log.length}});
 if(Buffer.byteLength(body)>MAX_BYTES)throw Error('Yedek 20 MB güvenlik sınırını aşıyor; eski kopyalar korundu.');
 const {error:uploadError}=await sb.storage.from(BUCKET).upload(path,body,{contentType:'application/json',upsert:false});if(uploadError)throw uploadError;
 await read(sb,path);
 const stale=(await list(sb)).filter(f=>f.path.startsWith('sistem/')).slice(KEEP);if(stale.length){const {error:e}=await sb.storage.from(BUCKET).remove(stale.map(f=>f.path));if(e)throw e}
 return {ok:true,name,path,created_at:now.toISOString(),retention:KEEP,size:Buffer.byteLength(body)};
}
export async function GET(req:NextRequest){try{const cron=process.env.CRON_SECRET;if(cron&&req.headers.get('authorization')===`Bearer ${cron}`)return json(await backup(client(),'otomatik'));const sb=await admin(req),files=await list(sb);const backups=await Promise.all(files.map(async f=>{const {data}=await sb.storage.from(BUCKET).createSignedUrl(f.path,300);return{name:f.name,path:f.path,created_at:f.created_at,updated_at:f.updated_at,size:Number(f.metadata?.size||0),url:data?.signedUrl||''}}));return json({ok:true,count:files.length,retention:KEEP,backups,yedekler:backups,last:backups[0]||null})}catch(e:any){return json({error:e.message},e.status||500)}}
export async function POST(req:NextRequest){try{const sb=await admin(req),body=await req.json().catch(()=>({}));if(body.action==='restore'){if(body.confirm!=='GERI YUKLE')return json({error:'Geri yükleme onayı gerekli'},400);const j=await read(sb,String(body.path||'')),safety=await backup(sb,'guvenlik');const {data:summary,error}=await sb.rpc('trafo_restore2026',{incoming:j});if(error)throw error;return json({ok:true,restored:body.path,safetyBackup:safety.path,restoredAt:new Date().toISOString(),summary})}return json(await backup(sb,'manuel'))}catch(e:any){return json({error:e.message},e.status||500)}}
