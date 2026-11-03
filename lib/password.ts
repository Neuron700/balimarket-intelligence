import {scrypt,timingSafeEqual} from 'node:crypto';
const parameters={N:32768,r:8,p:3,maxmem:64*1024*1024};
function toHex(a:Uint8Array){return Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');}
function fromHex(s:string){if(!/^[a-f0-9]+$/.test(s)||s.length%2)throw new Error('Invalid hash');return new Uint8Array(s.match(/.{2}/g)!.map(v=>parseInt(v,16)));}
async function derive(password:string,salt:Uint8Array):Promise<Uint8Array>{return new Promise((resolve,reject)=>scrypt(password,salt,32,parameters,(error,key)=>error?reject(error):resolve(new Uint8Array(key))));}
export async function hashPassword(password:string){const salt=crypto.getRandomValues(new Uint8Array(16));const hash=await derive(password,salt);return `scrypt$32768$8$3$${toHex(salt)}$${toHex(hash)}`;}
export async function verifyPassword(password:string,stored:string){try{const [algorithm,n,r,p,salt,expected]=stored.split('$');if(algorithm!=='scrypt'||n!=='32768'||r!=='8'||p!=='3'||salt?.length!==32||expected?.length!==64)return false;const actual=await derive(password,fromHex(salt));const hash=fromHex(expected);return actual.length===hash.length&&timingSafeEqual(actual,hash);}catch{return false;}}
export async function hashKey(input:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input));return toHex(new Uint8Array(bytes));}
