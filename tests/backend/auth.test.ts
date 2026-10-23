import assert from "node:assert/strict";
import test from "node:test";
import type { User } from "@supabase/supabase-js";
import { getUserRole, requireRole, toAuthUser } from "../../src/server/modules/auth/authorization";
import { signUpSchema } from "../../src/server/modules/auth/auth.schema";

const user = {
  id: "00000000-0000-4000-8000-000000000001",
  app_metadata: {}, user_metadata: { app_role: "admin", role: "admin", username: "alice", display_name: "Alice" },
  aud: "authenticated", created_at: "2026-10-23T00:00:00Z",
} as User;

test("application roles never trust editable metadata or Supabase database role", () => {
  assert.equal(getUserRole(user), "user");
  assert.equal(getUserRole({ ...user, role: "admin" }), "user");
  assert.equal(toAuthUser(user).role, "user");
  assert.throws(() => requireRole(user, "admin"), { status: 403 });
  assert.throws(() => requireRole(null, "admin"), { status: 401 });
  assert.doesNotThrow(() => requireRole({ ...user, app_metadata: { app_role: "admin" } }, "admin"));
  assert.equal(getUserRole({ ...user, app_metadata: { app_role: "unknown" } }), "user");
});

test("signup rejects client-supplied roles", () => {
  const input = { email: "alice@example.com", password: "TestPassword123", username: "alice", displayName: "Alice" };
  assert.equal(signUpSchema.safeParse(input).success, true);
  assert.equal(signUpSchema.safeParse({ ...input, role: "admin" }).success, false);
  assert.equal(signUpSchema.safeParse({ ...input, app_metadata: { app_role: "admin" } }).success, false);
});
