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
import { GET as userById } from "../../src/app/api/v1/users/[userId]/route";
import { GET as userByUsername } from "../../src/app/api/v1/users/by-username/[username]/route";
import { GET as myProfile } from "../../src/app/api/v1/me/route";
import { POST as createUpload } from "../../src/app/api/v1/uploads/route";
import { POST as completeUpload } from "../../src/app/api/v1/uploads/[uploadId]/complete/route";
import { GET as myPosts } from "../../src/app/api/v1/me/posts/route";
import { proxy } from "../../src/proxy";
import { GET as getPosts } from "../../src/app/api/v1/posts/route";
import { GET as getPost } from "../../src/app/api/v1/posts/[postId]/route";
import { GET as getUserPosts } from "../../src/app/api/v1/users/[userId]/posts/route";

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
  let missingProfile = false;
  let missingPost = false;
  const fetchMock = t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    assert.equal(url.origin, "https://supabase.example.test", "Unexpected network destination");
    const body = request.body ? await request.json() : null;
    requests.push({ path: url.pathname, body, authorization: request.headers.get("authorization") });
    if (url.pathname === "/auth/v1/user") {
      return Response.json(invalidToken ? { code: "bad_jwt", message: "Invalid JWT" } : authUser, { status: invalidToken ? 401 : 200 });
    }
    const mediaRow = { id: videoId, user_id: userId, storage_path: `${userId}/${videoId}.mp4`, mime_type: "video/mp4", caption: "Upload test", created_at: "2026-10-26T00:00:00Z" };
    if (url.pathname === "/rest/v1/media_posts") {
      if (request.method === "POST") return Response.json(mediaRow);
      assert.equal(url.searchParams.get("published_at"), "not.is.null");
      if (url.searchParams.has("id")) return Response.json(missingPost ? null : mediaRow);
      assert.ok(url.searchParams.get("order")?.includes("id."));
      const filter = url.searchParams.get("user_id");
      if (filter && filter !== `eq.${userId}`) return Response.json([]);
      const mediaFilter = url.searchParams.get("mime_type");
      const rows = [mediaRow, { ...mediaRow, id: commentId, mime_type: "image/png" }].filter(row => !mediaFilter || mediaFilter === `like.${row.mime_type.split("/")[0]}/%`);
      const offset = Number(url.searchParams.get("offset") ?? 0);
      return Response.json(rows.slice(offset, offset + Number(url.searchParams.get("limit") ?? 20)));
    }
    if (url.pathname.startsWith("/storage/v1/object/upload/sign/posts/")) return Response.json({ url: `/object/upload/sign/posts/${mediaRow.storage_path}?token=test-signed-token` });
    if (url.pathname === "/rest/v1/rpc/publish_media_post") return Response.json(mediaRow);
    if (["/auth/v1/logout", "/auth/v1/recover", "/auth/v1/resend"].includes(url.pathname)) return Response.json({});
    if (url.pathname === "/rest/v1/profiles") return Response.json(missingProfile ? null : { id: userId, username: "alice", display_name: "Alice", avatar_url: null });
    if (url.pathname === "/rest/v1/rpc/api_profile") return Response.json(missingProfile ? null : {
      ...author, bio: "Hello", createdAt: "2026-10-23T00:00:00Z",
      followerCount: 12, followingCount: 5, likeCount: 40,
      isFollowing: request.headers.get("authorization") === "Bearer valid-test-token",
      email: "private@example.com", role: "admin",
    });
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
    await t.test("published post reads filter authors, paginate, validate and return details", async () => {
      const response = await getPosts(new NextRequest("http://localhost:3000/api/v1/posts?limit=1"));
      assert.equal(response.status, 200);
      const page = await response.json();
      assert.equal(page.data.length, 1);
      assert.equal(page.data[0].userId, userId);
      assert.deepEqual(page.pagination, { hasMore: true, nextOffset: 1 });
      const next = await getPosts(new NextRequest("http://localhost:3000/api/v1/posts?limit=1&offset=1"));
      assert.equal((await next.json()).data[0].mediaType, "image");
      const own = await getUserPosts(request(`users/${userId}/posts`), { params: Promise.resolve({ userId }) });
      assert.equal((await own.json()).data.length, 2);
      const videosOnly = await getUserPosts(request(`users/${userId}/posts?mediaType=video&limit=1`), { params: Promise.resolve({ userId }) });
      const videoPage = await videosOnly.json();
      assert.equal(videoPage.data.length, 1);
      assert.equal(videoPage.data[0].mediaType, "video");
      assert.equal(videoPage.pagination.hasMore, false);
      const other = await getUserPosts(request(`users/${videoId}/posts`), { params: Promise.resolve({ userId: videoId }) });
      assert.deepEqual((await other.json()).data, []);
      assert.equal((await getPosts(request("posts?limit=51"))).status, 400);
      assert.equal((await getPosts(request("posts?sort=popular"))).status, 400);
      assert.equal((await myPosts(request(`me/posts?userId=${videoId}`))).status, 400);
      const detail = await getPost(request(`posts/${videoId}`), { params: Promise.resolve({ postId: videoId }) });
      assert.equal((await detail.json()).data.id, videoId);
      missingPost = true;
      assert.equal((await getPost(request(`posts/${videoId}`), { params: Promise.resolve({ postId: videoId }) })).status, 404);
      missingPost = false;
    });
    await t.test("upload routes require auth and return signed upload and published DTOs", async () => {
      const guest = new NextRequest("http://localhost:3000/api/v1/uploads", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: JSON.stringify({ mimeType: "video/mp4", size: 100 }) });
      assert.equal((await createUpload(guest)).status, 401);
      assert.equal((await myPosts(new NextRequest("http://localhost:3000/api/v1/me/posts"))).status, 401);
      assert.equal((await createUpload(request("uploads", "POST", { mimeType: "image/svg+xml", size: 100 }))).status, 400);
      const ticket = await createUpload(request("uploads", "POST", { mimeType: "video/mp4", size: 100 }));
      assert.equal(ticket.status, 201);
      assert.match((await ticket.json()).data.signedUrl, /token=test-signed-token/);
      const complete = await completeUpload(request(`uploads/${videoId}/complete`, "POST", { caption: "Upload test" }), { params: Promise.resolve({ uploadId: videoId }) });
      assert.equal(complete.status, 200);
      const post = (await complete.json()).data;
      assert.equal(post.mediaType, "video");
      assert.match(post.mediaUrl, /\/storage\/v1\/object\/public\/posts\//);
      assert.equal(post.storage_path, undefined);
      assert.equal((await myPosts(request("me/posts"))).status, 200);
    });
    await t.test("guest page requests redirect home without blocking public browsing", async () => {
      for (const path of ["/upload", "/following", "/@alice"]) {
        const response = await proxy(new NextRequest(`http://localhost:3000${path}`));
        assert.equal(response.status, 307);
        assert.equal(response.headers.get("location"), "http://localhost:3000/");
      }
      assert.equal((await proxy(new NextRequest("http://localhost:3000/"))).status, 200);
    });
    await t.test("public profile excludes private fields and follows viewer identity", async () => {
      const response = await userById(new NextRequest(`http://localhost:3000/api/v1/users/${userId}`), { params: Promise.resolve({ userId }) });
      assert.equal(response.status, 200);
      const { data } = await response.json();
      assert.equal(data.id, userId);
      assert.equal(data.isFollowing, false);
      assert.equal(data.followerCount, 12);
      assert.equal(data.email, undefined);
      assert.equal(data.role, undefined);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      const authenticated = await userById(request(`users/${userId}`), { params: Promise.resolve({ userId }) });
      assert.equal((await authenticated.json()).data.isFollowing, true);
      const byName = await userByUsername(request("users/by-username/@ALICE"), { params: Promise.resolve({ username: "@ALICE" }) });
      assert.equal(byName.status, 200);
      assert.equal((await byName.json()).data.username, "alice");
      assert.equal((await myProfile(new NextRequest("http://localhost:3000/api/v1/me"))).status, 401);
      assert.equal((await myProfile(request("me"))).status, 200);
    });
    await t.test("profile validates IDs before querying and returns 404 for missing users", async () => {
      const start = requests.length;
      const invalid = await userById(new NextRequest("http://localhost:3000/api/v1/users/invalid"), { params: Promise.resolve({ userId: "invalid" }) });
      assert.equal(invalid.status, 400);
      assert.equal(requests.length, start);
      missingProfile = true;
      try {
        const missing = await userById(request(`users/${userId}`), { params: Promise.resolve({ userId }) });
        assert.equal(missing.status, 404);
        assert.equal((await missing.json()).error.code, "USER_NOT_FOUND");
        const byName = await userByUsername(request("users/by-username/missing"), { params: Promise.resolve({ username: "missing" }) });
        assert.equal(byName.status, 404);
      } finally { missingProfile = false; }
    });
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
