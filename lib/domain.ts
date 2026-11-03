import { z } from 'zod';
export const categories = ['Kerajinan & Aksesori', 'Makanan & Minuman', 'Aromaterapi & Wellness', 'Fashion & Tekstil', 'Dekorasi Rumah'] as const;
export type ProductCategory = typeof categories[number];
export type Feedback = { id: string; product_id: string; status: 'terjual' | 'tidak_laku'; actual_price: number; notes: string; created_at: string; name?: string; production_cost?: number; category?: string };
export type Analysis = { price_min: number; price_max: number; price_reasoning: string; desc_marketplace: string; desc_instagram: string; strategy_recommendation: string; best_timing: string; visual_score: number; visual_advice: string[]; source: 'demo' | 'grok' | 'gemini'; visual_attributes?: string[]; cost_impact?: string; seasonal_insight?: string; seasonal_context?: {month:string;level:string;category:string;notes:string;religious?:string;nextHoliday?:{name:string;date:string;note:string;daysUntil:number}|null}; model?:string };
export type Product = { id: string; name: string; category: ProductCategory; material: string; production_cost: number; image_url: string; created_at: string; status: 'belum_terjual' | 'terjual' | 'tidak_laku'; analysis: Analysis };
export const productInput = z.object({ name: z.string().trim().min(3).max(100), category: z.enum(categories), material: z.string().trim().min(2).max(300).default('Detail bahan belum disebutkan'), production_cost: z.number().positive().max(100000000), image: z.string().max(4500000).regex(/^data:image\/(jpeg|png|webp);base64,/), competitors: z.array(z.string().max(4500000).regex(/^data:image\/(jpeg|png|webp);base64,/)).max(3).optional(), history: z.array(z.object({ status: z.enum(['terjual','tidak_laku']), actual_price: z.number().positive(), production_cost: z.number().positive().optional(), name: z.string().max(100).optional(), category: z.string().max(100).optional(), notes: z.string().max(500).optional() })).max(5).optional() });
export const analysisSchema = z.object({ price_min: z.number().positive(), price_max: z.number().positive(), price_reasoning: z.string().min(10), desc_marketplace: z.string().min(10), desc_instagram: z.string().min(10), strategy_recommendation: z.string().min(10), best_timing: z.string().min(3), visual_score: z.number().min(0).max(100), visual_advice: z.array(z.string()).max(5) }).refine(v => v.price_max >= v.price_min, 'Rentang harga tidak valid');
export function rupiah(value: number) { return new Intl.NumberFormat('id-ID', {style: 'currency', currency:'IDR', maximumFractionDigits:0}).format(value); }
export const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
export const fullMonthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
export function baliMonth() { return Number(new Intl.DateTimeFormat('en', {timeZone:'Asia/Makassar',month:'numeric'}).format(new Date())) - 1; }
// Sumber: Surat Edaran Ditjen Bimas Hindu Kemenag RI & kalender Bali 2026-2027 (detikBali, katadata, exotravel.com), dicek Nov 2026.
// Tanggal hari raya Bali mengikuti kalender Pawukon (210 hari), bukan siklus Gregorian tetap — daftar ini WAJIB diperbarui tiap tahun, jangan diekstrapolasi otomatis.
export const baliHolidays2026_2027 = [
 { name: 'Hari Raya Nyepi', date: '2026-03-19', note: 'Seluruh aktivitas publik berhenti total; bukan periode promosi.' },
 { name: 'Hari Raya Galungan', date: '2026-06-17', note: 'Satu-satunya Galungan di 2026 (tahun langka, biasanya 2x/tahun); momentum belanja kebutuhan upacara & hampers.' },
 { name: 'Hari Raya Kuningan', date: '2026-06-27', note: 'Penutup rangkaian Galungan; permintaan oleh-oleh dan dekorasi masih tinggi.' },
 { name: 'Hari Raya Galungan', date: '2027-01-13', note: 'Siklus 210 hari berikutnya.' },
 { name: 'Hari Raya Kuningan', date: '2027-01-23', note: 'Siklus 210 hari berikutnya.' },
 { name: 'Hari Raya Nyepi', date: '2027-03-08', note: 'Verifikasi ulang mendekati tanggal; sumber pawukon dapat direvisi otoritas keagamaan.' },
 { name: 'Hari Raya Galungan', date: '2027-08-11', note: 'Galungan kedua di 2027.' },
 { name: 'Hari Raya Kuningan', date: '2027-08-21', note: 'Galungan kedua di 2027.' },
] as const;
export function upcomingBaliHoliday(from = new Date()) {
 const fromTime = from.getTime();
 const upcoming = baliHolidays2026_2027.filter(h => new Date(h.date).getTime() >= fromTime).sort((a,b)=>a.date.localeCompare(b.date))[0];
 if (!upcoming) return null;
 const days = Math.round((new Date(upcoming.date).getTime() - fromTime) / 86400000);
 return { ...upcoming, daysUntil: days };
}
export function seasonalContext(category: string, month = baliMonth()) {
 const high = [5,6,7,11].includes(month);
 const nextHoliday = upcomingBaliHoliday();
 const holidayNote = nextHoliday && nextHoliday.daysUntil <= 45 ? ` ${nextHoliday.name} sekitar ${nextHoliday.daysUntil} hari lagi (${nextHoliday.date}) — ${nextHoliday.note}` : '';
 return { month: fullMonthNames[month], level: high ? 'Tinggi' : [2,3,4,8,9,10].includes(month) ? 'Sedang' : 'Rendah', category, notes: (high ? 'Pola musiman: libur sekolah dan wisata pertengahan tahun atau akhir tahun. Ini asumsi perencanaan, bukan data permintaan langsung.' : 'Fokus pada pelanggan lokal, bundling, dan persiapan stok sebelum periode wisata ramai. Permintaan tiap usaha dapat berbeda.') + holidayNote, religious: 'Galungan dan Kuningan mengikuti siklus kalender Bali 210 hari; tanggal bersumber dari Surat Edaran Kemenag RI dan wajib diverifikasi ulang setiap tahun, jangan disamakan dengan bulan Gregorian tetap.', nextHoliday };
}
export function demoAnalysis(input: {name:string;category:string;material:string;production_cost:number}, history: Pick<Feedback,'status'|'actual_price'|'production_cost'>[] = []): Analysis {
 const usable = history.filter(f=>f.production_cost && f.actual_price > f.production_cost);
 const ratios = usable.map(f => Math.min(2.8, Math.max(1.15, f.actual_price / f.production_cost! + (f.status === 'terjual' ? 0.03 : -0.15))));
 const multiplier = ratios.length ? ratios.reduce((a,b)=>a+b,0)/ratios.length : 1.85;
 const low = Math.ceil(input.production_cost * Math.max(1.2,multiplier-0.18)/1000)*1000;
 const high = Math.ceil(input.production_cost * Math.max(1.4,multiplier+0.3)/1000)*1000;
 const season=seasonalContext(input.category);
 return {price_min:low,price_max:high,price_reasoning:`Simulasi: biaya produksi ${rupiah(input.production_cost)} × kisaran markup ${Math.round((multiplier-0.18-1)*100)}–${Math.round((multiplier+0.3-1)*100)}%. ${usable.length ? `${usable.length} feedback dengan biaya produksi tersedia dipakai untuk menyesuaikan markup.` : 'Belum ada histori yang cukup; markup awal digunakan.'} Belum termasuk ongkir, biaya platform, dan pajak. Ini bukan riset harga pasar.`,desc_marketplace:`${input.name} — dibuat dengan ${input.material}, membawa sentuhan lokal Bali ke keseharian Anda. Cocok untuk digunakan sendiri maupun sebagai hadiah penuh makna. Dukung karya usaha lokal. Hubungi kami untuk detail ukuran dan ketersediaan.`,desc_instagram:`Sepotong cerita Bali, untuk hari-harimu 🌿\n\nKenalan dengan ${input.name}, dibuat dengan ${input.material} dan perhatian pada setiap detail.\n\nTertarik? Kirim DM untuk info dan pemesanan.\n\n#ProdukLokalBali #UMKMBali #BaliMarket #MadeInBali`,strategy_recommendation:`${season.notes} Untuk ${input.name}, siapkan foto dengan cahaya alami, tampilkan detail bahan, dan uji dua rentang harga. Catat penjualan agar rekomendasi berikutnya punya konteks.`,best_timing:'Mulai persiapan 3–4 minggu sebelum Juni–Agustus atau Desember. Verifikasi kalender acara lokal sebelum promosi.',visual_score:0,visual_advice:['Mode demo belum menilai foto. Hubungkan Grok untuk analisis visual produk dan kompetitor.'],source:'demo'};
}
const base = (name:string, category:ProductCategory, cost:number, material:string):Analysis => ({...demoAnalysis({name,category,production_cost:cost,material}), visual_score:0});
export const seedProducts: Product[] = [
 {id:'demo-bag',name:'Tas Rotan Bulat',category:categories[0],material:'Rotan alami, tali kulit sintetis',production_cost:85000,image_url:'/images/rattan-bag.webp',created_at:'2026-10-28T08:00:00Z',status:'belum_terjual',analysis:{...base('Tas Rotan Bulat',categories[0],85000,'rotan alami'),price_min:150000,price_max:195000,price_reasoning:'Data contoh: kisaran harga ini setara markup sekitar 76–129% dari biaya produksi. Angka ini untuk ilustrasi penjelasan harga, bukan hasil analisis foto atau riset pasar langsung. Biaya platform, ongkir, dan pajak tetap perlu diperhitungkan.',cost_impact:'Dengan biaya produksi 85.000 rupiah per unit. selisih harga contoh terhadap biaya masih perlu menutup biaya operasional dan platform.'}},
 {id:'demo-incense',name:'Dupa Cendana Bali',category:categories[2],material:'Serbuk cendana dan bambu',production_cost:18000,image_url:'/images/incense.svg',created_at:'2026-10-27T08:00:00Z',status:'terjual',analysis:{...base('Dupa Cendana Bali',categories[2],18000,'cendana'),price_min:35000,price_max:45000,price_reasoning:'Data contoh: kisaran harga ini setara markup sekitar 94–150% dari biaya produksi. Angka ini untuk ilustrasi penjelasan harga, bukan hasil analisis foto atau riset pasar langsung. Biaya platform, ongkir, dan pajak tetap perlu diperhitungkan.',cost_impact:'Dengan biaya produksi 18.000 rupiah per unit. selisih harga contoh terhadap biaya masih perlu menutup biaya operasional dan platform.'}},
 {id:'demo-coffee',name:'Kopi Arabika Kintamani',category:categories[1],material:'Biji kopi arabika, kemasan 200 gram',production_cost:45000,image_url:'/images/coffee.svg',created_at:'2026-10-26T08:00:00Z',status:'terjual',analysis:{...base('Kopi Arabika Kintamani',categories[1],45000,'arabika Kintamani'),price_min:75000,price_max:95000,price_reasoning:'Data contoh: kisaran harga ini setara markup sekitar 67–111% dari biaya produksi. Angka ini untuk ilustrasi penjelasan harga, bukan hasil analisis foto atau riset pasar langsung. Biaya platform, ongkir, dan pajak tetap perlu diperhitungkan.',cost_impact:'Dengan biaya produksi 45.000 rupiah per unit. selisih harga contoh terhadap biaya masih perlu menutup biaya operasional dan platform.'}},
];
export const seedFeedback: Feedback[] = [
 {id:'feedback-incense',product_id:'demo-incense',status:'terjual',actual_price:40000,notes:'Pelanggan lokal, tanpa diskon.',created_at:'2026-10-28T09:00:00Z',name:'Dupa Cendana Bali',production_cost:18000,category:categories[2]},
 {id:'feedback-coffee',product_id:'demo-coffee',status:'terjual',actual_price:85000,notes:'Terjual sebagai oleh-oleh.',created_at:'2026-10-27T09:00:00Z',name:'Kopi Arabika Kintamani',production_cost:45000,category:categories[1]}
];
