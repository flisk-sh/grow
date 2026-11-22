import { describe, expect, test } from 'bun:test';
import { handle } from '../src/index.js';
import { withSecurityHeaders } from '../src/security-headers.js';
import { fakeD1 } from './fake-d1.js';
import { fakeCache, fakeFetch } from './fixtures.js';

const BASELINE = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
};
const get = (p, init) => handle(new Request('https://grow.flisk.si' + p, init), { DB: fakeD1(), INFERENCE_KEY: 'k' }, { fetch: fakeFetch(), cache: fakeCache() });
const expectBaseline = (r) => {
  for (const [k, v] of Object.entries(BASELINE)) expect(r.headers.get(k)).toBe(v);
  expect(r.headers.get('content-security-policy')).toContain('frame-ancestors');
};

describe('security headers', () => {
  test('are on the home page', async () => {
    const r = await get('/');
    expect(r.status).toBe(200);
    expectBaseline(r);
  });

  test('are on a 404, a JSON API 404 and robots.txt', async () => {
    const miss = await get('/nope');
    expect(miss.status).toBe(404);
    expectBaseline(miss);
    const api = await get('/api/nope');
    expect(api.status).toBe(404);
    expectBaseline(api);
    expectBaseline(await get('/robots.txt'));
  });

  test('are on an OPTIONS reply and a POST error', async () => {
    expectBaseline(await get('/api/plan', { method: 'OPTIONS' }));
    const bad = await get('/api/plan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    expect(bad.status).toBe(400);
    expectBaseline(bad);
  });

  test('a HEAD request for the home page is a 200, not a 404', async () => {
    const r = await get('/', { method: 'HEAD' });
    expect(r.status).toBe(200);
    expectBaseline(r);
  });

  test('the home page keeps its own CSP', async () => {
    const csp = (await get('/')).headers.get('content-security-policy');
    expect(csp).toContain("default-src 'self'");
    expect(csp.match(/frame-ancestors/g).length).toBe(1);
  });
});

describe('withSecurityHeaders', () => {
  test('copies a response with immutable headers', () => {
    const r = withSecurityHeaders(Response.redirect('https://a.test/', 302));
    for (const [k, v] of Object.entries(BASELINE)) expect(r.headers.get(k)).toBe(v);
    expect(r.headers.get('content-security-policy')).toBe("frame-ancestors 'self' https://analytics.flisk.si");
  });

  test('adds frame-ancestors to a CSP without one and leaves other headers alone', () => {
    const r = withSecurityHeaders(new Response('x', { headers: { 'content-security-policy': "default-src 'self'", 'x-frame-options': 'DENY' } }));
    expect(r.headers.get('content-security-policy')).toBe("default-src 'self'; frame-ancestors 'self' https://analytics.flisk.si");
    expect(r.headers.get('x-frame-options')).toBe('DENY');
  });
});
