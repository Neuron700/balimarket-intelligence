import {currentUser} from '@/lib/session';
import {guestAccess} from '@/lib/guest-access';
import {db} from '@/lib/db';
import {sameOrigin,safeError} from '@/lib/server-config';
import {saveProductForUser} from '@/lib/save-product';
import type {Product} from '@/lib/domain';
export async function POST(request:Request){
 if(!sameOrigin(request))return safeError('Permintaan tidak diizinkan.',403);
 const user=await currentUser();if(!user)return safeError('Masuk untuk menyimpan hasil analisis.',401);
 const access=await guestAccess(request);if(!access)return Response.json({product:null});
 try{
  const database=db();
  const {data:latest}=await database.from('guest_analyses').select('id').eq('session_key',access.sessionKey).is('claimed_by',null).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(!latest)return Response.json({product:null});
  const {data:claim,error}=await database.from('guest_analyses').update({claimed_by:user.id}).eq('id',latest.id).eq('session_key',access.sessionKey).is('claimed_by',null).select('product').maybeSingle();
  if(error||!claim)return safeError('Hasil ini sedang disimpan. Muat ulang dashboard sebentar lagi.',409);
  try{const product=await saveProductForUser(claim.product as Product,user.id!);return Response.json({product});}
  catch(error){await database.from('guest_analyses').update({claimed_by:null}).eq('id',latest.id).eq('claimed_by',user.id);throw error;}
 }catch{return safeError('Hasil uji coba belum dapat disimpan. Coba lagi sebelum 24 jam.',503);}
}
