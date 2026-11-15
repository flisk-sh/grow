import { describe, expect, test } from 'bun:test';
import { handle } from '../src/index.js';
import { listen, parseKeywords } from '../src/listen.js';
import { fakeD1 } from './fake-d1.js';

const now = Date.now();
const hn = { hits: [{ objectID: '1', title: 'Need a readme checker', author: 'ann', created_at_i: Math.floor(now / 1000) - 3600 }, { objectID: '2', title: 'old', author: 'bob', created_at_i: 1 }] };
const bsky = { posts: [{ uri: 'at://did:x/app.bsky.feed.post/abc', author: { handle: 'cat.bsky.social', displayName: 'Cat' }, record: { text: 'any good readme checker?', createdAt: new Date(now - 7200e3).toISOString() } }] };
const gh = { items: [{ html_url: 'https://github.com/o/r/issues/3', title: 'README checker lint', body: 'want <b>checks</b>', user: { login: 'dan', html_url: 'https://github.com/dan' }, created_at: new Date(now - 60e3).toISOString() }] };
const fakeFetch = async (u) => {
  const s = String(u);
  const body = s.includes('algolia') ? hn : s.includes('bsky') ? bsky : s.includes('api.github.com/search') ? gh : null;
  return body ? new Response(JSON.stringify(body)) : new Response('no', { status: 500 });
};
const env = () => ({ DB: fakeD1(), SESSION_SECRET: 'test-secret' });
const O = 'https://grow.flisk.si';

async function session(e) {
  const r = await handle(new Request(`${O}/me`), e, { fetch: fakeFetch, cache: null });
  expect(r.status).toBe(200);
  return r.headers.get('set-cookie').split(';')[0];
}
const call = (e, cookie, path, body) => handle(new Request(O + path, body ? { method: 'POST', headers: { cookie, 'content-type': 'application/json', origin: O }, body: JSON.stringify(body) } : { headers: { cookie } }), e, { fetch: fakeFetch, cache: null });

describe('listen', () => {
  test('merges sources, drops old posts, newest first, strips HTML', async () => {
    const out = await listen(['readme checker'], { fetch: fakeFetch, now });
    expect(out.map((l) => l.source)).toEqual(['GitHub', 'Hacker News', 'Bluesky']);
    expect(out[0].text).toBe('want checks');
    expect(out[2].url).toBe('https://bsky.app/profile/cat.bsky.social/post/abc');
  });
  test('drops near misses, bots and your own repos', async () => {
    const f = async (u) => new Response(JSON.stringify(String(u).includes('api.github.com') ? { items: [
      { html_url: 'https://github.com/flisk-sh/x/issues/1', title: 'flisk ci', body: '', user: { login: 'me' }, created_at: new Date(now).toISOString() },
      { html_url: 'https://github.com/o/r/issues/2', title: 'flisk run', body: '', user: { login: 'github-actions[bot]' }, created_at: new Date(now).toISOString() },
      { html_url: 'https://github.com/o/r/issues/3', title: 'flisk crashes', body: '', user: { login: 'zed' }, created_at: new Date(now).toISOString() },
    ] } : String(u).includes('algolia') ? { hits: [{ objectID: '9', title: 'OLED flicker', author: 'x', created_at_i: Math.floor(now / 1000) }] } : {}));
    const out = await listen(['flisk'], { fetch: f, now, exclude: { owners: ['flisk'] } });
    expect(out.map((l) => l.url)).toEqual(['https://github.com/o/r/issues/3']);
  });
  test('a failing source gives nothing, not an error', async () => {
    expect(await listen(['x y z'], { fetch: async () => { throw new Error('down'); }, now })).toEqual([]);
  });
  test('parseKeywords keeps up to 4 clean phrases', () => {
    expect(parseKeywords('readme, a, <script>x</script>, one,two,three,four')).toEqual(['readme', 'script x script', 'one', 'two']);
  });
});

