import { describe, expect, test } from 'bun:test';
import { CSS, page } from '../src/page.js';
import { cabinetPage } from '../src/cabinet.js';
import { nextPage } from '../src/next.js';

const skip = '<a class="skip-link" href="#main">Skip to content</a>';

describe('skip to content', () => {
  test('the skip link is the first focusable element on each page', () => {
    for (const html of [page({}), cabinetPage({}), nextPage({})]) {
      expect(html).toContain(`<body>${skip}`);
      expect(html.indexOf(skip)).toBeLessThan(html.indexOf('<main'));
    }
  });

  test('the target exists on each page', () => {
    for (const html of [page({}), cabinetPage({}), nextPage({})]) {
      expect(html).toContain('id="main"');
    }
  });

  test('the link is hidden until focused', () => {
    expect(CSS).toMatch(/\.skip-link\{[^}]*left:\s*-9999px/);
    expect(CSS).toMatch(/\.skip-link:focus\{[^}]*left:\s*0/);
  });
});
