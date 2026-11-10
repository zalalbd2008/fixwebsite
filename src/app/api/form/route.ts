import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { appendLog, getFormConfig } from '@/lib/forms';

export const runtime = 'nodejs';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Receives every Elementor form on the site (replaces WordPress admin-ajax "elementor_pro_forms_send_form").
 * - saves the submission to data/form-submissions.jsonl
 * - emails it when SMTP is configured (see .env.example)
 * - answers with the same success message / redirect as the WordPress form settings
 */
export async function POST(req: Request) {
  const data = await req.formData();
  const postId = String(data.get('post_id') || '');
  const formId = String(data.get('form_id') || '');
  const cfg = getFormConfig(postId, formId);
  if (!cfg) return NextResponse.json({ success: false, message: 'An error occurred.' }, { status: 400 });

  // honeypot fields (Elementor "honeypot" field type) must stay empty
  for (const [k, v] of data.entries()) if (/honeypot/i.test(k) && String(v)) return NextResponse.json({ success: true, message: cfg.successMessage });

  const values: Record<string, string> = {};
  for (const [k, v] of data.entries()) {
    const m = k.match(/^form_fields\[(.+?)\](\[\])?$/);
    if (!m) continue;
    const val = typeof v === 'string' ? v : v.name;
    values[m[1]] = values[m[1]] ? `${values[m[1]]}, ${val}` : val;
  }

  const errors: Record<string, string> = {};
  for (const f of cfg.fields) {
    if (!f.id || f.type === 'step' || f.type === 'html' || f.type === 'hidden') continue;
    const v = (values[f.id] || '').trim();
    if (f.required === 'true' || f.required === 'yes') { if (!v) errors[f.id] = 'This field is required.'; }
    if (v && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors[f.id] = 'Please enter a valid email address.';
    if (v && f.type === 'url' && !/^(https?:\/\/)?[^\s.]+\.[^\s]+$/i.test(v)) errors[f.id] = 'Please enter a valid URL.';
  }
  if (Object.keys(errors).length) return NextResponse.json({ success: false, message: 'Your submission failed because of an error.', errors });

  const entry = {
    time: new Date().toISOString(), form: cfg.name, postId, formId, page: String(data.get('page_url') || data.get('referrer') || ''),
    refererTitle: String(data.get('referer_title') || ''), ip: req.headers.get('x-forwarded-for') || '', userAgent: req.headers.get('user-agent') || '',
    fields: Object.fromEntries(cfg.fields.filter((f) => values[f.id] !== undefined).map((f) => [f.label || f.id, values[f.id]])),
  };
  appendLog('form-submissions.jsonl', entry);

  if (process.env.SMTP_HOST) {
    try {
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      });
      const rows = Object.entries(entry.fields).map(([k, v]) => `<tr><td style="padding:6px 12px;border:1px solid #ddd"><b>${esc(k)}</b></td><td style="padding:6px 12px;border:1px solid #ddd">${esc(String(v)).replace(/\n/g, '<br>')}</td></tr>`).join('');
      const replyTo = Object.entries(values).find(([, v]) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))?.[1];
      await transport.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: process.env.FORM_EMAIL_TO || cfg.emailTo,
        replyTo,
        subject: cfg.emailSubject?.replace(/\[[^\]]+\]/g, '').trim() || `New message from "${cfg.name}"`,
        html: `<h2>${esc(cfg.name)}</h2><table style="border-collapse:collapse">${rows}</table><p>Page: ${esc(entry.page)}</p>`,
      });
    } catch (e) {
      console.error('form email failed', e);
    }
  }

  return NextResponse.json({
    success: true,
    message: cfg.successMessage,
    redirect: cfg.actions.includes('redirect') ? cfg.redirectTo : undefined,
  });
}
