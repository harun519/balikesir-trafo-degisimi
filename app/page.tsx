"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient, Session } from "@supabase/supabase-js";

const NEDENLER = [
  { ad: "ARIZA", renk: "#c00000" },
  { ad: "DÖNÜŞÜM", renk: "#0b5394" },
  { ad: "GÜÇ DEĞİŞİMİ", renk: "#93c47d" },
  { ad: "TRAFO İPTAL", renk: "#6fa8dc" },
  { ad: "YATIRIM", renk: "#ffd966" },
  { ad: "YENİ TESİS", renk: "#46bdc6" },
  { ad: "ARIZA RİSKİ", renk: "#ea9999" },
];

export default function Home() {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return null;
    }

    return createClient(url, key);
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [session, setSession] = useState<Session | null>(null);
  const [kontrolEdiliyor, setKontrolEdiliyor] = useState(true);
  const [yukleniyor, setYukleniyor] = useState(false);

  const [hata, setHata] = useState("");
  const [mesaj, setMesaj] = useState("");

  useEffect(() => {
    if (!supabase) {
      setHata(
        "Supabase bağlantı bilgileri bulunamadı. Vercel ortam değişkenlerini kontrol edin."
      );
      setKontrolEdiliyor(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setKontrolEdiliyor(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setKontrolEdiliyor(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function girisYap(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!supabase) {
      setHata("Supabase bağlantısı kurulamadı.");
      return;
    }

    if (!email.trim() || !password) {
      setHata("E-posta ve şifre alanlarını doldurun.");
      return;
    }

    setYukleniyor(true);
    setHata("");
    setMesaj("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setHata("E-posta veya şifre hatalı.");
      setYukleniyor(false);
      return;
    }

    if (data.session) {
      setSession(data.session);
      setMesaj("Giriş başarılı.");
    }

    setYukleniyor(false);
  }

  async function cikisYap() {
    if (!supabase) return;

    await supabase.auth.signOut();

    setSession(null);
    setEmail("");
    setPassword("");
    setMesaj("");
    setHata("");
  }

  if (kontrolEdiliyor) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-orange-500" />
          <p className="mt-4 text-sm text-slate-400">
            Sistem hazırlanıyor...
          </p>
        </div>
      </main>
    );
  }

  // ==========================================================
  // GİRİŞ YAPILDIYSA DASHBOARD
  // ==========================================================

  if (session) {
    return (
      <main className="min-h-screen bg-[#07111f] text-white">
        <div className="flex min-h-screen">
          {/* SOL MENÜ */}
          <aside className="hidden w-64 flex-col border-r border-slate-800 bg-[#0b1628] lg:flex">
            <div className="border-b border-slate-800 px-6 py-7">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">
                Balıkesir
              </div>

              <div className="mt-1 text-xl font-black">
                ⚡ Trafo Yönetimi
              </div>
            </div>

            <nav className="flex-1 space-y-2 p-4">
              <button className="w-full rounded-xl bg-orange-500 px-4 py-3 text-left font-bold text-white">
                📊 Dashboard
              </button>

              <button className="w-full rounded-xl px-4 py-3 text-left text-slate-300 transition hover:bg-slate-800">
                ➕ Yeni Kayıt
              </button>

              <button className="w-full rounded-xl px-4 py-3 text-left text-slate-300 transition hover:bg-slate-800">
                📋 Trafo Kayıtları
              </button>

              <button className="w-full rounded-xl px-4 py-3 text-left text-slate-300 transition hover:bg-slate-800">
                📈 Raporlar
              </button>
            </nav>

            <div className="border-t border-slate-800 p-4">
              <div className="mb-3 truncate text-xs text-slate-500">
                {session.user.email}
              </div>

              <button
                onClick={cikisYap}
                className="w-full rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
              >
                Çıkış Yap
              </button>
            </div>
          </aside>

          {/* ANA ALAN */}
          <section className="min-w-0 flex-1">
            <header className="flex items-center justify-between border-b border-slate-800 bg-[#0b1628] px-5 py-4 lg:px-8">
              <div>
                <h1 className="text-xl font-black lg:text-2xl">
                  Trafo Değişim Dashboard
                </h1>

                <p className="mt-1 text-xs text-slate-400 lg:text-sm">
                  Balıkesir trafo değişim kayıtları ve istatistikleri
                </p>
              </div>

              <button
                onClick={cikisYap}
                className="rounded-xl border border-slate-700 px-3 py-2 text-sm lg:hidden"
              >
                Çıkış
              </button>
            </header>

            <div className="p-5 lg:p-8">
              {/* ÜST BİLGİ */}
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-400">
                    Hoş geldiniz
                  </div>

                  <div className="mt-1 font-bold">
                    {session.user.email}
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/30 px-4 py-2 text-sm text-emerald-400">
                  ● Sistem Bağlantısı Aktif
                </div>
              </div>

              {/* KPI KARTLARI */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-800 bg-[#101d30] p-5">
                  <div className="text-sm text-slate-400">
                    TOPLAM KAYIT
                  </div>

                  <div className="mt-3 text-3xl font-black">
                    —
                  </div>

                  <div className="mt-2 text-xs text-slate-500">
                    Veritabanı bağlantısı hazır
                  </div>
                </div>

                {NEDENLER.slice(0, 3).map((neden) => (
                  <div
                    key={neden.ad}
                    className="overflow-hidden rounded-2xl border border-slate-800 bg-[#101d30]"
                  >
                    <div
                      className="h-1.5"
                      style={{ backgroundColor: neden.renk }}
                    />

                    <div className="p-5">
                      <div className="text-sm text-slate-400">
                        {neden.ad}
                      </div>

                      <div className="mt-3 text-3xl font-black">
                        —
                      </div>

                      <div className="mt-2 text-xs text-slate-500">
                        Kayıt sayısı
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* DEĞİŞİM NEDENLERİ */}
              <div className="mt-6 rounded-2xl border border-slate-800 bg-[#101d30] p-5 lg:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-black">
                      Değişim Nedenleri
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Sistemde kullanılan değişim kategorileri
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-400">
                    7 kategori
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {NEDENLER.map((neden) => (
                    <div
                      key={neden.ad}
                      className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3"
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: neden.renk,
                        }}
                      />

                      <span className="text-sm font-semibold">
                        {neden.ad}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ALT PANELLER */}
              <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <div className="min-h-72 rounded-2xl border border-slate-800 bg-[#101d30] p-6">
                  <div className="text-lg font-black">
                    Yıllara Göre Değişim
                  </div>

                  <div className="mt-2 text-sm text-slate-500">
                    Bir sonraki aşamada gerçek kayıtlar burada grafik olarak
                    gösterilecek.
                  </div>

                  <div className="mt-10 flex h-36 items-end gap-3">
                    {[42, 65, 55, 82, 72, 52].map((h, index) => (
                      <div
                        key={index}
                        className="flex-1 rounded-t-lg bg-orange-500/80"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="min-h-72 rounded-2xl border border-slate-800 bg-[#101d30] p-6">
                  <div className="text-lg font-black">
                    Son İşlemler
                  </div>

                  <div className="mt-2 text-sm text-slate-500">
                    Son eklenen trafo değişimleri burada gösterilecek.
                  </div>

                  <div className="mt-8 rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-500">
                    Henüz görüntülenecek kayıt yok.
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  // ==========================================================
  // GİRİŞ EKRANI
  // ==========================================================

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="min-h-screen flex">
        {/* SOL TARAF */}
        <section className="hidden lg:flex w-1/2 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-14 flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-3 rounded-2xl bg-orange-500 px-4 py-3 font-bold">
              ⚡ BALIKESİR TRAFO
            </div>

            <h1 className="mt-10 max-w-xl text-5xl font-black leading-tight">
              Trafo Değişim
              <span className="block text-orange-400">
                Yönetim Sistemi
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Trafo değişim kayıtlarını yönetin, yıllık ve aylık
              istatistikleri takip edin, arıza ve değişim nedenlerini tek
              ekrandan analiz edin.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-xl">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-2xl">
                📊
              </div>

              <div className="mt-3 font-bold">
                Canlı Dashboard
              </div>

              <div className="mt-1 text-sm text-slate-400">
                Yıllık ve aylık değişimler
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-2xl">
                🔐
              </div>

              <div className="mt-3 font-bold">
                Güvenli Erişim
              </div>

              <div className="mt-1 text-sm text-slate-400">
                Yetkili kullanıcı girişi
              </div>
            </div>
          </div>
        </section>

        {/* GİRİŞ FORMU */}
        <section className="flex w-full lg:w-1/2 items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <div className="text-2xl font-black">
                ⚡ BALIKESİR TRAFO
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
              <div className="mb-8">
                <div className="text-sm font-bold uppercase tracking-widest text-orange-400">
                  Yönetim Paneli
                </div>

                <h2 className="mt-2 text-3xl font-black">
                  Giriş Yap
                </h2>

                <p className="mt-2 text-slate-400">
                  Hesap bilgilerinizle sisteme giriş yapın.
                </p>
              </div>

              <form
                className="space-y-5"
                onSubmit={girisYap}
              >
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    E-posta
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="ornek@firma.com"
                    autoComplete="email"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Şifre
                  </label>

                  <input
                    type="password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-orange-500"
                  />
                </div>

                {hata && (
                  <div className="rounded-xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
                    {hata}
                  </div>
                )}

                {mesaj && (
                  <div className="rounded-xl border border-emerald-900 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-300">
                    {mesaj}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={yukleniyor}
                  className="w-full rounded-xl bg-orange-500 px-4 py-3 font-black text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {yukleniyor
                    ? "Giriş Yapılıyor..."
                    : "Sisteme Giriş Yap"}
                </button>
              </form>

              <div className="mt-6 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
                BALIKESİR TRAFO DEĞİŞİMİ
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
