# BaliMarket Intelligence

**Tim:** SikikAya  
**Kompetisi:** Bali DigiFest 2026, AI Web Innovation Challenge  
**Kategori:** Mahasiswa/Umum  
**Demo produk:** https://balimarket-intelligence.vercel.app  
**Repository:** https://github.com/Neuron700/balimarket-intelligence

> MVP aplikasi web untuk membantu UMKM Bali meninjau rekomendasi harga, presentasi produk, dan strategi promosi berbantuan AI. Keputusan harga akhir tetap berada pada pelaku usaha.

## Description

Web app yang membantu UMKM Bali (kerajinan, kuliner, fashion lokal) menentukan harga jual, deskripsi produk, dan strategi pemasaran lewat analisis AI atas foto produk — bisa dicoba langsung tanpa akun (guest mode), dengan alasan di balik tiap rekomendasi ditampilkan secara transparan.

## Problem & Target User

Masalah yang ingin ditangani adalah keterbatasan sumber daya untuk menyusun harga jual, visual produk, dan materi promosi saat UMKM Bali mulai menjual produk secara daring. Penetapan harga tanpa memperhatikan biaya dapat membuat margin terlalu tipis, sedangkan materi promosi yang kurang informatif dapat menyulitkan calon pembeli memahami produk. Target utama: pelaku UMKM pemula dan berkembang di Bali, khususnya usaha kerajinan, kuliner, dan produk lokal, yang belum memiliki tim khusus pemasaran atau analisis harga. Ini merupakan hipotesis kebutuhan pengguna yang masih perlu divalidasi melalui riset lapangan dan umpan balik pengguna.

## Key Features

- **Guest Try-Mode** (`/try`) — analisis AI nyata tanpa perlu daftar akun, dibatasi 2 percobaan/sesi dan kuota harian per IP.
- **Analisis produk dengan alasan transparan** — tiap hasil (harga, deskripsi, strategi) dilengkapi bagian "Lihat alasan AI" yang merangkum dasar rekomendasi: atribut visual terdeteksi, dampak biaya produksi, dan konteks musiman yang dipakai.
- **Visual kompetitor** (`/competitors`) — bandingkan foto produk dengan 1–2 foto pembanding, dapat skor relatif 1–10 dan saran perbaikan, menggunakan panggilan AI vision nyata.
- **Konteks musiman otomatis** — insight musim wisata Bali dan tanggal hari raya (Galungan/Kuningan/Nyepi) yang disimpan dalam kode aplikasi dan perlu diverifikasi terhadap pengumuman resmi, terintegrasi ke hasil analisis, bukan modul terpisah.
- **Dashboard personal** (`/dashboard`) — riwayat produk, tandai status "terjual/tidak laku", dan feedback loop: hingga 5 feedback terakhir milik user dipakai sebagai konteks tambahan saat AI menganalisis produk berikutnya, agar rekomendasi makin personal.
- **Dashboard demo** (`/demo`) — pratinjau read-only dengan data contoh untuk calon pengguna, tidak memanggil AI.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend**: Next.js API Routes
- **Auth**: NextAuth.js / Auth.js (Credentials + Google OAuth opsional), strategi JWT, password di-hash dengan scrypt
- **Database**: Supabase Postgres (dengan Row Level Security — akses hanya lewat service-role key di server, tidak ada akses anon/authenticated langsung dari client) + Supabase Storage (privat) untuk foto produk
- **AI**: Google Gemini (`gemini-3.5-flash-lite`) sebagai provider default; arsitektur mendukung Grok/xAI sebagai alternatif (pilih salah satu via env, tidak ada fallback diam-diam antar provider)
- **Hosting**: Vercel (region Singapore)

## AI Implementation

**Model/API**: Google Gemini — vision untuk analisis foto produk, reasoning untuk estimasi harga dan strategi.

