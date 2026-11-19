import { describe, expect, test } from 'bun:test';
import { handle } from '../src/index.js';
import { fakeD1 } from './fake-d1.js';
import { fakeCache, fakeFetch } from './fixtures.js';

const setup = (vars = {}) => {
  const f = fakeFetch();
  const env = { DB: fakeD1(), INFERENCE_KEY: 'k', ...vars };
  const deps = { fetch: f, cache: fakeCache() };
  const post = (url, ip = '1.1.1.1') => handle(new Request('https://grow.flisk.si/api/plan', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: JSON.stringify({ url }) }), env, deps);
  const get = (p) => handle(new Request('https://grow.flisk.si' + p), env, deps);
  return { f, env, post, get, modelCalls: () => f.calls.filter((c) => c.url.includes('inference')).length };
};

describe('routes', () => {
  test('the sitemap lists the home page and robots points to it', async () => {
    const r = await setup().get('/sitemap.xml');
    expect(r.status).toBe(200);
    expect(await r.text()).toContain('<loc>https://grow.flisk.si/</loc>');
    expect(await (await setup().get('/robots.txt')).text()).toContain('Sitemap: https://grow.flisk.si/sitemap.xml');
  });

  test('robots blocks plans, the API and query URLs', async () => {
    const t = await (await setup().get('/robots.txt')).text();
    expect(t).toContain('Disallow: /p/');
    expect(t).toContain('Disallow: /api/');
    expect(t).toContain('Disallow: /*?');
  });

  test('robots.txt and sitemap.xml are cacheable for a day with unchanged bodies', async () => {
    const s = setup();
    const robots = await s.get('/robots.txt');
    expect(robots.headers.get('cache-control')).toBe('public, max-age=86400');
    expect(robots.headers.get('content-type')).toBe('text/plain');
    expect(await robots.text()).toContain('Sitemap: https://grow.flisk.si/sitemap.xml');

    const sitemap = await s.get('/sitemap.xml');
    expect(sitemap.headers.get('cache-control')).toBe('public, max-age=86400');
    expect(sitemap.headers.get('content-type')).toBe('application/xml');
    expect(await sitemap.text()).toContain('<loc>https://grow.flisk.si/</loc>');
  });

  test('?url= only fills the box and never calls the model', async () => {
    const s = setup();
    const r = await s.get('/?url=' + encodeURIComponent('https://a.com/"><script>'));
    const t = await r.text();
    expect(r.headers.get('x-robots-tag')).toContain('noindex');
    expect(t).toContain('value="https://a.com/%22%3E%3Cscript%3E"');
    expect(s.modelCalls()).toBe(0);
    expect((await s.get('/')).headers.get('x-robots-tag')).toBeNull();
  });

  test('makes a plan, saves it, and reads it back', async () => {
    const s = setup();
    const r = await s.post('https://a.com/');
    const j = await r.json();
    expect(r.status).toBe(200);
    expect(j.id).toMatch(/^[0-9a-f]{12}$/);
    const back = await (await s.get('/api/plan/' + j.id)).json();
    expect(back.plan.buyers).toBe(j.plan.buyers);
    expect((await s.get('/p/' + j.id)).status).toBe(200);
    expect((await s.get('/api/plan/000000000000')).status).toBe(404);
  });

  test('home and plan pages load Flisk Analytics and the CSP allows it', async () => {
    const s = setup();
    const j = await (await s.post('https://a.com/')).json();
    for (const p of ['/', '/p/' + j.id]) {
      const r = await s.get(p);
      const html = await r.text();
      expect(html.slice(0, html.indexOf('</head>'))).toContain('<script defer data-domain="grow.flisk.si" src="https://flisk.sh/a.js"></script>');
      expect(r.headers.get('content-security-policy')).toMatch(/script-src [^;]*https:\/\/flisk\.sh/);
      expect(r.headers.get('content-security-policy')).toMatch(/connect-src [^;]*https:\/\/\*\.flisk\.si/);
    }
  });

  test('the same link within a day reuses the plan', async () => {
    const s = setup();
    const a = await (await s.post('https://a.com/')).json();
    const b = await (await s.post('https://a.com/', '2.2.2.2')).json();
    expect(b.id).toBe(a.id);
    expect(b.reused).toBe(true);
    expect(s.modelCalls()).toBe(1);
  });

  test('a visitor gets PLANS_PER_VISITOR plans a day', async () => {
    const s = setup({ PLANS_PER_VISITOR: '2' });
    expect((await s.post('https://a.com/')).status).toBe(200);
    expect((await s.post('https://b.com/')).status).toBe(200);
    const r = await s.post('https://c.com/');
    expect(r.status).toBe(429);
    expect((await s.post('https://d.com/', '9.9.9.9')).status).toBe(200);
  });

  test('all visitors together get PLANS_PER_DAY plans', async () => {
    const s = setup({ PLANS_PER_DAY: '1' });
    expect((await s.post('https://a.com/', '1.0.0.1')).status).toBe(200);
    const r = await s.post('https://b.com/', '1.0.0.2');
    expect(r.status).toBe(429);
    expect((await r.json()).error).toContain('free plans');
  });

  test('bad input and a missing key', async () => {
    expect((await setup().post('ftp://a.com')).status).toBe(400);
    expect((await setup({ INFERENCE_KEY: '' }).post('https://a.com/')).status).toBe(503);
  });

  test('uses the service bindings when they are there', async () => {
    const inf = fakeFetch(), cit = fakeFetch();
    const s = setup({ INFERENCE: { fetch: inf }, CITABLE: { fetch: cit } });
    expect((await s.post('https://a.com/')).status).toBe(200);
    expect(inf.calls.some((c) => c.url.includes('inference'))).toBe(true);
    expect(cit.calls.some((c) => c.url.includes('citable'))).toBe(true);
    expect(s.modelCalls()).toBe(0);
  });
});

