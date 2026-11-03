import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
export const GUEST_COOKIE='bali_guest';
export const GUEST_MAX_AGE=7*24*60*60;
export type GuestToken={sid:string;expires:number};
export function signGuestToken(payload:GuestToken,secret:string){const body=Buffer.from(JSON.stringify(payload)).toString('base64url');return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`;}
export function verifyGuestToken(value:string|undefined,secret:string,now=Date.now()):GuestToken|null{
 if(!value||value.length>512)return null;
 try{const [body,signature,...extra]=value.split('.');if(extra.length||!body||!signature)return null;const expected=createHmac('sha256',secret).update(body).digest();const actual=Buffer.from(signature,'base64url');if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return null;const payload=JSON.parse(Buffer.from(body,'base64url').toString());if(typeof payload.sid!=='string'||!/^[a-f0-9-]{36}$/.test(payload.sid)||typeof payload.expires!=='number'||payload.expires<=now||payload.expires>now+GUEST_MAX_AGE*1000+60000)return null;return payload;}catch{return null;}
}
export function newGuestToken(now=Date.now()):GuestToken{return {sid:randomUUID(),expires:now+GUEST_MAX_AGE*1000};}
export function privateGuestKey(kind:'session'|'ip',value:string,secret:string){return createHmac('sha256',secret).update(`${kind}:${value}`).digest('hex');}