**Peran AI dalam produk** — setiap analisis memanggil model AI 3 kali secara berurutan:
1. **Vision**: mengekstrak atribut visual produk, kualitas presentasi foto, skor visual, dan saran perbaikan dari foto yang diunggah.
2. **Harga**: mengombinasikan biaya produksi, hasil vision, konteks bulan & kategori (termasuk kalender musiman Bali), serta hingga 5 feedback penjualan terakhir milik user (jika ada) untuk menghasilkan rentang harga beserta alasannya. Harga minimum divalidasi agar menutup biaya produksi.
3. **Strategi**: menyusun draft deskripsi untuk marketplace & Instagram, rekomendasi waktu promosi, dan satu kalimat insight musiman — berdasarkan hasil 2 tahap sebelumnya.

**Input**: foto produk, nama, kategori, biaya produksi (opsional untuk guest: bahan). **Output**: rentang harga + alasan, deskripsi marketplace & Instagram, rekomendasi strategi, insight musiman.

**Alasan AI diperlukan**: penentuan harga dan copywriting produk membutuhkan reasoning atas kombinasi data visual (kualitas, kerumitan produk) dan data kontekstual (biaya, musim, histori) yang sulit diselesaikan dengan aturan statis — AI memberi rekomendasi yang beradaptasi per produk dan per user, bukan kalkulasi tetap.

**Batasan**: keluaran AI adalah rekomendasi yang perlu ditinjau, bukan harga pasar terukur atau harga final yang mengikat. Pola musiman adalah asumsi perencanaan, bukan data permintaan pasar waktu nyata. Aplikasi menyertakan referensi tanggal hari raya 2026–2027 pada `lib/domain.ts`; ketepatannya tetap harus dicek kembali terhadap sumber resmi sebelum dipakai untuk keputusan bisnis.

## Architecture / Data Flow

```
User (browser)
   │
   ▼
Next.js Frontend (App Router) — /, /demo, /try, /competitors, /dashboard
   │
   ▼
Next.js API Routes — termasuk POST /api/analyze-product (streaming NDJSON progress)
   │
   ├──▶ Supabase Postgres (RLS, hanya diakses via service-role di server)
   │        — users, products, ai_results, sales_feedback, guest_analyses
   ├──▶ Supabase Storage (privat) — foto produk, diakses lewat /api/products/[id]/image setelah verifikasi pemilik
   └──▶ Google Gemini API — vision + reasoning (3 panggilan berurutan per analisis)
```

Guest mode memakai cookie HttpOnly + HMAC session dan RPC Postgres dengan advisory lock untuk mencegah race condition pada penghitungan kuota di lingkungan serverless.

## Installation / Run Instructions

```sh
pnpm install --frozen-lockfile
pnpm dev        # mode pengembangan
pnpm build      # build production
pnpm start      # jalankan hasil build
pnpm exec tsc --noEmit -p tsconfig.next.json   # cek tipe

# Pengujian otomatis belum dapat direproduksi pada snapshot repository saat ini.
# Lihat bagian Known Limitations.
```

**Prasyarat:** Node.js 22.13 atau lebih baru dan pnpm sesuai versi pada `package.json`. Jalankan perintah dari root repository. Mode pengembangan membutuhkan environment variable server untuk fungsi database, login, dan AI.

**Mengaktifkan layanan** (lihat `.env.example` untuk daftar lengkap variabel):

1. Buat proyek Supabase, jalankan `supabase/schema.sql` lalu `supabase/migrations/20261030_guest_ai.sql`.
2. Tambahkan schema `next_auth` ke Exposed schemas Supabase. Semua akses tabel aplikasi memakai service-role key di server — tidak ada akses langsung dari client.
3. Isi `SUPABASE_URL` dan `SUPABASE_SECRET_KEY` di Environment Variables Vercel.
4. Buat `AUTH_SECRET` dan `GUEST_SESSION_SECRET` (minimal 32 byte acak).
5. (Opsional) Buat OAuth client Google untuk login Google.
6. Pilih satu provider AI (`AI_PROVIDER=gemini` dengan `GEMINI_API_KEY`, atau `AI_PROVIDER=grok` dengan `XAI_API_KEY`) — tidak ada pergantian provider otomatis/diam-diam.

## Deployment URL

https://balimarket-intelligence.vercel.app

## Known Limitations

