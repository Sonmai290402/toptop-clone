import assert from "node:assert/strict";
import test from "node:test";
import { relativeDate, formatDateTime, parseDate } from "../../src/lib/utils/date-time";

test("relative time boundaries, invalid input and future timestamps", () => {
  const now = Date.parse("2026-11-05T00:00:00Z");
  for (const [seconds, unit, count] of [[0,"now",0],[59,"now",0],[60,"minute",1],[3599,"minute",59],[3600,"hour",1],[86399,"hour",23],[86400,"day",1],[604799,"day",6]] as const) {
    assert.deepEqual(relativeDate(now - seconds * 1000, now), { unit, count });
  }
  assert.deepEqual(relativeDate(now - 604800000, now), { unit: "absolute" });
  assert.deepEqual(relativeDate(now + 59000, now), { unit: "now", count: 0 });
  assert.deepEqual(relativeDate(now + 60000, now), { unit: "absolute" });
  for (const value of [null, undefined, "", "bad", "2026-11-01T12:00:00"]) assert.equal(parseDate(value), null);
});

test("absolute dates use requested timezone and relative dates preserve the same instant", () => {
  const value = "2026-11-01T16:37:00Z";
  assert.equal(formatDateTime(value, "Asia/Ho_Chi_Minh"), "23:37, 01/11/2026");
  assert.equal(formatDateTime(value, "Asia/Tokyo"), "01:37, 02/11/2026");
  assert.equal(formatDateTime("2026-11-01T00:00:00Z", "UTC"), "00:00, 01/11/2026");
  assert.equal(formatDateTime(null), "—");
  assert.deepEqual(relativeDate(value, Date.parse(value) + 60000), relativeDate("2026-11-01T23:37:00+07:00", Date.parse(value) + 60000));
});
