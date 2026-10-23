import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET as feed } from "../../src/app/api/v1/videos/route";
import { POST as postComment } from "../../src/app/api/v1/videos/[videoId]/comments/route";
import { PUT as likeVideo } from "../../src/app/api/v1/videos/[videoId]/like/route";
import { POST as signIn } from "../../src/app/api/v1/auth/sign-in/route";
import { DELETE as deleteComment } from "../../src/app/api/v1/comments/[commentId]/route";
import { GET as session } from "../../src/app/api/v1/auth/session/route";
import { POST as signOut } from "../../src/app/api/v1/auth/sign-out/route";
import { POST as resetPassword } from "../../src/app/api/v1/auth/password/route";
import { POST as forgotPassword } from "../../src/app/api/v1/auth/forgot-password/route";
import { POST as resend } from "../../src/app/api/v1/auth/resend/route";
import { GET as callback } from "../../src/app/api/v1/auth/callback/route";
import { GET as getComments } from "../../src/app/api/v1/videos/[videoId]/comments/route";
import { PUT as saveVideo } from "../../src/app/api/v1/videos/[videoId]/save/route";
import { PUT as follow } from "../../src/app/api/v1/users/[userId]/follow/route";

const userId = "00000000-0000-4000-8000-000000000001";
const videoId = "10000000-0000-4000-8000-000000000001";
const commentId = "20000000-0000-4000-8000-000000000001";
const author = { id: userId, username: "alice", displayName: "Alice", avatarUrl: null };
const video = {
  id: videoId, videoUrl: "/demo.mp4", posterUrl: null, description: "demo",
  createdAt: "2026-10-23T00:00:00Z", isPinned: false, viewCount: 0, author,
  likeCount: 1, commentCount: 0, isLiked: true, isSaved: false, isFollowing: false,
};
const authUser = { id: userId, email: "alice@example.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-10-23T00:00:00Z" };

