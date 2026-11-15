// grow.flisk.si: paste a link, get a plan to find the first customers. No sign-in. Plans are kept 30 days at /p/<id>.
import { httpUrl, makePlan } from './plan.js';
import { page } from './page.js';
import { cabinet } from './cabinet.js';

const DAY_MS = 864e5;
const json = (status, body, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*', ...extra } });
const html = (body, extra = {}) => new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://flisk.si https://flisk.sh; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://flisk.si; font-src https://fonts.gstatic.com; img-src 'self' data: https://flisk.si; connect-src 'self' https://flisk.si https://*.flisk.si https://flisk.sh; frame-ancestors 'none'", ...extra } });
const today = () => new Date().toISOString().slice(0, 10);
const newId = () => [...crypto.getRandomValues(new Uint8Array(6))].map((b) => b.toString(16).padStart(2, '0')).join('');

const ROBOTS = 'User-agent: *\nAllow: /$\nAllow: /llms.txt\nDisallow: /p/\nDisallow: /me\nDisallow: /auth/\nDisallow: /api/\nDisallow: /*?\n';
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

export async function handle(req, env, deps = {}) {
  const url = new URL(req.url);
  const path = url.pathname;
  const fetchImpl = deps.fetch || fetch;
  const cache = deps.cache === undefined ? globalThis.caches?.default : deps.cache;

  if (req.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST', 'access-control-allow-headers': 'content-type' } });
  if (path === '/robots.txt') return new Response(ROBOTS, { headers: { 'content-type': 'text/plain' } });
  if (path === '/llms.txt') return new Response(LLMS, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
  if (path === '/icon.svg' || path === '/favicon.ico') return new Response(ICON, { headers: { 'content-type': 'image/svg+xml', 'cache-control': 'max-age=86400' } });
  if (path === '/health') return json(200, { ok: true });
  // A company's logo, fetched once and cached, so visitors' browsers only talk to grow.flisk.si.
  const lm = /^\/logo\/([a-z0-9.-]{3,80})$/.exec(path);
  if (lm) {
    const hit = cache && await cache.match(req);
    if (hit) return hit;
    const r = await fetchImpl(`https://icons.duckduckgo.com/ip3/${lm[1]}.ico`).catch(() => null);
    const res = new Response(r?.ok ? r.body : ICON, { headers: { 'content-type': r?.ok ? (r.headers.get('content-type') || 'image/x-icon') : 'image/svg+xml', 'cache-control': 'public, max-age=604800' } });
    if (cache && r?.ok) await cache.put(req, res.clone());
    return res;
  }
  const cab = await cabinet(req, env, { fetch: fetchImpl });
  if (cab) return cab;

  if (req.method === 'GET' && (path === '/' || /^\/p\/[0-9a-f]{12}$/.test(path))) {
    // A link with ?url= only fills the box: a plan costs a model call, so a person presses the button.
    return html(page({ planId: path.startsWith('/p/') ? path.slice(3) : '', prefill: httpUrl(url.searchParams.get('url')) }), path === '/' && !url.search ? {} : { 'x-robots-tag': 'noindex, nofollow' });
  }

  const m = /^\/api\/plan\/([0-9a-f]{12})$/.exec(path);
  if (req.method === 'GET' && m) {
    const row = await env.DB.prepare('SELECT data, created FROM plans WHERE id = ?').bind(m[1]).first();
    if (!row || Date.now() - row.created > 30 * DAY_MS) return json(404, { error: 'This plan is not here. Plans are kept 30 days.' });
    return json(200, { id: m[1], created: row.created, plan: JSON.parse(row.data) });
  }

  if (req.method === 'POST' && path === '/api/plan') {
    let body;
    try { body = await req.json(); } catch { return json(400, { error: 'Send JSON: {"url": "https://..."}' }); }
    const link = httpUrl(body?.url);
    if (!link) return json(400, { error: 'Paste a full link that starts with https://' });

    // The same link within a day gets the plan already made: no second model call.
    const known = await env.DB.prepare('SELECT id, data, created FROM plans WHERE url = ? AND created > ? ORDER BY created DESC LIMIT 1').bind(link, Date.now() - DAY_MS).first();
    if (known) return json(200, { id: known.id, created: known.created, plan: JSON.parse(known.data), reused: true });

    const perVisitor = Number(env.PLANS_PER_VISITOR) || 3;
    const perDay = Number(env.PLANS_PER_DAY) || 20;
    const ip = req.headers.get('cf-connecting-ip') || 'local';
    if (await visitorCount(ip, false, cache) >= perVisitor) return json(429, { error: `You made ${perVisitor} plans today, the free limit. Come back tomorrow (00:00 UTC).` });
    const used = (await env.DB.prepare('SELECT n FROM days WHERE day = ?').bind(today()).first())?.n ?? 0;
    if (used >= perDay) return json(429, { error: `Today's ${perDay} free plans are made. Come back tomorrow (00:00 UTC).` });
    if (!env.INFERENCE_KEY) return json(503, { error: 'The model is not set up on this server yet.' });

    const model = env.INFERENCE ? (u, init) => env.INFERENCE.fetch(u, init) : fetchImpl;
    const citable = env.CITABLE ? (u, init) => env.CITABLE.fetch(u, init) : fetchImpl;
    const out = await makePlan(link, { fetch: fetchImpl, model, citable, key: env.INFERENCE_KEY });
    if (out.error === 'timeout') return json(504, { error: 'The model took too long to answer. Press the button again in a minute.' });
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

  if (path.startsWith('/api/')) return json(404, { error: 'not found' });
  return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } });
}

export default {
  fetch: (req, env) => handle(req, env),
  // Daily: drop plans older than 30 days and old day counters.
  async scheduled(_e, env) {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM plans WHERE created < ?').bind(Date.now() - 30 * DAY_MS),
      env.DB.prepare('DELETE FROM days WHERE day < ?').bind(new Date(Date.now() - 30 * DAY_MS).toISOString().slice(0, 10)),
    ]);
  },
};
