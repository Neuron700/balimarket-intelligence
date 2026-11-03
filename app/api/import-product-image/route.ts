import {z} from 'zod';
import {sameOrigin,safeError} from '@/lib/server-config';
import {currentUser} from '@/lib/session';
import {guestAccess} from '@/lib/guest-access';
import {rateLimit} from '@/lib/db';
import {importPublicPhoto,ImageInputError} from '@/lib/image-safety';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request){
 if(!sameOrigin(request))return safeError('Permintaan tidak diizinkan.',403);
 if(Number(request.headers.get('content-length')||0)>4096)return safeError('Tautan terlalu panjang.',413);
 try{
  const body=await request.text();if(body.length>4096)return safeError('Tautan terlalu panjang.',413);
  const parsed=z.object({url:z.string().trim().max(2000).url()}).safeParse(JSON.parse(body));if(!parsed.success)return safeError('Masukkan tautan HTTPS foto atau halaman produk.',400);
  const user=await currentUser();const access=await guestAccess(request,true);const key=user?.id||access?.ipKey;
  if(!key)return safeError('Sesi belum tersedia. Muat ulang halaman lalu coba lagi.',503);
  if(!await rateLimit(`image-import:${key}`,20,3600))return safeError('Batas pengambilan tautan tercapai. Unggah foto langsung atau coba lagi satu jam mendatang.',429);
  const result=await importPublicPhoto(parsed.data.url);
  return Response.json(result,{headers:{'Cache-Control':'no-store',...(access?.setCookie?{'Set-Cookie':access.setCookie}:{})}});
 }catch(error){return safeError(error instanceof ImageInputError?error.message:'Foto pada tautan belum dapat diambil. Unduh gambarnya lalu unggah langsung.',400);}
}
