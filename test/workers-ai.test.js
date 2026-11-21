import { describe, expect, test } from 'bun:test';
import { FAST_MODEL, workersAi } from '../src/plan.js';

const body = JSON.stringify({ model: 'flisk-wolf-chat', temperature: 0.4, max_tokens: 1400, messages: [{ role: 'system', content: 's' }, { role: 'user', content: 'u' }] });
const call = (m) => m('https://inference.flisk.si/v1/chat/completions', { method: 'POST', body });

describe('workersAi', () => {
  test('runs the fast model and answers like chat completions, JSON objects as text', async () => {
    const runs = [];
    const ai = { run: async (model, input) => { runs.push({ model, input }); return { response: { product: 'x' }, usage: { neurons: 16 } }; } };
    const r = await call(workersAi(ai, null));
    expect(r.ok).toBe(true);
    expect(runs[0].model).toBe(FAST_MODEL);
    expect(runs[0].input).toEqual({ messages: [{ role: 'system', content: 's' }, { role: 'user', content: 'u' }], max_tokens: 1400, temperature: 0.4 });
    expect(JSON.parse((await r.json()).choices[0].message.content)).toEqual({ product: 'x' });
  });

  test('a string answer is passed through as it is', async () => {
    const r = await call(workersAi({ run: async () => ({ response: '{"a":1}' }) }, null));
    expect((await r.json()).choices[0].message.content).toBe('{"a":1}');
  });

  test('when the binding fails, the call goes to inference', async () => {
    const seen = [];
    const fallback = async (u, init) => { seen.push(u); return Response.json({ choices: [{ message: { content: '{}' } }] }); };
    const r = await call(workersAi({ run: async () => { throw new Error('4006: you have used up your daily free allocation of 10,000 neurons'); } }, fallback));
    expect(r.ok).toBe(true);
    expect(seen).toEqual(['https://inference.flisk.si/v1/chat/completions']);
  });

  test('an empty answer also goes to inference', async () => {
    let n = 0;
    await call(workersAi({ run: async () => ({ response: '' }) }, async () => { n++; return Response.json({}); }));
    expect(n).toBe(1);
  });

  test('with no fallback a failure is a 503 that names the limit, so grow shows the general guide', async () => {
    const r = await call(workersAi({ run: async () => { throw new Error('daily free allocation used up'); } }, null));
    expect(r.status).toBe(503);
    expect((await r.json()).error.message).toContain('daily');
  });
});
