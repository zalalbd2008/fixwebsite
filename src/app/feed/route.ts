import fs from 'fs';
import path from 'path';
import { siteUrl } from '@/lib/content';

// RSS feed (/feed/), same content as the WordPress feed
export const dynamic = 'force-static';

export function GET() {
  const xml = fs.readFileSync(path.join(process.cwd(), 'content', 'static', 'feed.xml'), 'utf8');
  return new Response(siteUrl(xml), { headers: { 'content-type': 'application/rss+xml; charset=UTF-8' } });
}
