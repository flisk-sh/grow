import { describe, expect, test } from 'bun:test';
import { handle } from '../src/index.js';
import { fakeD1 } from './fake-d1.js';
import { fakeCache, fakeFetch } from './fixtures.js';

const call = (method, path) =>
	handle(new Request(`https://grow.flisk.si${path}`, { method }), {
		DB: fakeD1(),
		INFERENCE_KEY: 'k',
	}, { fetch: fakeFetch(), cache: fakeCache() });

describe('plan endpoint methods', () => {
	test('GET on the plan endpoint is 405 with Allow: POST and a JSON error', async () => {
		for (const method of ['GET', 'HEAD', 'PUT', 'DELETE', 'PATCH']) {
			const res = await call(method, '/api/plan');
			expect(res.status).toBe(405);
			expect(res.headers.get('allow')).toBe('POST');
			expect(res.headers.get('content-type')).toContain('application/json');
			const body = await res.json();
			expect(body.error).toContain('POST');
		}
	});

	test('an unknown path still returns 404', async () => {
		const res = await call('GET', '/api/not-a-route');
		expect(res.status).toBe(404);
	});

	test('GET on a saved plan still works', async () => {
		const res = await call('GET', '/api/plan/example');
		expect(res.status).toBe(200);
	});
});
