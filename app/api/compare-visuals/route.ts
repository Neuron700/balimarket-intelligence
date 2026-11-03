import {sameOrigin,serverConfig,safeError} from '@/lib/server-config';
import {currentUser} from '@/lib/session';
import {rateLimit} from '@/lib/db';
import {guestAccess,reserveGuestTrial} from '@/lib/guest-access';
import {validatePhoto,ImageInputError} from '@/lib/image-safety';
import {comparisonInput,type ComparisonEvent,type ComparisonStage} from '@/lib/visual-comparison';
import {compareProductVisuals} from '@/lib/visual-ai';
import {AIServiceError} from '@/lib/ai-pipeline';
export const runtime='nodejs';
export const maxDuration=90;
export async function POST(request:Request){
 if(!sameOrigin(request))return safeError('Permintaan tidak diizinkan.',403);
 if(Number(request.headers.get('content-length')||0)>4300000)return safeError('Total foto terlalu besar.',413);
 try{
  const body=await request.text();if(body.length>4300000)return safeError('Total foto terlalu besar.',413);
  const parsed=comparisonInput.safeParse(JSON.parse(body));if(!parsed.success)return safeError('Lengkapi nama, kategori, foto produk, dan 1–2 foto kompetitor.',400);
  const input=parsed.data;for(const image of [input.image,...input.competitors])validatePhoto(image,1024*1024);
  const cfg=serverConfig();if(!cfg.ai)return safeError('Layanan AI belum dikonfigurasi. Tidak ada hasil simulasi pengganti.',503);
  const user=await currentUser();let remaining:number|undefined;let cookie:string|undefined;
  if(user){if(!await rateLimit(`analyze:${user.id}`,20,3600))return safeError('Batas 20 analisis per jam tercapai. Coba lagi nanti.',429);}
  else{
   if(!cfg.guestReady)return safeError('Layanan guest belum siap. Periksa konfigurasi dan migrasi database.',503);
   const access=await guestAccess(request,true);if(!access)return safeError('Sesi guest belum dapat diverifikasi. Muat ulang halaman.',403);
   cookie=access.setCookie;const reservation=await reserveGuestTrial(access);remaining=reservation.remaining;
   if(!reservation.allowed)return Response.json({error:reservation.reason==='budget'?'Kuota guest seluruh aplikasi hari ini sudah terpakai. Coba kembali setelah 08.00 WITA.':'Dua percobaan guest sudah dipakai. Masuk untuk melanjutkan analisis.',remaining:reservation.reason==='budget'?0:remaining,limitReason:reservation.reason==='budget'?'daily_budget':'session_or_ip',limitReached:true},{status:429,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
  }
  const execute=async(onStage:(s:ComparisonStage)=>void)=>{onStage('checking');const comparison=await compareProductVisuals(input,onStage,request.signal);return {type:'result' as const,comparison,remaining,mode:user?'live' as const:'guest' as const};};
  const headers:Record<string,string>={'Cache-Control':'no-store'};if(cookie)headers['Set-Cookie']=cookie;
  if(request.headers.get('accept')?.includes('application/x-ndjson')){
   const encoder=new TextEncoder();const stream=new ReadableStream<Uint8Array>({async start(controller){const emit=(event:ComparisonEvent)=>{if(!request.signal.aborted)controller.enqueue(encoder.encode(JSON.stringify(event)+'\n'));};try{emit(await execute(stage=>emit({type:'progress',stage})));}catch(error){emit({type:'error',error:error instanceof AIServiceError?error.message:'Perbandingan belum berhasil. Silakan coba lagi.',remaining});}finally{controller.close();}}});
   return new Response(stream,{headers:{...headers,'Cache-Control':'no-store, no-transform','Content-Type':'application/x-ndjson; charset=utf-8','X-Content-Type-Options':'nosniff','X-Accel-Buffering':'no'}});
  }
  return Response.json(await execute(()=>{}),{status:201,headers});
 }catch(error){return safeError(error instanceof ImageInputError||error instanceof AIServiceError?error.message:error instanceof Error&&error.message.startsWith('Pembatasan guest')?error.message:'Permintaan perbandingan tidak valid.',error instanceof AIServiceError?error.status:400);}
}
