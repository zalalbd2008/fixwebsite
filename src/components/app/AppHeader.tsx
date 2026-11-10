'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useShell } from './AppShell';
import { LOGO, MoonIcon, SunIcon } from './icons';
import { LanguageButtons } from './LanguageSwitcher';

/** Mobile "app" header (#fwi-ah): burger, logo, EN/ES and dark-mode buttons. */
export function AppHeader() {
  const { drawerOpen, toggleDrawer, dark, setDark } = useShell();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={`fwi-app fwi-ah${scrolled ? ' is-scrolled' : ''}`} id="fwi-ah">
      <button type="button" className="fwi-ah__icon fwi-ah__burger" aria-label="Open menu" aria-controls="fwi-dr" aria-expanded={drawerOpen} onClick={toggleDrawer}>
        <span /><span /><span />
      </button>
      <Link className="fwi-ah__logo" href="/" aria-label="Fix Website Issues home" prefetch={false}>
        <img fetchPriority="high" src={LOGO} alt="Fix Website Issues - WevTEC" width={150} height={40} decoding="async" />
      </Link>
      <div className="fwi-ah__tools">
        <LanguageButtons className="fwi-lang fwi-app-lang notranslate" />
        <button type="button" className="fwi-ah__icon fwi-theme-btn" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={dark} onClick={() => setDark(!dark)}>
          <MoonIcon />
          <SunIcon />
        </button>
      </div>
    </header>
  );
}
