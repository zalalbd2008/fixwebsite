'use client';

import { useEffect, useRef, useState } from 'react';

/** Elementor counter: counts up when it scrolls into view. */
export function Counter({ className, from, to, duration, delimiter, initial }: { className?: string; from: number; to: number; duration: number; delimiter: string; initial: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState<number | null>(null);
  const decimals = (String(to).split('.')[1] || '').length;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      if (reduce) { setValue(to); return; }
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        setValue(from + (to - from) * p);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, [from, to, duration]);

  const format = (n: number) => {
    const fixed = n.toFixed(decimals);
    if (!delimiter) return fixed;
    const [i, d] = fixed.split('.');
    return i.replace(/\B(?=(\d{3})+(?!\d))/g, delimiter) + (d ? '.' + d : '');
  };

  return (
    <span ref={ref} className={className} data-duration={duration} data-to-value={to} data-from-value={from} data-delimiter={delimiter}>
      {value === null ? initial : format(value)}
    </span>
  );
}
