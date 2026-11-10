'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useShell } from './AppShell';
import { usePopups } from '../elementor/popups';
import { PHONE_HREF, PhonePath } from './icons';

/** Hide bars while a popup is open or while the visitor types in a form field. */
export function useHideWhileTyping(maxWidth?: number) {
  const { openIds } = usePopups();
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const sync = () => {
      const ae = document.activeElement as HTMLElement | null;
      const dr = document.getElementById('fwi-dr');
      setTyping(!!ae && /INPUT|TEXTAREA|SELECT/.test(ae.tagName) && !dr?.contains(ae) && (!maxWidth || window.innerWidth < maxWidth));
    };
    const out = () => setTimeout(sync, 150);
    document.addEventListener('focusin', sync);
    document.addEventListener('focusout', out);
    return () => { document.removeEventListener('focusin', sync); document.removeEventListener('focusout', out); };
  }, [maxWidth]);
  return openIds.length > 0 || typing;
}

/** Mobile bottom tab bar (#fwi-tb). */
export function TabBar() {
  const { drawerOpen, toggleDrawer } = useShell();
  const hidden = useHideWhileTyping();
  return (
    <nav className={`fwi-app fwi-tb${hidden ? ' is-hidden' : ''}`} id="fwi-tb" aria-label="Main">
      <Link className="fwi-tb__item" href="/" prefetch={false}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg><span>Home</span>
      </Link>
      <Link className="fwi-tb__item" href="/what-we-fix/" prefetch={false}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8V21h3.2l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.5 2.5-2.6-.6-.6-2.6z" /></svg><span>Services</span>
      </Link>
      <a className="fwi-tb__item fwi-tb__cta fwi-open-consult" href="/consultation/" data-fwi-track="consultation" data-fwi-where="Mobile tab bar (Free Audit)">
        <span className="fwi-tb__fab"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5M7.8 10.6l1.9 1.9 3.5-3.6" /></svg></span><span>Free Audit</span>
      </a>
      <a className="fwi-tb__item" href={PHONE_HREF} data-fwi-track="call" data-fwi-where="Mobile tab bar (Consult)" aria-label="Consult an expert now, call (832) 266-7209">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={PhonePath} /></svg><span>Consult</span>
      </a>
      <button type="button" className="fwi-tb__item fwi-tb__menu" aria-controls="fwi-dr" aria-expanded={drawerOpen} onClick={toggleDrawer}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" /></svg><span>Menu</span>
      </button>
    </nav>
  );
}

/** "Need Free Consultation / Talk To Expert" quick contact bar (#fwi-mbar). */
export function MobileBar() {
  const hidden = useHideWhileTyping(1024);
  useEffect(() => { document.body.classList.add('fwi-mbar-on'); }, []);
  return (
    <nav id="fwi-mbar" className={hidden ? 'fwi-mbar-hide' : undefined} aria-label="Quick contact">
      <a className="fwi-mbar-consult" href="/consultation/" data-fwi-track="consultation" data-fwi-where="Mobile bottom bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 9h8M8 13h5" /></svg>
        <span>Need Free Consultation</span>
      </a>
      <a className="fwi-mbar-call" href={PHONE_HREF} data-fwi-track="call" data-fwi-where="Mobile bottom bar" aria-label="Talk To Expert Now, call (832) 266-7209">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={PhonePath} /></svg>
        <span>Talk To Expert Now</span>
      </a>
    </nav>
  );
}
