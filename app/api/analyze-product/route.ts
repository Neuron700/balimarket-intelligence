import {productInput,type Feedback,type Product} from '@/lib/domain';
import {runAnalysisPipeline,AIServiceError} from '@/lib/ai-pipeline';
import {currentUser} from '@/lib/session';
import {db,rateLimit} from '@/lib/db';
import {sameOrigin,serverConfig,safeError} from '@/lib/server-config';
import {guestAccess,reserveGuestTrial} from '@/lib/guest-access';
import {saveProductForUser} from '@/lib/save-product';
import type {AnalysisEvent,AnalysisStage} from '@/lib/analysis-events';
export const maxDuration=180;
export const runtime='nodejs';
export async function POST(request:Request){
 if(!sameOrigin(request))return safeError('Permintaan tidak diizinkan.',403);
 if(Number(request.headers.get('content-length')||0)>4300000)return safeError('Total foto terlalu besar. Gunakan foto lebih kecil.',413);
 try{
  const text=await request.text();if(text.length>4300000)return safeError('Total foto terlalu besar.',413);
  const parsed=productInput.safeParse(JSON.parse(text));
  if(!parsed.success)return safeError('Lengkapi nama, kategori, biaya produksi, dan foto JPG, PNG, atau WebP maksimal 3 MB.',400);
  const input=parsed.data;
  for(const photo of [input.image,...(input.competitors||[])]){
   let bytes:Uint8Array;try{bytes=Uint8Array.from(atob(photo.split(',')[1]),c=>c.charCodeAt(0));}catch{return safeError('Data foto tidak valid.',400);}
   const valid=(photo.startsWith('data:image/jpeg;')&&bytes[0]===255&&bytes[1]===216)||(photo.startsWith('data:image/png;')&&bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71)||(photo.startsWith('data:image/webp;')&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP');
   if(!valid||bytes.length>3*1024*1024)return safeError('Unggah foto JPG, PNG, atau WebP yang valid, maksimal 3 MB.',400);
  }
  const config=serverConfig();
  if(!config.ai)return safeError('Analisis AI belum diaktifkan. Tidak ada hasil simulasi yang menggantikan panggilan AI.',503);
  const user=await currentUser();
  let history:Partial<Feedback>[]=[];let calendar:unknown[]=[];let remaining:number|undefined;let cookie:string|undefined;let guestSessionKey:string|undefined;
  if(!user){
   if(!config.guestReady)return safeError('Layanan guest belum siap. Pemilik aplikasi perlu menghubungkan database dan pengaturan akses guest.',503);
   const access=await guestAccess(request,true);if(!access)return safeError('Sesi guest tidak dapat diverifikasi. Muat ulang halaman lalu coba lagi.',403);
   cookie=access.setCookie;guestSessionKey=access.sessionKey;
   const reservation=await reserveGuestTrial(access);remaining=reservation.remaining;
   if(!reservation.allowed)return Response.json({error:reservation.reason==='budget'?'Kuota analisis guest harian sudah terpakai. Coba lagi setelah 08.00 WITA.':'Dua percobaan guest sudah digunakan. Hasil sebelumnya tetap tersedia; daftar untuk menyimpan riwayat.',remaining:reservation.reason==='budget'?0:remaining,limitReason:reservation.reason==='budget'?'daily_budget':'session_or_ip',limitReached:true},{status:429,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
  }else{
   if(!await rateLimit(`analyze:${user.id}`,20,3600))return safeError('Batas 20 analisis per jam tercapai. Coba lagi nanti.',429);
   const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Makassar'}).format(new Date());
   const [fs,cs]=await Promise.all([
    db().from('sales_feedback').select('status,actual_price,notes,created_at,products!inner(name,production_cost,category)').eq('user_id',user.id).order('created_at',{ascending:false}).limit(5),
    db().from('seasonal_calendar').select('category,period_start,period_end,demand_level,notes').in('category',[input.category,'Semua kategori']).lte('period_start',today).gte('period_end',today)
   ]);
   if(fs.error||cs.error)return safeError('Konteks usaha belum dapat dimuat. Periksa migrasi database.',503);
   history=(fs.data||[]).map(f=>{const p=f.products as unknown as {name:string;production_cost:number;category:string};return {status:f.status,actual_price:Number(f.actual_price),production_cost:Number(p.production_cost),name:p.name,category:p.category,notes:f.notes,created_at:f.created_at};});calendar=cs.data||[];
  }
  const execute=async(onStage:(s:AnalysisStage)=>void)=>{
   const analysis=await runAnalysisPipeline(input,history,calendar,onStage,request.signal);
   let product:Product={id:crypto.randomUUID(),name:input.name,category:input.category,material:input.material,production_cost:input.production_cost,image_url:input.image,created_at:new Date().toISOString(),status:'belum_terjual',analysis};
   onStage('saving');
   if(user)product=await saveProductForUser(product,user.id!);
   else{
    const {error}=await db().from('guest_analyses').insert({id:product.id,session_key:guestSessionKey,product});
    if(error)throw new AIServiceError('Analisis selesai, tetapi hasil sementara belum dapat disimpan. Periksa migrasi guest.',503);
   }
   return {type:'result' as const,product,remaining,mode:user?'live' as const:'guest' as const};
  };
  const headers:Record<string,string>={'Cache-Control':'no-store'};if(cookie)headers['Set-Cookie']=cookie;
  if(request.headers.get('accept')?.includes('application/x-ndjson')){
   const encoder=new TextEncoder();const stream=new ReadableStream<Uint8Array>({async start(controller){
    const emit=(event:AnalysisEvent)=>{if(!request.signal.aborted)controller.enqueue(encoder.encode(JSON.stringify(event)+'\n'));};
    try{const result=await execute(stage=>emit({type:'progress',stage}));emit(result);}
    catch(error){emit({type:'error',error:error instanceof AIServiceError?error.message:'Analisis belum berhasil. Periksa koneksi lalu coba lagi.',remaining});}
    finally{controller.close();}
   }});
   return new Response(stream,{headers:{...headers,'Cache-Control':'no-store, no-transform','Content-Type':'application/x-ndjson; charset=utf-8','X-Content-Type-Options':'nosniff','X-Accel-Buffering':'no'}});
  }
  return Response.json(await execute(()=>{}),{status:201,headers});
 }catch(error){if(error instanceof Error&&error.message.startsWith('Pembatasan guest'))return safeError(error.message,503);if(error instanceof AIServiceError)return safeError(error.message,error.status);return safeError('Permintaan analisis belum dapat diproses. Periksa data dan konfigurasi database.',400);}
}
