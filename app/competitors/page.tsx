import type {Metadata} from 'next';
import VisualComparator from '@/components/visual-comparator';
export const metadata:Metadata={title:'Visual Kompetitor — BaliMarket Intelligence',description:'Bandingkan foto produk dengan 1–2 foto kompetitor, lihat skor visual, alasan, dan saran perbaikan dari AI.'};
export default function CompetitorPage(){return <VisualComparator/>;}
