import {auth} from '@/auth';
import {serverConfig} from './server-config';
export async function currentUser(){if(!serverConfig().auth)return null;const session=await auth();return session?.user?.id?session.user:null;}
