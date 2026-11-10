'use client';

import { useEffect, type ReactNode } from 'react';
import { useRxElement } from './useRx';

type S = { sticky_offset?: number; sticky_offset_tablet?: number; sticky_offset_mobile?: number; sticky_effects_offset?: number; sticky_on?: string[] };

/** Elementor Pro "Sticky" motion effect (position: fixed + spacer, like jquery.sticky). */
export function Sticky({ rx, settings, children }: { rx: string; settings: string; children: ReactNode }) {
  const el = useRxElement(rx);

  useEffect(() => {
    if (!el) return;
    let s: S = {};
    try { s = JSON.parse(settings.replace(/&quot;/g, '"')); } catch { /* ignore */ }
    const device = () => (window.innerWidth <= 767 ? 'mobile' : window.innerWidth <= 1024 ? 'tablet' : 'desktop');
    const offset = () => (device() === 'mobile' ? s.sticky_offset_mobile ?? s.sticky_offset : device() === 'tablet' ? s.sticky_offset_tablet ?? s.sticky_offset : s.sticky_offset) || 0;
    const spacer = document.createElement('div');
    spacer.className = 'elementor-sticky__spacer';
    spacer.setAttribute('aria-hidden', 'true');
    spacer.style.visibility = 'hidden';
    let active = false;
    let startTop = 0;
    el.classList.add('elementor-sticky');

    const measure = () => {
      if (active) return;
      startTop = el.getBoundingClientRect().top + window.scrollY;
    };
    const activate = (on: boolean) => {
      if (on === active) return;
      active = on;
      if (on) {
        const r = el.getBoundingClientRect();
        spacer.style.height = `${r.height}px`;
        spacer.style.width = `${r.width}px`;
        el.after(spacer);
        el.style.position = 'fixed';
        el.style.width = `${r.width}px`;
        el.style.marginTop = '0px';
        el.style.marginBottom = '0px';
        el.style.top = `${offset()}px`;
        el.style.insetInlineStart = `${r.left}px`;
        el.style.zIndex = '99';
        el.classList.add('elementor-sticky--active');
      } else {
        spacer.remove();
        ['position', 'width', 'marginTop', 'marginBottom', 'top', 'insetInlineStart', 'zIndex'].forEach((p) => ((el.style as unknown as Record<string, string>)[p] = ''));
        el.classList.remove('elementor-sticky--active');
      }
    };
    const update = () => {
      const enabled = !s.sticky_on || s.sticky_on.includes(device());
      if (!enabled) { activate(false); return; }
      activate(window.scrollY + offset() > startTop);
      el.classList.toggle('elementor-sticky--effects', window.scrollY > (s.sticky_effects_offset || 0));
    };
    const onResize = () => { activate(false); measure(); update(); };
    measure();
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', onResize);
      activate(false);
      el.classList.remove('elementor-sticky', 'elementor-sticky--effects');
    };
  }, [el, settings]);

  return <>{children}</>;
}
