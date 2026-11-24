// Regressions from a playtest of a live plan: trailing slash, unknown /p/ addresses, logo timeout.
import { describe, expect, test } from 'bun:test';
import { handle } from '../src/index.js';
import { fakeD1 } from './fake-d1.js';
import { fakeCache, fakeFetch } from './fixtures.js';

const setup = () => {
  const f = fakeFetch();
  const env = { DB: fakeD1(), INFERENCE_KEY: 'k' };
  const deps = { fetch: f, cache: fakeCache() };
  return { f, get: (p) => handle(new Request('https://grow.flisk.si' + p), env, deps) };
};

describe('playtest regressions', () => {
  test('a plan link with a trailing slash is the same page', async () => {
    const plain = await setup().get('/p/420307c30882');
    const slash = await setup().get('/p/420307c30882/');
    expect(slash.status).toBe(plain.status);
    expect(slash.status).not.toBe(404);
  });

  test('an unknown /p/ address shows the home page, not a bare 404', async () => {
    const r = await setup().get('/p/doesnotexist');
    expect(r.status).toBe(404);
    expect(r.headers.get('content-type')).toContain('text/html');
    expect(r.headers.get('x-robots-tag')).toContain('noindex');
  });

  test('a logo fetch gives up after a timeout', async () => {
    const seen = [];
    const env = { DB: fakeD1(), INFERENCE_KEY: 'k' };
    const fetchImpl = async (url, opts) => { seen.push(opts); return new Response('', { status: 404 }); };
    await handle(new Request('https://grow.flisk.si/logo/foundrlist.com'), env, { fetch: fetchImpl, cache: fakeCache() });
    expect(seen[0]?.signal).toBeDefined();
  });
});
