// The live home page is the React app (web/src/App.jsx, built into next-app.generated.js).
// The GEL next-cta guard only renders src/next.js, so this test covers the React build.
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { NEXT_JS } from '../src/next-app.generated.js';

const src = readFileSync(new URL('../web/src/App.jsx', import.meta.url), 'utf8');

describe('next-cta in the React home page', () => {
  test('the Make my plan button sits inside the marked next-cta element', () => {
    const at = src.indexOf("t('make')");
    expect(at).toBeGreaterThan(0);
    const before = src.slice(0, at).lastIndexOf('<span className="next-cta" data-next-cta');
    expect(before).toBeGreaterThan(src.lastIndexOf('function Home('));
  });

  test('the built app carries the marker and its CSS', () => {
    expect(NEXT_JS).toContain('next-cta');
  });
});
