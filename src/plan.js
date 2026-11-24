// One growth plan for one link: read the page, ask the free model who would buy and where they are, check whether AI
// search can read the page (Citable), and add the places to list it. Nothing here sends a message for anyone.

import { checkPlaceLinks, cleanPlaces, tieFinds } from './links.js';

export const RANKER = 'https://ranker.flisk.si';
const NOT_REPO = /^(orgs|sponsors|topics|marketplace|settings|features|about|login|explore|search|collections|trending|apps)$/i;
// "owner/repo" when the link is a GitHub repo, else ''.
export function githubRepo(u) {
  const m = /^https?:[/][/](?:www[.])?github[.]com[/]([\w.-]+)[/]([\w.-]+?)(?:[.]git)?(?:[/?#].*)?$/i.exec(String(u || '').trim());
  return m && !NOT_REPO.test(m[1]) ? m[1] + '/' + m[2] : '';
}
// For a GitHub repo: list it on Ranker (stars gained, ranked daily) and give its page and live badge.
export async function rankerFor(url, call) {
  const repo = githubRepo(url);
  if (!repo) return null;
  const out = { repo, url: RANKER + '/' + repo, listed: false };
  try {
    const r = await call(RANKER + '/api/submit', { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'flisk-grow' }, body: JSON.stringify({ url: 'https://github.com/' + repo }), signal: AbortSignal.timeout(15000) });
    const j = await r.json().catch(() => null);
    if (r.ok && j && j.slug) {
      const badge = RANKER + '/badge/' + j.slug + '.svg';
      Object.assign(out, { listed: true, url: RANKER + (j.url || '/' + repo), badge, stars: Number(j.product?.stars) || 0, markdown: `[![Flisk Ranker](${badge})](${RANKER + (j.url || '/' + repo)})` });
    }
  } catch {}
  return out;
}

export const CITABLE_URL = 'https://citable.flisk.si/api/check?url=';
export const MODEL = 'flisk-wolf-chat';
const MODEL_TIMEOUT_MS = 85000;
// Grow's own model on Workers AI: Llama 3.1 8B fast writes one part of a plan in about 2 seconds for about 16 neurons,
// where flisk-wolf-chat took 30-90 seconds and shared its daily budget with chat. PLANS_PER_DAY is grow's own budget.
export const FAST_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';

// A fetch-like model call on the AI binding that answers like /v1/chat/completions. When the binding fails (the
// account's daily allowance is used up, or the model is down) the call goes to `fallback` (inference.flisk.si) instead.
export function workersAi(ai, fallback) {
  return async (url, init) => {
    const req = JSON.parse(init.body);
    try {
      const r = await ai.run(FAST_MODEL, { messages: req.messages, max_tokens: req.max_tokens, temperature: req.temperature, response_format: { type: 'json_object' } });
      const content = typeof r?.response === 'string' ? r.response : JSON.stringify(r?.response ?? '');
      if (!content || content === '""') throw new Error('empty answer');
      return Response.json({ model: FAST_MODEL, choices: [{ message: { role: 'assistant', content } }], usage: r.usage });
    } catch (e) {
      if (fallback) return fallback(url, init);
      return Response.json({ error: { message: str(e?.message, 300) || 'model call failed' } }, { status: 503 });
    }
  };
}

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
  { name: 'AIChief', why: 'An AI tools directory with a page per tool.', url: 'https://aichief.com/submit-tool/' },
  { name: 'FoundrList', why: 'A launch list for founders, with a badge you can put on your site.', url: 'https://www.foundrlist.com/' },
  { name: 'LaunchAmp', why: 'A European launch directory that approves each tool and gives a badge.', url: 'https://launchamp.eu/' },
  { name: 'ToolPotion', why: 'An AI tools directory with ranked pages per tool.', url: 'https://toolpotion.ai/' },
  { name: 'Up For Grabs', repoOnly: true, why: 'For an open source repo: lists it for people looking for a good first issue. Add a project file by pull request.', url: 'https://github.com/up-for-grabs/up-for-grabs.net/blob/gh-pages/docs/list-a-project.md' },
  { name: 'Awesome First PR Opportunities', repoOnly: true, why: 'For an open source repo with good first issues: a 90,000-star list of projects that welcome new contributors. One pull request per repo.', url: 'https://github.com/MunGell/awesome-for-beginners/blob/main/CONTRIBUTING.md' },
  { name: 'free-for-dev', why: 'For a developer service with a free tier: a 140,000-star list of them. Add a line by pull request.', url: 'https://github.com/ripienaar/free-for-dev' },
  { name: 'awesome-mcp-servers', why: 'For an MCP server: the biggest list of them. Add a line by pull request.', url: 'https://github.com/punkpeye/awesome-mcp-servers' },
  { name: 'SourceForge', why: 'Mirrors your releases and lists the project for people browsing open source.', url: 'https://sourceforge.net/create/' },
];

// The listings for one link: the open source lists only when the link is a GitHub repo.
export const listingsFor = (url) => (githubRepo(url) ? LISTINGS : LISTINGS.filter((l) => !l.repoOnly));

