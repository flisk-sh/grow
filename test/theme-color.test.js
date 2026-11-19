import { expect, test } from 'bun:test';
import { page } from '../src/page.js';

const home = () => page();

test('the page declares theme-colors matching the light and dark page backgrounds', () => {
  const html = home();
  expect(html).toContain('<meta name="theme-color" content="#eeece5">');
  expect(html).toContain('<meta name="theme-color" content="#eeece5" media="(prefers-color-scheme: light)">');
  expect(html).toContain('<meta name="theme-color" content="#0b0b0d" media="(prefers-color-scheme: dark)">');
});
