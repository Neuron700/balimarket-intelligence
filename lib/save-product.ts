import {db} from './db';
import type {Product} from './domain';
export async function saveProductForUser(product:Product,userId:string):Promise<Product>{
 const database=db();
 const {data:existing}=await database.from('products').select('id').eq('id',product.id).eq('user_id',userId).maybeSingle();
 if(existing)return {...product,image_url:`/api/products/${product.id}/image`};
 const match=product.image_url.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
 if(!match)throw new Error('Foto produk tidak valid.');
 const imageKey=`${userId}/${product.id}.${match[1]==='jpeg'?'jpg':match[1]}`;
 const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));
 const {error:uploadError}=await database.storage.from('product-images').upload(imageKey,bytes,{contentType:`image/${match[1]}`,upsert:true});
 if(uploadError)throw new Error('Foto belum dapat disimpan. Periksa bucket product-images.');
 const {data,error}=await database.rpc('save_product_analysis',{p_product:{id:product.id,user_id:userId,name:product.name,category:product.category,material:product.material,production_cost:product.production_cost,image_url:imageKey},p_analysis:product.analysis});
 if(error||!data){
  const {data:concurrent}=await database.from('products').select('id').eq('id',product.id).eq('user_id',userId).maybeSingle();
  if(!concurrent){await database.storage.from('product-images').remove([imageKey]);throw new Error('Produk belum dapat disimpan. Periksa migrasi database lalu coba lagi.');}
 }
 return {...product,image_url:`/api/products/${product.id}/image`};
}
