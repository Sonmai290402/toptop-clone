import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("pins enforce owner and limit; thumbnail attachment validates pending video ownership", async () => {
  const db = new PGlite();
  const owner = "00000000-0000-4000-8000-000000000001";
  const other = "00000000-0000-4000-8000-000000000002";
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create schema storage;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,storage to authenticated;
      create table profiles(id uuid primary key);
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(bucket_id text,name text,metadata jsonb);
      alter table storage.objects enable row level security;
      grant select,insert,update,delete on storage.objects to authenticated;
    `);
    for (const file of ["20261026000100_media_uploads.sql", "20261110000100_edit_delete_posts.sql", "20261117000100_post_pins_thumbnails.sql"]) {
      await db.exec(await readFile(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8"));
    }
    await db.query("insert into profiles values($1),($2)", [owner,other]);
    const posts = (await db.query<{id:string}>("insert into media_posts(user_id,mime_type,size_bytes,published_at) select $1,'video/mp4',100,now() from generate_series(1,4) returning id",[owner])).rows;
    const pending = (await db.query<{id:string}>("insert into media_posts(user_id,mime_type,size_bytes) values($1,'video/mp4',100) returning id",[owner])).rows[0].id;
    const role = async (id: string) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
      await db.exec("set role authenticated");
    };
    await role(other);
    await assert.rejects(db.query("select set_post_pin($1,true)",[posts[0].id]), /Forbidden/);
    await assert.rejects(db.query("select attach_post_thumbnail($1)",[pending]), /Forbidden/);
    await role(owner);
    for (const post of posts.slice(0,3)) await db.query("select set_post_pin($1,true)",[post.id]);
    await db.query("select set_post_pin($1,true)",[posts[0].id]);
    await assert.rejects(db.query("select set_post_pin($1,true)",[posts[3].id]), /Pin limit/);
    await assert.rejects(db.query("select set_post_pin($1,true)",[pending]), /Post not found/);
    await db.query("select set_post_pin($1,false)",[posts[0].id]);
    await db.query("select set_post_pin($1,true)",[posts[3].id]);
    assert.equal((await db.query("select id from media_posts where pinned_at is not null")).rows.length,3);
    await assert.rejects(db.query("update media_posts set pinned_at=now() where id=$1",[posts[0].id]), /permission denied/);
    await assert.rejects(db.query("select attach_post_thumbnail($1)",[pending]), /missing or invalid/);
    const path = `${owner}/${pending}.jpg`;
    await db.query("insert into storage.objects values('thumbnails',$1,'{\"mimetype\":\"image/jpeg\",\"size\":100}')",[path]);
    await db.query("select attach_post_thumbnail($1)",[pending]);
    assert.equal((await db.query<{thumbnail_path:string}>("select thumbnail_path from media_posts where id=$1",[pending])).rows[0].thumbnail_path,path);
    await db.exec("reset role");
    await db.query("update media_posts set published_at=now() where id=$1",[pending]);
    await role(owner);
    await assert.rejects(db.query("select attach_post_thumbnail($1)",[pending]), /Invalid upload/);
    assert.equal((await db.query("update storage.objects set metadata='{}' where name=$1 returning name",[path])).rows.length,0);
    await db.query("select delete_owned_post($1)",[pending]);
    assert.equal((await db.query("delete from storage.objects where name=$1 returning name",[path])).rows.length,1);
  } finally { await db.close(); }
});
