import {cookies} from 'next/headers';
import {isIP} from 'node:net';
import {db} from './db';
import {serverConfig} from './server-config';
import {GUEST_COOKIE,GUEST_MAX_AGE,newGuestToken,privateGuestKey,signGuestToken,verifyGuestToken} from './guest-token';
export type GuestAccess={sessionKey:string;ipKey:string;setCookie?:string};
export function guestSecret(){return process.env.GUEST_SESSION_SECRET||process.env.AUTH_SECRET||'';}
export function guestDailyLimit(){const value=Number(process.env.AI_GUEST_DAILY_LIMIT||20);return Number.isFinite(value)?Math.max(1,Math.min(100,Math.floor(value))):20;}
export async function guestAccess(request:Request,create=false):Promise<GuestAccess|null>{
 const secret=guestSecret();if(!secret)return null;
 const jar=await cookies();let token=verifyGuestToken(jar.get(GUEST_COOKIE)?.value,secret);let setCookie:string|undefined;
 if(!token&&create){token=newGuestToken();setCookie=`${GUEST_COOKIE}=${signGuestToken(token,secret)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${GUEST_MAX_AGE}${process.env.NODE_ENV==='production'?'; Secure':''}`;}
 if(!token)return null;
 const raw=process.env.VERCEL?request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for'):process.env.NODE_ENV==='development'?'127.0.0.1':request.headers.get('cf-connecting-ip');
 const ip=raw?.split(',')[0]?.trim();if(!ip||!isIP(ip))return null;
 return {sessionKey:privateGuestKey('session',token.sid,secret),ipKey:privateGuestKey('ip',ip,secret),setCookie};
}
export async function guestStatus(access:GuestAccess){
 const now=new Date();const reset=new Date(now);reset.setUTCHours(24,0,0,0);
 const [trial,budget]=await Promise.all([db().rpc('guest_trial_status',{p_session_key:access.sessionKey,p_ip_key:access.ipKey}),db().from('request_limits').select('attempts').eq('key',`guest:global:${now.toISOString().slice(0,10)}`).gt('expires_at',now.toISOString()).maybeSingle()]);
 if(trial.error||budget.error)throw new Error('Pembatasan guest belum tersedia. Pemilik aplikasi perlu menjalankan migrasi database.');
 const dailyLimit=guestDailyLimit();const dailyRemaining=Math.max(0,dailyLimit-Number(budget.data?.attempts||0));const sessionRemaining=Number((trial.data as {remaining:number}).remaining);
 return {remaining:Math.min(sessionRemaining,dailyRemaining),sessionRemaining,dailyRemaining,dailyLimit,resetAt:reset.toISOString(),limitReason:dailyRemaining===0?'daily_budget':sessionRemaining===0?'session_or_ip':undefined};
}
export async function reserveGuestTrial(access:GuestAccess){
 const {data,error}=await db().rpc('reserve_guest_trial',{p_session_key:access.sessionKey,p_ip_key:access.ipKey,p_daily_limit:guestDailyLimit()});
 if(error)throw new Error('Pembatasan guest belum tersedia. Pemilik aplikasi perlu menjalankan migrasi database.');
 return data as {allowed:boolean;remaining:number;reason?:'session'|'ip'|'budget'};
}
export function guestAvailability(){const c=serverConfig();return c.guestReady;}
