// The plan tools: questions before the plan, feedback per item, rewriting one item, the example plan, and export.
import { describe, expect, test } from 'bun:test';
import { handle } from '../src/index.js';
import { briefLine, cleanBrief, signEmails } from '../src/plan.js';
import { fakeD1 } from './fake-d1.js';
import { fakeCache, fakeFetch } from './fixtures.js';

const req = (path, body, ip = '1.1.1.1') => new Request('https://grow.flisk.si' + path, body ? { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: JSON.stringify(body) } : {});

describe('questions before the plan', () => {
  test('cleanBrief keeps only who, price and name, cut to size; empty answers give null', () => {
    expect(cleanBrief({ who: ' dentists ', price: '$19/mo', name: 'Sam', evil: 'x' })).toEqual({ who: 'dentists', price: '$19/mo', name: 'Sam' });
    expect(cleanBrief({ who: '', price: ' ', name: '' })).toBeNull();
    expect(cleanBrief('who')).toBeNull();
    expect(cleanBrief({ name: 'x'.repeat(200) }).name.length).toBe(60);
  });

  test('the brief goes to the model and the name signs the emails', () => {
    expect(briefLine({ who: 'dentists', price: 'free', name: 'Sam' })).toContain('it is for dentists. Price: free. The maker\'s name: Sam');
    expect(briefLine(null)).toBe('');
    const e = [{ body: 'Hi,\nshort.\n[your name]', followup: 'Bumping this. [ Your Name ]' }];
    signEmails(e, 'Sam'); expect(e[0].body.endsWith('Sam')).toBe(true); expect(e[0].followup).toBe('Bumping this. Sam');
    const u = [{ body: 'Hi, try it.  ', followup: '' }]; signEmails(u, 'Sam'); expect(u[0].body).toBe('Hi, try it.\n\nSam'); expect(u[0].followup).toBe('');
  });

  test('a plan with a brief is made fresh, tells the model, keeps the brief and signs the emails', async () => {
    const f = fakeFetch(); const env = { DB: fakeD1(), INFERENCE_KEY: 'k' }; const deps = { fetch: f, cache: fakeCache() };
    const first = await (await handle(req('/api/plan', { url: 'https://a.com/' }), env, deps)).json();
    const r = await (await handle(req('/api/plan', { url: 'https://a.com/', brief: { who: 'dentists', name: 'Sam' } }), env, deps)).json();
    expect(r.reused).toBeUndefined(); expect(r.id).not.toBe(first.id);
    expect(r.plan.brief).toEqual({ who: 'dentists', name: 'Sam' });
    expect(r.plan.emails[0].body).toContain('Sam'); expect(r.plan.emails[0].body).not.toContain('[your name]');
    const sent = f.calls.filter((c) => c.url.includes('inference')).map((c) => JSON.parse(c.init.body).messages[1].content);
    expect(sent.some((m) => m.includes('it is for dentists'))).toBe(true);
  });
});

describe('feedback per item', () => {
  test('stores thumbs and results, answers counts only, refuses bad input', async () => {
    const env = { DB: fakeD1() };
    for (const [item, value] of [['post1', 'down'], ['post2', 'down'], ['mail0', 'up'], ['mail0', 'reply']]) expect((await handle(req('/api/feedback', { plan: 'abcdefabcdef', item, value }), env)).status).toBe(200);
    expect((await handle(req('/api/feedback', { plan: 'abcdefabcdef', item: 'mail0', value: 'love' }), env)).status).toBe(400);
    expect((await handle(req('/api/feedback', { plan: 'nope', item: 'mail0', value: 'up' }), env)).status).toBe(400);
    expect((await handle(req('/api/feedback', { plan: 'abcdefabcdef', item: 'admin1', value: 'up' }), env)).status).toBe(400);
    const j = await (await handle(req('/api/feedback'), env)).json();
    expect(j.kinds).toEqual({ mail: { up: 1, reply: 1 }, post: { down: 2 } });
    expect(JSON.stringify(j)).not.toContain('abcdefabcdef');
  });

  test('stops at the daily cap', async () => {
    const env = { DB: fakeD1(), FEEDBACK_PER_DAY: '1' };
    expect((await (await handle(req('/api/feedback', { plan: 'example', item: 'list0', value: 'up' }), env)).json()).ok).toBe(1);
    expect((await (await handle(req('/api/feedback', { plan: 'example', item: 'list0', value: 'up' }), env)).json()).full).toBe(true);
  });
});

