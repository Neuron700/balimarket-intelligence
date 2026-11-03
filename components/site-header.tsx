import {ArrowUpRight} from 'lucide-react';
import {GateLogo} from './bali-art';
export default function SiteHeader(){return <header className="site-header"><a className="brand" href="/" aria-label="BaliMarket beranda"><span className="brand-symbol"><GateLogo/></span><span>BaliMarket<span className="brand-sub">INTELLIGENCE</span></span></a><nav aria-label="Navigasi BaliMarket"><a href="/demo">Dashboard demo</a><a href="/competitors">Visual kompetitor</a><a href="/login" className="site-signin">Masuk<ArrowUpRight size={15}/></a></nav></header>;}
