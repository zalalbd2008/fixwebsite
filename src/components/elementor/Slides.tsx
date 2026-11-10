'use client';

import { useEffect, type ReactNode } from 'react';
import { useRxElement } from './useRx';

/** Elementor Pro "Slides" widget: a small swiper replacement (autoplay, arrows, dots). */
export function Slides({ rx, settings, children }: { rx: string; settings: string; children: ReactNode }) {
  const root = useRxElement(rx);

  useEffect(() => {
    if (!root) return;
    let s: { autoplay?: string; autoplay_speed?: number; transition_speed?: number; pause_on_hover?: string } = {};
    try { s = JSON.parse(settings.replace(/&quot;/g, '"')); } catch { /* ignore */ }
    const wrapper = root.querySelector<HTMLElement>('.swiper-wrapper');
    const slides = Array.from(root.querySelectorAll<HTMLElement>('.swiper-slide'));
    if (!wrapper || slides.length < 2) return;
    let i = 0;
    let paused = false;
    wrapper.style.transitionDuration = `${s.transition_speed || 500}ms`;
    const pag = root.querySelector('.swiper-pagination');
    const dots: HTMLElement[] = [];
    if (pag && !pag.children.length) {
      slides.forEach((_, k) => {
        const d = document.createElement('span');
        d.className = 'swiper-pagination-bullet';
        d.setAttribute('role', 'button');
        d.setAttribute('aria-label', `Go to slide ${k + 1}`);
        d.addEventListener('click', () => go(k));
        pag.appendChild(d);
        dots.push(d);
      });
    }
    const go = (k: number) => {
      i = (k + slides.length) % slides.length;
      wrapper.style.transform = `translate3d(${-i * 100}%, 0, 0)`;
      slides.forEach((sl, n) => sl.classList.toggle('swiper-slide-active', n === i));
      dots.forEach((d, n) => d.classList.toggle('swiper-pagination-bullet-active', n === i));
    };
    const next = () => go(i + 1);
    const prev = () => go(i - 1);
    const nb = root.querySelector('.elementor-swiper-button-next');
    const pb = root.querySelector('.elementor-swiper-button-prev');
    nb?.addEventListener('click', next);
    pb?.addEventListener('click', prev);
    const enter = () => { if (s.pause_on_hover === 'yes') paused = true; };
    const leave = () => { paused = false; };
    root.addEventListener('mouseenter', enter);
    root.addEventListener('mouseleave', leave);
    go(0);
    const timer = s.autoplay === 'yes' ? window.setInterval(() => { if (!paused) next(); }, s.autoplay_speed || 5000) : 0;
    return () => {
      clearInterval(timer);
      nb?.removeEventListener('click', next);
      pb?.removeEventListener('click', prev);
      root.removeEventListener('mouseenter', enter);
      root.removeEventListener('mouseleave', leave);
      dots.forEach((d) => d.remove());
    };
  }, [root, settings]);

  return <>{children}</>;
}
