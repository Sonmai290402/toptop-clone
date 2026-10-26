import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { uploadSchema } from "../../src/lib/uploads";
import { isProtectedPath } from "../../src/lib/auth/protected-paths";

test("upload limits and protected routes", () => {
  assert.equal(uploadSchema.safeParse({ mimeType: "video/mp4", size: 52428800 }).success, true);
  for (const input of [{ mimeType: "image/svg+xml", size: 100 }, { mimeType: "image/png", size: 10485761 }, { mimeType: "video/mp4", size: 0 }]) {
    assert.equal(uploadSchema.safeParse(input).success, false);
  }
  for (const path of ["/@alice", "/%40alice", "/alice", "/upload", "/following", "/auth/reset-password"]) assert.equal(isProtectedPath(path), true, path);
  for (const path of ["/", "/explore", "/auth/signed-in", "/images/logo.png"]) assert.equal(isProtectedPath(path), false, path);
});

test("uploads enforce ownership, file metadata and idempotent publishing", async () => {
  const db = new PGlite();
  const alice = "00000000-0000-4000-8000-000000000001";
  const bob = "00000000-0000-4000-8000-000000000002";
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema storage;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      grant usage on schema auth, storage to authenticated, anon;
      create table public.profiles(id uuid primary key, username text default 'tester', display_name text default 'Tester', avatar_url text);
      create table public.follows(follower_id uuid, following_id uuid);
      create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects(bucket_id text, name text, metadata jsonb);
      alter table storage.objects enable row level security;
      grant insert on storage.objects to authenticated;
    `);
    await db.exec(await readFile(new URL("../../supabase/migrations/20261026000100_media_uploads.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../../supabase/migrations/20261026000200_public_posts.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../../supabase/migrations/20261026000400_media_video_feed.sql", import.meta.url), "utf8"));
    await db.query("insert into public.profiles(id) values ($1), ($2)", [alice, bob]);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [alice]);
    await db.exec("set role authenticated");
    await assert.rejects(db.query("insert into public.media_posts(user_id,mime_type,size_bytes) values ($1,'image/png',100)", [bob]), /row-level security/);
    const post = (await db.query<{ id: string; storage_path: string }>("insert into public.media_posts(user_id,mime_type,size_bytes) values ($1,'image/png',100) returning *", [alice])).rows[0];
    await assert.rejects(db.query("update public.media_posts set published_at=now() where id=$1", [post.id]), /permission denied/);
    await assert.rejects(db.query("select public.publish_media_post($1,'Hello')", [post.id]), /missing/);
    await assert.rejects(db.query("insert into storage.objects values ('posts','wrong/path','{}')"), /row-level security/);
    await db.query("insert into storage.objects values ('posts',$1,$2)", [post.storage_path, JSON.stringify({ size: 99, mimetype: "image/png" })]);
    await assert.rejects(db.query("select public.publish_media_post($1,'Hello')", [post.id]), /does not match/);
    await db.exec("reset role");
    await db.query("update storage.objects set metadata=$1", [JSON.stringify({ size: 100, mimetype: "image/png" })]);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [bob]);
    await db.exec("set role authenticated");
    assert.equal((await db.query("select * from public.media_posts")).rows.length, 0);
    await assert.rejects(db.query("select public.publish_media_post($1,'Stolen')", [post.id]), /not found/);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [alice]);
    await db.query("select public.publish_media_post($1,'Hello')", [post.id]);
    await db.query("select public.publish_media_post($1,'Changed')", [post.id]);
    const published = (await db.query<{ caption: string; published_at: string }>("select * from public.media_posts")).rows[0];
    assert.equal(published.caption, "Hello"); assert.ok(published.published_at);
    await assert.rejects(db.query("insert into storage.objects values ('posts',$1,'{}')", [post.storage_path]), /row-level security/);
    await db.query("insert into public.media_posts(user_id,mime_type,size_bytes) values ($1,'video/mp4',100)", [alice]);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [bob]);
    assert.equal((await db.query("select * from public.media_posts")).rows.length, 1, "Other users see only published posts");
    await assert.rejects(db.query("select public.publish_media_post($1,'Stolen')", [post.id]), /not found/);
    await db.exec("reset role; set role anon");
    assert.equal((await db.query("select * from public.media_posts")).rows.length, 1, "Anonymous readers cannot see pending uploads");
    await assert.rejects(db.query("insert into public.media_posts(user_id,mime_type,size_bytes) values ($1,'image/png',100)", [alice]), /permission denied/);
    await db.exec("reset role");
    await db.query("insert into public.media_posts(user_id,mime_type,size_bytes,published_at) values ($1,'video/mp4',100,now()), ($2,'video/webm',100,now()), ($2,'video/mp4',100,null)", [alice, bob]);
    await db.query("insert into public.follows values ($1,$2)", [alice, bob]);
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
    await db.exec("set role anon");
    const publicFeed = await db.query<{ data: { id: string; user_id: string; author: { id: string } }[] }>("select public.media_video_feed('for-you', 10, 0) as data");
    assert.equal(publicFeed.rows[0].data.length, 2, "Feed excludes images and unpublished videos");
    assert.equal(publicFeed.rows[0].data[0].author.id, publicFeed.rows[0].data[0].user_id);
    await assert.rejects(db.query("select public.media_video_feed('following', 10, 0)"), /Authentication required/);
    await db.exec("reset role; set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [alice]);
    const following = await db.query<{ data: { user_id: string }[] }>("select public.media_video_feed('following', 10, 0) as data");
    assert.deepEqual(following.rows[0].data.map(row => row.user_id), [bob]);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [bob]);
    assert.deepEqual((await db.query<{ data: unknown[] }>("select public.media_video_feed('following', 10, 0) as data")).rows[0].data, []);
    const second = await db.query<{ data: { id: string }[] }>("select public.media_video_feed('for-you', 1, 1) as data");
    assert.equal(second.rows[0].data[0].id, publicFeed.rows[0].data[1].id);
    await assert.rejects(db.query("select public.media_video_feed('invalid', 10, 0)"), /Invalid feed/);
  } finally { await db.close(); }
});
