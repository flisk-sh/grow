// The cabinet at /me: your sites, the people talking about the problem each one solves (social listening), and where
// you listed it. A visitor gets a cabinet in this browser at once (signed cookie); GitHub sign-in keeps it across
// browsers and moves the browser's sites into the account. Nothing is posted or sent for anyone.
import { httpUrl, LISTINGS } from './plan.js';
import { listen, mentions, notOwn, parseKeywords, redditSearch } from './listen.js';
import { CSS } from './page.js';
import { findListings } from './found.js';

const COOKIE = 'grow_s';
const YEAR = 365 * 864e5;
const LISTEN_EVERY_MS = 10 * 60e3;
const MAX_SITES = 10;
const MAX_LEADS = 300;
const STATUSES = ['new', 'replied', 'skip'];
const LIST_STATUSES = ['todo', 'submitted', 'live'];
const rand = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function sign(secret, value) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}
const cookieOf = (req, name) => (req.headers.get('cookie') || '').split(/;\s*/).find((c) => c.startsWith(name + '='))?.slice(name.length + 1) || '';
const setCookie = (name, v, maxAge) => `${name}=${v}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

export async function userId(req, env) {
  const [id, mac] = decodeURIComponent(cookieOf(req, COOKIE)).split('.');
  if (!id || !mac || !env.SESSION_SECRET) return '';
  return mac === await sign(env.SESSION_SECRET, id) ? id : '';
}
async function sessionCookie(env, id) { return setCookie(COOKIE, encodeURIComponent(`${id}.${await sign(env.SESSION_SECRET, id)}`), YEAR / 1000); }

const json = (status, body, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });
const signInReady = (env) => Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);

async function siteOf(env, uid, id) {
  return uid ? env.DB.prepare('SELECT * FROM sites WHERE id = ? AND user_id = ?').bind(id, uid).first() : null;
}

// Search phrases for a new site: the plan's, else words from the host name.
async function keywordsFor(env, url) {
  const row = await env.DB.prepare('SELECT data FROM plans WHERE url = ? ORDER BY created DESC LIMIT 1').bind(url).first();
  const plan = row ? JSON.parse(row.data) : null;
  if (plan?.queries?.length) return { keywords: plan.queries.join(', '), plan };
  const name = new URL(url).hostname.replace(/^www\./, '').split('.')[0].replace(/[-_]/g, ' ');
  return { keywords: name, plan };
}

// Routes under /me, /auth and /api/me|sites|leads|listings. Returns null when the path is not the cabinet's.
export async function cabinet(req, env, deps = {}) {
  const url = new URL(req.url);
  const path = url.pathname;
  const fetchImpl = deps.fetch || fetch;
  const origin = env.PUBLIC_ORIGIN || url.origin;

  if (req.method === 'GET' && path === '/me') {
    const headers = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://flisk.si https://flisk.sh; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://flisk.si; font-src https://fonts.gstatic.com; img-src 'self' data: https://flisk.si; connect-src 'self' https://flisk.si https://*.flisk.si; frame-ancestors 'none'" };
    if (env.SESSION_SECRET && !(await userId(req, env))) headers['set-cookie'] = await sessionCookie(env, 'a_' + rand(8));
    return new Response(cabinetPage(), { headers });
  }

  // GitHub sign-in (an OAuth app with callback <origin>/auth/callback).
  if (path === '/auth/start') {
    if (!signInReady(env)) return json(503, { error: 'GitHub sign-in is not set up yet.' });
    const state = rand(12);
    const u = new URL('https://github.com/login/oauth/authorize');
    u.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
    u.searchParams.set('redirect_uri', `${origin}/auth/callback`);
    u.searchParams.set('scope', '');
    u.searchParams.set('state', state);
    return new Response(null, { status: 302, headers: { location: u.href, 'set-cookie': setCookie('grow_state', state, 600) } });
  }
  if (path === '/auth/callback') {
    const code = url.searchParams.get('code');
    if (!signInReady(env) || !code || url.searchParams.get('state') !== cookieOf(req, 'grow_state')) return new Response(null, { status: 302, headers: { location: '/me?signin=failed' } });
    const tok = await fetchImpl('https://github.com/login/oauth/access_token', { method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' }, body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: `${origin}/auth/callback` }) }).then((r) => r.json()).catch(() => null);
    const gh = tok?.access_token ? await fetchImpl('https://api.github.com/user', { headers: { authorization: `Bearer ${tok.access_token}`, 'user-agent': 'flisk-grow', accept: 'application/vnd.github+json' } }).then((r) => (r.ok ? r.json() : null)).catch(() => null) : null;
    if (!gh?.id) return new Response(null, { status: 302, headers: { location: '/me?signin=failed' } });
    const id = `gh_${gh.id}`;
    const before = await userId(req, env);
    const stmts = [env.DB.prepare('INSERT INTO users (id, login, created) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET login = excluded.login').bind(id, String(gh.login).slice(0, 60), Date.now())];
    // The sites made in this browser before sign-in move into the account.
    if (before.startsWith('a_')) stmts.push(env.DB.prepare('UPDATE sites SET user_id = ? WHERE user_id = ?').bind(id, before));
    await env.DB.batch(stmts);
    const h = new Headers({ location: '/me' });
    h.append('set-cookie', await sessionCookie(env, id));
    h.append('set-cookie', setCookie('grow_state', '', 0));
    return new Response(null, { status: 302, headers: h });
  }
  if (path === '/auth/out') {
    return new Response(null, { status: 302, headers: { location: '/me', 'set-cookie': setCookie(COOKIE, '', 0) } });
  }

  if (!/^\/api\/(me|sites|leads|listings)(\/|$)/.test(path)) return null;
  if (!env.SESSION_SECRET) return json(503, { error: 'The cabinet is not set up on this server yet.' });
  // Writes come only from this site's own page.
  if (req.method !== 'GET' && req.headers.get('origin') && req.headers.get('origin') !== url.origin) return json(403, { error: 'Not allowed from another site.' });
  const uid = await userId(req, env);
  if (!uid) return json(401, { error: 'Open grow.flisk.si/me to start your cabinet.' });
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

  if (req.method === 'GET' && path === '/api/me') {
    const user = uid.startsWith('gh_') ? await env.DB.prepare('SELECT login FROM users WHERE id = ?').bind(uid).first() : null;
    const { results: sites } = await env.DB.prepare(`SELECT s.id, s.url, s.keywords, s.plan_id, s.listened, s.created,
      (SELECT COUNT(*) FROM leads l WHERE l.site_id = s.id AND l.status = 'new') AS new_leads,
      (SELECT COUNT(*) FROM listings x WHERE x.site_id = s.id AND x.status != 'todo') AS listed
      FROM sites s WHERE s.user_id = ? ORDER BY s.created DESC`).bind(uid).all();
    return json(200, { user: user ? { login: user.login } : null, signIn: signInReady(env), sites, listings: LISTINGS.map((l) => ({ name: l.name, url: l.url, why: l.why })) });
  }

  if (req.method === 'POST' && path === '/api/sites') {
    const link = httpUrl(body.url);
    if (!link) return json(400, { error: 'Paste a full link that starts with https://' });
    const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM sites WHERE user_id = ?').bind(uid).first();
    const have = await env.DB.prepare('SELECT id FROM sites WHERE user_id = ? AND url = ?').bind(uid, link).first();
    if (have) return json(200, { id: have.id, existed: true });
    if (n >= MAX_SITES) return json(400, { error: `A cabinet holds ${MAX_SITES} sites. Remove one first.` });
    const { keywords } = await keywordsFor(env, link);
    const planId = /^[0-9a-f]{12}$/.test(body.plan || '') ? body.plan : (await env.DB.prepare('SELECT id FROM plans WHERE url = ? ORDER BY created DESC LIMIT 1').bind(link).first())?.id || null;
    const id = rand(6);
    await env.DB.prepare('INSERT INTO sites (id, user_id, url, keywords, plan_id, listened, created) VALUES (?, ?, ?, ?, ?, 0, ?)').bind(id, uid, link, keywords, planId, Date.now()).run();
    return json(200, { id });
  }

  const sm = /^\/api\/sites\/([0-9a-f]{12})(?:\/(leads|listen|delete|keywords))?$/.exec(path);
  if (sm) {
    const site = await siteOf(env, uid, sm[1]);
    if (!site) return json(404, { error: 'This site is not in your cabinet.' });
    const action = sm[2];
    if (req.method === 'POST' && action === 'delete') {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM leads WHERE site_id = ?').bind(site.id),
        env.DB.prepare('DELETE FROM listings WHERE site_id = ?').bind(site.id),
        env.DB.prepare('DELETE FROM sites WHERE id = ?').bind(site.id),
      ]);
      return json(200, { ok: true });
    }
    if (req.method === 'POST' && action === 'keywords') {
      const k = parseKeywords(body.keywords);
      if (!k.length) return json(400, { error: 'Write at least one phrase of 3 letters or more.' });
      await env.DB.prepare('UPDATE sites SET keywords = ?, listened = 0 WHERE id = ?').bind(k.join(', '), site.id).run();
      return json(200, { keywords: k.join(', ') });
    }
    if (req.method === 'POST' && action === 'listen') {
      const wait = site.listened + LISTEN_EVERY_MS - Date.now();
      let added = 0;
      if (wait <= 0) {
        const me = uid.startsWith('gh_') ? await env.DB.prepare('SELECT login FROM users WHERE id = ?').bind(uid).first() : null;
        const name = (() => { try { return new URL(site.url).hostname.replace(/^www\./, '').split('.')[0]; } catch { return ''; } })();
        const [found, listed] = await Promise.all([
          listen(parseKeywords(site.keywords), { fetch: fetchImpl, exclude: { authors: [me?.login], owners: [name, me?.login] } }),
          findListings(site.url, { fetch: fetchImpl }),
        ]);
        // A listing found on its own becomes Live, unless you already set it yourself.
        if (listed.length) await env.DB.batch(listed.map((l) => env.DB.prepare("INSERT INTO listings (site_id, place, status, link, updated) VALUES (?, ?, 'live', ?, ?) ON CONFLICT(site_id, place) DO UPDATE SET status = 'live', link = excluded.link, updated = excluded.updated WHERE listings.status = 'todo' OR listings.link IS NULL OR listings.link = ''")
          .bind(site.id, l.place, l.link, Date.now())));
        // Drop earlier unanswered leads that the stricter match would not keep.
        const { results: old } = await env.DB.prepare("SELECT url, source, title, text, author FROM leads WHERE site_id = ? AND status = 'new'").bind(site.id).all();
        const kws = parseKeywords(site.keywords), ex = { authors: [me?.login], owners: [name, me?.login] };
        const stale = (old || []).filter((l) => !mentions(l, kws) || !notOwn(l, ex));
        const stmts = stale.map((l) => env.DB.prepare('DELETE FROM leads WHERE site_id = ? AND url = ?').bind(site.id, l.url));
        stmts.push(...found.map((l) => env.DB.prepare('INSERT OR IGNORE INTO leads (site_id, url, source, title, text, author, author_url, at, status, found) VALUES (?, ?, ?, ?, ?, ?, ?, ?, \'new\', ?)')
          .bind(site.id, l.url, l.source, l.title, l.text, l.author, l.author_url, l.at, Date.now())));
        stmts.push(env.DB.prepare('UPDATE sites SET listened = ? WHERE id = ?').bind(Date.now(), site.id));
        const res = await env.DB.batch(stmts);
        added = res.slice(stale.length, -1).reduce((s, r) => s + (r?.meta?.changes || 0), 0);
        // Keep the newest leads only.
        await env.DB.prepare('DELETE FROM leads WHERE site_id = ? AND url NOT IN (SELECT url FROM leads WHERE site_id = ? ORDER BY at DESC LIMIT ?)').bind(site.id, site.id, MAX_LEADS).run();
      }
      return json(200, { added, next: Math.max(0, Math.ceil(wait / 60e3)) });
    }
    if (req.method === 'GET' && action === 'leads') {
      const { results: leads } = await env.DB.prepare('SELECT url, source, title, text, author, author_url, at, status FROM leads WHERE site_id = ? ORDER BY at DESC LIMIT ?').bind(site.id, MAX_LEADS).all();
      const { results: listings } = await env.DB.prepare('SELECT place, status, link, updated FROM listings WHERE site_id = ?').bind(site.id).all();
      return json(200, { site, leads, listings, reddit: redditSearch(parseKeywords(site.keywords)) });
    }
  }

  if (req.method === 'POST' && path === '/api/leads') {
    const site = await siteOf(env, uid, String(body.site || ''));
    if (!site || !STATUSES.includes(body.status)) return json(400, { error: 'Unknown site or status.' });
    await env.DB.prepare('UPDATE leads SET status = ? WHERE site_id = ? AND url = ?').bind(body.status, site.id, String(body.url || '')).run();
    return json(200, { ok: true });
  }

  if (req.method === 'POST' && path === '/api/listings') {
    const site = await siteOf(env, uid, String(body.site || ''));
    const place = LISTINGS.find((l) => l.name === body.place)?.name;
    if (!site || !place || !LIST_STATUSES.includes(body.status)) return json(400, { error: 'Unknown site, place or status.' });
    const link = body.link ? httpUrl(body.link) : '';
    await env.DB.prepare('INSERT INTO listings (site_id, place, status, link, updated) VALUES (?, ?, ?, ?, ?) ON CONFLICT(site_id, place) DO UPDATE SET status = excluded.status, link = excluded.link, updated = excluded.updated')
      .bind(site.id, place, body.status, link, Date.now()).run();
    return json(200, { ok: true });
  }

  return json(404, { error: 'not found' });
}

const CAB_CSS = String.raw`
.tabs{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 18px}.tabs .btn.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}.tabs .btn b{font-weight:600;color:var(--acctext);margin-left:4px}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.row input{flex:1;min-width:200px;height:40px;padding:0 12px;border:1px solid var(--line2);background:var(--panel);font:13px var(--mono)}
.leads{border-top:1px solid var(--line2)}.lead{display:grid;grid-template-columns:120px 1fr auto;gap:14px;padding:14px 0;border-bottom:1px solid var(--line)}
.lead .src{font:600 10.5px var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--faint)}.lead .src small{display:block;font-weight:500;text-transform:none;letter-spacing:0;margin-top:4px}
.lead h3{font-size:15px;margin:0 0 4px}.lead p{margin:0;color:var(--mut);font-size:14px;overflow-wrap:anywhere}.lead .who{font:500 12px var(--mono);margin-top:6px}
.lead.done{opacity:.5}.lead .acts{flex-direction:column;margin:0}
.lst{display:grid;grid-template-columns:1fr 150px 1.2fr;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}.lst select,.lst input{height:36px;border:1px solid var(--line2);background:var(--panel);padding:0 8px;font:12.5px var(--mono);min-width:0}
.lst a{font-weight:600}.lst.live a{color:var(--acctext)}
.who-am{font:500 12px var(--mono);color:var(--faint)}
.empty{border:1px dashed var(--line2);padding:22px;color:var(--mut)}
@media(max-width:700px){.lead{grid-template-columns:1fr}.lead .acts{flex-direction:row}.lst{grid-template-columns:1fr 1fr}.lst input{grid-column:1/-1}}
`;

// Runs in the browser. No template placeholders and no backslashes inside, on purpose.
const CAB_JS = String.raw`
const $ = (s) => document.querySelector(s);
const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
const toast = (t) => { const n = $('#toast'); n.textContent = t; n.classList.add('show'); setTimeout(() => n.classList.remove('show'), 1800); };
const link = (label, href, cls) => { const a = el('a', 'btn' + (cls ? ' ' + cls : ''), label); a.href = href; a.target = '_blank'; a.rel = 'noopener'; return a; };
const button = (label, fn, cls) => { const b = el('button', 'btn' + (cls ? ' ' + cls : ''), label); b.type = 'button'; b.onclick = fn; return b; };
const host = (u) => { try { return new URL(u).host; } catch (e) { return u; } };
const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
async function api(path, body) {
  const r = await fetch(path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Something went wrong.');
  return j;
}
let ME = null; let CUR = new URLSearchParams(location.search).get('site') || ''; let FILTER = 'new';

async function start() {
  try { ME = await api('/api/me'); } catch (e) { $('#err').textContent = e.message; return; }
  const who = $('#who'); who.replaceChildren();
  if (ME.user) { who.append(el('span', 'who-am', 'Signed in as ' + ME.user.login + ' ')); const a = el('a', 'btn', 'Sign out'); a.href = '/auth/out'; who.append(a); }
  else if (ME.signIn) { who.append(el('span', 'who-am', 'Kept in this browser. ')); const a = el('a', 'btn go', 'Sign in with GitHub'); a.href = '/auth/start'; who.append(a); }
  else who.append(el('span', 'who-am', 'Kept in this browser.'));
  if (!ME.sites.find((s) => s.id === CUR)) CUR = ME.sites[0] ? ME.sites[0].id : '';
  tabs(); if (CUR) openSite(CUR); else { $('#site').replaceChildren(); $('#none').hidden = false; }
}

function tabs() {
  const t = $('#tabs'); t.replaceChildren();
  ME.sites.forEach((s) => { const b = button(host(s.url), () => { CUR = s.id; history.replaceState(null, '', '/me?site=' + s.id); tabs(); openSite(s.id); }, s.id === CUR ? 'on' : ''); if (s.new_leads) b.append(el('b', '', String(s.new_leads))); t.append(b); });
}

async function addSite(ev) {
  ev.preventDefault();
  const url = $('#addurl').value.trim(); const st = $('#addst'); st.className = 'status'; st.textContent = 'Adding...';
  try { const j = await api('/api/sites', { url }); CUR = j.id; $('#addurl').value = ''; st.textContent = ''; $('#none').hidden = true; await start(); listenNow(); }
  catch (e) { st.className = 'status err'; st.textContent = e.message; }
}

async function openSite(id) {
  const box = $('#site'); $('#none').hidden = true;
  let d; try { d = await api('/api/sites/' + id + '/leads'); } catch (e) { box.replaceChildren(el('p', 'status err', e.message)); return; }
  box.replaceChildren();
  const s = d.site;

  const sec1 = el('section'); sec1.append(el('h2', '', 'People talking about it'));
  sec1.append(el('p', 'sub', 'Posts from the last 30 days on Hacker News, Bluesky and GitHub that use your phrases. Open one, answer as yourself, then mark it.'));
  const kw = el('div', 'row'); const inp = el('input'); inp.value = s.keywords; inp.setAttribute('aria-label', 'Search phrases, comma separated');
  kw.append(inp, button('Save phrases', async () => { try { const j = await api('/api/sites/' + id + '/keywords', { keywords: inp.value }); inp.value = j.keywords; toast('Saved'); listenNow(); } catch (e) { toast(e.message); } }),
    button('Find people now', listenNow, 'go'), link('Search Reddit', d.reddit));
  sec1.append(kw, el('p', 'status', s.listened ? 'Last looked ' + ago(s.listened) + '.' : 'Not looked yet.'));
  const counts = { new: 0, replied: 0, skip: 0 }; d.leads.forEach((l) => { counts[l.status]++; });
  const f = el('div', 'tabs'); [['new', 'New'], ['replied', 'Replied'], ['skip', 'Skipped']].forEach(([k, label]) => { const b = button(label + ' ' + counts[k], () => { FILTER = k; openSite(id); }, FILTER === k ? 'on' : ''); f.append(b); });
  sec1.append(f);
  const list = el('div', 'leads'); const shown = d.leads.filter((l) => l.status === FILTER);
  if (!shown.length) list.append(el('div', 'empty', FILTER === 'new' ? 'No new posts. Press Find people now, or try wider phrases.' : 'Nothing here yet.'));
  shown.forEach((l) => {
    const r = el('div', 'lead' + (l.status !== 'new' ? ' done' : ''));
    const src = el('div', 'src', l.source); src.append(el('small', '', ago(l.at))); r.append(src);
    const mid = el('div'); if (l.title) mid.append(el('h3', '', l.title)); mid.append(el('p', '', l.text));
    const who = el('div', 'who'); if (l.author_url) { const a = el('a', '', l.author); a.href = l.author_url; a.target = '_blank'; a.rel = 'noopener'; who.append(a); } else who.textContent = l.author; mid.append(who); r.append(mid);
    const acts = el('div', 'acts'); acts.append(link('Open and reply', l.url, 'go'));
    const mark = (st) => async () => { try { await api('/api/leads', { site: id, url: l.url, status: st }); openSite(id); start(); } catch (e) { toast(e.message); } };
    if (l.status !== 'replied') acts.append(button('Mark replied', mark('replied')));
    if (l.status !== 'skip') acts.append(button('Skip', mark('skip')));
    if (l.status !== 'new') acts.append(button('Back to new', mark('new')));
    r.append(acts); list.append(r);
  });
  sec1.append(list); box.append(sec1);

  const sec2 = el('section'); sec2.append(el('h2', '', 'Where you listed it'));
  sec2.append(el('p', 'sub', 'Each place a buyer might find you. Find people now also looks for your listings on Hacker News, SaaSHub, Toolradar, Uneed and DevHunt and marks them Live. For the rest, submit, then set the status and paste the link.'));
  const have = {}; d.listings.forEach((x) => { have[x.place] = x; });
  ME.listings.forEach((p) => {
    const cur = have[p.name] || { status: 'todo', link: '' };
    const r = el('div', 'lst' + (cur.status === 'live' ? ' live' : ''));
    const a = el('a', '', p.name); a.href = cur.link || p.url; a.target = '_blank'; a.rel = 'noopener'; a.title = p.why;
    const sel = el('select'); sel.setAttribute('aria-label', 'Status on ' + p.name);
    [['todo', 'To do'], ['submitted', 'Submitted'], ['live', 'Live']].forEach(([v, t]) => { const o = el('option', '', t); o.value = v; if (v === cur.status) o.selected = true; sel.append(o); });
    const li = el('input'); li.placeholder = 'Link to your listing'; li.value = cur.link || ''; li.setAttribute('aria-label', 'Listing link on ' + p.name);
    const save = async () => { try { await api('/api/listings', { site: id, place: p.name, status: sel.value, link: li.value.trim() }); r.className = 'lst' + (sel.value === 'live' ? ' live' : ''); toast('Saved'); } catch (e) { toast(e.message); } };
    sel.onchange = save; li.onchange = save;
    r.append(a, sel, li); sec2.append(r);
  });
  box.append(sec2);

  const sec3 = el('section'); sec3.append(el('h2', '', 'This site'));
  const acts = el('div', 'acts'); acts.append(link('Open the site', s.url));
  if (s.plan_id) acts.append(link('Its growth plan', '/p/' + s.plan_id)); else { const a = el('a', 'btn', 'Make its growth plan'); a.href = '/?url=' + encodeURIComponent(s.url); acts.append(a); }
  acts.append(button('Remove from cabinet', async () => { if (!confirm('Remove ' + host(s.url) + ' and its saved posts and listings?')) return; try { await api('/api/sites/' + id + '/delete', {}); CUR = ''; start(); } catch (e) { toast(e.message); } }));
  sec3.append(acts); box.append(sec3);
}

async function listenNow() {
  if (!CUR) return; toast('Looking on Hacker News, Bluesky and GitHub...');
  try { const j = await api('/api/sites/' + CUR + '/listen', {}); toast(j.next ? 'Looked recently. Next look in ' + j.next + ' min.' : j.added + ' new posts'); FILTER = 'new'; await start(); }
  catch (e) { toast(e.message); }
}

$('#add').addEventListener('submit', addSite);
start();
`;

export function cabinetPage() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>My cabinet · Flisk Grow</title><meta name="robots" content="noindex">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Fraunces:opsz,wght@9..144,700;9..144,800&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>${CSS}${CAB_CSS}</style>
<script defer data-domain="grow.flisk.si" src="https://flisk.sh/a.js"></script></head><body>
<script src="https://flisk.si/assets/bar.js" defer></script>
<div class="wrap">
<header class="nav"><a class="brand" href="/"><img src="/icon.svg" alt="">Flisk Grow</a><nav class="navr" id="who"></nav></header>
<section><h2>My cabinet</h2><p class="sub">Your sites, the people talking about the problem each one solves, and where you listed it. Nothing is posted for you.</p>
<form id="add" novalidate><input id="addurl" type="url" inputmode="url" placeholder="https://your-site.com" aria-label="Link to add"><button class="btn go" type="submit">Add site</button></form>
<p id="addst" class="status" role="status"></p><p id="err" class="status err"></p>
<div class="tabs" id="tabs"></div>
<div id="none" class="empty" hidden>No sites yet. Add the link to something you made.</div>
</section>
<div id="site"></div>
<footer><span>Flisk Grow · beta</span><a href="/">Make a plan</a><a href="https://github.com/flisk-sh/grow">Source</a></footer>
</div>
<div id="toast" class="toast" role="status"></div>
<script>${CAB_JS}</script>
</body></html>`;
}
