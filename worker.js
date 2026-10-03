const CORS = {
  "Access-Control-Allow-Origin": "same-origin",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...CORS, ...extra }
  });

const sessionCookie = (value, maxAge = 2592000) =>
  `nabees_session=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Strict`;

async function upstream(url, body, env) {
  if (!env.AUTH_API_KEY) throw new Error("AUTH_API_KEY is not configured");
  const r = await fetch(`${url}?key=${encodeURIComponent(env.AUTH_API_KEY)}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-android-package": "com.alightcreative.motion",
      "x-android-cert": "ECA6BF91B8715A6F810ED0BBFC65B6CD578F52A8",
      "user-agent": "dalvik/2.1.0 (linux; u; android 15; 23127pn0cc build/bp1a.250505.005)"
    },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error("upstream"), { status: r.status, data });
  return data;
}

function extractCode(raw = "") {
  try {
    const u = new URL(raw);
    const direct = u.searchParams.get("oobCode") || u.searchParams.get("code");
    if (direct) return direct;
    const nested = u.searchParams.get("link") || u.searchParams.get("q") || u.searchParams.get("url");
    if (nested) {
      try { return new URL(nested).searchParams.get("oobCode") || raw; } catch {}
    }
  } catch {}
  const m = String(raw).match(/oobCode=([a-zA-Z0-9_-]+)/i);
  return m ? m[1] : String(raw).trim();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    if (url.pathname === "/api/status") {
      return json({ ok: true, service: "Nabees Alight Motion Generator", auth: Boolean(env.AUTH_API_KEY) });
    }

    try {
      const IDT = env.IDENTITY_TOOLKIT_BASE || "https://www.googleapis.com/identitytoolkit/v3/relyingparty";
      const STK = env.SECURETOKEN_BASE || "https://securetoken.googleapis.com/v1/token";

      if (url.pathname === "/api/auth/link" && request.method === "POST") {
        const { email } = await request.json();
        if (!email) return json({ ok: false, error: "Email required" }, 400);
        await upstream(`${IDT}/getOobConfirmationCode`, {
          requestType: 6,
          email,
          androidInstallApp: true,
          canHandleCodeInApp: true,
          continueUrl: "https://alightcreative.com?ui_sid=0366624874&ui_sd=0",
          iosBundleId: "com.alightcreative.motion",
          androidPackageName: "com.alightcreative.motion",
          androidMinimumVersion: "585",
          clientType: "CLIENT_TYPE_ANDROID"
        }, env);
        return json({ ok: true, message: "Magic link requested." });
      }

      if (url.pathname === "/api/auth/verify" && request.method === "POST") {
        const { email, raw } = await request.json();
        const data = await upstream(`${IDT}/emailLinkSignin`, {
          email,
          oobCode: extractCode(raw),
          clientType: "CLIENT_TYPE_ANDROID"
        }, env);
        return json({ ok: true, uid: data.localId || data.userId || null }, 200, {
          "Set-Cookie": sessionCookie(data.refreshToken)
        });
      }

      if (url.pathname === "/api/auth/refresh" && request.method === "POST") {
        const m = (request.headers.get("Cookie") || "").match(/(?:^|;\s*)nabees_session=([^;]+)/);
        if (!m) return json({ ok: false, error: "No active session." }, 401);
        const data = await upstream(STK, {
          grant_type: "refresh_token",
          refresh_token: decodeURIComponent(m[1])
        }, env);
        return json({ ok: true }, 200, {
          "Set-Cookie": sessionCookie(data.refresh_token || decodeURIComponent(m[1]))
        });
      }

      if (url.pathname === "/api/auth/logout" && request.method === "POST") {
        return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
      }

      const response = await env.ASSETS.fetch(request);
      const headers = new Headers(response.headers);
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("X-Frame-Options", "SAMEORIGIN");
      headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    } catch (e) {
      return json({
        ok: false,
        error: e.message === "AUTH_API_KEY is not configured"
          ? "Server authentication is not configured."
          : "Authentication request failed."
      }, e.status || 500);
    }
  }
};