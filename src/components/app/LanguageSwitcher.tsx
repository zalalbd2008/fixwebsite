'use client';

import { useEffect, useState } from 'react';

declare global { interface Window { fwiGTLoaded?: number; fwiGTInit?: () => void; google?: any } }

const current = () => {
  const m = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/);
  return m && /\/es$/.test(decodeURIComponent(m[1])) ? 'es' : 'en';
};
const clearCookie = () => {
  const h = location.hostname, base = h.replace(/^www\./, ''), x = ';path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'googtrans=' + x;
  document.cookie = 'googtrans=' + x + ';domain=' + h;
  document.cookie = 'googtrans=' + x + ';domain=.' + base;
};
export function loadTranslate() {
  if (window.fwiGTLoaded) return;
  window.fwiGTLoaded = 1;
  if (!document.getElementById('fwi-gt')) { const d = document.createElement('div'); d.id = 'fwi-gt'; d.style.display = 'none'; document.body.appendChild(d); }
  window.fwiGTInit = () => { new window.google.translate.TranslateElement({ pageLanguage: 'en', includedLanguages: 'en,es', autoDisplay: false }, 'fwi-gt'); };
  const s = document.createElement('script');
  s.src = 'https://translate.google.com/translate_a/element.js?cb=fwiGTInit';
  s.async = true;
  document.head.appendChild(s);
}
/** Switch language with Google Translate (same behaviour as the original EN / ES buttons). */
export function setLanguage(l: 'en' | 'es') {
  if (l === current()) return;
  if (l === 'es') {
    document.cookie = 'googtrans=/en/es;path=/';
    const c = document.querySelector<HTMLSelectElement>('.goog-te-combo');
    if (c) { c.value = 'es'; c.dispatchEvent(new Event('change')); } else loadTranslate();
  } else { clearCookie(); location.reload(); }
  window.dispatchEvent(new CustomEvent('fwi:lang', { detail: l }));
}
export const currentLanguage = current;

export function LanguageButtons({ className }: { className: string }) {
  const [lang, setLang] = useState<'en' | 'es'>('en');
  useEffect(() => {
    setLang(current());
    const on = (e: Event) => setLang((e as CustomEvent).detail);
    window.addEventListener('fwi:lang', on);
    return () => window.removeEventListener('fwi:lang', on);
  }, []);
  return (
    <div className={className} translate="no" role="group" aria-label="Language">
      {(['en', 'es'] as const).map((l) => (
        <button key={l} type="button" className={`fwi-lang__btn${lang === l ? ' is-active' : ''}`} data-lang={l} aria-pressed={lang === l} lang={l} onClick={() => setLanguage(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
