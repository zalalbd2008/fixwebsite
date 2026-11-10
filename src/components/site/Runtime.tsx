'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { currentLanguage, loadTranslate, setLanguage } from '../app/LanguageSwitcher';

/**
 * Global page behaviours that Elementor's frontend JS used to provide:
 * entrance animations, lazy backgrounds, share buttons, table of contents, language buttons, analytics.
 */
export function Runtime() {
  const pathname = usePathname();

  // ---- per page: animations + lazy backgrounds (re-run after every navigation) ----
  useEffect(() => {
    const device = () => (window.innerWidth <= 767 ? '_mobile' : window.innerWidth <= 1024 ? '_tablet' : '');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timers: number[] = [];

    const animIO = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        animIO.unobserve(el);
        let s: Record<string, unknown> = {};
        try { s = JSON.parse(el.dataset.settings || '{}'); } catch { /* ignore */ }
        const d = device();
        const name = (s[`_animation${d}`] || s._animation || s[`animation${d}`] || s.animation) as string | undefined;
        const delay = Number(s._animation_delay || s.animation_delay || 0);
        const run = () => {
          el.classList.remove('elementor-invisible');
          if (name && name !== 'none' && !reduce) el.classList.add('animated', name);
        };
        if (delay && !reduce) timers.push(window.setTimeout(run, delay)); else run();
      }
    }, { threshold: 0.05 });
    document.querySelectorAll('.elementor-invisible').forEach((el) => animIO.observe(el));

    const lazyIO = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('e-lazyloaded');
        e.target.classList.remove('flying-press-lazy-bg');
        lazyIO.unobserve(e.target);
      }
    }, { rootMargin: '200px 0px 200px 0px' });
    document.querySelectorAll('.e-con.e-parent:not(.e-lazyloaded), .flying-press-lazy-bg').forEach((el) => lazyIO.observe(el));

    // jump to #hash after client-side navigation
    if (location.hash) {
      const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (t) timers.push(window.setTimeout(() => t.scrollIntoView(), 50));
    }

    // Easy Table of Contents: collapse / expand
    document.querySelectorAll<HTMLElement>('#ez-toc-container').forEach((c) => {
      const nav = c.querySelector<HTMLElement>('nav');
      if (nav && c.classList.contains('toc_close_by_default')) nav.style.display = 'none';
    });

    return () => { animIO.disconnect(); lazyIO.disconnect(); timers.forEach(clearTimeout); };
  }, [pathname]);

  // ---- once: delegated click handlers ----
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;

      // share buttons
      const share = t.closest<HTMLElement>('.elementor-share-btn');
      if (share) {
        const net = (share.className.match(/elementor-share-btn_(\w+)/) || [])[1];
        const url = encodeURIComponent(location.href), title = encodeURIComponent(document.title);
        const links: Record<string, string> = {
          facebook: `https://www.facebook.com/sharer.php?u=${url}`,
          twitter: `https://x.com/intent/tweet?text=${title}%20${url}`,
          x: `https://x.com/intent/tweet?text=${title}%20${url}`,
          linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}`,
          pinterest: `https://www.pinterest.com/pin/create/button/?url=${url}&description=${title}`,
          reddit: `https://reddit.com/submit?url=${url}&title=${title}`,
          whatsapp: `https://api.whatsapp.com/send?text=*${title}*%0A${url}`,
          telegram: `https://telegram.me/share/url?url=${url}&text=${title}`,
          email: `mailto:?subject=${title}&body=${url}`,
          threads: `https://threads.net/intent/post?text=${title}%20${url}`,
        };
        if (net === 'print') { window.print(); return; }
        if (links[net]) { e.preventDefault(); if (net === 'email') location.href = links[net]; else window.open(links[net], '', 'width=600,height=500'); }
        return;
      }

      // Easy Table of Contents toggle
      const tocToggle = t.closest('.ez-toc-toggle');
      if (tocToggle) {
        e.preventDefault();
        const nav = tocToggle.closest('#ez-toc-container')?.querySelector<HTMLElement>('nav');
        if (nav) nav.style.display = nav.style.display === 'none' ? '' : 'none';
        return;
      }

      // smooth scroll for same-page anchors (TOC etc.)
      const a = t.closest<HTMLAnchorElement>('a[href*="#"]');
      if (a && !a.href.includes('elementor-action')) {
        const u = new URL(a.href, location.href);
        if (u.pathname === location.pathname && u.hash.length > 1) {
          const target = document.getElementById(decodeURIComponent(u.hash.slice(1)));
          if (target) {
            e.preventDefault();
            const offset = a.closest('#ez-toc-container') ? 30 : (document.getElementById('fwi-ah')?.offsetHeight || 0) + 10;
            window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
            history.replaceState(null, '', u.hash);
          }
        }
      }

      // EN / ES buttons inside the Elementor header (the app header ones are React buttons)
      const lb = t.closest<HTMLElement>('.fwi-lang__btn');
      if (lb && !lb.closest('.fwi-app-lang')) setLanguage(lb.getAttribute('data-lang') === 'es' ? 'es' : 'en');
    };
    document.addEventListener('click', onClick);

    // keep EN / ES state of the Elementor header buttons in sync
    const mark = (l: string) => document.querySelectorAll('.fwi-lang__btn').forEach((b) => {
      if (b.closest('.fwi-app-lang')) return;
      const on = b.getAttribute('data-lang') === l;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    const onLang = (e: Event) => mark((e as CustomEvent).detail);
    window.addEventListener('fwi:lang', onLang);
    const l = currentLanguage();
    mark(l);
    if (l === 'es') loadTranslate();

    return () => { document.removeEventListener('click', onClick); window.removeEventListener('fwi:lang', onLang); };
  }, []);

  // keep language buttons right after navigation
  useEffect(() => {
    const l = currentLanguage();
    document.querySelectorAll('.fwi-lang__btn').forEach((b) => {
      if (b.closest('.fwi-app-lang')) return;
      const on = b.getAttribute('data-lang') === l;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }, [pathname]);

  return null;
}
