import {guestAccess,guestStatus} from '@/lib/guest-access';
import {serverConfig} from '@/lib/server-config';
import {db} from '@/lib/db';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const config=serverConfig();const access=await guestAccess(request,true);
 const headers:Record<string,string>={'Cache-Control':'no-store'};if(access?.setCookie)headers['Set-Cookie']=access.setCookie;
 if(!config.guestReady||!access)return Response.json({ready:false,remaining:2,provider:config.provider,reason:'Analisis AI belum diaktifkan. Pemilik aplikasi perlu melengkapi konfigurasi AI dan penyimpanan.'},{headers});
 try{const status=await guestStatus(access);const {data,error}=await db().from('guest_analyses').select('product').eq('session_key',access.sessionKey).is('claimed_by',null).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(1).maybeSingle();if(error)throw new Error('Guest table missing');return Response.json({ready:true,...status,provider:config.provider,latest:data?.product??null},{headers});}
 catch{return Response.json({ready:false,remaining:2,provider:config.provider,reason:'Layanan guest belum siap. Pemilik aplikasi perlu memeriksa migrasi database.'},{headers});}
}
