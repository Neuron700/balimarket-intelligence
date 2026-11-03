import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import {SupabaseAdapter} from '@auth/supabase-adapter';
import {db,rateLimit} from '@/lib/db';
import {hashKey,verifyPassword} from '@/lib/password';
import {serverConfig} from '@/lib/server-config';
import {z} from 'zod';

// Credentials requires JWT strategy. The Supabase adapter persists users/accounts;
// a server-checked sessions row additionally enables revocation for both providers.
export const {handlers,auth,signIn,signOut}=NextAuth(()=>{
 const configured=serverConfig();
 return {
  secret:process.env.AUTH_SECRET,
  trustHost:true,
  pages:{signIn:'/login',error:'/login'},
  adapter:configured.database?SupabaseAdapter({url:process.env.SUPABASE_URL!,secret:(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY)!}):undefined,
  session:{strategy:'jwt' as const,maxAge:7*24*60*60},
  providers:[
   Credentials({name:'Email dan kata sandi',credentials:{email:{type:'email'},password:{type:'password'}},async authorize(raw){
    const parsed=z.object({email:z.string().email().max(254),password:z.string().min(10).max(128)}).safeParse(raw);
    if(!parsed.success||!configured.auth)return null;
    const email=parsed.data.email.toLowerCase().trim();
    const allowed=await rateLimit(`login:${await hashKey(email)}`,8,900);
    if(!allowed)return null;
    const {data:user,error}=await db().schema('next_auth').from('users').select('id,name,email,image').eq('email',email).maybeSingle();
    if(error||!user)return null;
    const {data:credential}=await db().from('user_credentials').select('password_hash').eq('user_id',user.id).maybeSingle();
    if(!credential||!await verifyPassword(parsed.data.password,credential.password_hash))return null;
    return user;
   }}),
   ...(configured.google?[Google({clientId:process.env.AUTH_GOOGLE_ID!,clientSecret:process.env.AUTH_GOOGLE_SECRET!})]:[])
  ],
  callbacks:{
   async jwt({token,user}){
    if(user){token.sub=user.id;token.sid=crypto.randomUUID();const {error}=await db().schema('next_auth').from('sessions').insert({sessionToken:token.sid,userId:user.id,expires:new Date(Date.now()+7*86400000).toISOString()});if(error)throw new Error('Session persistence failed');}
    if(token.sid){const {data,error}=await db().schema('next_auth').from('sessions').select('id').eq('sessionToken',token.sid).eq('userId',token.sub!).gt('expires',new Date().toISOString()).maybeSingle();if(error||!data)return null;}
    return token;
   },
   async session({session,token}){if(session.user&&token.sub)session.user.id=token.sub;return session;}
  },
  events:{async signOut(message){if('token' in message&&message.token?.sid)await db().schema('next_auth').from('sessions').delete().eq('sessionToken',message.token.sid);}},
 };
});
