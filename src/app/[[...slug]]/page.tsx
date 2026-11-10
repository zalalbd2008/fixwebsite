import { notFound } from 'next/navigation';
import { getPage, getRoutes } from '@/lib/content';
import { SitePage } from '@/components/site/SitePage';

// Every WordPress URL is pre-rendered at build time; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.entries(getRoutes())
    .filter(([p, r]) => r.status === 200 && !p.startsWith('/__'))
    .map(([p]) => ({ slug: p === '/' ? [] : p.replace(/^\/|\/$/g, '').split('/') }));
}

function toPath(slug?: string[]) {
  if (!slug?.length) return '/';
  return '/' + slug.map((s) => { try { return decodeURIComponent(s); } catch { return s; } }).join('/') + '/';
}

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const pathname = toPath(slug);
  const page = getPage(pathname);
  if (!page) notFound();
  return <SitePage page={page} pathname={pathname} />;
}
