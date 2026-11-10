'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePopups } from './popups';

type Settings = {
  entrance_animation?: string;
  exit_animation?: string;
  entrance_animation_duration?: { size?: number };
  prevent_close_on_background_click?: string;
  prevent_close_on_esc_key?: string;
  triggers?: { page_load?: string; page_load_delay?: number; exit_intent?: string; scrolling?: string; scrolling_offset?: number } | [];
  timing?: { times?: string; times_times?: number; times_count?: number; times_period?: string } | [];
};

const CloseIcon = () => (
  <svg className="e-font-icon-svg e-eicon-close" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
    <path d="M742 167L500 408 258 167C246 154 233 150 217 150 196 150 179 158 167 167 154 179 150 196 150 212 150 229 154 242 167 254L408 500 167 742C154 755 150 771 150 783 150 800 158 813 167 825 179 838 196 842 212 842 229 842 242 837 254 825L500 583 742 825C754 837 771 842 783 842 800 842 813 838 825 825 838 813 842 800 842 783 842 767 837 754 825 742L583 500 825 258C838 246 842 229 842 217 842 196 834 179 825 167 813 154 796 150 783 150 767 150 754 154 742 167Z" />
  </svg>
);

/** Elementor Pro popup ("dialog-lightbox") rendered by React. */
export function PopupFrame({ id, settings, children }: { id: string; settings: string; children: ReactNode }) {
  const { isOpen, open, close } = usePopups();
  const shown = isOpen(id);
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  let s: Settings = {};
  try { s = JSON.parse(settings); } catch { /* ignore */ }
  const duration = s.entrance_animation_duration?.size ?? 1.2;

  // entrance / exit animation
  useEffect(() => {
    if (shown) { setLeaving(false); setVisible(true); return; }
    if (!visible) return;
    if (s.exit_animation) {
      setLeaving(true);
      const t = setTimeout(() => { setVisible(false); setLeaving(false); }, duration * 1000);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps

  // focus the dialog for keyboard users
  useEffect(() => { if (shown) ref.current?.querySelector<HTMLElement>('input,select,textarea,button,a[href]')?.focus({ preventScroll: true }); }, [shown]);

  // automatic triggers (page load / exit intent) with "show up to N times per session"
  useEffect(() => {
    const trig = Array.isArray(s.triggers) ? {} : s.triggers || {};
    const timing = Array.isArray(s.timing) ? {} : s.timing || {};
    const key = `elementor_popup_${id}_times`;
    const allowed = () => {
      if (timing.times !== 'yes') return true;
      const max = timing.times_times || timing.times_count || 1;
      const store = timing.times_period === 'session' ? sessionStorage : localStorage;
      try { return Number(store.getItem(key) || 0) < max; } catch { return true; }
    };
    const count = () => {
      if (timing.times !== 'yes') return;
      const store = timing.times_period === 'session' ? sessionStorage : localStorage;
      try { store.setItem(key, String(Number(store.getItem(key) || 0) + 1)); } catch { /* ignore */ }
    };
    const fire = () => { if (allowed()) { count(); open(id); } };
    const cleanups: (() => void)[] = [];
    if (trig.page_load === 'yes') {
      const t = setTimeout(fire, (trig.page_load_delay || 0) * 1000);
      cleanups.push(() => clearTimeout(t));
    }
    if (trig.exit_intent === 'yes') {
      let done = false;
      const onLeave = (e: MouseEvent) => { if (!done && e.clientY <= 0) { done = true; fire(); } };
      document.addEventListener('mouseleave', onLeave);
      cleanups.push(() => document.removeEventListener('mouseleave', onLeave));
    }
    return () => cleanups.forEach((c) => c());
  }, [id, settings]); // eslint-disable-line react-hooks/exhaustive-deps

  const anim = leaving ? s.exit_animation : s.entrance_animation;
  return (
    <div
      id={`elementor-popup-modal-${id}`}
      className="dialog-widget dialog-lightbox-widget dialog-type-buttons dialog-type-lightbox elementor-popup-modal"
      role="dialog"
      aria-modal="true"
      ref={ref}
      style={{ display: visible ? 'flex' : 'none' }}
      onClick={(e) => { if (e.target === e.currentTarget && s.prevent_close_on_background_click !== 'yes') close(id); }}
    >
      <div className={`dialog-widget-content dialog-lightbox-widget-content${anim ? ` animated ${anim}` : ''}`} style={{ animationDuration: `${duration}s` }}>
        <a role="button" tabIndex={0} aria-label="Close" href="#" className="dialog-close-button dialog-lightbox-close-button" onClick={(e) => { e.preventDefault(); close(id); }}>
          <CloseIcon />
        </a>
        <div className="dialog-message dialog-lightbox-message">{children}</div>
      </div>
    </div>
  );
}
