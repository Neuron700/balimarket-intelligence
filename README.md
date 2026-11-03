# BaliMarket Intelligence

UMKM Bali dapat menguji analisis foto tanpa akun, membuka alasan harga dan konteks musim, lalu mendaftar untuk menyimpan produk dan mencatat feedback penjualan.

## Jalur aplikasi

- `/`: landing page dengan CTA uji produk dan dashboard contoh.
- `/demo`: dashboard baca-saja berisi tiga produk contoh, riwayat contoh, dan kalender. Tidak menulis data usaha atau mengirim foto contoh ke AI.
- `/try`: formulir guest empat input: foto, nama, kategori, biaya per unit. Panggilan memakai API provider sungguhan; jika belum dikonfigurasi, UI menyatakan belum aktif.
- `/dashboard`: dashboard personal yang memerlukan sesi NextAuth; upload, riwayat, feedback, kalender, dan penyimpanan hasil guest setelah login.

Panduan konfigurasi layanan (Supabase, Google OAuth, AI) tidak lagi dipublikasikan sebagai halaman web; seluruh langkahnya ada di bagian "Mengaktifkan layanan" README ini saja, agar tidak ada halaman developer-facing yang terekspos ke pengguna produk.

Visual kompetitor aktif di `/competitors` dan dashboard: foto produk + 1–2 foto pembanding (unggahan atau tautan HTTPS), skor relatif 1–10, matriks empat aspek, alasan dan saran. Satu perbandingan memakai satu panggilan vision nyata. Hasil perbandingan disimpan sementara di sessionStorage tab; salin atau unduh laporan teks untuk arsip. Perbandingan visual berbagi kuota guest dengan analisis produk. Tidak ada label BETA dekoratif.

## Stack dan perintah

Basis live yang sudah ada memakai Next.js 16.3.4 App Router, React 19, TypeScript, Tailwind CSS 4, NextAuth/Auth.js, Supabase Postgres + private Storage, dan Vercel. Revisi mempertahankan versi Next.js yang telah dipakai; tidak mengklaim memakai Next.js 14.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm build
pnpm start
pnpm exec tsc --noEmit -p tsconfig.next.json
pnpm test
```

Konfigurasi Vercel ada pada `vercel.json`; region fungsi Singapore. Skrip `*:sites` mempertahankan jalur build lama untuk arsip pratinjau Sites. Deployment utama menggunakan Next.js standar.

## Mengaktifkan layanan

Jangan kirim secret lewat chat atau source code.

1. Buat proyek Supabase. Jalankan `supabase/schema.sql`, kemudian `supabase/migrations/20261030_guest_ai.sql`. Database yang sudah memiliki skema awal hanya memerlukan migrasi tambahan.
2. Tambahkan `next_auth` pada API/Data API → Exposed schemas. Tabel aplikasi dan guest memakai RLS tanpa akses anon/authenticated; hanya rute server dengan service-role secret yang mengaksesnya.
3. Di Vercel → proyek `balimarket-intelligence` → Settings → Environment Variables → Production, isi `SUPABASE_URL` dan `SUPABASE_SECRET_KEY` (server key `sb_secret_...`). Nama legacy `SUPABASE_SERVICE_ROLE_KEY` tetap diterima untuk kompatibilitas.
4. AUTH_SECRET dan GUEST_SESSION_SECRET telah dibuat terpisah di server deployment ini. Untuk lingkungan lain, buat dua nilai acak minimal 32 byte. AUTH_URL production: `https://balimarket-intelligence.vercel.app`.
5. Google: buat OAuth client jenis Web application, atur origin domain aplikasi dan callback `https://balimarket-intelligence.vercel.app/api/auth/callback/google`. Isi AUTH_GOOGLE_ID dan AUTH_GOOGLE_SECRET. Saat consent screen Testing, tambahkan akun penguji ke Test users.
6. Pilih salah satu provider AI berikut, lalu redeploy. Jangan mengaktifkan billing secara otomatis.

