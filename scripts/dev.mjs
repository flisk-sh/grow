// Local preview: the real Worker code with D1 on bun:sqlite and a stand-in model and Citable (no key, no neurons).
// bun scripts/dev.mjs  ->  http://localhost:8819
import { handle } from '../src/index.js';
import { fakeD1 } from '../test/fake-d1.js';
import { fakeCache, fakeFetch, MODEL_PLAN } from '../test/fixtures.js';

const plan = {
  ...MODEL_PLAN,
  places: [
    { name: 'r/webdev', why: 'Developers who build client sites ask for tools here every day.', url: 'https://www.reddit.com/r/webdev/' },
    { name: 'Indie Hackers', why: 'Makers share what they use to ship.', url: 'https://www.indiehackers.com/' },
    { name: 'Agency owners on LinkedIn', why: 'Owners post about delivery time and margins.', url: '' },
    { name: 'Hacker News', why: 'Early adopters try new developer tools.', url: 'https://news.ycombinator.com/' },
    { name: 'Dev.to', why: 'Write a how-to that uses the tool.', url: 'https://dev.to/' },
  ],
  emails: Array.from({ length: 5 }, (_, i) => ({ to: ['Agency owner', 'Freelance developer', 'Head of delivery', 'Studio founder', 'Tech lead at an agency'][i], subject: ['Setup time on client sites', 'A faster first day', 'Fewer setup hours', 'Quick question', 'Trying a new tool'][i], body: `Hi,\n\nI saw your agency builds sites for small shops. I made a tool that sets up a new client project in a few minutes instead of half a day.\n\nWould you try it on your next project and tell me what breaks?\n\n[your name]` })),
  posts: [
    { where: 'X', title: 'Shipped', body: 'I made a tool that sets up a client site in minutes. Free to try.' },
    { where: 'Reddit', title: 'I made a tool that cuts client site setup to minutes', body: 'Agency devs: how long does your setup take? Mine was half a day, so I built this.' },
    { where: 'Hacker News', title: 'Show HN: Set up a client site in minutes', body: 'It reads your template and makes the project.' },
  ],
};
const f = fakeFetch({ model: plan });
const slow = async (u, i) => {
  if (process.env.MODEL_TIMEOUT) { const e = new Error('The operation timed out.'); e.name = 'TimeoutError'; throw e; } await new Promise((r) => setTimeout(r, Number(process.env.SLOW_MS) || 1500)); return f(u, i); };
const env = { DB: fakeD1(), INFERENCE_KEY: 'dev', INFERENCE: { fetch: slow }, CITABLE: { fetch: f } };
const deps = { fetch: f, cache: fakeCache() };
const port = Number(process.env.PORT) || 8819;
Bun.serve({ port, fetch: (req) => handle(req, env, deps) });
console.log(`grow dev on http://localhost:${port}`);
