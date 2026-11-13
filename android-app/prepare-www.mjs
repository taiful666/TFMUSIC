// Builds android-app/www from the website (index.html in the repo root).
// The website file itself is NOT changed — only the copy inside the app gets:
//   • the app design (app-theme.css) and the Android bridge (native-bridge.js)
//   • the fonts stored inside the app (works fully offline, no Google Fonts)
//   • the phone layout always on, matching timeline colours
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const www = join(here, 'www');

rmSync(www, { recursive: true, force: true });
mkdirSync(join(www, 'fonts'), { recursive: true });

let html = readFileSync(join(root, 'index.html'), 'utf8');

// exact text replacement — stops the build if the website changed and a patch no longer fits
function patch(from, to, all = false) {
  if (!html.includes(from)) throw new Error('App patch not found in index.html: ' + from.slice(0, 80));
  html = all ? html.split(from).join(to) : html.replace(from, to);
}

// The website now has its own design (stage + multitrack) and its own lyrics stage, so the
// app uses that design as it is. The old app-theme.css and lyrics.js were written for the
// previous layout and are no longer injected; only the app-only bits are added here.
const APP_CSS = `<style>
.tfa-snack{position:fixed;left:12px;right:12px;bottom:calc(76px + env(safe-area-inset-bottom));z-index:2147483000;display:flex;align-items:center;gap:12px;
  background:#2A2B32;color:#ECE7DF;border:1px solid #383943;border-radius:12px;padding:12px 12px 12px 16px;font:500 13.5px/1.45 'Hind Siliguri',sans-serif;
  box-shadow:0 12px 34px rgba(0,0,0,.55);transform:translateY(16px);opacity:0;transition:.22s}
.tfa-snack.show{transform:none;opacity:1}
.tfa-snack span{flex:1;min-width:0;word-break:break-word}
.tfa-snack small{display:block;color:#9A958E;font-size:12px}
.tfa-snack button{flex:none;border:0;border-radius:8px;background:#8B7CFF;color:#0F0A26;font:600 13.5px 'Hind Siliguri',sans-serif;height:38px;padding:0 14px}
html.tfa body{padding-top:max(env(safe-area-inset-top,0px),var(--safe-area-inset-top,0px))}
html.tfa.m .tabbar{padding-bottom:calc(4px + max(env(safe-area-inset-bottom,0px),var(--safe-area-inset-bottom,0px)))}
</style>`;

// 1) bridge first in <head>, app-only styles after the website's own styles
patch('<head>', '<head>\n<script src="native-bridge.js"></script>');
patch('</head>', '<link rel="stylesheet" href="fonts/fonts.css">\n' + APP_CSS + '\n</head>');

// 2) fonts come from inside the app (no internet needed)
html = html.replace(/<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>\s*/g, '');

// 3) the app always uses the phone layout; it is not an "in-app browser"; no web install button
patch("matchMedia('(max-width: 760px)')", "matchMedia('all')");
patch('function isInAppBrowser() {', 'function isInAppBrowser() { if (window.TF_APP) return false;');
patch('function setupInstall() {', 'function setupInstall() { if (window.TF_APP) return;');

writeFileSync(join(www, 'index.html'), html);

// app files
for (const f of ['native-bridge.js']) copyFileSync(join(here, f), join(www, f));
copyFileSync(join(here, 'logo.png'), join(www, 'logo-mark.png'));
for (const f of ['manifest.webmanifest']) if (existsSync(join(root, f))) copyFileSync(join(root, f), join(www, f));
mkdirSync(join(www, 'icons'), { recursive: true });
for (const f of readdirSync(join(root, 'icons'))) copyFileSync(join(root, 'icons', f), join(www, 'icons', f));

// fonts (from the @fontsource packages)
const fonts = [
  ['Hind Siliguri', 'hind-siliguri', ['bengali', 'latin'], [400, 500, 600, 700]],
  ['JetBrains Mono', 'jetbrains-mono', ['latin'], [500, 700]],
];
let css = '';
for (const [family, pkg, subsets, weights] of fonts) {
  const dir = join(here, 'node_modules', '@fontsource', pkg, 'files');
  for (const s of subsets) for (const w of weights) {
    const file = `${pkg}-${s}-${w}-normal.woff2`;
    if (!existsSync(join(dir, file))) throw new Error('Font file missing: ' + file);
    copyFileSync(join(dir, file), join(www, 'fonts', file));
    const range = s === 'bengali' ? 'U+0951-0952,U+0964-0965,U+0980-09FE,U+1CD0,U+1CD2,U+1CD5-1CD6,U+1CD8,U+1CE1,U+1CEA,U+1CED,U+1CF2,U+1CF5-1CF7,U+200C-200D,U+20B9,U+25CC,U+A8F1' : 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
    css += `@font-face{font-family:'${family}';font-style:normal;font-weight:${w};font-display:swap;src:url(${file}) format('woff2');unicode-range:${range}}\n`;
  }
}
writeFileSync(join(www, 'fonts', 'fonts.css'), css);
console.log('www ready');
