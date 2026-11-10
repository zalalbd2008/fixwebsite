import * as cheerio from 'cheerio';
import { getLayout, siteUrl, type PageData } from '@/lib/content';
import { renderHtml, type PageScript } from '@/lib/render';
import { MAIN_POPUP } from '@/components/elementor/popups';
import { AppHeader } from '@/components/app/AppHeader';
import { SectionNav } from '@/components/app/SectionNav';
import { Drawer } from '@/components/app/Drawer';
import { TabBar, MobileBar } from '@/components/app/TabBar';
import { BodyClass } from './BodyClass';
import { PageScripts } from './PageScripts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Marks the current menu item like WordPress does (current-menu-item, current-menu-ancestor…). */
function markActive(html: string, pathname: string) {
  const $ = cheerio.load(html, null, false);
  $('a[href]').each((_, el) => {
    if ($(el).attr('href') !== pathname) return;
    $(el).addClass('elementor-item-active').attr('aria-current', 'page');
    const li = $(el).parent('li');
    li.addClass('current-menu-item');
    if (li.hasClass('menu-item-object-page')) li.addClass('current_page_item');
    li.parents('li').each((i, p) => { $(p).addClass(i === 0 ? 'current-menu-ancestor current-menu-parent' : 'current-menu-ancestor'); });
  });
  return $.html();
}

/** One WordPress page, rendered with React: SEO head, header, content, footer, popups and app bars. */
export function SitePage({ page, pathname, html }: { page: PageData; pathname: string; html?: string }) {
  const layout = getLayout();
  const scripts: PageScript[] = [];
  const popupHtml = layout.popup
    .replace('__REFERER_TITLE__', esc(page.popupMeta.refererTitle))
    .replace('__QUERIED_ID__', esc(page.popupMeta.queriedId));
  const popupSettings = page.popupMeta.settings ? { [MAIN_POPUP]: page.popupMeta.settings } : undefined;
  const pageId = (page.bodyClass.match(/\bpage-id-(\d+)\b/) || [])[1] || '';

  const header = renderHtml(markActive(layout.header, pathname), { scripts, prefix: 'h' });
  const content = renderHtml(html ?? page.html, { scripts, prefix: 'c' });
  const footer = renderHtml(markActive(layout.footer, pathname), { scripts, prefix: 'f' });
  const popup = renderHtml(popupHtml, { scripts, prefix: 'm', popupSettings });
  const allScripts = [...scripts, ...page.scripts];

  return (
    <>
      {/* ---- <head>: React hoists these tags ---- */}
      <title>{page.title}</title>
      {page.metas.map((m, i) => {
        const { content: c, ...rest } = m;
        return <meta key={'m' + i} {...rest} content={c ? siteUrl(c) : c} />;
      })}
      {page.links.map((l, i) => {
        const { imagesrcset, imagesizes, fetchpriority, crossorigin, ...rest } = l;
        return <link key={'l' + i} {...rest} href={siteUrl(l.href || '')} {...(imagesrcset ? { imageSrcSet: imagesrcset } : {})} {...(imagesizes ? { imageSizes: imagesizes } : {})} {...(fetchpriority ? { fetchPriority: fetchpriority as 'high' } : {})} {...(crossorigin !== undefined ? { crossOrigin: (crossorigin || 'anonymous') as 'anonymous' } : {})} />;
      })}
      {page.styles.map((href) => <link key={href} rel="stylesheet" href={href} precedence="wp" />)}
      <link rel="stylesheet" href="/wp-content/plugins/elementor/assets/css/conditionals/dialog.min.css" precedence="wp-app" />
      <link rel="stylesheet" href="/wp-content/plugins/elementor/assets/css/conditionals/e-swiper.min.css" precedence="wp-app" />
      <link rel="stylesheet" href="/_styles/react-compat.css" precedence="wp-app" />
      <link rel="stylesheet" href="/_styles/fwi-app.css" precedence="wp-app" />
      <link rel="stylesheet" href="/_styles/fwi-mbar.css" precedence="wp-app" />
      <link rel="stylesheet" href="/_styles/fluid.css" precedence="fluid" />
      {page.jsonld.map((j, i) => <script key={'j' + i} type="application/ld+json" className="yoast-schema-graph" dangerouslySetInnerHTML={{ __html: siteUrl(j) }} />)}

      {/* ---- <body> ---- */}
      <script dangerouslySetInnerHTML={{ __html: `document.body.className=${JSON.stringify(page.bodyClass)};` }} />
      <BodyClass value={page.bodyClass} />
      <AppHeader />
      <SectionNav pageId={pageId} />
      <a className="skip-link screen-reader-text" href="#content">Skip to content</a>
      {header}
      {content}
      {footer}
      {popup}
      <TabBar />
      <Drawer />
      <MobileBar />
      <PageScripts key={pathname} scripts={allScripts} />
    </>
  );
}
