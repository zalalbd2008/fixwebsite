'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

type Tab = { id: string; label: string };

// Short tab labels picked from section headings (same rules as the original site)
const MAP: [RegExp, string][] = [[/faq|frequently|question/i, 'FAQ'], [/pric|cost|plan|\$/i, 'Pricing'], [/process|how (it|we|our)|step/i, 'Process'], [/review|testimonial|client(s)? say|trusted/i, 'Reviews'], [/why (choose|us|immediate)|benefit|advantage/i, 'Why Us'], [/chatgpt|ai search|ai overview|gemini|geo\b/i, 'AI Search'], [/warning|sign|symptom|is your .* hacked|hacked or/i, 'Warning Signs'], [/what we fix|problem areas|issues we|we can help fix|services we/i, 'What We Fix'], [/guarantee|pay after|pay only/i, 'Guarantee'], [/contact|get (started|help)|need help|call|let'?s talk|free (audit|consult)|don'?t let/i, 'Get Help'], [/expert|engineer|team|who we are|about/i, 'Our Experts'], [/same.?day|fast|urgent|emergency/i, 'Same-Day Fix'], [/maintenance/i, 'Maintenance'], [/seo|search/i, 'SEO'], [/security|malware/i, 'Security'], [/area|city|location|nationwide|serv(e|ing)/i, 'Areas'], [/repair|fix/i, 'Repair']];
// pages where every H2 becomes a tab, with custom labels
const FULL: Record<string, [RegExp, string][]> = {
  '254345': [[/trust wevtec/i, 'Why Trust Us'], [/work together/i, 'SEO + GEO'], [/healthcare/i, 'Healthcare'], [/law firm/i, 'Law Firms'], [/automotive/i, 'Automotive'], [/small business/i, 'Small Business'], [/services for service/i, 'Services'], [/fix the website before/i, 'Fix First'], [/search is changing/i, 'Search Is Changing'], [/not seo or ai/i, 'SEO + AI'], [/really mean/i, 'What Is GEO'], [/machines cannot/i, 'Technical Access'], [/is different/i, 'Why Us'], [/real clients/i, 'Reviews'], [/indexed/i, 'Process'], [/faq/i, 'FAQ'], [/yesterday/i, 'Future-Proof'], [/transform your business/i, 'Get Started'], [/all about ai/i, 'All About GEO']],
};

