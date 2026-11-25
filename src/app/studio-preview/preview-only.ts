import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

const LIVE_HOSTS = ['fundwell.us', 'www.fundwell.us'];

/** 404 on the live site. Local and preview builds go through. */
export async function previewOnly() {
  const host = (await headers()).get('host')?.split(':')[0] ?? '';
  if (process.env.VERCEL_ENV === 'production' || LIVE_HOSTS.includes(host)) notFound();
}
