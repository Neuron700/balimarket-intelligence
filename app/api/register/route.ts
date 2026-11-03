import {z} from 'zod';
import {db,rateLimit} from '@/lib/db';
import {hashKey,hashPassword} from '@/lib/password';
import {sameOrigin,serverConfig,safeError} from '@/lib/server-config';
export async function POST(request:Request){
 if(!sameOrigin(request))return safeError('Permintaan tidak diizinkan.',403);
 if(!serverConfig().auth)return safeError('Pendaftaran belum dikonfigurasi. Gunakan mode demo terlebih dahulu.',503);
 if(Number(request.headers.get('content-length')||0)>4096)return safeError('Data terlalu besar.',413);
 try{
  const input=z.object({name:z.string().trim().min(2).max(80),email:z.string().email().max(254),password:z.string().min(10).max(128)}).safeParse(await request.json());
  if(!input.success)return safeError('Isi nama, email valid, dan kata sandi minimal 10 karakter.',400);
  const ip=request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown';
  if(!await rateLimit(`register:${await hashKey(ip)}`,5,3600))return safeError('Terlalu banyak percobaan. Coba lagi satu jam mendatang.',429);
  const {data,error}=await db().rpc('register_local_user',{p_name:input.data.name,p_email:input.data.email.toLowerCase().trim(),p_hash:await hashPassword(input.data.password)});
  if(error||!data)return safeError('Akun tidak dapat dibuat. Coba masuk atau gunakan email berbeda.',409);
  return Response.json({success:true},{status:201});
 }catch{return safeError('Pendaftaran belum tersedia. Pastikan skema database sudah diterapkan.',503);}
}
