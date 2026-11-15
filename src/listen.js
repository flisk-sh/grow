// Social listening: find posts from the last weeks where people talk about the problem a site solves.
// Free public search only: Hacker News (Algolia), Bluesky (public AppView) and GitHub issues. Reddit blocks
// servers, so the cabinet gives a Reddit search link instead. Nothing is posted for anyone.

const UA = 'FliskGrow/1.0 (+https://grow.flisk.si)';
const clip = (v, n) => String(v ?? '').replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim().slice(0, n);

// Up to 4 short phrases from a comma or line separated string.
export function parseKeywords(s) {
  return [...new Set(String(s ?? '').split(/[,\n]/).map((k) => k.replace(/[^\p{L}\p{N} .+#-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)).filter((k) => k.length >= 3))].slice(0, 4);
}

async function getJson(fetchImpl, url, headers = {}) {
  try {
    const r = await fetchImpl(url, { headers: { accept: 'application/json', 'user-agent': UA, ...headers }, signal: AbortSignal.timeout(8000) });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

export async function searchHN(q, since, fetchImpl) {
  const j = await getJson(fetchImpl, `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(q)}&tags=(story,comment)&hitsPerPage=30&typoTolerance=false&numericFilters=created_at_i>${Math.floor(since / 1000)}`);
  return (j?.hits || []).map((h) => ({
    source: 'Hacker News',
    url: `https://news.ycombinator.com/item?id=${h.objectID}`,
    title: clip(h.title || h.story_title || '', 160),
    text: clip(h.comment_text || h.story_text || h.title || '', 400),
    author: clip(h.author, 60),
    author_url: h.author ? `https://news.ycombinator.com/user?id=${encodeURIComponent(h.author)}` : '',
    at: (h.created_at_i || 0) * 1000,
  }));
}

export async function searchBluesky(q, since, fetchImpl) {
  const j = await getJson(fetchImpl, `https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(q)}&limit=15&sort=latest&since=${new Date(since).toISOString()}`);
  return (j?.posts || []).map((p) => {
    const handle = clip(p.author?.handle, 80);
    return {
      source: 'Bluesky',
      url: `https://bsky.app/profile/${handle}/post/${String(p.uri || '').split('/').pop()}`,
      title: '',
      text: clip(p.record?.text, 400),
      author: clip(p.author?.displayName || handle, 60),
      author_url: `https://bsky.app/profile/${handle}`,
      at: Date.parse(p.record?.createdAt || p.indexedAt) || 0,
    };
  }).filter((l) => l.text);
}

export async function searchGitHub(q, since, fetchImpl) {
  const day = new Date(since).toISOString().slice(0, 10);
  const j = await getJson(fetchImpl, `https://api.github.com/search/issues?q=${encodeURIComponent(`${q} in:title,body is:issue created:>${day}`)}&sort=created&order=desc&per_page=10`, { accept: 'application/vnd.github+json' });
  return (j?.items || []).map((i) => ({
    source: 'GitHub',
    url: i.html_url,
    title: clip(i.title, 160),
    text: clip(i.body, 400),
    author: clip(i.user?.login, 60),
    author_url: i.user?.html_url || '',
    at: Date.parse(i.created_at) || 0,
  }));
}

// A post counts only when every word of one phrase is in it as a whole word. Search engines also return
// near misses ("flisk" -> "flicker"), so this check runs on what comes back.
const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function mentions(lead, keywords) {
  const hay = `${lead.title} ${lead.text}`.toLowerCase();
  return keywords.some((k) => k.toLowerCase().split(' ').filter(Boolean).every((w) => new RegExp(`(^|[^\\p{L}\\p{N}])${esc(w)}($|[^\\p{L}\\p{N}])`, 'u').test(hay)));
}

// Your own posts and bots are not customers: drop authors you name, bots, and GitHub issues in repos
// whose owner is one you name (or starts with it, so "flisk" also drops flisk-sh).
export function notOwn(lead, { authors = [], owners = [] } = {}) {
  const a = String(lead.author).toLowerCase();
  if (/\[bot\]$|-bot$/.test(a) || authors.some((x) => x && x.toLowerCase() === a)) return false;
  const owner = lead.source === 'GitHub' ? (/^https:\/\/github\.com\/([^/]+)\//.exec(lead.url)?.[1] || '').toLowerCase() : '';
  return !(owner && owners.some((o) => o && (owner === o.toLowerCase() || owner.startsWith(`${o.toLowerCase()}-`))));
}

// All sources for all keywords, newest first, one row per post. Sources that fail just give nothing.
export async function listen(keywords, { fetch: fetchImpl, days = 14, now = Date.now(), exclude = {} } = {}) {
  const since = now - days * 864e5;
  const runs = keywords.flatMap((q) => [searchHN(q, since, fetchImpl), searchBluesky(q, since, fetchImpl), searchGitHub(q, since, fetchImpl)]);
  const seen = new Set();
  return (await Promise.all(runs)).flat()
    .filter((l) => l.url && l.at >= since && mentions(l, keywords) && notOwn(l, exclude) && !seen.has(l.url) && seen.add(l.url))
    .sort((a, b) => b.at - a.at)
    .slice(0, 60);
}

export const redditSearch = (keywords) => `https://www.reddit.com/search/?q=${encodeURIComponent(keywords.map((k) => `"${k}"`).join(' OR '))}&sort=new&t=week`;
