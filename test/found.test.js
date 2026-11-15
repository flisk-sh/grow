import { expect, test } from 'bun:test';
import { findListings } from '../src/found.js';

const pages = {
  'https://hn.algolia.com/api/v1/search?query=acme&tags=story&typoTolerance=false&hitsPerPage=30': JSON.stringify({ hits: [
    { objectID: '7', title: 'Acme Corp sued', url: 'https://news.example/acme' },
    { objectID: '8', title: 'Show HN: Acme – fast local stacks', url: 'https://github.com/acme/acme' },
  ] }),
  'https://www.saashub.com/acme': '<a href="https://acme.dev">acme.dev</a>',
  'https://toolradar.com/tools/acme-cli': 'Visit acme.dev',
  'https://devhunt.org/tool/acme': 'another acme, no domain here',
};
const fakeFetch = async (u) => (pages[u] !== undefined ? new Response(pages[u]) : new Response('', { status: 404 }));

test('finds Show HN and directory pages that name the domain', async () => {
  const out = await findListings('https://acme.dev', { fetch: fakeFetch });
  expect(out).toEqual([
    { place: 'Hacker News (Show HN)', link: 'https://news.ycombinator.com/item?id=8' },
    { place: 'SaaSHub', link: 'https://www.saashub.com/acme' },
    { place: 'Toolradar', link: 'https://toolradar.com/tools/acme-cli' },
  ]);
});

test('a site that is nowhere gives nothing', async () => {
  expect(await findListings('https://nobody.dev', { fetch: fakeFetch })).toEqual([]);
});
