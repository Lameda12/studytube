// Data integrity: catches a broken catalog or Learn track before it ships. Runs against the files the app loads.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const load = (f) => JSON.parse(readFileSync(new URL(`../public/${f}`, import.meta.url), "utf8"));
const catalog = load("catalog.json"), tracks = load("tracks.json");
const TOPICS = ["machine-learning", "computer-science", "math", "science", "engineering", "business", "arts"];

test("catalog: sane size, unique YouTube ids, required fields", () => {
  assert.ok(catalog.length >= 1000, `only ${catalog.length} videos`);
  const ids = new Set(catalog.map((v) => v.id));
  assert.equal(ids.size, catalog.length, "duplicate video ids");
  for (const v of catalog) {
    assert.match(v.id, /^[A-Za-z0-9_-]{11}$/, `bad id ${v.id}`);
    assert.ok(v.title && v.channel, `missing title/channel on ${v.id}`);
    assert.ok(TOPICS.includes(v.topic), `unknown topic ${v.topic} on ${v.id}`);
    assert.ok(["school", "university", "general"].includes(v.level), `bad level on ${v.id}`);
    assert.ok(v.dur >= 180 && v.dur <= 7200, `duration out of range on ${v.id}`);
    assert.ok(Number.isFinite(v.score), `bad score on ${v.id}`);
    assert.ok(v.start === null || (v.start >= 0 && v.start < v.dur), `start outside video on ${v.id}`);
  }
});

test("catalog: every topic has real content", () => {
  for (const t of TOPICS) assert.ok(catalog.filter((v) => v.topic === t).length >= 100, `topic ${t} is thin`);
});

test("tracks: ids unique, every item exists once, counts match", () => {
  assert.ok(tracks.length >= 10, "too few tracks");
  assert.equal(new Set(tracks.map((t) => t.id)).size, tracks.length, "duplicate track ids");
  const ids = new Set(catalog.map((v) => v.id));
  for (const t of tracks) {
    assert.equal(t.count, t.items.length, `${t.id}: count mismatch`);
    assert.ok(t.items.length >= 12, `${t.id}: too short`);
    assert.equal(new Set(t.items).size, t.items.length, `${t.id}: duplicate items`);
    for (const id of t.items) assert.ok(ids.has(id), `${t.id}: ${id} is not in the catalog`);
    assert.equal(Object.values(t.stages).reduce((a, b) => a + b, 0), t.items.length, `${t.id}: stage sizes don't add up`);
  }
});
