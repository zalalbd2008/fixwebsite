'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export const MAIN_POPUP = '254497';

type PopupApi = {
  openIds: string[];
  open: (id: string) => void;
  close: (id?: string) => void;
  isOpen: (id: string) => boolean;
};
const PopupContext = createContext<PopupApi | null>(null);
export const usePopups = () => useContext(PopupContext)!;

declare global {
  interface Window {
    elementorProFrontend?: { modules: { popup: { showPopup: (o: { id: number | string }) => void; closePopup: (o?: unknown, e?: unknown) => void } } };
    jQuery?: any;
  }
}

/** "#elementor-action:action=popup:open&settings=<base64 json>" -> { action, settings } */
export function parseElementorAction(href: string): { action: string; settings: Record<string, unknown> } | null {
  let h = href;
  try { h = decodeURIComponent(href); } catch { /* ignore */ }
  const m = h.match(/#elementor-action:action=([^&]+)(?:&settings=([^&]+))?/);
  if (!m) return null;
  let settings = {};
  if (m[2]) { try { settings = JSON.parse(atob(m[2])); } catch { /* ignore */ } }
  return { action: m[1], settings };
}

const isConsultationPage = () => location.pathname.replace(/\/$/, '') === '/consultation';

/** Opens/closes Elementor popups and replaces Elementor Pro's popup module. */
export function PopupProvider({ children }: { children: ReactNode }) {
  const [openIds, setOpenIds] = useState<string[]>([]);
  const pathname = usePathname();
  const openRef = useRef(openIds);
  openRef.current = openIds;

  const open = useCallback((id: string) => {
    id = String(id);
    if (!document.getElementById(`elementor-popup-modal-${id}`)) return;
    setOpenIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }, []);
  const close = useCallback((id?: string) => {
    setOpenIds((ids) => (id ? ids.filter((x) => x !== String(id)) : ids.slice(0, -1)));
  }, []);
  const isOpen = useCallback((id: string) => openIds.includes(String(id)), [openIds]);

  // close everything on page change
  useEffect(() => { setOpenIds([]); }, [pathname]);

  // lock page scroll while a popup is open; tell the mobile bars
  useEffect(() => {
    document.body.style.overflow = openIds.length ? 'hidden' : '';
    document.body.classList.toggle('fwi-popup-open', openIds.length > 0);
    window.dispatchEvent(new CustomEvent(openIds.length ? 'elementor/popup/show' : 'elementor/popup/hide'));
    if (window.jQuery) window.jQuery(document).trigger(openIds.length ? 'elementor/popup/show' : 'elementor/popup/hide');
  }, [openIds]);

  // Elementor Pro compatible API, used by the site's own inline scripts
  useEffect(() => {
    window.elementorProFrontend = {
      modules: { popup: { showPopup: ({ id }) => open(String(id)), closePopup: () => close() } },
    };
  }, [open, close]);

  // click handling: Elementor action links + the site's "consultation" buttons
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      const a = t?.closest?.('a') as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute('href') || '';
      const act = href.includes('elementor-action') ? parseElementorAction(href) : null;
      if (act) {
        e.preventDefault();
        const id = String((act.settings as { id?: string }).id || '');
        if (act.action === 'popup:open' && id) open(id);
        else if (act.action === 'popup:close') {
          const modal = a.closest('.elementor-popup-modal');
          close(modal ? modal.id.replace('elementor-popup-modal-', '') : undefined);
        } else if (act.action === 'popup:toggle' && id) (openRef.current.includes(id) ? close(id) : open(id));
        return;
      }
      // .fwi-open-consult buttons, mobile CTA and bottom bar open the free-audit popup
      const consult = a.matches('.fwi-open-consult, .fwi-mob-cta-primary a, .fwi-mbar-consult');
      if (consult) {
        if (isConsultationPage()) {
          const f = document.querySelector('.elementor-form');
          if (f) { e.preventDefault(); f.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
          return;
        }
        if (document.getElementById(`elementor-popup-modal-${MAIN_POPUP}`)) { e.preventDefault(); open(MAIN_POPUP); }
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && openRef.current.length) close(); };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); };
  }, [open, close]);

  const api = useMemo(() => ({ openIds, open, close, isOpen }), [openIds, open, close, isOpen]);
  return <PopupContext.Provider value={api}>{children}</PopupContext.Provider>;
}