- Kalender musiman berbasis pola umum wisata Bali (bukan data transaksi pasar real-time); tanggal hari raya bersumber dari kalender resmi tahun berjalan dan perlu diverifikasi ulang tiap tahun.
- Pemulihan kata sandi dan verifikasi email belum tersedia pada versi MVP ini.
- Guest mode membatasi kuota per sesi & per IP (HMAC, bukan IP mentah yang disimpan); perangkat/IP yang dipakai bersama berpotensi berbagi batas kuota — tradeoff yang disadari untuk MVP, dapat ditingkatkan dengan Turnstile/rate limiter khusus di pengembangan lanjutan.
- Hasil & foto guest tersimpan sementara (hingga 24 jam) sebelum diklaim lewat pendaftaran akun.
- `package.json` mendefinisikan `pnpm test`, tetapi berkas `tests/` yang dirujuk skrip tersebut **belum disertakan di snapshot GitHub ini**. Karena itu `pnpm test` belum dapat diklaim lolos dari checkout bersih.
- Build Production berhasil pada deployment Vercel dari commit terdahulu; keberhasilan itu tidak menggantikan unit test, pengujian akun juri, dan uji integrasi menyeluruh.
- Analisis AI membutuhkan koneksi provider yang aktif, kuota tersedia, dan foto yang diizinkan pengguna untuk diproses oleh layanan eksternal.

## Template / Boilerplate

Menurut deklarasi tim, project menggunakan struktur dasar Next.js dan tidak memakai template desain komersial pihak ketiga. Klaim asal kode dan aset perlu dikonfirmasi terhadap riwayat pengembangan sebelum submission final.

## Pre-existing Components

**Tanggal mulai pengembangan:** 27 Oktober 2026, berdasarkan konfirmasi ketua tim SikikAya, Syahlan Budi Namora Harahap.

Daftar komponen yang sudah tersedia sebelum periode kompetisi dan perubahan khusus Bali DigiFest 2026 masih perlu dicocokkan dengan jadwal resmi kompetisi serta riwayat pengerjaan tim. Tanggal mulai proyek ini tidak dengan sendirinya membuktikan apakah proyek termasuk pre-existing atau seluruhnya dikembangkan selama masa lomba. Status tersebut akan diungkapkan secara jujur dalam submission final.

## Third-party Resources / Credits

- **Gemini API** (Google) — model vision & reasoning. Referensi: https://ai.google.dev/gemini-api/docs/pricing
- **Supabase** — database & storage. Referensi: https://supabase.com/docs/guides/getting-started/api-keys
- **Auth.js / NextAuth.js** — autentikasi, termasuk Supabase adapter: https://authjs.dev/getting-started/adapters/supabase
- **Library open-source**: lucide-react (ikon), radix-ui & @base-ui/react (komponen UI primitif), recharts (grafik), date-fns, react-hook-form, zod (validasi), drizzle-orm, class-variance-authority, tailwind-merge, dan lainnya — lihat `package.json` untuk daftar lengkap.
- Foto tas rotan contoh diatribusikan kepada soeji/Ankorstore menurut catatan source sebelumnya. **Status lisensi/izin penggunaan dan atribusi final foto perlu diverifikasi** sebelum penjurian atau diganti dengan foto milik tim yang telah mendapat izin. Ilustrasi Bali, dupa, dan kopi digunakan sebagai aset prototipe; asal serta hak pemakaian aset harus dicatat sesuai bukti yang dimiliki tim.

## Team Members

**Nama Tim:** SikikAya

| Nama | Peran dan area tanggung jawab |
| --- | --- |
| Syahlan Budi Namora Harahap (Ketua) | Team Leader, Full Stack Developer & AI Integration. Fokus pada arsitektur sistem, backend, Supabase, Gemini, autentikasi, API, GitHub, dan Vercel. |
| Rafif Arya Maulana | Frontend/UI Developer & Quality Assurance. Fokus pada implementasi antarmuka, responsivitas, pengujian fitur, dokumentasi bug, dan perbaikan pengalaman penggunaan. |
| Annya Santika | UI/UX Researcher & Product Documentation. Fokus pada riset kebutuhan UMKM, evaluasi pengalaman pengguna, penulisan proposal, dokumentasi, serta materi presentasi dan demo. |

## AI Coding Assistant

