'use client';

import { useEffect } from 'react';

export type Script = { code?: string; src?: string; id?: string };

function loadScript(src: string) {
  return new Promise<void>((resolve) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.dataset.pageScript = '';
    s.onload = s.onerror = () => resolve();
    document.body.appendChild(s);
  });
}

let jqueryLoading: Promise<void> | null = null;
const ensureJQuery = () => (window as any).jQuery ? Promise.resolve() : (jqueryLoading ??= loadScript('/wp-includes/js/jquery/jquery.min.js'));

/**
 * Runs the small inline scripts that are part of the page content (calculators, steppers, custom popups...)
 * after React has rendered the page. "DOMContentLoaded" / "load" listeners fire right away.
 */
export function PageScripts({ scripts }: { scripts: Script[] }) {
  useEffect(() => {
    if (!scripts.length) return;
    let cancelled = false;
    const added: HTMLScriptElement[] = [];
    (async () => {
      if (scripts.some((s) => s.code && /jQuery|\$\(/.test(s.code))) await ensureJQuery();
      // the page is already loaded: run DOMContentLoaded / load callbacks immediately
      const docAdd = document.addEventListener, winAdd = window.addEventListener;
      const patch = (target: Document | Window, orig: typeof document.addEventListener) =>
        function (type: string, cb: EventListenerOrEventListenerObject, opts?: boolean | AddEventListenerOptions) {
          if (type === 'DOMContentLoaded' || (type === 'load' && target === window)) {
            setTimeout(() => (typeof cb === 'function' ? cb.call(target, new Event(type)) : cb.handleEvent(new Event(type))), 0);
            return;
          }
          return orig.call(target, type, cb, opts);
        };
      for (const s of scripts) {
        if (cancelled) return;
        if (s.src) { await loadScript(s.src); continue; }
        document.addEventListener = patch(document, docAdd) as typeof docAdd;
        window.addEventListener = patch(window, winAdd as typeof docAdd) as typeof winAdd;
        try {
          const el = document.createElement('script');
          el.text = `try{${s.code}\n}catch(e){console.error(e)}`;
          el.dataset.pageScript = s.id || '';
          document.body.appendChild(el);
          added.push(el);
        } finally {
          document.addEventListener = docAdd;
          window.addEventListener = winAdd;
        }
      }
    })();
    return () => { cancelled = true; added.forEach((el) => el.remove()); };
  }, [scripts]);
  return null;
}
