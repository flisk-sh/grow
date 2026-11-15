// Live journey check: bun scripts/e2e-live.mjs [base]. Reuses a plan made today, so it costs no model call.
const base = process.argv[2] || 'https://grow.flisk.si';
const fail = (m) => { console.error('FAIL', m); process.exit(1); };
const home = await fetch(base + '/');
if (home.status !== 200 || !(await home.text()).includes('Make my plan')) fail('home page');
const r = await fetch(base + '/api/plan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: 'https://citable.flisk.si/' }) });
const j = await r.json().catch(() => ({}));
if (r.status !== 200 || !j.id) fail(`POST /api/plan ${r.status} ${JSON.stringify(j)}`);
const page = await (await fetch(`${base}/p/${j.id}`)).text();
for (const s of ['Who would buy it', 'Where to find them', 'Emails to send']) if (!page.includes(s)) fail(`plan page missing "${s}"`);
console.log('PASS', `${base}/p/${j.id}`);