function clean(t: string) {
  t = (t || '').replace(/\s+/g, ' ').trim().replace(/[:.?!\-–—|]+$/, '');
  if (t.length > 26) { const c = t.slice(0, 26), i = c.lastIndexOf(' '); t = (i > 12 ? c.slice(0, i) : c).replace(/[,:;&\-–]+$/, '').trim() + '…'; }
  return t;
}
function shortLabel(t: string, used: Record<string, number>) {
  t = (t || '').replace(/\s+/g, ' ').trim();
  for (const [re, l] of MAP) if (re.test(t) && !used[l]) return l;
  const w = t.replace(/[^A-Za-z0-9&' -]/g, '').split(' ').filter((x) => x && !/^(the|a|an|our|your|for|of|to|and|in|with|we|you|is|are|what|how|why|who|can|do|need|one)$/i.test(x));
  return w.slice(0, 2).join(' ') || clean(t);
}
const skip = (h: Element) => !!h.closest('.elementor-popup-modal,.elementor-location-footer,.ez-toc-container,#ez-toc-container') || (h as HTMLElement).offsetParent === null;

function buildSections(pageId: string): { el: HTMLElement; label: string }[] {
  const doc = document.querySelector<HTMLElement>('[data-elementor-type="wp-page"]') || document.querySelector<HTMLElement>('[data-elementor-type="single-post"] .elementor-widget-theme-post-content') || document.querySelector<HTMLElement>('[data-elementor-type="wp-post"]');
  if (!doc) return [];
  let list: { el: HTMLElement; label: string }[] = [];
  const isTop = (c: Element) => c.matches('.e-con,.elementor-section,.elementor-top-section') && (c as HTMLElement).offsetHeight > 80;
  const FL = FULL[pageId];
  if (FL) {
    const hero = Array.from(doc.children).filter(isTop)[0] as HTMLElement | undefined;
    if (hero) list.push({ el: hero, label: 'Overview' });
    const u: Record<string, number> = { Overview: 1 };
    doc.querySelectorAll('h2').forEach((h) => {
      const inH = hero && hero.contains(h);
      if (skip(h)) return;
      const t = (h.textContent || '').replace(/\s+/g, ' ').trim();
      let lab = '';
      for (const [re, l] of FL) if (re.test(t) && !u[l]) { lab = l; break; }
      if (!lab) { if (inH) return; lab = clean(t); }
      if (u[lab]) return;
      u[lab] = 1;
      let w = (h.closest('.e-con') as HTMLElement) || h;
      if (w === doc || w.querySelectorAll('h2').length > 1 || (hero && w.contains(hero))) w = h;
      list.push({ el: w, label: lab });
    });
  } else {
    let used: Record<string, number> = {};
    const tops = Array.from(doc.children).filter(isTop) as HTMLElement[];
    if (tops.length >= 3) {
      tops.forEach((c, i) => {
        const h = c.querySelector('h2') || (i === 0 ? c.querySelector('h1,h3,p') : null);
        if (!h) return;
        const lab = list.length === 0 ? 'Overview' : shortLabel(h.textContent || '', used);
        if (!lab) return;
        used[lab] = 1;
        list.push({ el: c, label: lab });
      });
    }
    if (list.length < 3) {
      list = []; used = {};
      doc.querySelectorAll<HTMLElement>('h2').forEach((h) => {
        if (skip(h)) return;
        const lab = list.length === 0 ? 'Overview' : shortLabel(h.textContent || '', used);
        if (lab) { used[lab] = 1; list.push({ el: h, label: lab }); }
      });
    }
  }
  const seen: Record<string, number> = {};
  return list.filter((x) => (seen[x.label] ? false : (seen[x.label] = 1))).slice(0, FL ? 40 : 12);
}

/** "On this page" tabs with scroll-spy (#fwi-sn), shown on mobile. */
export function SectionNav({ pageId }: { pageId: string }) {
  const pathname = usePathname();
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [active, setActive] = useState(-1);
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const lock = useRef(0);
  const reduce = useRef(false);

  const offset = () => (document.getElementById('fwi-ah')?.offsetHeight || 60) + (tabs.length >= 3 ? document.getElementById('fwi-sn')?.offsetHeight || 0 : 0) + 12;

  // build tabs once the page content is in the DOM
  useEffect(() => {
    reduce.current = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    setTabs([]); setActive(-1);
    const build = () => {
      const secs = buildSections(pageId);
      if (secs.length < 3) return;
      setTabs(secs.map((x, i) => { if (!x.el.id) x.el.id = 'fwi-sec-' + (i + 1); return { id: x.el.id, label: x.label }; }));
    };
    const t = setTimeout(build, document.readyState === 'complete' ? 50 : 400);
    return () => clearTimeout(t);
  }, [pathname, pageId]);

  const moveBar = useCallback((i: number, center: boolean) => {
    const t = tabRefs.current[i], tr = track.current, b = bar.current;
    if (!t || !tr || !b) return;
    b.style.width = t.offsetWidth - 20 + 'px';
    b.style.transform = 'translateX(' + (t.offsetLeft - tr.scrollLeft + 10) + 'px)';
    if (center) tr.scrollTo({ left: Math.max(0, t.offsetLeft - (tr.clientWidth - t.offsetWidth) / 2), behavior: reduce.current ? 'auto' : 'smooth' });
  }, []);

  // scroll-spy
  useEffect(() => {
    if (!tabs.length) return;
    const spy = () => {
      if (Date.now() < lock.current) return;
      const y = offset() + 4;
      let idx = 0;
      for (let i = 0; i < tabs.length; i++) {
        const el = document.getElementById(tabs[i].id);
        if (el && el.getBoundingClientRect().top - y <= 0) idx = i; else break;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) idx = tabs.length - 1;
      setActive(idx);
    };
    let ticking = false;
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; spy(); }); } };
    spy();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', spy);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', spy); };
  }, [tabs]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (active >= 0) moveBar(active, true); }, [active, moveBar]);

  const go = (i: number) => {
    const el = document.getElementById(tabs[i].id);
    if (!el) return;
    setActive(i);
    lock.current = Date.now() + 900;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset() + 4, behavior: reduce.current ? 'auto' : 'smooth' });
  };

  return (
    <nav className="fwi-app fwi-sn" id="fwi-sn" aria-label="On this page" hidden={tabs.length < 3}>
      <div className="fwi-sn__track" role="list" ref={track} onScroll={() => moveBar(active, false)}>
        {tabs.map((t, i) => (
          <button key={t.id} ref={(el) => { tabRefs.current[i] = el; }} type="button" className={`fwi-sn__tab${i === active ? ' is-active' : ''}`} role="listitem" data-target={t.id} aria-current={i === active ? 'true' : undefined} onClick={() => go(i)}>
            {t.label}
          </button>
        ))}
      </div>
      <span className="fwi-sn__bar" aria-hidden="true" ref={bar} />
    </nav>
  );
}
