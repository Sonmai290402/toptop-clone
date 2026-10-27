import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { publishSchema } from "../../src/lib/uploads";

test("sound selection rejects spoofed URLs and invalid segment or volume", () => {
  const sound = { soundId: "00000000-0000-4000-8000-000000000010", startMs: 1000, durationMs: 5000, musicVolume: 0.7, originalVolume: 0.2 };
  assert.equal(publishSchema.safeParse({ caption: "Music", sound }).success, true);
  assert.equal(publishSchema.safeParse({ caption: "No music" }).success, true);
  for (const invalid of [{ ...sound, audioUrl: "https://untrusted.test/a.mp3" }, { ...sound, startMs: -1 }, { ...sound, durationMs: 0 }, { ...sound, durationMs: 61000 }, { ...sound, musicVolume: 1.1 }, { ...sound, originalVolume: -1 }]) {
    assert.equal(publishSchema.safeParse({ caption: "", sound: invalid }).success, false);
  }
});

test("sounds restrict writes and publish atomically with validated, immutable selections", async () => {
  const db = new PGlite();
  const owner = "00000000-0000-4000-8000-000000000001";
  const other = "00000000-0000-4000-8000-000000000002";
  const track = "00000000-0000-4000-8000-000000000010";
  const inactive = "00000000-0000-4000-8000-000000000011";
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema storage;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      grant usage on schema auth, storage to anon, authenticated;
      create table public.profiles(id uuid primary key, username text default 'tester', display_name text default 'Tester', avatar_url text);
      create table public.follows(follower_id uuid, following_id uuid);
      create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects(bucket_id text, name text, metadata jsonb);
      alter table storage.objects enable row level security;
      grant insert on storage.objects to authenticated;
    `);
    for (const migration of ["20261026000100_media_uploads.sql", "20261026000200_public_posts.sql", "20261027000300_post_sounds.sql"]) {
      await db.exec(await readFile(new URL(`../../supabase/migrations/${migration}`, import.meta.url), "utf8"));
    }
    await db.query("insert into public.profiles(id) values ($1),($2)", [owner, other]);
    await db.query("insert into public.sounds(id,title,artist,storage_path,duration_ms,is_active) values ($1,'Demo','Artist','demo.mp3',10000,true),($2,'Hidden','Artist','hidden.mp3',10000,false)", [track, inactive]);
    async function role(name: string, id = "") {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
      await db.exec(`set role ${name}`);
    }
    await role("anon");
    assert.equal((await db.query("select * from public.sounds")).rows.length, 1);
    await assert.rejects(db.query("insert into public.sounds(title,storage_path,duration_ms) values ('Bad','bad.mp3',1000)"), /permission denied/);
    await assert.rejects(db.query("select public.publish_media_post_with_sound($1,'')", [track]), /permission denied/);
    await role("authenticated", owner);
    await assert.rejects(db.query("update public.sounds set title='Changed' where id=$1", [track]), /permission denied/);
    await assert.rejects(db.query("insert into storage.objects values ('sounds','bad.mp3','{}')"), /row-level security/);
    const upload = (await db.query<{ id: string; storage_path: string }>("insert into public.media_posts(user_id,mime_type,size_bytes) values ($1,'image/png',100) returning *", [owner])).rows[0];
    await assert.rejects(db.query("update public.media_posts set sound_id=$1 where id=$2", [track, upload.id]), /permission denied/);
    const publish = (soundId: string = track, start = 1000, duration = 5000, musicVolume = 0.7) => db.query<{ result: { sound_id: string; sound_start_ms: number; caption: string; published_at: string } }>("select to_jsonb(public.publish_media_post_with_sound($1,'Photo with sound',$2,$3,$4,$5,0.2)) as result", [upload.id, soundId, start, duration, musicVolume]);
    await assert.rejects(publish(), /Sound file not found/);
    await db.exec("reset role");
    await db.query("insert into storage.objects values ('sounds','demo.mp3','{}')");
    await role("authenticated", owner);
    await assert.rejects(publish(), /Upload is missing/);
    assert.equal((await db.query<{ published_at: null }>("select published_at from public.media_posts where id=$1", [upload.id])).rows[0].published_at, null);
    await db.query("insert into storage.objects values ('posts',$1,'{\"size\":100,\"mimetype\":\"image/png\"}')", [upload.storage_path]);
    await assert.rejects(publish(inactive), /Sound unavailable/);
    await assert.rejects(publish(track, 9000, 5000), /invalid segment/);
    await assert.rejects(publish(track, 0, 0), /invalid segment/);
    await assert.rejects(publish(track, 0, 1000, 2), /Invalid sound/);
    await role("authenticated", other);
    await assert.rejects(publish(), /Upload not found/);
    await role("authenticated", owner);
    const post = (await publish()).rows[0].result;
    assert.equal(post.sound_id, track);
    assert.equal(post.sound_start_ms, 1000);
    assert.ok(post.published_at);
    const retry = (await publish(inactive, 0, 1000)).rows[0].result;
    assert.equal(retry.sound_id, track);
    assert.equal(retry.sound_start_ms, 1000);
    await role("anon");
    const feed = (await db.query<{ data: { sound_id: string; sound_start_ms: number }[] }>("select public.media_post_feed('for-you',10,0) as data")).rows[0].data;
    assert.equal(feed[0].sound_id, track);
    assert.equal(feed[0].sound_start_ms, 1000);
  } finally { await db.close(); }
});
