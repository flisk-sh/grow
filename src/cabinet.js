// The cabinet at /me: your sites, the people talking about the problem each one solves (social listening), and where
// you listed it. A visitor gets a cabinet in this browser at once (signed cookie); GitHub sign-in keeps it across
// browsers and moves the browser's sites into the account. Nothing is posted or sent for anyone.
import { SKIP_LINK } from './page.js';
import { httpUrl, LISTINGS, profileOf } from './plan.js';
import { listen, mentions, notOwn, parseKeywords, redditSearch } from './listen.js';
import { CSS } from './page.js';
import { findListings } from './found.js';
import { findRepo, jobsFor, postJobs } from './jobs.js';
import { verifyLoginToken } from './login-token.js';
import { nextPage } from './next.js';

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
const signInReady = (env) => Boolean((env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) || (env.LOGIN_PUBLIC_KEY && env.SESSION_SECRET));

async function siteOf(env, uid, id) {
  return uid ? env.DB.prepare('SELECT * FROM sites WHERE id = ? AND user_id = ?').bind(id, uid).first() : null;
}

// Search phrases for a new site: the plan's, else words from the host name.
async function keywordsFor(env, url) {
  const row = await env.DB.prepare('SELECT data FROM plans WHERE url = ? ORDER BY created DESC LIMIT 1').bind(url).first();
  const plan = row ? JSON.parse(row.data) : null;
  if (plan?.queries?.length) return { keywords: plan.queries.join(', '), plan };
  const pr = profileOf(url);
  const name = pr ? pr.handle.split('.')[0].replace(/[-_]/g, ' ') : new URL(url).hostname.replace(/^www\./, '').split('.')[0].replace(/[-_]/g, ' ');
  return { keywords: name, plan };
}

// A signed-in person (from GitHub directly or from login.flisk.si): their browser's sites move into the account and
// a long cookie keeps them signed in. `who` is { id, login }, id being GitHub's number.
async function finishSignIn(req, env, who) {
  if (!who?.id || !who?.login) return new Response(null, { status: 302, headers: { location: '/me?signin=failed' } });
  const id = `gh_${who.id}`;
  const before = await userId(req, env);
  const stmts = [env.DB.prepare('INSERT INTO users (id, login, created) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET login = excluded.login').bind(id, String(who.login).slice(0, 60), Date.now())];
  // The sites made in this browser before sign-in move into the account.
  if (before.startsWith('a_')) stmts.push(env.DB.prepare('UPDATE sites SET user_id = ? WHERE user_id = ?').bind(id, before));
  await env.DB.batch(stmts);
  const h = new Headers({ location: '/me' });
  h.append('set-cookie', await sessionCookie(env, id));
  h.append('set-cookie', setCookie('grow_state', '', 0));
  return new Response(null, { status: 302, headers: h });
}

