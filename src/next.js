// The Astryx (Meta design system) look of the plan pages: /next, /next/example and /next/p/<id>.
// The app is built from web/ by scripts/embed-web.mjs into next-app.generated.js (committed, so deploys need no build step).
// The Worker serves its JS, CSS and fonts as files at /_app/<name>.<hash>.<ext>, cached for a year.
import { SHELL, SITE, hreflangLinks, prefixOf } from './i18n.js';
import { NEXT_CSS, NEXT_CSS_PATH, NEXT_FONTS, NEXT_JS, NEXT_JS_PATH } from './next-app.generated.js';

const YEAR = 'public, max-age=31536000, immutable';
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// What shows before the app loads on the home page: the heading and the link box, marked as the next action (the app replaces it).
const skeleton = (S) => `<div class="hero"><h1>${esc(S.heading)}</h1><form class="url-row" onsubmit="return false"><div class="url-field url-skeleton"><input class="next-cta" data-next-cta type="text" inputmode="url" autocomplete="url" placeholder="${esc(S.placeholder)}" aria-label="${esc(S.ariaLink)}"></div><button type="button" class="url-skeleton-paste">${esc(S.paste)}</button></form></div>`;

// A built file, or null when the path is not one.
export function nextAsset(path) {
  if (path === NEXT_JS_PATH) return new Response(NEXT_JS, { headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': YEAR } });
  if (path === NEXT_CSS_PATH) return new Response(NEXT_CSS, { headers: { 'content-type': 'text/css; charset=utf-8', 'cache-control': YEAR } });
  const f = NEXT_FONTS[path];
  if (f) return new Response(Uint8Array.from(atob(f), (c) => c.charCodeAt(0)), { headers: { 'content-type': 'font/woff2', 'cache-control': YEAR } });
  return null;
}

// The page shell: meta for people who share a link, the Flisk bar, then the app. No sign-in and no session is asked for here.
export function nextPage({ planId = '', prefill = '', share = null, index = false, bare = false, lang = 'en' } = {}) {
  const S = SHELL[lang] || SHELL.en;
  const title = bare ? S.cabinet : share ? S.planFor(share.host) : S.title;
  const desc = share ? (share.summary || S.planDesc) : S.desc;
  const boot = JSON.stringify({ planId, prefill, lang }).replace(/</g, '\\u003c');
  // Only the home page has a translation to point at; it is its own canonical page.
  const home = !planId && !share && !bare;
  const canonical = SITE + (home && lang !== 'en' ? prefixOf(lang) + '/' : '/');
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#0b0b0c" media="(prefers-color-scheme: dark)">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website"><meta name="twitter:card" content="summary">
${index ? '' : '<meta name="robots" content="noindex, nofollow">'}<link rel="canonical" href="${canonical}">${index && home ? hreflangLinks() : ''}
<link rel="icon" href="/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="${NEXT_CSS_PATH}">
<script defer data-domain="grow.flisk.si" src="https://flisk.sh/a.js"></script></head><body>
<script src="https://flisk.si/assets/bar.js" data-product="Grow" data-icon="grow" data-accent="#22c55e" data-siblings="Cilytics,Ranker" data-text="${esc(S.barText)}" defer></script>
<div id="root">${planId || share || bare ? '' : skeleton(S)}</div>
<script>window.__BOOT__=${boot};</script>
<script type="module" src="${NEXT_JS_PATH}"></script>
</body></html>`;
}
