import {createClient} from '@supabase/supabase-js';
import {serverConfig} from './server-config';
export function db(){
 if(!serverConfig().database)throw new Error('Penyimpanan belum dikonfigurasi.');
 return createClient(process.env.SUPABASE_URL!,(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY)!,{auth:{autoRefreshToken:false,persistSession:false}});
}
export async function rateLimit(key:string,limit:number,seconds:number){
 const {data,error}=await db().rpc('consume_rate_limit',{p_key:key,p_limit:limit,p_window_seconds:seconds});
 if(error)throw new Error('Pemeriksaan batas permintaan belum tersedia. Jalankan migrasi database.');
 return data===true;
}
