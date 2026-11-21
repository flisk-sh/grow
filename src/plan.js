// One growth plan for one link: read the page, ask the free model who would buy and where they are, check whether AI
// search can read the page (Citable), and add the places to list it. Nothing here sends a message for anyone.

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
      const r = await ai.run(FAST_MODEL, { messages: req.messages, max_tokens: req.max_tokens, temperature: req.temperature });
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
  { name: 'SourceForge', why: 'Mirrors your releases and lists the project for people browsing open source.', url: 'https://sourceforge.net/create/' },
];

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

export async function readPage(url, fetchImpl) {
  try {
    const r = await fetchImpl(url, { headers: { accept: 'text/html', 'user-agent': 'FliskGrow/1.0 (+https://grow.flisk.si)' }, redirect: 'follow', signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const html = (await r.text()).slice(0, 300_000);
    const title = str(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1], 160);
    const desc = str(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i.exec(html)?.[1], 300);
    const body = html.replace(/<(script|style|noscript|svg|title)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#?\w+;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000);
    return { title, desc, body, links: profileLinks(html, url) };
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
const RULES = `Plain words, no emoji, no hashtags. If the page says little, guess from the link and say so in "product".`;
export const SYSTEM = `You help a maker find the first people who would pay for what they made.
You get a link and the text of its page. Answer with ONE JSON object and nothing else:
{"product": "what it is, one short sentence",
 "buyers": "who would pay first: a narrow group, their job, the problem they have today (2 sentences)",
 "pitch": "one line a buyer would care about, no hype",
 "today": "the one step to take today, one sentence",
 "queries": ["2 to 4 short search phrases (2-4 words) a buyer would write in a post when they have the problem"],
 "places": [{"name": "a real community, forum, subreddit, newsletter, event or group where those buyers are", "why": "why there", "url": "its address if you are sure, else empty"}]}
Give 5 to 8 places. Only real places; never invent an address.
${RULES}`;
export const SYSTEM_POSTS = `You help a maker find the first people who would pay for what they made.
You get a link and the text of its page. Answer with ONE JSON object and nothing else:
{"posts": [{"where": "X" | "Reddit" | "Hacker News" | "Discord", "title": "post title", "body": "the post, plain, under 60 words"}]}
Give 4 posts, one for each of X, Reddit, Hacker News and Discord; the Discord one is a friendly message for a show-your-work channel.
${RULES}`;
export const SYSTEM_EMAILS = `You help a maker find the first people who would pay for what they made.
You get a link and the text of its page. Answer with ONE JSON object and nothing else:
{"emails": [{"to": "who to write to (a role, not a made-up name)", "subject": "short", "body": "a short plain email under 90 words: why them, what it does for them, one small ask; sign it [your name]"}]}
Give 5 emails, each to a different kind of person who would pay first.
${RULES}`;

// A link to a person's or brand's profile on a social network. Its page is behind a login, so it cannot be read and a
// "who would buy it" plan makes no sense: the goal there is followers.
const RESERVED = new Set(['home', 'i', 'search', 'explore', 'intent', 'share', 'login', 'signup', 'settings', 'messages', 'notifications', 'compose', 'hashtag', 'tos', 'privacy']);
export function profileOf(url) {
  try {
    const u = new URL(url);
    if (/^(www\.)?bsky\.app$/i.test(u.hostname)) {
      const [seg, handle = ''] = u.pathname.split('/').filter(Boolean);
      if (seg !== 'profile' || !/^[A-Za-z0-9][A-Za-z0-9.-]{0,251}[A-Za-z0-9]$/.test(handle) || !handle.includes('.')) return null;
      return { network: 'Bluesky', handle: handle.toLowerCase() };
    }
    if (!/^(www\.|mobile\.)?(x|twitter)\.com$/i.test(u.hostname)) return null;
    const handle = u.pathname.split('/').filter(Boolean)[0] || '';
    if (!/^[A-Za-z0-9_]{1,15}$/.test(handle) || RESERVED.has(handle.toLowerCase())) return null;
    return { network: 'X', handle };
  } catch { return null; }
}

export const followersSystem = (network = 'X') => FOLLOWERS_SYSTEM.replace('their X (Twitter) account', network === 'Bluesky' ? 'their Bluesky account' : 'their X (Twitter) account').replace('an X post under 270', (network === 'Bluesky' ? 'a Bluesky post under 270' : 'an X post under 270'));
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
export function genericCustomers(url, page, check) {
  let host = url; try { host = new URL(url).host; } catch { /* keep the link */ }
  const name = str(page?.title, 120) || host;
  return {
    generic: true, url, product: name, queries: [],
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
      { where: 'X', title: 'Launch post', body: 'I built ' + name + ' for [who]. It [one result]. Try it and tell me what is missing: ' + url },
      { where: 'Reddit', title: 'I built a tool for [problem]', body: 'I kept hitting [problem], so I made ' + name + '. It [one result]. I would like honest feedback.' },
      { where: 'Hacker News', title: 'Show HN: ' + name, body: 'What it is, why I built it, and what I want feedback on, in three short lines.' },
      { where: 'Discord', title: 'Show your work', body: 'Hi all, I built ' + name + ' for [who]. It [one result]. Link: ' + url + '. What would you change?' },
    ],
    check, listings: LISTINGS, promo: PROMO, tools: TOOLS,
  };
}

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
  const posts = (Array.isArray(i.posts) ? i.posts : []).slice(0, 6)
    .map((p) => ({ where: ['X', 'Reddit', 'Hacker News', 'Discord'].includes(p?.where) ? p.where : 'X', title: str(p?.title, 120), body: text(p?.body, 600) }))
    .filter((p) => p.title || p.body);
  const buyers = str(i.buyers, 500);
  if (!buyers || !places.length || !emails.length) return null;
  const queries = (Array.isArray(i.queries) ? i.queries : []).map((q) => str(q, 60)).filter((q) => q.length >= 3).slice(0, 4);
  return { product: str(i.product, 200), queries, buyers, pitch: str(i.pitch, 200), today: str(i.today, 240), places, emails, posts };
}

// The whole plan. `model` and `citable` are fetch-like functions (service bindings in production).
export async function makePlan(url, opts) {
  const out = await makePlanFor(url, opts);
  for (const p of [out.plan, out.fallback]) if (p && p.kind !== 'followers') p.links = out.links || [];
  delete out.links;
  return out;
}
async function makePlanFor(url, { fetch: fetchImpl, model, citable, key, about: ownerLine = '', links: given = [] }) {
  const profile = profileOf(url);
  // Everything starts at once: Citable runs beside the model calls instead of holding them back.
  const checking = profile ? Promise.resolve(null) : checkCitable(url, citable || fetchImpl);
  const page = profile ? null : await readPage(url, fetchImpl);
  const about = profile
    ? `Handle: @${profile.handle}\nOwner says: ${str(ownerLine, 300) || '(nothing)'}`
    : page ? `Title: ${page.title}\nDescription: ${page.desc}\nText: ${page.body}` : '(the page could not be read)';
  // Links the maker gave first, then the profiles the page itself links to.
  const links = profile ? [] : cleanLinks([...given, ...(page?.links || [])], url);
  const others = links.length ? `\nThe maker's other pages: ${links.map((u) => linkKind(u) + ' ' + u).join(', ')}` : '';
  const ask = (system) => model('https://inference.flisk.si/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: MODEL, temperature: 0.4, max_tokens: profile ? 3500 : 1400, messages: [{ role: 'system', content: system }, { role: 'user', content: `Link: ${url}\n${about}${others}` }] }),
    signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
  });
  let rs;
  try {
    rs = await Promise.all((profile ? [followersSystem(profile.network)] : [SYSTEM, SYSTEM_EMAILS, SYSTEM_POSTS]).map(ask));
  } catch (e) {
    const check = await checking;
    const timeout = e?.name === 'TimeoutError' || e?.name === 'AbortError';
    return { error: timeout ? 'timeout' : 'model', message: str(e?.message, 300) || 'model call failed', ...(timeout && !profile ? { fallback: genericCustomers(url, page, check) } : {}), links };
  }
  const check = await checking;
  const js = await Promise.all(rs.map((r) => r.json().catch(() => null)));
  const bad = rs.findIndex((r) => !r.ok);
  if (bad >= 0) {
    const msg = str(js[bad]?.error?.message, 300);
    const busy = /daily|budget|limit/i.test(msg);
    return { error: busy ? 'busy' : 'model', message: msg || `model answered ${rs[bad].status}`, ...(busy && !profile ? { fallback: genericCustomers(url, page, check) } : {}), links };
  }
  const parts = js.map((j) => parseJson(j?.choices?.[0]?.message?.content));
  const raw = parts.length > 1 ? (parts.every(Boolean) ? { ...parts[0], emails: parts[1].emails, posts: parts[2].posts } : null) : parts[0];
  if (profile) {
    const f = cleanFollowers(raw, profile);
    return f ? { plan: { url, ...f, tools: TOOLS } } : { error: 'model', message: 'the model did not give a usable plan' };
  }
  const plan = cleanPlan(raw);
  if (!plan) return { error: 'model', message: 'the model did not give a usable plan' };
  return { plan: { url, ...plan, check, listings: LISTINGS, promo: PROMO, tools: TOOLS }, links };
}
