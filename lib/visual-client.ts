import {AnalysisRequestError} from './analyze-client';
import type {ComparisonEvent,ComparisonStage,VisualComparison} from './visual-comparison';
export async function requestVisualComparison(payload:Record<string,unknown>,onStage:(stage:ComparisonStage)=>void,signal?:AbortSignal){
 const response=await fetch('/api/compare-visuals',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson'},body:JSON.stringify(payload),signal});
 if(!response.ok){const body=await response.json() as {error?:string;remaining?:number;limitReason?:string};throw new AnalysisRequestError(body.error||'Perbandingan belum berhasil.',body.remaining,body.limitReason);}
 if(!response.body)throw new AnalysisRequestError('Respons AI belum tersedia.');
 const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';let result:{comparison:VisualComparison;remaining?:number;mode:'guest'|'live'}|undefined;
 const consume=(line:string)=>{if(!line.trim())return;const event=JSON.parse(line) as ComparisonEvent;if(event.type==='progress')onStage(event.stage);else if(event.type==='error')throw new AnalysisRequestError(event.error,event.remaining);else if(event.type==='result')result={comparison:event.comparison,remaining:event.remaining,mode:event.mode};};
 try{while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let end:number;while((end=buffer.indexOf('\n'))!==-1){consume(buffer.slice(0,end));buffer=buffer.slice(end+1);}}buffer+=decoder.decode();if(buffer.trim())consume(buffer);if(!result)throw new AnalysisRequestError('Koneksi berakhir sebelum hasil diterima.');return result;}
 finally{reader.releaseLock();}
}
