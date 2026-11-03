import {z} from 'zod';
import {categories} from './domain.ts';

export const visualCriteria=['Pencahayaan & ketajaman','Latar & komposisi','Kejelasan detail','Presentasi kemasan'] as const;
const score=z.number().min(1).max(10);
export const comparisonInput=z.object({
 name:z.string().trim().min(3).max(100),category:z.enum(categories),
 image:z.string().max(1350000).regex(/^data:image\/(jpeg|png|webp);base64,/),
 competitors:z.array(z.string().max(1350000).regex(/^data:image\/(jpeg|png|webp);base64,/)).min(1).max(2),
});
export const comparisonOutput=z.object({
 score,summary:z.string().min(15).max(1200),
 strengths:z.array(z.string().min(5).max(500)).min(1).max(4),
 improvements:z.array(z.string().min(5).max(500)).min(1).max(4),
 criteria:z.array(z.object({name:z.enum(visualCriteria),own_score:score,competitor_scores:z.array(score).min(1).max(2),reason:z.string().min(10).max(700)})).length(4),
 comparisons:z.array(z.object({competitor_index:z.number().int().min(1).max(2),comparability:z.enum(['sejenis','berbeda','tidak_jelas']),verdict:z.enum(['lebih_kuat','setara','perlu_ditingkatkan']),observation:z.string().min(10).max(800),suggestion:z.string().min(10).max(800)})).min(1).max(2),
 limitations:z.string().min(15).max(1000),
});
export const comparisonReportSchema=comparisonOutput.extend({id:z.string().uuid(),name:z.string().min(3).max(100),category:z.string().min(3).max(100),created_at:z.string().datetime(),source:z.enum(['grok','gemini']),model:z.string().max(100).optional()});
export type VisualComparison=z.infer<typeof comparisonReportSchema>;
export type ComparisonStage='checking'|'comparing'|'reviewing';
export type ComparisonEvent={type:'progress';stage:ComparisonStage}|{type:'result';comparison:VisualComparison;remaining?:number;mode:'guest'|'live'}|{type:'error';error:string;remaining?:number};

const object=(properties:Record<string,unknown>)=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
export function comparisonJSON(count:number){
 const scoreJSON={type:'number',minimum:1,maximum:10};
 return object({score:scoreJSON,summary:{type:'string'},strengths:{type:'array',items:{type:'string'},minItems:1,maxItems:4},improvements:{type:'array',items:{type:'string'},minItems:1,maxItems:4},
  criteria:{type:'array',minItems:4,maxItems:4,items:object({name:{type:'string',enum:[...visualCriteria]},own_score:scoreJSON,competitor_scores:{type:'array',items:scoreJSON,minItems:count,maxItems:count},reason:{type:'string'}})},
  comparisons:{type:'array',minItems:count,maxItems:count,items:object({competitor_index:{type:'integer',minimum:1,maximum:count},comparability:{type:'string',enum:['sejenis','berbeda','tidak_jelas']},verdict:{type:'string',enum:['lebih_kuat','setara','perlu_ditingkatkan']},observation:{type:'string'},suggestion:{type:'string'}})},
  limitations:{type:'string'},
 });
}
