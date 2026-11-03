import GuestTry from '@/components/guest-try';
import {currentUser} from '@/lib/session';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function TryPage(){if(await currentUser())redirect('/dashboard?analyze=1');return <GuestTry/>;}
