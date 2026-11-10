'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useShell } from './AppShell';
import { DRAWER_MENU, type MenuItem } from './menu';
import { LOGO, PHONE_HREF } from './icons';

function Items({ items, open, toggle, pathname, onNavigate }: { items: MenuItem[]; open: Record<string, boolean>; toggle: (id: string) => void; pathname: string; onNavigate: () => void }) {
  return (
    <>
      {items.map((it) => {
        const kids = it.children?.length ? it.children : null;
        const current = it.href === pathname ? { 'aria-current': 'page' as const } : {};
        if (!kids) {
          return (
            <li className="fwi-dr__item" key={it.label}>
              <Link className="fwi-dr__link" href={it.href!} prefetch={false} onClick={onNavigate} {...current}>{it.label}</Link>
            </li>
          );
        }
        const subId = `fwi-dr-sub-${it.id}`;
        const isOpen = !!open[it.id!];
        return (
          <li className="fwi-dr__item has-kids" key={it.label}>
            {it.href ? (
              <div className="fwi-dr__row">
                <Link className="fwi-dr__link" href={it.href} prefetch={false} onClick={onNavigate} {...current}>{it.label}</Link>
                <button type="button" className="fwi-dr__toggle fwi-dr__caret" aria-expanded={isOpen} aria-controls={subId} aria-label={it.aria} onClick={() => toggle(it.id!)}><i aria-hidden="true" /></button>
              </div>
            ) : (
              <button type="button" className="fwi-dr__link fwi-dr__toggle" aria-expanded={isOpen} aria-controls={subId} onClick={() => toggle(it.id!)}>
                <span>{it.label}</span><i aria-hidden="true" />
              </button>
            )}
            <ul className="fwi-dr__list fwi-dr__sub" id={subId} hidden={!isOpen}>
              <Items items={kids} open={open} toggle={toggle} pathname={pathname} onNavigate={onNavigate} />
            </ul>
          </li>
        );
      })}
    </>
  );
}

/** Slide-in mobile menu (#fwi-dr) and its overlay (#fwi-dr-ov). */
export function Drawer() {
  const { drawerOpen, closeDrawer } = useShell();
  const pathname = usePathname();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false); // overlay stays in the DOM for the close animation
  const [anim, setAnim] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    if (drawerOpen) {
      lastFocus.current = document.activeElement as HTMLElement;
      setMounted(true);
      requestAnimationFrame(() => setAnim(true));
      const t = setTimeout(() => ref.current?.querySelector<HTMLElement>('.fwi-dr__close')?.focus({ preventScroll: true }), 60);
      return () => clearTimeout(t);
    }
    setAnim(false);
    const t = setTimeout(() => setMounted(false), 320);
    lastFocus.current?.focus?.({ preventScroll: true });
    return () => clearTimeout(t);
  }, [drawerOpen]);

  // Esc closes, Tab stays inside the drawer
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeDrawer(); return; }
      if (e.key !== 'Tab' || !ref.current) return;
      const f = Array.from(ref.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')).filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen, closeDrawer]);

  const navigate = () => setTimeout(closeDrawer, 50);
  return (
    <>
      <div className={`fwi-app fwi-dr-ov${anim ? ' is-open' : ''}`} id="fwi-dr-ov" hidden={!mounted} onClick={closeDrawer} />
      <aside
        ref={ref}
        className={`fwi-app fwi-dr${anim ? ' is-open' : ''}`}
        id="fwi-dr"
        aria-label="Site menu"
        aria-hidden={!drawerOpen}
        inert={!drawerOpen}
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => { if (touchX.current !== null && touchX.current - e.changedTouches[0].clientX > 70) closeDrawer(); touchX.current = null; }}
      >
        <div className="fwi-dr__head">
          <Link className="fwi-ah__logo" href="/" prefetch={false} onClick={navigate}>
            <img src={LOGO} alt="Fix Website Issues - WevTEC" width={150} height={40} loading="lazy" fetchPriority="low" />
          </Link>
          <button type="button" className="fwi-ah__icon fwi-dr__close" aria-label="Close menu" onClick={closeDrawer}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <nav className="fwi-dr__nav" aria-label="Site pages">
          <ul className="fwi-dr__list">
            <Items items={DRAWER_MENU} open={open} toggle={(id) => setOpen((o) => ({ ...o, [id]: !o[id] }))} pathname={pathname} onNavigate={navigate} />
          </ul>
        </nav>
        <div className="fwi-dr__ctas">
          <a className="fwi-dr__btn fwi-dr__btn--brand fwi-open-consult" href="/consultation/" data-fwi-track="consultation" data-fwi-where="Mobile drawer" onClick={() => setTimeout(closeDrawer, 0)}>Get a Free Audit &amp; Consultation</a>
          <a className="fwi-dr__btn fwi-dr__btn--dark" href={PHONE_HREF} data-fwi-track="call" data-fwi-where="Mobile drawer">Call (832) 266-7209</a>
          <p className="fwi-dr__note">24/7 support · Pay only after the work is done</p>
        </div>
      </aside>
    </>
  );
}
