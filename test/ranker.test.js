import { expect, test } from 'bun:test';
import { githubRepo, rankerFor } from '../src/plan.js';

test('githubRepo reads owner/repo from GitHub links only', () => {
  expect(githubRepo('https://github.com/yashh1323/auto-qa')).toBe('yashh1323/auto-qa');
  expect(githubRepo('https://github.com/a/b.git')).toBe('a/b');
  expect(githubRepo('https://github.com/a/b/tree/main?x=1')).toBe('a/b');
  expect(githubRepo('https://github.com/sponsors/x')).toBe('');
  expect(githubRepo('https://github.com/someone')).toBe('');
  expect(githubRepo('https://example.com/a/b')).toBe('');
});

test('rankerFor lists the repo on Ranker and gives its page and badge', async () => {
  let sent;
  const call = async (u, init) => { sent = [u, JSON.parse(init.body)]; return new Response(JSON.stringify({ slug: 'a-b', url: '/a/b', product: { stars: 42 } })); };
  const k = await rankerFor('https://github.com/a/b', call);
  expect(sent).toEqual(['https://ranker.flisk.si/api/submit', { url: 'https://github.com/a/b' }]);
  expect(k).toMatchObject({ repo: 'a/b', listed: true, url: 'https://ranker.flisk.si/a/b', badge: 'https://ranker.flisk.si/badge/a-b.svg', stars: 42 });
  expect(k.markdown).toBe('[![Flisk Ranker](https://ranker.flisk.si/badge/a-b.svg)](https://ranker.flisk.si/a/b)');
});

test('rankerFor still links the Ranker page when Ranker does not answer, and skips other links', async () => {
  const k = await rankerFor('https://github.com/a/b', async () => { throw new Error('down'); });
  expect(k).toEqual({ repo: 'a/b', url: 'https://ranker.flisk.si/a/b', listed: false });
  expect(await rankerFor('https://example.com', async () => { throw new Error('no call'); })).toBe(null);
});
