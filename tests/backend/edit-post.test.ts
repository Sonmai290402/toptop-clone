import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { editPostSchema } from "../../src/lib/post-edit";

test("caption edits and post deletion enforce ownership and retain cleanup jobs", async () => {
  const db = new PGlite();
  const owner = "00000000-0000-4000-8000-000000000001";
  const other = "00000000-0000-4000-8000-000000000002";
  const id = "00000000-0000-4000-8000-000000000003";
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create schema storage;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,storage to authenticated;
      create table public.profiles(id uuid primary key);
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(bucket_id text,name text,metadata jsonb);
      alter table storage.objects enable row level security;
      grant select,delete on storage.objects to authenticated;
    `);
    for (const name of ["20261026000100_media_uploads.sql", "20261110000100_edit_delete_posts.sql"]) {
      await db.exec(await readFile(new URL(`../../supabase/migrations/${name}`, import.meta.url), "utf8"));
    }
    await db.query("insert into profiles values ($1),($2)", [owner,other]);
    await db.query("insert into media_posts(id,user_id,mime_type,size_bytes,caption,published_at) values($1,$2,'image/png',100,'Original',now())",[id,owner]);
    await db.exec("create table child_comments(post_id uuid references media_posts(id) on delete cascade)");
    await db.query("insert into child_comments values($1)",[id]);
    const role = async (user: string) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);
      await db.exec("set role authenticated");
    };
    await role(other);
    await assert.rejects(db.query("select edit_post_caption($1,'Changed','Original')",[id]), /Forbidden/);
    await assert.rejects(db.query("select delete_owned_post($1)",[id]), /Forbidden/);
    await role(owner);
    await db.query("select edit_post_caption($1,'Changed','Original')",[id]);
    await assert.rejects(db.query("select edit_post_caption($1,'Stale','Original')",[id]), /Post changed/);
    await assert.rejects(db.query("update media_posts set user_id=$1 where id=$2",[other,id]), /permission denied/);
    const deleted = await db.query<{path:string}>("select delete_owned_post($1) as path",[id]);
    assert.ok(deleted.rows[0].path.endsWith(".png"));
    assert.equal((await db.query("select * from post_file_cleanup")).rows.length,1);
    assert.equal((await db.query<{path:string}>("select delete_owned_post($1) as path",[id])).rows[0].path,deleted.rows[0].path);
    await role(other);
    assert.equal((await db.query("select * from post_file_cleanup")).rows.length,0);
    await db.exec("reset role");
    assert.equal((await db.query("select * from child_comments")).rows.length,0);
    assert.equal((await db.query("select * from media_posts")).rows.length,0);
  } finally { await db.close(); }
});

test("caption input rejects protected fields and allows empty captions", () => {
  assert.equal(editPostSchema.safeParse({ caption: "", expectedCaption: "Old" }).success,true);
  assert.equal(editPostSchema.safeParse({ caption: "x".repeat(2201), expectedCaption: "" }).success,false);
  assert.equal(editPostSchema.safeParse({ caption: "x", expectedCaption: "", userId: "spoof" }).success,false);
});
