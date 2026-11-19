import { expect, test } from 'bun:test';
import { handle } from '../src/index.js';
import { fakeD1 } from './fake-d1.js';
import { fakeCache, fakeFetch } from './fixtures.js';

const get = (path) => handle(new Request(`https://grow.flisk.si${path}`), { DB: fakeD1(), INFERENCE_KEY: 'k' }, { fetch: fakeFetch(), cache: fakeCache() });

test('GET /.well-known/security.txt returns plain text', async () => {
  const res = await get('/.well-known/security.txt');
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toMatch(/^text\/plain/);
  expect(res.headers.get('cache-control')).toContain('max-age=86400');
});

test('it names the repo advisories page and expires at least six months out', async () => {
  const text = await (await get('/.well-known/security.txt')).text();
  expect(text).toContain('Contact: https://github.com/flisk-sh/grow/security/advisories/new');
  expect(text).toContain('Canonical: https://grow.flisk.si/.well-known/security.txt');
  const expires = text.match(/^Expires: (\S+)$/m)?.[1];
  expect(expires).toBeTruthy();
  expect(Date.parse(expires)).toBeGreaterThan(Date.now() + 180 * 24 * 60 * 60 * 1000);
});
