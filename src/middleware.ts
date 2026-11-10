import { NextResponse, type NextRequest } from 'next/server';
import redirects from '../content/redirects.json';
import gone from '../content/gone.json';

// Old WordPress URLs: same 301 redirects and 410 "gone" answers as the live site.
const REDIRECTS = new Map<string, { destination: string; status: number }>(redirects.map((r) => [r.source.toLowerCase(), r]));
const GONE = new Set<string>(gone.map((g) => g.toLowerCase()));

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // WordPress search: /?s=term and /page/2/?s=term
  if (searchParams.has('s')) {
    const m = pathname.match(/^\/(?:page\/(\d+)\/?)?$/);
    if (m) {
      const url = req.nextUrl.clone();
      url.pathname = '/site-search/';
      if (m[1]) url.searchParams.set('paged', m[1]);
      return NextResponse.rewrite(url);
    }
  }

  let p = pathname.endsWith('/') ? pathname : pathname + '/';
  try { p = decodeURIComponent(p); } catch { /* keep */ }
  const key = p.toLowerCase();

  const r = REDIRECTS.get(key);
  if (r) {
    const dest = new URL(r.destination, req.url);
    dest.search = req.nextUrl.search;
    return NextResponse.redirect(dest, r.status);
  }

  if (GONE.has(key)) {
    // render the normal "Page not found" page, but answer 410 Gone like WordPress
    const page = await fetch(new URL('/__gone__/', req.url), { headers: { 'x-gone': '1' } });
    return new NextResponse(await page.text(), { status: 410, headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex' } });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/|api/|wp-content/|wp-includes/|_styles/|favicon).*)'],
};
