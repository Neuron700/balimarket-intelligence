export type AIProvider = 'grok' | 'gemini';
export function serverConfig() {
 const database=Boolean(process.env.SUPABASE_URL&&(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY));
 const provider:AIProvider=process.env.AI_PROVIDER==='gemini'?'gemini':'grok';
 const ai=provider==='grok'?Boolean(process.env.XAI_API_KEY&&process.env.XAI_MODEL):Boolean(process.env.GEMINI_API_KEY);
 const guestSecret=Boolean(process.env.GUEST_SESSION_SECRET||process.env.AUTH_SECRET);
 return {database,ai,provider,model:provider==='grok'?process.env.XAI_MODEL:(process.env.GEMINI_MODEL||'gemini-3.5-flash-lite'),auth:Boolean(database&&process.env.AUTH_SECRET),google:Boolean(process.env.AUTH_GOOGLE_ID&&process.env.AUTH_GOOGLE_SECRET),guestReady:Boolean(database&&ai&&guestSecret)};
}
export function sameOrigin(request: Request) {
 const origin=request.headers.get('origin');
 return !origin || origin===new URL(request.url).origin;
}
export function safeError(message:string,status=500){return Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}});}
