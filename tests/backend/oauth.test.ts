import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { NextRequest, type NextResponse } from "next/server";
import { POST as google } from "../../src/app/api/v1/auth/google/route";
import { GET as callback } from "../../src/app/api/v1/auth/callback/route";
import { GET as session } from "../../src/app/api/v1/auth/session/route";

const origin = "http://localhost:3000";
const userId = "00000000-0000-4000-8000-000000000003";
const username = `user_${userId.replaceAll("-", "").slice(0, 24)}`;
const user = {
  id: userId, email: "google.tester@gmail.com", aud: "authenticated", created_at: "2026-10-23T00:00:00Z",
  app_metadata: { provider: "google", app_role: "user" },
  user_metadata: { full_name: "Google Tester", avatar_url: "https://lh3.googleusercontent.com/test-avatar", role: "admin" },
};
const cookies = (response: NextResponse) => response.cookies.getAll().map(c => `${c.name}=${c.value}`).join("; ");

test("Google OAuth PKCE, callbacks and profile synchronization", async (t) => {
  const keys = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "APP_URL"] as const;
  const previous = keys.map(key => process.env[key]);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.test";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_only";
  process.env.APP_URL = origin;
  let profile = { username, display_name: username, avatar_url: null as string | null, role: "user" };
  let challenge = "";
  let tokenCalls = 0;
  let updates = 0;
  let profileUnavailable = false;
  let usernameMigrationMissing = false;
  const fetchMock = t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    assert.equal(url.origin, "https://supabase.example.test");
    if (url.pathname === "/auth/v1/token") {
      tokenCalls++;
      assert.equal(url.searchParams.get("grant_type"), "pkce");
      const body = await request.json();
      if (!body.code_verifier || body.auth_code !== "valid-code") {
        return Response.json({ code: "bad_code_verifier", message: "Invalid code" }, { status: 400 });
      }
      assert.equal(createHash("sha256").update(body.code_verifier).digest("base64url"), challenge);
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;
      const token = [Buffer.from('{"alg":"HS256"}').toString("base64url"), Buffer.from(JSON.stringify({ sub: userId, exp: expiresAt })).toString("base64url"), "testsignature"].join(".");
      return Response.json({ access_token: token, refresh_token: "refresh-test-only", token_type: "bearer", expires_in: 3600, expires_at: expiresAt, user });
    }
    if (url.pathname === "/auth/v1/user") return Response.json(user);
    if (url.pathname === "/rest/v1/rpc/sync_google_username") {
      if (usernameMigrationMissing) return Response.json({ code: "PGRST202", message: "Function not found" }, { status: 404 });
      if (profile.username === username) profile.username = "google_tester";
      return Response.json(profile.username);
    }
    if (url.pathname === "/rest/v1/profiles") {
      if (profileUnavailable) return Response.json(null);
      if (request.method === "PATCH") {
        updates++;
        assert.equal(url.searchParams.get("id"), `eq.${userId}`);
        const body = await request.json();
        assert.equal(body.username, undefined);
        profile = { ...profile, ...body };
        return new Response(null, { status: 204 });
      }
      return Response.json(profile);
    }
    if (url.pathname === "/auth/v1/verify") {
      return Response.json({ code: "otp_expired", message: "Expired" }, { status: 400 });
    }
    throw new Error(`Unexpected OAuth request: ${request.method} ${url.pathname}`);
  });
  const start = async () => {
    const response = await google(new NextRequest(`${origin}/api/v1/auth/google`, { method: "POST", headers: { origin } }));
    assert.equal(response.status, 200);
    const url = new URL((await response.json()).data.url);
    assert.equal(url.origin, "https://supabase.example.test");
    assert.equal(url.pathname, "/auth/v1/authorize");
    assert.equal(url.searchParams.get("provider"), "google");
    assert.equal(url.searchParams.get("redirect_to"), `${origin}/api/v1/auth/callback?flow=google`);
    assert.equal(url.searchParams.get("prompt"), "select_account");
    assert.equal(url.searchParams.get("code_challenge_method"), "s256");
    challenge = url.searchParams.get("code_challenge")!;
    assert.ok(challenge);
    assert.ok(response.cookies.getAll().some(c => c.name.includes("code-verifier") && c.value));
    assert.equal(response.cookies.get("toptop-oauth-flow")?.httpOnly, true);
    assert.equal(response.cookies.get("toptop-oauth-flow")?.sameSite, "lax");
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    return cookies(response);
  };
  const finish = (query: string, cookie = "", accept = "text/html") => callback(new NextRequest(`${origin}/api/v1/auth/callback?${query}`, {
    headers: { cookie, accept },
  }));
  try {
    await t.test("start rejects cross-origin and bearer requests", async () => {
      const cases: Record<string, string>[] = [{ origin: "https://evil.example" }, { origin, authorization: "Bearer token" }, {}];
      for (const headers of cases) {
        const response = await google(new NextRequest(`${origin}/api/v1/auth/google`, { method: "POST", headers }));
        assert.ok([400, 403].includes(response.status));
        assert.equal(response.cookies.getAll().length, 0);
      }
    });
    await t.test("start persists verifier before code exchange; callback restores real identity", async () => {
      const cookie = await start();
      const response = await finish("flow=google&code=valid-code&next=https://evil.example", cookie);
      assert.equal(response.status, 303);
      assert.equal(response.headers.get("location"), `${origin}/auth/signed-in`);
      assert.equal(response.headers.get("referrer-policy"), "no-referrer");
      assert.equal(response.cookies.get("toptop-oauth-flow")?.maxAge, 0);
      assert.ok(response.cookies.getAll().some(c => c.name.endsWith("auth-token") && c.value));
      assert.equal(updates, 1);
      const restored = await session(new NextRequest(`${origin}/api/v1/auth/session`, { headers: { cookie: cookies(response) } }));
      const identity = (await restored.json()).data.user;
      assert.equal(identity.username, "google_tester");
      assert.equal(identity.displayName, "Google Tester");
      assert.equal(identity.avatarUrl, user.user_metadata.avatar_url);
      assert.equal(identity.role, "user");
    });
    await t.test("repeat sign-in preserves edited profiles and JSON omits refresh token", async () => {
      profile = { username: "custom_username", display_name: "My edited name", avatar_url: "https://example.com/custom.png", role: "user" };
      const response = await finish("flow=google&code=valid-code", await start(), "application/json");
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.data.user.displayName, "My edited name");
      assert.equal(body.data.user.username, "custom_username");
      assert.equal(body.data.user.avatarUrl, profile.avatar_url);
      assert.equal(updates, 1);
      assert.ok(body.data.session.accessToken);
      assert.equal(body.data.session.refreshToken, undefined);
    });
    await t.test("missing username migration reports profile setup instead of an OAuth failure", async () => {
      usernameMigrationMissing = true;
      try {
        const response = await finish("flow=google&code=valid-code", await start());
        assert.equal(response.headers.get("location"), `${origin}/auth/oauth-error?reason=profile-setup`);
        const json = await finish("flow=google&code=valid-code", await start(), "application/json");
        assert.equal(json.status, 503);
        assert.equal((await json.json()).error.code, "GOOGLE_PROFILE_SETUP_REQUIRED");
      } finally { usernameMigrationMissing = false; }
    });
    await t.test("cancel does not exchange a code and clears the flow cookie", async () => {
      const cookie = await start();
      const before = tokenCalls;
      const response = await finish("flow=google&error=access_denied&error_description=untrusted", cookie);
      assert.equal(response.headers.get("location"), `${origin}/auth/oauth-error?reason=cancelled`);
      assert.equal(response.cookies.get("toptop-oauth-flow")?.maxAge, 0);
      assert.equal(tokenCalls, before);
    });
    await t.test("expired codes, missing verifier, missing code and provider errors reach retry UI", async () => {
      for (const query of ["flow=google&code=expired", "flow=google", "flow=google&error=server_error", "flow=google&error_code=provider_disabled"]) {
        const response = await finish(query, await start());
        assert.equal(response.headers.get("location"), `${origin}/auth/oauth-error?reason=failed`);
      }
      const response = await finish("flow=google&code=valid-code");
      assert.equal(response.headers.get("location"), `${origin}/auth/oauth-error?reason=failed`);
    });
    await t.test("missing database profile does not report OAuth success", async () => {
      profileUnavailable = true;
      const response = await finish("flow=google&code=valid-code", await start());
      assert.equal(response.headers.get("location"), `${origin}/auth/oauth-error?reason=failed`);
      profileUnavailable = false;
    });
    await t.test("abandoned Google flow never hijacks email confirmation or recovery", async () => {
      const cookie = await start();
      const email = await finish("token_hash=expired&type=email", cookie);
      assert.equal(email.headers.get("location"), `${origin}/auth/confirmed?error=1`);
      const recovery = await finish("flow=recovery&code=valid-code", cookie);
      assert.equal(recovery.headers.get("location"), `${origin}/auth/reset-password`);
    });
  } finally {
    fetchMock.mock.restore();
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
  }
});
