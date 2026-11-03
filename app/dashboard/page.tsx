import Dashboard from '@/components/dashboard';
import {currentUser} from '@/lib/session';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function DashboardPage(){const user=await currentUser();if(!user)redirect('/login');return <Dashboard/>;}
