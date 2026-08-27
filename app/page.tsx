"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createClient,
  Session,
} from "@supabase/supabase-js";


// ============================================================
// SABİTLER
// ============================================================

const AYLAR = [
  "OCAK",
  "ŞUBAT",
  "MART",
  "NİSAN",
  "MAYIS",
  "HAZİRAN",
  "TEMMUZ",
  "AĞUSTOS",
  "EYLÜL",
  "EKİM",
  "KASIM",
  "ARALIK",
];

const NEDENLER = [
  {
    ad: "ARIZA",
    renk: "#C00000",
  },
  {
    ad: "DÖNÜŞÜM",
    renk: "#0B5394",
  },
  {
    ad: "GÜÇ DEĞİŞİMİ",
    renk: "#93C47D",
  },
  {
    ad: "TRAFO İPTAL",
    renk: "#6FA8DC",
  },
  {
    ad: "YATIRIM",
    renk: "#FFD966",
  },
  {
    ad: "YENİ TESİS",
    renk: "#46BDC6",
  },
  {
    ad: "ARIZA RİSKİ",
    renk: "#EA9999",
  },
];


// ============================================================
// TİPLER
// ============================================================

type Sayfa =
  | "dashboard"
  | "yeni"
  | "kayitlar";

type TrafoKaydi = {
  id: number;

  sira_no: number | null;

  yil: number | null;
  ay: string | null;

  ilce: string | null;
  mahalle: string | null;
  tr: string | null;

  lokasyon_id: string | null;
  trafo_id: string | null;
  trafo_tipi: string | null;

  sokulen_gucu: string | null;
  sokulen_gerilim: string | null;
  sokulen_markasi: string | null;
  sokulen_seri_no: string | null;
  sokulen_imal_yili: string | null;
  sokulen_trafo_tipi: string | null;
  sokulen_tamir_yili: string | null;
  sokulen_tamir_firmasi: string | null;
  sokulen_yuklenici: string | null;

  takilan_gucu: string | null;
  takilan_gerilim: string | null;
  takilan_markasi: string | null;
  takilan_seri_no: string | null;
  takilan_imal_yili: string | null;
  takilan_trafo_tipi: string | null;
  takilan_tamir_yili: string | null;
  takilan_tamir_firmasi: string | null;

  tarih: string | null;

  degisim_nedeni: string | null;

  aciklama: string | null;

  created_at?: string;
  updated_at?: string;
};

type FormData = {
  yil: string;
  ay: string;

  ilce: string;
  mahalle: string;
  tr: string;

  lokasyon_id: string;
  trafo_id: string;
  trafo_tipi: string;

  sokulen_gucu: string;
  sokulen_gerilim: string;
  sokulen_markasi: string;
  sokulen_seri_no: string;
  sokulen_imal_yili: string;
  sokulen_trafo_tipi: string;
  sokulen_tamir_yili: string;
  sokulen_tamir_firmasi: string;
  sokulen_yuklenici: string;

  takilan_gucu: string;
  takilan_gerilim: string;
  takilan_markasi: string;
  takilan_seri_no: string;
  takilan_imal_yili: string;
  takilan_trafo_tipi: string;
  takilan_tamir_yili: string;
  takilan_tamir_firmasi: string;

  tarih: string;
  degisim_nedeni: string;

  aciklama: string;
};


// ============================================================
// BOŞ FORM
// ============================================================

const BOS_FORM: FormData = {
  yil: "",
  ay: "",

  ilce: "",
  mahalle: "",
  tr: "",

  lokasyon_id: "",
  trafo_id: "",
  trafo_tipi: "",

  sokulen_gucu: "",
  sokulen_gerilim: "",
  sokulen_markasi: "",
  sokulen_seri_no: "",
  sokulen_imal_yili: "",
  sokulen_trafo_tipi: "",
  sokulen_tamir_yili: "",
  sokulen_tamir_firmasi: "",
  sokulen_yuklenici: "",

  takilan_gucu: "",
  takilan_gerilim: "",
  takilan_markasi: "",
  takilan_seri_no: "",
  takilan_imal_yili: "",
  takilan_trafo_tipi: "",
  takilan_tamir_yili: "",
  takilan_tamir_firmasi: "",

  tarih: "",
  degisim_nedeni: "",

  aciklama: "",
};


// ============================================================
// ANA UYGULAMA
// ============================================================