describe('slow model', () => {
  test('a model timeout returns a readable 504 and stores no plan', async () => {
    const timeout = async () => { const e = new Error('The operation timed out.'); e.name = 'TimeoutError'; throw e; };
    const s = setup({ INFERENCE: { fetch: timeout } });
    const r = await s.post('https://example.com/');
    expect(r.status).toBe(504);
    const j = await r.json();
    expect(j.error).toBe('The model took too long to answer. Press the button again in a minute.');
    expect(j.id).toBeUndefined();
  });

  test('the page guards the button and survives a non-JSON error', async () => {
    const html = await (await setup().get('/')).text();
    expect(html).toContain('go.disabled = true');
    expect(html).toContain('AbortSignal.timeout(100000)');
    expect(html).toContain('r.json().catch(');
  });
});

test('home page names the networks: X now, the rest soon', async () => {
  const { handle } = await import('../src/index.js');
  const html = await (await handle(new Request('https://grow.flisk.si/'), {})).text();
  expect(html).toContain('/logo/x.com');
  expect(html).toContain('class="socials nologo"');
  expect(html).toContain('Instagram<em>soon</em>');
});

describe('model out of budget', () => {
  const out = async () => new Response(JSON.stringify({ error: { message: 'Daily budget used' } }), { status: 429, headers: { 'content-type': 'application/json' } });
  test('an X profile still gets a general followers playbook, not saved', async () => {
    const s = setup({ INFERENCE: { fetch: out } });
    const r = await s.post('https://x.com/brookservers');
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.generic).toBe(true);
    expect(j.plan.kind).toBe('followers');
    expect(j.plan.handle).toBe('brookservers');
    expect(j.id).toBeUndefined();
  });
  test('any other link gets the real checks and a general guide, not saved', async () => {
    const s = setup({ INFERENCE: { fetch: out } });
    const r = await s.post('https://example.com/');
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.generic).toBe(true);
    expect(j.id).toBeUndefined();
    expect(j.plan.places.length).toBeGreaterThan(2);
    expect(j.plan.emails.length).toBeGreaterThan(0);
    expect(j.plan.listings.length).toBeGreaterThan(5);
  });
});

describe('traces', () => {
  test('a budget-out plan sends one capped trace and no prompt or link', async () => {
    const sent = [];
    const out = async () => new Response(JSON.stringify({ error: { message: 'Daily budget used' } }), { status: 429, headers: { 'content-type': 'application/json' } });
    const s = setup({ INFERENCE: { fetch: out }, TRACE_KEY: 'k', TRACES: { fetch: async (u, init) => { sent.push(JSON.parse(init.body)); return new Response('{}'); } } });
    await s.post('https://x.com/brookservers');
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ route: '/api/plan', kind: 'capped', actual: 'playbook' });
    expect(JSON.stringify(sent[0])).not.toContain('brookservers');
  });
});
