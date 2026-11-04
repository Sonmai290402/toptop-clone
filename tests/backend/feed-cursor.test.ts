import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("media feed cursor preserves ties and survives inserts and deletes", async () => {
  const db = new PGlite();
  const author = "00000000-0000-4000-8000-000000000001";
  const ids = [1, 2, 3, 4, 5].map(n => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`);
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as
        $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      create table public.profiles(id uuid primary key, username text, display_name text, avatar_url text);
      create table public.follows(follower_id uuid, following_id uuid);
      create table public.media_posts(id uuid primary key, user_id uuid, created_at timestamptz, published_at timestamptz, mime_type text);
    `);
    await db.exec(await readFile(new URL("../../supabase/migrations/20261104000100_feed_cursor.sql", import.meta.url), "utf8"));
    await db.query("insert into profiles values ($1, 'alice', 'Alice', null)", [author]);
    for (const id of ids.slice(0, 4)) {
      await db.query("insert into media_posts values ($1,$2,'2026-11-01T00:00:00.123456Z',now(),'video/mp4')", [id, author]);
    }
    type Row = { id: string; created_at: string };
    const page = async (feed = "for-you", cursor?: Row) => (await db.query<{ value: Row[] }>(
      "select public.media_post_feed($1,2,$2::timestamptz,$3::uuid) as value",
      [feed, cursor?.created_at ?? null, cursor?.id ?? null],
    )).rows[0].value;
    await db.exec("set role anon");
    const first = await page();
    assert.deepEqual(first.map(row => row.id), [ids[3], ids[2]]);
    assert.match(first[1].created_at, /123456/);
    await assert.rejects(page("following"), /Authentication required/);
    await db.exec("reset role");
    await db.query("delete from media_posts where id=$1", [ids[2]]);
    await db.query("insert into media_posts values ($1,$2,now(),now(),'image/png')", [ids[4], author]);
    await db.exec("set role anon");
    const second = await page("for-you", first[1]);
    assert.deepEqual(second.map(row => row.id), [ids[1], ids[0]]);
    assert.deepEqual(await page("for-you", second[1]), []);
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [author]);
    assert.deepEqual(await page("following"), []);
    await db.query("insert into follows values ($1,$1)", [author]);
    assert.equal((await page("following"))[0].id, ids[4]);
    await db.query("update media_posts set published_at=null where id=$1", [ids[4]]);
    assert.equal((await page())[0].id, ids[3]);
  } finally {
    await db.close();
  }
});
