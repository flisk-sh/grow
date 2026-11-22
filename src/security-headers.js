// Baseline security headers for every response grow.flisk.si sends (pages, API, redirects, 404s).
export const BASELINE = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
};

// Adds what is missing; a header the route already set is never duplicated or overwritten. A CSP the response has is kept
// (the home page sets its own, with frame-ancestors 'none'); one without frame-ancestors gets frame-ancestors 'self' https://analytics.flisk.si, and a
// response with no CSP gets only that directive, so no script or style rule can break a page.
export function withSecurityHeaders(res) {
  // Headers of a Response from a fetch, a cache or Response.redirect() can be immutable: copy into a new Response.
  const out = new Response(res.body, res);
  for (const [name, value] of Object.entries(BASELINE)) if (!out.headers.has(name)) out.headers.set(name, value);
  const csp = out.headers.get('content-security-policy');
  if (csp === null) out.headers.set('content-security-policy', "frame-ancestors 'self' https://analytics.flisk.si");
  else if (!/frame-ancestors/i.test(csp)) out.headers.set('content-security-policy', `${csp}; frame-ancestors 'self' https://analytics.flisk.si`);
  return out;
}
