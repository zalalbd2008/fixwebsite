'use client';

import { useEffect, type ReactNode } from 'react';
import { useRxElement } from './useRx';

/** Elementor Accordion (one open at a time) and Toggle (many open) widgets. */
export function Accordion({ rx, multiple, children }: { rx: string; multiple: boolean; children: ReactNode }) {
  const root = useRxElement(rx);

  useEffect(() => {
    if (!root) return;
    const titles = Array.from(root.querySelectorAll<HTMLElement>('.elementor-tab-title'));
    const contentOf = (t: HTMLElement) => document.getElementById(t.getAttribute('aria-controls') || '') || (t.nextElementSibling as HTMLElement | null);
    const set = (t: HTMLElement, open: boolean) => {
      const c = contentOf(t);
      t.classList.toggle('elementor-active', open);
      t.setAttribute('aria-expanded', String(open));
      t.setAttribute('aria-selected', String(open));
      if (!multiple) t.setAttribute('tabindex', open ? '0' : '-1');
      if (c) {
        c.classList.toggle('elementor-active', open);
        c.style.display = open ? 'block' : 'none';
        const first = !c.dataset.rxSeen;
        c.dataset.rxSeen = '1';
        if (first) return;
        if (open && c.dataset.rxSeen && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          c.animate([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 250, easing: 'ease-out' });
        }
      }
    };
    // initial state comes from the markup (Elementor opens the first accordion item)
    // Elementor opens the first accordion item on load (toggles start closed)
    if (!multiple && titles.length && !titles.some((t) => t.classList.contains('elementor-active'))) titles[0].classList.add('elementor-active');
    titles.forEach((t) => set(t, t.classList.contains('elementor-active')));
    const onClick = (e: Event) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('.elementor-tab-title');
      if (!t || !root.contains(t)) return;
      e.preventDefault();
      const open = !t.classList.contains('elementor-active');
      if (!multiple) titles.forEach((x) => { if (x !== t) set(x, false); });
      set(t, open);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if ((e.target as HTMLElement).closest('.elementor-tab-title')) onClick(e);
    };
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKey);
    return () => { root.removeEventListener('click', onClick); root.removeEventListener('keydown', onKey); };
  }, [root, multiple]);

  return <>{children}</>;
}
