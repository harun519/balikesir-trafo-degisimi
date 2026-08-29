import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STORAGE_BUCKET = "trafo-form-arsivi";
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const ILCE_LIST = ["BALYA","İVRİNDİ","SAVAŞTEPE","SINDIRGI","BİGADİÇ","DURSUNBEY","KEPSUT","SUSURLUK","ALTIEYLÜL","KARESİ"];

const DRIVE_MONTH_FOLDERS: Record<string, string> = {
  "2022|OCAK":"15hDyUbjj_AK6ea_6vjqUndo4VtBBlvjc",
  "2022|ŞUBAT":"1NkmH_ru8q-lzZCnCMnB9bZAfgmDAtO3R",
  "2022|MART":"1hzTtZGQBsPnXFQBP1MUilWZ7fByY12HW",
  "2022|MAYIS":"1d_iWyY2kdMbClWutfRg8Qlv8uOfuOB9T",
  "2022|HAZİRAN":"1R8PMUV7LURybFeoUyt9LtxYmDyCAZjGf",
  "2022|TEMMUZ":"1eWAuifF1sPft4Aea2cx3zkxUD_A0wglI",
  "2022|AĞUSTOS":"15JWrvNfPca6ZdFpHmttGHmMAqLnmmHBV",
  "2022|EYLÜL":"1b3eXKypMzZ6yVE27fF7Jwv2KwIJP1BWK",
  "2022|EKİM":"1ku8RpWjs4fe-pQ3sHjlPR6bKa844D46o",
  "2022|KASIM":"17143FJE-n9t3MlM-yW6Mlg8i7H7Ih74f",

  "2023|OCAK":"1WeLYJt6xP28jbkZdP9NL-aOWtwh2-Ucs",
  "2023|ŞUBAT":"1ZrRvmER9Nu13rlJCWfbaX_Ypcti8oPBG",
  "2023|MART":"1kLT3seevY7nYANkculOYYGfNKx-s5Gdw",
  "2023|NİSAN":"1D-2_uVLiTSR8BWoX1KXtuwXTDFqi933N",
  "2023|MAYIS":"1pEyplCWwHkR2UVW21J18TiS1rI892h9d",
  "2023|HAZİRAN":"1mQtHmMTqsUpTeMTUAiD2skt23monxyxK",
  "2023|TEMMUZ":"1ySB-g0ptzO9PUSISqyy_8aoVkhcLyxFC",
  "2023|AĞUSTOS":"1e5N_mk1_Y5McC0h5jDGbn6uoAEL5U5In",
  "2023|EYLÜL":"1ApmUa1oFsrkPm7ODtUUUy6P7BCntkrDI",
  "2023|EKİM":"1w_BFHxbNavkr-T51b4oxbdrFi1G59PGK",
  "2023|KASIM":"1DJE2wlT4HPlJidPlbhMD7lN26rRexnLA",
  "2023|ARALIK":"1_7SupN8RgO28Z4_94fshM9xjwsxcmzjR",

  "2024|ŞUBAT":"1Q6ljSw0vAeU6uV3loT35WYqYLIYqyXB6",
  "2024|MART":"19Yfy5WnUJcHjRZoIfy95z_4RJBYARYXW",
  "2024|NİSAN":"1lO4w7Y-VruuzVtV9pYGVN2bqb2JYUKVP",
  "2024|MAYIS":"1r9vwnm5sjYNqcVEQRQcT_ur4y7_aaSNv",
  "2024|HAZİRAN":"1knF6KFn8h8HP4FzYYxmXef_PxA-AW_vN",
  "2024|TEMMUZ":"10-oyiDUtn_l6SDsZdrKZioREvWAnkk_1",
  "2024|AĞUSTOS":"1v2xzMX-f_Et7itTq7ZX_oCZV-WEptr6i",
  "2024|EYLÜL":"1deVEAHTSUMWMcrpAscwiA9zz2ek1aFH0",
  "2024|EKİM":"19kNpuJqIjTy0hE6ZCujeKmPiliBZwdXy",
  "2024|KASIM":"1_baPv1cFMMP-Wv8fsEcIbRx7EW_BrzW4",
  "2024|ARALIK":"1zRdzXIvBBHrYNqUXw985AbqdiQL93mW4",

  "2025|OCAK":"1_n7vKipE8KhZ21UtEABjL5o_RmfA2UW0",
  "2025|ŞUBAT":"1R0wb8YljGDNt9cofqv4wY4sb1lAixNVL",
  "2025|MART":"1RcmkkNg2ko6V0OoCJ1SEoyU5eWHWde7T",
  "2025|NİSAN":"1KYE1j7OOULS79Ne9LqCNf5HmBd08W7Kz",
  "2025|MAYIS":"1csuyG7rDql2PA8A3KBjnRNDk1xwh8stc",
  "2025|HAZİRAN":"1RyruHxWZy7z9DBg8TNRaUJh-WpFoy8ca",
  "2025|TEMMUZ":"1GEpgGqgpgyoQCA0_7DdXTvSzC1TMX739",
  "2025|AĞUSTOS":"1LoFg7p9bj5r4M9wwc9Y6i50JSRQgBLDs",
  "2025|EYLÜL":"16hVkI8RKpzP28H_gi4iPH9_fAu48b8o9",
  "2025|EKİM":"1UXtzXGQumPlp65oQoYdzktqT7UmqV8Ff",
  "2025|KASIM":"1LPsAY3b0Q9lRKOUrFdcN9jpZRpmC2VYN",
  "2025|ARALIK":"1kZQ9yJMy70WkpfG0MStUmAtbr6JZtwgt",

  "2026|OCAK":"1Niufjc0nuJqAMw7gLh7bqEqWeTI4pzYu",
  "2026|ŞUBAT":"1FlbEpvdrVuzSRfLRIDXHMLm1vF8QBswi",
  "2026|MART":"1IrG718E9K97WR59kqLEufTfhPMgqQOrF",
  "2026|NİSAN":"1Gv4uGuXsPnyzHAJLBI7KS2dHoDxwtSKR",
  "2026|MAYIS":"1xIDlV7Ra1JdX0U-F09TPS_9XUjvW_qXg",
  "2026|HAZİRAN":"1Ikf1-7spsSOwAT1S5LXTN0sn14UyRCqQ",
  "2026|TEMMUZ":"1tRsPpn3gpjEBM_2SKiVIw9SkNuGpLW6Z",
  "2026|AĞUSTOS":"1w6rqCwijt-PA8KXbm8VEbbjWK5YTYchF"
};

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
  if (!email || !privateKey) throw new Error("Google servis hesabı JSON içinde client_email veya private_key eksik.");

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
  const ilce = ILCE_LIST.find((x) =>
    upper.startsWith(x) || upper.includes(`${x} -`) || upper.includes(`${x}-`)
  ) || null;

  let tr: string | null = upper;
  if (ilce) {
    tr = upper
      .replace(new RegExp(`^${ilce.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[-–—]?\\s*`, "i"), "")
      .trim() || upper;
  }
  return { ilce, tr };
}

