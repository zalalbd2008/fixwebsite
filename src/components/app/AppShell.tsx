'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

type Shell = { drawerOpen: boolean; openDrawer: () => void; closeDrawer: () => void; toggleDrawer: () => void; dark: boolean; setDark: (d: boolean) => void };
const ShellContext = createContext<Shell | null>(null);
export const useShell = () => useContext(ShellContext)!;

/** State shared by the app-style mobile header, drawer and tab bar. */
export function AppShellProvider({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dark, setDarkState] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setDarkState(document.documentElement.classList.contains('fwi-dark')); }, []);
  const setDark = useCallback((d: boolean) => {
    setDarkState(d);
    try { localStorage.setItem('fwiTheme', d ? 'dark' : 'light'); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('fwi-dark', dark);
    document.getElementById('fwi-theme-color')?.setAttribute('content', dark ? '#121829' : '#ffffff');
    if (dark) keepMedia();
  }, [dark, pathname]);

  useEffect(() => { document.body.classList.toggle('fwi-dr-lock', drawerOpen); }, [drawerOpen]);
  useEffect(() => { setDrawerOpen(false); }, [pathname]);
  useEffect(() => {
    const mq = window.matchMedia('(max-width:767px)');
    const on = (m: MediaQueryListEvent) => { if (!m.matches) setDrawerOpen(false); };
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  const value: Shell = {
    drawerOpen,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
    toggleDrawer: () => setDrawerOpen((o) => !o),
    dark,
    setDark,
  };
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

/** In dark mode, keep sections that have background images as they are (same as the original site). */
function keepMedia() {
  const sel = ['.e-con', '.elementor-section', '.elementor-column-wrap', '.elementor-widget-container', '.elementor-background-overlay']
    .map((s) => `body>:not(.fwi-app) ${s}`)
    .join(',');
  document.querySelectorAll<HTMLElement & { __fwiBg?: boolean }>(sel).forEach((el) => {
    if (el.__fwiBg) return;
    el.__fwiBg = true;
    const b = getComputedStyle(el).backgroundImage;
    if (b && b.includes('url(')) el.classList.add('fwi-dk-keep');
  });
}
