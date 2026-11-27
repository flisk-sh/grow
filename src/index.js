// grow.flisk.si: paste a link, get a plan to find the first customers. No sign-in. Plans are kept 30 days at /p/<id>.
import { TWEAKS, cleanBrief, cleanLinks, genericFollowers, githubRepo, httpUrl, makePlan, profileOf, rankerFor, rewriteItem, soonNetwork, workersAi } from './plan.js';
import { feedback } from './feedback.js';
import { EXAMPLE } from './example.js';
import { page } from './page.js';
import { LANGS, SITE, splitLang } from './i18n.js';
import { nextAsset, nextPage } from './next.js';
import { cabinet } from './cabinet.js';
import { clicks } from './clicks.js';
import { withSecurityHeaders } from './security-headers.js';
import { TOUCH_ICON_PNG } from './touch-icon.js';
import { sendTrace, traced } from './trace.js';

const DAY_MS = 864e5;
// Static crawler files: a day of browser/CDN caching saves a Worker invocation on every crawl.
const STATIC_CACHE = 'public, max-age=86400';
const json = (status, body, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*', ...extra } });
const html = (body, extra = {}) => new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://flisk.si https://flisk.sh; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://flisk.si; font-src https://fonts.gstatic.com; img-src 'self' data: https://flisk.si https://ranker.flisk.si; connect-src 'self' https://flisk.si https://*.flisk.si https://flisk.sh; frame-ancestors https://analytics.flisk.si", ...extra } });
// The Astryx page serves its own script, styles and fonts, so font-src allows 'self'.
const nextHtml = (body) => html(body, { 'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://flisk.si https://flisk.sh; style-src 'self' 'unsafe-inline' https://flisk.si https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://flisk.si https://ranker.flisk.si; connect-src 'self' https://flisk.si https://*.flisk.si https://flisk.sh; frame-ancestors https://analytics.flisk.si" });
const today = () => new Date().toISOString().slice(0, 10);
const newId = () => [...crypto.getRandomValues(new Uint8Array(6))].map((b) => b.toString(16).padStart(2, '0')).join('');

const homeUrl = (l) => SITE + (l === 'en' ? '/' : `/${l}/`);
// Each language home lists every language, so search engines pair the translations.
const SITEMAP = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'
  + LANGS.map((l) => `<url><loc>${homeUrl(l)}</loc>${LANGS.map((a) => `<xhtml:link rel="alternate" hreflang="${a}" href="${homeUrl(a)}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/"/></url>`).join('')
  + '</urlset>';
const ROBOTS = 'User-agent: *\nAllow: /$\nAllow: /lv/$\nAllow: /llms.txt\nDisallow: /p/\nDisallow: /lv/p/\nDisallow: /me\nDisallow: /auth/\nDisallow: /api/\nDisallow: /*?\n\nSitemap: https://grow.flisk.si/sitemap.xml\n';
const SECURITY_TXT = `Contact: https://github.com/flisk-sh/grow/security/advisories/new
Expires: 2027-06-01T00:00:00Z
Preferred-Languages: en
Canonical: https://grow.flisk.si/.well-known/security.txt
`;
const LLMS = `# Flisk Grow

> Paste a link to something you made and get a plan to find its first customers: who would buy it, where they are,
> 5 email drafts, 3 post drafts, whether AI search can read the page, and where to list it. Free, no sign-in.
> Nothing is sent for you.

- [Home](https://grow.flisk.si/)
- API: POST https://grow.flisk.si/api/plan with {"url": "https://..."} answers {"id", "plan"}; GET /api/plan/<id> reads a saved plan.
- Saved plans live at https://grow.flisk.si/p/<id> for 30 days.
`;
const ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#0b0b0d"/><path d="M14 46 L28 32 L36 40 L50 22" fill="none" stroke="#22c55e" stroke-width="6" stroke-linecap="square"/><path d="M40 20 H52 V32" fill="none" stroke="#22c55e" stroke-width="6" stroke-linecap="square"/></svg>';

// Per-visitor limit kept in the Cache API (free, no writes counted). Not exact under races, which is fine for a guard.
async function visitorCount(ip, add, cache) {
  if (!cache) return 0;
  const key = new Request(`https://grow.flisk.si/__ip/${encodeURIComponent(ip)}/${today()}`);
  const hit = await cache.match(key);
  const n = hit ? Number(await hit.text()) || 0 : 0;
  if (add) await cache.put(key, new Response(String(n + 1), { headers: { 'cache-control': 'max-age=86400' } }));
  return n;
}

// The model: Workers AI when bound (fast), else inference.flisk.si through its service binding.
function modelFor(env, fetchImpl) {
  const inference = env.INFERENCE_KEY ? (env.INFERENCE ? (u, init) => env.INFERENCE.fetch(u, init) : fetchImpl) : null;
  return env.AI ? workersAi(env.AI, inference) : inference;
}

async function route(req, env, deps = {}) {
  const url = new URL(req.url);
  // /p/<id>/ is the same plan as /p/<id>.
  const path = /^\/(lv\/)?p\/[^/]+\/+$/.test(url.pathname) ? url.pathname.replace(/\/+$/, '') : url.pathname;
  const fetchImpl = deps.fetch || fetch;
  const cache = deps.cache === undefined ? globalThis.caches?.default : deps.cache;

  if (req.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST', 'access-control-allow-headers': 'content-type' } });
  if (path === '/robots.txt') return new Response(ROBOTS, { headers: { 'content-type': 'text/plain', 'cache-control': STATIC_CACHE } });
  if (path === '/.well-known/security.txt') return new Response(SECURITY_TXT, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' } });
  if (path === '/sitemap.xml') return new Response(SITEMAP, { headers: { 'content-type': 'application/xml', 'cache-control': STATIC_CACHE } });
  if (path === '/llms.txt') return new Response(LLMS, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
  if (path === '/icon.svg' || path === '/favicon.ico') return new Response(ICON, { headers: { 'content-type': 'image/svg+xml', 'cache-control': 'max-age=86400' } });
  if (path === '/apple-touch-icon.png') return new Response(TOUCH_ICON_PNG, { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' } });
  if (path === '/health') return json(200, { ok: true });
  // A company's logo, fetched once and cached, so visitors' browsers only talk to grow.flisk.si.
  const lm = /^\/logo\/([a-z0-9.-]{3,80})$/.exec(path);
  if (lm) {
    const hit = cache && await cache.match(req);
    if (hit) return hit;
    const r = await fetchImpl(`https://icons.duckduckgo.com/ip3/${lm[1]}.ico`, { signal: AbortSignal.timeout(4000) }).catch(() => null);
    const res = new Response(r?.ok ? r.body : ICON, { headers: { 'content-type': r?.ok ? (r.headers.get('content-type') || 'image/x-icon') : 'image/svg+xml', 'cache-control': 'public, max-age=604800' } });
    if (cache && r?.ok) await cache.put(req, res.clone());
    return res;
  }
  const ck = await clicks(req, env); if (ck) return ck;
  const fb = await feedback(req, env); if (fb) return fb;
  const cab = await cabinet(req, env, { fetch: fetchImpl });
  if (cab) return cab;

  // The old /next preview now lives at /: send old links to the same page there.
  if (req.method === 'GET' || req.method === 'HEAD') {
    const old = /^\/next(\/example|\/p\/[0-9a-f]{12})?$/.exec(path);
    if (old) return new Response(null, { status: 301, headers: { location: (old[1] || '/') + url.search } });
  }

  // /lv -> /lv/ so each language home has one address.
  if ((req.method === 'GET' || req.method === 'HEAD') && LANGS.some((l) => l !== 'en' && path === '/' + l)) return new Response(null, { status: 301, headers: { location: path + '/' + url.search } });

  // The Astryx look: /, /example and /p/<id> (the built files live at /_app/).
  if (req.method === 'GET' || req.method === 'HEAD') {
    const asset = path.startsWith('/_app/') ? nextAsset(path) : null;
    if (asset) return asset;
    // A language lives under its own prefix (/lv/, /lv/example, /lv/p/<id>); English stays at the root.
    const { lang, path: lp } = splitLang(path);
    if (lp === '/example') return nextHtml(nextPage({ planId: 'example', share: { host: lang === 'lv' ? 'piemērs' : 'an example', summary: EXAMPLE.product }, index: false, lang }));
    if (lp === '/') {
      // A link with ?url= only fills the box: a plan costs a model call, so a person presses the button.
      return nextHtml(nextPage({ prefill: httpUrl(url.searchParams.get('url')), index: !url.search, lang }));
    }
    const np = /^\/p\/([0-9a-f]{12})$/.exec(lp);
    if (np) {
      const row = await env.DB.prepare('SELECT url, data, created FROM plans WHERE id = ?').bind(np[1]).first();
      let share = null;
      if (row && Date.now() - row.created <= 30 * DAY_MS) {
        let h = row.url; try { h = new URL(row.url).host; } catch { /* keep the link */ }
        let summary = ''; try { const d = JSON.parse(row.data); summary = String(d.product || d.account || '').slice(0, 200); } catch { /* no summary */ }
        share = { host: h, summary };
      }
      return nextHtml(nextPage({ planId: np[1], share, index: false, lang }));
    }
    // Any other /p/ address: the home page with a 404 status, not bare text.
    if (/^\/p\/[^/]+$/.test(lp)) {
      const r = nextHtml(nextPage({ prefill: '', index: false, lang }));
      return new Response(r.body, { status: 404, headers: { ...Object.fromEntries(r.headers), 'x-robots-tag': 'noindex, nofollow' } });
    }
  }

  if (req.method === 'GET' && path === '/api/plan/example') return json(200, { id: 'example', created: 0, plan: EXAMPLE });

  // The previous design, kept at /classic (never indexed) while the new one beds in.
  if (req.method === 'GET' || req.method === 'HEAD') {
    if (path === '/classic/example') return html(page({ planId: 'example', share: { host: 'an example', summary: EXAMPLE.product } }), { 'x-robots-tag': 'noindex, nofollow' });
    const cm = /^\/classic(?:\/p\/([0-9a-f]{12}))?$/.exec(path);
    if (cm) {
      const planId = cm[1] || '';
      let share = null;
      if (planId) {
        const row = await env.DB.prepare('SELECT url, data, created FROM plans WHERE id = ?').bind(planId).first();
        if (row && Date.now() - row.created <= 30 * DAY_MS) {
          let host = row.url; try { host = new URL(row.url).host; } catch { /* keep the link */ }
          let summary = ''; try { const d = JSON.parse(row.data); summary = String(d.product || d.account || '').slice(0, 200); } catch { /* no summary */ }
          share = { host, summary };
        }
      }
      return html(page({ planId, share, prefill: httpUrl(url.searchParams.get('url')) }), { 'x-robots-tag': 'noindex, nofollow' });
    }
  }

  const m = /^\/api\/plan\/([0-9a-f]{12})$/.exec(path);
  if (req.method === 'GET' && m) {
    const row = await env.DB.prepare('SELECT data, created FROM plans WHERE id = ?').bind(m[1]).first();
    if (!row || Date.now() - row.created > 30 * DAY_MS) return json(404, { error: 'This plan is not here. Plans are kept 30 days.' });
    return json(200, { id: m[1], created: row.created, plan: JSON.parse(row.data) });
  }

  // The path exists but takes only POST. Tell callers with a wrong method
  // apart from a path that does not exist at all.
  if (path === '/api/plan' && req.method !== 'POST')
    return json(405, { error: 'Send a POST to /api/plan with {"url": "https://..."}' }, { allow: 'POST' });

  if (req.method === 'POST' && path === '/api/plan') {
    let body;
    try { body = await req.json(); } catch { return json(400, { error: 'Send JSON: {"url": "https://..."}' }); }
    const link = httpUrl(body?.url);
    if (!link) return json(400, { error: 'Paste a full link that starts with https://' });
    const soon = soonNetwork(link);
    if (soon) return json(422, { error: `${soon} profile plans are coming soon. For now paste an X, Bluesky or Instagram profile, or the link to a site you built.`, soon });

    const about = String(body?.about ?? '').replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, 300);
    // The same link within a day gets the plan already made: no second model call (unless the owner added a line).
    // A saved general guide is never reused: pressing again should try for a plan written for the page.
    // Extra links (GitHub, X, docs ...) from the links bar: they make a new plan that reads them too.
    const links = profileOf(link) ? [] : cleanLinks(body?.links, link);
    // Who it is for, the price, the maker's name: asked before the plan, each optional.
    const brief = profileOf(link) ? null : cleanBrief(body?.brief);
    const known = about || links.length || brief ? null : await env.DB.prepare("SELECT id, data, created FROM plans WHERE url = ? AND created > ? AND data NOT LIKE '%\"generic\":true%' ORDER BY created DESC LIMIT 1").bind(link, Date.now() - DAY_MS).first();
    if (known) return json(200, { id: known.id, created: known.created, plan: JSON.parse(known.data), reused: true });

    const perVisitor = Number(env.PLANS_PER_VISITOR) || 3;
    const perDay = Number(env.PLANS_PER_DAY) || 20;
    const ip = req.headers.get('cf-connecting-ip') || 'local';
    if (await visitorCount(ip, false, cache) >= perVisitor) return json(429, { error: `You made ${perVisitor} plans today, the free limit. Come back tomorrow (00:00 UTC).` });
    const used = (await env.DB.prepare('SELECT n FROM days WHERE day = ?').bind(today()).first())?.n ?? 0;
    if (used >= perDay) return json(429, { error: `Today's ${perDay} free plans are made. Come back tomorrow (00:00 UTC).` });
    if (!env.INFERENCE_KEY && !env.AI) return json(503, { error: 'The model is not set up on this server yet.' });

    const model = modelFor(env, fetchImpl);
    const citable = env.CITABLE ? (u, init) => env.CITABLE.fetch(u, init) : fetchImpl;
    const ranker = env.RANKER ? (u, init) => env.RANKER.fetch(u, init) : fetchImpl;
    // Every plan shown gets an id and a /p/<id> link to share, the general guide too. Only model-written plans count toward the day's limit.
    const keep = async (plan) => {
      const id = newId(), created = Date.now();
      try { await env.DB.prepare('INSERT INTO plans (id, url, data, created) VALUES (?, ?, ?, ?)').bind(id, link, JSON.stringify(plan), created).run(); } catch { return { plan }; }
      return { id, created, plan };
    };
    const [out, rank] = await Promise.all([makePlan(link, { fetch: fetchImpl, model, citable, key: env.INFERENCE_KEY, about, links, brief }), rankerFor(githubRepo(link) ? link : links.find(githubRepo) || link, ranker)]);
    if (rank) for (const x of [out.plan, out.fallback]) if (x) x.ranker = rank;
    if (out.error === 'timeout' && profileOf(link)) return json(200, { ...(await keep({ url: link, ...genericFollowers(profileOf(link), about), tools: [] })), generic: true, slow: true });
    if (out.error === 'timeout' && out.fallback) return json(200, { ...(await keep(out.fallback)), generic: true, slow: true });
    if (out.error === 'timeout') return json(504, { error: 'The model took too long to answer. Press the button again in a minute.' });
    if (out.error === 'busy') await sendTrace(env, { route: '/api/plan', kind: 'capped', why: 'the model budget is used up: served the general playbook', status: 200, expected: 'model', actual: 'playbook' });
    if (out.error === 'busy' && profileOf(link)) return json(200, { ...(await keep({ url: link, ...genericFollowers(profileOf(link), about), tools: [] })), generic: true });
    if (out.error === 'busy' && out.fallback) return json(200, { ...(await keep(out.fallback)), generic: true });
    if (out.error === 'busy') return json(429, { error: 'The free model is out of its daily budget. Come back tomorrow (00:00 UTC).' });
    if (out.error) return json(502, { error: 'The model did not give a usable plan. Press the button again.', detail: out.message });

    const id = newId(), created = Date.now();
    await env.DB.batch([
      env.DB.prepare('INSERT INTO plans (id, url, data, created) VALUES (?, ?, ?, ?)').bind(id, link, JSON.stringify(out.plan), created),
      env.DB.prepare('INSERT INTO days (day, n) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET n = n + 1').bind(today()),
    ]);
    await visitorCount(ip, true, cache);
    return json(200, { id, created, plan: out.plan });
  }

  // Rewrite one email, post or place of a saved plan; the rest of the plan stays. A small model call, so it has
  // its own limits: per visitor a day, and for the whole site a day.
  if (req.method === 'POST' && path === '/api/rewrite') {
    let b; try { b = await req.json(); } catch { return json(400, { error: 'Send JSON' }); }
    const id = String(b?.id || ''), kind = String(b?.kind || ''), index = Number(b?.index);
    if (!/^[0-9a-f]{12}$/.test(id) || !['email', 'post', 'place'].includes(kind) || !Number.isInteger(index) || index < 0 || index > 9) return json(400, { error: 'id, kind (email, post or place) and index are needed' });
    const row = await env.DB.prepare('SELECT data, created FROM plans WHERE id = ?').bind(id).first();
    if (!row || Date.now() - row.created > 30 * DAY_MS) return json(404, { error: 'This plan is not here. Plans are kept 30 days.' });
    const plan = JSON.parse(row.data);
    if (plan.generic) return json(400, { error: 'This is the general guide. Make a plan for your link first.' });
    const ip = req.headers.get('cf-connecting-ip') || 'local';
    const perVisitor = Number(env.REWRITES_PER_VISITOR) || 20, perDay = Number(env.REWRITES_PER_DAY) || 300;
    if (await visitorCount('rw:' + ip, false, cache) >= perVisitor) return json(429, { error: `You rewrote ${perVisitor} items today, the free limit. Come back tomorrow (00:00 UTC).` });
    const used = (await env.DB.prepare('SELECT n FROM days WHERE day = ?').bind('rw:' + today()).first())?.n ?? 0;
    if (used >= perDay) return json(429, { error: "Today's free rewrites are used. Come back tomorrow (00:00 UTC)." });
    const model = modelFor(env, fetchImpl);
    if (!model) return json(503, { error: 'The model is not set up on this server yet.' });
    const tweak = b?.tweak ? (Object.hasOwn(TWEAKS, b.tweak) ? TWEAKS[b.tweak] : null) : String(b?.note ?? '').replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, 120);
    if (tweak === null) return json(400, { error: 'Unknown change. Pick one from the list.' });
    const out = await rewriteItem(plan, kind, index, { model, key: env.INFERENCE_KEY, note: b?.note, tweak });
    if (out.error) return json(502, { error: 'The model did not give a usable rewrite. Press again.', detail: out.message });
    const field = { email: 'emails', post: 'posts', place: 'places' }[kind];
    plan[field][index] = out.item;
    await env.DB.batch([
      env.DB.prepare('UPDATE plans SET data = ? WHERE id = ?').bind(JSON.stringify(plan), id),
      env.DB.prepare('INSERT INTO days (day, n) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET n = n + 1').bind('rw:' + today()),
    ]);
    await visitorCount('rw:' + ip, true, cache);
    return json(200, { item: out.item, plan });
  }

  if (path.startsWith('/api/')) return json(404, { error: 'not found' });
  return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } });
}

// Every response, whatever route made it, leaves with the baseline security headers.
export async function handle(req, env, deps = {}) {
  return withSecurityHeaders(await route(req, env, deps));
}

export default {
  fetch: traced((req, env) => handle(req, env)),
  // Daily: drop plans older than 30 days and old day counters.
  async scheduled(_e, env) {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM plans WHERE created < ?').bind(Date.now() - 30 * DAY_MS),
      env.DB.prepare('DELETE FROM days WHERE substr(day, -10) < ?').bind(new Date(Date.now() - 30 * DAY_MS).toISOString().slice(0, 10)),
      env.DB.prepare('DELETE FROM feedback WHERE day < ?').bind(new Date(Date.now() - 365 * DAY_MS).toISOString().slice(0, 10)),
    ]);
  },
};
