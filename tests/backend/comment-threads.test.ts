import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("comment replies stay one level deep and likes enforce ownership", async () => {
  const db = new PGlite();
  const user = "00000000-0000-4000-8000-000000000001";
  const post = "10000000-0000-4000-8000-000000000001";
  const other = "10000000-0000-4000-8000-000000000002";
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to anon, authenticated;
      create table profiles(id uuid primary key, username text, display_name text, avatar_url text);
      create table media_posts(id uuid primary key, user_id uuid, published_at timestamptz);
      create table follows(follower_id uuid, following_id uuid);
      grant select on media_posts to anon, authenticated;
    `);
    for (const name of ["20261026000500_media_interactions.sql", "20261105000200_comment_threads.sql", "20261110000200_delete_own_comments.sql"]) await db.exec(await readFile(new URL(`../../supabase/migrations/${name}`, import.meta.url), "utf8"));
    await db.query("insert into profiles values ($1,'alice','Alice',null)", [user]);
    await db.query("insert into media_posts values ($1,$3,now()),($2,$3,now())", [post,other,user]);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
    await db.exec("set role authenticated");
    async function insert(reply: string | null = null, postId = post) {
      return (await db.query<{ id: string; parent_id: string | null }>("insert into post_comments(post_id,author_id,content,reply_to_id) values ($1,$2,'hello',$3) returning id,parent_id", [postId,user,reply])).rows[0];
    }
    const root = await insert(); const reply = await insert(root.id); const nested = await insert(reply.id);
    assert.equal(reply.parent_id, root.id); assert.equal(nested.parent_id, root.id);
    await assert.rejects(insert(root.id, other), /Invalid reply target/);
    await db.query("insert into post_comment_likes(comment_id,user_id) values ($1,$2)", [reply.id,user]);
    await assert.rejects(db.query("insert into post_comment_likes(comment_id,user_id) values ($1,$2)", [reply.id,user]), /duplicate key/);
    const page = (await db.query<{ data: { likeCount: number; isLiked: boolean; replyTo: { displayName: string } }[] }>("select post_comment_page($1,$2) data", [post,root.id])).rows[0].data;
    assert.equal(page.length,2); assert.equal(page[0].likeCount,1); assert.equal(page[0].isLiked,true); assert.equal(page[1].replyTo.displayName,"Alice");
    await db.exec("reset role; select set_config('request.jwt.claim.sub','',false); set role anon");
    await assert.rejects(insert(root.id), /permission denied/);
    const guest = (await db.query<{ data: { isLiked: boolean }[] }>("select post_comment_page($1,$2) data", [post,root.id])).rows[0].data;
    assert.equal(guest[0].isLiked,false);
    await assert.rejects(db.query("delete from post_comments where id=$1", [root.id]), /permission denied/);
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [other]);
    await db.exec("set role authenticated");
    assert.equal((await db.query("delete from post_comments where id=$1 returning id", [root.id])).rows.length, 0);
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
    await db.exec("set role authenticated");
    assert.equal((await db.query("delete from post_comments where id=$1 returning id", [root.id])).rows.length, 1);
    assert.equal((await db.query("select * from post_comments")).rows.length, 0);
    assert.equal((await db.query("select * from post_comment_likes")).rows.length, 0);
  } finally { await db.close(); }
});