// Places that allow self-promotion, each with its own rule. Fixed and checked by hand: the model never makes up a community.
// Discord has no "post this" link, so those get a draft to copy and a place to find the right channel.
export const PROMO = [
  { name: 'Flisk Discord #show-your-stack', where: 'Discord', rule: 'Show what you built with or next to Flisk. Post the link and what it does.', url: 'https://discord.com/channels/1562937840071999538/1569404291196915904' },
  { name: 'r/SideProject', where: 'Reddit', rule: 'Made for people who share their own projects; say what it does and ask for feedback.', url: 'https://www.reddit.com/r/SideProject/submit' },
  { name: 'r/alphaandbetausers', where: 'Reddit', rule: 'Made for finding early testers; say what you need tested.', url: 'https://www.reddit.com/r/alphaandbetausers/submit' },
  { name: 'r/SaaS', where: 'Reddit', rule: 'Share a product with the story behind it; read the pinned rules first.', url: 'https://www.reddit.com/r/SaaS/submit' },
  { name: 'r/webdev (Showoff Saturday)', where: 'Reddit', rule: 'Self-promotion only in the Saturday thread; do not post it on other days.', url: 'https://www.reddit.com/r/webdev/' },
  { name: 'r/InternetIsBeautiful', where: 'Reddit', rule: 'Only for a free, public site that is nice to look at or use; no sign-up wall.', url: 'https://www.reddit.com/r/InternetIsBeautiful/submit' },
  { name: 'Find Discord servers for your buyers (Disboard)', where: 'Discord', rule: 'Search your buyers\' topic, join 3 servers, and look for a channel named show-your-work, showcase, self-promo or promote. Read its pinned rule before you post.', url: 'https://disboard.org/' },
];

// The other free Flisk checks that help a launch.
export const TOOLS = [
  { name: 'Citable', why: 'Can ChatGPT, Claude and Perplexity read and quote your page.', url: 'https://citable.flisk.si' },
  { name: 'README Score', why: 'A score for a GitHub README and a fix for each missing part.', url: 'https://readme.flisk.si' },
  { name: 'Flisk Analytics', why: 'Count visitors without cookies. Invite only for now.', url: 'https://analytics.flisk.si' },
];

