import { describe, expect, test } from 'bun:test';
import { NEXT_JS } from '../src/next-app.generated.js';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../web/src/App.jsx', import.meta.url), 'utf8');

describe('home URL input', () => {
  test('lets the browser offer past links', () => {
    expect(app).toContain('htmlName="url" autoComplete="url"');
  });
  test('keeps the last five links and shows them', () => {
    expect(app).toContain('.slice(0, 5)');
    expect(NEXT_JS).toContain('grow:recent-urls');
  });
  test('rotates the placeholder every 2 seconds', () => {
    expect(app).toContain('useRotatingHint(URL_HINTS)');
    expect(app).toMatch(/useRotatingHint\(list, ms = 2000\)/);
    expect(app).toContain('placeholder={hint}');
  });
});
