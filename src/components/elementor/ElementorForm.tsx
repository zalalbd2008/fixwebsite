'use client';

import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

type Result = { success: boolean; message: string; redirect?: string; errors?: Record<string, string> };

/**
 * Elementor Pro form, submitted to the Node.js API (/api/form) instead of WordPress admin-ajax.
 * Markup, CSS classes and messages are the same as Elementor's.
 */
export function ElementorForm({ children, ...props }: { children: ReactNode } & Record<string, unknown>) {
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'waiting'>('idle');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = ref.current!;
    form.querySelectorAll('.elementor-error').forEach((el) => el.classList.remove('elementor-error'));
    form.querySelectorAll('.elementor-form-help-inline[data-rx-error]').forEach((el) => el.remove());
    setMsg(null);
    setState('waiting');
    const data = new FormData(form);
    data.set('page_url', location.href);
    let res: Result;
    try {
      const r = await fetch('/api/form/', { method: 'POST', body: data });
      res = await r.json();
    } catch {
      res = { success: false, message: 'An error occurred.' };
    }
    setState('idle');
    if (res.errors) {
      for (const [field, text] of Object.entries(res.errors)) {
        const group = form.querySelector(`.elementor-field-group-${CSS.escape(field)}`);
        if (!group) continue;
        group.classList.add('elementor-error');
        const span = document.createElement('span');
        span.className = 'elementor-message elementor-message-danger elementor-help-inline elementor-form-help-inline';
        span.setAttribute('role', 'alert');
        span.setAttribute('data-rx-error', '');
        span.textContent = text;
        group.appendChild(span);
      }
    }
    setMsg({ ok: res.success, text: res.message });
    if (res.success) {
      // same event Elementor fires, used by some page scripts
      if (window.jQuery) window.jQuery(form).trigger('submit_success', [res]);
      else form.dispatchEvent(new CustomEvent('submit_success', { bubbles: true, detail: res }));
      form.reset();
      if (res.redirect) {
        if (res.redirect.startsWith('/')) router.push(res.redirect);
        else location.href = res.redirect;
      }
    } else {
      form.dispatchEvent(new CustomEvent('submit_error', { bubbles: true, detail: res }));
    }
  }

  const className = `${(props.className as string) || ''}${state === 'waiting' ? ' elementor-form-waiting' : ''}`;
  return (
    <form {...props} className={className} ref={ref} onSubmit={onSubmit}>
      {children}
      {msg && (
        <div className={`elementor-message elementor-message-${msg.ok ? 'success' : 'danger'}`} role="alert">
          {msg.text}
        </div>
      )}
    </form>
  );
}
