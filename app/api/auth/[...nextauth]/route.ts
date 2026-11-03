import type {NextRequest} from 'next/server';
import {handlers} from '@/auth';
import {serverConfig,safeError} from '@/lib/server-config';
export async function GET(request:NextRequest){if(!serverConfig().auth)return safeError('Login belum dikonfigurasi. Anda dapat menjelajahi mode demo.',503);return handlers.GET(request);}
export async function POST(request:NextRequest){if(!serverConfig().auth)return safeError('Login belum dikonfigurasi. Anda dapat menjelajahi mode demo.',503);return handlers.POST(request);}