export default function Home() {

  // ==========================================================
  // SUPABASE
  // ==========================================================

  const supabase = useMemo(() => {

    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const key =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return null;
    }

    return createClient(
      url,
      key
    );

  }, []);


  // ==========================================================
  // AUTH
  // ==========================================================

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [session, setSession] =
    useState<Session | null>(null);

  const [
    authKontrol,
    setAuthKontrol,
  ] =
    useState(true);

  const [
    girisYukleniyor,
    setGirisYukleniyor,
  ] =
    useState(false);

  const [authHata, setAuthHata] =
    useState("");


  // ==========================================================
  // UYGULAMA
  // ==========================================================

  const [sayfa, setSayfa] =
    useState<Sayfa>(
      "dashboard"
    );

  const [kayitlar, setKayitlar] =
    useState<TrafoKaydi[]>([]);

  const [
    veriYukleniyor,
    setVeriYukleniyor,
  ] =
    useState(false);

  const [
    genelHata,
    setGenelHata,
  ] =
    useState("");

  const [
    basariMesaji,
    setBasariMesaji,
  ] =
    useState("");


  // ==========================================================
  // FORM
  // ==========================================================

  const [form, setForm] =
    useState<FormData>(
      BOS_FORM
    );

  const [
    duzenlenenId,
    setDuzenlenenId,
  ] =
    useState<number | null>(
      null
    );

  const [
    kaydediliyor,
    setKaydediliyor,
  ] =
    useState(false);


  // ==========================================================
  // FİLTRELER
  // ==========================================================

  const [
    arama,
    setArama,
  ] =
    useState("");

  const [
    filtreYil,
    setFiltreYil,
  ] =
    useState("");

  const [
    filtreAy,
    setFiltreAy,
  ] =
    useState("");

  const [
    filtreNeden,
    setFiltreNeden,
  ] =
    useState("");


  // ==========================================================
  // DASHBOARD YIL
  // ==========================================================

  const [
    dashboardYil,
    setDashboardYil,
  ] =
    useState("");


  // ==========================================================
  // AUTH KONTROL
  // ==========================================================

  useEffect(() => {

    if (!supabase) {

      setAuthHata(
        "Supabase bağlantısı kurulamadı."
      );

      setAuthKontrol(false);

      return;
    }

    supabase.auth
      .getSession()
      .then(
        ({ data }) => {

          setSession(
            data.session
          );

          setAuthKontrol(
            false
          );

        }
      );

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth
        .onAuthStateChange(
          (
            _event,
            yeniSession
          ) => {

            setSession(
              yeniSession
            );

            setAuthKontrol(
              false
            );

          }
        );

    return () => {

      subscription.unsubscribe();

    };

  }, [supabase]);


  // ==========================================================
  // OTURUM AÇILINCA VERİLERİ GETİR
  // ==========================================================

  useEffect(() => {

    if (session) {

      kayitlariGetir();

    } else {

      setKayitlar([]);

    }

  }, [session]);


  // ==========================================================
  // KAYITLARI GETİR
  // ==========================================================

  async function kayitlariGetir() {

    if (!supabase) {
      return;
    }

    setVeriYukleniyor(true);

    setGenelHata("");

    const {
      data,
      error,
    } =
      await supabase

        .from(
          "trafo_degisim"
        )

        .select("*")

        .order(
          "tarih",
          {
            ascending: false,
            nullsFirst: false,
          }
        )

        .order(
          "id",
          {
            ascending: false,
          }
        );

    if (error) {

      console.error(
        error
      );

      setGenelHata(
        "Kayıtlar yüklenemedi: " +
        error.message
      );

      setVeriYukleniyor(
        false
      );

      return;
    }

    setKayitlar(
      (data || []) as TrafoKaydi[]
    );

    setVeriYukleniyor(
      false
    );
  }


  // ==========================================================
  // GİRİŞ
  // ==========================================================

  async function girisYap(
    e: FormEvent<HTMLFormElement>
  ) {

    e.preventDefault();

    if (!supabase) {
      return;
    }

    setGirisYukleniyor(
      true
    );

    setAuthHata("");

    const {
      error,
    } =
      await supabase.auth
        .signInWithPassword({
          email:
            email.trim(),

          password,
        });

    if (error) {

      setAuthHata(
        "E-posta veya şifre hatalı."
      );

    }

    setGirisYukleniyor(
      false
    );
  }


  // ==========================================================
  // ÇIKIŞ
  // ==========================================================

  async function cikisYap() {

    if (!supabase) {
      return;
    }

    await supabase.auth
      .signOut();

    setSession(null);

    setSayfa(
      "dashboard"
    );

    setEmail("");

    setPassword("");
  }


  // ==========================================================
  // FORM DEĞİŞİKLİĞİ
  // ==========================================================

  function formDegistir(
    alan: keyof FormData,
    deger: string
  ) {

    setForm(
      (eski) => ({
        ...eski,

        [alan]:
          deger,
      })
    );
  }


  // ==========================================================
  // FORM TEMİZLE
  // ==========================================================

  function formTemizle() {

    setForm(
      BOS_FORM
    );

    setDuzenlenenId(
      null
    );
  }


  // ==========================================================
  // KAYDET / GÜNCELLE
  // ==========================================================

  async function kaydet(
    e: FormEvent<HTMLFormElement>
  ) {

    e.preventDefault();

    if (!supabase) {
      return;
    }

    if (
      !form.yil ||
      !form.ay ||
      !form.tarih ||
      !form.degisim_nedeni
    ) {

      setGenelHata(
        "Yıl, Ay, Tarih ve Değişim Nedeni zorunludur."
      );

      return;
    }

    setKaydediliyor(
      true
    );

    setGenelHata("");

    setBasariMesaji("");


    const veri = {

      yil:
        Number(form.yil),

      ay:
        form.ay,

      ilce:
        form.ilce || null,

      mahalle:
        form.mahalle || null,

      tr:
        form.tr || null,

      lokasyon_id:
        form.lokasyon_id || null,

      trafo_id:
        form.trafo_id || null,

      trafo_tipi:
        form.trafo_tipi || null,

      sokulen_gucu:
        form.sokulen_gucu || null,

      sokulen_gerilim:
        form.sokulen_gerilim || null,

      sokulen_markasi:
        form.sokulen_markasi || null,

      sokulen_seri_no:
        form.sokulen_seri_no || null,

      sokulen_imal_yili:
        form.sokulen_imal_yili || null,

      sokulen_trafo_tipi:
        form.sokulen_trafo_tipi || null,

      sokulen_tamir_yili:
        form.sokulen_tamir_yili || null,

      sokulen_tamir_firmasi:
        form.sokulen_tamir_firmasi || null,

      sokulen_yuklenici:
        form.sokulen_yuklenici || null,

      takilan_gucu:
        form.takilan_gucu || null,

      takilan_gerilim:
        form.takilan_gerilim || null,

      takilan_markasi:
        form.takilan_markasi || null,

      takilan_seri_no:
        form.takilan_seri_no || null,

      takilan_imal_yili:
        form.takilan_imal_yili || null,

      takilan_trafo_tipi:
        form.takilan_trafo_tipi || null,

      takilan_tamir_yili:
        form.takilan_tamir_yili || null,

      takilan_tamir_firmasi:
        form.takilan_tamir_firmasi || null,

      tarih:
        form.tarih,

      degisim_nedeni:
        form.degisim_nedeni,

      aciklama:
        form.aciklama || null,
    };


    let error;


    if (duzenlenenId) {

      const sonuc =
        await supabase

          .from(
            "trafo_degisim"
          )

          .update(
            veri
          )

          .eq(
            "id",
            duzenlenenId
          );

      error =
        sonuc.error;

    } else {

      const sonuc =
        await supabase

          .from(
            "trafo_degisim"
          )

          .insert(
            veri
          );

      error =
        sonuc.error;
    }


    if (error) {

      console.error(
        error
      );

      setGenelHata(
        error.message
      );

      setKaydediliyor(
        false
      );

      return;
    }


    setBasariMesaji(

      duzenlenenId

        ? "Kayıt başarıyla güncellendi."

        : "Yeni trafo değişim kaydı başarıyla eklendi."

    );


    formTemizle();

    await kayitlariGetir();

    setKaydediliyor(
      false
    );


    setTimeout(
      () => {

        setBasariMesaji("");

      },
      3000
    );
  }


  // ==========================================================
  // DÜZENLE
  // ==========================================================

  function kaydiDuzenle(
    kayit: TrafoKaydi
  ) {

    setForm({

      yil:
        kayit.yil
          ? String(kayit.yil)
          : "",

      ay:
        kayit.ay || "",

      ilce:
        kayit.ilce || "",

      mahalle:
        kayit.mahalle || "",

      tr:
        kayit.tr || "",

      lokasyon_id:
        kayit.lokasyon_id || "",

      trafo_id:
        kayit.trafo_id || "",

      trafo_tipi:
        kayit.trafo_tipi || "",

      sokulen_gucu:
        kayit.sokulen_gucu || "",

      sokulen_gerilim:
        kayit.sokulen_gerilim || "",

      sokulen_markasi:
        kayit.sokulen_markasi || "",

      sokulen_seri_no:
        kayit.sokulen_seri_no || "",

      sokulen_imal_yili:
        kayit.sokulen_imal_yili || "",

      sokulen_trafo_tipi:
        kayit.sokulen_trafo_tipi || "",

      sokulen_tamir_yili:
        kayit.sokulen_tamir_yili || "",

      sokulen_tamir_firmasi:
        kayit.sokulen_tamir_firmasi || "",

      sokulen_yuklenici:
        kayit.sokulen_yuklenici || "",

      takilan_gucu:
        kayit.takilan_gucu || "",

      takilan_gerilim:
        kayit.takilan_gerilim || "",

      takilan_markasi:
        kayit.takilan_markasi || "",

      takilan_seri_no:
        kayit.takilan_seri_no || "",

      takilan_imal_yili:
        kayit.takilan_imal_yili || "",

      takilan_trafo_tipi:
        kayit.takilan_trafo_tipi || "",

      takilan_tamir_yili:
        kayit.takilan_tamir_yili || "",

      takilan_tamir_firmasi:
        kayit.takilan_tamir_firmasi || "",

      tarih:
        kayit.tarih || "",

      degisim_nedeni:
        kayit.degisim_nedeni || "",

      aciklama:
        kayit.aciklama || "",
    });


    setDuzenlenenId(
      kayit.id
    );


    setSayfa(
      "yeni"
    );


    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }


  // ==========================================================
  // SİL
  // ==========================================================

  async function kaydiSil(
    kayit: TrafoKaydi
  ) {

    if (!supabase) {
      return;
    }

    const cevap =
      window.confirm(

        `${kayit.yil || ""} ${
          kayit.ay || ""
        } tarihli kaydı silmek istediğinize emin misiniz?`

      );


    if (!cevap) {
      return;
    }


    const {
      error,
    } =
      await supabase

        .from(
          "trafo_degisim"
        )

        .delete()

        .eq(
          "id",
          kayit.id
        );


    if (error) {

      setGenelHata(
        error.message
      );

      return;
    }


    await kayitlariGetir();
  }


  // ==========================================================
  // YILLAR
  // ==========================================================

  const yillar =
    useMemo(
      () => {

        return Array
          .from(
            new Set(

              kayitlar

                .map(
                  (k) =>
                    k.yil
                )

                .filter(
                  Boolean
                ) as number[]

            )
          )

          .sort(
            (a, b) =>
              b - a
          );

      },
      [kayitlar]
    );


  // ==========================================================
  // NEDEN SAYILARI
  // ==========================================================

  const nedenSayilari =
    useMemo(
      () => {

        const sonuc:
          Record<
            string,
            number
          > = {};


        NEDENLER.forEach(
          (neden) => {

            sonuc[
              neden.ad
            ] = 0;

          }
        );


        kayitlar.forEach(
          (kayit) => {

            if (
              kayit.degisim_nedeni &&
              sonuc[
                kayit.degisim_nedeni
              ] !== undefined
            ) {

              sonuc[
                kayit.degisim_nedeni
              ]++;

            }

          }
        );


        return sonuc;

      },
      [kayitlar]
    );


  // ==========================================================
  // YILLIK TOPLAMLAR
  // ==========================================================

  const yillikToplamlar =
    useMemo(
      () => {

        const sonuc:
          Record<
            number,
            number
          > = {};


        kayitlar.forEach(
          (kayit) => {

            if (!kayit.yil) {
              return;
            }

            sonuc[
              kayit.yil
            ] =
              (
                sonuc[
                  kayit.yil
                ] || 0
              ) + 1;

          }
        );


        return Object
          .entries(
            sonuc
          )

          .map(
            ([yil, toplam]) => ({
              yil:
                Number(yil),

              toplam,
            })
          )

          .sort(
            (a, b) =>
              a.yil -
              b.yil
          );

      },
      [kayitlar]
    );


  // ==========================================================
  // DASHBOARD SEÇİLİ YIL
  // ==========================================================

  useEffect(() => {

    if (
      !dashboardYil &&
      yillar.length > 0
    ) {

      setDashboardYil(
        String(
          yillar[0]
        )
      );

    }

  }, [
    yillar,
    dashboardYil,
  ]);


  // ==========================================================
  // AYLIK TOPLAMLAR
  // ==========================================================

  const aylikToplamlar =
    useMemo(
      () => {

        return AYLAR.map(
          (ay) => {

            const toplam =
              kayitlar.filter(
                (kayit) =>

                  String(
                    kayit.yil || ""
                  ) ===
                    dashboardYil &&

                  kayit.ay ===
                    ay

              ).length;


            return {
              ay,
              toplam,
            };

          }
        );

      },
      [
        kayitlar,
        dashboardYil,
      ]
    );


  // ==========================================================
  // FİLTRELİ KAYITLAR
  // ==========================================================

  const filtrelenmisKayitlar =
    useMemo(
      () => {

        const kelime =
          arama
            .trim()
            .toLocaleUpperCase(
              "tr-TR"
            );


        return kayitlar.filter(
          (kayit) => {

            if (
              filtreYil &&
              String(
                kayit.yil || ""
              ) !== filtreYil
            ) {

              return false;
            }


            if (
              filtreAy &&
              kayit.ay !==
                filtreAy
            ) {

              return false;
            }


            if (
              filtreNeden &&
              kayit.degisim_nedeni !==
                filtreNeden
            ) {

              return false;
            }


            if (!kelime) {

              return true;
            }


            const metin = [

              kayit.ilce,
              kayit.mahalle,
              kayit.tr,
              kayit.lokasyon_id,
              kayit.trafo_id,
              kayit.sokulen_markasi,
              kayit.sokulen_seri_no,
              kayit.takilan_markasi,
              kayit.takilan_seri_no,
              kayit.degisim_nedeni,

            ]
              .filter(Boolean)
              .join(" ")
              .toLocaleUpperCase(
                "tr-TR"
              );


            return metin.includes(
              kelime
            );

          }
        );

      },
      [
        kayitlar,
        arama,
        filtreYil,
        filtreAy,
        filtreNeden,
      ]
    );


  // ==========================================================
  // MAX GRAFİK
  // ==========================================================

  const maksimumYil =
    Math.max(
      1,
      ...yillikToplamlar.map(
        (x) =>
          x.toplam
      )
    );


  const maksimumAy =
    Math.max(
      1,
      ...aylikToplamlar.map(
        (x) =>
          x.toplam
      )
    );


  // ==========================================================
  // YÜKLENİYOR
  // ==========================================================

  if (authKontrol) {

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07111f] text-white">

        <div className="text-center">

          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-orange-500" />

          <p className="mt-5 text-slate-400">
            Sistem hazırlanıyor...
          </p>

        </div>

      </main>
    );
  }


  // ==========================================================
  // GİRİŞ EKRANI
  // ==========================================================

  if (!session) {

    return (

      <main className="min-h-screen bg-slate-950 text-white">

        <div className="flex min-h-screen">

          <section className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-14 lg:flex">

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

                Trafo değişim kayıtlarını yönetin,
                yıllık ve aylık istatistikleri takip edin,
                arıza ve değişim nedenlerini tek ekrandan analiz edin.

              </p>

            </div>


            <div className="grid max-w-xl grid-cols-2 gap-4">

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

                <div className="text-2xl">
                  📊
                </div>

                <div className="mt-3 font-bold">
                  Canlı Dashboard
                </div>

                <div className="mt-1 text-sm text-slate-400">
                  Yıllık ve aylık istatistikler
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


          <section className="flex w-full items-center justify-center p-6 lg:w-1/2">

            <div className="w-full max-w-md">

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
                  onSubmit={
                    girisYap
                  }
                  className="space-y-5"
                >

                  <Alan
                    baslik="E-posta"
                  >

                    <input
                      type="email"
                      required
                      value={email}
                      onChange={
                        (e) =>
                          setEmail(
                            e.target.value
                          )
                      }
                      className={inputSinif}
                    />

                  </Alan>


                  <Alan
                    baslik="Şifre"
                  >

                    <input
                      type="password"
                      required
                      value={password}
                      onChange={
                        (e) =>
                          setPassword(
                            e.target.value
                          )
                      }
                      className={inputSinif}
                    />

                  </Alan>


                  {authHata && (

                    <HataKutusu>
                      {authHata}
                    </HataKutusu>

                  )}


                  <button
                    type="submit"
                    disabled={
                      girisYukleniyor
                    }
                    className="w-full rounded-xl bg-orange-500 px-4 py-3 font-black text-white transition hover:bg-orange-400 disabled:opacity-50"
                  >

                    {
                      girisYukleniyor

                        ? "Giriş Yapılıyor..."

                        : "Sisteme Giriş Yap"
                    }

                  </button>

                </form>

              </div>

            </div>

          </section>

        </div>

      </main>
    );
  }


  // ==========================================================
  // ANA UYGULAMA
  // ==========================================================

  return (

    <main className="min-h-screen bg-[#07111f] text-white">

      <div className="flex min-h-screen">

        {/* ====================================================
            SOL MENÜ
        ==================================================== */}

        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800 bg-[#0b1628] lg:flex">

          <div className="border-b border-slate-800 px-6 py-7">

            <div className="text-xs font-bold uppercase tracking-[0.22em] text-orange-400">
              BALIKESİR
            </div>

            <div className="mt-1 text-xl font-black">
              ⚡ TRAFO YÖNETİMİ
            </div>

          </div>


          <nav className="flex-1 space-y-2 p-4">

            <MenuButonu
              aktif={
                sayfa ===
                "dashboard"
              }
              onClick={
                () =>
                  setSayfa(
                    "dashboard"
                  )
              }
            >
              📊 Dashboard
            </MenuButonu>


            <MenuButonu
              aktif={
                sayfa ===
                "yeni"
              }
              onClick={
                () => {

                  formTemizle();

                  setSayfa(
                    "yeni"
                  );

                }
              }
            >
              ➕ Yeni Kayıt
            </MenuButonu>


            <MenuButonu
              aktif={
                sayfa ===
                "kayitlar"
              }
              onClick={
                () =>
                  setSayfa(
                    "kayitlar"
                  )
              }
            >
              📋 Trafo Kayıtları
            </MenuButonu>

          </nav>


          <div className="border-t border-slate-800 p-4">

            <div className="mb-3 truncate text-xs text-slate-500">
              {session.user.email}
            </div>

            <button
              onClick={
                cikisYap
              }
              className="w-full rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
            >
              Çıkış Yap
            </button>

          </div>

        </aside>


        {/* ====================================================
            İÇERİK
        ==================================================== */}

        <section className="min-w-0 flex-1">

          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800 bg-[#0b1628]/95 px-5 py-4 backdrop-blur lg:px-8">

            <div>

              <h1 className="text-xl font-black lg:text-2xl">

                {
                  sayfa === "dashboard"
                    ? "Trafo Değişim Dashboard"

                    : sayfa === "yeni"
                    ? duzenlenenId
                      ? "Trafo Kaydını Düzenle"
                      : "Yeni Trafo Değişim Kaydı"

                    : "Trafo Değişim Kayıtları"
                }

              </h1>

              <p className="mt-1 text-xs text-slate-500">

                BALIKESİR TRAFO DEĞİŞİM YÖNETİM SİSTEMİ

              </p>

            </div>


            <button
              onClick={
                cikisYap
              }
              className="rounded-xl border border-slate-700 px-3 py-2 text-sm lg:hidden"
            >
              Çıkış
            </button>

          </header>


          {/* MOBİL MENÜ */}

          <div className="grid grid-cols-3 border-b border-slate-800 bg-[#0b1628] lg:hidden">

            <MobilMenu
              aktif={
                sayfa ===
                "dashboard"
              }
              onClick={
                () =>
                  setSayfa(
                    "dashboard"
                  )
              }
            >
              Dashboard
            </MobilMenu>

            <MobilMenu
              aktif={
                sayfa ===
                "yeni"
              }
              onClick={
                () => {

                  formTemizle();

                  setSayfa(
                    "yeni"
                  );

                }
              }
            >
              Yeni
            </MobilMenu>

            <MobilMenu
              aktif={
                sayfa ===
                "kayitlar"
              }
              onClick={
                () =>
                  setSayfa(
                    "kayitlar"
                  )
              }
            >
              Kayıtlar
            </MobilMenu>

          </div>


          <div className="p-4 sm:p-6 lg:p-8">

            {genelHata && (

              <HataKutusu>
                {genelHata}
              </HataKutusu>

            )}


            {basariMesaji && (

              <div className="mb-5 rounded-xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
                {basariMesaji}
              </div>

            )}


            {/* ==================================================
                DASHBOARD
            ================================================== */}

            {sayfa ===
              "dashboard" && (

              <>

                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <div className="text-sm text-slate-400">
                      Genel Durum
                    </div>

                    <div className="mt-1 text-lg font-bold">
                      Toplam {kayitlar.length} kayıt
                    </div>

                  </div>


                  <button
                    onClick={
                      () => {

                        formTemizle();

                        setSayfa(
                          "yeni"
                        );

                      }
                    }
                    className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black hover:bg-orange-400"
                  >
                    + Yeni Trafo Kaydı
                  </button>

                </div>


                {/* KPI */}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                  <KpiKart
                    baslik="TOPLAM KAYIT"
                    sayi={
                      kayitlar.length
                    }
                    renk="#F97316"
                  />


                  {NEDENLER.map(
                    (neden) => (

                      <KpiKart
                        key={
                          neden.ad
                        }
                        baslik={
                          neden.ad
                        }
                        sayi={
                          nedenSayilari[
                            neden.ad
                          ] || 0
                        }
                        renk={
                          neden.renk
                        }
                      />

                    )
                  )}

                </div>


                {/* GRAFİKLER */}

                <div className="mt-6 grid gap-6 xl:grid-cols-2">

                  <Panel
                    baslik="Yıllara Göre Değişim"
                    altBaslik="Toplam trafo değişim sayıları"
                  >

                    <div className="mt-8 flex h-64 items-end gap-3 overflow-x-auto border-b border-slate-700 pb-1">

                      {yillikToplamlar.length ===
                      0 ? (

                        <BosAlan>
                          Henüz kayıt yok.
                        </BosAlan>

                      ) : (

                        yillikToplamlar.map(
                          (item) => (

                            <div
                              key={
                                item.yil
                              }
                              className="flex min-w-14 flex-1 flex-col items-center justify-end"
                            >

                              <div className="mb-2 text-sm font-black">
                                {item.toplam}
                              </div>

                              <div
                                className="w-8 rounded-t-lg bg-orange-500 transition-all"
                                style={{
                                  height:
                                    `${Math.max(
                                      8,
                                      (
                                        item.toplam /
                                        maksimumYil
                                      ) *
                                        190
                                    )}px`,
                                }}
                              />

                              <div className="mt-2 text-xs text-slate-400">
                                {item.yil}
                              </div>

                            </div>

                          )
                        )

                      )}

                    </div>

                  </Panel>


                  <Panel
                    baslik="Aylara Göre Değişim"
                    altBaslik="Seçilen yılın aylık toplamları"
                  >

                    <div className="mt-4">

                      <select
                        value={
                          dashboardYil
                        }
                        onChange={
                          (e) =>
                            setDashboardYil(
                              e.target.value
                            )
                        }
                        className={inputSinif}
                      >

                        {yillar.map(
                          (yil) => (

                            <option
                              key={
                                yil
                              }
                              value={
                                yil
                              }
                            >
                              {yil}
                            </option>

                          )
                        )}

                      </select>

                    </div>


                    <div className="mt-6 flex h-56 items-end gap-2 overflow-x-auto border-b border-slate-700">

                      {aylikToplamlar.map(
                        (item) => (

                          <div
                            key={
                              item.ay
                            }
                            className="flex min-w-12 flex-1 flex-col items-center justify-end"
                          >

                            <div className="mb-1 text-xs font-bold">
                              {
                                item.toplam
                              }
                            </div>

                            <div
                              className="w-5 rounded-t bg-cyan-500"
                              style={{
                                height:
                                  `${Math.max(
                                    item.toplam
                                      ? 8
                                      : 0,

                                    (
                                      item.toplam /
                                      maksimumAy
                                    ) *
                                      145
                                  )}px`,
                              }}
                            />

                            <div className="mt-2 text-[9px] text-slate-500">
                              {
                                item.ay.substring(
                                  0,
                                  3
                                )
                              }
                            </div>

                          </div>

                        )
                      )}

                    </div>

                  </Panel>

                </div>


                {/* SON KAYITLAR */}

                <div className="mt-6">

                  <Panel
                    baslik="Son Trafo Değişimleri"
                    altBaslik="Sisteme eklenen son 8 kayıt"
                  >

                    <KayitTablosu

                      kayitlar={
                        kayitlar.slice(
                          0,
                          8
                        )
                      }

                      duzenle={
                        kaydiDuzenle
                      }

                      sil={
                        kaydiSil
                      }

                    />

                  </Panel>

                </div>

              </>

            )}


            {/* ==================================================
                YENİ KAYIT
            ================================================== */}

            {sayfa ===
              "yeni" && (

              <form
                onSubmit={
                  kaydet
                }
                className="space-y-6"
              >

                <FormBolumu
                  baslik="📍 LOKASYON BİLGİLERİ"
                >

                  <FormGrid>

                    <Alan baslik="Yıl *">

                      <input
                        type="number"
                        required
                        value={
                          form.yil
                        }
                        onChange={
                          (e) =>
                            formDegistir(
                              "yil",
                              e.target.value
                            )
                        }
                        className={inputSinif}
                      />

                    </Alan>


                    <Alan baslik="Ay *">

                      <select
                        required
                        value={
                          form.ay
                        }
                        onChange={
                          (e) =>
                            formDegistir(
                              "ay",
                              e.target.value
                            )
                        }
                        className={inputSinif}
                      >

                        <option value="">
                          Seçiniz
                        </option>

                        {AYLAR.map(
                          (ay) => (

                            <option
                              key={ay}
                              value={ay}
                            >
                              {ay}
                            </option>

                          )
                        )}

                      </select>

                    </Alan>


                    <MetinAlani
                      baslik="İlçe"
                      deger={
                        form.ilce
                      }
                      degistir={
                        (v) =>
                          formDegistir(
                            "ilce",
                            v
                          )
                      }
                    />


                    <MetinAlani
                      baslik="Mahalle"
                      deger={
                        form.mahalle
                      }
                      degistir={
                        (v) =>
                          formDegistir(
                            "mahalle",
                            v
                          )
                      }
                    />


                    <MetinAlani
                      baslik="TR"
                      deger={
                        form.tr
                      }
                      degistir={
                        (v) =>
                          formDegistir(
                            "tr",
                            v
                          )
                      }
                    />


                    <MetinAlani
                      baslik="Lokasyon ID"
                      deger={
                        form.lokasyon_id
                      }
                      degistir={
                        (v) =>
                          formDegistir(
                            "lokasyon_id",
                            v
                          )
                      }
                    />


                    <MetinAlani
                      baslik="Trafo ID"
                      deger={
                        form.trafo_id
                      }
                      degistir={
                        (v) =>
                          formDegistir(
                            "trafo_id",
                            v
                          )
                      }
                    />


                    <MetinAlani
                      baslik="Trafo Tipi"
                      deger={
                        form.trafo_tipi
                      }
                      degistir={
                        (v) =>
                          formDegistir(
                            "trafo_tipi",
                            v
                          )
                      }
                    />

                  </FormGrid>

                </FormBolumu>


                <FormBolumu
                  baslik="🔴 SÖKÜLEN TRAFO"
                >

                  <FormGrid>

                    <MetinAlani
                      baslik="Gücü"
                      deger={
                        form.sokulen_gucu
                      }
                      degistir={
                        (v) =>
                          formDegistir(
                            "sokulen_gucu",
                            v
                          )
                      }
                    />

                    <MetinAlani
                      baslik="Gerilim"
                      deger={
                        form.sokulen_gerilim
                      }
                      degistir={
                        (v) =>
                          formDegistir(
                            "sokulen_gerilim",
                            v
                          )
                      }
                    />

                    <MetinAlani
                      baslik="Markası"
                      deger={
                        form.sokulen_markasi
                      }
                      degistir={
                        (v) =>
                          formDegistir(
                            "sokulen_markasi",
                            v
                          )
                      }
                    />

                    <MetinAlani
                      baslik="Seri No"
                      deger={
                        form.sokulen_seri_no
                      }
                      degistir={
                        (v) =>
                          formDegistir(
                            "sokulen_seri_no",
                            v
                          )
                      }
                    />

                    <MetinAlani
                      baslik="İmal Yılı"
                      deger={
                        form.sokulen_imal_yili
                      }
                      degistir={
                        (v) =>
                          formDegistir(
                            "sokulen_imal_yili",
                            v
                          )
                      }
                    />

                    <MetinAlani
                      baslik="Trafo Tipi"
                      deger={
                        form.sokulen_trafo_tipi
                      }
                      degistir={
                        (v) =>
                          formDegistir(
                            "sokulen_trafo_tipi",
                            v
                          )
                      }
                    />

                    <MetinAlani
                      baslik="Tamir Yılı"
                      deger={
                        form.sokulen_tamir_yili
                      }
                      degistir={
                        (v) =>
                          formDegistir(
                            "sokulen_tamir_yili",
                            v
                          )
                      }
                    />

                    <MetinAlani
                      baslik="Tamir Firması"
                      deger={
                        form.sokulen_tamir_firmasi
                      }
                      degistir={
                        (v) =>
                          formDegistir(
                            "sokulen_tamir_firmasi",
                            v
                          )
                      }
                    />

                    <MetinAlani
                      baslik="Yüklenici"
                      deger={
                        form.sokulen_yuklenici
                      }
                      degistir={
                        (v) =>
                          formDegistir(
                            "sokulen_yuklenici",
                            v
                          )
                      }
                    />

                  </FormGrid>

                </FormBolumu>


                <FormBolumu
                  baslik="🟢 TAKILAN TRAFO"
                >

                  <FormGrid>

                    <MetinAlani
                      baslik="Gücü"
                      deger={
                        form.takilan_gucu
                      }
                      degistir={
                        (v) =>
                          formDegistir(
                            "takilan_gucu",
                            v
                          )
                      }
                    />

                    <MetinAlani
                      baslik="Gerilim"
                      deger={
                        form.takilan_gerilim
                      }
                      degistir={
                        (v) =>
                          formDegistir(
                            "takilan_gerilim",
                            v
                          )
                      }
                    />

                    <MetinAlani
                      baslik="Markası"
                      deger={
                        form.takilan_markasi
                      }
                      degistir={
                        (v) =>
                          formDegistir(
                            "takilan_markasi",
                            v
                          )
                      }
                    />

                    <MetinAlani
                      baslik="Seri No"
                      deger={
                        form.takilan_seri_no
                      }
                      degistir={
                        (v) =>
                          formDegistir(
                            "takilan_seri_no",
                            v
                          )
                      }
                    />

                    <MetinAlani
                      baslik="İmal Yılı"
                      deger={
                        form.takilan_imal_yili
                      }
                      degistir={
                        (v) =>
                          formDegistir(
                            "takilan_imal_yili",
                            v
                          )
                      }
                    />

                    <MetinAlani
                      baslik="Trafo Tipi"
                      deger={
                        form.takilan_trafo_tipi
                      }
                      degistir={
                        (v) =>
                          formDegistir(
                            "takilan_trafo_tipi",
                            v
                          )
                      }
                    />

                    <MetinAlani
                      baslik="Tamir Yılı"
                      deger={
                        form.takilan_tamir_yili
                      }
                      degistir={
                        (v) =>
                          formDegistir(
                            "takilan_tamir_yili",
                            v
                          )
                      }
                    />

                    <MetinAlani
                      baslik="Tamir Firması"
                      deger={
                        form.takilan_tamir_firmasi
                      }
                      degistir={
                        (v) =>
                          formDegistir(
                            "takilan_tamir_firmasi",
                            v
                          )
                      }
                    />

                  </FormGrid>

                </FormBolumu>


                <FormBolumu
                  baslik="📅 İŞLEM BİLGİLERİ"
                >

                  <FormGrid>

                    <Alan baslik="Tarih *">

                      <input
                        type="date"
                        required
                        value={
                          form.tarih
                        }
                        onChange={
                          (e) =>
                            formDegistir(
                              "tarih",
                              e.target.value
                            )
                        }
                        className={inputSinif}
                      />

                    </Alan>


                    <Alan baslik="Değişim Nedeni *">

                      <select
                        required
                        value={
                          form.degisim_nedeni
                        }
                        onChange={
                          (e) =>
                            formDegistir(
                              "degisim_nedeni",
                              e.target.value
                            )
                        }
                        className={inputSinif}
                      >

                        <option value="">
                          Seçiniz
                        </option>

                        {NEDENLER.map(
                          (neden) => (

                            <option
                              key={
                                neden.ad
                              }
                              value={
                                neden.ad
                              }
                            >
                              {neden.ad}
                            </option>

                          )
                        )}

                      </select>

                    </Alan>

                  </FormGrid>


                  <div className="mt-4">

                    <Alan baslik="Açıklama">

                      <textarea
                        rows={4}
                        value={
                          form.aciklama
                        }
                        onChange={
                          (e) =>
                            formDegistir(
                              "aciklama",
                              e.target.value
                            )
                        }
                        className={inputSinif}
                      />

                    </Alan>

                  </div>

                </FormBolumu>


                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">

                  {duzenlenenId && (

                    <button
                      type="button"
                      onClick={
                        () => {

                          formTemizle();

                          setSayfa(
                            "kayitlar"
                          );

                        }
                      }
                      className="rounded-xl border border-slate-700 px-6 py-3 font-bold text-slate-300 hover:bg-slate-800"
                    >
                      Vazgeç
                    </button>

                  )}


                  <button
                    type="submit"
                    disabled={
                      kaydediliyor
                    }
                    className="rounded-xl bg-orange-500 px-8 py-3 font-black hover:bg-orange-400 disabled:opacity-50"
                  >

                    {
                      kaydediliyor

                        ? "Kaydediliyor..."

                        : duzenlenenId
                        ? "Değişiklikleri Kaydet"
                        : "Trafo Kaydını Kaydet"
                    }

                  </button>

                </div>

              </form>

            )}


            {/* ==================================================
                KAYITLAR
            ================================================== */}

            {sayfa ===
              "kayitlar" && (

              <>

                <div className="mb-5 rounded-2xl border border-slate-800 bg-[#101d30] p-4">

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">

                    <input
                      value={
                        arama
                      }
                      onChange={
                        (e) =>
                          setArama(
                            e.target.value
                          )
                      }
                      placeholder="Ara..."
                      className={inputSinif}
                    />


                    <select
                      value={
                        filtreYil
                      }
                      onChange={
                        (e) =>
                          setFiltreYil(
                            e.target.value
                          )
                      }
                      className={inputSinif}
                    >

                      <option value="">
                        Tüm Yıllar
                      </option>

                      {yillar.map(
                        (yil) => (

                          <option
                            key={
                              yil
                            }
                            value={
                              yil
                            }
                          >
                            {yil}
                          </option>

                        )
                      )}

                    </select>


                    <select
                      value={
                        filtreAy
                      }
                      onChange={
                        (e) =>
                          setFiltreAy(
                            e.target.value
                          )
                      }
                      className={inputSinif}
                    >

                      <option value="">
                        Tüm Aylar
                      </option>

                      {AYLAR.map(
                        (ay) => (

                          <option
                            key={ay}
                            value={ay}
                          >
                            {ay}
                          </option>

                        )
                      )}

                    </select>


                    <select
                      value={
                        filtreNeden
                      }
                      onChange={
                        (e) =>
                          setFiltreNeden(
                            e.target.value
                          )
                      }
                      className={inputSinif}
                    >

                      <option value="">
                        Tüm Nedenler
                      </option>

                      {NEDENLER.map(
                        (neden) => (

                          <option
                            key={
                              neden.ad
                            }
                            value={
                              neden.ad
                            }
                          >
                            {neden.ad}
                          </option>

                        )
                      )}

                    </select>

                  </div>


                  <div className="mt-4 text-sm text-slate-400">

                    {
                      filtrelenmisKayitlar.length
                    } kayıt gösteriliyor.

                  </div>

                </div>


                <Panel
                  baslik="Trafo Değişim Kayıtları"
                  altBaslik="Kayıtları düzenleyebilir veya silebilirsiniz"
                >

                  {
                    veriYukleniyor

                      ? (
                        <BosAlan>
                          Kayıtlar yükleniyor...
                        </BosAlan>
                      )

                      : (
                        <KayitTablosu

                          kayitlar={
                            filtrelenmisKayitlar
                          }

                          duzenle={
                            kaydiDuzenle
                          }

                          sil={
                            kaydiSil
                          }

                        />
                      )
                  }

                </Panel>

              </>

            )}

          </div>

        </section>

      </div>

    </main>
  );
}


// ============================================================
// ORTAK STİL
// ============================================================

const inputSinif =
  "w-full rounded-xl border border-slate-700 bg-[#07111f] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-500";


// ============================================================
// FORM BİLEŞENLERİ
// ============================================================

function Alan({
  baslik,
  children,
}: {
  baslik: string;
  children: React.ReactNode;
}) {

  return (

    <label className="block">

      <span className="mb-2 block text-sm font-semibold text-slate-300">
        {baslik}
      </span>

      {children}

    </label>

  );
}


function MetinAlani({
  baslik,
  deger,
  degistir,
}: {
  baslik: string;
  deger: string;
  degistir: (
    deger: string
  ) => void;
}) {

  return (

    <Alan baslik={baslik}>

      <input
        value={deger}
        onChange={
          (e) =>
            degistir(
              e.target.value
            )
        }
        className={inputSinif}
      />

    </Alan>

  );
}


function FormGrid({
  children,
}: {
  children:
    React.ReactNode;
}) {

  return (

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {children}
    </div>

  );
}


function FormBolumu({
  baslik,
  children,
}: {
  baslik: string;
  children:
    React.ReactNode;
}) {

  return (

    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#101d30]">

      <div className="border-b border-slate-800 bg-[#0b1628] px-5 py-4 font-black">
        {baslik}
      </div>

      <div className="p-5 lg:p-6">
        {children}
      </div>

    </section>

  );
}


// ============================================================
// MENU
// ============================================================

function MenuButonu({
  aktif,
  onClick,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  children:
    React.ReactNode;
}) {

  return (

    <button
      onClick={
        onClick
      }
      className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
        aktif
          ? "bg-orange-500 text-white"
          : "text-slate-300 hover:bg-slate-800"
      }`}
    >
      {children}
    </button>

  );
}


function MobilMenu({
  aktif,
  onClick,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  children:
    React.ReactNode;
}) {

  return (

    <button
      onClick={
        onClick
      }
      className={`px-2 py-3 text-xs font-bold ${
        aktif
          ? "bg-orange-500 text-white"
          : "text-slate-400"
      }`}
    >
      {children}
    </button>

  );
}


// ============================================================
// KPI
// ============================================================

function KpiKart({
  baslik,
  sayi,
  renk,
}: {
  baslik: string;
  sayi: number;
  renk: string;
}) {

  return (

    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#101d30]">

      <div
        className="h-1.5"
        style={{
          backgroundColor:
            renk,
        }}
      />

      <div className="p-5">

        <div className="text-xs font-bold text-slate-400">
          {baslik}
        </div>

        <div className="mt-3 text-3xl font-black">
          {sayi}
        </div>

      </div>

    </div>

  );
}


// ============================================================
// PANEL
// ============================================================

function Panel({
  baslik,
  altBaslik,
  children,
}: {
  baslik: string;
  altBaslik?: string;
  children:
    React.ReactNode;
}) {

  return (

    <section className="rounded-2xl border border-slate-800 bg-[#101d30] p-5 lg:p-6">

      <div>

        <h2 className="text-lg font-black">
          {baslik}
        </h2>

        {altBaslik && (

          <p className="mt-1 text-sm text-slate-500">
            {altBaslik}
          </p>

        )}

      </div>

      {children}

    </section>

  );
}


// ============================================================
// HATA
// ============================================================

function HataKutusu({
  children,
}: {
  children:
    React.ReactNode;
}) {

  return (

    <div className="mb-5 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
      {children}
    </div>

  );
}


// ============================================================
// BOŞ ALAN
// ============================================================

function BosAlan({
  children,
}: {
  children:
    React.ReactNode;
}) {

  return (

    <div className="my-8 w-full rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-500">
      {children}
    </div>

  );
}


// ============================================================
// NEDEN ETİKETİ
// ============================================================

function NedenEtiketi({
  neden,
}: {
  neden:
    string | null;
}) {

  const bulunan =
    NEDENLER.find(
      (x) =>
        x.ad ===
        neden
    );


  if (!neden) {

    return (
      <span className="text-slate-600">
        -
      </span>
    );
  }


  return (

    <span
      className="inline-flex whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-black text-white"
      style={{
        backgroundColor:
          bulunan?.renk ||
          "#475569",
      }}
    >
      {neden}
    </span>

  );
}


// ============================================================
// KAYIT TABLOSU
// ============================================================

function KayitTablosu({
  kayitlar,
  duzenle,
  sil,
}: {
  kayitlar:
    TrafoKaydi[];

  duzenle: (
    kayit:
      TrafoKaydi
  ) => void;

  sil: (
    kayit:
      TrafoKaydi
  ) => void;
}) {

  if (
    kayitlar.length === 0
  ) {

    return (
      <BosAlan>
        Henüz kayıt bulunmuyor.
      </BosAlan>
    );
  }


  return (

    <div className="mt-5 overflow-x-auto">

      <table className="min-w-full text-left text-sm">

        <thead>

          <tr className="border-b border-slate-700 text-xs uppercase text-slate-500">

            <th className="px-3 py-3">
              Tarih
            </th>

            <th className="px-3 py-3">
              Yıl
            </th>

            <th className="px-3 py-3">
              Ay
            </th>

            <th className="px-3 py-3">
              İlçe
            </th>

            <th className="px-3 py-3">
              Mahalle
            </th>

            <th className="px-3 py-3">
              Lokasyon
            </th>

            <th className="px-3 py-3">
              Trafo ID
            </th>

            <th className="px-3 py-3">
              Değişim Nedeni
            </th>

            <th className="px-3 py-3 text-right">
              İşlem
            </th>

          </tr>

        </thead>


        <tbody>

          {kayitlar.map(
            (kayit) => (

              <tr
                key={
                  kayit.id
                }
                className="border-b border-slate-800/80 transition hover:bg-slate-800/30"
              >

                <td className="whitespace-nowrap px-3 py-4">
                  {
                    tarihGoster(
                      kayit.tarih
                    )
                  }
                </td>

                <td className="px-3 py-4">
                  {
                    kayit.yil || "-"
                  }
                </td>

                <td className="whitespace-nowrap px-3 py-4">
                  {
                    kayit.ay || "-"
                  }
                </td>

                <td className="whitespace-nowrap px-3 py-4">
                  {
                    kayit.ilce || "-"
                  }
                </td>

                <td className="whitespace-nowrap px-3 py-4">
                  {
                    kayit.mahalle || "-"
                  }
                </td>

                <td className="whitespace-nowrap px-3 py-4">
                  {
                    kayit.lokasyon_id || "-"
                  }
                </td>

                <td className="whitespace-nowrap px-3 py-4">
                  {
                    kayit.trafo_id || "-"
                  }
                </td>

                <td className="px-3 py-4">

                  <NedenEtiketi
                    neden={
                      kayit.degisim_nedeni
                    }
                  />

                </td>

                <td className="whitespace-nowrap px-3 py-4 text-right">

                  <button
                    onClick={
                      () =>
                        duzenle(
                          kayit
                        )
                    }
                    className="mr-2 rounded-lg border border-blue-800 px-3 py-2 text-xs font-bold text-blue-300 hover:bg-blue-950"
                  >
                    Düzenle
                  </button>

                  <button
                    onClick={
                      () =>
                        sil(
                          kayit
                        )
                    }
                    className="rounded-lg border border-red-900 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-950"
                  >
                    Sil
                  </button>

                </td>

              </tr>

            )
          )}

        </tbody>

      </table>

    </div>

  );
}


// ============================================================
// TARİH
// ============================================================

function tarihGoster(
  tarih:
    string | null
) {

  if (!tarih) {
    return "-";
  }


  const parcala =
    tarih.split("-");


  if (
    parcala.length !== 3
  ) {

    return tarih;
  }


  return `${parcala[2]}.${parcala[1]}.${parcala[0]}`;
}
