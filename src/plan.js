// One growth plan for one link: read the page, ask the free model who would buy and where they are, check whether AI
// search can read the page (Citable), and add the places to list it. Nothing here sends a message for anyone.

export const CITABLE_URL = 'https://citable.flisk.si/api/check?url=';
export const MODEL = 'flisk-wolf-chat';

const str = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, max);
// Email and post bodies keep their line breaks.
const text = (v, max) => String(v ?? '').replace(/\r/g, '').replace(/[\u0000-\u0009\u000b-\u001f]/g, ' ').trim().slice(0, max);

export function httpUrl(v) {
  try {
    const u = new URL(String(v ?? '').trim().slice(0, 300));
    return /^https?:$/.test(u.protocol) && u.hostname.includes('.') ? u.href : '';
  } catch { return ''; }
}

// Where to list a product. Fixed links, checked by hand: the model never makes up a submit page.
export const LISTINGS = [
  { name: 'Hacker News (Show HN)', why: 'Developers and early adopters; post on a weekday morning US time.', url: 'https://news.ycombinator.com/submit' },
  { name: 'Product Hunt', why: 'A launch day with a page people can upvote and comment on.', url: 'https://www.producthunt.com/posts/new' },
  { name: 'SaaSHub', why: 'A software directory people search for alternatives.', url: 'https://www.saashub.com/submit' },
  { name: 'AlternativeTo', why: 'Shows up when people look for an alternative to a known app.', url: 'https://alternativeto.net/manage-item/' },
  { name: 'BetaList', why: 'Early adopters who sign up for new products.', url: 'https://betalist.com/submit' },
  { name: 'Toolradar', why: 'A tool directory that AI assistants read.', url: 'https://toolradar.com/submit' },
  { name: 'Uneed', why: 'A daily launch list for new tools.', url: 'https://www.uneed.best/submit-a-tool' },
  { name: 'DevHunt', why: 'A launch list for developer tools.', url: 'https://devhunt.org/' },
];

// The other free Flisk checks that help a launch.
export const TOOLS = [
  { name: 'Citable', why: 'Can ChatGPT, Claude and Perplexity read and quote your page.', url: 'https://citable.flisk.si' },
  { name: 'README Score', why: 'A score for a GitHub README and a fix for each missing part.', url: 'https://readme.flisk.si' },
  { name: 'Flisk Analytics', why: 'Count visitors without cookies. Invite only for now.', url: 'https://analytics.flisk.si' },
];

// The page as plain text for the model: title, description and the start of the visible text.
export async function readPage(url, fetchImpl) {
  try {
    const r = await fetchImpl(url, { headers: { accept: 'text/html', 'user-agent': 'FliskGrow/1.0 (+https://grow.flisk.si)' }, redirect: 'follow', signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const html = (await r.text()).slice(0, 300_000);
    const title = str(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1], 160);
    const desc = str(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i.exec(html)?.[1], 300);
    const body = html.replace(/<(script|style|noscript|svg|title)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#?\w+;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000);
    return { title, desc, body };
  } catch { return null; }
}

export async function checkCitable(url, call) {
  try {
    const r = await call(CITABLE_URL + encodeURIComponent(url), { headers: { accept: 'application/json', 'user-agent': 'flisk-grow' }, signal: AbortSignal.timeout(20000) });
    const j = r.ok ? await r.json() : null;
    if (!j || typeof j.score !== 'number') return null;
    const fixes = (Array.isArray(j.checks) ? j.checks : []).filter((c) => c && (c.status === 'fail' || c.status === 'warn'))
      .slice(0, 3).map((c) => ({ title: str(c.title, 100), summary: str(c.summary, 220) }));
    return { score: j.score, grade: str(j.grade, 2), fixes, report: `https://citable.flisk.si/${encodeURIComponent(new URL(url).host)}` };
  } catch { return null; }
}

export const SYSTEM = `You help a maker find the first people who would pay for what they made.
You get a link and the text of its page. Answer with ONE JSON object and nothing else:
{"product": "what it is, one short sentence",
 "buyers": "who would pay first: a narrow group, their job, the problem they have today (2 sentences)",
 "pitch": "one line a buyer would care about, no hype",
 "today": "the one step to take today, one sentence",
 "places": [{"name": "a real community, forum, subreddit, newsletter, event or group where those buyers are", "why": "why there", "url": "its address if you are sure, else empty"}],
 "emails": [{"to": "who to write to (a role, not a made-up name)", "subject": "short", "body": "a short plain email under 90 words: why them, what it does for them, one small ask; sign it [your name]"}],
 "posts": [{"where": "X" | "Reddit" | "Hacker News", "title": "post title", "body": "the post, plain, under 60 words"}]}
Give 5 to 8 places, 5 emails, 3 posts (one for each of X, Reddit and Hacker News). Only real places; never invent an address.
Plain words, no emoji, no hashtags. If the page says little, guess from the link and say so in "product".`;

export function parseJson(s) {
  const t = String(s ?? '').replace(/```(?:json)?/g, '');
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; }
}

// Keep only what the page can draw safely. Returns null when the model gave too little to be useful.
export function cleanPlan(i) {
  if (!i || typeof i !== 'object') return null;
  const places = (Array.isArray(i.places) ? i.places : []).slice(0, 10)
    .map((p) => ({ name: str(p?.name, 80), why: str(p?.why, 200), url: httpUrl(p?.url) })).filter((p) => p.name);
  const emails = (Array.isArray(i.emails) ? i.emails : []).slice(0, 8)
    .map((e) => ({ to: str(e?.to, 80), subject: str(e?.subject, 120), body: text(e?.body, 1500) })).filter((e) => e.subject && e.body);
  const posts = (Array.isArray(i.posts) ? i.posts : []).slice(0, 5)
    .map((p) => ({ where: ['X', 'Reddit', 'Hacker News'].includes(p?.where) ? p.where : 'X', title: str(p?.title, 120), body: text(p?.body, 600) }))
    .filter((p) => p.title || p.body);
  const buyers = str(i.buyers, 500);
  if (!buyers || !places.length || !emails.length) return null;
  return { product: str(i.product, 200), buyers, pitch: str(i.pitch, 200), today: str(i.today, 240), places, emails, posts };
}

// The whole plan. `model` and `citable` are fetch-like functions (service bindings in production).
export async function makePlan(url, { fetch: fetchImpl, model, citable, key }) {
  const [page, check] = await Promise.all([readPage(url, fetchImpl), checkCitable(url, citable || fetchImpl)]);
  const about = page ? `Title: ${page.title}\nDescription: ${page.desc}\nText: ${page.body}` : '(the page could not be read)';
  let r;
  try {
    r = await model('https://inference.flisk.si/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: MODEL, temperature: 0.4, max_tokens: 2048, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: `Link: ${url}\n${about}` }] }),
    signal: AbortSignal.timeout(60000),
  });
  } catch (e) {
    return { error: e?.name === 'TimeoutError' || e?.name === 'AbortError' ? 'timeout' : 'model', message: str(e?.message, 300) || 'model call failed' };
  }
  const j = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = str(j?.error?.message, 300);
    return { error: /daily|budget|limit/i.test(msg) ? 'busy' : 'model', message: msg || `model answered ${r.status}` };
  }
  const plan = cleanPlan(parseJson(j?.choices?.[0]?.message?.content));
  if (!plan) return { error: 'model', message: 'the model did not give a usable plan' };
  return { plan: { url, ...plan, check, listings: LISTINGS, tools: TOOLS } };
}
