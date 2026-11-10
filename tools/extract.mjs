// Converts the crawled WordPress HTML (read-only snapshot) into data for the React app.
// Usage: node tools/extract.mjs <crawl-dir>   (crawl-dir contains html/, crawl.json, redirects_live.json, forms_settings.json)
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SRC = path.resolve(process.argv[2] || '../scrape');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'content');
const PUB = path.join(ROOT, 'public');
const ORIGIN_RE = /(?:https?:)?\/\/(?:www\.)?fixwebsiteissues\.com(?=[\/"'?#\s)]|$)/g;
const MAIN_POPUP = '254497';

fs.rmSync(path.join(OUT, 'pages'), { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'pages'), { recursive: true });
fs.mkdirSync(path.join(PUB, '_styles'), { recursive: true });

// Collapse Elementor's indentation whitespace (keeps <pre>, <textarea>, <script>, <style> as they are)
function squeeze(html) {
  const keep = [];
  html = html.replace(/<(pre|textarea|script|style)\b[\s\S]*?<\/\1>/gi, (m) => { keep.push(m); return `\u0000${keep.length - 1}\u0000`; });
  html = html.replace(/[ \t\r\n]{2,}/g, (m) => (m.includes('\n') ? '\n' : ' '));
  return html.replace(/\u0000(\d+)\u0000/g, (_, i) => keep[Number(i)]);
}
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex').slice(0, 12);
const keyFor = (p) => (p === '/' ? 'home' : p.replace(/^\/|\/$/g, '').replace(/\//g, '__'));

// Same-origin absolute URL -> root-relative path
function rel(v) {
  if (!v) return v;
  let out = v.replace(ORIGIN_RE, '');
  return out;
}
function relHref(v) {
  const out = rel(v);
  return out === '' ? '/' : out;
}

const URL_ATTRS = ['href', 'src', 'srcset', 'data-src', 'data-srcset', 'action', 'poster', 'data-bg', 'data-url', 'data-thumbnail', 'data-elementor-lightbox-slideshow'];
function rewriteUrls($, scope) {
  $(scope).find('*').addBack().each((_, el) => {
    if (!el.attribs) return;
    for (const a of URL_ATTRS) if (el.attribs[a] != null) el.attribs[a] = a === 'href' ? relHref(el.attribs[a]) : rel(el.attribs[a]);
    if (el.attribs.style && el.attribs.style.includes('fixwebsiteissues.com')) el.attribs.style = rel(el.attribs.style);
    if (el.attribs['data-settings'] && el.attribs['data-settings'].includes('fixwebsiteissues.com')) {
      el.attribs['data-settings'] = el.attribs['data-settings'].replace(/https?:\\?\/\\?\/(?:www\.)?fixwebsiteissues\.com/g, '');
    }
  });
  $(scope).find('style').each((_, el) => { $(el).text(rel($(el).text())); });
}

// Inline <style> -> hashed static css file so pages share it
const styleFiles = new Map();
function styleToFile(css, id) {
  css = rel(css);
  const h = md5(css);
  const name = `/_styles/${(id || 'inline').replace(/[^a-z0-9-]/gi, '')}-${h}.css`;
  if (!styleFiles.has(name)) { fs.writeFileSync(path.join(PUB, name), css); styleFiles.set(name, 1); }
  return name;
}

const ACTIVE_CLASSES = ['current-menu-item', 'current_page_item', 'current-menu-ancestor', 'current-menu-parent', 'current_page_parent', 'current_page_ancestor', 'current-page-ancestor', 'current-post-ancestor', 'current-post-parent', 'current-category-ancestor', 'current-category-parent', 'elementor-item-active'];
function stripActive($, scope) {
  $(scope).find('[class]').each((_, el) => {
    const c = el.attribs.class.split(/\s+/).filter((x) => x && !ACTIVE_CLASSES.includes(x));
    el.attribs.class = c.join(' ');
  });
  $(scope).find('[aria-current="page"]').removeAttr('aria-current');
}

const crawl = JSON.parse(fs.readFileSync(path.join(SRC, 'crawl.json'), 'utf8'));
const routes = {};
const layoutVotes = {};
const vote = (k, html) => { (layoutVotes[k] ??= {}); layoutVotes[k][html] = (layoutVotes[k][html] || 0) + 1; };
const searchIndex = [];
const cards = {};

function processFile(file, routePath, status, type) {
  const raw = fs.readFileSync(file, 'utf8');
  const $ = cheerio.load(raw, { decodeEntities: false });
  const page = { path: routePath, status, type };

  // ---------- <head> ----------
  page.lang = $('html').attr('lang') || 'en-US';
  page.title = $('head > title').text();
  page.metas = [];
  page.links = [];
  page.jsonld = [];
  page.styles = [];
  $('head').children().each((_, el) => {
    const $el = $(el);
    const tag = el.tagName;
    if (tag === 'meta') {
      const a = { ...el.attribs };
      if (a.charset || a.name === 'viewport' || a.name === 'generator' || a.id === 'fwi-theme-color' || a['http-equiv']) return;
      page.metas.push(a);
    } else if (tag === 'link') {
      const a = { ...el.attribs };
      const r = a.rel || '';
      if (r === 'stylesheet') { page.styles.push(rel(a.href).replace(/\?ver=[^&]*$/, '')); return; }
      if (['profile', 'https://api.w.org/', 'EditURI', 'shortlink', 'icon', 'apple-touch-icon', 'dns-prefetch', 'preconnect'].includes(r)) return;
      if (r === 'alternate' && /oembed|wp-json/.test(a.href || '')) return;
      if (r === 'alternate' && a.type === 'application/json') return;
      if (r === 'preload') { a.href = rel(a.href); if (a.imagesrcset) a.imagesrcset = rel(a.imagesrcset); }
      page.links.push(a);
    } else if (tag === 'script') {
      if ((el.attribs.type || '').includes('ld+json')) page.jsonld.push($el.html().trim());
    } else if (tag === 'style') {
      const css = $el.html();
      if (!css.trim()) return;
      page.styles.push(styleToFile(css, el.attribs.id || 'head'));
    }
  });

  // ---------- <body> ----------
  page.bodyClass = $('body').attr('class') || '';
  const body = $('body');
  rewriteUrls($, body);

  // shared chrome (voted; most common version wins)
  const header = $('body > [data-elementor-type=header]');
  const footer = $('body > [data-elementor-type=footer]');
  const mainPopup = $(`body > [data-elementor-type=popup][data-elementor-id=${MAIN_POPUP}]`);
  stripActive($, header); stripActive($, footer);
  page.popupMeta = {
    refererTitle: mainPopup.find('input[name=referer_title]').attr('value') || page.title,
    queriedId: mainPopup.find('input[name=queried_id]').attr('value') || '',
    settings: mainPopup.attr('data-elementor-settings') || '',
  };
  mainPopup.find('input[name=referer_title]').attr('value', '__REFERER_TITLE__');
  mainPopup.find('input[name=queried_id]').attr('value', '__QUERIED_ID__');
  vote('header', $.html(header));
  vote('footer', $.html(footer));
  vote('popup', $.html(mainPopup));
  const appCss = $('body > style#fwi-app-css').html();
  const mbarCss = $('body > style#fwi-mbar-css').html();
  if (appCss) vote('appCss', appCss);
  if (mbarCss) vote('mbarCss', mbarCss);

  const CHROME = ['a.skip-link', '#fwi-ah', '#fwi-sn', '#fwi-tb', '#fwi-dr-ov', '#fwi-dr', 'style#fwi-app-css', 'style#fwi-mbar-css', 'nav#fwi-mbar'];
  header.remove(); footer.remove(); mainPopup.remove();
  CHROME.forEach((s) => body.children(s).remove());

  // body-level scripts: everything is replaced by the React runtime except page-specific ones
  const KEEP_BODY_SCRIPT_IDS = new Set(['fwb-blog-js']);
  page.scripts = [];
  body.children('script').each((_, el) => {
    const id = el.attribs.id || '';
    if (KEEP_BODY_SCRIPT_IDS.has(id)) {
      let code = $(el).html() || '';
      const s = el.attribs.src || '';
      if (s.startsWith('data:text/javascript,')) code = decodeURIComponent(s.slice(21));
      page.scripts.push({ code, id });
    }
    $(el).remove();
  });
  // body-level <link rel=stylesheet> (e.g. popup css) -> styles list
  body.children('link[rel=stylesheet]').each((_, el) => { page.styles.push(rel(el.attribs.href).replace(/\?ver=[^&]*$/, '')); $(el).remove(); });

  // what is left = page content (+ page specific popups)
  page.html = squeeze(body.html().trim());

  // search index entry
  const desc = page.metas.find((m) => m.name === 'description')?.content || '';
  if (status === 200 && (type === 'post' || type === 'page')) {
    const text = $('[data-elementor-type=wp-page], [data-elementor-type=single-post] .elementor-widget-theme-post-content, main#content').text().replace(/\s+/g, ' ').trim().slice(0, 5000);
    searchIndex.push({ path: routePath, type, title: $('h1').first().text().trim() || page.title, seoTitle: page.title, description: desc, text });
  }

  // post cards from archive listings (used by the search page)
  $('article.elementor-post').each((_, el) => {
    const href = $(el).find('a[href]').first().attr('href');
    if (href && !cards[href]) cards[href] = $.html(el);
  });
  if (status === 200 && (type === 'post' || type === 'page')) {
    const entry = searchIndex[searchIndex.length - 1];
    if (entry && entry.path === routePath) {
      entry.image = page.metas.find((m) => m.property === 'og:image')?.content?.replace(ORIGIN_RE, '') || '';
      entry.date = page.metas.find((m) => m.property === 'article:published_time')?.content || '';
    }
  }

  const key = keyFor(routePath);
  fs.writeFileSync(path.join(OUT, 'pages', key + '.json'), JSON.stringify(page));
  routes[routePath] = { key, status, type, title: page.title };
}

// ---------- types (post / page / archive) ----------
const typeOf = {};
for (const t of ['pages', 'posts']) {
  for (const p of JSON.parse(fs.readFileSync(path.join(SRC, t + '.json'), 'utf8'))) typeOf[new URL(p.link).pathname] = t === 'pages' ? 'page' : 'post';
}

let n = 0;
for (const [url, info] of Object.entries(crawl)) {
  if (info.status !== 200) continue;
  const u = new URL(url);
  const p = decodeURIComponent(u.pathname);
  const file = path.join(SRC, 'html', p, 'index.html');
  if (!fs.existsSync(file)) { console.warn('missing file', file); continue; }
  const type = typeOf[u.pathname] || (p.startsWith('/category/') || p.startsWith('/tag/') || /\/page\/\d+\/$/.test(p) || p === '/fix-website-issues-blogs/' ? 'archive' : 'page');
  processFile(file, p, 200, type);
  n++;
}
// special pages
processFile(path.join(SRC, 'html_404.html'), '/__404/', 404, 'error');
processFile(path.join(SRC, 'html_search.html'), '/__search/', 200, 'search');

// ---------- layout (most common variant of each shared part) ----------
const best = (k) => Object.entries(layoutVotes[k] || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
const layout = { header: squeeze(best('header')), footer: squeeze(best('footer')), popup: squeeze(best('popup')) };
fs.writeFileSync(path.join(OUT, 'layout.json'), JSON.stringify(layout));
fs.writeFileSync(path.join(PUB, '_styles', 'fwi-app.css'), rel(best('appCss')));
fs.writeFileSync(path.join(PUB, '_styles', 'fwi-mbar.css'), rel(best('mbarCss')));

fs.writeFileSync(path.join(OUT, 'routes.json'), JSON.stringify(routes, null, 1));
fs.writeFileSync(path.join(OUT, 'search-index.json'), JSON.stringify(searchIndex));
fs.writeFileSync(path.join(OUT, 'cards.json'), JSON.stringify(cards));

// ---------- redirects / gone ----------
const live = JSON.parse(fs.readFileSync(path.join(SRC, 'redirects_live.json'), 'utf8'));
const redirects = [];
const gone = [];
for (const [url, info] of Object.entries(crawl)) {
  const p = decodeURIComponent(new URL(url).pathname);
  if (info.status === 301 || info.status === 302) live.push({ source: p, status: info.status, location: info.location });
  if (info.status === 410) live.push({ source: p, status: 410 });
}
const seen = new Set();
for (const r of live) {
  const src = r.source.replace(/\/?$/, '/');
  if (seen.has(src) || routes[src]) continue;
  seen.add(src);
  if (r.status === 410) gone.push(src);
  else if (r.location) redirects.push({ source: src, destination: relHref(r.location), status: r.status });
}
fs.writeFileSync(path.join(OUT, 'redirects.json'), JSON.stringify(redirects, null, 1));
fs.writeFileSync(path.join(OUT, 'gone.json'), JSON.stringify(gone, null, 1));

// ---------- forms (server-side config, never sent to the browser) ----------
const forms = JSON.parse(fs.readFileSync(path.join(SRC, 'forms_settings.json'), 'utf8')).forms.map((f) => ({
  postId: String(f.post), formId: f.el, name: f.form_name, actions: f.actions || [],
  redirectTo: f.redirect_to ? relHref(f.redirect_to) : '', successMessage: f.success_message || 'Your submission was successful.',
  errorMessage: f.error_message || 'An error occurred.', emailTo: f.email_to || '', emailSubject: f.email_subject || '', fields: f.fields,
}));
fs.writeFileSync(path.join(OUT, 'forms.json'), JSON.stringify(forms, null, 1));

console.log('pages', n, 'styles', styleFiles.size, 'redirects', redirects.length, 'gone', gone.length, 'forms', forms.length);

// ---------- make downloaded CSS files domain-independent ----------
let cssFixed = 0;
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.css$/.test(f)) { const c = fs.readFileSync(p, 'utf8'); const r = c.replace(ORIGIN_RE, ''); if (r !== c) { fs.writeFileSync(p, r); cssFixed++; } }
  }
})(path.join(PUB, 'wp-content'));
console.log('css files rewritten', cssFixed);
