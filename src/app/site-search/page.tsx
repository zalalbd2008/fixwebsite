import * as cheerio from 'cheerio';
import { getCards, getSearchIndex, getSpecialPage } from '@/lib/content';
import { SitePage } from '@/components/site/SitePage';

// WordPress search (/?s=term) is rewritten here by middleware.ts
export const dynamic = 'force-dynamic';
const PER_PAGE = 10;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function search(q: string) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return getSearchIndex()
    .map((e) => {
      const title = e.title.toLowerCase(), body = (e.description + ' ' + e.text).toLowerCase();
      if (!words.every((w) => title.includes(w) || body.includes(w))) return null;
      const score = words.reduce((n, w) => n + (title.includes(w) ? 10 : 0) + (e.description.toLowerCase().includes(w) ? 3 : 0), 0) + (e.type === 'post' ? 1 : 0);
      return { e, score };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.score - a.score || (b.e.date || '').localeCompare(a.e.date || ''))
    .map((x) => x.e);
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ s?: string; paged?: string }> }) {
  const sp = await searchParams;
  const q = (sp.s || '').trim();
  const paged = Math.max(1, Number(sp.paged || 1));
  const tpl = getSpecialPage('__search');
  const results = search(q);
  const pages = Math.max(1, Math.ceil(results.length / PER_PAGE));
  const slice = results.slice((paged - 1) * PER_PAGE, paged * PER_PAGE);
  const cards = getCards();

  const $ = cheerio.load(tpl.html, null, false);
  const container = $('.elementor-posts-container').first();
  const proto = container.find('article').first().clone();
  container.empty();
  for (const r of slice) {
    if (cards[r.path]) { container.append(cards[r.path]); continue; }
    const a = proto.clone();
    a.attr('class', 'elementor-post elementor-grid-item type-page');
    a.find('a').attr('href', r.path);
    a.find('.elementor-post__title a').text(r.title);
    a.find('.elementor-post__excerpt').html(`<p>${esc(r.description)}</p>`);
    a.find('.elementor-post__meta-data').remove();
    if (r.image) a.find('.elementor-post__thumbnail img').attr({ src: r.image, srcset: null, alt: r.title });
    else a.find('.elementor-post__thumbnail__link').remove();
    container.append(a);
  }
  if (!slice.length) container.append(`<p class="elementor-nothing-found elementor-posts-nothing-found">It seems we can't find what you're looking for.</p>`);
  // pagination: /page/N/?s=term (same URLs as WordPress)
  const nav = $('nav.elementor-pagination');
  if (pages > 1) {
    const link = (n: number) => (n === 1 ? `/?s=${encodeURIComponent(q)}` : `/page/${n}/?s=${encodeURIComponent(q)}`);
    let h = '';
    if (paged > 1) h += `<a class="page-numbers prev" href="${link(paged - 1)}">&laquo; Previous</a>`;
    for (let n = 1; n <= pages; n++) h += n === paged ? `<span aria-current="page" class="page-numbers current"><span class="elementor-screen-only">Page</span>${n}</span>` : `<a class="page-numbers" href="${link(n)}"><span class="elementor-screen-only">Page</span>${n}</a>`;
    if (paged < pages) h += `<a class="page-numbers next" href="${link(paged + 1)}">Next &raquo;</a>`;
    nav.html(h);
  } else nav.remove();
  $('input[name=s]').attr('value', q);

  const page = { ...tpl, title: `You searched for ${q} - Fix Website Issues` };
  return <SitePage page={page} pathname="/site-search/" html={$.html()} />;
}
