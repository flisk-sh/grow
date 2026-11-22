// Real click map: where people click on the home and plan pages, and what they click.
// Anonymous: no IP, no cookie, no plan id; a tick box or a field is stored by its kind, never its text.
const DAY_MS = 864e5;
const PAGES = new Set(['home', 'plan']);
const DEVS = new Set(['mobile', 'desktop']);
const str = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n);
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function clicks(req, env) {
  const url = new URL(req.url);
  if (url.pathname !== '/api/clicks') return null;
  if (req.method === 'POST') {
    let b; try { b = JSON.parse(await req.text()); } catch { return json(400, { error: 'Send JSON' }); }
    const page = str(b?.page, 10), dev = str(b?.dev, 10);
    if (!PAGES.has(page) || !DEVS.has(dev) || !Array.isArray(b?.clicks)) return json(400, { error: 'page, dev and clicks are needed' });
    const day = new Date().toISOString().slice(0, 10);
    const cap = Number(env.CLICKS_PER_DAY) || 20000;
    const list = b.clicks.slice(0, 30).map((c) => ({ x: Math.round(Number(c?.x) * 100), y: Math.round(Number(c?.y)), k: c?.k === 'ctl' ? 'ctl' : 'dead', t: str(c?.t, 40) }))
      .filter((c) => c.x >= 0 && c.x <= 100 && c.y >= 0 && c.y < 100000);
    if (!list.length) return json(200, { ok: 0 });
    const row = await env.DB.prepare('SELECT n FROM days WHERE day = ?').bind('clicks:' + day).first();
    if ((row?.n || 0) + list.length > cap) return json(200, { ok: 0, full: true });
    await env.DB.batch([
      env.DB.prepare('INSERT INTO days (day, n) VALUES (?, ?) ON CONFLICT(day) DO UPDATE SET n = n + ?').bind('clicks:' + day, list.length, list.length),
      ...list.map((c) => env.DB.prepare('INSERT INTO clicks (day, page, dev, x, y, kind, target) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(day, page, dev, c.x, c.y, c.k, c.t)),
    ]);
    return json(200, { ok: list.length });
  }
  if (req.method === 'GET') {
    const page = PAGES.has(url.searchParams.get('page')) ? url.searchParams.get('page') : 'plan';
    const dev = DEVS.has(url.searchParams.get('dev')) ? url.searchParams.get('dev') : 'mobile';
    const days = Math.min(30, Math.max(1, Number(url.searchParams.get('days')) || 7));
    const since = new Date(Date.now() - (days - 1) * DAY_MS).toISOString().slice(0, 10);
    const q = (sql) => env.DB.prepare(sql).bind(page, dev, since).all().then((r) => r.results);
    const [targets, cells, total] = await Promise.all([
      q('SELECT target, kind, COUNT(*) AS n FROM clicks WHERE page = ? AND dev = ? AND day >= ? GROUP BY target, kind ORDER BY n DESC LIMIT 40'),
      q('SELECT x / 5 AS cx, y / 50 AS cy, COUNT(*) AS n FROM clicks WHERE page = ? AND dev = ? AND day >= ? GROUP BY cx, cy'),
      q("SELECT COUNT(*) AS n, SUM(kind = 'dead') AS dead FROM clicks WHERE page = ? AND dev = ? AND day >= ?"),
    ]);
    return json(200, { page, dev, since, clicks: total[0]?.n || 0, dead: total[0]?.dead || 0, targets, cells: cells.map((c) => ({ x: c.cx * 5, y: c.cy * 50, n: c.n })) });
  }
  return json(405, { error: 'GET or POST' });
}
