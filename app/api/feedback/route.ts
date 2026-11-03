import {z} from 'zod';
import {db,rateLimit} from '@/lib/db';
import {currentUser} from '@/lib/session';
import {sameOrigin,safeError} from '@/lib/server-config';
export async function POST(request:Request){
 if(!sameOrigin(request))return safeError('Permintaan tidak diizinkan.',403);
 const user=await currentUser();if(!user)return safeError('Masuk untuk menyimpan feedback.',401);
 try{
  const input=z.object({product_id:z.string().uuid(),status:z.enum(['terjual','tidak_laku']),actual_price:z.number().positive().max(100000000),notes:z.string().max(500).default('')}).safeParse(await request.json());
  if(!input.success)return safeError('Harga dan status feedback tidak valid.',400);
  if(!await rateLimit(`feedback:${user.id}`,60,3600))return safeError('Batas feedback tercapai. Coba lagi nanti.',429);
  const {data:product,error:productError}=await db().from('products').select('id').eq('id',input.data.product_id).eq('user_id',user.id).maybeSingle();
  if(productError||!product)return safeError('Produk tidak ditemukan.',404);
  const {data,error}=await db().from('sales_feedback').insert({...input.data,user_id:user.id}).select().single();
  if(error)return safeError('Feedback belum dapat disimpan.',503);
  return Response.json({feedback:data},{status:201});
 }catch{return safeError('Feedback tidak valid atau penyimpanan belum tersedia.',400);}
}
