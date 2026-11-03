import type {Product} from './domain';
export type AnalysisStage='vision'|'pricing'|'strategy'|'saving';
export const stageLabels:Record<AnalysisStage,string>={vision:'Menganalisis foto produk…',pricing:'Menghitung estimasi harga…',strategy:'Menyusun rekomendasi strategi…',saving:'Menyimpan hasil analisis…'};
export type AnalysisEvent={type:'progress';stage:AnalysisStage}|{type:'result';product:Product;remaining?:number;mode:'guest'|'live'}|{type:'error';error:string;remaining?:number};
