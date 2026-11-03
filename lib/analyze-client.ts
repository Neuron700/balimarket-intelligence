import type {Product} from './domain';
import type {AnalysisEvent,AnalysisStage} from './analysis-events';
export class AnalysisRequestError extends Error {remaining?:number;limitReason?:string;constructor(message:string,remaining?:number,limitReason?:string){super(message);this.remaining=remaining;this.limitReason=limitReason;}}
export async function requestAnalysis(payload:Record<string,unknown>,onStage:(stage:AnalysisStage)=>void,signal?:AbortSignal){
 const response=await fetch('/api/analyze-product',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson'},body:JSON.stringify(payload),signal});
 if(!response.ok){const body=await response.json() as {error?:string;remaining?:number;limitReason?:string};throw new AnalysisRequestError(body.error||'Analisis belum berhasil.',body.remaining,body.limitReason);}
 if(!response.body)throw new AnalysisRequestError('Aliran respons AI tidak tersedia.');
 const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';let result:{product:Product;remaining?:number;mode:'guest'|'live'}|undefined;
 const consume=(line:string)=>{if(!line.trim())return;const event=JSON.parse(line) as AnalysisEvent;if(event.type==='progress')onStage(event.stage);else if(event.type==='error')throw new AnalysisRequestError(event.error,event.remaining);else result={product:event.product,remaining:event.remaining,mode:event.mode};};
 try{while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let index:number;while((index=buffer.indexOf('\n'))!==-1){consume(buffer.slice(0,index));buffer=buffer.slice(index+1);}}buffer+=decoder.decode();if(buffer.trim())consume(buffer);if(!result)throw new AnalysisRequestError('Koneksi berakhir sebelum hasil AI diterima.');return result;}
 finally{reader.releaseLock();}
}
