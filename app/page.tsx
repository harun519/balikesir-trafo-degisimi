"use client";

import { useState } from "react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="min-h-screen flex">
        <section className="hidden lg:flex w-1/2 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-14 flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-3 rounded-2xl bg-orange-500 px-4 py-3 font-bold">
              ⚡ BALIKESİR TRAFO
            </div>

            <h1 className="mt-10 max-w-xl text-5xl font-black leading-tight">
              Trafo Değişim
              <span className="block text-orange-400">Yönetim Sistemi</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Trafo değişim kayıtlarını yönetin, yıllık ve aylık istatistikleri
              takip edin, arıza ve değişim nedenlerini tek ekrandan analiz edin.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-xl">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-2xl">📊</div>
              <div className="mt-3 font-bold">Canlı Dashboard</div>
              <div className="mt-1 text-sm text-slate-400">
                Yıllık ve aylık değişimler
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-2xl">🔐</div>
              <div className="mt-3 font-bold">Güvenli Erişim</div>
              <div className="mt-1 text-sm text-slate-400">
                Yetkili kullanıcı girişi
              </div>
            </div>
          </div>
        </section>

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
                onSubmit={(e) => {
                  e.preventDefault();
                }}
              >
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    E-posta
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@firma.com"
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
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-orange-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-orange-500 px-4 py-3 font-black text-white transition hover:bg-orange-400"
                >
                  Sisteme Giriş Yap
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
