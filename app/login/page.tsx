import LoginForm from '@/components/login-form';
import {currentUser} from '@/lib/session';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Login(){if(await currentUser())redirect('/dashboard');return <LoginForm/>;}
