// A company logo before every name, from the Worker's own /logo/<host> (fetched once and cached, so visitors only talk to grow.flisk.si).
export const HOSTS = { instagram: 'instagram.com', tiktok: 'tiktok.com', 'hacker news': 'news.ycombinator.com', 'show hn': 'news.ycombinator.com', bluesky: 'bsky.app', github: 'github.com', reddit: 'reddit.com', 'product hunt': 'producthunt.com', saashub: 'saashub.com', alternativeto: 'alternativeto.net', betalist: 'betalist.com', toolradar: 'toolradar.com', uneed: 'uneed.best', devhunt: 'devhunt.org', foundrlist: 'foundrlist.com', launchamp: 'launchamp.eu', toolpotion: 'toolpotion.ai', aichief: 'aichief.com', sourceforge: 'sourceforge.net', x: 'x.com', twitter: 'x.com', linkedin: 'linkedin.com', 'indie hackers': 'indiehackers.com', 'dev.to': 'dev.to', discord: 'discord.com', youtube: 'youtube.com', 'stack overflow': 'stackoverflow.com', medium: 'medium.com', slack: 'slack.com', mastodon: 'joinmastodon.org', lobsters: 'lobste.rs', chatgpt: 'chatgpt.com', claude: 'claude.ai', perplexity: 'perplexity.ai', gmail: 'mail.google.com', citable: 'citable.flisk.si', 'readme score': 'readme.flisk.si', ranker: 'ranker.flisk.si', 'jobs.flisk.si': 'jobs.flisk.si', flisk: 'flisk.si' };

export function logoHost(name, url) {
  const n = String(name || '').toLowerCase().trim();
  const k = Object.keys(HOSTS).find((x) => n === x || n.startsWith(x + ' ') || n.startsWith(x + ' ·') || (n.startsWith('r/') && x === 'reddit') || (n.startsWith('reddit') && x === 'reddit'));
  if (k) return HOSTS[k];
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

export function Logo({name, url, size = 20}) {
  const h = logoHost(name, url);
  const fallback = <span className="logo logo-fb" style={{width: size, height: size}}>{String(name || '?')[0].toUpperCase()}</span>;
  if (!h) return fallback;
  return <img className="logo" src={'/logo/' + h} alt="" width={size} height={size} loading="lazy"
    onError={(e) => { e.currentTarget.replaceWith(Object.assign(document.createElement('span'), {className: 'logo logo-fb', textContent: String(name || '?')[0].toUpperCase()})); }} />;
}

// A sentence with every company or site it names shown with its logo, so no name stands alone. Other values pass through.
const AMBIGUOUS = new Set(['medium', 'x']);
const NAME_RE = new RegExp('\\b(?:' + Object.keys(HOSTS).filter((k) => !AMBIGUOUS.has(k)).sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b|\\b[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.(?:si|sh|com|io|dev|app|ai|net|org)\\b|\\bX\\b', 'gi');
export function Names({text}) {
  if (typeof text !== 'string') return text ?? null;
  const out = []; let last = 0; let m; NAME_RE.lastIndex = 0;
  while ((m = NAME_RE.exec(text))) {
    // A lone lower-case "x" is the letter, not the network.
    if (m[0].toLowerCase() === 'x' && m[0] !== 'X') continue;
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<span key={m.index} className="co-name"><Logo name={m[0]} url={m[0].includes('.') ? 'https://' + m[0] : ''} size={14} />{m[0]}</span>);
    last = m.index + m[0].length;
  }
  if (!out.length) return text;
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
