import { describe, expect, test } from 'bun:test';
import { handle } from '../src/index.js';
import { findRepo, jobsFor } from '../src/jobs.js';
import { fakeD1 } from './fake-d1.js';

const O = 'https://grow.flisk.si';
let n = 0; const sent = [];
const fakeFetch = async (u, init) => {
  const s = String(u);
  if (s === 'https://shop.example/') return new Response('<a href="https://github.com/sponsors/x">s</a><a href="https://github.com/acme/shop">code</a>');
  if (s === 'https://jobs.flisk.si/api/jobs') { sent.push(JSON.parse(init.body)); return new Response(JSON.stringify({ job: { id: 'j' + ++n } }), { status: 201 }); }
  return new Response('{}');
};
const call = (e, cookie, path, body) => handle(new Request(O + path, body ? { method: 'POST', headers: { cookie, 'content-type': 'application/json', origin: O }, body: JSON.stringify(body) } : { headers: { cookie } }), e, { fetch: fakeFetch, cache: null });

describe('jobs', () => {
  test('finds the repo on the home page, skipping non-repo links', async () => {
    expect(await findRepo('https://shop.example/', { fetch: fakeFetch })).toBe('acme/shop');
    expect(await findRepo('https://github.com/a/b', { fetch: fakeFetch })).toBe('a/b');
    expect(jobsFor('https://x.example/', '').map((j) => j.kind)).toEqual(['ai-findable']);
  });
  test('Post as jobs posts only the kinds a bot does, once a day', async () => {
    const e = { DB: fakeD1(), SESSION_SECRET: 's', JOBS_KEY: 'fj_test' };
    const cookie = (await handle(new Request(`${O}/me`), e, { fetch: fakeFetch, cache: null })).headers.get('set-cookie').split(';')[0];
    const { id } = await (await call(e, cookie, '/api/sites', { url: 'https://shop.example/' })).json();
    const j = await (await call(e, cookie, `/api/sites/${id}/jobs`, {})).json();
    expect(j.posted.map((p) => p.kind)).toEqual(['ai-findable', 'readme-score']);
    expect(sent.every((b) => b.autoAccept && b.kind)).toBe(true);
    expect(sent[1].input).toEqual({ repo: 'acme/shop' });
    const again = await (await call(e, cookie, `/api/sites/${id}/jobs`, {})).json();
    expect(again.posted).toEqual([]);
    const d = await (await call(e, cookie, `/api/sites/${id}/leads`)).json();
    expect(d.jobs.map((x) => x.link).sort()).toEqual(['https://jobs.flisk.si/job/j1', 'https://jobs.flisk.si/job/j2']);
  });
  test('says so when posting is not set up', async () => {
    const e = { DB: fakeD1(), SESSION_SECRET: 's' };
    const cookie = (await handle(new Request(`${O}/me`), e, { fetch: fakeFetch, cache: null })).headers.get('set-cookie').split(';')[0];
    const { id } = await (await call(e, cookie, '/api/sites', { url: 'https://shop.example/' })).json();
    expect((await call(e, cookie, `/api/sites/${id}/jobs`, {})).status).toBe(503);
  });
});

test('logo proxy serves a company icon and refuses odd paths', async () => {
  const f = async (u) => (String(u).includes('icons.duckduckgo.com/ip3/reddit.com.ico') ? new Response('ico', { headers: { 'content-type': 'image/x-icon' } }) : new Response('no', { status: 404 }));
  const r = await handle(new Request(`${O}/logo/reddit.com`), { DB: fakeD1() }, { fetch: f, cache: null });
  expect(r.headers.get('content-type')).toBe('image/x-icon');
  expect(await r.text()).toBe('ico');
  expect((await handle(new Request(`${O}/logo/../x`), { DB: fakeD1() }, { fetch: f, cache: null })).headers.get('content-type')).not.toBe('image/x-icon');
});