describe('cabinet', () => {
  test('a visitor gets a cabinet, adds a site, finds people, marks one, tracks a listing', async () => {
    const e = env(); const c = await session(e);
    expect((await (await call(e, c, '/api/me')).json()).sites).toEqual([]);
    const add = await call(e, c, '/api/sites', { url: 'https://readme.flisk.si/' });
    const { id } = await add.json();
    expect(id).toMatch(/^[0-9a-f]{12}$/);
    const l = await (await call(e, c, `/api/sites/${id}/listen`, {})).json();
    expect(l.added).toBe(3);
    expect((await (await call(e, c, `/api/sites/${id}/listen`, {})).json()).next).toBeGreaterThan(0);
    const d = await (await call(e, c, `/api/sites/${id}/leads`)).json();
    expect(d.leads).toHaveLength(3);
    expect(d.reddit).toContain('reddit.com/search');
    expect((await call(e, c, '/api/leads', { site: id, url: d.leads[0].url, status: 'replied' })).status).toBe(200);
    expect((await call(e, c, '/api/listings', { site: id, place: 'Product Hunt', status: 'live', link: 'https://www.producthunt.com/posts/x' })).status).toBe(200);
    const me = await (await call(e, c, '/api/me')).json();
    expect(me.sites[0].new_leads).toBe(2);
    expect(me.sites[0].listed).toBe(1);
  });
  test('another visitor cannot read or change my site', async () => {
    const e = env(); const a = await session(e); const b = await session(e);
    const { id } = await (await call(e, a, '/api/sites', { url: 'https://a.example/' })).json();
    expect((await call(e, b, `/api/sites/${id}/leads`)).status).toBe(404);
    expect((await call(e, b, `/api/sites/${id}/delete`, {})).status).toBe(404);
  });
  test('a forged cookie and a cross-site write are refused', async () => {
    const e = env();
    expect((await call(e, 'grow_s=a_123.bad', '/api/me')).status).toBe(401);
    const c = await session(e);
    const r = await handle(new Request(`${O}/api/sites`, { method: 'POST', headers: { cookie: c, origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{"url":"https://x.example/"}' }), e, { fetch: fakeFetch, cache: null });
    expect(r.status).toBe(403);
  });
  test('the site takes its search phrases from its plan', async () => {
    const e = env(); const c = await session(e);
    await e.DB.prepare('INSERT INTO plans (id, url, data, created) VALUES (?, ?, ?, ?)').bind('aaaaaaaaaaaa', 'https://p.example/', JSON.stringify({ queries: ['ci is slow', 'flaky tests'] }), now).run();
    const { id } = await (await call(e, c, '/api/sites', { url: 'https://p.example/' })).json();
    const d = await (await call(e, c, `/api/sites/${id}/leads`)).json();
    expect(d.site.keywords).toBe('ci is slow, flaky tests');
    expect(d.site.plan_id).toBe('aaaaaaaaaaaa');
  });
  test('GitHub sign-in moves the browser sites into the account', async () => {
    const e = { ...env(), GITHUB_CLIENT_ID: 'id', GITHUB_CLIENT_SECRET: 'sec' };
    const c = await session(e);
    await call(e, c, '/api/sites', { url: 'https://mine.example/' });
    const start = await handle(new Request(`${O}/auth/start`), e, {});
    const state = new URL(start.headers.get('location')).searchParams.get('state');
    const ghFetch = async (u) => String(u).includes('access_token') ? new Response('{"access_token":"t"}') : new Response('{"id":42,"login":"octo"}');
    const cb = await handle(new Request(`${O}/auth/callback?code=x&state=${state}`, { headers: { cookie: `${c}; grow_state=${state}` } }), e, { fetch: ghFetch, cache: null });
    expect(cb.status).toBe(302);
    const signed = cb.headers.getSetCookie().find((x) => x.startsWith('grow_s=')).split(';')[0];
    const me = await (await call(e, signed, '/api/me')).json();
    expect(me.user.login).toBe('octo');
    expect(me.sites.map((s) => s.url)).toEqual(['https://mine.example/']);
  });
});
