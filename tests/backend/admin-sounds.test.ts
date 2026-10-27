import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("admin sound uploads enforce role, ownership, actual file metadata and atomic publication", async () => {
  const db = new PGlite();
  const admin = "00000000-0000-4000-8000-000000000001";
  const secondAdmin = "00000000-0000-4000-8000-000000000002";
  const regular = "00000000-0000-4000-8000-000000000003";
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema storage;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      create table auth.users(id uuid primary key,raw_app_meta_data jsonb,raw_user_meta_data jsonb);
      grant usage on schema auth,storage to authenticated,anon;
      create table public.profiles(id uuid primary key,username text,display_name text,avatar_url text);
      create table public.follows(follower_id uuid,following_id uuid);
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(bucket_id text,name text,metadata jsonb);
      alter table storage.objects enable row level security;
      grant insert on storage.objects to authenticated;
    `);
    for (const migration of ["20261026000100_media_uploads.sql", "20261027000300_post_sounds.sql", "20261027000400_admin_sound_uploads.sql"]) {
      await db.exec(await readFile(new URL(`../../supabase/migrations/${migration}`, import.meta.url), "utf8"));
    }
    await db.query("insert into auth.users values ($1,'{\"app_role\":\"admin\"}','{}'),($2,'{\"app_role\":\"admin\"}','{}'),($3,'{\"app_role\":\"user\"}','{\"app_role\":\"admin\"}')", [admin, secondAdmin, regular]);
    await db.query("insert into public.profiles(id) values ($1),($2),($3)", [admin, secondAdmin, regular]);
    async function role(id: string | null) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? ""]);
      await db.exec(id ? "set role authenticated" : "set role anon");
    }
    const create = (id: string) => db.query<{ id: string; storage_path: string }>("insert into public.sound_uploads(user_id,mime_type,size_bytes) values ($1,'audio/mpeg',100) returning *", [id]);
    await role(null);
    await assert.rejects(create(admin), /permission denied/);
    await role(regular);
    assert.equal((await db.query<{ allowed: boolean }>("select public.is_app_admin() as allowed")).rows[0].allowed, false);
    await assert.rejects(create(regular), /row-level security/);
    await assert.rejects(db.query("insert into storage.objects values ('sounds','bad.mp3','{}')"), /row-level security/);
    await assert.rejects(db.query("select public.publish_admin_sound($1,'Sound','Artist',1000)", [admin]), /Admin access required/);
    await role(admin);
    await assert.rejects(create(secondAdmin), /row-level security/);
    const upload = (await create(admin)).rows[0];
    await assert.rejects(db.query("update public.sound_uploads set completed_at=now() where id=$1", [upload.id]), /permission denied/);
    await assert.rejects(db.query("insert into public.sounds(title,storage_path,duration_ms) values ('Bypass','bypass.mp3',1000)"), /permission denied/);
    const publish = (duration = 2000) => db.query<{ data: { id: string; title: string; duration_ms: number } }>("select to_jsonb(public.publish_admin_sound($1,' Track ','Artist',$2)) as data", [upload.id, duration]);
    await assert.rejects(publish(), /missing or does not match/);
    await db.query("insert into storage.objects values ('sounds',$1,'{\"size\":99,\"mimetype\":\"audio/mpeg\"}')", [upload.storage_path]);
    await assert.rejects(publish(), /does not match/);
    assert.equal((await db.query("select * from public.sounds")).rows.length, 0);
    await db.exec("reset role");
    await db.query("update storage.objects set metadata='{\"size\":100,\"mimetype\":\"audio/mpeg\"}' where name=$1", [upload.storage_path]);
    await role(secondAdmin);
    assert.equal((await db.query("select * from public.sound_uploads")).rows.length, 0);
    await assert.rejects(publish(), /Upload not found/);
    await role(admin);
    await assert.rejects(publish(0), /Invalid sound details/);
    const track = (await publish()).rows[0].data;
    assert.equal(track.id, upload.id);
    assert.equal(track.title, "Track");
    assert.equal((await publish(9999)).rows[0].data.duration_ms, 2000, "Retry returns the original track");
    assert.equal((await db.query("select * from public.sounds")).rows.length, 1);
    await assert.rejects(db.query("insert into storage.objects values ('sounds',$1,'{}')", [upload.storage_path]), /row-level security/);
    const pending = (await create(admin)).rows[0];
    await db.query("insert into storage.objects values ('sounds',$1,'{\"size\":100,\"mimetype\":\"audio/mpeg\"}')", [pending.storage_path]);
    await db.exec("reset role");
    await db.query("update public.sounds set is_active=false where id=$1", [upload.id]);
    await role(admin);
    assert.equal((await db.query("select * from public.sounds")).rows.length, 1, "Admins see inactive sounds");
    await db.exec("reset role");
    await db.query("update auth.users set raw_app_meta_data='{\"app_role\":\"user\"}' where id=$1", [admin]);
    await role(admin);
    assert.equal((await db.query("select * from public.sounds")).rows.length, 0);
    await assert.rejects(create(admin), /row-level security/);
    await assert.rejects(db.query("select public.publish_admin_sound($1,'Track','Artist',2000)", [pending.id]), /Admin access required/);
    await role(null);
    assert.equal((await db.query("select * from public.sounds")).rows.length, 0, "Inactive sounds stay hidden from guests");
  } finally { await db.close(); }
});
