import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("user search matches names, orders exact usernames first and treats wildcard input literally", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create table profiles(id uuid default gen_random_uuid(), username text, display_name text, avatar_url text, bio text);
      grant select on profiles to anon, authenticated;
      insert into profiles(username,display_name) values ('alice','Alice'),('alice_two','Another'),('bob','ALICE Nguyen'),('percent','100% real');`);
    await db.exec(await readFile(new URL("../../supabase/migrations/20261105000100_user_search.sql", import.meta.url), "utf8"));
    await db.exec("set role anon");
    const search = (q: string, offset = 0) => db.query<{ username: string }>("select * from search_users($1,2,$2)", [q, offset]);
    assert.deepEqual((await search("ALICE")).rows.map(row => row.username), ["alice", "alice_two"]);
    assert.deepEqual((await search("alice", 2)).rows.map(row => row.username), ["bob"]);
    assert.equal((await search("missing")).rows.length, 0);
    assert.deepEqual((await search("%")).rows.map(row => row.username), ["percent"]);
    await assert.rejects(search(""), /Invalid search parameters/);
    await assert.rejects(search("alice", -1), /Invalid search parameters/);
  } finally { await db.close(); }
});