// Routes under /me, /auth and /api/me|sites|leads|listings. Returns null when the path is not the cabinet's.
export async function cabinet(req, env, deps = {}) {
  const url = new URL(req.url);
  const path = url.pathname;
  const fetchImpl = deps.fetch || fetch;
  const origin = env.PUBLIC_ORIGIN || url.origin;

  // /me is the Astryx page (the app draws the cabinet); the previous design stays at /classic/me.
  if (req.method === 'GET' && (path === '/me' || path === '/classic/me')) {
    const classic = path === '/classic/me';
    const headers = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://flisk.si https://flisk.sh; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://flisk.si; font-src https://fonts.gstatic.com; img-src 'self' data: https://flisk.si; connect-src 'self' https://flisk.si https://*.flisk.si; frame-ancestors 'none'" };
    if (!classic) headers['content-security-policy'] = headers['content-security-policy'].replace("font-src https://fonts.gstatic.com", "font-src 'self' https://fonts.gstatic.com").replace("img-src 'self' data: https://flisk.si", "img-src 'self' data: https://flisk.si https://ranker.flisk.si");
    if (env.SESSION_SECRET && !(await userId(req, env))) headers['set-cookie'] = await sessionCookie(env, 'a_' + rand(8));
    return new Response(classic ? cabinetPage() : nextPage({ index: false, bare: true }), { headers });
  }

  // GitHub sign-in (an OAuth app with callback <origin>/auth/callback).
  if (path === '/auth/start') {
    // One Flisk sign-in for every site (login.flisk.si): no GitHub app or secret of our own, only its public key.
    if (env.LOGIN_PUBLIC_KEY) {
      const s = rand(12);
      const back = new URL('/auth/done', origin);
      back.searchParams.set('s', s);
      return new Response(null, { status: 302, headers: { location: `${env.LOGIN_ORIGIN || 'https://login.flisk.si'}/start?return=${encodeURIComponent(back.href)}`, 'set-cookie': setCookie('grow_state', s, 600) } });
    }
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
    return finishSignIn(req, env, gh);
  }
  if (path === '/auth/done') {
    const who = env.LOGIN_PUBLIC_KEY && url.searchParams.get('s') === cookieOf(req, 'grow_state') ? await verifyLoginToken(url.searchParams.get('flisk_token'), env.LOGIN_PUBLIC_KEY, origin, deps.now) : null;
    return who ? finishSignIn(req, env, who) : new Response(null, { status: 302, headers: { location: '/me?signin=failed' } });
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

  const sm = /^\/api\/sites\/([0-9a-f]{12})(?:\/(leads|listen|delete|keywords|jobs))?$/.exec(path);
  if (sm) {
    const site = await siteOf(env, uid, sm[1]);
    if (!site) return json(404, { error: 'This site is not in your cabinet.' });
    const action = sm[2];
    if (req.method === 'POST' && action === 'delete') {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM leads WHERE site_id = ?').bind(site.id),
        env.DB.prepare('DELETE FROM listings WHERE site_id = ?').bind(site.id),
        env.DB.prepare('DELETE FROM posted WHERE site_id = ?').bind(site.id),
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
    if (req.method === 'POST' && action === 'jobs') {
      if (!env.JOBS_KEY) return json(503, { error: 'Posting jobs is not set up yet.' });
      // A gap posted in the last day is not posted again: the bot would give the same answer.
      const { results: had } = await env.DB.prepare('SELECT kind FROM posted WHERE site_id = ? AND at > ?').bind(site.id, Date.now() - 864e5).all();
      const repo = await findRepo(site.url, { fetch: fetchImpl });
      const todo = jobsFor(site.url, repo).filter((j) => !(had || []).some((h) => h.kind === j.kind));
      if (!todo.length) return json(200, { posted: [], repo, note: 'Already posted today. Open the jobs below to see the answers.' });
      let posted;
      try { posted = await postJobs(todo, env.JOBS_KEY, { fetch: fetchImpl }); } catch (e) { return json(502, { error: e.message }); }
      await env.DB.batch(posted.map((p) => env.DB.prepare('INSERT INTO posted (site_id, kind, job_id, link, title, at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(site_id, kind) DO UPDATE SET job_id = excluded.job_id, link = excluded.link, title = excluded.title, at = excluded.at')
        .bind(site.id, p.kind, String(p.id), p.link, p.title, Date.now())));
      return json(200, { posted, repo });
    }
    if (req.method === 'GET' && action === 'leads') {
      const { results: all } = await env.DB.prepare('SELECT url, source, title, text, author, author_url, at, status FROM leads WHERE site_id = ? ORDER BY at DESC LIMIT ?').bind(site.id, MAX_LEADS).all();
      // Unanswered leads that do not really use a phrase (or are your own) are dropped on every read, so old
      // loose matches vanish without waiting for the next search.
      const me = uid.startsWith('gh_') ? await env.DB.prepare('SELECT login FROM users WHERE id = ?').bind(uid).first() : null;
      const name = (() => { try { return new URL(site.url).hostname.replace(/^www\./, '').split('.')[0]; } catch { return ''; } })();
      const kws = parseKeywords(site.keywords), ex = { authors: [me?.login], owners: [name, me?.login] };
      const stale = (all || []).filter((l) => l.status === 'new' && (!mentions(l, kws) || !notOwn(l, ex)));
      if (stale.length) await env.DB.batch(stale.map((l) => env.DB.prepare('DELETE FROM leads WHERE site_id = ? AND url = ?').bind(site.id, l.url)));
      const leads = (all || []).filter((l) => !stale.includes(l));
      const { results: listings } = await env.DB.prepare('SELECT place, status, link, updated FROM listings WHERE site_id = ?').bind(site.id).all();
      const { results: jobs } = await env.DB.prepare('SELECT kind, title, link, at FROM posted WHERE site_id = ? ORDER BY at DESC').bind(site.id).all();
      return json(200, { site, leads, listings, jobs: jobs || [], reddit: redditSearch(parseKeywords(site.keywords)) });
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
const LOGO_HOSTS = { 'hacker news': 'news.ycombinator.com', 'hacker news (show hn)': 'news.ycombinator.com', 'show hn': 'news.ycombinator.com', bluesky: 'bsky.app', github: 'github.com', reddit: 'reddit.com', 'product hunt': 'producthunt.com', saashub: 'saashub.com', alternativeto: 'alternativeto.net', betalist: 'betalist.com', toolradar: 'toolradar.com', uneed: 'uneed.best', devhunt: 'devhunt.org', foundrlist: 'foundrlist.com', launchamp: 'launchamp.eu', toolpotion: 'toolpotion.ai', aichief: 'aichief.com', sourceforge: 'sourceforge.net', 'x': 'x.com', twitter: 'x.com', linkedin: 'linkedin.com', 'indie hackers': 'indiehackers.com', 'dev.to': 'dev.to', discord: 'discord.com', youtube: 'youtube.com', 'stack overflow': 'stackoverflow.com', medium: 'medium.com', slack: 'slack.com', mastodon: 'joinmastodon.org', lobsters: 'lobste.rs', 'lobste.rs': 'lobste.rs', citable: 'citable.flisk.si', 'readme score': 'readme.flisk.si', 'flisk analytics': 'analytics.flisk.si' };
const logoHost = (name, url) => { const n = String(name || '').toLowerCase().trim(); const k = Object.keys(LOGO_HOSTS).find((x) => n === x || n.startsWith(x + ' ') || n.startsWith('r/') && x === 'reddit'); if (k) return LOGO_HOSTS[k]; try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };
const logo = (name, url) => { const h = logoHost(name, url); const i = document.createElement('img'); i.className = 'logo'; i.alt = ''; i.width = 16; i.height = 16; i.loading = 'lazy'; if (h) i.src = '/logo/' + h; else i.hidden = true; i.onerror = () => { i.hidden = true; }; return i; };
const named = (tag, cls, name, url) => { const n = el(tag, cls); n.append(logo(name, url), document.createTextNode(name)); return n; };

const LOGO_WORDS = { 'Hacker News': 'news.ycombinator.com', 'Show HN': 'news.ycombinator.com', Bluesky: 'bsky.app', GitHub: 'github.com', Reddit: 'reddit.com', 'Product Hunt': 'producthunt.com', SaaSHub: 'saashub.com', AlternativeTo: 'alternativeto.net', BetaList: 'betalist.com', Toolradar: 'toolradar.com', Uneed: 'uneed.best', DevHunt: 'devhunt.org', FoundrList: 'foundrlist.com', LaunchAmp: 'launchamp.eu', ToolPotion: 'toolpotion.ai', AIChief: 'aichief.com', SourceForge: 'sourceforge.net', LinkedIn: 'linkedin.com', 'Indie Hackers': 'indiehackers.com', 'dev.to': 'dev.to', Discord: 'discord.com', YouTube: 'youtube.com', 'Stack Overflow': 'stackoverflow.com', Medium: 'medium.com', Slack: 'slack.com', Mastodon: 'joinmastodon.org', Lobsters: 'lobste.rs', ChatGPT: 'chatgpt.com', Claude: 'claude.ai', Perplexity: 'perplexity.ai', Gemini: 'gemini.google.com', Twitter: 'x.com', Citable: 'citable.flisk.si', 'README Score': 'readme.flisk.si', 'jobs.flisk.si': 'jobs.flisk.si', 'bot.flisk.si': 'bot.flisk.si' };
const LOGO_RE = new RegExp('(?<![\\w.])(' + Object.keys(LOGO_WORDS).sort((a, b) => b.length - a.length).map((w) => w.replace(/\./g, '\\.')).join('|') + ')(?![\\w])', 'g');
// Puts a logo before every company name in the page's text, after each render.
function logoize(root) {
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (t) => { const p = t.parentElement; if (!p || p.closest('script,style,textarea,input,select,option,.nologo')) return NodeFilter.FILTER_REJECT; if (t.previousSibling?.classList?.contains('logo')) return NodeFilter.FILTER_REJECT; LOGO_RE.lastIndex = 0; return LOGO_RE.test(t.data) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } });
  const todo = []; while (walk.nextNode()) todo.push(walk.currentNode);
  for (const t of todo) {
    const frag = document.createDocumentFragment(); let last = 0; LOGO_RE.lastIndex = 0;
    for (const m of t.data.matchAll(LOGO_RE)) { frag.append(t.data.slice(last, m.index)); const i = document.createElement('img'); i.className = 'logo'; i.alt = ''; i.width = 16; i.height = 16; i.loading = 'lazy'; i.src = '/logo/' + LOGO_WORDS[m[1]]; i.onerror = () => { i.hidden = true; }; frag.append(i, m[1]); last = m.index + m[1].length; }
    frag.append(t.data.slice(last)); t.replaceWith(frag);
  }
}
let logoBusy = false;
new MutationObserver(() => { if (logoBusy) return; logoBusy = true; requestAnimationFrame(() => { logoize(document.body); logoBusy = false; }); }).observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', () => logoize(document.body));

const toast = (t) => { const n = $('#toast'); n.textContent = t; n.classList.add('show'); setTimeout(() => n.classList.remove('show'), 1800); };
const link = (label, href, cls) => { const a = el('a', 'btn' + (cls ? ' ' + cls : ''), label); a.href = href; a.target = '_blank'; a.rel = 'noopener'; return a; };
const button = (label, fn, cls) => { const b = el('button', 'btn' + (cls ? ' ' + cls : ''), label); b.type = 'button'; b.onclick = fn; return b; };
const host = (u) => { try { const x = new URL(u), h = x.host.replace(/^(www|mobile)[.]/, ''), p = x.pathname.split('/').filter(Boolean); if (/^(x|twitter)[.]com$/.test(h) && p[0]) return '@' + p[0] + ' on X'; if (h === 'bsky.app' && p[0] === 'profile' && p[1]) return '@' + p[1] + ' on Bluesky'; return x.host; } catch (e) { return u; } };
const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
async function api(path, body) {
  const r = await fetch(path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Something went wrong.');
  return j;
}
// The org bar (flisk.si/assets/bar.js) reads the login from [data-flisk-login]: that element's whole text must be the login, so it gets its own span.
// ME.user is only set for a GitHub session (gh_), never for the anonymous a_ one; the pattern is a second guard.
const GH_LOGIN = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;
const whoNodes = (user) => { const lg = el('span', 'who-am', user.login); if (GH_LOGIN.test(String(user.login))) lg.setAttribute('data-flisk-login', ''); return [el('span', 'who-am', 'Signed in as '), lg, ' ']; };
let ME = null; let CUR = new URLSearchParams(location.search).get('site') || ''; let FILTER = 'new';

async function start() {
  try { ME = await api('/api/me'); } catch (e) { $('#err').textContent = e.message; return; }
  const who = $('#who'); who.replaceChildren();
  if (ME.user) { who.append(...whoNodes(ME.user)); const a = el('a', 'btn', 'Sign out'); a.href = '/auth/out'; who.append(a); }
  else if (ME.signIn) { who.append(el('span', 'who-am', 'Kept in this browser. ')); const a = el('a', 'btn go', 'Start free with GitHub'); a.href = '/auth/start?utm_source=grow&utm_medium=cta&utm_campaign=free-key'; who.append(a, el('span', 'who-am', ' No card. Free to start.')); }
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
    button('Find people now', listenNow, 'go'), (() => { const a = link('Search Reddit', d.reddit); a.prepend(logo('reddit')); return a; })());
  sec1.append(kw, el('p', 'status', s.listened ? 'Last looked ' + ago(s.listened) + '.' : 'Not looked yet.'));
  const counts = { new: 0, replied: 0, skip: 0 }; d.leads.forEach((l) => { counts[l.status]++; });
  const f = el('div', 'tabs'); [['new', 'New'], ['replied', 'Replied'], ['skip', 'Skipped']].forEach(([k, label]) => { const b = button(label + ' ' + counts[k], () => { FILTER = k; openSite(id); }, FILTER === k ? 'on' : ''); f.append(b); });
  sec1.append(f);
  const list = el('div', 'leads'); const shown = d.leads.filter((l) => l.status === FILTER);
  if (!shown.length) list.append(el('div', 'empty', FILTER === 'new' ? 'No new posts. Press Find people now, or try wider phrases.' : 'Nothing here yet.'));
  shown.forEach((l) => {
    const r = el('div', 'lead' + (l.status !== 'new' ? ' done' : ''));
    const src = named('div', 'src', l.source); src.append(el('small', '', ago(l.at))); r.append(src);
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
    const a = named('a', '', p.name, p.url); a.href = cur.link || p.url; a.target = '_blank'; a.rel = 'noopener'; a.title = p.why;
    const sel = el('select'); sel.setAttribute('aria-label', 'Status on ' + p.name);
    [['todo', 'To do'], ['submitted', 'Submitted'], ['live', 'Live']].forEach(([v, t]) => { const o = el('option', '', t); o.value = v; if (v === cur.status) o.selected = true; sel.append(o); });
    const li = el('input'); li.placeholder = 'Link to your listing'; li.value = cur.link || ''; li.setAttribute('aria-label', 'Listing link on ' + p.name);
    const save = async () => { try { await api('/api/listings', { site: id, place: p.name, status: sel.value, link: li.value.trim() }); r.className = 'lst' + (sel.value === 'live' ? ' live' : ''); toast('Saved'); } catch (e) { toast(e.message); } };
    sel.onchange = save; li.onchange = save;
    r.append(a, sel, li); sec2.append(r);
  });
  box.append(sec2);

  const secJ = el('section'); secJ.append(el('h2', '', 'Get it done for you'));
  secJ.append(el('p', 'sub', 'Posts the checks a bot really does to jobs.flisk.si: can AI search find your site, and how good is your README (when the site links its GitHub repo). A bot takes them within about 5 minutes. Free and public.'));
  const jr = el('div', 'acts');
  jr.append(button('Post as jobs', async (ev) => { ev.target.disabled = true; try { const j = await api('/api/sites/' + id + '/jobs', {}); toast(j.note || (j.posted.length + ' jobs posted')); openSite(id); } catch (e) { toast(e.message); ev.target.disabled = false; } }, 'go'));
  secJ.append(jr);
  (d.jobs || []).forEach((j) => { const r = el('div', 'lst'); const jl = link(j.title, j.link); jl.prepend(logo('', j.link)); r.append(jl, el('small', '', 'posted ' + ago(j.at))); secJ.append(r); });
  box.append(secJ);

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
<script defer data-domain="grow.flisk.si" src="https://flisk.sh/a.js"></script></head><body>${SKIP_LINK}
<script src="https://flisk.si/assets/bar.js" data-product="Grow" data-icon="grow" data-accent="#22c55e" data-siblings="Cilytics,Ranker" data-text="Find your first customers with a plan made from your link." defer></script>
<div class="wrap">
<header class="nav"><a class="brand" href="/">Flisk Grow</a><nav class="navr" id="who"></nav></header><main id="main">
<section><h2>My cabinet</h2><p class="sub">Your sites, the people talking about the problem each one solves, and where you listed it. Nothing is posted for you.</p>
<form id="add" novalidate><input id="addurl" type="url" inputmode="url" placeholder="https://your-site.com" aria-label="Link to add"><button class="btn go" type="submit">Add site</button></form>
<p id="addst" class="status" role="status"></p><p id="err" class="status err"></p>
<div class="tabs" id="tabs"></div>
<div id="none" class="empty" hidden>No sites yet. Add the link to something you made.</div>
</section>
<div id="site"></div>
</main><footer><span>Flisk Grow · beta</span><a href="/">Make a plan</a><a href="https://github.com/flisk-sh/grow">Source</a></footer>
</div>
<div id="toast" class="toast" role="status"></div>
<script>${CAB_JS}</script>
</body></html>`;
}
