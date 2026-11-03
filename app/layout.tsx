import type { Metadata } from 'next';
import './globals.css';
import './experience.css';
import './competitor.css';
export const metadata: Metadata = {
 title: 'BaliMarket — Intelligence untuk Usaha Lokal',
 description: 'Harga lebih tepat. Cerita lebih kuat. Asisten bisnis UMKM Bali untuk analisis produk, strategi musim, dan pembelajaran penjualan.',
 icons: { icon: '/favicon.svg' },
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
 return <html lang="id"><body>{children}</body></html>;
}
