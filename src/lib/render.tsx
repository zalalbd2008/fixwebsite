import parse, { attributesToProps, domToReact, Element, Text, type DOMNode, type HTMLReactParserOptions } from 'html-react-parser';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PopupFrame } from '@/components/elementor/PopupFrame';
import { ElementorForm } from '@/components/elementor/ElementorForm';
import { Counter } from '@/components/elementor/Counter';
import { NavMenu } from '@/components/elementor/NavMenu';
import { Accordion } from '@/components/elementor/Accordion';
import { Sticky } from '@/components/elementor/Sticky';
import { Slides } from '@/components/elementor/Slides';
import { getRoutes } from './content';

export type PageScript = { code?: string; src?: string; type?: string; id?: string };
export type RenderContext = { scripts: PageScript[]; popupSettings?: Record<string, string>; rx?: number; prefix?: string };

const NON_PAGE = /^\/(wp-content|wp-includes|wp-admin|wp-json|feed|_styles)\//;

function isInternalPage(href: string): boolean {
  if (!href.startsWith('/') || href.startsWith('//')) return false;
  if (NON_PAGE.test(href)) return false;
  const p = href.split(/[?#]/)[0];
  const norm = p.endsWith('/') ? p : p + '/';
  let decoded = norm;
  try { decoded = decodeURIComponent(norm); } catch { /* keep */ }
  return Boolean(getRoutes()[decoded]);
}

const textOf = (el: Element) => el.children.map((c) => (c instanceof Text ? c.data : '')).join('');
const hasClass = (el: Element, c: string) => (` ${el.attribs.class || ''} `).includes(` ${c} `);

/**
 * Converts WordPress / Elementor HTML into real React elements.
 * Interactive Elementor widgets are swapped for React components; internal links become <Link>.
 */
export function renderHtml(html: string, ctx: RenderContext): ReactNode {
  const options: HTMLReactParserOptions = {
    replace(node) {
      if (!(node instanceof Element)) return undefined;
      const a = node.attribs;
      const kids = () => domToReact(node.children as DOMNode[], options);
      // render this same element (with the normal rules for its children) inside a wrapper
      // Wrapper components find "their" element through a deterministic data-rx marker (no extra DOM node).
      const mark = () => { ctx.rx = (ctx.rx || 0) + 1; const id = `${ctx.prefix || 'p'}${ctx.rx}`; a['data-rx'] = id; return id; };
      const self = () => domToReact([node] as DOMNode[], { ...options, replace: (n) => (n === node ? undefined : options.replace!(n, 0)) });

      switch (node.name) {
        case 'script': {
          const type = a.type || '';
          if (type.includes('ld+json')) return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: textOf(node) }} />;
          if (type && !/javascript|module/.test(type)) return <></>;
          ctx.scripts.push(a.src ? { src: a.src, id: a.id } : { code: textOf(node), id: a.id });
          return <></>;
        }
        case 'style':
          return <style {...(a.id ? { id: a.id } : {})} dangerouslySetInnerHTML={{ __html: textOf(node) }} />;
        case 'a': {
          const href = a.href || '';
          if (!a.target && !('download' in a) && isInternalPage(href)) {
            const props = attributesToProps(a) as Record<string, unknown>;
            delete props.href;
            return <Link href={href} prefetch={false} {...props}>{kids()}</Link>;
          }
          return undefined;
        }
        case 'form':
          if (hasClass(node, 'elementor-form')) return <ElementorForm {...(attributesToProps(a) as object)}>{kids()}</ElementorForm>;
          return undefined;
        case 'span':
          if (hasClass(node, 'elementor-counter-number')) {
            return <Counter className={a.class} from={Number(a['data-from-value'] || 0)} to={Number(a['data-to-value'] || 0)} duration={Number(a['data-duration'] || 2000)} delimiter={a['data-delimiter'] || ''} initial={textOf(node)} />;
          }
          return undefined;
        case 'div':
        case 'header':
        case 'footer':
        case 'section': {
          if (a['data-elementor-type'] === 'popup') {
            const id = a['data-elementor-id'];
            const settings = ctx.popupSettings?.[id] ?? a['data-elementor-settings'] ?? '{}';
            return <PopupFrame id={id} settings={settings}>{self()}</PopupFrame>;
          }
          if (a['data-settings'] && /&quot;sticky&quot;:&quot;top&quot;|"sticky":"top"/.test(a['data-settings'])) {
            const rx = mark();
            return <Sticky rx={rx} settings={a['data-settings']}>{self()}</Sticky>;
          }
          if (hasClass(node, 'elementor-widget-nav-menu')) { const rx = mark(); return <NavMenu rx={rx}>{self()}</NavMenu>; }
          if (hasClass(node, 'elementor-accordion') || hasClass(node, 'elementor-toggle')) {
            const rx = mark();
            return <Accordion rx={rx} multiple={hasClass(node, 'elementor-toggle')}>{self()}</Accordion>;
          }
          if (hasClass(node, 'elementor-widget-slides')) { const rx = mark(); return <Slides rx={rx} settings={a['data-settings'] || '{}'}>{self()}</Slides>; }
          return undefined;
        }
        default:
          return undefined;
      }
    },
  };
  return parse(html, options);
}
