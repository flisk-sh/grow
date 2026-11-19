import { expect, test } from 'bun:test';
import { handle } from '../src/index.js';
import { page } from '../src/page.js';

const get = (p) => handle(new Request(`https://grow.flisk.si${p}`), {}, {});
const dims = (bytes) => {
  expect(bytes.slice(0, 8)).toEqual(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]));
  return [new DataView(bytes.buffer, bytes.byteOffset).getUint32(16), new DataView(bytes.buffer, bytes.byteOffset).getUint32(20)];
};

test('the page declares an apple-touch-icon', () => {
  expect(page()).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png">');
});

test('the touch icon is a cached 180x180 PNG', async () => {
  const res = await get('/apple-touch-icon.png');
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toMatch(/^image\/png/);
  expect(res.headers.get('cache-control')).toContain('max-age=86400');
  expect(dims(new Uint8Array(await res.arrayBuffer()))).toEqual([180, 180]);
});
