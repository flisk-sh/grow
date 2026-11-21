import { describe, expect, test } from 'bun:test';
import { page } from '../src/page.js';

const html = () => page({});
const mainBlock = () => html().match(/<main(?:\s[^>]*)?>([\s\S]*?)<\/main>/);

describe('page landmark', () => {
  test('the home page has exactly one main landmark containing the h1', () => {
    const h = html();
    expect((h.match(/<main(?:\s|>)/g) || []).length).toBe(1);
    const main = mainBlock();
    expect(main).not.toBeNull();
    expect(main[1]).toContain('<h1>');
  });

  test('the header and footer sit outside the main landmark', () => {
    const h = html();
    const mainStart = h.indexOf('<main');
    const mainEnd = h.indexOf('</main>');
    expect(h.indexOf('<header')).toBeLessThan(mainStart);
    expect(h.indexOf('</header>')).toBeLessThan(mainStart);
    expect(h.indexOf('<footer')).toBeGreaterThan(mainEnd);
  });

  test('the plan and about sections stay inside main', () => {
    const main = mainBlock()[1];
    expect(main).toContain('id="plan"');
    expect(main).toContain('id="about"');
    expect(main).toContain('id="api"');
  });
});