Pengembangan proyek ini dibantu AI coding assistant Claude (Anthropic) dan ChatGPT (OpenAI) untuk sebagian penulisan kode, debugging, refactoring, dan penyusunan dokumentasi selama proses pengembangan, sesuai ketentuan lomba yang mengizinkan AI sebagai development assistant. Tim tetap bertanggung jawab penuh atas pemahaman, pengujian, dan keputusan teknis source code yang disubmit.


### Transparansi analisis AI

`POST /api/analyze-product` dipanggil baik oleh guest maupun user yang login; kepemilikan sesi diverifikasi di server. Foto divalidasi format, ukuran, dan signature file (JPEG/PNG/WebP). Progress dikirim via `application/x-ndjson` — setiap event progress mencerminkan tahap nyata yang sedang berjalan (bukan timer buatan), sehingga waktu yang tampil di UI adalah durasi request yang sebenarnya. Kegagalan provider/kuota tidak pernah digantikan oleh kalkulasi dummy/demo.

### Keamanan & privasi data

- Password di-hash dengan scrypt (N=32768, r=8, p=3) dengan salt acak.
- Foto produk hanya dapat diakses lewat endpoint yang memverifikasi kepemilikan user terlebih dahulu.
- IP tidak pernah disimpan dalam bentuk mentah — hanya HMAC dengan secret server, untuk keperluan pembatasan kuota guest.
- URL/key Supabase tidak pernah dikirim ke browser; seluruh akses database lewat server.
- Pengguna diingatkan bahwa Gemini free tier dapat memakai data input/output untuk peningkatan layanan Google — disclaimer ini ditampilkan di UI, bukan disembunyikan.

### Pengujian

```sh
pnpm test
```

**Status saat audit:** perintah di atas tercantum dalam `package.json`, tetapi file `tests/domain.test.ts`, `tests/guest-ai.test.ts`, dan `tests/visual.test.ts` belum ditemukan pada branch `main`. Perintah tersebut baru dapat dijalankan setelah source test ditambahkan. Daftar cakupan seperti token guest, cookie, HMAC IP, validasi harga, dan kegagalan provider merupakan **rencana/verifikasi yang harus dibuktikan**, bukan klaim bahwa test dari checkout bersih sudah lulus.

**Pengujian SQL yang direncanakan:** script `tests/guest-sql.test.mjs` juga belum ada pada snapshot ini, sehingga prosedur di bawah tidak dapat dijalankan sampai berkas pengujiannya dilengkapi.

```sh
npm install --prefix .sites-runtime/testdeps --cache .sites-runtime/npm-cache --ignore-scripts --no-audit --no-fund --package-lock=false @electric-sql/pglite@0.3.14
node --test tests/guest-sql.test.mjs
```

## AI & Technology Disclosure

Dokumen disclosure dalam repository ini tersedia di [`AI-TECHNOLOGY-DISCLOSURE.md`](./AI-TECHNOLOGY-DISCLOSURE.md). Penggunaan AI coding assistant, status project sebelum kompetisi, sumber kalender, dan hak aset harus disampaikan secara jujur.

## Alur Demo untuk Juri

1. Buka halaman utama dan kunjungi `/demo` untuk melihat struktur dashboard dengan data simulasi.
2. Buka `/try`, unggah foto produk yang boleh digunakan, lalu isi nama, kategori, dan biaya per unit.
3. Jalankan analisis dengan layanan AI aktif dan kuota yang mencukupi. Tunjukkan proses dari input sampai keluaran, termasuk alasan rekomendasi harga.
4. Buka `/competitors` untuk mencoba pembandingan visual dengan foto pembanding yang diizinkan.
5. Jelaskan perbedaan data demonstrasi dan hasil AI asli, serta bagaimana aplikasi menanggapi pembatasan kuota atau kegagalan API.

## Status Submission

Repository dan URL deployment merupakan bagian submission tahap awal, bukan pengganti proposal PDF dan AI & Technology Disclosure pada formulir resmi. Sebelum batas waktu, tim perlu memfinalkan informasi pre-existing, izin aset, pengujian, kredensial juri bila dibutuhkan, serta menandai commit yang dikumpulkan dengan tag/release sesuai panduan panitia.