### Gemini dengan kuota gratis

Buat API key di https://aistudio.google.com/ pada proyek Free Tier. Ketersediaan, wilayah, limit, dan ketentuan penggunaan mengikuti akun. Gemini 3.5 Flash-Lite tercantum memiliki free tier untuk input gambar dan teks; input/output pada free tier dapat dipakai untuk peningkatan produk Google.

```dotenv
AI_PROVIDER=gemini
GEMINI_API_KEY=<isi hanya di Vercel>
GEMINI_MODEL=gemini-3.5-flash-lite
AI_GUEST_DAILY_LIMIT=20
```

Satu analisis memanggil model tiga kali. Batas 20 percobaan guest/hari berarti paling banyak 60 panggilan guest; panggilan akun juga memakai kuota provider. Periksa limit akun, jangan menganggap angka ini selalu cocok.

### Grok / xAI

Buat API key dan periksa kredit API pada https://console.x.ai/ . Jangan mengasumsikan akses gratis Grok pada aplikasi memberi kredit API. Pilih model yang tersedia pada akun dan mendukung gambar serta structured JSON.

```dotenv
AI_PROVIDER=grok
XAI_API_KEY=<isi hanya di Vercel>
XAI_MODEL=grok-4.7
AI_GUEST_DAILY_LIMIT=20
```

Tidak ada pergantian provider diam-diam. Nama provider dan model tersimpan bersama hasil; source berupa `grok` atau `gemini`. Data contoh terpisah memakai source `demo`.

## Analisis yang transparan

`POST /api/analyze-product` digunakan guest dan akun. Cookie/sesi dan pemilik diperiksa server-side. Foto divalidasi format, ukuran, dan signature JPEG/PNG/WebP. Foto guest tidak meminta bahan; jika tidak diberikan, prompt tidak mengarang fakta bahan.

Tiga panggilan API dilakukan berurutan:

1. **Vision:** atribut visual, presentasi foto, skor visual subjektif dan saran. Setelah respons valid, tahap berikutnya dimulai.
2. **Harga:** biaya, hasil vision, konteks bulan/kategori Bali, data kalender yang tersedia, serta maksimal lima feedback milik akun. Harga minimum wajib menutup biaya produksi; hasil tidak valid ditolak.
3. **Strategi:** copy marketplace/Instagram, timing, dan satu kalimat insight musiman, berdasarkan hasil sebelumnya.

Client meminta `application/x-ndjson`. Backend mengirim event progress hanya pada perubahan tahap nyata; tidak ada timer yang berpura-pura menyelesaikan tahap. Jam detik di UI mengukur lama request sebenarnya. Error provider/kuota tidak digantikan kalkulasi demo.

Hasil memiliki `visual_attributes`, `cost_impact`, `seasonal_insight`, `seasonal_context`, model, alasan harga, copy, serta strategi. Bagian “Lihat alasan AI” merangkum dasar rekomendasi yang dapat ditinjau, bukan membuka chain-of-thought internal model. Pola wisata adalah asumsi perencanaan, bukan data permintaan langsung. Tanggal Galungan/Kuningan tidak ditebak.

## Pembatasan guest dan penyimpanan

