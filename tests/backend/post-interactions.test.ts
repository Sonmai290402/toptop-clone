import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("media interactions isolate users and posts, enforce RLS and return real counts", async () => {
  const db = new PGlite();
  const alice = "00000000-0000-4000-8000-000000000001";
  const bob = "00000000-0000-4000-8000-000000000002";
  const post = "10000000-0000-4000-8000-000000000001";
  const other = "10000000-0000-4000-8000-000000000002";
  const pending = "10000000-0000-4000-8000-000000000003";
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      grant usage on schema auth to anon, authenticated;
      create table public.profiles(id uuid primary key);
      create table public.media_posts(id uuid primary key, user_id uuid references public.profiles, mime_type text, published_at timestamptz, created_at timestamptz default now());
      create table public.follows(follower_id uuid, following_id uuid);
      grant select on public.media_posts to anon, authenticated;
    `);
    await db.exec(await readFile(new URL("../../supabase/migrations/20261026000500_media_interactions.sql", import.meta.url), "utf8"));
    await db.query("insert into public.profiles values ($1),($2)", [alice, bob]);
    await db.query("insert into public.media_posts(id,user_id,mime_type,published_at) values ($1,$4,'video/mp4',now()),($2,$4,'video/mp4',now()),($3,$4,'video/mp4',null)", [post, other, pending, bob]);
    async function role(name: "anon" | "authenticated", id = "") {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
      await db.exec(`set role ${name}`);
    }
    async function state(id = post) {
      return (await db.query<{ data: { likeCount: number; commentCount: number; isLiked: boolean; isSaved: boolean; isFollowing: boolean } | null }>("select public.post_interaction_state($1) as data", [id])).rows[0].data;
    }
    await role("anon");
    assert.equal((await state())?.likeCount, 0);
    assert.equal(await state(pending), null);
    await assert.rejects(db.query("insert into public.post_comments(post_id,author_id,content) values ($1,$2,'Guest')", [post, alice]), /permission denied/);
    await assert.rejects(db.query("select public.my_interacted_posts('saved')"), /permission denied/);
    await role("authenticated", alice);
    await assert.rejects(db.query("insert into public.post_comments(post_id,author_id,content) values ($1,$2,'Spoof')", [post, bob]), /row-level security/);
    await assert.rejects(db.query("insert into public.post_comments(post_id,author_id,content) values ($1,$2,'Hidden')", [pending, alice]), /row-level security/);
    await assert.rejects(db.query("insert into public.post_comments(post_id,author_id,content) values ($1,$2,'   ')", [post, alice]), /check constraint/);
    await db.query("insert into public.post_comments(post_id,author_id,content) values ($1,$2,'First')", [post, alice]);
    for (const table of ["post_likes", "post_saves"]) {
      await assert.rejects(db.query(`insert into public.${table}(post_id,user_id) values ($1,$2)`, [post, bob]), /row-level security/);
      await assert.rejects(db.query(`insert into public.${table}(post_id,user_id) values ($1,$2)`, [pending, alice]), /row-level security/);
      await db.query(`insert into public.${table}(post_id,user_id) values ($1,$2)`, [post, alice]);
      await assert.rejects(db.query(`insert into public.${table}(post_id,user_id) values ($1,$2)`, [post, alice]), /duplicate key/);
    }
    assert.deepEqual(await state(), { likeCount: 1, commentCount: 1, isLiked: true, isSaved: true, isFollowing: false });
    assert.equal((await state(other))?.commentCount, 0);
    assert.equal((await db.query<{ data: unknown[] }>("select public.my_interacted_posts('saved') as data")).rows[0].data.length, 1);
    await role("authenticated", bob);
    assert.equal((await db.query("select * from public.post_saves")).rows.length, 0);
    await db.query("delete from public.post_likes where post_id=$1", [post]);
    assert.equal((await state())?.likeCount, 1, "Users cannot remove another user's like");
    assert.equal((await state())?.isLiked, false);
    assert.equal((await db.query<{ data: unknown[] }>("select public.my_interacted_posts('saved') as data")).rows[0].data.length, 0);
    await role("anon");
    assert.equal((await db.query("select * from public.post_comments where post_id=$1", [post])).rows.length, 1);
    assert.equal((await db.query("select * from public.post_comments where post_id=$1", [other])).rows.length, 0);
    assert.equal((await state())?.isSaved, false);
    await role("authenticated", alice);
    await db.query("delete from public.post_likes where post_id=$1", [post]);
    await db.query("delete from public.post_saves where post_id=$1", [post]);
    assert.equal((await state())?.likeCount, 0);
    assert.equal((await state())?.isSaved, false);
    await db.exec("reset role");
    await db.query("insert into public.follows values ($1,$2)", [alice, bob]);
    await role("authenticated", alice);
    assert.equal((await state())?.isFollowing, true);
    await db.exec("reset role");
    await db.query("update public.media_posts set published_at=null where id=$1", [post]);
    await role("anon");
    assert.equal((await db.query("select * from public.post_comments")).rows.length, 0);
    assert.equal(await state(), null);
  } finally { await db.close(); }
});
