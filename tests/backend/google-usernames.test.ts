import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("Google usernames use trusted email, handle collisions and preserve custom names", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      create table auth.users(id uuid primary key, email text, raw_app_meta_data jsonb);
      create table public.profiles(id uuid primary key, username text unique not null check(username ~ '^[a-z0-9_]{3,30}$'));
    `);
    await db.exec(await readFile(new URL("../../supabase/migrations/20261026000300_google_usernames.sql", import.meta.url), "utf8"));
    async function account(n: number, email: string, provider = "google", custom?: string) {
      const id = `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
      const initial = custom ?? `user_${id.replaceAll("-", "").slice(0, 24)}`;
      await db.query("insert into auth.users values ($1,$2,$3)", [id, email, JSON.stringify({ provider })]);
      await db.query("insert into public.profiles values ($1,$2)", [id, initial]);
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
      await db.exec("set role authenticated");
      const result = await db.query<{ username: string }>("select public.sync_google_username() as username");
      const repeated = await db.query<{ username: string }>("select public.sync_google_username() as username");
      assert.equal(repeated.rows[0].username, result.rows[0].username);
      await assert.rejects(db.query("update public.profiles set username='spoofed'"), /permission denied/);
      await db.exec("reset role");
      return { value: result.rows[0].username, initial };
    }
    assert.equal((await account(1, "TuanAnh@gmail.com")).value, "tuananh");
    assert.equal((await account(2, "tuananh@gmail.com")).value, "tuananh_1");
    assert.equal((await account(3, "first.last@gmail.com")).value, "first_last");
    assert.equal((await account(4, "new@gmail.com", "google", "my_username")).value, "my_username");
    const passwordUser = await account(5, "email@gmail.com", "email");
    assert.equal(passwordUser.value, passwordUser.initial);
    assert.equal((await account(6, "a@gmail.com")).value, "a__");
    assert.equal((await account(7, `${"x".repeat(40)}@gmail.com`)).value.length, 30);
    assert.equal((await account(8, `${"x".repeat(40)}@gmail.com`)).value, `${"x".repeat(28)}_1`);
    await db.exec("set role anon");
    await assert.rejects(db.query("select public.sync_google_username()"), /permission denied/);
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
    await db.exec("set role authenticated");
    await assert.rejects(db.query("select public.sync_google_username()"), /Authentication required/);
  } finally { await db.close(); }
});
