'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Visit + click log (replaces the WordPress "wvt" activity log and mobile-bar tracking).
 * Events are sent to the Node.js API at /api/track.
 */
const SEL = 'a[href],button,[role="button"],input[type="submit"],input[type="button"]';
const SKIP = '.swiper-button-next,.swiper-button-prev,.swiper-pagination-bullet,.elementor-swiper-button,.elementor-menu-toggle,.dialog-close-button,.elementor-tab-title,.elementor-accordion-title,.fwi-sn__tab,.fwi-dr__toggle';
const clean = (s: unknown) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 160);
const ss = (k: string, v?: string) => { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch { /* ignore */ } return null; };
const ls = (k: string, v?: string) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { /* ignore */ } return null; };

function send(action: string, data: Record<string, unknown>) {
  const body = JSON.stringify({ action, ...data });
  if (navigator.sendBeacon && navigator.sendBeacon('/api/track/', new Blob([body], { type: 'application/json' }))) return;
  fetch('/api/track/', { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {});
}

function areaOf(el: Element) {
  if (el.closest('.elementor-popup-modal,[role="dialog"]')) return 'Popup';
  if (el.closest('#fwi-mbar,#fwi-tb')) return 'Mobile bottom bar';
  if (el.closest('.elementor-location-header,header')) return el.closest('nav,.menu') ? 'Header > Menu' : 'Header';
  if (el.closest('.elementor-location-footer,footer')) return 'Footer';
  return 'Page content';
}
function kindOf(el: Element, href: string) {
  if (/^tel:/i.test(href)) return 'Phone call';
  if (/^mailto:/i.test(href)) return 'Email';
  if (/^sms:/i.test(href)) return 'Text message';
  if (el.matches('input[type="submit"],button[type="submit"]')) return 'Form submit';
  if (!href || href === '#' || /^javascript:/i.test(href) || href.includes('elementor-action')) return 'Button / popup';
  try {
    const u = new URL(href, location.href);
    if (u.host !== location.host) return /maps\.(google|apple)|goo\.gl\/maps|maps\.app/i.test(u.href) ? 'Directions' : 'External link';
    if (/\.(pdf|docx?|xlsx?)$/i.test(u.pathname)) return 'Document download';
    if (u.pathname === location.pathname && u.hash) return 'Jump to section';
  } catch { /* ignore */ }
  return 'Page link';
}

export function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (navigator.webdriver) return;
    if (!ss('wvt_src')) {
      const q = new URLSearchParams(location.search);
      ss('wvt_src', JSON.stringify({ landing: location.href, referrer: document.referrer || '', utm_source: q.get('utm_source') || '', utm_medium: q.get('utm_medium') || '', utm_campaign: q.get('utm_campaign') || '', gclid: q.get('gclid') || q.get('gbraid') || q.get('wbraid') || '', fbclid: q.get('fbclid') || '', msclkid: q.get('msclkid') || '' }));
    }
    let vid = ls('wvt_vid');
    if (ss('wvt_ret') === null) ss('wvt_ret', vid ? '1' : '0');
    if (!vid) { vid = Math.random().toString(36).slice(2, 10); ls('wvt_vid', vid); }
    // let the page title update first
    const t = setTimeout(() => send('visit', { page: location.href, title: document.title, vw: window.innerWidth, vid, ret: ss('wvt_ret'), src: JSON.parse(ss('wvt_src') || '{}') }), 300);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    if (navigator.webdriver) return;
    let last = { k: '', t: 0 };
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest?.(SEL);
      if (!el || el.matches(SKIP) || el.closest(SKIP)) return;
      const area = areaOf(el);
      const a = el.tagName === 'A' ? el : el.closest('a[href]');
      const href = a?.getAttribute('href') || '';
      // plain text links inside paragraphs are not logged (same as before)
      if (area === 'Page content' && el.tagName === 'A' && !/btn|button|cta/i.test(el.className) && !/^(tel|mailto|sms):/i.test(href) && el.closest('p,li') && !el.closest('nav')) return;
      let abs = href;
      try { if (href && !/^(tel|mailto|sms|javascript):/i.test(href)) abs = new URL(href, location.href).href; } catch { /* ignore */ }
      const label = clean((el as HTMLElement).innerText || el.getAttribute('aria-label') || el.getAttribute('title') || (el as HTMLInputElement).value) || '(icon / no text)';
      const now = Date.now(), key = label + '|' + abs;
      if (last.k === key && now - last.t < 3000) return;
      last = { k: key, t: now };
      const track = el.getAttribute('data-fwi-track') || (/^tel:/i.test(href) ? 'call' : /\/consultation\/?(#.*)?$/i.test(href) || /popup(%3A|:)open/i.test(href) ? 'consultation' : '');
      send('click', { label, href: abs, kind: kindOf(el, href), area, where: el.getAttribute('data-fwi-where') || '', track, page: location.href, title: document.title, vw: window.innerWidth, vid: ls('wvt_vid'), ret: ss('wvt_ret') });
    };
    window.addEventListener('click', onClick, true);
    return () => window.removeEventListener('click', onClick, true);
  }, []);

  return null;
}
