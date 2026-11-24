import { describe, expect, test } from 'bun:test';
import { cleanFollowers, cleanLinks, cleanPlan, httpUrl, linkKind, makePlan, parseJson, profileLinks, profileOf, readPage, soonNetwork, followersSystem } from '../src/plan.js';
import { MODEL_PLAN, fakeFetch } from './fixtures.js';

describe('plan', () => {
  test('httpUrl keeps only http(s) links with a dot in the host', () => {
    expect(httpUrl('https://a.com/x')).toBe('https://a.com/x');
    expect(httpUrl('javascript:alert(1)')).toBe('');
    expect(httpUrl('http://localhost')).toBe('');
    expect(httpUrl(null)).toBe('');
  });

  test('parseJson reads JSON inside code fences and text', () => {
    expect(parseJson('Sure!\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJson('no json')).toBeNull();
  });

  test('cleanPlan drops bad links and unknown post places, keeps line breaks in bodies', () => {
    const p = cleanPlan(MODEL_PLAN);
    expect(p.places[1].url).toBe('');
    expect(p.posts[1].where).toBe('X');
    expect(p.emails[0].body).toContain('\n');
  });

  test('cleanPlan returns null without buyers, places or emails', () => {
    expect(cleanPlan({ ...MODEL_PLAN, buyers: '' })).toBeNull();
    expect(cleanPlan({ ...MODEL_PLAN, places: [] })).toBeNull();
    expect(cleanPlan({ ...MODEL_PLAN, emails: [] })).toBeNull();
    expect(cleanPlan('x')).toBeNull();
  });

  test('readPage strips scripts and tags', async () => {
    const p = await readPage('https://a.com', fakeFetch());
    expect(p.title).toBe('Thing');
    expect(p.desc).toBe('Does a thing');
    expect(p.body).toBe('Hello & welcome');
  });

  test('links: kinds by host, twelve at most, no repeats, no main link', () => {
    expect(linkKind('https://github.com/acme/tool')).toBe('GitHub');
    expect(linkKind('https://twitter.com/acme')).toBe('X');
    expect(linkKind('https://docs.acme.com/')).toBe('Other');
    expect(cleanLinks(['https://a.com/', 'https://www.github.com/acme', 'https://github.com/acme/', 'javascript:x', 'nope'], 'https://a.com')).toEqual(['https://www.github.com/acme']);
    expect(cleanLinks(Array.from({ length: 20 }, (_, i) => 'https://s' + i + '.com/'))).toHaveLength(12);
    expect(cleanLinks('https://a.com/')).toEqual([]);
    expect(cleanLinks(['https://www.producthunt.com/products/flisk?embed=true&utm_source=badge-featured&utm_medium=badge', 'https://www.youtube.com/watch?v=abc&si=x', 'https://x.com/acme?s=20'])).toEqual(['https://www.producthunt.com/products/flisk', 'https://www.youtube.com/watch?v=abc', 'https://x.com/acme']);
    expect(cleanLinks(['https://github.com/flisk-sh/flisk/blob/main/LICENSE', 'https://github.com/flisk-sh/flisk', 'https://github.com/features'])).toEqual(['https://github.com/flisk-sh/flisk', 'https://github.com/features']);
  });

  test('a page gives its profile links, not share buttons', () => {
    const html = '<a href="https://github.com/acme/tool">gh</a><a href="https://x.com/intent/post?text=hi">share</a><a href="https://x.com/acme">x</a><a href="https://example.com/blog">blog</a><a href="https://www.linkedin.com/">li</a><a href="https://github.com/acme/other">gh2</a>';
    expect(profileLinks(html, 'https://acme.com/')).toEqual(['https://github.com/acme/tool', 'https://x.com/acme']);
  });

  test('links to adopters and contributors in the page body are not the maker\'s', () => {
    const html = '<nav><a href="https://discord.gg/qMu5Xn8Kaq">chat</a></nav><a href="https://github.com/AK-Lmn">contributor</a>'
      + '<a href="https://www.linkedin.com/company/lekast/">adopter</a><a href="https://github.com/flisk-sh/flisk/blob/main/LICENSE">license</a>'
      + '<footer><a href="https://x.com/someone">x</a></footer>';
    expect(profileLinks(html, 'https://flisk.sh/')).toEqual(['https://discord.gg/qMu5Xn8Kaq', 'https://github.com/flisk-sh/flisk', 'https://x.com/someone']);
  });

  test('makePlan reads the maker\'s links and keeps them in the plan', async () => {
    const page = fakeFetch(), model = fakeFetch();
    const out = await makePlan('https://a.com/', { fetch: page, model, citable: fakeFetch(), key: 'k', links: ['https://github.com/acme/tool', 'https://a.com/'] });
    expect(out.plan.links).toEqual(['https://github.com/acme/tool']);
    expect(out.links).toBeUndefined();
    expect(JSON.parse(model.calls[0].init.body).messages[1].content).toContain("The maker's other pages: GitHub https://github.com/acme/tool");
    const busy = await makePlan('https://a.com/', { fetch: page, model: fakeFetch({ modelStatus: 429, modelError: 'Daily budget used' }), citable: fakeFetch(), key: 'k', links: ['https://x.com/acme'] });
    expect(busy.fallback.links).toEqual(['https://x.com/acme']);
  });

  test('makePlan calls the model and Citable through the given functions', async () => {
    const page = fakeFetch(), model = fakeFetch(), citable = fakeFetch();
    const out = await makePlan('https://a.com/', { fetch: page, model, citable, key: 'k1' });
    expect(out.plan.check).toMatchObject({ score: 62, grade: 'C', report: 'https://citable.flisk.si/a.com' });
    expect(out.plan.check.fixes).toHaveLength(1);
    expect(out.plan.check.fixes[0].status).toBe('fail');
    expect(out.plan.listings.length).toBeGreaterThan(5);
    expect(model.calls[0].init.headers.authorization).toBe('Bearer k1');
    expect(JSON.parse(model.calls[0].init.body).model).toBe('flisk-wolf-chat');
    expect(citable.calls[0].url).toContain('citable.flisk.si/api/check');
    expect(page.calls.every((c) => !c.url.includes('inference'))).toBe(true);
  });

  test('makePlan asks for the plan, the emails and the posts in three calls and joins them', async () => {
    const model = fakeFetch();
    const out = await makePlan('https://a.com/', { fetch: fakeFetch(), model, citable: fakeFetch(), key: 'k' });
    const sys = model.calls.map((c) => JSON.parse(c.init.body).messages[0].content);
    expect(sys).toHaveLength(3);
    expect(sys.some((t) => t.includes('"posts"') && !t.includes('"places"') && !t.includes('"emails"'))).toBe(true);
    expect(sys.some((t) => t.includes('"emails"') && !t.includes('"places"'))).toBe(true);
    expect(out.plan.emails.length).toBeGreaterThan(0);
    expect(out.plan.places.length).toBeGreaterThan(0);
  });

  test('a plan lists communities that allow self-promotion and keeps a Discord draft', async () => {
    const model = fakeFetch({ model: { ...MODEL_PLAN, posts: [{ where: 'Discord', title: 'Show', body: 'Hi all' }] } });
    const out = await makePlan('https://a.com/', { fetch: fakeFetch(), model, citable: fakeFetch(), key: 'k' });
    expect(out.plan.posts[0].where).toBe('Discord');
    expect(out.plan.promo.some((x) => x.url === 'https://discord.com/channels/1562937840071999538/1569404291196915904')).toBe(true);
    expect(out.plan.promo.filter((x) => x.where === 'Reddit').length).toBeGreaterThan(2);
  });

  test('makePlan reports a used-up budget as busy', async () => {
    const out = await makePlan('https://a.com/', { fetch: fakeFetch(), model: fakeFetch({ modelStatus: 429, modelError: 'Daily limit reached' }), key: 'k' });
    expect(out.error).toBe('busy');
  });
});

describe('followers plan for a profile link', () => {
  const FOLLOWERS = {
    account: 'A hosting account', audience: 'Indie devs who run servers.', bio: 'Servers without the pain.', pinned: 'Pinned.', today: 'Pin the post.',
    queries: ['vps for side project', 'x'], accounts: [{ name: 'Indie hackers', why: 'fit' }],
    week: [{ day: 'Day 1', do: 'Set the bio' }], posts: [{ title: 'Tip', body: 'One tip.' }], replies: [{ to: 'a hosting question', body: 'Try this.' }],
  };
  const model = () => { const calls = []; const f = async (url, init) => { calls.push({ url, init }); return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(FOLLOWERS) } }] }), { headers: { 'content-type': 'application/json' } }); }; f.calls = calls; return f; };

  test('profileOf reads X and Twitter handles and skips app paths', () => {
    expect(profileOf('https://x.com/brookservers')).toEqual({ network: 'X', handle: 'brookservers' });
    expect(profileOf('https://twitter.com/a_b/status/1')).toEqual({ network: 'X', handle: 'a_b' });
    expect(profileOf('https://x.com/home')).toBeNull();
    expect(profileOf('https://x.com/')).toBeNull();
    expect(profileOf('https://example.com/brookservers')).toBeNull();
  });

  test('profileOf reads Bluesky profile links', () => {
    expect(profileOf('https://bsky.app/profile/brookservers.bsky.social')).toEqual({ network: 'Bluesky', handle: 'brookservers.bsky.social' });
    expect(profileOf('https://bsky.app/profile/Brook.Dev/post/3k')).toEqual({ network: 'Bluesky', handle: 'brook.dev' });
    expect(profileOf('https://bsky.app/profile/')).toBeNull();
    expect(profileOf('https://bsky.app/search?q=a')).toBeNull();
  });

  test('a Bluesky link gets a Bluesky plan', async () => {
    const m = model();
    const out = await makePlan('https://bsky.app/profile/brookservers.bsky.social', { fetch: fakeFetch(), model: m, citable: fakeFetch(), key: 'k' });
    expect(out.plan.network).toBe('Bluesky');
    expect(JSON.parse(m.calls[0].init.body).messages[0].content).toContain('Bluesky account');
  });

  test('makePlan builds a followers plan without reading the page or calling Citable', async () => {
    const page = fakeFetch(), citable = fakeFetch(), m = model();
    const out = await makePlan('https://x.com/brookservers', { fetch: page, model: m, citable, key: 'k', about: 'cheap servers' });
    expect(out.plan.kind).toBe('followers');
    expect(out.plan.handle).toBe('brookservers');
    expect(out.plan.queries).toEqual(['vps for side project']);
    expect(out.plan.check).toBeUndefined();
    expect(page.calls).toHaveLength(0);
    expect(citable.calls).toHaveLength(0);
    const sent = JSON.parse(m.calls[0].init.body);
    expect(sent.messages[0].content).toContain('followers');
    expect(sent.messages[1].content).toContain('@brookservers');
    expect(sent.messages[1].content).toContain('cheap servers');
  });

  test('cleanFollowers needs an audience, posts and a week', () => {
    const p = { network: 'X', handle: 'a' };
    expect(cleanFollowers({ ...FOLLOWERS, posts: [] }, p)).toBeNull();
    expect(cleanFollowers({ ...FOLLOWERS, week: [] }, p)).toBeNull();
    expect(cleanFollowers({ ...FOLLOWERS, audience: '' }, p)).toBeNull();
  });
});

describe('Instagram profiles', () => {
  test('profileOf reads Instagram handles and skips post and app paths', () => {
    expect(profileOf('https://www.instagram.com/someuser')).toEqual({ network: 'Instagram', handle: 'someuser' });
    expect(profileOf('https://instagram.com/Some.User/?hl=en')).toEqual({ network: 'Instagram', handle: 'some.user' });
    expect(profileOf('https://www.instagram.com/p/abc123/')).toBeNull();
    expect(profileOf('https://www.instagram.com/')).toBeNull();
  });
  test('soonNetwork flags LinkedIn, YouTube and TikTok profiles only', () => {
    expect(soonNetwork('https://www.linkedin.com/in/someone')).toBe('LinkedIn');
    expect(soonNetwork('https://www.youtube.com/@someone')).toBe('YouTube');
    expect(soonNetwork('https://www.tiktok.com/@someone')).toBe('TikTok');
    expect(soonNetwork('https://www.youtube.com/watch?v=1')).toBe('');
    expect(soonNetwork('https://example.com/@someone')).toBe('');
  });
  test('the model prompt names Instagram', () => {
    expect(followersSystem('Instagram')).toContain('their Instagram account');
    expect(followersSystem('X')).toContain('their X (Twitter) account');
  });
});
