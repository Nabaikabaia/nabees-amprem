// ============================================
//  Obfuscated by Nabees Tech
//  Domain: git.nabees.online
//  WhatsApp: https://whatsapp.com/channel/0029VawtjOXJpe8X3j3NCZ3j
//  Protected - Do not redistribute
// ============================================
export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
};