describe('rewrite one item', () => {
  const setup = async (answer) => {
    const f = fakeFetch(); const env = { DB: fakeD1(), INFERENCE_KEY: 'k' }; const deps = { fetch: f, cache: fakeCache() };
    const made = await (await handle(req('/api/plan', { url: 'https://a.com/', brief: { name: 'Sam' } }), env, deps)).json();
    const asked = [];
    env.INFERENCE = { fetch: async (u, init) => { asked.push(JSON.parse(init.body)); return Response.json({ choices: [{ message: { content: JSON.stringify(answer) } }] }); } };
    return { env, deps, made, asked, rw: (b, ip) => handle(req('/api/rewrite', b, ip), env, deps) };
  };

  test('replaces only that email, signs it, and saves the plan', async () => {
    const s = await setup({ item: { to: 'Clinic owner', subject: 'New angle', body: 'Hi,\nnew.\n[your name]', followup: 'Any thoughts?' } });
    const r = await s.rw({ id: s.made.id, kind: 'email', index: 0 });
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.item.subject).toBe('New angle'); expect(j.item.body).toContain('Sam');
    expect(s.asked[0].messages[1].content).toContain('The item to replace');
    const saved = await (await handle(req('/api/plan/' + s.made.id), s.env, s.deps)).json();
    expect(saved.plan.emails[0].subject).toBe('New angle');
    expect(saved.plan.places).toEqual(s.made.plan.places);
  });

  test('a post keeps its place; a bad answer is a 502 and the plan stays', async () => {
    const s = await setup({ item: { where: 'Reddit', title: 'r/saas Try this', body: 'see https://x.com' } });
    const i = s.made.plan.posts.findIndex((p) => p.where === 'X');
    if (i >= 0) { const j = await (await s.rw({ id: s.made.id, kind: 'post', index: i })).json(); expect(j.item.where).toBe('X'); expect(j.item.body).not.toContain('https://'); }
    const bad = await setup({ nothing: true });
    expect((await bad.rw({ id: bad.made.id, kind: 'place', index: 0 })).status).toBe(502);
  });

  test('refuses bad input, an unknown plan and the example; limits each visitor', async () => {
    const s = await setup({ item: { name: 'Indie Hackers', why: 'makers', url: 'https://indiehackers.com' } });
    expect((await s.rw({ id: s.made.id, kind: 'tool', index: 0 })).status).toBe(400);
    expect((await s.rw({ id: 'example', kind: 'place', index: 0 })).status).toBe(400);
    expect((await s.rw({ id: 'aaaaaaaaaaaa', kind: 'place', index: 0 })).status).toBe(404);
    expect((await s.rw({ id: s.made.id, kind: 'place', index: 9 })).status).toBe(502);
    s.env.REWRITES_PER_VISITOR = '1';
    expect((await s.rw({ id: s.made.id, kind: 'place', index: 0 }, '9.9.9.9')).status).toBe(200);
    expect((await s.rw({ id: s.made.id, kind: 'place', index: 0 }, '9.9.9.9')).status).toBe(429);
  });
});

describe('example plan and export', () => {
  test('/example serves the page and /api/plan/example a full plan, with no model call', async () => {
    const f = fakeFetch(); const env = { DB: fakeD1() };
    const page = await handle(req('/example'), env, { fetch: f });
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain('window.PLAN_ID="example"'); expect(html).toContain('https://grow.flisk.si/example');
    const j = await (await handle(req('/api/plan/example'), env, { fetch: f })).json();
    expect(j.plan.emails.length).toBeGreaterThan(2); expect(j.plan.places.length).toBeGreaterThan(2); expect(j.plan.listings.length).toBeGreaterThan(2);
    expect(f.calls.length).toBe(0);
  });

  test('the page has the questions, the example link, feedback, rewrite, calendar and Markdown export', async () => {
    const html = await (await handle(req('/'), {})).text();
    for (const id of ['q-who', 'q-price', 'q-name']) expect(html).toContain('id="' + id + '"');
    expect(html).toContain('href="/example"');
    const main = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('function draw('));
    expect(() => new Function(main)).not.toThrow();
    for (const s of ["fetch('/api/feedback'", "fetch('/api/rewrite'", 'BEGIN:VCALENDAR', "'- [ ] '", "'Did it work?'", "el('button', 'chip')"]) expect(main).toContain(s);
  });

  test('planIcs and planMd make a valid calendar and a to-do list', async () => {
    const html = await (await handle(req('/'), {})).text();
    const main = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('function draw('));
    const pick = (name) => { const i = main.indexOf('function ' + name + '('); let d = 0, j = main.indexOf('{', i); for (; j < main.length; j++) { if (main[j] === '{') d++; else if (main[j] === '}' && --d === 0) break; } return main.slice(i, j + 1); };
    const { EXAMPLE } = await import('../src/example.js');
    const fn = new Function('location', 'planName', 'clip', [pick('planLink'), pick('planMd'), pick('planIcs')].join('\n') + '; return { planMd, planIcs };');
    const { planMd, planIcs } = fn({ origin: 'https://grow.flisk.si' }, () => 'grow', (t, n) => t.slice(0, n));
    const ics = planIcs('abcdefabcdef', EXAMPLE);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true); expect(ics.trim().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g).length).toBeGreaterThanOrEqual(3);
    expect(ics.split('\r\n').every((l) => l.length <= 75)).toBe(true);
    expect(ics).toContain('https://grow.flisk.si/p/abcdefabcdef');
    const md = planMd('example', EXAMPLE);
    expect(md).toContain('# Grow plan for grow'); expect(md).toContain('https://grow.flisk.si/example');
    expect(md.match(/- \[ \]/g).length).toBeGreaterThan(10);
  });
});
