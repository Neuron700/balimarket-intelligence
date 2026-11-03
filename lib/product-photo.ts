'use client';

export async function prepareProductPhoto(file:Blob):Promise<string>{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Pilih foto JPG, PNG, atau WebP.');
 if(!file.size||file.size>10*1024*1024)throw new Error('Foto maksimal 10 MB sebelum diperkecil.');
 const url=URL.createObjectURL(file);
 try{
  const photo=new Image();photo.decoding='async';photo.src=url;
  await photo.decode().catch(()=>{throw new Error('Foto belum dapat dibaca. Pilih ulang foto JPG, PNG, atau WebP.');});
  const ratio=Math.min(1,1200/Math.max(photo.naturalWidth,photo.naturalHeight));
  if(!ratio||!photo.naturalWidth||!photo.naturalHeight)throw new Error('Dimensi foto tidak valid.');
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(photo.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(photo.naturalHeight*ratio));
  const context=canvas.getContext('2d');if(!context)throw new Error('Browser belum dapat memproses foto.');
  context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(photo,0,0,canvas.width,canvas.height);
  for(const quality of [0.88,0.76,0.62,0.48]){const result=canvas.toDataURL('image/jpeg',quality);if(result.length<=1200000)return result;}
  throw new Error('Foto masih terlalu besar. Potong area yang tidak diperlukan lalu coba lagi.');
 }finally{URL.revokeObjectURL(url);}
}
export async function photoFromSource(source:string){
 const response=await fetch(source);if(!response.ok)throw new Error('Foto belum dapat dimuat.');return prepareProductPhoto(await response.blob());
}
