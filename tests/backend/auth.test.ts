import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { UserRole } from "../../src/types/role.types";
import { getUserRole, requireRole, toAuthUser } from "../../src/server/modules/auth/authorization";
import { signUpSchema } from "../../src/server/modules/auth/auth.schema";

const user = {
  id: "00000000-0000-4000-8000-000000000001",
  app_metadata: {}, user_metadata: { app_role: "admin", role: "admin", username: "alice", display_name: "Alice" },
  aud: "authenticated", created_at: "2026-10-23T00:00:00Z",
} as User;

test("roles come from profiles and never from Auth metadata or the JWT role", async () => {
  let role = UserRole.USER;
  const db = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role }, error: null }) }) }) }) } as unknown as SupabaseClient;
  assert.equal(await getUserRole(db, user), UserRole.USER);
  assert.equal(await getUserRole(db, { ...user, role: "admin", app_metadata: { app_role: "admin" } }), UserRole.USER);
  assert.equal(toAuthUser(user).role, UserRole.USER);
  await assert.rejects(requireRole(db, user, UserRole.ADMIN), { status: 403 });
  await assert.rejects(requireRole(db, null, UserRole.ADMIN), { status: 401 });
  role = UserRole.ADMIN;
  await assert.doesNotReject(requireRole(db, user, UserRole.ADMIN));
  role = UserRole.USER;
  await assert.rejects(requireRole(db, user, UserRole.ADMIN), { status: 403 });
});

test("signup rejects client-supplied roles", () => {
  const input = { email: "alice@example.com", password: "TestPassword123", username: "alice", displayName: "Alice" };
  assert.equal(signUpSchema.safeParse(input).success, true);
  assert.equal(signUpSchema.safeParse({ ...input, role: "admin" }).success, false);
  assert.equal(signUpSchema.safeParse({ ...input, app_metadata: { app_role: "admin" } }).success, false);
});
