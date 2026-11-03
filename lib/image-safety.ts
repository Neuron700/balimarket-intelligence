import {lookup} from 'node:dns/promises';
import {request as httpsRequest} from 'node:https';
import {BlockList,isIP} from 'node:net';

export class ImageInputError extends Error{}
const blocked4=new BlockList();const blocked6=new BlockList();
for(const [address,prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]] as const)blocked4.addSubnet(address,prefix,'ipv4');
for(const [address,prefix] of [['::',96],['::ffff:0:0',96],['64:ff9b::',96],['64:ff9b:1::',48],['100::',64],['2001:db8::',32],['2002::',16],['fc00::',7],['fe80::',10],['ff00::',8]] as const)blocked6.addSubnet(address,prefix,'ipv6');
export function publicImageAddress(address:string){const family=isIP(address);if(family===4)return !blocked4.check(address,'ipv4');if(family===6)return /^[23]/.test(address)&&!blocked6.check(address,'ipv6');return false;}
export function imageURL(value:string){
 let url:URL;try{url=new URL(value);}catch{throw new ImageInputError('Masukkan tautan HTTPS yang valid.');}
 if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443')||value.length>2000)throw new ImageInputError('Gunakan tautan HTTPS publik tanpa username atau password.');
 const host=url.hostname.toLowerCase().replace(/\.$/,'');
 if(isIP(host.replace(/^\[|\]$/g,''))||!host.includes('.')||/(^|\.)(localhost|local|internal|test|invalid|example)$/.test(host)||host.endsWith('.home.arpa'))throw new ImageInputError('Tautan harus mengarah ke situs publik.');
 return url;
}
export function imageMime(bytes:Uint8Array){
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71&&bytes[4]===13&&bytes[5]===10)return 'image/png';
 if(Buffer.from(bytes.subarray(0,4)).toString()==='RIFF'&&Buffer.from(bytes.subarray(8,12)).toString()==='WEBP')return 'image/webp';
 throw new ImageInputError('Foto harus berupa JPG, PNG, atau WebP yang valid.');
}
export function validatePhoto(value:string,maxBytes=3*1024*1024){
 const match=/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
 if(!match)throw new ImageInputError('Data foto tidak valid.');
 const bytes=Buffer.from(match[2],'base64');
 if(!bytes.length||bytes.length>maxBytes)throw new ImageInputError('Foto terlalu besar. Pilih foto lebih kecil lalu coba lagi.');
 const mime=imageMime(bytes);if(mime!==match[1])throw new ImageInputError('Format foto tidak sesuai dengan isi berkas.');return {bytes,mime};
}
async function publicResource(url:URL):Promise<{body:Buffer;mime:string;redirect?:string}>{
 const records=await lookup(url.hostname,{all:true,verbatim:true});
 if(!records.length||records.some(record=>!publicImageAddress(record.address)))throw new ImageInputError('Alamat gambar tidak diizinkan. Gunakan foto dari situs publik.');
 const chosen=records.find(record=>record.family===4)||records[0];
 return new Promise((resolve,reject)=>{
  const req=httpsRequest(url,{method:'GET',agent:false,servername:url.hostname,signal:AbortSignal.timeout(12000),maxHeaderSize:16384,
   lookup:(_hostname,options,callback)=>{if(options.all)callback(null,[chosen]);else callback(null,chosen.address,chosen.family);},
   headers:{Accept:'image/jpeg,image/png,image/webp,text/html;q=0.8','Accept-Encoding':'identity','User-Agent':'BaliMarket/1.0'},
  },res=>{
   res.on('error',reject);
   if([301,302,303,307,308].includes(res.statusCode||0)&&res.headers.location){try{resolve({body:Buffer.alloc(0),mime:'',redirect:new URL(res.headers.location,url).href});}catch{reject(new ImageInputError('Tautan pengalihan gambar tidak valid.'));}req.destroy();return;}
   if(res.statusCode!==200){req.destroy();reject(new ImageInputError('Situs belum mengizinkan pengambilan foto. Unduh gambarnya lalu unggah langsung.'));return;}
   const mime=String(res.headers['content-type']||'').split(';')[0].toLowerCase();const html=mime==='text/html'||mime==='application/xhtml+xml';const limit=html?256*1024:2*1024*1024;
   if(!html&&Number(res.headers['content-length']||0)>limit){req.destroy();reject(new ImageInputError('Gambar pada tautan maksimal 2 MB. Unduh versi lebih kecil atau unggah foto.'));return;}
   const chunks:Buffer[]=[];let size=0;
   res.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>limit){if(html){chunks.push(chunk.subarray(0,Math.max(0,limit-(size-chunk.length))));resolve({body:Buffer.concat(chunks),mime});}else reject(new ImageInputError('Gambar pada tautan maksimal 2 MB.'));req.destroy();return;}chunks.push(chunk);});
   res.on('end',()=>resolve({body:Buffer.concat(chunks),mime}));
  });req.on('error',reject);req.end();
 });
}
function metadataImage(html:string){
 for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){const attrs:Record<string,string>={};for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs[m[1].toLowerCase()]=m[2]??m[3];if(['og:image','og:image:url','twitter:image','twitter:image:src'].includes((attrs.property||attrs.name||'').toLowerCase())&&attrs.content)return attrs.content.replace(/&amp;/g,'&').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));}return null;
}
export async function importPublicPhoto(value:string){
 let target=imageURL(value);let pageRead=false;
 for(let step=0;step<5;step++){
  const resource=await publicResource(target);
  if(resource.redirect){target=imageURL(resource.redirect);continue;}
  if(resource.mime==='text/html'||resource.mime==='application/xhtml+xml'){
   if(pageRead)throw new ImageInputError('Foto produk tidak ditemukan pada tautan. Gunakan tautan gambar langsung atau unggah foto.');
   pageRead=true;const candidate=metadataImage(resource.body.toString('utf8'));if(!candidate)throw new ImageInputError('Halaman ini tidak menyediakan foto yang dapat diambil. Unduh dan unggah fotonya.');target=imageURL(new URL(candidate,target).href);continue;
  }
  const mime=imageMime(resource.body);return {image:`data:${mime};base64,${resource.body.toString('base64')}`,host:target.hostname};
 }
 throw new ImageInputError('Tautan terlalu banyak dialihkan. Gunakan tautan gambar langsung.');
}