// The page as plain text for the model: title, description and the start of the visible text.
// The maker's other pages: profiles the links bar knows by host, anything else is kept as "Other".
export const LINK_KINDS = [['GitHub', /(^|[.])github[.]com$/], ['X', /(^|[.])(x|twitter)[.]com$/], ['LinkedIn', /(^|[.])linkedin[.]com$/], ['Product Hunt', /(^|[.])producthunt[.]com$/], ['Hacker News', /^news[.]ycombinator[.]com$/], ['Reddit', /(^|[.])reddit[.]com$/], ['YouTube', /(^|[.])(youtube[.]com|youtu[.]be)$/], ['Discord', /(^|[.])(discord[.]gg|discord[.]com)$/], ['npm', /(^|[.])npmjs[.]com$/], ['PyPI', /^pypi[.]org$/], ['Bluesky', /^bsky[.]app$/]];
export function linkKind(u) {
  try { const h = new URL(u).hostname.toLowerCase(); return (LINK_KINDS.find(([, re]) => re.test(h)) || ['Other'])[0]; } catch { return ''; }
}
const linkKey = (u) => String(u).replace(/^https?:[/][/](www[.])?/i, '').replace(/[/?#]+$/, '').toLowerCase();
// Up to 12 distinct http(s) links, without the main one.
// Tracking and badge parameters (utm_source, ref, embed ...) say nothing about the page; drop them.
const TRACK = /^(utm_\w+|ref|ref_src|ref_url|embed|fbclid|gclid|igshid|si|s|mc_cid|mc_eid)$/i;
export function untrack(u) {
  try { const x = new URL(u); [...x.searchParams.keys()].filter((k) => TRACK.test(k)).forEach((k) => x.searchParams.delete(k)); return x.href.replace(/[?]$/, ''); } catch { return u; }
}
export function cleanLinks(list, main) {
  const seen = new Set([linkKey(main || '')]); const out = [];
  for (const v of Array.isArray(list) ? list : []) {
    // A link to a file in a repo (its LICENSE, a README) becomes the repo page.
    const r = githubRepo(v); const h = r ? 'https://github.com/' + r : httpUrl(v); const u = h && untrack(h); if (!u || seen.has(linkKey(u))) continue;
    seen.add(linkKey(u)); out.push(u); if (out.length >= 12) break;
  }
  return out;
}
// Profile links a page points at (its GitHub, X, LinkedIn ...), not share or intent buttons.
// A link counts as the site's own when it sits in the header, nav or footer, or names the site
// (github.com/flisk-sh/flisk for flisk.sh). An adopter's LinkedIn in the page body is not the maker's.
const flat = (v) => String(v).toLowerCase().replace(/[^a-z0-9]/g, '');
export function profileLinks(html, site) {
  html = String(html); const out = [];
  let name = ''; try { name = flat(new URL(site).hostname.replace(/^www[.]/, '').split('.')[0]); } catch { /* no site: chrome only */ }
  const chrome = [...html.matchAll(/<(header|nav|footer)\b[\s\S]*?<[/]\1>/gi)].map((m) => [m.index, m.index + m[0].length]);
  for (const m of html.matchAll(/href=["'](https?:[/][/][^"'#\s<>]+)["']/gi)) {
    const u = httpUrl(m[1]); const k = u && linkKind(u);
    if (!k || k === 'Other' || /[/](intent|share|sharer|submit|search|login|signup)\b|[?&](text|url)=/i.test(u) || new URL(u).pathname.length < 2) continue;
    const own = (name.length >= 3 && flat(new URL(u).pathname).includes(name)) || chrome.some(([a, b]) => m.index > a && m.index < b);
    if (!own) continue;
    if (!out.some((x) => linkKind(x) === k)) out.push(u); // one page per kind: the first GitHub link, not all the repos
  }
  return cleanLinks(out).slice(0, 8);
}

const plain = (h) => String(h).replace(/<(script|style|noscript|svg|title|template)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&#?\w+;/g, ' ').replace(/\s+/g, ' ').trim();
// The page's own words without its menus: a site's nav can fill the first 3000 characters (flisk.sh's does), and then
// the model never sees what the product does and writes generic copy.
export function mainText(html) {
  const m = /<main\b[\s\S]*?<\/main>/i.exec(html);
  const h = (m ? m[0] : html).replace(/<(nav|header|footer|aside|dialog|menu)\b[\s\S]*?<\/\1>/gi, ' ');
  return plain(h);
}
// Facts the copy must use: the product's name, its headings and its feature lines, in the site's own words.
export function siteFacts(html, title = '') {
  const og = /<meta[^>]+property=["']og:site_name["'][^>]*content=["']([^"']*)["']/i.exec(html)?.[1];
  const name = str(og || String(title).split(/\s[|:\u2013\u2014-]\s|:\s/)[0], 60);
  const body = (/<main\b[\s\S]*?<\/main>/i.exec(html)?.[0] || html).replace(/<(nav|header|footer|aside|dialog|menu)\b[\s\S]*?<\/\1>/gi, ' ');
  const uniq = (xs, n, max) => [...new Set(xs.map((x) => str(plain(x), max)).filter((x) => x.length >= 8 && x.split(' ').length >= 2))].slice(0, n);
  const headings = uniq([...body.matchAll(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map((m) => m[1]), 12, 120);
  const features = uniq([...body.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => m[1]).filter((x) => !/<a\b/i.test(x) || plain(x).split(' ').length > 6), 10, 160);
  return { name, headings, features };
}
export const factsText = (f) => !f ? '' : (f.name ? `\nProduct name: ${f.name}` : '') + (f.headings?.length ? `\nHeadings on the page: ${f.headings.join(' | ')}` : '') + (f.features?.length ? `\nFeature lines on the page: ${f.features.join(' | ')}` : '');

export async function readPage(url, fetchImpl) {
  try {
    const r = await fetchImpl(url, { headers: { accept: 'text/html', 'user-agent': 'FliskGrow/1.0 (+https://grow.flisk.si)' }, redirect: 'follow', signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const html = (await r.text()).slice(0, 300_000);
    const title = str(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1], 160);
    const desc = str(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i.exec(html)?.[1], 300);
    return { title, desc, body: mainText(html).slice(0, 3000), facts: siteFacts(html, title), links: profileLinks(html, url) };
  } catch { return null; }
}

export async function checkCitable(url, call) {
  try {
    const r = await call(CITABLE_URL + encodeURIComponent(url), { headers: { accept: 'application/json', 'user-agent': 'flisk-grow' }, signal: AbortSignal.timeout(20000) });
    const j = r.ok ? await r.json() : null;
    if (!j || typeof j.score !== 'number') return null;
    const fixes = (Array.isArray(j.checks) ? j.checks : []).filter((c) => c && (c.status === 'fail' || c.status === 'warn'))
      .slice(0, 3).map((c) => ({ title: str(c.title, 100), summary: str(c.summary, 220), status: c.status }));
    return { score: j.score, grade: str(j.grade, 2), fixes, report: `https://citable.flisk.si/${encodeURIComponent(new URL(url).host)}` };
  } catch { return null; }
}

// One model answer for the whole plan is about 2000 tokens, which the free model needs more than 60 s to write. Two
// smaller answers, asked at the same time, come back in about half the time.
const RULES = `Plain words, no emoji, no hashtags. If the page says little, guess from the link and say so in "product".
Be specific to THIS product: use its name and its real features, audience and words from the page facts (what it does,
for whom, what it replaces). Every email and post names at least one concrete thing the product does, taken from the
facts. Never invent a feature, a number or a customer. Write your own sentences; never use button labels or menu words.`;
// Who writes: the maker. Small models flip this and write as a buyer asking the maker about the product.
const VOICE = `You write AS THE MAKER of this product, never as a buyer, user, investor or fan of it. The maker made it and wants people to try it.`;
const BUYER = `The buyers are ONE narrow group you could find this week, with a job and a situation, for example "<role> who <does what> and <has which problem this week>", taken from who the page says it is for. Never a list like "makers, entrepreneurs, small business owners".`;
export const SYSTEM = `You help a maker find the first people who would pay for what they made. ${VOICE}
You get a link and the text of its page. Answer with ONE JSON object and nothing else:
{"product": "what it is, one short sentence",
 "buyers": "who would pay first: one narrow group, their job, the problem they have today (2 sentences)",
 "pitch": "one line a buyer would care about, no hype",
 "today": "the one step THE MAKER takes today to reach a first buyer, one sentence (never a step for the buyer, like signing up)",
 "queries": ["2 to 4 short search phrases (2-4 words) a buyer would write in a post when they have the problem"],
 "places": [{"name": "a real community, forum, subreddit, newsletter, event or group where those buyers are", "why": "why there", "url": "its address if you are sure, else empty"}]}
${BUYER}
Give 5 to 8 places. Only real places that match those buyers; never invent an address. A place is where BUYERS talk to
each other, never the maker's own pages (its repo, its Discord, its npm or Product Hunt page).
${RULES}`;
export const SYSTEM_POSTS = `You help a maker find the first people who would pay for what they made. ${VOICE}
You get a link and the text of its page. Answer with ONE JSON object and nothing else:
{"posts": [{"where": "X" | "Reddit" | "Hacker News" | "Discord", "title": "post title", "body": "the post in the maker's voice (I built ...), plain, under 60 words"}]}
Give 4 posts, one for each of X, Reddit, Hacker News and Discord; the Discord one is a friendly message for a show-your-work channel.
Do not put a subreddit name or a link in the post: the page adds the link.
${RULES}`;
export const SYSTEM_EMAILS = `You help a maker find the first people who would pay for what they made. ${VOICE}
The maker writes each email TO one person who has the problem the product solves. The reader has never heard of the product.
Never say the maker has followed, read, liked or know the reader's work or posts unless the maker's brief says so. Open with the reader's problem.
You get a link and the text of its page. Answer with ONE JSON object and nothing else:
{"emails": [{"to": "who to write to: a role in the narrow buyer group", "find": "where to find real people like THIS reader (the 'to' role) this week: a community, tag or search where that role talks about the problem, one sentence. It must fit the reader, never a place for makers to show their own projects", "subject": "short", "body": "a short plain email from the maker under 90 words: what you saw they are doing, what the product does for them, one small ask; sign it [your name]", "followup": "a 2 to 3 sentence follow-up from the maker to send 7 days later if there was no reply"}]}
Give 5 emails, each to a different kind of person in or close to the buyer group.
${BUYER}
${RULES}`;

// A link to a person's or brand's profile on a social network. Its page is behind a login, so it cannot be read and a
// "who would buy it" plan makes no sense: the goal there is followers.
const RESERVED = new Set(['home', 'i', 'search', 'explore', 'intent', 'share', 'login', 'signup', 'settings', 'messages', 'notifications', 'compose', 'hashtag', 'tos', 'privacy']);
const IG_RESERVED = new Set(['p', 'reel', 'reels', 'tv', 'stories', 'explore', 'accounts', 'direct', 'about', 'legal', 'developer', 'directory', 'web', 'api', 'press', 'privacy', 'terms']);
// Profile links on networks whose followers plan is not built yet (LinkedIn, YouTube, TikTok): the page says "coming
// soon" instead of making a "who would buy it" plan for a profile it cannot read.
export function soonNetwork(url) {
  try {
    const u = new URL(url); const h = u.hostname.toLowerCase().replace(/^(www|m|mobile)[.]/, ''); const [a = '', b = ''] = u.pathname.split('/').filter(Boolean);
    if (h === 'linkedin.com' && /^(in|company|school)$/i.test(a) && b) return 'LinkedIn';
    if ((h === 'youtube.com' && (/^@/.test(a) || (/^(c|channel|user)$/i.test(a) && b))) ) return 'YouTube';
    if (h === 'tiktok.com' && /^@/.test(a)) return 'TikTok';
    return '';
  } catch { return ''; }
}
export function profileOf(url) {
  try {
    const u = new URL(url);
    if (/^(www\.)?bsky\.app$/i.test(u.hostname)) {
      const [seg, handle = ''] = u.pathname.split('/').filter(Boolean);
      if (seg !== 'profile' || !/^[A-Za-z0-9][A-Za-z0-9.-]{0,251}[A-Za-z0-9]$/.test(handle) || !handle.includes('.')) return null;
      return { network: 'Bluesky', handle: handle.toLowerCase() };
    }
    if (/^(www\.)?instagram\.com$/i.test(u.hostname)) {
      const handle = u.pathname.split('/').filter(Boolean)[0] || '';
      if (!/^[A-Za-z0-9._]{1,30}$/.test(handle) || IG_RESERVED.has(handle.toLowerCase())) return null;
      return { network: 'Instagram', handle: handle.toLowerCase() };
    }
    if (!/^(www\.|mobile\.)?(x|twitter)\.com$/i.test(u.hostname)) return null;
    const handle = u.pathname.split('/').filter(Boolean)[0] || '';
    if (!/^[A-Za-z0-9_]{1,15}$/.test(handle) || RESERVED.has(handle.toLowerCase())) return null;
    return { network: 'X', handle };
  } catch { return null; }
}

export const followersSystem = (network = 'X') => {
  const name = network === 'X' ? 'X (Twitter)' : network;
  return FOLLOWERS_SYSTEM.replace('their X (Twitter) account', 'their ' + name + ' account').replace('an X post under 270', (network === 'X' ? 'an X' : 'a ' + network) + ' post under 270');
};
export const FOLLOWERS_SYSTEM = `You help a person grow the followers of their X (Twitter) account, with no ads and no bots.
You get the handle and, maybe, a line from the owner about what the account is for. You cannot open the profile.
If you do not know the account, build the plan from the handle and the owner's line, and say so in "account". Never invent facts about it.
Answer with ONE JSON object and nothing else:
{"account": "what the account is for, one short sentence",
 "audience": "who should follow it: a narrow group, what they care about, why they would follow (2 sentences)",
 "bio": "a bio under 160 characters that says who it is for and what they get",
 "pinned": "a pinned post under 270 characters that makes a stranger press Follow",
 "today": "the one step to take today, one sentence",
 "queries": ["2 to 4 short search phrases (2-4 words) the audience writes in posts, to find them and reply"],
 "accounts": [{"name": "a type of account to follow and reply to, or a real well-known account if you are sure", "why": "why its followers fit"}],
 "week": [{"day": "Day 1", "do": "one concrete task of about 20 minutes"}],
 "posts": [{"title": "angle, 3 to 6 words", "body": "an X post under 270 characters, plain"}],
 "replies": [{"to": "what kind of post to answer", "body": "a useful reply under 240 characters that adds something, no pitch"}]}
Give 5 accounts, 7 week days (Day 1 to Day 7), 10 posts, 5 replies. The posts mix: a short story, a useful tip, a plain opinion, a question, a result with numbers.
Plain words, no emoji, no hashtags, no "follow me" begging, no buying followers. Say what to do again every week after the first.`;

export function cleanFollowers(i, profile) {
  if (!i || typeof i !== 'object') return null;
  const accounts = (Array.isArray(i.accounts) ? i.accounts : []).slice(0, 8).map((a) => ({ name: str(a?.name, 80), why: str(a?.why, 200) })).filter((a) => a.name);
  const week = (Array.isArray(i.week) ? i.week : []).slice(0, 7).map((d, n) => ({ day: str(d?.day, 20) || 'Day ' + (n + 1), do: str(d?.do, 240) })).filter((d) => d.do);
  const posts = (Array.isArray(i.posts) ? i.posts : []).slice(0, 12).map((p) => ({ title: str(p?.title, 80), body: text(p?.body, 290) })).filter((p) => p.body);
  const replies = (Array.isArray(i.replies) ? i.replies : []).slice(0, 8).map((r) => ({ to: str(r?.to, 120), body: text(r?.body, 260) })).filter((r) => r.body);
  const audience = str(i.audience, 500);
  if (!audience || !posts.length || !week.length) return null;
  const queries = (Array.isArray(i.queries) ? i.queries : []).map((q) => str(q, 60)).filter((q) => q.length >= 3).slice(0, 4);
  return { kind: 'followers', network: profile.network, handle: profile.handle, account: str(i.account, 200), audience, bio: str(i.bio, 200), pinned: text(i.pinned, 300), today: str(i.today, 240), queries, accounts, week, posts, replies };
}

// Used when the free model is out of budget: the same shape, from a fixed playbook, so a profile link never dead-ends.
export function genericFollowers(profile, about = '') {
  const line = str(about, 120);
  const topic = line || 'what your account is about';
  return {
    kind: 'followers', generic: true, network: profile.network, handle: profile.handle,
    account: line ? 'An account about: ' + line : 'A general playbook. Press the button again tomorrow for a plan written for your account.',
    audience: 'People who have the problem your account talks about and read posts about ' + topic + ' every day. Pick one narrow group and write only for them.',
    bio: 'Who this is for, what they get from following, one proof. Under 160 characters, no emoji.',
    pinned: 'One post that says who the account is for, shows your best result or story, and ends with what you post each week.',
    today: 'Write the bio and pin one post that says who the account is for.',
    queries: line ? [str(line, 60)] : [],
    accounts: [
      { name: 'Accounts one size bigger than you in your topic', why: 'Their readers already want what you post. Reply under their posts first.' },
      { name: 'People who post questions about your topic', why: 'A useful answer gets read by everyone who follows them.' },
      { name: 'Small accounts that reply to everyone', why: 'They follow back people who help and the circle grows.' },
    ],
    week: [
      { day: 'Day 1', do: 'Write the bio, pick a clear photo and pin one post for one narrow group.' },
      { day: 'Day 2', do: 'Follow 20 accounts your group reads and reply usefully to 5 of their posts.' },
      { day: 'Day 3', do: 'Post one short story from your own work: what you tried, what happened.' },
      { day: 'Day 4', do: 'Answer 5 questions on your topic with something specific, no link.' },
      { day: 'Day 5', do: 'Post one tip someone can use in 5 minutes.' },
      { day: 'Day 6', do: 'Post a plain opinion about your topic and answer every reply.' },
      { day: 'Day 7', do: 'Look at your 3 best posts, write the next 3 in the same shape.' },
    ],
    posts: [
      { title: 'A short story', body: 'Last week I tried [one thing] on [your topic]. What I expected: [x]. What happened: [y]. What I do now: [z].' },
      { title: 'A useful tip', body: 'One thing that saves time on ' + topic + ': [the tip, in one or two lines]. It takes 5 minutes.' },
      { title: 'A plain opinion', body: 'Unpopular opinion on ' + topic + ': [your view]. Here is why: [one reason].' },
      { title: 'A question', body: 'People who work on ' + topic + ': what is the one thing that still wastes your week?' },
      { title: 'A result with numbers', body: 'This month: [number] [what you measured]. What moved it most: [one thing].' },
    ],
    replies: [
      { to: 'A post asking for help on your topic', body: 'What worked for me: [one specific step]. It helps because [reason]. Happy to say more.' },
      { to: 'A post from a bigger account in your topic', body: 'Adding one thing from my own work: [a real detail they did not say].' },
    ],
  };
}

// Used when the free model is out of budget: the real AI-search check and listings, plus a fixed playbook with blanks.
export function genericCustomers(url, page, check, site = '') {
  const live = site || url;
  let host = url; try { host = new URL(url).host; } catch { /* keep the link */ }
  const name = str(page?.title, 120) || host;
  return {
    generic: true, url, ...(site ? { site } : {}), product: name, queries: [],
    buyers: 'The model is out of budget today, so this is a general guide. Pick ONE narrow group who has the problem your product solves today, name their job, and write only for them.',
    pitch: 'For [who], [your product] does [one result] without [the pain they have now].',
    today: 'Write the one-line pitch above with real words and send it to 5 people who fit.',
    places: [
      { name: 'Reddit', why: 'Search for the subreddit where your buyers ask for help. Read the rules first.', url: 'https://www.reddit.com/' },
      { name: 'Hacker News', why: 'Developers and early adopters. Show HN fits a working product.', url: 'https://news.ycombinator.com/' },
      { name: 'Indie Hackers', why: 'Makers who share what they built and give feedback.', url: 'https://www.indiehackers.com/' },
      { name: 'dev.to', why: 'Developers read how-to posts; a short honest post about the problem works.', url: 'https://dev.to/' },
      { name: 'A newsletter your buyers read', why: 'Write to its author with one useful fact and one small ask.', url: '' },
    ],
    emails: [
      { to: 'Someone who has the problem', subject: 'Quick question about [their problem]', body: 'Hi [name],\n\nI saw you [what they did or wrote]. I made ' + name + ' to [one result]. Would you try it and tell me the one thing that is missing?\n\nThanks,\n[your name]' },
      { to: 'The author of a newsletter your buyers read', subject: 'A tool for your readers: ' + name, body: 'Hi [name],\n\nYour readers [have this problem]. ' + name + ' [does one result]. If it fits, I can write a short note for them.\n\n[your name]' },
    ],
    posts: [
      { where: 'X', title: 'Launch post', body: 'I built ' + name + ' for [who]. It [one result]. Try it and tell me what is missing: ' + live },
      { where: 'Reddit', title: 'I built a tool for [problem]', body: 'I kept hitting [problem], so I made ' + name + '. It [one result]. I would like honest feedback.' },
      { where: 'Hacker News', title: 'Show HN: ' + name, body: 'What it is, why I built it, and what I want feedback on, in three short lines.' },
      { where: 'Discord', title: 'Show your work', body: 'Hi all, I built ' + name + ' for [who]. It [one result]. Link: ' + live + '. What would you change?' },
    ],
    check, listings: listingsFor(url), promo: PROMO, tools: TOOLS,
  };
}

export function parseJson(s) {
  const t = String(s ?? '').replace(/```(?:json)?/g, '');
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  const j = t.slice(a, b + 1);
  try { return JSON.parse(j); } catch {}
  // Small models write line breaks and tabs inside strings, and trailing commas: repair those and try once more.
  let fixed = '', inStr = false, esc = false;
  for (const ch of j) {
    if (inStr && !esc && (ch === '\n' || ch === '\r' || ch === '\t')) { fixed += ch === '\t' ? '\\t' : ch === '\n' ? '\\n' : ''; continue; }
    if (ch === '"' && !esc) inStr = !inStr;
    esc = inStr && !esc && ch === '\\';
    fixed += ch;
  }
  try { return JSON.parse(fixed.replace(/,(\s*[}\]])/g, '$1')); } catch { return null; }
}

// The model names a subreddit it made up ("r/WeAreTheMusicMakers: ...") or pastes a link; the page picks the place
// (checked subreddits in PROMO) and adds the product's own link, so both come out of the draft.
export const unsub = (t) => String(t).replace(/^\s*[/]?r[/]\w+\s*[:\-|]\s*/i, '').trim();
export const unlink = (t) => String(t).replace(/\s*https?:[/][/]\S+/g, '').trim();
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www[.]/, '').toLowerCase(); } catch { return ''; } };
// A link that is the maker's own: the same page as one of theirs, or anything on the product's own site.
export function isOwn(u, own) {
  const k = linkKey(u), h = hostOf(u);
  return own.some((o) => { const ok = linkKey(o); return k === ok || k.startsWith(ok + '/') || (linkKind(o) === 'Other' && h && h === hostOf(o)); });
}
// Keep only what the page can draw safely. Returns null when the model gave too little to be useful.
// `own` is the maker's own links (the product, its repo, its Discord ...): those are not places to find buyers.
export function cleanPlan(i, own = []) {
  if (!i || typeof i !== 'object') return null;
  // The url stays raw until cleanPlaces: it splits glued subreddits before anything is thrown away.
  const places = cleanPlaces((Array.isArray(i.places) ? i.places : []).slice(0, 10)
    .map((p) => ({ name: str(p?.name, 80), why: str(p?.why, 200), url: String(p?.url ?? '').trim().slice(0, 300) })).filter((p) => p.name))
    .filter((p) => !p.url || !isOwn(p.url, own));
  let emails = (Array.isArray(i.emails) ? i.emails : []).slice(0, 8)
    .map((e) => ({ to: str(e?.to, 80), find: str(e?.find, 240), subject: str(e?.subject, 120), body: text(e?.body, 1500), followup: text(e?.followup, 800) })).filter((e) => e.subject && e.body);
  const posts = (Array.isArray(i.posts) ? i.posts : []).slice(0, 6)
    .map((p) => ({ where: ['X', 'Reddit', 'Hacker News', 'Discord'].includes(p?.where) ? p.where : 'X', title: unsub(str(p?.title, 120)), body: unlink(text(p?.body, 600)) }))
    .filter((p) => p.title || p.body);
  const buyers = str(i.buyers, 500);
  if (!buyers || !places.length || !emails.length) return null;
  emails = tieFinds(emails, places, buyers);
  const queries = (Array.isArray(i.queries) ? i.queries : []).map((q) => str(q, 60)).filter((q) => q.length >= 3).slice(0, 4);
  return { product: str(i.product, 200), queries, buyers, pitch: str(i.pitch, 200), today: str(i.today, 240), places, emails, posts };
}

// What the maker tells us before the plan: who it is for, the price, their name. Each answer is optional.
export function cleanBrief(b) {
  if (!b || typeof b !== 'object') return null;
  const out = {}; for (const k of ['who', 'price', 'name']) { const v = str(b[k], k === 'name' ? 60 : 160); if (v) out[k] = v; }
  return Object.keys(out).length ? out : null;
}
export const briefLine = (b) => !b ? '' : '\nThe maker says:' + (b.who ? ` it is for ${b.who}.` : '') + (b.price ? ` Price: ${b.price}.` : '') + (b.name ? ` The maker's name: ${b.name}; sign emails with it.` : '') + (b.who ? ' Use that group as the buyers.' : '');
// The model writes "[your name]" however it is told; with a name given, put it in.
export function signEmails(emails, name) {
  if (!name) return;
  // Without the placeholder the model often leaves the email unsigned: then the name goes on its own last line.
  for (const e of emails) for (const k of ['body', 'followup']) if (e[k]) { e[k] = e[k].replace(/\[\s*your name\s*\]/gi, name); if (!e[k].includes(name)) e[k] = e[k].trimEnd() + '\n\n' + name; }
}

// Rewrite one email, post or place in a saved plan, keeping the rest. The model sees the plan's buyers and the item
// it is replacing, and writes one new item in the same shape.
export const REWRITE = {
  email: { field: 'emails', shape: '{"to": "...", "find": "...", "subject": "...", "body": "... under 90 words, sign it [your name]", "followup": "..."}', ask: 'Write ONE new email from the maker to a different person in the buyer group, with a new angle.' },
  post: { field: 'posts', shape: '{"where": "<same place>", "title": "...", "body": "the post in the maker\'s voice, under 60 words, no subreddit and no link"}', ask: 'Write ONE new post for the same place, with a different angle.' },
  place: { field: 'places', shape: '{"name": "...", "why": "...", "url": "its address if you are sure, else empty"}', ask: 'Give ONE different real place where these buyers talk, not one already in the plan.' },
};
// Ready-made changes a maker can ask for on one email or post. Each key is what the card's menu sends.
export const TWEAKS = {
  polite: 'make it more polite and warm',
  formal: 'make it more formal and professional',
  friendly: 'make it friendlier and more casual, like a message to a peer',
  shorter: 'make it shorter: cut every sentence that is not needed',
  direct: 'make it more direct: lead with the point and the ask',
  links: 'add one or two relevant links in the text, the product link first',
  question: 'end with one clear, easy-to-answer question',
  confident: 'make it more confident, with one concrete result or number if the page gives one',
};
export async function rewriteItem(plan, kind, index, { model, key, note = '', tweak = '' }) {
  const r = REWRITE[kind]; const list = plan?.[r?.field];
  if (!r || !Array.isArray(list) || !list[index]) return { error: 'no such item' };
  const system = `You help a maker find the first people who would pay for what they made. ${VOICE}
${tweak ? `Edit the item below, do not write a new one. Copy every field of it unchanged ("to", "find", "where", "title", "subject", "followup", "url") except the "body" text, and in the body keep every fact and the same reader. Change only this: ${tweak}.` : r.ask} Answer with ONE JSON object and nothing else: {"item": ${r.shape}}
${RULES}`;
  const user = `Link: ${plan.url}\nProduct: ${plan.product || ''}\nBuyers: ${plan.buyers || ''}${briefLine(plan.brief)}${kind === 'place' ? '\nPlaces already in the plan: ' + list.map((x) => x.name).join(', ') : ''}\nThe item to replace: ${JSON.stringify(list[index])}${note && !tweak ? '\nThe maker asks: ' + str(note, 200) : ''}`;
  let j;
  try {
    const res = await model('https://inference.flisk.si/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: JSON.stringify({ model: MODEL, temperature: 0.8, max_tokens: 600, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }), signal: AbortSignal.timeout(MODEL_TIMEOUT_MS) });
    if (!res.ok) return { error: 'model', message: `model answered ${res.status}` };
    j = parseJson((await res.json())?.choices?.[0]?.message?.content);
  } catch (e) { return { error: 'model', message: str(e?.message, 200) }; }
  const raw = j?.item;
  if (kind === 'post' && raw) raw.where = list[index].where;
  // cleanPlan does the cleaning; give it a minimal plan around the one item.
  const one = cleanPlan({ buyers: plan.buyers || 'x', places: kind === 'place' ? [raw] : plan.places?.length ? plan.places : [{ name: 'x' }], emails: kind === 'email' ? [raw] : [{ subject: 'x', body: 'x' }], posts: kind === 'post' ? [raw] : [] });
  const item = one?.[r.field]?.[0];
  if (!item) return { error: 'model', message: 'the model did not give a usable item' };
  if (kind === 'email' && plan.brief?.name) signEmails([item], plan.brief.name);
  return { item };
}

// The whole plan. `model` and `citable` are fetch-like functions (service bindings in production).
export async function makePlan(url, opts) {
  const out = await makePlanFor(url, opts);
  for (const p of [out.plan, out.fallback]) if (p && p.kind !== 'followers') p.links = out.links || [];
  delete out.links;
  return out;
}
// The product's own website when the link is a GitHub repo: the repo's homepage field, else a non-profile link the
// maker gave. '' when there is none. The AI-search check and the post links use it, since nobody can fix github.com.
export async function repoSite(repo, given, fetchImpl) {
  const own = (given || []).find((u) => linkKind(u) === 'Other');
  if (own) return own;
  try {
    const r = await fetchImpl('https://api.github.com/repos/' + repo, { headers: { accept: 'application/vnd.github+json', 'user-agent': 'flisk-grow' }, signal: AbortSignal.timeout(6000) });
    const h = r.ok ? httpUrl((await r.json())?.homepage) : '';
    return h && linkKind(h) === 'Other' ? h : '';
  } catch { return ''; }
}
async function makePlanFor(url, { fetch: fetchImpl, model, citable, key, about: ownerLine = '', links: given = [], brief: rawBrief = null }) {
  const brief = cleanBrief(rawBrief);
  const profile = profileOf(url);
  const repo = profile ? '' : githubRepo(url);
  const site = repo ? await repoSite(repo, cleanLinks(given, url), fetchImpl) : '';
  // Everything starts at once: Citable runs beside the model calls instead of holding them back. A repo with no
  // website of its own gets no check: the score would be github.com's.
  const checking = profile || (repo && !site) ? Promise.resolve(null) : checkCitable(site || url, citable || fetchImpl);
  const page = profile ? null : await readPage(url, fetchImpl);
  const about = profile
    ? `Handle: @${profile.handle}\nOwner says: ${str(ownerLine, 300) || '(nothing)'}`
    : page ? `Title: ${page.title}\nDescription: ${page.desc}\nText: ${page.body}` : '(the page could not be read)';
  // Links the maker gave first, then the profiles the page itself links to.
  const links = profile ? [] : cleanLinks([...given, ...(page?.links || [])], url);
  const others = (links.length ? `\nThe maker's other pages: ${links.map((u) => linkKind(u) + ' ' + u).join(', ')}` : '') + (site ? `\nThe product's website: ${site}` : '') + briefLine(brief);
  const ask = (system) => model('https://inference.flisk.si/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: MODEL, temperature: 0.4, max_tokens: profile ? 3500 : 1400, messages: [{ role: 'system', content: system }, { role: 'user', content: `Link: ${url}\n${about}${factsText(page?.facts)}${others}` }] }),
    signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
  });
  let rs;
  try {
    rs = await Promise.all((profile ? [followersSystem(profile.network)] : [SYSTEM, SYSTEM_EMAILS, SYSTEM_POSTS]).map(ask));
  } catch (e) {
    const check = await checking;
    const timeout = e?.name === 'TimeoutError' || e?.name === 'AbortError';
    return { error: timeout ? 'timeout' : 'model', message: str(e?.message, 300) || 'model call failed', ...(timeout && !profile ? { fallback: genericCustomers(url, page, check, site) } : {}), links };
  }
  const check = await checking;
  const js = await Promise.all(rs.map((r) => r.json().catch(() => null)));
  const bad = rs.findIndex((r) => !r.ok);
  if (bad >= 0) {
    const msg = str(js[bad]?.error?.message, 300);
    const busy = /daily|budget|limit/i.test(msg);
    return { error: busy ? 'busy' : 'model', message: msg || `model answered ${rs[bad].status}`, ...(busy && !profile ? { fallback: genericCustomers(url, page, check, site) } : {}), links };
  }
  const parts = js.map((j) => parseJson(j?.choices?.[0]?.message?.content));
  const raw = parts.length > 1 ? (parts.every(Boolean) ? { ...parts[0], emails: parts[1].emails, posts: parts[2].posts } : null) : parts[0];
  if (profile) {
    const f = cleanFollowers(raw, profile);
    return f ? { plan: { url, ...f, tools: TOOLS } } : { error: 'model', message: 'the model did not give a usable plan' };
  }
  const plan = cleanPlan(raw, [url, site, ...links].filter(Boolean));
  if (!plan) return { error: 'model', message: 'the model did not give a usable plan' };
  // A made-up address that does not open loses its link; an email that pointed there gets another place.
  const had = plan.places.map((p) => p.url);
  await checkPlaceLinks(plan.places, fetchImpl);
  for (const e of plan.emails) if (e.place != null && had[e.place] && !plan.places[e.place].url) { delete e.place; if (/^Look for people like this in /.test(e.find)) e.find = ''; }
  plan.emails = tieFinds(plan.emails, plan.places, plan.buyers);
  if (brief) signEmails(plan.emails, brief.name);
  // Hacker News has its own post draft; listing it again under Get listed sends the maker there twice.
  const listings = plan.posts.some((p) => p.where === 'Hacker News') ? listingsFor(url).filter((l) => !/hacker news/i.test(l.name)) : listingsFor(url);
  return { plan: { url, ...(site ? { site } : {}), ...(repo && !site ? { noSite: true } : {}), ...(brief ? { brief } : {}), ...plan, check, listings, promo: PROMO, tools: TOOLS }, links };
}
