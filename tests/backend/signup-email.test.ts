import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { SupabaseClient } from "@supabase/supabase-js";
import { signUp } from "../../src/server/modules/auth/auth.service";

test("signup stops before creating a user when the email is registered", async () => {
  const db = { rpc: async (name: string, args: { p_email: string }) => {
    assert.equal(name, "is_email_registered");
    assert.equal(args.p_email, "alice@example.com");
    return { data: true, error: null };
  } } as unknown as SupabaseClient;
  await assert.rejects(signUp(db, { email: "Alice@Example.com", password: "Password123", username: "alice", displayName: "Alice" }), { status: 409, code: "EMAIL_ALREADY_REGISTERED" });
});

test("email lookup covers email and Google users without exposing auth records", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(email text, deleted_at timestamptz, raw_app_meta_data jsonb, id uuid default gen_random_uuid());
      create table auth.identities(user_id uuid, identity_data jsonb);
      insert into auth.users(email,deleted_at,raw_app_meta_data) values ('email@example.com',null,'{"provider":"email"}'),('google@example.com',null,'{"provider":"google"}'),('deleted@example.com',now(),'{}');`);
    await db.exec(await readFile(new URL("../../supabase/migrations/20261109000100_signup_email_check.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../../supabase/migrations/20261109000200_signup_identity_email_check.sql", import.meta.url), "utf8"));
    await db.exec("insert into auth.identities select id, '{\"email\":\"linked@example.com\"}'::jsonb from auth.users where email='google@example.com'");
    await db.exec("set role anon");
    for (const [email, expected] of [["email@example.com",true],[" GOOGLE@example.com ",true],["linked@example.com",true],["new@example.com",false],["deleted@example.com",false]] as const) {
      const result = await db.query<{ registered: boolean }>("select public.is_email_registered($1) registered", [email]);
      assert.equal(result.rows[0].registered,expected);
    }
    await assert.rejects(db.query("select * from auth.users"), /permission denied/);
  } finally { await db.close(); }
});
