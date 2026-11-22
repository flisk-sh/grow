import { describe, expect, test } from 'bun:test';
import { SYSTEM, SYSTEM_EMAILS, SYSTEM_POSTS, cleanPlan, makePlan, unlink, unsub } from '../src/plan.js';
import { MODEL_PLAN, fakeFetch } from './fixtures.js';

// A page fetch that also answers the GitHub API with a repo whose Website field is set (or not).
const withRepo = (homepage) => {
  const base = fakeFetch();
  const fn = async (u, init) => (String(u).startsWith('https://api.github.com/repos/') ? (base.calls.push({ url: String(u) }), Response.json({ homepage })) : base(u, init));
  fn.calls = base.calls;
  return fn;
};

describe('plan quality', () => {
  test('the prompts write as the maker, to one narrow buyer group', () => {
    for (const s of [SYSTEM, SYSTEM_EMAILS, SYSTEM_POSTS]) expect(s).toContain('AS THE MAKER');
    expect(SYSTEM).toContain('the one step THE MAKER takes today');
    expect(SYSTEM_EMAILS).toContain('"followup"');
    expect(SYSTEM_EMAILS).toContain('"find"');
    expect(SYSTEM_POSTS).toContain('Do not put a subreddit name');
  });

  test('made-up subreddits and pasted links come out of the post drafts', () => {
    expect(unsub('r/WeAreTheMusicMakers: Get a plan')).toBe('Get a plan');
    expect(unsub('/r/startups - I built a thing')).toBe('I built a thing');
    expect(unsub('Show HN: Grow')).toBe('Show HN: Grow');
    expect(unlink('Try it: https://github.com/a/b now')).toBe('Try it: now');
    const p = cleanPlan({ ...MODEL_PLAN, emails: [{ to: 'x', subject: 's', body: 'b', followup: 'f', find: 'Show HN' }], posts: [{ where: 'Reddit', title: 'r/Music: Hi', body: 'see https://a.com' }] });
    expect(p.posts[0]).toMatchObject({ title: 'Hi', body: 'see' });
    expect(p.emails[0]).toMatchObject({ followup: 'f', find: 'Show HN' });
  });

  test('a GitHub repo is checked and linked through its own website', async () => {
    const page = withRepo('https://grow.flisk.si/'), citable = fakeFetch(), model = fakeFetch();
    const out = await makePlan('https://github.com/flisk-sh/grow', { fetch: page, model, citable, key: 'k' });
    expect(out.plan.site).toBe('https://grow.flisk.si/');
    expect(citable.calls[0].url).toContain(encodeURIComponent('https://grow.flisk.si/'));
    expect(out.plan.check.report).toBe('https://citable.flisk.si/grow.flisk.si');
    expect(JSON.parse(model.calls[0].init.body).messages[1].content).toContain("The product's website: https://grow.flisk.si/");
  });

  test('a GitHub repo with no website gets no github.com score', async () => {
    const citable = fakeFetch();
    const out = await makePlan('https://github.com/acme/tool', { fetch: withRepo(null), model: fakeFetch(), citable, key: 'k' });
    expect(out.plan.noSite).toBe(true);
    expect(out.plan.check).toBeNull();
    expect(citable.calls).toHaveLength(0);
    // A website the maker gave wins over the repo field.
    const given = await makePlan('https://github.com/acme/tool', { fetch: withRepo(null), model: fakeFetch(), citable: fakeFetch(), key: 'k', links: ['https://tool.dev/'] });
    expect(given.plan.site).toBe('https://tool.dev/');
  });

  test('Hacker News is not listed twice when there is an HN post', async () => {
    const model = fakeFetch({ model: { ...MODEL_PLAN, posts: [{ where: 'Hacker News', title: 'Show HN: x', body: 'b' }] } });
    const out = await makePlan('https://a.com/', { fetch: fakeFetch(), model, citable: fakeFetch(), key: 'k' });
    expect(out.plan.listings.some((l) => /hacker news/i.test(l.name))).toBe(false);
    const plain = await makePlan('https://a.com/', { fetch: fakeFetch(), model: fakeFetch(), citable: fakeFetch(), key: 'k' });
    expect(plain.plan.listings[0].name).toContain('Hacker News');
  });

  test('the page links posts to the website and offers the Day 7 follow-up', async () => {
    const { default: worker } = await import('../src/index.js');
    const html = await (await worker.fetch(new Request('https://grow.flisk.si/'), {})).text();
    expect(html).toContain('const u = plan.site || plan.url;');
    expect(html).toContain("'Day 7 follow-up'");
    expect(html).toContain('else if (plan.noSite)');
  });
});
