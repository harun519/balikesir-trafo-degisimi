import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DRIVE_AGUSTOS_2026_FOLDER_ID = process.env.GOOGLE_DRIVE_AGUSTOS_2026_FOLDER_ID || "1w6rqCwijt-PA8KXbm8VEbbjWK5YTYchF";
const STORAGE_BUCKET = "trafo-form-arsivi";
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const ILCE_LIST = ["BALYA","İVRİNDİ","SAVAŞTEPE","SINDIRGI","BİGADİÇ","DURSUNBEY","KEPSUT","SUSURLUK","ALTIEYLÜL","KARESİ"];

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
};

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getGoogleAccessToken() {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!rawJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON ortam değişkeni eksik.");

  let serviceAccount: { client_email?: string; private_key?: string };
  try {
    serviceAccount = JSON.parse(rawJson);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON geçerli JSON değil.");
  }

  const email = serviceAccount.client_email;
  const privateKey = serviceAccount.private_key;

  if (!email || !privateKey) {
    throw new Error("Google servis hesabı JSON içinde client_email veya private_key eksik.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey);
  const assertion = `${unsigned}.${base64Url(signature)}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });

  const tokenJson = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenJson.access_token) {
    throw new Error(tokenJson?.error_description || "Google Drive erişim anahtarı alınamadı.");
  }
  return tokenJson.access_token as string;
}

async function listFolder(accessToken: string, folderId: string): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken,files(id,name,mimeType,size)",
      pageSize: "1000",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json?.error?.message || "Google Drive klasörü okunamadı.");
    files.push(...(json.files || []));
    pageToken = json.nextPageToken || "";
  } while (pageToken);
  return files;
}

function normalizeTr(value: string) {
  return value.toLocaleUpperCase("tr-TR").trim();
}

function safeAscii(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i").replace(/İ/g, "I")
    .replace(/ş/g, "s").replace(/Ş/g, "S")
    .replace(/ğ/g, "g").replace(/Ğ/g, "G")
    .replace(/ü/g, "u").replace(/Ü/g, "U")
    .replace(/ö/g, "o").replace(/Ö/g, "O")
    .replace(/ç/g, "c").replace(/Ç/g, "C")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function inferMetadata(fileName: string) {
  const upper = normalizeTr(fileName.replace(/\.(pdf|jpe?g|png|webp)$/i, ""));
  const ilce = ILCE_LIST.find((x) => upper.startsWith(x) || upper.includes(`${x} -`) || upper.includes(`${x}-`)) || null;
  let tr: string | null = upper;
  if (ilce) {
    tr = upper.replace(new RegExp(`^${ilce.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[-–—]?\\s*`, "i"), "").trim() || upper;
  }
  return { ilce, tr };
}

async function downloadDriveFile(accessToken: string, fileId: string) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const msg = await response.text().catch(() => "");
    throw new Error(`Drive dosyası indirilemedi (${response.status}) ${msg.slice(0, 180)}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json({ error: "Supabase sunucu ortam değişkenleri eksik." }, { status: 500 });
    }

    const authorization = req.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });

    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    const user = userData.user;
    if (userError || !user) return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401 });

    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: roleRow, error: roleError } = await adminClient.from("app_users").select("role").eq("id", user.id).maybeSingle();
    if (roleError) return NextResponse.json({ error: "Kullanıcı yetkisi okunamadı: " + roleError.message }, { status: 500 });
    if (!roleRow || !["admin", "editor"].includes(roleRow.role)) {
      return NextResponse.json({ error: "Bu işlem için Admin veya Editor yetkisi gerekir." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const yil = Number(body?.yil);
    const ay = normalizeTr(String(body?.ay || ""));
    if (yil !== 2026 || ay !== "AĞUSTOS") {
      return NextResponse.json({ error: "Bu test sürümü yalnızca 2026 AĞUSTOS aktarımına izin veriyor." }, { status: 400 });
    }

    const accessToken = await getGoogleAccessToken();
    const monthItems = await listFolder(accessToken, DRIVE_AGUSTOS_2026_FOLDER_ID);
    const candidates = monthItems.filter((x) => ALLOWED_MIME.has(x.mimeType));

    let aktarilan = 0;
    let atlanan = 0;
    let hatali = 0;
    const detaylar: Array<{ dosya: string; durum: string; mesaj?: string }> = [];

    for (const item of candidates) {
      try {
        const declaredSize = Number(item.size || 0);
        if (declaredSize > MAX_FILE_SIZE) {
          atlanan++;
          detaylar.push({ dosya: item.name, durum: "atlandi", mesaj: "15 MB sınırını aşıyor." });
          continue;
        }

        const safeName = safeAscii(item.name) || `drive_${item.id}`;
        const path = `${yil}/${safeAscii(ay)}/drive_${item.id}_${safeName}`;
        const { data: existing } = await adminClient.from("trafo_form_arsivi").select("id").eq("dosya_yolu", path).maybeSingle();
        if (existing) {
          atlanan++;
          detaylar.push({ dosya: item.name, durum: "atlandi", mesaj: "Daha önce aktarılmış." });
          continue;
        }

        const fileBuffer = await downloadDriveFile(accessToken, item.id);
        if (fileBuffer.length > MAX_FILE_SIZE) {
          atlanan++;
          detaylar.push({ dosya: item.name, durum: "atlandi", mesaj: "İndirilen dosya 15 MB sınırını aşıyor." });
          continue;
        }

        const { error: storageError } = await adminClient.storage.from(STORAGE_BUCKET).upload(path, fileBuffer, {
          contentType: item.mimeType,
          upsert: false,
        });
        if (storageError) throw new Error("Storage: " + storageError.message);

        const meta = inferMetadata(item.name);
        const { error: insertError } = await adminClient.from("trafo_form_arsivi").insert({
          yil,
          ay,
          ilce: meta.ilce,
          mahalle: null,
          tr: meta.tr,
          lokasyon_id: null,
          trafo_id: null,
          dosya_adi: item.name,
          dosya_yolu: path,
          mime_type: item.mimeType,
          dosya_boyutu: fileBuffer.length,
          aciklama: `Google Drive toplu aktarım • Drive ID: ${item.id}`,
          yukleyen_id: user.id,
          yukleyen_email: user.email || null,
        });
        if (insertError) {
          await adminClient.storage.from(STORAGE_BUCKET).remove([path]);
          throw new Error("Veritabanı: " + insertError.message);
        }

        aktarilan++;
        detaylar.push({ dosya: item.name, durum: "aktarildi" });
      } catch (error: any) {
        hatali++;
        detaylar.push({ dosya: item.name, durum: "hata", mesaj: error?.message || "Bilinmeyen hata" });
      }
    }

    return NextResponse.json({ yil, ay, bulunan: candidates.length, aktarilan, atlanan, hatali, detaylar });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Google Drive aktarımında bilinmeyen hata oluştu." }, { status: 500 });
  }
}
