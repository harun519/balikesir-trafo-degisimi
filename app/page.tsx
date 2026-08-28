"use client";

import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createClient,
  Session,
} from "@supabase/supabase-js";


// ============================================================
// KAYNAK LİSTELERİ
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

const ILCE_SECENEKLERI = [
  "BALYA",
  "İVRİNDİ",
  "SAVAŞTEPE",
  "SINDIRGI",
  "BİGADİÇ",
  "DURSUNBEY",
  "KEPSUT",
  "SUSURLUK",
  "ALTIEYLÜL",
  "KARESİ",
];

const KONUM_TRAFO_TIPLERI = [
  "DİREK",
  "BİNA",
];

const GUC_SECENEKLERI = [
  "25",
  "40",
  "50",
  "63",
  "80",
  "100",
  "125",
  "160",
  "200",
  "250",
  "315",
  "400",
  "500",
  "630",
  "800",
  "1000",
  "1250",
  "1600",
  "2500",
  "5000",
  "6300",
  "10000",
];

const GERILIM_SECENEKLERI = [
  "6,3/0,4",
  "34,5/0,4",
  "34,5/6,3",
];

const MARKA_SECENEKLERI = [
  "ABB",
  "AEG-ETİ",
  "ALSTOM",
  "ANKARA",
  "AREVA",
  "ASTOR",
  "ATLAS",
  "AZP",
  "BESE",
  "BEST",
  "BETA",
  "BEZ",
  "DTS",
  "ELEKTROMEKANİK",
  "ELEKTROSAN",
  "ELKİMA",
  "ELTAŞ",
  "EREN",
  "ESAŞ",
  "ESİTAŞ",
  "ETİKETSİZ",
  "ETİTAŞ",
  "KAPLAN",
  "MAKSAN",
  "MEKSAN",
  "MMS AŞ",
  "ÖZÇELİK",
  "ÖZGÜNEY",
  "ÖZTRAFO",
  "SEM",
  "SÖNMEZ",
  "STS",
  "TİMSAN",
  "TRAFOSAN",
  "TRANSTEK",
  "TEK TRAFO",
  "MERLİNGERİN",
  "DELFİN",
  "NİLKAR",
  "ELKT.MECANİCA",
  "EFACEC",
  "EKOS ELECTRİC",
  "EUROPOWER",
  "---",
];

const TRAFO_TIP_SECENEKLERI = [
  "GEN.DEPOLU",
  "HERMETİK",
  "KURU TİP",
  "DÖKME REÇİNELİ",
];

const NEDENLER = [
  { ad: "ARIZA", renk: "#ef4444" },
  { ad: "DÖNÜŞÜM", renk: "#3b82f6" },
  { ad: "GÜÇ DEĞİŞİMİ", renk: "#84cc16" },
  { ad: "TRAFO İPTAL", renk: "#38bdf8" },
  { ad: "YATIRIM", renk: "#facc15" },
  { ad: "YENİ TESİS", renk: "#22d3ee" },
  { ad: "ARIZA RİSKİ", renk: "#fb7185" },
];

const BU_YIL = new Date().getFullYear();

