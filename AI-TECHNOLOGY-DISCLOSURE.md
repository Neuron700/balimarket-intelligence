# AI & Technology Disclosure BaliMarket Intelligence

**Tim:** SikikAya  
**Ketua:** Syahlan Budi Namora Harahap  
**Anggota:** Rafif Arya Maulana dan Annya Santika  

Bali DigiFest 2026 AI Web Innovation Challenge | Kategori Mahasiswa/Umum

| Komponen | Isi |
|---|---|
| **Nama Produk** | BaliMarket Intelligence |
| **Framework / Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| **Backend / Runtime** | Next.js API Routes (Node.js) |
| **Database / Storage** | Supabase Postgres (Row Level Security aktif, akses hanya via service-role key di server) + Supabase Storage privat untuk foto produk |
| **Hosting / Deployment** | Vercel (region Singapore) |
| **AI Model / API / Method** | Google Gemini (`gemini-3.5-flash-lite`) — Computer Vision untuk analisis foto produk, Large Language Model/Generative AI untuk reasoning harga, copywriting, dan strategi pemasaran. Arsitektur sistem juga mendukung Grok/xAI sebagai provider alternatif (dipilih via konfigurasi server, tidak pernah berpindah provider secara otomatis/diam-diam). |
| **Peran AI dalam Produk** | AI adalah fungsi inti, bukan fitur tambahan: (1) menganalisis foto produk untuk mengekstrak atribut visual (kategori, kualitas, kerumitan), (2) menghasilkan estimasi rentang harga beserta alasannya berdasarkan biaya produksi, hasil analisis visual, dan konteks musiman, (3) menyusun draft deskripsi produk untuk marketplace/Instagram dan rekomendasi strategi waktu promosi, (4) membandingkan foto produk dengan foto kompetitor dan memberi skor daya saing visual. Setiap analisis produk memanggil model AI 3 kali secara berurutan (vision → harga → strategi). |
| **Dataset / Data Source** | Tidak memakai dataset pelatihan khusus. Konteks musiman memakai asumsi umum pola wisata Bali serta daftar tanggal hari raya 2026–2027 yang tersimpan pada `lib/domain.ts`. Referensi sumber dicatat dalam komentar source, tetapi verifikasi silang tanggal dengan dokumen resmi tetap harus dilakukan sebelum penjurian dan pemakaian bisnis. Data contoh di dashboard demo bersifat statis untuk ilustrasi, tidak terhubung ke AI. |
| **Open-source Libraries** | next-auth/Auth.js (autentikasi), @auth/supabase-adapter, @supabase/supabase-js, zod (validasi), react-hook-form, lucide-react (ikon), radix-ui & @base-ui/react (komponen UI), recharts (grafik), date-fns, drizzle-orm, tailwind-merge, class-variance-authority — daftar lengkap pada `package.json` repository. |
| **Template / Boilerplate** | Menurut deklarasi tim, dibangun dari struktur standar Next.js tanpa template desain komersial pihak ketiga. Riwayat pengembangan dan kredit yang diperlukan harus dikonfirmasi sebelum submission final. |
| **AI Coding Assistant** | Claude (Anthropic) dan ChatGPT (OpenAI) digunakan sebagai development assistant untuk sebagian penulisan kode, debugging, refactoring, dan penyusunan dokumentasi selama proses pengembangan. Tim tetap bertanggung jawab penuh atas pemahaman, pengujian, dan seluruh keputusan teknis pada source code yang disubmit. |
| **Pre-existing Components** | Pengembangan BaliMarket Intelligence dimulai pada 27 Oktober 2026, sesuai konfirmasi ketua tim SikikAya. Komponen yang telah ada sebelum periode kompetisi dan perubahan yang dilakukan khusus untuk Bali DigiFest 2026 masih perlu dicocokkan dengan jadwal kompetisi dan riwayat pengembangan. Tanggal mulai ini tidak otomatis menentukan status pre-existing. |
| **Third-party Assets / Credits** | Foto tas rotan contoh diatribusikan kepada soeji/Ankorstore menurut dokumentasi source. Izin atau lisensi foto perlu diverifikasi atau foto diganti dengan aset yang dimiliki/diizinkan. Ilustrasi Bali, dupa, dan kopi digunakan sebagai aset prototipe; status hak penggunaan ditinjau sebelum submission final. |

## Pernyataan

Tim SikikAya bertanggung jawab atas penggunaan teknologi, source code, data, library, API, model AI, dan aset dalam BaliMarket Intelligence. **Dokumen ini masih memuat poin yang wajib dikonfirmasi sebelum ditandatangani atau dikirim sebagai disclosure final**, terutama rincian komponen sebelum periode kompetisi, perubahan khusus lomba, dan hak aset contoh. Setelah diverifikasi, tim dapat menandatangani pernyataan resmi sesuai format panitia.

**Catatan privasi data yang relevan dengan penggunaan AI**: Google Gemini free tier dapat memakai data input/output untuk peningkatan layanan sesuai ketentuan Google. Hal ini ditampilkan secara eksplisit kepada pengguna di antarmuka produk (bukan disembunyikan), sejalan dengan prinsip Data Privacy & Responsible AI pada panduan lomba. Pengguna disarankan mengunggah foto yang memang bersedia dibagikan untuk keperluan analisis.

## Tim dan Peran

| Nama | Tanggung jawab |
| --- | --- |
| Syahlan Budi Namora Harahap, Ketua | Team Leader, Full Stack & AI Integration |
| Rafif Arya Maulana | Frontend/UI & Quality Assurance |
| Annya Santika | UI/UX Research & Product Documentation |

