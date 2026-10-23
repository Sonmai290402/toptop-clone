import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const alice = "00000000-0000-4000-8000-000000000001";
const bob = "00000000-0000-4000-8000-000000000002";
const videoIds = [1, 2, 3, 4, 5].map(n => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`);

test("SQL migration, permissions, pagination and interactions", async (t) => {
  const db = new PGlite();
  try {
    // Minimal stand-ins for Supabase-owned schemas. Application SQL runs unchanged.
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as
        $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      grant usage on schema auth to anon, authenticated;
      create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    `);
    await db.exec(await readFile(new URL("../../supabase/migrations/20261023000100_backend.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../../supabase/migrations/20261023000200_user_roles.sql", import.meta.url), "utf8"));
    await db.query("insert into auth.users(id, raw_user_meta_data) values ($1, $2), ($3, $4)", [
      alice, JSON.stringify({ username: "alice", display_name: "Alice" }),
      bob, JSON.stringify({ username: "bob", display_name: "Bob" }),
    ]);
    await t.test("new accounts default to user and clients cannot edit application roles", async () => {
      const row = await db.query<{ raw_app_meta_data: { app_role: string } }>("select raw_app_meta_data from auth.users where id = $1", [alice]);
      assert.equal(row.rows[0].raw_app_meta_data.app_role, "user");
      await db.exec("set role authenticated");
      await assert.rejects(db.query("update auth.users set raw_app_meta_data = '{\"app_role\":\"admin\"}' where id = $1", [alice]), /permission denied/);
      await db.exec("reset role");
    });
    for (let i = 0; i < videoIds.length; i++) {
      await db.query(`insert into public.videos(id, author_id, video_url, is_pinned, is_published, view_count, created_at)
        values ($1, $2, '/demo.mp4', $3, $4, $5, $6)`,
      [videoIds[i], bob, i === 0, i !== 4, i * 10, `2026-10-${20 + Math.min(i, 1)}T08:00:00.123456Z`]);
    }
    async function role(name: "anon" | "authenticated", id = "") {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
      await db.exec(`set role ${name}`);
    }
    async function rpc(name: string, args: unknown[]) {
      const result = await db.query<{ value: unknown }>(`select public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) as value`, args);
      return result.rows[0].value;
    }
    await t.test("public reads hide unpublished videos and private lists require identity", async () => {
      await role("anon");
      assert.equal((await db.query("select * from public.videos")).rows.length, 4);
      assert.equal(await rpc("api_video", [videoIds[4]]), null);
      const page = await rpc("api_video_page", ["all", null, "latest", 11, null]) as { id: string }[];
      assert.equal(page.length, 4);
      await assert.rejects(rpc("api_video_page", ["saved", null, "latest", 11, null]), /Authentication required/);
      await assert.rejects(rpc("api_video_page", ["all", null, "latest", 999, null]), /Invalid page parameters/);
      await assert.rejects(db.query("insert into public.comments(video_id, author_id, content) values ($1, $2, 'spam')", [videoIds[0], alice]), /permission denied/);
    });
    await t.test("keyset pagination covers ties, pins and all sort orders without duplicates", async () => {
      for (const sort of ["latest", "oldest", "popular"]) {
        let cursor = null;
        const ids: string[] = [];
        for (let page = 0; page < 5; page++) {
          const rows = await rpc("api_video_page", ["author", bob, sort, 2, cursor]) as { id: string; cursorKey: object }[];
          ids.push(...rows.map(row => row.id));
          if (!rows.length) break;
          cursor = JSON.stringify(rows.at(-1)!.cursorKey);
        }
        assert.equal(ids[0], videoIds[0], "Pinned video comes first even when older/less popular");
        assert.equal(ids.length, 4);
        assert.equal(new Set(ids).size, 4);
      }
    });
    await t.test("RLS and column grants protect profiles, comments and counters", async () => {
      await role("authenticated", alice);
      assert.equal((await db.query("update public.profiles set bio = 'mine' where id = $1 returning id", [alice])).rows.length, 1);
      assert.equal((await db.query("update public.profiles set bio = 'stolen' where id = $1 returning id", [bob])).rows.length, 0);
      await assert.rejects(db.query("update public.profiles set username = 'other' where id = $1", [alice]), /permission denied/);
      await assert.rejects(db.query("update public.videos set view_count = 999"), /permission denied/);
      await assert.rejects(db.query("insert into public.comments(video_id, author_id, content) values ($1, $2, 'spoof')", [videoIds[0], bob]), /row-level security/);
      await assert.rejects(db.query("insert into public.comments(video_id, author_id, content) values ($1, $2, 'hidden')", [videoIds[4], alice]), /row-level security/);
      await assert.rejects(db.query("insert into public.comments(video_id, author_id, content) values ($1, $2, '  ')", [videoIds[0], alice]), /check constraint/);
      const comment = await db.query<{ id: string }>("insert into public.comments(video_id, author_id, content) values ($1, $2, 'hello') returning id", [videoIds[0], alice]);
      const id = comment.rows[0].id;
      await role("authenticated", bob);
      assert.equal((await db.query("delete from public.comments where id = $1 returning id", [id])).rows.length, 0);
      await role("anon");
      assert.equal((await rpc("api_comment", [id]) as { isOwner: boolean }).isOwner, false);
      await role("authenticated", alice);
      assert.equal((await rpc("api_comment", [id]) as { isOwner: boolean }).isOwner, true);
      assert.equal((await db.query("delete from public.comments where id = $1 returning id", [id])).rows.length, 1);
    });
    await t.test("likes/saves are unique, private and feed state belongs to the caller", async () => {
      await role("authenticated", alice);
      for (const table of ["video_likes", "video_saves"]) {
        await db.query(`insert into public.${table}(user_id, video_id) values ($1, $2)`, [alice, videoIds[0]]);
        await assert.rejects(db.query(`insert into public.${table}(user_id, video_id) values ($1, $2)`, [alice, videoIds[0]]), /duplicate key/);
        await assert.rejects(db.query(`insert into public.${table}(user_id, video_id) values ($1, $2)`, [bob, videoIds[1]]), /row-level security/);
      }
      const mine = await rpc("api_video", [videoIds[0]]) as { isLiked: boolean; isSaved: boolean; likeCount: number };
      assert.deepEqual([mine.isLiked, mine.isSaved, mine.likeCount], [true, true, 1]);
      assert.equal((await rpc("api_video_page", ["saved", null, "latest", 11, null]) as unknown[]).length, 1);
      await role("authenticated", bob);
      assert.equal((await db.query("select * from public.video_saves")).rows.length, 0);
      assert.equal((await db.query("select * from public.video_likes")).rows.length, 0);
      assert.equal((await rpc("api_video_page", ["liked", null, "latest", 11, null]) as unknown[]).length, 0);
      const other = await rpc("api_video", [videoIds[0]]) as { isLiked: boolean; isSaved: boolean; likeCount: number };
      assert.deepEqual([other.isLiked, other.isSaved, other.likeCount], [false, false, 1]);
      await role("authenticated", alice);
      await db.query("delete from public.video_likes where user_id = $1 and video_id = $2", [alice, videoIds[0]]);
      assert.equal((await rpc("api_video", [videoIds[0]]) as { likeCount: number }).likeCount, 0);
    });
    await t.test("following feed, counts and self-follow rule", async () => {
      await role("authenticated", alice);
      assert.equal((await rpc("api_video_page", ["following", null, "latest", 11, null]) as unknown[]).length, 0);
      await assert.rejects(db.query("insert into public.follows(follower_id, following_id) values ($1, $1)", [alice]), /row-level security|check constraint/);
      await db.query("insert into public.follows(follower_id, following_id) values ($1, $2)", [alice, bob]);
      assert.equal((await rpc("api_video_page", ["following", null, "latest", 11, null]) as unknown[]).length, 4);
      const profile = await rpc("api_profile", [bob]) as { followerCount: number; isFollowing: boolean };
      assert.deepEqual([profile.followerCount, profile.isFollowing], [1, true]);
    });
    await t.test("comment cursor preserves timestamp precision and handles equal times", async () => {
      await db.exec("reset role");
      for (let n = 1; n <= 3; n++) {
        await db.query("insert into public.comments(id, video_id, author_id, content, created_at) values ($1,$2,$3,'test','2026-10-23T08:00:00.123456Z')", [
          `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`, videoIds[0], alice,
        ]);
      }
      await role("anon");
      const first = await rpc("api_comment_page", [videoIds[0], 2, null]) as { id: string; cursorKey: object }[];
      const second = await rpc("api_comment_page", [videoIds[0], 2, JSON.stringify(first[1].cursorKey)]) as { id: string }[];
      assert.equal(first.length, 2);
      assert.equal(second.length, 1);
      assert.equal(new Set([...first, ...second].map(row => row.id)).size, 3);
    });
  } finally { await db.close(); }
});
