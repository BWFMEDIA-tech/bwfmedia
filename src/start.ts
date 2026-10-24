import { createMiddleware, createStart } from '@tanstack/react-start';
import { attachCurrentSession } from '@/lib/session-auth-middleware';

const securityHeadersMiddleware = createMiddleware({ type: 'request' }).server(
  async ({ next }) => {
    const result = await next();
    const headers = result.response.headers;
    try {
      if (!headers.has('X-Frame-Options')) {
        headers.set('X-Frame-Options', 'SAMEORIGIN');
      }
      if (!headers.has('Content-Security-Policy')) {
        headers.set('Content-Security-Policy', "frame-ancestors 'self'");
      }
      if (!headers.has('X-Content-Type-Options')) {
        headers.set('X-Content-Type-Options', 'nosniff');
      }
      if (!headers.has('Referrer-Policy')) {
        headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      }
    } catch {
      // Some proxied/streamed responses have immutable headers — serve them unchanged.
    }
    return result;
  },
);

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeadersMiddleware],
  // Project-specific attacher validates/recover sessions; don't add a second attacher.
  functionMiddleware: [attachCurrentSession],
}));
