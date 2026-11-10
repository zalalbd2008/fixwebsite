# fixwebsiteissues.com — React + Node.js version

The WordPress / Elementor site **https://www.fixwebsiteissues.com/** rebuilt with
**React 19 + Next.js 15 (App Router)**, running on **Node.js**.

* Same **453 URLs**: 194 pages, 166 posts, 54 categories, 14 tags, blog and category pagination.
* Same **SEO**: title, meta description, robots, canonical, Open Graph, Twitter and Yoast JSON-LD schema are identical on every page.
* Same **redirects**: 245 old URLs answer `301` and 52 removed URLs answer `410`, exactly as the live server does.
* Same **images and media**: the whole media library (973 files) plus every image, font and CSS file, kept at their original `/wp-content/...` paths.
* **Fluid (liquid) responsive**: large font sizes scale smoothly with `clamp()` between breakpoints. No horizontal scrolling from 360px to 1440px wide.
* Sitemaps (`/sitemap_index.xml`…), `robots.txt`, `llms.txt` and the RSS feed (`/feed/`) are included.

The live WordPress site was only **read**. Nothing on it was changed.

## Run it

```bash
npm install
npm run build
npm start            # http://localhost:3000
```

Development mode: `npm run dev`.

Production with the smaller standalone server:

```bash
npm run build
cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/ && cp -r content .next/standalone/
node .next/standalone/server.js
```

Copy `.env.example` to `.env` and fill it in to change the site address or to email form submissions.

## How it works

| Part | Where |
|---|---|
| Every page (pre-rendered at build time) | `src/app/[[...slug]]/page.tsx` → `src/components/site/SitePage.tsx` |
| WordPress HTML → React elements (internal links become `<Link>`, widgets become components) | `src/lib/render.tsx` |
| Elementor widgets in React: popups, forms, nav menu, sticky header, accordion / toggle, counters, slides | `src/components/elementor/` |
| Mobile app bars: header, drawer menu, tab bar, "on this page" tabs, quick-contact bar, EN/ES, dark mode | `src/components/app/` |
| Entrance animations, lazy backgrounds, share buttons, table of contents | `src/components/site/Runtime.tsx` |
| Redirects, 410 Gone, WordPress search `/?s=` | `src/middleware.ts`, `src/app/site-search/page.tsx` |
| **Node.js API**: forms (`/api/form/`) and visit / click log (`/api/track/`) | `src/app/api/` |
| Page data (generated) | `content/` |
| Images, CSS, fonts (original paths) | `public/wp-content/`, `public/_styles/` |

### Forms

All 42 Elementor forms post to `/api/form/`. The server:

* checks required fields, email and URL fields
* saves every submission to `data/form-submissions.jsonl`
* emails it when `SMTP_HOST` is set
* returns the same success message and redirect (for example `/request-received/`) as the WordPress form settings

The recipient addresses come from the WordPress form settings in `content/forms.json`. They are used on the server only and never sent to the browser.

### Visit / click log

Visits and clicks (calls, consultation buttons, menus, popups) are written to `data/activity.jsonl`. This replaces the WordPress activity log and mobile-bar tracking.

## Updating content from WordPress

The `tools/` folder holds the read-only scripts used for the conversion:

1. `tools/crawl.mjs`: downloads the rendered HTML of every URL
2. `tools/assets.mjs`: downloads CSS, fonts, images and the media library
3. `tools/redir.mjs`: records how the live server answers each old URL
4. `tools/extract.mjs`: turns the HTML into `content/` (SEO tags, styles, content, forms, redirects)
5. `tools/fluidify.mjs`: fluid typography

Run steps 1–4, then step 5, then `npm run build`.
