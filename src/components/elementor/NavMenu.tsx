'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useRxElement } from './useRx';

/**
 * Elementor Pro "Nav Menu" widget: hover dropdowns on desktop (like SmartMenus)
 * and the burger toggle + tap-to-open sub menus on tablet / mobile.
 */
export function NavMenu({ rx, children }: { rx: string; children: ReactNode }) {
  const root = useRxElement(rx);
  const pathname = usePathname();

  useEffect(() => {
    if (!root) return;
    const timers = new Map<Element, number>();
    const items = Array.from(root.querySelectorAll<HTMLLIElement>('.elementor-nav-menu--main li.menu-item-has-children'));
    const show = (li: Element) => {
      const ul = li.querySelector(':scope > ul') as HTMLElement | null;
      const a = li.querySelector(':scope > a');
      if (!ul) return;
      window.clearTimeout(timers.get(li));
      // close siblings
      li.parentElement?.querySelectorAll(':scope > li > ul').forEach((u) => { if (u !== ul) hide(u.parentElement!); });
      ul.style.display = 'block';
      ul.setAttribute('aria-hidden', 'false');
      a?.classList.add('highlighted');
      a?.setAttribute('aria-expanded', 'true');
    };
    const hide = (li: Element) => {
      const ul = li.querySelector(':scope > ul') as HTMLElement | null;
      const a = li.querySelector(':scope > a');
      if (!ul) return;
      ul.style.display = '';
      ul.setAttribute('aria-hidden', 'true');
      a?.classList.remove('highlighted');
      a?.setAttribute('aria-expanded', 'false');
      ul.querySelectorAll(':scope li').forEach((x) => { const u = x.querySelector(':scope > ul') as HTMLElement | null; if (u) u.style.display = ''; });
    };
    const offs: (() => void)[] = [];
    for (const li of items) {
      const a = li.querySelector(':scope > a');
      a?.classList.add('has-submenu');
      a?.setAttribute('aria-haspopup', 'true');
      a?.setAttribute('aria-expanded', 'false');
      const enter = () => show(li);
      const leave = () => { timers.set(li, window.setTimeout(() => hide(li), 250)); };
      const click = (e: Event) => {
        const href = a?.getAttribute('href') || '#';
        const ul = li.querySelector(':scope > ul') as HTMLElement | null;
        // first tap opens the sub menu; "#" items never navigate
        if (href === '#' || (ul && ul.style.display !== 'block')) { e.preventDefault(); ul && ul.style.display === 'block' && href === '#' ? hide(li) : show(li); }
      };
      const focusIn = () => show(li);
      li.addEventListener('mouseenter', enter);
      li.addEventListener('mouseleave', leave);
      li.addEventListener('focusin', focusIn);
      a?.addEventListener('click', click);
      offs.push(() => { li.removeEventListener('mouseenter', enter); li.removeEventListener('mouseleave', leave); li.removeEventListener('focusin', focusIn); a?.removeEventListener('click', click); });
    }
    const onDocClick = (e: MouseEvent) => { if (!root.contains(e.target as Node)) items.forEach(hide); };
    document.addEventListener('click', onDocClick);

    // burger toggle (tablet / mobile dropdown)
    const toggle = root.querySelector<HTMLElement>('.elementor-menu-toggle');
    const dropdown = root.querySelector<HTMLElement>('.elementor-nav-menu--dropdown.elementor-nav-menu__container');
    const setOpen = (open: boolean) => {
      toggle?.classList.toggle('elementor-active', open);
      toggle?.setAttribute('aria-expanded', String(open));
      dropdown?.setAttribute('aria-hidden', String(!open));
    };
    const onToggle = () => setOpen(!toggle?.classList.contains('elementor-active'));
    toggle?.addEventListener('click', onToggle);
    // sub menus inside the dropdown open on tap
    const onDropClick = (e: Event) => {
      const a = (e.target as HTMLElement).closest('a');
      const li = a?.parentElement;
      if (!a || !li?.classList.contains('menu-item-has-children')) return;
      const ul = li.querySelector(':scope > ul') as HTMLElement | null;
      if (!ul) return;
      if (ul.style.display !== 'block' || a.getAttribute('href') === '#') {
        e.preventDefault();
        const open = ul.style.display !== 'block';
        ul.style.display = open ? 'block' : '';
        a.classList.toggle('highlighted', open);
        a.setAttribute('aria-expanded', String(open));
      }
    };
    dropdown?.addEventListener('click', onDropClick);

    return () => {
      offs.forEach((f) => f());
      document.removeEventListener('click', onDocClick);
      toggle?.removeEventListener('click', onToggle);
      dropdown?.removeEventListener('click', onDropClick);
      timers.forEach((t) => clearTimeout(t));
    };
  }, [root]);

  // close everything after navigating
  useEffect(() => {
    if (!root) return;
    root.querySelectorAll<HTMLElement>('ul.sub-menu').forEach((u) => { u.style.display = ''; });
    root.querySelectorAll('a.highlighted').forEach((a) => a.classList.remove('highlighted'));
    const toggle = root.querySelector('.elementor-menu-toggle');
    toggle?.classList.remove('elementor-active');
    toggle?.setAttribute('aria-expanded', 'false');
  }, [pathname, root]);

  return <>{children}</>;
}
