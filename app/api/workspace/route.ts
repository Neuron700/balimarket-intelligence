import {serverConfig,safeError} from '@/lib/server-config';
import {currentUser} from '@/lib/session';
import {db} from '@/lib/db';
import type {Product} from '@/lib/domain';
export const dynamic='force-dynamic';
export async function GET(){
 const cfg=serverConfig();
 const user=await currentUser();
 const config={...cfg,ai:cfg.ai&&Boolean(user),aiConfigured:cfg.ai,authConfigured:cfg.auth,auth:Boolean(user),mode:user&&cfg.database?'live':'demo',name:user?.name,email:user?.email};
 if(!user)return Response.json({config},{headers:{'Cache-Control':'no-store'}});
 try{
  const database=db();
  const [ps,fs]=await Promise.all([
   database.from('products').select('*,ai_results(*)').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100),
   database.from('sales_feedback').select('*,products!inner(name,production_cost,category)').eq('user_id',user.id).order('created_at',{ascending:false}).limit(200)
  ]);
  if(ps.error||fs.error)return Response.json({config,error:'Data akun belum dapat dimuat. Periksa migrasi database dan koneksi server.'},{status:503});
  const feedback=(fs.data||[]).map(f=>({...f,name:f.products.name,production_cost:Number(f.products.production_cost),category:f.products.category,products:undefined}));
  const products=(ps.data||[]).filter(p=>p.ai_results.length).map(p=>{const analysis=p.ai_results.sort((a:{created_at:string},b:{created_at:string})=>b.created_at.localeCompare(a.created_at))[0];return {id:p.id,name:p.name,category:p.category,material:p.material,production_cost:Number(p.production_cost),image_url:`/api/products/${p.id}/image`,created_at:p.created_at,status:feedback.find(f=>f.product_id===p.id)?.status||'belum_terjual',analysis:{...analysis,price_min:Number(analysis.price_min),price_max:Number(analysis.price_max),source:analysis.source||'grok'}} as Product;});
  return Response.json({config,products,feedback},{headers:{'Cache-Control':'no-store'}});
 }catch{return safeError('Data usaha belum dapat dimuat. Periksa koneksi database.',503);}
}
