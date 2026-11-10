// "Liquid" typography for the Elementor CSS.
//
// Font sizes stay EXACTLY as designed at the Elementor breakpoints (1440 / 1024 / 767 / 390 px),
// and scale smoothly with clamp() in the widths between them. The original rules are not touched:
// extra rules are appended at the end of each file inside range-limited media queries.
//
//   desktop rule  N px  -> between 1025 and 1439 px: scales down to 0.8 N
//   tablet rule   T px  -> between  768 and 1023 px: scales down to 0.85 T
//   mobile rule   M px  -> below 389 px:            scales down to 0.86 M
//
// Idempotent: files that already contain the marker are rebuilt from the part before it.
// Usage: node tools/fluidify.mjs
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIRS = ['public/wp-content/uploads/elementor/css', 'public/wp-content/cache/flying-press', 'public/_styles'].map((d) => path.join(ROOT, d));
const MARK = '/* fluid-typography (tools/fluidify.mjs) */';
const r = (n) => Math.round(n * 1000) / 1000;

const RANGES = {
  desktop: { media: '(min-width:1025px) and (max-width:1439px)', ref: 1440, min: 0.8, from: 24 },
  tablet: { media: '(min-width:768px) and (max-width:1023px)', ref: 1024, min: 0.85, from: 24 },
  mobile: { media: '(max-width:389px)', ref: 390, min: 0.86, from: 24 },
};

function contextOf(atRules) {
  const q = atRules.join(' ');
  if (/min-width/.test(q) && !/max-width/.test(q)) return /min-width:\s*(1025|1440|1441|1366|1200|1280)/.test(q) ? null : null; // wide-only rules: leave
  if (/max-width:\s*(767|768)px/.test(q)) return 'mobile';
  if (/max-width:\s*(1024|1023)px/.test(q)) return 'tablet';
  if (atRules.some((a) => /^@media/.test(a))) return null; // other custom ranges: leave alone
  if (atRules.some((a) => /^@(keyframes|font-face|supports|container|layer)/.test(a))) return null;
  return 'desktop';
}

function collect(css) {
  const found = { desktop: [], tablet: [], mobile: [] };
  const stack = []; // { kind: 'at'|'rule', text }
  let buf = '', i = 0;
  while (i < css.length) {
    const ch = css[i];
    if (ch === '/' && css[i + 1] === '*') { const e = css.indexOf('*/', i + 2); i = e < 0 ? css.length : e + 2; continue; }
    if (ch === '"' || ch === "'") { const e = css.indexOf(ch, i + 1); buf += css.slice(i, e < 0 ? css.length : e + 1); i = e < 0 ? css.length : e + 1; continue; }
    if (ch === '{') { const t = buf.trim(); stack.push({ kind: t.startsWith('@') ? 'at' : 'rule', text: t }); buf = ''; i++; continue; }
    if (ch === ';' || ch === '}') {
      const top = stack[stack.length - 1];
      if (top && top.kind === 'rule') {
        // every font-size is repeated (small / non-px ones unchanged) so the cascade order stays the same
        const m = buf.trim().match(/^font-size\s*:\s*(.+?)\s*(!important)?$/i);
        if (m) {
          const ctx = contextOf(stack.filter((s) => s.kind === 'at').map((s) => s.text));
          if (ctx) found[ctx].push({ sel: top.text, value: m[1], imp: m[2] || '' });
        }
      }
      buf = '';
      if (ch === '}') stack.pop();
      i++; continue;
    }
    buf += ch; i++;
  }
  return found;
}

function build(found) {
  let out = '';
  for (const [ctx, rules] of Object.entries(found)) {
    if (!rules.length) continue;
    const { media, ref, min } = RANGES[ctx];
    out += `@media ${media}{`;
    for (const { sel, value, imp } of rules) {
      const px = /^[0-9.]+px$/.test(value) ? parseFloat(value) : 0;
      const v = px >= RANGES[ctx].from ? `clamp(${r(px * min)}px,${r((px / ref) * 100)}vw,${px}px)` : value;
      out += `${sel}{font-size:${v}${imp ? ' !important' : ''}}`;
    }
    out += '}';
  }
  return out;
}

let files = 0, total = 0;
for (const dir of DIRS) {
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.css') || f === 'fluid.css' || f === 'react-compat.css') continue;
    const p = path.join(dir, f);
    let css = fs.readFileSync(p, 'utf8');
    const k = css.indexOf('\n' + MARK);
    if (k >= 0) css = css.slice(0, k);
    const found = collect(css);
    const big = (l) => l.filter((x) => /^[0-9.]+px$/.test(x.value) && parseFloat(x.value) >= 24);
    for (const c of Object.keys(found)) if (!big(found[c]).length) found[c] = [];
    const n = big(found.desktop).length + big(found.tablet).length + big(found.mobile).length;
    if (n) { fs.writeFileSync(p, css + '\n' + MARK + '\n' + build(found) + '\n'); files++; total += n; }
  }
}
console.log(`fluid typography: ${total} font sizes in ${files} files`);