- Cookie HttpOnly, Secure pada production, SameSite=Lax, ID acak dan HMAC; masa akses sesi tujuh hari.
- Maksimal dua percobaan per sesi; pembatas kedua maksimal dua per IP per hari UTC. Menghapus cookie tidak menghapus kuota IP.
- IP tidak disimpan mentah: hanya HMAC dengan secret server. Header IP Vercel dipakai, bukan nilai yang dikirim dalam body pengguna.
- RPC Postgres `reserve_guest_trial` mengunci bucket sesi, IP, dan global dengan advisory transaction locks, lalu memeriksa dan menambah counter secara atomik. Tidak ada counter global JavaScript yang hilang saat instance serverless berganti.
- `AI_GUEST_DAILY_LIMIT` membatasi seluruh analisis guest per hari UTC. Jika limit habis, hasil terdahulu tetap dapat dibaca. Counter bertambah saat panggilan AI dimulai; kegagalan provider setelah itu dapat menghabiskan percobaan.
- Hasil/foto guest tersedia melalui sesi pemilik selama 24 jam pada tabel privat `guest_analyses`. Baris kedaluwarsa ditolak saat dibaca dan dibersihkan pada percobaan berikutnya; ini bukan janji penghapusan fisik tepat pada detik ke-24 jam.
- CTA daftar membawa intent penyimpanan ke login. Setelah login, endpoint claim mengikat hasil ke user, memindahkan foto ke bucket privat, dan menyimpan produk + hasil dalam transaksi. User lain tidak dapat mengklaim hasil tanpa cookie guest yang sah.

Perangkat/IP bersama dapat berbagi batas guest. Ini tradeoff MVP; model yang lebih luas dapat memakai Turnstile atau rate limiter khusus tanpa menghilangkan pembatas biaya global.

## Autentikasi dan data akun

Credentials menggunakan JWT strategy yang didukung Auth.js. Supabase adapter menyimpan user/accounts; tabel sessions menyimpan ID sesi acak yang diperiksa pada callback JWT dan dihapus saat logout. Password memakai scrypt N=32768, r=8, p=3 dengan salt acak. Pemulihan sandi dan verifikasi email belum tersedia pada MVP.

Semua query produk/feedback dibatasi user ID dari sesi, bukan dari client. Foreign key gabungan menjaga pasangan produk/pemilik feedback. Foto hanya ditampilkan lewat `/api/products/[id]/image` setelah pemeriksaan pemilik. URL/key Supabase tidak dikirim ke browser.

## Pengujian

`pnpm test` memeriksa token guest, manipulasi cookie, HMAC IP, tahapan API dengan respons tertahan, kegagalan provider tanpa fallback, validasi harga, serta hashing password. Mock API menguji kontrak dan urutan; bukan bukti panggilan Grok/Gemini nyata.

Untuk menguji SQL pada PostgreSQL lokal dalam WASM tanpa kredensial Supabase:

```sh
npm install --prefix .sites-runtime/testdeps --cache .sites-runtime/npm-cache --ignore-scripts --no-audit --no-fund --package-lock=false @electric-sql/pglite@0.3.14
node --test tests/guest-sql.test.mjs
```

Tes SQL menjalankan skema + migrasi, mengirim enam permintaan, memeriksa batas dua, penggantian cookie/IP, budget global, serta penolakan role anon. Ini tidak menggantikan uji koneksi production Supabase.

Tanpa secret layanan nyata, pengujian provider, Google OAuth, dan Supabase production belum dapat dinyatakan berhasil. Halaman uji akan menampilkan “Layanan AI belum aktif”; dashboard contoh tetap dapat dibuka.

## Referensi resmi

- Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- Gemini billing/free tier: https://ai.google.dev/gemini-api/docs/billing
- Gemini generateContent REST: https://ai.google.dev/api/generate-content
- Grok API pricing: https://docs.x.ai/developers/pricing
- Supabase keys: https://supabase.com/docs/guides/getting-started/api-keys
- Auth.js Supabase adapter: https://authjs.dev/getting-started/adapters/supabase
- Google OAuth provider: https://next-auth.js.org/providers/google

Foto tas rotan contoh berasal dari soeji/Ankorstore; ilustrasi Bali, dupa dan kopi dibuat sebagai aset prototipe. Ganti foto contoh dengan foto usaha sendiri untuk produk nyata.


## Perbaikan filter periode

Dropdown pada ringkasan dashboard memakai `components/period-picker.tsx` dan `components/period-picker.module.css`. Menu melekat di tepi kanan tombol dan bekerja dengan klik di luar maupun Escape.
