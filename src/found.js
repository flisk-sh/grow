// Finds where a site is already listed, so the cabinet can fill "Where you listed it" by itself.
// Hacker News through its public search; directories by opening the likely page and keeping it only
// when the page names the site's domain. Product Hunt, AlternativeTo and BetaList block servers, so
// those stay manual.

const UA = 'Mozilla/5.0 (compatible; FliskGrow/1.0; +https://grow.flisk.si)';
const PROBES = [
  { place: 'SaaSHub', url: (s) => `https://www.saashub.com/${s}` },
  { place: 'Toolradar', url: (s) => `https://toolradar.com/tools/${s}` },
  { place: 'Uneed', url: (s) => `https://www.uneed.best/tool/${s}` },
  { place: 'DevHunt', url: (s) => `https://devhunt.org/tool/${s}` },
];

export function siteName(url) {
  try { const h = new URL(url).hostname.replace(/^www\./, ''); return { host: h, name: h.split('.')[0] }; } catch { return { host: '', name: '' }; }
}

async function text(fetchImpl, url) {
  try {
    const r = await fetchImpl(url, { headers: { 'user-agent': UA, accept: 'text/html,application/json' }, redirect: 'follow', signal: AbortSignal.timeout(8000) });
    return r.ok ? await r.text() : '';
  } catch { return ''; }
}

export async function findHN(name, host, fetchImpl) {
  if (!name) return null;
  const raw = await text(fetchImpl, `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(name)}&tags=story&typoTolerance=false&hitsPerPage=30`);
  let hits = [];
  try { hits = JSON.parse(raw).hits || []; } catch { /* no hits */ }
  const word = new RegExp(`(^|[^a-z0-9])${name.replace(/[^a-z0-9-]/gi, '')}($|[^a-z0-9])`, 'i');
  const hit = hits.find((h) => { const u = String(h.url || '').toLowerCase(); return u.includes(host) || u.includes(`github.com/${name}`); })
    || hits.find((h) => /^Show HN/i.test(h.title || '') && word.test(h.title || ''));
  return hit ? { place: 'Hacker News (Show HN)', link: `https://news.ycombinator.com/item?id=${hit.objectID}` } : null;
}

export async function findListings(siteUrl, { fetch: fetchImpl } = {}) {
  const { host, name } = siteName(siteUrl);
  if (!name) return [];
  const slugs = [...new Set([name, `${name}-cli`, `${name}-sh`, host.replace(/\./g, '-')])];
  const probe = async (p) => {
    for (const s of slugs) {
      const u = p.url(s);
      if ((await text(fetchImpl, u)).toLowerCase().includes(host)) return { place: p.place, link: u };
    }
    return null;
  };
  return (await Promise.all([findHN(name, host, fetchImpl), ...PROBES.map(probe)])).filter(Boolean);
}