test("Route Handlers with Supabase HTTP transport stub (no cloud requests)", async (t) => {
  const previous = { ...process.env };
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.test";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_only";
  process.env.APP_URL = "http://localhost:3000";
  const requests: { path: string; body: Record<string, unknown> | null; authorization: string | null }[] = [];
  let invalidToken = false;
  let owner = userId;
  let sessionCookie = "";
  const fetchMock = t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    assert.equal(url.origin, "https://supabase.example.test", "Unexpected network destination");
    const body = request.body ? await request.json() : null;
    requests.push({ path: url.pathname, body, authorization: request.headers.get("authorization") });
    if (url.pathname === "/auth/v1/user") {
      return Response.json(invalidToken ? { code: "bad_jwt", message: "Invalid JWT" } : authUser, { status: invalidToken ? 401 : 200 });
    }
    if (["/auth/v1/logout", "/auth/v1/recover", "/auth/v1/resend"].includes(url.pathname)) return Response.json({});
    if (url.pathname === "/auth/v1/token") {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;
      const token = [Buffer.from('{"alg":"HS256"}').toString("base64url"), Buffer.from(JSON.stringify({ sub: userId, exp: expiresAt })).toString("base64url"), "testsignature"].join(".");
      return Response.json({ access_token: token, refresh_token: "test-refresh-token", token_type: "bearer", expires_in: 3600, expires_at: expiresAt, user: authUser });
    }
    if (url.pathname === "/rest/v1/rpc/api_video_page") {
      return Response.json([{ ...video, cursorKey: { pin: 0, value: "123.123456", id: videoId } }]);
    }
    if (url.pathname === "/rest/v1/rpc/api_video") return Response.json(video);
    if (url.pathname === "/rest/v1/rpc/api_comment_page") return Response.json([]);
    if (url.pathname === "/rest/v1/video_likes") return Response.json({ code: "23505", message: "duplicate key" }, { status: 409 });
    if (url.pathname === "/rest/v1/comments") {
      return Response.json(request.method === "GET" ? { author_id: owner } : { id: commentId });
    }
    if (url.pathname === "/rest/v1/rpc/api_comment") {
      return Response.json({ id: commentId, videoId, content: "hello", createdAt: "2026-10-23T00:00:00Z", isOwner: true, author });
    }
    throw new Error(`Unexpected mocked request: ${request.method} ${url.pathname}`);
  });
  const request = (path: string, method = "GET", body?: object, token = "valid-test-token") => new NextRequest(`http://localhost:3000/api/v1/${path}`, {
    method, headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  try {
    await t.test("GET feed passes filters to RPC and returns DTO without cursor internals", async () => {
      const response = await feed(request("videos?feed=following&limit=2"));
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.data[0].id, videoId);
      assert.equal(body.data[0].cursorKey, undefined);
      assert.equal(body.pagination.hasMore, false);
      assert.equal(requests.at(-1)!.body!.p_scope, "following");
      assert.equal(requests.at(-1)!.body!.p_limit, 3);
      assert.equal(requests.at(-1)!.authorization, "Bearer valid-test-token");
    });
    await t.test("invalid bearer fails before a database request", async () => {
      const start = requests.length;
      invalidToken = true;
      const response = await feed(request("videos"));
      invalidToken = false;
      assert.equal(response.status, 401);
      assert.equal(requests.length - start, 1);
    });
    await t.test("POST comment validates identity and returns 201", async () => {
      const response = await postComment(request(`videos/${videoId}/comments`, "POST", { content: "hello" }), { params: Promise.resolve({ videoId }) });
      assert.equal(response.status, 201);
      assert.equal((await response.json()).data.id, commentId);
      const inserted = requests.find(row => row.path === "/rest/v1/comments");
      assert.deepEqual(inserted!.body, { author_id: userId, video_id: videoId, content: "hello" });
      const bad = await postComment(request(`videos/${videoId}/comments`, "POST", { content: "hello", authorId: "spoof" }), { params: Promise.resolve({ videoId }) });
      assert.equal(bad.status, 400);
    });
    await t.test("repeated like handles unique constraint as a successful idempotent PUT", async () => {
      const response = await likeVideo(request(`videos/${videoId}/like`, "PUT"), { params: Promise.resolve({ videoId }) });
      assert.equal(response.status, 200);
      assert.deepEqual((await response.json()).data, { isLiked: true, likeCount: 1 });
    });
    await t.test("DELETE another user's comment returns 403 before delete", async () => {
      owner = "00000000-0000-4000-8000-000000000002";
      const response = await deleteComment(request(`comments/${commentId}`, "DELETE"), { params: Promise.resolve({ commentId }) });
      assert.equal(response.status, 403);
      assert.equal(requests.at(-1)!.body, null);
      owner = userId;
    });
    await t.test("signin propagates session cookies and never returns refresh token in JSON", async () => {
      const response = await signIn(new NextRequest("http://localhost:3000/api/v1/auth/sign-in", {
        method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" },
        body: JSON.stringify({ email: "alice@example.com", password: "TestPassword123" }),
      }));
      assert.equal(response.status, 200);
      assert.ok(response.headers.get("set-cookie")?.includes("auth-token"));
      const body = await response.json();
      assert.ok(body.data.session.accessToken);
      assert.equal(body.data.user.role, "user");
      assert.equal(body.data.session.refreshToken, undefined);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      sessionCookie = response.cookies.getAll().map(({ name, value }) => `${name}=${value}`).join("; ");
    });
    const cookieRequest = (path: string, method = "GET", body?: object) => new NextRequest(`http://localhost:3000/api/v1/${path}`, {
      method, headers: { cookie: sessionCookie, origin: "http://localhost:3000", "content-type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    await t.test("session restores identity from cookies and app role is server controlled", async () => {
      const response = await session(cookieRequest("auth/session"));
      assert.equal(response.status, 200);
      assert.equal((await response.json()).data.user.id, userId);
    });
    await t.test("guests can read comments but cannot like, save, follow, post or browse following", async () => {
      const guest = (path: string, method = "GET", body?: object) => new NextRequest(`http://localhost:3000/api/v1/${path}`, {
        method, headers: { origin: "http://localhost:3000", "content-type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      assert.equal((await getComments(guest(`videos/${videoId}/comments`), { params: Promise.resolve({ videoId }) })).status, 200);
      assert.equal((await feed(guest("videos?feed=following"))).status, 401);
      assert.equal((await likeVideo(guest(`videos/${videoId}/like`, "PUT"), { params: Promise.resolve({ videoId }) })).status, 401);
      assert.equal((await saveVideo(guest(`videos/${videoId}/save`, "PUT"), { params: Promise.resolve({ videoId }) })).status, 401);
      assert.equal((await follow(guest(`users/${userId}/follow`, "PUT"), { params: Promise.resolve({ userId }) })).status, 401);
      assert.equal((await postComment(guest(`videos/${videoId}/comments`, "POST", { content: "hello" }), { params: Promise.resolve({ videoId }) })).status, 401);
      assert.equal((await resetPassword(guest("auth/password", "POST", { password: "NewPassword123" }))).status, 401);
    });
    await t.test("expired cookie still permits public reads but protected mutations fail", async () => {
      invalidToken = true;
      try {
        const response = await getComments(cookieRequest(`videos/${videoId}/comments`), { params: Promise.resolve({ videoId }) });
        assert.equal(response.status, 200);
        assert.equal(requests.at(-1)?.authorization, "Bearer sb_publishable_test_only");
        assert.equal((await likeVideo(cookieRequest(`videos/${videoId}/like`, "PUT"), { params: Promise.resolve({ videoId }) })).status, 401);
      } finally { invalidToken = false; }
    });
    await t.test("email actions and password update call the intended Auth endpoints", async () => {
      assert.equal((await forgotPassword(cookieRequest("auth/forgot-password", "POST", { email: "alice@example.com" }))).status, 200);
      assert.equal(requests.at(-1)?.path, "/auth/v1/recover");
      assert.equal((await resend(cookieRequest("auth/resend", "POST", { email: "alice@example.com" }))).status, 200);
      assert.equal(requests.at(-1)?.path, "/auth/v1/resend");
      assert.equal((await resetPassword(cookieRequest("auth/password", "POST", { password: "NewPassword123" }))).status, 200);
      assert.equal(requests.at(-1)?.body?.password, "NewPassword123");
    });
    await t.test("browser callback failures redirect to a fixed UI page instead of exposing JSON", async () => {
      const response = await callback(new NextRequest("http://localhost:3000/api/v1/auth/callback?next=https://evil.example", { headers: { accept: "text/html" } }));
      assert.equal(response.status, 303);
      assert.equal(response.headers.get("location"), "http://localhost:3000/auth/confirmed?error=1");
    });
    await t.test("signout removes session cookies", async () => {
      const response = await signOut(cookieRequest("auth/sign-out", "POST"));
      assert.equal(response.status, 204);
      assert.ok(response.cookies.getAll().some(cookie => cookie.name.includes("auth-token") && cookie.value === ""));
    });
  } finally {
    fetchMock.mock.restore();
    for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "APP_URL"]) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
