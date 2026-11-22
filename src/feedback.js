// What people say about each item of a plan: a thumbs up or down, and after they tick it, whether it worked (a reply,
// a signup, upvotes, or nothing yet). Stored per plan item, read back only as counts per kind of item, so we learn
// which suggestions are bad (a wrong subreddit) and which channels bring replies. No IP or cookie is stored.
const VALUES = new Set(['up', 'down', 'reply', 'signup', 'upvotes', 'nothing']);
const KIND = /^(mail|post|place|promo|list|fix|tool)(\d{1,2})$/;
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const today = () => new Date().toISOString().slice(0, 10);

export async function feedback(req, env) {
  const url = new URL(req.url);
  if (url.pathname !== '/api/feedback') return null;
  if (req.method === 'POST') {
    let b; try { b = await req.json(); } catch { return json(400, { error: 'Send JSON' }); }
    const plan = String(b?.plan || ''); const m = KIND.exec(String(b?.item || '')); const value = String(b?.value || '');
    if (!/^([0-9a-f]{12}|example)$/.test(plan) || !m || !VALUES.has(value)) return json(400, { error: 'plan, item and value are needed' });
    const cap = Number(env.FEEDBACK_PER_DAY) || 5000; const day = today();
    const used = (await env.DB.prepare('SELECT n FROM days WHERE day = ?').bind('fb:' + day).first())?.n ?? 0;
    if (used >= cap) return json(200, { ok: 0, full: true });
    await env.DB.batch([
      env.DB.prepare('INSERT INTO feedback (day, plan, item, kind, value) VALUES (?, ?, ?, ?, ?)').bind(day, plan, m[0], m[1], value),
      env.DB.prepare('INSERT INTO days (day, n) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET n = n + 1').bind('fb:' + day),
    ]);
    return json(200, { ok: 1 });
  }
  if (req.method === 'GET') {
    const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days')) || 30));
    const since = new Date(Date.now() - (days - 1) * 864e5).toISOString().slice(0, 10);
    const r = await env.DB.prepare('SELECT kind, value, COUNT(*) AS n FROM feedback WHERE day >= ? GROUP BY kind, value ORDER BY kind, n DESC').bind(since).all();
    const kinds = {};
    for (const x of r.results || []) (kinds[x.kind] = kinds[x.kind] || {})[x.value] = x.n;
    return json(200, { since, kinds });
  }
  return json(405, { error: 'GET or POST' });
}