async function downloadDriveFile(accessToken: string, fileId: string) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }
  );

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

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    const user = userData.user;
    if (userError || !user) {
      return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401 });
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: roleRow, error: roleError } = await adminClient
      .from("app_users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (roleError) {
      return NextResponse.json({ error: "Kullanıcı yetkisi okunamadı: " + roleError.message }, { status: 500 });
    }
    if (!roleRow || !["admin", "editor"].includes(roleRow.role)) {
      return NextResponse.json({ error: "Bu işlem için Admin veya Editor yetkisi gerekir." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const yil = Number(body?.yil);
    const ay = normalizeTr(String(body?.ay || ""));
    const folderId = DRIVE_MONTH_FOLDERS[`${yil}|${ay}`];

    if (!folderId) {
      return NextResponse.json({ error: `${yil} ${ay} için tanımlı Google Drive klasörü yok.` }, { status: 400 });
    }

    const accessToken = await getGoogleAccessToken();
    const monthItems = await listFolder(accessToken, folderId);
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

        // Drive ID path'in içinde olduğu için aynı Drive dosyası ikinci kez yüklenmez.
        // 2026 AĞUSTOS testinde kullanılan yol biçimiyle aynıdır.
        const safeName = safeAscii(item.name) || `drive_${item.id}`;
        const path = `${yil}/${safeAscii(ay)}/drive_${item.id}_${safeName}`;

        const { data: existing } = await adminClient
          .from("trafo_form_arsivi")
          .select("id")
          .eq("dosya_yolu", path)
          .maybeSingle();

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

        const { error: storageError } = await adminClient.storage
          .from(STORAGE_BUCKET)
          .upload(path, fileBuffer, {
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
        detaylar.push({
          dosya: item.name,
          durum: "hata",
          mesaj: error?.message || "Bilinmeyen hata"
        });
      }
    }

    return NextResponse.json({
      yil,
      ay,
      bulunan: candidates.length,
      aktarilan,
      atlanan,
      hatali,
      detaylar
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Google Drive aktarımında bilinmeyen hata oluştu." },
      { status: 500 }
    );
  }
}
