import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const UYGULAMA_ALANLARI = [
  "yil","ay","ilce","mahalle","tr","lokasyon_id","trafo_id","trafo_tipi",
  "sokulen_gucu","sokulen_gerilim","sokulen_markasi","sokulen_seri_no","sokulen_imal_yili","sokulen_trafo_tipi",
  "sokulen_tamir_yili","sokulen_tamir_firmasi","sokulen_yuklenici",
  "takilan_gucu","takilan_gerilim","takilan_markasi","takilan_seri_no","takilan_imal_yili","takilan_trafo_tipi",
  "takilan_tamir_yili","takilan_tamir_firmasi","tarih","degisim_nedeni","aciklama",
] as const;

const NEDENLER = ["ARIZA","DÖNÜŞÜM","GÜÇ DEĞİŞİMİ","TRAFO İPTAL","YATIRIM","YENİ TESİS","ARIZA RİSKİ"];

function jsonSchema() {
  const properties: Record<string, unknown> = {};
  for (const alan of UYGULAMA_ALANLARI) properties[alan] = { type: ["string", "null"] };
  return {
    type: "object",
    properties,
    required: [...UYGULAMA_ALANLARI],
    additionalProperties: false,
  };
}

function outputText(apiSonucu: any): string {
  const parcalar: string[] = [];
  for (const item of apiSonucu?.output || []) {
    if (item?.type !== "message") continue;
    for (const c of item?.content || []) {
      if (c?.type === "output_text" && typeof c?.text === "string") parcalar.push(c.text);
    }
  }
  return parcalar.join("\n").trim();
}

async function yetkiKontrol(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return { ok: false as const, status: 500, error: "Supabase ayarları eksik." };

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!userRes.ok) return { ok: false as const, status: 401, error: "Oturum doğrulanamadı." };
  const user = await userRes.json();

  const rolRes = await fetch(`${supabaseUrl}/rest/v1/app_users?id=eq.${encodeURIComponent(user.id)}&select=role&limit=1`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!rolRes.ok) return { ok: false as const, status: 403, error: "Kullanıcı yetkisi okunamadı." };
  const roller = await rolRes.json();
  const rol = roller?.[0]?.role;
  if (rol !== "admin" && rol !== "editor") return { ok: false as const, status: 403, error: "Form okuma için düzenleme yetkisi gerekiyor." };
  return { ok: true as const };
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const accessToken = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!accessToken) return NextResponse.json({ error: "Oturum bilgisi bulunamadı." }, { status: 401 });

    const yetki = await yetkiKontrol(accessToken);
    if (!yetki.ok) return NextResponse.json({ error: yetki.error }, { status: yetki.status });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY Vercel ortam değişkeni tanımlı değil." }, { status: 500 });

    const fd = await req.formData();
    const file = fd.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Form dosyası bulunamadı." }, { status: 400 });

    const izinli = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!izinli.includes(file.type)) return NextResponse.json({ error: "Yalnızca PDF, JPG, PNG veya WEBP yüklenebilir." }, { status: 400 });
    if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "Dosya en fazla 4 MB olabilir." }, { status: 400 });

    const bytes = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${bytes.toString("base64")}`;
    const dosyaIcerigi = file.type === "application/pdf"
      ? { type: "input_file", filename: file.name || "trafo-formu.pdf", file_data: dataUrl }
      : { type: "input_image", image_url: dataUrl, detail: "high" };

    const talimat = `
Bu belge bir elektrik dağıtım şirketinin taranmış trafo değişim/montaj formudur.
Görevin yalnızca BALIKESİR TRAFO DEĞİŞİM uygulamasında bulunan alanları okumaktır.
Belgede bulunan fakat aşağıdaki uygulama alanları arasında olmayan tüm satırları, ölçümleri, imzaları, onayları, pano testlerini, bağlantı grubu/kısa devre gibi uygulamada karşılığı olmayan bilgileri TAMAMEN ATLA. Bunları açıklama alanına da taşıma.

Kurallar:
- Görmediğin veya emin olmadığın değeri uydurma; null döndür.
- Tarihi YYYY-MM-DD biçiminde döndür. Tarih varsa yil ve ay alanını da üret; ay Türkçe büyük harf olsun (OCAK...ARALIK).
- İlçe ve mahalleyi büyük harfle yaz.
- trafo_tipi alanı KONUM/MONTAJ TİPİDİR; yalnızca DİREK veya BİNA gibi konumu yaz. Sökülen/takılan trafonun GEN.DEPOLU/HERMETİK vb. tipi ayrı alanlardadır.
- tr alanına formdaki TR / Trafo Bölge Adı bilgisini yaz. Lokasyon ID ve Trafo ID sadece belgede açıkça varsa doldur; tahmin etme.
- Güç alanlarında yalnızca sayısal kVA değerini yaz (ör. 160).
- Gerilimi uygulamadaki biçime mümkünse normalize et (ör. 34,5/0,4).
- Marka, seri no ve imal yılını sökülen ve takılan sütunlarını karıştırmadan oku.
- Değişim nedeni sadece şu uygulama değerlerinden biri olabilir: ${NEDENLER.join(", ")}. Formdaki işaretli kutuyu ve metni birlikte değerlendir. Örn. güç değişimi/kademe yetersizliği işaretliyse GÜÇ DEĞİŞİMİ.
- aciklama yalnızca formda gerçekten açıklama/not alanında uygulamadaki kayda doğrudan ait bir metin varsa doldur; uygulamada karşılığı olmayan satırları burada biriktirme.
- Çıktıda yalnızca şemadaki alanlar olsun.
`;

    const apiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        store: false,
        input: [{
          role: "user",
          content: [dosyaIcerigi, { type: "input_text", text: talimat }],
        }],
        text: {
          format: {
            type: "json_schema",
            name: "trafo_formu",
            strict: true,
            schema: jsonSchema(),
          },
        },
      }),
    });

    const apiJson = await apiRes.json();
    if (!apiRes.ok) {
      console.error("OpenAI form okuma hatası:", apiJson);
      return NextResponse.json({ error: apiJson?.error?.message || "Form okuma servisi hata verdi." }, { status: 502 });
    }

    const metin = outputText(apiJson);
    if (!metin) return NextResponse.json({ error: "Formdan yapılandırılmış veri alınamadı." }, { status: 502 });

    let data: Record<string, string | null>;
    try { data = JSON.parse(metin); }
    catch { return NextResponse.json({ error: "Okunan form verisi çözümlenemedi." }, { status: 502 }); }

    const temiz: Record<string, string | null> = {};
    for (const alan of UYGULAMA_ALANLARI) {
      const v = data?.[alan];
      temiz[alan] = typeof v === "string" && v.trim() ? v.trim() : null;
    }

    return NextResponse.json({ data: temiz });
  } catch (err) {
    console.error("/api/form-oku:", err);
    return NextResponse.json({ error: "Form okunurken beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