const YIL_SECENEKLERI = Array.from(
  {
    length:
      Math.max(BU_YIL + 2, 2026) - 2017 + 1,
  },
  (_, i) => String(2017 + i)
);


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

  const supabase = useMemo(() => {

    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const key =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return null;
    }

    return createClient(url, key);

  }, []);


  // AUTH

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [session, setSession] =
    useState<Session | null>(null);

  const [authKontrol, setAuthKontrol] =
    useState(true);

  const [girisYukleniyor, setGirisYukleniyor] =
    useState(false);

  const [authHata, setAuthHata] =
    useState("");


  // UYGULAMA

  const [sayfa, setSayfa] =
    useState<Sayfa>("dashboard");

  const [kayitlar, setKayitlar] =
    useState<TrafoKaydi[]>([]);

  const [veriYukleniyor, setVeriYukleniyor] =
    useState(false);

  const [genelHata, setGenelHata] =
    useState("");

  const [basariMesaji, setBasariMesaji] =
    useState("");


  // DETAY

  const [detayKayit, setDetayKayit] =
    useState<TrafoKaydi | null>(null);


  // FORM

  const [form, setForm] =
    useState<FormData>(BOS_FORM);

  const [duzenlenenId, setDuzenlenenId] =
    useState<number | null>(null);

  const [kaydediliyor, setKaydediliyor] =
    useState(false);


  // KAYIT FİLTRELERİ

  const [arama, setArama] =
    useState("");

  const [filtreYil, setFiltreYil] =
    useState("");

  const [filtreAy, setFiltreAy] =
    useState("");

  const [filtreNeden, setFiltreNeden] =
    useState("");


  // DASHBOARD FİLTRELERİ

  const [dashboardYil, setDashboardYil] =
    useState("");

  const [dashboardIlce, setDashboardIlce] =
    useState("");


  // ============================================================
  // DETAY ESC
  // ============================================================

  useEffect(() => {

    function escKapat(e: KeyboardEvent) {

      if (e.key === "Escape") {
        setDetayKayit(null);
      }

    }

    window.addEventListener(
      "keydown",
      escKapat
    );

    return () => {

      window.removeEventListener(
        "keydown",
        escKapat
      );

    };

  }, []);


  // ============================================================
  // AUTH
  // ============================================================

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
      .then(({ data }) => {

        setSession(data.session);
        setAuthKontrol(false);

      });

    const {
      data: { subscription },
    } =
      supabase.auth
        .onAuthStateChange(
          (_event, yeniSession) => {

            setSession(yeniSession);
            setAuthKontrol(false);

          }
        );

    return () =>
      subscription.unsubscribe();

  }, [supabase]);


  useEffect(() => {

    if (session) {
      kayitlariGetir();
    } else {
      setKayitlar([]);
    }

  }, [session]);


  // ============================================================
  // KAYITLARI GETİR
  // ============================================================

  async function kayitlariGetir() {

    if (!supabase) {
      return;
    }

    setVeriYukleniyor(true);
    setGenelHata("");

    const { data, error } =
      await supabase
        .from("trafo_degisim")
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

      setGenelHata(
        "Kayıtlar yüklenemedi: " +
        error.message
      );

      setVeriYukleniyor(false);

      return;
    }

    setKayitlar(
      (data || []) as TrafoKaydi[]
    );

    setVeriYukleniyor(false);

  }


  // ============================================================
  // GİRİŞ
  // ============================================================

  async function girisYap(
    e: FormEvent<HTMLFormElement>
  ) {

    e.preventDefault();

    if (!supabase) {
      return;
    }

    setGirisYukleniyor(true);
    setAuthHata("");

    const { error } =
      await supabase.auth
        .signInWithPassword({
          email: email.trim(),
          password,
        });

    if (error) {

      setAuthHata(
        "E-posta veya şifre hatalı."
      );

    }

    setGirisYukleniyor(false);

  }


  async function cikisYap() {

    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();

    setSession(null);
    setSayfa("dashboard");
    setEmail("");
    setPassword("");

  }


  // ============================================================
  // FORM
  // ============================================================

  function formDegistir(
    alan: keyof FormData,
    deger: string
  ) {

    setForm(
      (eski) => ({
        ...eski,
        [alan]: deger,
      })
    );

  }


  function formTemizle() {

    setForm(BOS_FORM);
    setDuzenlenenId(null);

  }


  // ============================================================
  // KAYDET
  // ============================================================

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

    setKaydediliyor(true);
    setGenelHata("");
    setBasariMesaji("");

    const veri = {

      yil: Number(form.yil),
      ay: form.ay,

      ilce: form.ilce || null,
      mahalle: form.mahalle || null,
      tr: form.tr || null,

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

      tarih: form.tarih,

      degisim_nedeni:
        form.degisim_nedeni,

      aciklama:
        form.aciklama || null,
    };

    let error;

    if (duzenlenenId) {

      const sonuc =
        await supabase
          .from("trafo_degisim")
          .update(veri)
          .eq(
            "id",
            duzenlenenId
          );

      error = sonuc.error;

    } else {

      const sonuc =
        await supabase
          .from("trafo_degisim")
          .insert(veri);

      error = sonuc.error;

    }

    if (error) {

      setGenelHata(
        error.message
      );

      setKaydediliyor(false);

      return;
    }

    setBasariMesaji(
      duzenlenenId
        ? "Kayıt başarıyla güncellendi."
        : "Yeni trafo değişim kaydı başarıyla eklendi."
    );

    formTemizle();

    await kayitlariGetir();

    setKaydediliyor(false);
    setSayfa("kayitlar");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    setTimeout(
      () =>
        setBasariMesaji(""),
      3000
    );

  }


  // ============================================================
  // DÜZENLE
  // ============================================================

  function kaydiDuzenle(
    kayit: TrafoKaydi
  ) {

    setDetayKayit(null);

    setForm({

      yil:
        kayit.yil
          ? String(kayit.yil)
          : "",

      ay: kayit.ay || "",

      ilce: kayit.ilce || "",
      mahalle: kayit.mahalle || "",
      tr: kayit.tr || "",

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

    setSayfa("yeni");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

  }


  // ============================================================
  // SİL
  // ============================================================

  async function kaydiSil(
    kayit: TrafoKaydi
  ) {

    if (!supabase) {
      return;
    }

    const cevap =
      window.confirm(
        `${tarihGoster(
          kayit.tarih
        )} tarihli kaydı silmek istediğinize emin misiniz?`
      );

    if (!cevap) {
      return;
    }

    const { error } =
      await supabase
        .from("trafo_degisim")
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

    setDetayKayit(null);

    await kayitlariGetir();

  }


  // ============================================================
  // YILLAR
  // ============================================================

  const yillar =
    useMemo(
      () =>
        Array
          .from(
            new Set(
              kayitlar
                .map(
                  (k) => k.yil
                )
                .filter(
                  Boolean
                ) as number[]
            )
          )
          .sort(
            (a, b) =>
              b - a
          ),
      [kayitlar]
    );


  // ============================================================
  // İLÇELER
  // ============================================================

  const ilceler =
    useMemo(
      () => {

        const kayitIlceleri =
          kayitlar
            .map(
              (x) =>
                x.ilce?.trim()
            )
            .filter(
              Boolean
            ) as string[];

        return Array
          .from(
            new Set([
              ...ILCE_SECENEKLERI,
              ...kayitIlceleri,
            ])
          )
          .sort(
            (a, b) =>
              a.localeCompare(
                b,
                "tr"
              )
          );

      },
      [kayitlar]
    );


  // ============================================================
  // DASHBOARD FİLTRELİ KAYITLAR
  // ============================================================

  const dashboardKayitlari =
    useMemo(
      () => {

        return kayitlar.filter(
          (kayit) => {

            if (
              dashboardYil &&
              String(
                kayit.yil || ""
              ) !==
              dashboardYil
            ) {
              return false;
            }

            if (
              dashboardIlce &&
              kayit.ilce !==
              dashboardIlce
            ) {
              return false;
            }

            return true;

          }
        );

      },
      [
        kayitlar,
        dashboardYil,
        dashboardIlce,
      ]
    );


  // ============================================================
  // SON 30 GÜN
  // ============================================================

  const son30Gun =
    useMemo(
      () => {

        const bugun =
          new Date();

        const bugunUtc =
          Date.UTC(
            bugun.getFullYear(),
            bugun.getMonth(),
            bugun.getDate()
          );

        const otuzGunOnceUtc =
          bugunUtc -
          29 *
          24 *
          60 *
          60 *
          1000;

        return dashboardKayitlari
          .filter(
            (kayit) => {

              if (!kayit.tarih) {
                return false;
              }

              const parcalar =
                kayit.tarih.split("-");

              if (
                parcalar.length !== 3
              ) {
                return false;
              }

              const yil =
                Number(parcalar[0]);

              const ay =
                Number(parcalar[1]);

              const gun =
                Number(parcalar[2]);

              if (
                !yil ||
                !ay ||
                !gun
              ) {
                return false;
              }

              const kayitUtc =
                Date.UTC(
                  yil,
                  ay - 1,
                  gun
                );

              return (
                kayitUtc >=
                otuzGunOnceUtc &&
                kayitUtc <=
                bugunUtc
              );

            }
          ).length;

      },
      [dashboardKayitlari]
    );


  // ============================================================
  // NEDEN SAYILARI
  // ============================================================

  const nedenSayilari =
    useMemo(
      () => {

        const sonuc:
          Record<string, number> = {};

        NEDENLER.forEach(
          (neden) => {

            sonuc[neden.ad] = 0;

          }
        );

        dashboardKayitlari
          .forEach(
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
      [dashboardKayitlari]
    );


  // ============================================================
  // YILLIK NEDENLER
  // ============================================================

  const yillikNedenler =
    useMemo(
      () => {

        const kullanilacak =
          dashboardIlce
            ? kayitlar.filter(
                (x) =>
                  x.ilce ===
                  dashboardIlce
              )
            : kayitlar;

        return [...yillar]
          .reverse()
          .map(
            (yil) => {

              const satir =
                kullanilacak
                  .filter(
                    (x) =>
                      x.yil ===
                      yil
                  );

              const nedenler:
                Record<string, number> = {};

              NEDENLER.forEach(
                (neden) => {

                  nedenler[neden.ad] =
                    satir.filter(
                      (x) =>
                        x.degisim_nedeni ===
                        neden.ad
                    ).length;

                }
              );

              return {
                yil,
                nedenler,
                toplam:
                  satir.length,
              };

            }
          );

      },
      [
        kayitlar,
        yillar,
        dashboardIlce,
      ]
    );


  // ============================================================
  // AYLIK NEDENLER
  // ============================================================

  const aylikNedenler =
    useMemo(
      () => {

        return AYLAR.map(
          (ay) => {

            const satir =
              kayitlar
                .filter(
                  (x) => {

                    if (
                      String(
                        x.yil || ""
                      ) !==
                      dashboardYil
                    ) {
                      return false;
                    }

                    if (
                      x.ay !== ay
                    ) {
                      return false;
                    }

                    if (
                      dashboardIlce &&
                      x.ilce !==
                      dashboardIlce
                    ) {
                      return false;
                    }

                    return true;

                  }
                );

            const nedenler:
              Record<string, number> = {};

            NEDENLER.forEach(
              (neden) => {

                nedenler[neden.ad] =
                  satir.filter(
                    (x) =>
                      x.degisim_nedeni ===
                      neden.ad
                  ).length;

              }
            );

            return {
              ay,
              toplam:
                satir.length,
              nedenler,
            };

          }
        );

      },
      [
        kayitlar,
        dashboardYil,
        dashboardIlce,
      ]
    );


  // ============================================================
  // EN ÇOK İLÇE
  // ============================================================

  const enCokIlce =
    useMemo(
      () => {

        const sayilar:
          Record<string, number> = {};

        dashboardKayitlari
          .forEach(
            (x) => {

              if (!x.ilce) {
                return;
              }

              sayilar[x.ilce] =
                (
                  sayilar[x.ilce] ||
                  0
                ) + 1;

            }
          );

        return (
          Object
            .entries(sayilar)
            .sort(
              (a, b) =>
                b[1] - a[1]
            )[0] || [
              "-",
              0,
            ]
        );

      },
      [dashboardKayitlari]
    );


  // ============================================================
  // EN ÇOK NEDEN
  // ============================================================

  const enCokNeden =
    useMemo(
      () => {

        return (
          Object
            .entries(
              nedenSayilari
            )
            .sort(
              (a, b) =>
                b[1] - a[1]
            )[0] || [
              "-",
              0,
            ]
        );

      },
      [nedenSayilari]
    );


  // ============================================================
  // DONUT
  // ============================================================

  const donutGradient =
    useMemo(
      () => {

        const toplam =
          dashboardKayitlari.length;

        if (!toplam) {

          return "#1e293b 0% 100%";

        }

        let baslangic = 0;

        const parcalar:
          string[] = [];

        NEDENLER.forEach(
          (neden) => {

            const sayi =
              nedenSayilari[
                neden.ad
              ] || 0;

            const oran =
              (
                sayi /
                toplam
              ) * 100;

            if (
              oran <= 0
            ) {
              return;
            }

            const bitis =
              baslangic +
              oran;

            parcalar.push(
              `${neden.renk} ${baslangic}% ${bitis}%`
            );

            baslangic =
              bitis;

          }
        );

        return parcalar.join(", ");

      },
      [
        dashboardKayitlari,
        nedenSayilari,
      ]
    );


  const maxYillik =
    Math.max(
      1,
      ...yillikNedenler
        .map(
          (x) =>
            Math.max(
              ...NEDENLER.map(
                (neden) =>
                  x.nedenler[
                    neden.ad
                  ] || 0
              )
            )
        )
    );

  const maxAylik =
    Math.max(
      1,
      ...aylikNedenler
        .map(
          (x) =>
            Math.max(
              ...NEDENLER.map(
                (neden) =>
                  x.nedenler[
                    neden.ad
                  ] || 0
              )
            )
        )
    );


  // ============================================================
  // KAYIT FİLTRELERİ
  // ============================================================

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
              ) !==
              filtreYil
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


  // ============================================================
  // EXCEL'E AKTAR
  // ============================================================

  function excelAktar() {

    if (
      filtrelenmisKayitlar.length === 0
    ) {

      window.alert(
        "Excel'e aktarılacak kayıt bulunmuyor."
      );

      return;
    }

    const basliklar = [
      "SIRA NO",
      "YIL",
      "AY",
      "İLÇE",
      "MAHALLE",
      "TR",
      "LOKASYON ID",
      "TRAFO ID",
      "TRAFO TİPİ",

      "SÖKÜLEN GÜCÜ",
      "SÖKÜLEN GERİLİM",
      "SÖKÜLEN MARKASI",
      "SÖKÜLEN SERİ NO",
      "SÖKÜLEN İMAL YILI",
      "SÖKÜLEN TRAFO TİPİ",
      "SÖKÜLEN TAMİR YILI",
      "SÖKÜLEN TAMİR FİRMASI",
      "SÖKÜLEN YÜKLENİCİ",

      "TAKILAN GÜCÜ",
      "TAKILAN GERİLİM",
      "TAKILAN MARKASI",
      "TAKILAN SERİ NO",
      "TAKILAN İMAL YILI",
      "TAKILAN TRAFO TİPİ",
      "TAKILAN TAMİR YILI",
      "TAKILAN TAMİR FİRMASI",

      "TARİH",
      "DEĞİŞİM NEDENİ",
      "AÇIKLAMA",
    ];

    const satirlar =
      filtrelenmisKayitlar.map(
        (kayit, index) => [

          kayit.sira_no ??
            index + 1,

          kayit.yil ?? "",
          kayit.ay ?? "",
          kayit.ilce ?? "",
          kayit.mahalle ?? "",
          kayit.tr ?? "",
          kayit.lokasyon_id ?? "",
          kayit.trafo_id ?? "",
          kayit.trafo_tipi ?? "",

          kayit.sokulen_gucu ?? "",
          kayit.sokulen_gerilim ?? "",
          kayit.sokulen_markasi ?? "",
          kayit.sokulen_seri_no ?? "",
          kayit.sokulen_imal_yili ?? "",
          kayit.sokulen_trafo_tipi ?? "",
          kayit.sokulen_tamir_yili ?? "",
          kayit.sokulen_tamir_firmasi ?? "",
          kayit.sokulen_yuklenici ?? "",

          kayit.takilan_gucu ?? "",
          kayit.takilan_gerilim ?? "",
          kayit.takilan_markasi ?? "",
          kayit.takilan_seri_no ?? "",
          kayit.takilan_imal_yili ?? "",
          kayit.takilan_trafo_tipi ?? "",
          kayit.takilan_tamir_yili ?? "",
          kayit.takilan_tamir_firmasi ?? "",

          tarihGoster(kayit.tarih),
          kayit.degisim_nedeni ?? "",
          kayit.aciklama ?? "",

        ]
      );

    const tabloBasliklari =
      basliklar
        .map(
          (baslik) =>
            `<th>${excelTemizle(
              baslik
            )}</th>`
        )
        .join("");

    const tabloSatirlari =
      satirlar
        .map(
          (satir) => {

            const hucreler =
              satir
                .map(
                  (hucre) =>
                    `<td>${excelTemizle(
                      hucre
                    )}</td>`
                )
                .join("");

            return `<tr>${hucreler}</tr>`;

          }
        )
        .join("");

    const excelIcerik = `
      <html
        xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns="http://www.w3.org/TR/REC-html40"
      >
        <head>
          <meta charset="UTF-8" />
          <style>
            table {
              border-collapse: collapse;
              font-family: Arial, sans-serif;
              font-size: 11pt;
            }

            th {
              background: #f97316;
              color: #ffffff;
              font-weight: bold;
              border: 1px solid #777777;
              padding: 8px;
              text-align: center;
              white-space: nowrap;
            }

            td {
              border: 1px solid #aaaaaa;
              padding: 6px;
              white-space: nowrap;
              mso-number-format: "\\@";
            }
          </style>
        </head>

        <body>

          <table>

            <thead>
              <tr>
                ${tabloBasliklari}
              </tr>
            </thead>

            <tbody>
              ${tabloSatirlari}
            </tbody>

          </table>

        </body>
      </html>
    `;

    const blob =
      new Blob(
        [
          "\uFEFF",
          excelIcerik,
        ],
        {
          type:
            "application/vnd.ms-excel;charset=utf-8;",
        }
      );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    const bugun =
      new Date();

    const gun =
      String(
        bugun.getDate()
      ).padStart(2, "0");

    const ay =
      String(
        bugun.getMonth() + 1
      ).padStart(2, "0");

    const yil =
      bugun.getFullYear();

    const isimParcalari = [
      "BALIKESIR_TRAFO_DEGISIMI",
    ];

    if (filtreYil) {
      isimParcalari.push(
        filtreYil
      );
    }

    if (filtreAy) {
      isimParcalari.push(
        filtreAy
      );
    }

    if (filtreNeden) {

      isimParcalari.push(
        filtreNeden
          .replaceAll(" ", "_")
          .replaceAll("İ", "I")
          .replaceAll("Ü", "U")
          .replaceAll("Ö", "O")
          .replaceAll("Ş", "S")
          .replaceAll("Ğ", "G")
          .replaceAll("Ç", "C")
      );

    }

    isimParcalari.push(
      `${gun}-${ay}-${yil}`
    );

    link.href = url;

    link.download =
      `${isimParcalari.join("_")}.xls`;

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(url);

  }


  // ============================================================
  // YÜKLENİYOR
  // ============================================================

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


  // ============================================================
  // GİRİŞ
  // ============================================================

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

              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

                <div className="text-2xl">
                  🔐
                </div>

                <div className="mt-3 font-bold">
                  Güvenli Erişim
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

                </div>

                <form
                  onSubmit={girisYap}
                  className="space-y-5"
                  autoComplete="on"
                >

                  <Alan baslik="E-posta">

                    <input
                      type="email"
                      name="username"
                      required
                      autoComplete="username"
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

                  <Alan baslik="Şifre">

                    <input
                      type="password"
                      name="password"
                      required
                      autoComplete="current-password"
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
                    disabled={girisYukleniyor}
                    className="w-full rounded-xl bg-orange-500 px-4 py-3 font-black hover:bg-orange-400 disabled:opacity-50"
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


  // ============================================================
  // ANA UYGULAMA
  // ============================================================

  return (

    <main className="min-h-screen bg-[#07111f] text-white">

      <div className="flex min-h-screen">

        <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-800 bg-[#0b1628] lg:flex">

          <div className="border-b border-slate-800 px-5 py-6">

            <div className="text-xs font-bold uppercase tracking-[0.22em] text-orange-400">
              BALIKESİR
            </div>

            <div className="mt-1 text-xl font-black">
              ⚡ TRAFO
            </div>

            <div className="text-xl font-black">
              YÖNETİMİ
            </div>

          </div>

          <nav className="flex-1 space-y-2 p-3">

            <MenuButonu
              aktif={sayfa === "dashboard"}
              onClick={
                () =>
                  setSayfa(
                    "dashboard"
                  )
              }
            >
              📊 Kontrol Paneli
            </MenuButonu>

            <MenuButonu
              aktif={
                sayfa === "yeni" &&
                !duzenlenenId
              }
              onClick={
                () => {

                  formTemizle();
                  setSayfa("yeni");

                }
              }
            >
              ➕ Yeni Kayıt
            </MenuButonu>

            <MenuButonu
              aktif={sayfa === "kayitlar"}
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

          <div className="border-t border-slate-800 p-3">

            <div className="mb-3 truncate text-xs text-slate-500">
              {session.user.email}
            </div>

            <button
              onClick={cikisYap}
              className="w-full rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
            >
              Çıkış Yap
            </button>

          </div>

        </aside>


        <section className="min-w-0 flex-1">

          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800 bg-[#0b1628]/95 px-5 py-4 backdrop-blur lg:px-7">

            <div>

              <h1 className="text-xl font-black lg:text-2xl">

                {
                  sayfa === "dashboard"
                    ? "Trafo Değişim Kontrol Paneli"
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

          </header>

          <div className="p-4 sm:p-6 lg:p-7">

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


            {/* DASHBOARD */}

            {sayfa === "dashboard" && (

              <>

                <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-[#101d30] p-4 lg:flex-row lg:items-end">

                  <div className="flex-1">

                    <div className="mb-2 text-xs font-bold text-slate-400">
                      YIL
                    </div>

                    <select
                      value={dashboardYil}
                      onChange={
                        (e) =>
                          setDashboardYil(
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
                            key={yil}
                            value={yil}
                          >
                            {yil}
                          </option>

                        )
                      )}

                    </select>

                  </div>

                  <div className="flex-1">

                    <div className="mb-2 text-xs font-bold text-slate-400">
                      İLÇE
                    </div>

                    <select
                      value={dashboardIlce}
                      onChange={
                        (e) =>
                          setDashboardIlce(
                            e.target.value
                          )
                      }
                      className={inputSinif}
                    >

                      <option value="">
                        Tüm İlçeler
                      </option>

                      {ilceler.map(
                        (ilce) => (

                          <option
                            key={ilce}
                            value={ilce}
                          >
                            {ilce}
                          </option>

                        )
                      )}

                    </select>

                  </div>

                  <button
                    onClick={
                      () => {

                        setDashboardYil("");
                        setDashboardIlce("");

                      }
                    }
                    className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold hover:bg-slate-800"
                  >
                    Filtreyi Temizle
                  </button>

                  <button
                    onClick={
                      () => {

                        formTemizle();
                        setSayfa("yeni");

                      }
                    }
                    className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black hover:bg-orange-400"
                  >
                    + Yeni Trafo Kaydı
                  </button>

                </div>


                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                  <KpiKart
                    baslik="TOPLAM KAYIT"
                    sayi={dashboardKayitlari.length}
                    renk="#f97316"
                  />

                  {NEDENLER.map(
                    (neden) => (

                      <KpiKart
                        key={neden.ad}
                        baslik={neden.ad}
                        sayi={
                          nedenSayilari[
                            neden.ad
                          ] || 0
                        }
                        renk={neden.renk}
                      />

                    )
                  )}

                </div>


                <div className="mt-5 grid gap-4 md:grid-cols-3">

                  <OzetKart
                    ikon="📅"
                    baslik="SON 30 GÜN"
                    deger={son30Gun.toString()}
                    alt="Trafo değişim kaydı"
                  />

                  <OzetKart
                    ikon="📍"
                    baslik="EN ÇOK DEĞİŞİM YAPILAN İLÇE"
                    deger={
                      String(
                        enCokIlce[0]
                      )
                    }
                    alt={`${enCokIlce[1]} kayıt`}
                  />

                  <OzetKart
                    ikon="⚡"
                    baslik="EN ÇOK DEĞİŞİM NEDENİ"
                    deger={
                      String(
                        enCokNeden[0]
                      )
                    }
                    alt={`${enCokNeden[1]} kayıt`}
                  />

                </div>


                <div className="mt-6 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">

                  <Panel
                    baslik="Değişim Nedenleri"
                    altBaslik="Seçili filtreye göre dağılım"
                  >

                    <div className="mt-7 flex flex-col items-center">

                      <div
                        className="relative h-52 w-52 rounded-full"
                        style={{
                          background:
                            `conic-gradient(${donutGradient})`,
                        }}
                      >

                        <div className="absolute inset-9 flex flex-col items-center justify-center rounded-full bg-[#101d30]">

                          <div className="text-3xl font-black">
                            {dashboardKayitlari.length}
                          </div>

                          <div className="text-xs text-slate-500">
                            TOPLAM
                          </div>

                        </div>

                      </div>

                      <div className="mt-7 grid w-full gap-2">

                        {NEDENLER.map(
                          (neden) => (

                            <div
                              key={neden.ad}
                              className="flex items-center justify-between rounded-lg bg-[#07111f] px-3 py-2"
                            >

                              <div className="flex items-center gap-2">

                                <span
                                  className="h-3 w-3 rounded-full"
                                  style={{
                                    backgroundColor:
                                      neden.renk,
                                  }}
                                />

                                <span className="text-xs font-bold">
                                  {neden.ad}
                                </span>

                              </div>

                              <span className="text-sm font-black">
                                {
                                  nedenSayilari[
                                    neden.ad
                                  ] || 0
                                }
                              </span>

                            </div>

                          )
                        )}

                      </div>

                    </div>

                  </Panel>


                  <Panel
                    baslik="Yıllara Göre Değişim Nedenleri"
                    altBaslik="Her renk ayrı bir değişim nedenini gösterir"
                  >

                    <GrafikLegend />

                    <div className="mt-6 flex h-72 items-end gap-5 overflow-x-auto border-b border-slate-700 pb-1">

                      {yillikNedenler.map(
                        (item) => (

                          <div
                            key={item.yil}
                            className="flex min-w-24 flex-col items-center justify-end"
                          >

                            <div className="mb-2 text-xs font-black text-slate-300">
                              {item.toplam}
                            </div>

                            <div className="flex h-52 items-end gap-1">

                              {NEDENLER.map(
                                (neden) => {

                                  const sayi =
                                    item.nedenler[
                                      neden.ad
                                    ] || 0;

                                  const yukseklik =
                                    sayi
                                      ? Math.max(
                                          7,
                                          (
                                            sayi /
                                            maxYillik
                                          ) * 185
                                        )
                                      : 0;

                                  return (

                                    <div
                                      key={neden.ad}
                                      title={`${neden.ad}: ${sayi}`}
                                      className="w-2 rounded-t"
                                      style={{
                                        height:
                                          `${yukseklik}px`,
                                        backgroundColor:
                                          neden.renk,
                                      }}
                                    />

                                  );

                                }
                              )}

                            </div>

                            <div className="mt-2 text-xs text-slate-400">
                              {item.yil}
                            </div>

                          </div>

                        )
                      )}

                    </div>

                  </Panel>

                </div>


                <div className="mt-6">

                  <Panel
                    baslik="Aylara Göre Değişim Nedenleri"
                    altBaslik={
                      dashboardYil
                        ? `${dashboardYil} yılı aylık dağılımı`
                        : "Aylık dağılım için yukarıdan bir yıl seçin"
                    }
                  >

                    <GrafikLegend />

                    {!dashboardYil ? (

                      <BosAlan>
                        Aylık grafiği görüntülemek için yıl seçiniz.
                      </BosAlan>

                    ) : (

                      <div className="mt-6 flex h-72 items-end gap-3 overflow-x-auto border-b border-slate-700">

                        {aylikNedenler.map(
                          (item) => (

                            <div
                              key={item.ay}
                              className="flex min-w-20 flex-col items-center justify-end"
                            >

                              <div className="mb-2 text-xs font-black">
                                {item.toplam}
                              </div>

                              <div className="flex h-52 items-end gap-[2px]">

                                {NEDENLER.map(
                                  (neden) => {

                                    const sayi =
                                      item.nedenler[
                                        neden.ad
                                      ] || 0;

                                    const yukseklik =
                                      sayi
                                        ? Math.max(
                                            6,
                                            (
                                              sayi /
                                              maxAylik
                                            ) * 180
                                          )
                                        : 0;

                                    return (

                                      <div
                                        key={neden.ad}
                                        title={`${item.ay} - ${neden.ad}: ${sayi}`}
                                        className="w-[6px] rounded-t"
                                        style={{
                                          height:
                                            `${yukseklik}px`,
                                          backgroundColor:
                                            neden.renk,
                                        }}
                                      />

                                    );

                                  }
                                )}

                              </div>

                              <div className="mt-2 text-[10px] text-slate-400">
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

                    )}

                  </Panel>

                </div>


                <div className="mt-6">

                  <Panel
                    baslik="Son Trafo Değişimleri"
                    altBaslik="Sistemdeki son 8 kayıt"
                  >

                    <KayitTablosu
                      kayitlar={
                        kayitlar.slice(
                          0,
                          8
                        )
                      }
                      detay={
                        setDetayKayit
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


            {/* YENİ / DÜZENLE */}

            {sayfa === "yeni" && (

              <form
                onSubmit={kaydet}
                className="space-y-6"
              >

                <FormBolumu
                  baslik="📍 KONUM BİLGİLERİ"
                >

                  <FormGrid>

                    <ComboAlani
                      baslik="Yıl *"
                      deger={form.yil}
                      degistir={
                        (v) =>
                          formDegistir(
                            "yil",
                            v
                          )
                      }
                      secenekler={YIL_SECENEKLERI}
                      listeId="yil-listesi"
                      gerekli
                    />

                    <Alan baslik="Ay *">

                      <select
                        required
                        value={form.ay}
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

                    <ComboAlani
                      baslik="İlçe"
                      deger={form.ilce}
                      degistir={
                        (v) =>
                          formDegistir(
                            "ilce",
                            v
                          )
                      }
                      secenekler={ILCE_SECENEKLERI}
                      listeId="ilce-listesi"
                    />

                    <MetinAlani
                      baslik="Mahalle"
                      deger={form.mahalle}
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
                      deger={form.tr}
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
                      deger={form.lokasyon_id}
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
                      deger={form.trafo_id}
                      degistir={
                        (v) =>
                          formDegistir(
                            "trafo_id",
                            v
                          )
                      }
                    />

                    <ComboAlani
                      baslik="Trafo Tipi"
                      deger={form.trafo_tipi}
                      degistir={
                        (v) =>
                          formDegistir(
                            "trafo_tipi",
                            v
                          )
                      }
                      secenekler={
                        KONUM_TRAFO_TIPLERI
                      }
                      listeId="konum-trafo-tipi-listesi"
                    />

                  </FormGrid>

                </FormBolumu>


                <FormBolumu
                  baslik="🔴 SÖKÜLEN TRAFO"
                >

                  <FormGrid>

                    <ComboAlani
                      baslik="Gücü"
                      deger={form.sokulen_gucu}
                      degistir={
                        (v) =>
                          formDegistir(
                            "sokulen_gucu",
                            v
                          )
                      }
                      secenekler={GUC_SECENEKLERI}
                      listeId="sokulen-guc-listesi"
                    />

                    <ComboAlani
                      baslik="Gerilim"
                      deger={form.sokulen_gerilim}
                      degistir={
                        (v) =>
                          formDegistir(
                            "sokulen_gerilim",
                            v
                          )
                      }
                      secenekler={GERILIM_SECENEKLERI}
                      listeId="sokulen-gerilim-listesi"
                    />

                    <ComboAlani
                      baslik="Markası"
                      deger={form.sokulen_markasi}
                      degistir={
                        (v) =>
                          formDegistir(
                            "sokulen_markasi",
                            v
                          )
                      }
                      secenekler={MARKA_SECENEKLERI}
                      listeId="sokulen-marka-listesi"
                    />

                    <MetinAlani
                      baslik="Seri No"
                      deger={form.sokulen_seri_no}
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
                      deger={form.sokulen_imal_yili}
                      degistir={
                        (v) =>
                          formDegistir(
                            "sokulen_imal_yili",
                            v
                          )
                      }
                    />

                    <ComboAlani
                      baslik="Trafo Tipi"
                      deger={form.sokulen_trafo_tipi}
                      degistir={
                        (v) =>
                          formDegistir(
                            "sokulen_trafo_tipi",
                            v
                          )
                      }
                      secenekler={TRAFO_TIP_SECENEKLERI}
                      listeId="sokulen-trafo-tipi-listesi"
                    />

                    <MetinAlani
                      baslik="Tamir Yılı"
                      deger={form.sokulen_tamir_yili}
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
                      deger={form.sokulen_tamir_firmasi}
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
                      deger={form.sokulen_yuklenici}
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

                    <ComboAlani
                      baslik="Gücü"
                      deger={form.takilan_gucu}
                      degistir={
                        (v) =>
                          formDegistir(
                            "takilan_gucu",
                            v
                          )
                      }
                      secenekler={GUC_SECENEKLERI}
                      listeId="takilan-guc-listesi"
                    />

                    <ComboAlani
                      baslik="Gerilim"
                      deger={form.takilan_gerilim}
                      degistir={
                        (v) =>
                          formDegistir(
                            "takilan_gerilim",
                            v
                          )
                      }
                      secenekler={GERILIM_SECENEKLERI}
                      listeId="takilan-gerilim-listesi"
                    />

                    <ComboAlani
                      baslik="Markası"
                      deger={form.takilan_markasi}
                      degistir={
                        (v) =>
                          formDegistir(
                            "takilan_markasi",
                            v
                          )
                      }
                      secenekler={MARKA_SECENEKLERI}
                      listeId="takilan-marka-listesi"
                    />

                    <MetinAlani
                      baslik="Seri No"
                      deger={form.takilan_seri_no}
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
                      deger={form.takilan_imal_yili}
                      degistir={
                        (v) =>
                          formDegistir(
                            "takilan_imal_yili",
                            v
                          )
                      }
                    />

                    <ComboAlani
                      baslik="Trafo Tipi"
                      deger={form.takilan_trafo_tipi}
                      degistir={
                        (v) =>
                          formDegistir(
                            "takilan_trafo_tipi",
                            v
                          )
                      }
                      secenekler={TRAFO_TIP_SECENEKLERI}
                      listeId="takilan-trafo-tipi-listesi"
                    />

                    <MetinAlani
                      baslik="Tamir Yılı"
                      deger={form.takilan_tamir_yili}
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
                      deger={form.takilan_tamir_firmasi}
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
                        value={form.tarih}
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
                        value={form.degisim_nedeni}
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
                              key={neden.ad}
                              value={neden.ad}
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
                        value={form.aciklama}
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
                          setSayfa("kayitlar");

                        }
                      }
                      className="rounded-xl border border-slate-700 px-6 py-3 font-bold text-slate-300 hover:bg-slate-800"
                    >
                      Vazgeç
                    </button>

                  )}

                  <button
                    type="submit"
                    disabled={kaydediliyor}
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


            {/* KAYITLAR */}

            {sayfa === "kayitlar" && (

              <>

                <div className="mb-5 rounded-2xl border border-slate-800 bg-[#101d30] p-4">

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">

                    <input
                      value={arama}
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
                      value={filtreYil}
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
                            key={yil}
                            value={yil}
                          >
                            {yil}
                          </option>

                        )
                      )}

                    </select>

                    <select
                      value={filtreAy}
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
                      value={filtreNeden}
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
                            key={neden.ad}
                            value={neden.ad}
                          >
                            {neden.ad}
                          </option>

                        )
                      )}

                    </select>

                  </div>


                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <div className="text-sm text-slate-400">

                      <span className="font-black text-white">
                        {filtrelenmisKayitlar.length}
                      </span>{" "}
                      kayıt görüntüleniyor.

                    </div>

                    <button
                      type="button"
                      onClick={excelAktar}
                      disabled={
                        filtrelenmisKayitlar.length === 0
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      📥 Excel&apos;e Aktar
                    </button>

                  </div>

                </div>


                <Panel
                  baslik="Trafo Değişim Kayıtları"
                  altBaslik="Detayları görüntüleyebilir, kayıtları düzenleyebilir veya silebilirsiniz"
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
                          kayitlar={filtrelenmisKayitlar}
                          detay={setDetayKayit}
                          duzenle={kaydiDuzenle}
                          sil={kaydiSil}
                        />

                      )
                  }

                </Panel>

              </>

            )}

          </div>

        </section>

      </div>


      {detayKayit && (

        <DetayModal
          kayit={detayKayit}
          kapat={
            () =>
              setDetayKayit(null)
          }
          duzenle={
            kaydiDuzenle
          }
        />

      )}

    </main>

  );

}


// ============================================================
// STİL
// ============================================================

const inputSinif =
  "w-full rounded-xl border border-slate-700 bg-[#07111f] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-500";


// ============================================================
// EXCEL TEMİZLE
// ============================================================

function excelTemizle(
  deger:
    | string
    | number
    | null
    | undefined
) {

  return String(
    deger ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}


// ============================================================
// FORM BİLEŞENLERİ
// ============================================================

function Alan({
  baslik,
  children,
}: {
  baslik: string;
  children: ReactNode;
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
  degistir: (deger: string) => void;
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


function ComboAlani({
  baslik,
  deger,
  degistir,
  secenekler,
  listeId,
  gerekli = false,
}: {
  baslik: string;
  deger: string;
  degistir: (deger: string) => void;
  secenekler: string[];
  listeId: string;
  gerekli?: boolean;
}) {

  return (

    <Alan baslik={baslik}>

      <div className="relative">

        <input
          type="text"
          list={listeId}
          required={gerekli}
          autoComplete="off"
          value={deger}
          onChange={
            (e) =>
              degistir(
                e.target.value
              )
          }
          placeholder="Seçiniz veya yazınız"
          className={`${inputSinif} pr-10`}
        />

        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500">
          ▼
        </div>

        <datalist id={listeId}>

          {secenekler.map(
            (secenek) => (

              <option
                key={secenek}
                value={secenek}
              />

            )
          )}

        </datalist>

      </div>

    </Alan>

  );

}


function FormGrid({
  children,
}: {
  children: ReactNode;
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
  children: ReactNode;
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


function MenuButonu({
  aktif,
  onClick,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  children: ReactNode;
}) {

  return (

    <button
      onClick={onClick}
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
          backgroundColor: renk,
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


function OzetKart({
  ikon,
  baslik,
  deger,
  alt,
}: {
  ikon: string;
  baslik: string;
  deger: string;
  alt: string;
}) {

  return (

    <div className="rounded-2xl border border-slate-800 bg-[#101d30] p-5">

      <div className="flex items-start gap-4">

        <div className="rounded-xl bg-[#07111f] p-3 text-2xl">
          {ikon}
        </div>

        <div className="min-w-0">

          <div className="text-xs font-bold text-slate-500">
            {baslik}
          </div>

          <div className="mt-2 truncate text-xl font-black">
            {deger}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            {alt}
          </div>

        </div>

      </div>

    </div>

  );

}


function Panel({
  baslik,
  altBaslik,
  children,
}: {
  baslik: string;
  altBaslik?: string;
  children: ReactNode;
}) {

  return (

    <section className="rounded-2xl border border-slate-800 bg-[#101d30] p-5 lg:p-6">

      <h2 className="text-lg font-black">
        {baslik}
      </h2>

      {altBaslik && (

        <p className="mt-1 text-sm text-slate-500">
          {altBaslik}
        </p>

      )}

      {children}

    </section>

  );

}


function GrafikLegend() {

  return (

    <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">

      {NEDENLER.map(
        (neden) => (

          <div
            key={neden.ad}
            className="flex items-center gap-2"
          >

            <span
              className="h-3 w-3 rounded-sm"
              style={{
                backgroundColor:
                  neden.renk,
              }}
            />

            <span className="text-[10px] font-bold text-slate-400">
              {neden.ad}
            </span>

          </div>

        )
      )}

    </div>

  );

}


function HataKutusu({
  children,
}: {
  children: ReactNode;
}) {

  return (

    <div className="mb-5 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
      {children}
    </div>

  );

}


function BosAlan({
  children,
}: {
  children: ReactNode;
}) {

  return (

    <div className="my-8 w-full rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-500">
      {children}
    </div>

  );

}


function NedenEtiketi({
  neden,
}: {
  neden: string | null;
}) {

  const bulunan =
    NEDENLER.find(
      (x) =>
        x.ad === neden
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
      className="inline-flex whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-black text-white"
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
  detay,
  duzenle,
  sil,
}: {
  kayitlar: TrafoKaydi[];
  detay: (kayit: TrafoKaydi) => void;
  duzenle: (kayit: TrafoKaydi) => void;
  sil: (kayit: TrafoKaydi) => void;
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

          <tr className="border-b border-slate-700 text-[10px] uppercase text-slate-500">

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
              Konum
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
                key={kayit.id}
                className="border-b border-slate-800/80 hover:bg-slate-800/30"
              >

                <td className="whitespace-nowrap px-3 py-4 font-semibold">
                  {tarihGoster(kayit.tarih)}
                </td>

                <td className="px-3 py-4">
                  {kayit.yil || "-"}
                </td>

                <td className="whitespace-nowrap px-3 py-4">
                  {kayit.ay || "-"}
                </td>

                <td className="whitespace-nowrap px-3 py-4">
                  {kayit.ilce || "-"}
                </td>

                <td className="whitespace-nowrap px-3 py-4">
                  {kayit.mahalle || "-"}
                </td>

                <td className="whitespace-nowrap px-3 py-4">
                  {kayit.lokasyon_id || "-"}
                </td>

                <td className="whitespace-nowrap px-3 py-4">
                  {kayit.trafo_id || "-"}
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
                        detay(kayit)
                    }
                    className="mr-2 rounded-lg border border-orange-700 px-3 py-2 text-xs font-bold text-orange-300 hover:bg-orange-950"
                  >
                    Detay
                  </button>

                  <button
                    onClick={
                      () =>
                        duzenle(kayit)
                    }
                    className="mr-2 rounded-lg border border-blue-700 px-3 py-2 text-xs font-bold text-blue-300 hover:bg-blue-950"
                  >
                    Düzenle
                  </button>

                  <button
                    onClick={
                      () =>
                        sil(kayit)
                    }
                    className="rounded-lg border border-red-800 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-950"
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
// DETAY MODAL
// ============================================================

function DetayModal({
  kayit,
  kapat,
  duzenle,
}: {
  kayit: TrafoKaydi;
  kapat: () => void;
  duzenle: (kayit: TrafoKaydi) => void;
}) {

  return (

    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={kapat}
    >

      <div
        onMouseDown={
          (e) =>
            e.stopPropagation()
        }
        className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-700 bg-[#0b1628] shadow-2xl"
      >

        <div className="flex items-start justify-between border-b border-slate-800 bg-[#101d30] px-5 py-5 sm:px-7">

          <div>

            <div className="text-xs font-black uppercase tracking-[0.18em] text-orange-400">
              TRAFO DEĞİŞİM KAYDI
            </div>

            <h2 className="mt-1 text-xl font-black sm:text-2xl">

              {kayit.ilce || "İlçe Belirtilmemiş"}

              {kayit.mahalle && (
                <span className="text-slate-400">
                  {" "}
                  / {kayit.mahalle}
                </span>
              )}

            </h2>

            <div className="mt-3 flex flex-wrap items-center gap-3">

              <span className="rounded-lg bg-[#07111f] px-3 py-1.5 text-xs font-bold text-slate-300">
                📅 {tarihGoster(kayit.tarih)}
              </span>

              <NedenEtiketi
                neden={
                  kayit.degisim_nedeni
                }
              />

            </div>

          </div>

          <button
            onClick={kapat}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 text-xl text-slate-400 transition hover:border-red-600 hover:bg-red-950 hover:text-red-300"
            title="Kapat"
          >
            ×
          </button>

        </div>


        <div className="max-h-[calc(92vh-155px)] overflow-y-auto p-5 sm:p-7">

          <DetayBolumu
            baslik="📍 KONUM BİLGİLERİ"
          >

            <DetayGrid>

              <DetayAlan
                baslik="Yıl"
                deger={kayit.yil}
              />

              <DetayAlan
                baslik="Ay"
                deger={kayit.ay}
              />

              <DetayAlan
                baslik="İlçe"
                deger={kayit.ilce}
              />

              <DetayAlan
                baslik="Mahalle"
                deger={kayit.mahalle}
              />

              <DetayAlan
                baslik="TR"
                deger={kayit.tr}
              />

              <DetayAlan
                baslik="Lokasyon ID"
                deger={kayit.lokasyon_id}
              />

              <DetayAlan
                baslik="Trafo ID"
                deger={kayit.trafo_id}
              />

              <DetayAlan
                baslik="Trafo Tipi"
                deger={kayit.trafo_tipi}
              />

            </DetayGrid>

          </DetayBolumu>


          <div className="mt-5 grid gap-5 xl:grid-cols-2">

            <DetayBolumu
              baslik="🔴 SÖKÜLEN TRAFO"
              renkSinif="border-red-900/70"
            >

              <DetayGrid iki>

                <DetayAlan
                  baslik="Gücü"
                  deger={
                    kayit.sokulen_gucu
                      ? `${kayit.sokulen_gucu} kVA`
                      : null
                  }
                />

                <DetayAlan
                  baslik="Gerilim"
                  deger={kayit.sokulen_gerilim}
                />

                <DetayAlan
                  baslik="Markası"
                  deger={kayit.sokulen_markasi}
                />

                <DetayAlan
                  baslik="Seri No"
                  deger={kayit.sokulen_seri_no}
                />

                <DetayAlan
                  baslik="İmal Yılı"
                  deger={kayit.sokulen_imal_yili}
                />

                <DetayAlan
                  baslik="Trafo Tipi"
                  deger={kayit.sokulen_trafo_tipi}
                />

                <DetayAlan
                  baslik="Tamir Yılı"
                  deger={kayit.sokulen_tamir_yili}
                />

                <DetayAlan
                  baslik="Tamir Firması"
                  deger={kayit.sokulen_tamir_firmasi}
                />

                <DetayAlan
                  baslik="Yüklenici"
                  deger={kayit.sokulen_yuklenici}
                />

              </DetayGrid>

            </DetayBolumu>


            <DetayBolumu
              baslik="🟢 TAKILAN TRAFO"
              renkSinif="border-emerald-900/70"
            >

              <DetayGrid iki>

                <DetayAlan
                  baslik="Gücü"
                  deger={
                    kayit.takilan_gucu
                      ? `${kayit.takilan_gucu} kVA`
                      : null
                  }
                />

                <DetayAlan
                  baslik="Gerilim"
                  deger={kayit.takilan_gerilim}
                />

                <DetayAlan
                  baslik="Markası"
                  deger={kayit.takilan_markasi}
                />

                <DetayAlan
                  baslik="Seri No"
                  deger={kayit.takilan_seri_no}
                />

                <DetayAlan
                  baslik="İmal Yılı"
                  deger={kayit.takilan_imal_yili}
                />

                <DetayAlan
                  baslik="Trafo Tipi"
                  deger={kayit.takilan_trafo_tipi}
                />

                <DetayAlan
                  baslik="Tamir Yılı"
                  deger={kayit.takilan_tamir_yili}
                />

                <DetayAlan
                  baslik="Tamir Firması"
                  deger={kayit.takilan_tamir_firmasi}
                />

              </DetayGrid>

            </DetayBolumu>

          </div>


          <div className="mt-5">

            <DetayBolumu
              baslik="📅 İŞLEM BİLGİLERİ"
            >

              <div className="grid gap-4 md:grid-cols-3">

                <DetayAlan
                  baslik="Tarih"
                  deger={
                    tarihGoster(
                      kayit.tarih
                    )
                  }
                />

                <DetayAlan
                  baslik="Değişim Nedeni"
                  deger={
                    kayit.degisim_nedeni
                  }
                />

                <DetayAlan
                  baslik="Kayıt No"
                  deger={
                    kayit.sira_no ||
                    kayit.id
                  }
                />

              </div>

              <div className="mt-4 rounded-xl border border-slate-800 bg-[#07111f] p-4">

                <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  AÇIKLAMA
                </div>

                <div className="whitespace-pre-wrap text-sm leading-6 text-slate-200">
                  {
                    kayit.aciklama ||
                    "Açıklama girilmemiş."
                  }
                </div>

              </div>

            </DetayBolumu>

          </div>

        </div>


        <div className="flex items-center justify-end gap-3 border-t border-slate-800 bg-[#101d30] px-5 py-4 sm:px-7">

          <button
            onClick={kapat}
            className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-slate-800"
          >
            Kapat
          </button>

          <button
            onClick={
              () =>
                duzenle(kayit)
            }
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-blue-500"
          >
            ✏️ Kaydı Düzenle
          </button>

        </div>

      </div>

    </div>

  );

}


function DetayBolumu({
  baslik,
  renkSinif = "border-slate-800",
  children,
}: {
  baslik: string;
  renkSinif?: string;
  children: ReactNode;
}) {

  return (

    <section
      className={`overflow-hidden rounded-2xl border ${renkSinif} bg-[#101d30]`}
    >

      <div className="border-b border-slate-800 bg-[#07111f] px-5 py-3 text-sm font-black">
        {baslik}
      </div>

      <div className="p-4 sm:p-5">
        {children}
      </div>

    </section>

  );

}


function DetayGrid({
  children,
  iki = false,
}: {
  children: ReactNode;
  iki?: boolean;
}) {

  return (

    <div
      className={
        iki
          ? "grid gap-3 sm:grid-cols-2"
          : "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      }
    >
      {children}
    </div>

  );

}


function DetayAlan({
  baslik,
  deger,
}: {
  baslik: string;
  deger:
    | string
    | number
    | null
    | undefined;
}) {

  const gosterilecek =
    deger === null ||
    deger === undefined ||
    String(deger).trim() === ""
      ? "-"
      : String(deger);

  return (

    <div className="rounded-xl border border-slate-800 bg-[#07111f] px-4 py-3">

      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
        {baslik}
      </div>

      <div className="mt-1 break-words text-sm font-bold text-slate-100">
        {gosterilecek}
      </div>

    </div>

  );

}


// ============================================================
// TARİH
// ============================================================

function tarihGoster(
  tarih: string | null
) {

  if (!tarih) {
    return "-";
  }

  const parca =
    tarih.split("-");

  if (
    parca.length !== 3
  ) {
    return tarih;
  }

  return `${parca[2]}.${parca[1]}.${parca[0]}`;

}
