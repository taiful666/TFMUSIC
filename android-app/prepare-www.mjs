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

// 1) bridge first in <head>, app design after the website's own styles
patch('<head>', '<head>\n<script src="native-bridge.js"></script>');
patch('</head>', '<link rel="stylesheet" href="fonts/fonts.css">\n<link rel="stylesheet" href="app-theme.css">\n</head>');

// 2) fonts come from inside the app (no internet needed)
html = html.replace(/<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>\s*/g, '');

// 3) the app always uses the phone layout; it is not an "in-app browser"; no web install button
patch("matchMedia('(max-width: 900px) and (min-height: 520px)')", "matchMedia('all')");
patch('function isInAppBrowser() {', 'function isInAppBrowser() { if (window.TF_APP) return false;');
patch('function setupInstall() {', 'function setupInstall() { if (window.TF_APP) return;');
patch('<meta name="theme-color" content="#0b111c">', '<meta name="theme-color" content="#0A0B0F">');

// 4) timeline colours that match the app design
patch("g.fillStyle = '#0a101a'; g.fillRect(0, RULER, vw, TH);", "g.fillStyle = '#121319'; g.fillRect(0, RULER, vw, TH);");
patch("g.fillStyle = '#080d16'; g.fillRect(0, RULER + TH, vw, TH);", "g.fillStyle = '#0F1015'; g.fillRect(0, RULER + TH, vw, TH);");
patch("g.fillStyle = '#0d1422'; g.fillRect(0, 0, vw, RULER);", "g.fillStyle = '#13141A'; g.fillRect(0, 0, vw, RULER);");
patch("g.strokeStyle = '#334155'; g.beginPath(); g.moveTo(x, 14);", "g.strokeStyle = '#30323C'; g.beginPath(); g.moveTo(x, 14);");
patch("g.strokeStyle = 'rgba(30,41,59,.55)';", "g.strokeStyle = 'rgba(255,255,255,.035)';");
patch("g.fillStyle = '#7b8aa3';", "g.fillStyle = '#6A707C';");
patch("g.strokeStyle = '#1e293b'; g.beginPath();", "g.strokeStyle = 'rgba(255,255,255,.06)'; g.beginPath();");
patch("col = tk === 'vocal' ? '#38bdf8' : '#34d399'", "col = tk === 'vocal' ? '#8B7CFF' : '#3DDC97'");
patch("tk === 'vocal' ? 'rgba(56,189,248,.13)' : 'rgba(52,211,153,.12)'", "tk === 'vocal' ? 'rgba(139,124,255,.15)' : 'rgba(61,220,151,.12)'");
patch("S.rec ? '#f43f5e' : '#fb7185'", "S.rec ? '#FF4D6D' : '#FF5C7A'", true);
patch("g.fillStyle = sel ? '#ffffff' : 'rgba(251,191,36,.85)';", "g.fillStyle = sel ? '#ffffff' : 'rgba(255,255,255,.45)';");

// 5) lyrics (karaoke) screen — runs after the website's own script
patch('</body>', '<script src="lyrics.js"></script>\n</body>');

writeFileSync(join(www, 'index.html'), html);

// app files
for (const f of ['native-bridge.js', 'app-theme.css', 'lyrics.js']) copyFileSync(join(here, f), join(www, f));
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
