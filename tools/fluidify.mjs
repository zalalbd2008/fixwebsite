// "Liquid" typography: turns fixed large font sizes in the Elementor CSS into clamp() values,
// so text scales smoothly between Elementor's breakpoints instead of jumping.
// Desktop size is reached at 1440px, tablet size at 1024px, mobile size at 390px. Idempotent.
// Usage: node tools/fluidify.mjs
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIRS = [path.join(ROOT, 'public/wp-content/uploads/elementor/css'), path.join(ROOT, 'public/wp-content/cache/flying-press'), path.join(ROOT, 'public/_styles')];
const r = (n) => Math.round(n * 100) / 100;

function fluid(px, ctx) {
  if (ctx === 'mobile') return px >= 26 ? `clamp(${r(px * 0.86)}px, ${r((px / 390) * 100)}vw, ${px}px)` : null;
  if (ctx === 'tablet') return px >= 26 ? `clamp(${r(px * 0.8)}px, ${r((px / 1024) * 100)}vw, ${px}px)` : null;
  return px >= 28 ? `clamp(${r(Math.max(px * 0.7, 24))}px, ${r((px / 1440) * 100)}vw, ${px}px)` : null;
}

function contextOf(stack) {
  const q = stack.join(' ');
  if (/max-width:\s*(767|480|575|600|640|700)/.test(q)) return 'mobile';
  if (/max-width:\s*(1024|1023|1100|1200|880|900|960|991|992)/.test(q)) return 'tablet';
  if (/max-width/.test(q)) return 'other';
  return 'desktop';
}

function transform(css) {
  let out = '', i = 0, changed = 0;
  const stack = []; // prelude of each open block ('' for normal rules)
  let buf = '';
  while (i < css.length) {
    const ch = css[i];
    if (ch === '/' && css[i + 1] === '*') { const e = css.indexOf('*/', i + 2); const end = e < 0 ? css.length : e + 2; buf += css.slice(i, end); i = end; continue; }
    if (ch === '{') { stack.push(buf.trim().startsWith('@') ? buf.trim() : ''); out += buf + ch; buf = ''; i++; continue; }
    if (ch === '}' || ch === ';') {
      // a declaration ends here
      const ctx = contextOf(stack.filter(Boolean));
      if (ctx !== 'other') {
        buf = buf.replace(/(^|[\s;{])font-size\s*:\s*([0-9.]+)px(\s*!important)?\s*$/, (m, pre, n, imp) => {
          const f = fluid(parseFloat(n), ctx);
          if (!f) return m;
          changed++;
          return `${pre}font-size:${f}${imp || ''}`;
        });
      }
      out += buf + ch; buf = '';
      if (ch === '}') stack.pop();
      i++; continue;
    }
    buf += ch; i++;
  }
  return { css: out + buf, changed };
}

let files = 0, total = 0;
for (const dir of DIRS) {
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.css') || f === 'fluid.css') continue;
    const p = path.join(dir, f);
    const { css, changed } = transform(fs.readFileSync(p, 'utf8'));
    if (changed) { fs.writeFileSync(p, css); files++; total += changed; }
  }
}
console.log(`fluid typography: ${total} font sizes in ${files} files`);
