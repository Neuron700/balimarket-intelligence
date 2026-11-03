import {currentUser} from '@/lib/session';
import {db} from '@/lib/db';
import {safeError} from '@/lib/server-config';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const user=await currentUser();if(!user)return safeError('Masuk untuk mengakses foto produk.',401);
 const {id}=await params;
 const {data,error}=await db().from('products').select('image_url').eq('id',id).eq('user_id',user.id).maybeSingle();
 if(error||!data)return safeError('Foto tidak ditemukan.',404);
 const {data:photo,error:downloadError}=await db().storage.from('product-images').download(data.image_url);
 if(downloadError||!photo)return safeError('Foto belum dapat dimuat.',503);
 return new Response(photo,{headers:{'Content-Type':photo.type||'image/jpeg','Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff'}});
}
