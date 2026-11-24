import { describe, expect, test } from 'bun:test';
import { nextPage } from '../src/next.js';
import { LANGS, SHELL, splitLang } from '../src/i18n.js';
import { handle } from '../src/index.js';
import { fakeD1 } from './fake-d1.js';
import { fakeCache, fakeFetch } from './fixtures.js';

const setup = () => {
  const env = { DB: fakeD1(), INFERENCE_KEY: 'k' };
  const deps = { fetch: fakeFetch(), cache: fakeCache() };
  return { get: (p) => handle(new Request('https://grow.flisk.si' + p), env, deps) };
};

describe('languages', () => {
  test('English stays the default at / and says so in hreflang', () => {
    const h = nextPage({ index: true });
    expect(h).toContain('<html lang="en">');
    expect(h).toContain('<link rel="canonical" href="https://grow.flisk.si/">');
    expect(h).toContain('hreflang="en" href="https://grow.flisk.si/"');
    expect(h).toContain('hreflang="lv" href="https://grow.flisk.si/lv/"');
    expect(h).toContain('hreflang="x-default" href="https://grow.flisk.si/"');
  });

  test('the Latvian home is its own canonical page with the same hreflang set', () => {
    const h = nextPage({ index: true, lang: 'lv' });
    expect(h).toContain('<html lang="lv">');
    expect(h).toContain('<link rel="canonical" href="https://grow.flisk.si/lv/">');
    expect(h).toContain('hreflang="en" href="https://grow.flisk.si/"');
    expect(h).toContain('hreflang="lv" href="https://grow.flisk.si/lv/"');
    expect(h).toContain('hreflang="x-default" href="https://grow.flisk.si/"');
    expect(h).toContain('<h1>Atrodi savus pirmos klientus.</h1>');
    expect(h).toContain('"lang":"lv"');
  });

  test('plan pages carry no hreflang and stay out of the index', () => {
    const h = nextPage({ planId: 'example', share: { host: 'x', summary: '' }, index: false, lang: 'lv' });
    expect(h).not.toContain('hreflang');
    expect(h).toContain('noindex');
  });

  test('every language has every shell string', () => {
    for (const l of LANGS) expect(Object.keys(SHELL[l]).sort()).toEqual(Object.keys(SHELL.en).sort());
  });

  test('splitLang reads the prefix and leaves English alone', () => {
    expect(splitLang('/lv/p/abc')).toEqual({ lang: 'lv', path: '/p/abc' });
    expect(splitLang('/lv')).toEqual({ lang: 'lv', path: '/' });
    expect(splitLang('/example')).toEqual({ lang: 'en', path: '/example' });
    expect(splitLang('/en/')).toEqual({ lang: 'en', path: '/en/' });
    expect(splitLang('/me')).toEqual({ lang: 'en', path: '/me' });
  });

  test('/lv/ serves Latvian, /lv redirects to it, / stays English', async () => {
    const s = setup();
    const lv = await s.get('/lv/');
    expect(lv.status).toBe(200);
    expect(await lv.text()).toContain('<html lang="lv">');
    const bare = await s.get('/lv');
    expect(bare.status).toBe(301);
    expect(bare.headers.get('location')).toBe('/lv/');
    expect(await (await s.get('/')).text()).toContain('<html lang="en">');
    expect((await s.get('/fr/')).status).not.toBe(200);
  });

  test('the sitemap lists both homes with their alternates; robots allows /lv/ and blocks its plans', async () => {
    const s = setup();
    const x = await (await s.get('/sitemap.xml')).text();
    expect(x).toContain('<loc>https://grow.flisk.si/lv/</loc>');
    expect(x).toContain('hreflang="lv" href="https://grow.flisk.si/lv/"');
    const r = await (await s.get('/robots.txt')).text();
    expect(r).toContain('Allow: /lv/$');
    expect(r).toContain('Disallow: /lv/p/');
  });
});
