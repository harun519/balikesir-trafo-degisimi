import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";

export const runtime="nodejs";
export const dynamic="force-dynamic";

type Role="admin"|"editor"|"viewer";
type AppRole=Role|null;

type AppName="trafo"|"scada";

function sb(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error("Supabase ayarı eksik");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
function fail(error:string,status=400){return NextResponse.json({ok:false,error},{status,headers:{"Cache-Control":"no-store"}})}
function token(req:NextRequest){const h=req.headers.get("authorization")||"";return h.startsWith("Bearer ")?h.slice(7).trim():""}
function role(v:unknown):AppRole{return v==="admin"||v==="editor"||v==="viewer"?v:null}
function bool(v:unknown,fallback=false){return typeof v==="boolean"?v:fallback}
function validApp(v:unknown):AppName|null{return v==="trafo"||v==="scada"?v:null}

async function requireAdmin(req:NextRequest,client:ReturnType<typeof sb>){
  const jwt=token(req);if(!jwt)throw Object.assign(new Error("Yönetici oturumu gerekli."),{status:401});
  const {data,error}=await client.auth.getUser(jwt);if(error||!data.user)throw Object.assign(new Error("Yönetici oturumu doğrulanamadı."),{status:401});
  const uid=data.user.id;
  const [{data:a},{data:s}]=await Promise.all([
    client.from("app_users").select("role").eq("id",uid).maybeSingle(),
    client.from("scada_users").select("role").eq("id",uid).maybeSingle()
  ]);
  if(a?.role!=="admin"&&s?.role!=="admin")throw Object.assign(new Error("Bu işlem yalnızca Admin rolüne açıktır."),{status:403});
  return data.user;
}

async function allAuthUsers(client:ReturnType<typeof sb>){
  const out:any[]=[];
  for(let page=1;page<=20;page++){
    const {data,error}=await client.auth.admin.listUsers({page,perPage:100});
    if(error)throw error;
    out.push(...(data.users||[]));
    if((data.users||[]).length<100)break;
  }
  return out;
}
async function findUser(client:ReturnType<typeof sb>,email:string){
  const users=await allAuthUsers(client);
  return users.find(u=>String(u.email||"").toLowerCase()===email.toLowerCase())||null;
}

async function combined(client:ReturnType<typeof sb>){
  const [users,{data:trafo,error:te},{data:scada,error:se}]=await Promise.all([
    allAuthUsers(client),
    client.from("app_users").select("id,email,role,created_at,updated_at"),
    client.from("scada_users").select("id,email,role,created_at,updated_at")
  ]);
  if(te)throw te;if(se)throw se;
  const map=new Map<string,any>();
  for(const u of users){
    const md=(u.user_metadata||{}) as Record<string,any>;
    map.set(u.id,{
      id:u.id,
      email:u.email||"",
      trafoRole:null,
      scadaRole:null,
      trafoManaged:!!md.portal_trafo_managed,
      scadaManaged:!!md.portal_scada_managed,
      lastSignIn:u.last_sign_in_at||null,
      createdAt:u.created_at||null
    });
  }
  for(const x of trafo||[]){const cur=map.get(x.id)||{id:x.id,email:x.email||"",trafoRole:null,scadaRole:null,trafoManaged:false,scadaManaged:false};cur.email=cur.email||x.email||"";cur.trafoRole=x.role;cur.trafoManaged=true;map.set(x.id,cur)}
  for(const x of scada||[]){const cur=map.get(x.id)||{id:x.id,email:x.email||"",trafoRole:null,scadaRole:null,trafoManaged:false,scadaManaged:false};cur.email=cur.email||x.email||"";cur.scadaRole=x.role;cur.scadaManaged=true;map.set(x.id,cur)}
  return [...map.values()].filter(x=>x.trafoManaged||x.scadaManaged||x.trafoRole||x.scadaRole).sort((a,b)=>String(a.email).localeCompare(String(b.email),"tr"));
}

async function setAccess(client:ReturnType<typeof sb>,table:"app_users"|"scada_users",id:string,email:string,next:AppRole){
  if(!next){const {error}=await client.from(table).delete().eq("id",id);if(error)throw error;return}
  const {error}=await client.from(table).upsert({id,email,role:next,updated_at:new Date().toISOString()},{onConflict:"id"});
  if(error)throw error;
}

async function updateManagedMetadata(client:ReturnType<typeof sb>,user:any,patch:Record<string,any>){
  const next={...(user?.user_metadata||{}),...patch};
  for(const [k,v] of Object.entries(next))if(v===undefined)delete next[k];
  const {data,error}=await client.auth.admin.updateUserById(user.id,{user_metadata:next});
  if(error)throw error;
  return data.user||user;
}

export async function GET(req:NextRequest){
  try{const client=sb();await requireAdmin(req,client);return NextResponse.json({ok:true,users:await combined(client)},{headers:{"Cache-Control":"no-store"}})}
  catch(e:any){return fail(e?.message||"Kullanıcılar alınamadı.",Number(e?.status)||500)}
}

export async function POST(req:NextRequest){
  try{
    const client=sb();
    const admin=await requireAdmin(req,client);
    const body=await req.json().catch(()=>({})) as any;
    const action=String(body.action||"save");

    if(action==="remove-app"){
      const id=String(body.id||"");const app=validApp(body.app);
      if(!id||!app)return fail("Kullanıcı kimliği ve uygulama gerekli.");
      if(id===admin.id)return fail("Kendi yönetici hesabını silemezsin.",400);
      const users=await allAuthUsers(client);const user=users.find(u=>u.id===id);if(!user)return fail("Kullanıcı bulunamadı.",404);
      const table=app==="trafo"?"app_users":"scada_users";
      await setAccess(client,table,id,String(user.email||""),null);
      const key=app==="trafo"?"portal_trafo_managed":"portal_scada_managed";
      const lastKey=app==="trafo"?"portal_trafo_last_role":"portal_scada_last_role";
      const md={...(user.user_metadata||{}),[key]:false,[lastKey]:undefined};
      const updated=await updateManagedMetadata(client,user,md);
      const otherApp=app==="trafo"?"scada":"trafo";
      const otherTable=otherApp==="trafo"?"app_users":"scada_users";
      const otherManaged=!!(updated.user_metadata||{})[otherApp==="trafo"?"portal_trafo_managed":"portal_scada_managed"];
      const {data:otherRow}=await client.from(otherTable).select("id").eq("id",id).maybeSingle();
      if(!otherManaged&&!otherRow){const {error}=await client.auth.admin.deleteUser(id);if(error)throw error}
      return NextResponse.json({ok:true,users:await combined(client)},{headers:{"Cache-Control":"no-store"}});
    }

    if(action==="delete"){
      const id=String(body.id||"");if(!id)return fail("Kullanıcı kimliği gerekli.");
      if(id===admin.id)return fail("Kendi yönetici hesabını silemezsin.",400);
      const [{error:ae},{error:se}]=await Promise.all([
        client.from("app_users").delete().eq("id",id),
        client.from("scada_users").delete().eq("id",id)
      ]);
      if(ae)throw ae;if(se)throw se;
      if(body.deleteAccount===true){const {error}=await client.auth.admin.deleteUser(id);if(error)throw error}
      return NextResponse.json({ok:true,users:await combined(client)},{headers:{"Cache-Control":"no-store"}});
    }

    const email=String(body.email||"").trim().toLowerCase();
    const password=String(body.password||"");
    const trafoRole=role(body.trafoRole),scadaRole=role(body.scadaRole);
    if(!email||!email.includes("@"))return fail("Geçerli bir e-posta gerekli.");

    let user=await findUser(client,email);
    if(!user){
      if(password.length<6)return fail("Yeni kullanıcı şifresi en az 6 karakter olmalı.");
      const {data,error}=await client.auth.admin.createUser({email,password,email_confirm:true});
      if(error||!data.user)throw error||new Error("Kullanıcı oluşturulamadı.");
      user=data.user;
    }else if(password){
      if(password.length<6)return fail("Şifre en az 6 karakter olmalı.");
      const {data,error}=await client.auth.admin.updateUserById(user.id,{password,email_confirm:true});if(error)throw error;user=data.user||user;
    }

    const currentMd=(user.user_metadata||{}) as Record<string,any>;
    const trafoManaged=Object.prototype.hasOwnProperty.call(body,"trafoManaged")?bool(body.trafoManaged):Object.prototype.hasOwnProperty.call(body,"trafoRole")?true:!!currentMd.portal_trafo_managed;
    const scadaManaged=Object.prototype.hasOwnProperty.call(body,"scadaManaged")?bool(body.scadaManaged):Object.prototype.hasOwnProperty.call(body,"scadaRole")?true:!!currentMd.portal_scada_managed;

    await Promise.all([
      setAccess(client,"app_users",user.id,email,trafoManaged?trafoRole:null),
      setAccess(client,"scada_users",user.id,email,scadaManaged?scadaRole:null)
    ]);

    user=await updateManagedMetadata(client,user,{
      portal_trafo_managed:trafoManaged,
      portal_scada_managed:scadaManaged,
      portal_trafo_last_role:trafoManaged?(trafoRole||currentMd.portal_trafo_last_role||"viewer"):undefined,
      portal_scada_last_role:scadaManaged?(scadaRole||currentMd.portal_scada_last_role||"viewer"):undefined
    });

    return NextResponse.json({ok:true,user:{id:user.id,email,trafoRole:trafoManaged?trafoRole:null,scadaRole:scadaManaged?scadaRole:null,trafoManaged,scadaManaged},users:await combined(client)},{headers:{"Cache-Control":"no-store"}});
  }catch(e:any){return fail(e?.message||"Kullanıcı kaydedilemedi.",Number(e?.status)||500)}
}
