import assert from "node:assert/strict";
import test from "node:test";
import { getProfileUsername, isProtectedPath } from "../../src/lib/auth/protected-paths";

test("profile routes decode the @ prefix and resolve usernames", () => {
  for (const segment of ["@_tuananh123", "%40_tuananh123"]) {
    assert.equal(getProfileUsername(segment), "_tuananh123");
    assert.equal(isProtectedPath(`/${segment}`), true);
  }
  for (const segment of ["upload", "following", "admin", "explore", "_tuananh123", "@", "%40", "%ZZ"]) {
    assert.equal(getProfileUsername(segment), null);
  }
  assert.equal(isProtectedPath("/unknown-page"), false);
  assert.equal(isProtectedPath("/upload"), true);
});
