import { describe, expect, test } from 'bun:test';
import { handle } from '../src/index.js';
import { fakeD1 } from './fake-d1.js';

const post = (env, body) => handle(new Request('https://grow.flisk.si/api/clicks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), env);
const get = (env, q) => handle(new Request('https://grow.flisk.si/api/clicks?' + q), env).then((r) => r.json());

describe('click map', () => {
  test('stores a batch and answers counts per target and per cell', async () => {
    const env = { DB: fakeD1() };
    const r = await post(env, { page: 'plan', dev: 'mobile', clicks: [{ x: 0.5, y: 120, k: 'ctl', t: 'first: Email your first' }, { x: 0.51, y: 130, k: 'dead', t: 'h3' }, { x: 0.2, y: 900, k: 'ctl', t: 'first: Email your first' }] });
    expect(r.status).toBe(200); expect((await r.json()).ok).toBe(3);
    const m = await get(env, 'page=plan&dev=mobile');
    expect(m.clicks).toBe(3); expect(m.dead).toBe(1);
    expect(m.targets[0]).toEqual({ target: 'first: Email your first', kind: 'ctl', n: 2 });
    expect(m.cells).toContainEqual({ x: 50, y: 100, n: 2 });
    expect((await get(env, 'page=plan&dev=desktop')).clicks).toBe(0);
  });

  test('refuses an unknown page, drops bad points, keeps 30 per batch and stops at the daily cap', async () => {
    const env = { DB: fakeD1(), CLICKS_PER_DAY: '40' };
    expect((await post(env, { page: 'admin', dev: 'mobile', clicks: [] })).status).toBe(400);
    const bad = await post(env, { page: 'home', dev: 'desktop', clicks: [{ x: 3, y: 10 }, { x: 0.1, y: -5 }, { x: 'a', y: 1 }] });
    expect((await bad.json()).ok).toBe(0);
    const many = Array.from({ length: 50 }, () => ({ x: 0.5, y: 10, k: 'ctl', t: 'x'.repeat(99) }));
    expect((await (await post(env, { page: 'home', dev: 'desktop', clicks: many })).json()).ok).toBe(30);
    expect((await (await post(env, { page: 'home', dev: 'desktop', clicks: many })).json()).full).toBe(true);
    const m = await get(env, 'page=home&dev=desktop');
    expect(m.clicks).toBe(30); expect(m.targets[0].target.length).toBe(40);
  });

  test('the page sends clicks only without Do Not Track, and shows a do-this-first strip and folded lists', async () => {
    const html = await (await handle(new Request('https://grow.flisk.si/'), {})).text();
    const main = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('function draw('));
    expect(() => new Function(main)).not.toThrow();
    expect(main).toContain("if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;");
    expect(main).toContain("navigator.sendBeacon('/api/clicks'");
    expect(main).toContain("fs(3, 'Email your first buyer'");
    expect(main).toContain("m.textContent = 'Show all ' + rows.length;");
    expect(html).toContain('.rw[hidden]{display:none}');
  });
});
