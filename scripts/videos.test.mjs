import test from "node:test";
import assert from "node:assert/strict";
import { buildList, fmtTime, parseTimecode, search } from "../lib/videos.ts";

const mk = (id, title, topic, score, extra = {}) => ({ id, title, channel: "Ch", topic, level: "general", start: null, score, recs: 0, mentions: 0, first: 0, last: 0, ...extra });
const V = [mk("a", "Linear algebra intro", "math", 10), mk("b", "Neural nets", "machine-learning", 50), mk("c", "Calculus limits", "math", 30)];

test("search needs every word, ranks title hits", () => {
  assert.deepEqual(search(V, "linear algebra").map((v) => v.id), ["a"]);
  assert.deepEqual(search(V, "math").map((v) => v.id), ["c", "a"]);
  assert.deepEqual(search(V, "  "), []);
  assert.deepEqual(search(V, "zzz"), []);
});
test("buildList: clicked video first, then hits, then rest; filters and hidden respected", () => {
  assert.deepEqual(buildList(V, { q: "math", start: "a" }).map((v) => v.id), ["a", "c", "b"]);
  assert.deepEqual(buildList(V, { topic: "math" }).map((v) => v.id), ["c", "a"]);
  assert.deepEqual(buildList(V, { hidden: ["b"] }).map((v) => v.id), ["c", "a"]);
  assert.deepEqual(buildList(V, { saved: ["a"] }).map((v) => v.id), ["a"]);
  assert.deepEqual(buildList(V, { seen: ["b"] }).map((v) => v.id), ["c", "a", "b"]);
});

import { chapters, pickStart, peakStart } from "./lib.mjs";
test("chapters parsed from description; intro skipped; HN moment wins", () => {
  const d = "Talk\n0:00 Intro\n1:30 Why types matter\n12:00 Q&A\n";
  const ch = chapters(d);
  assert.equal(ch.length, 3);
  assert.deepEqual(pickStart({}, null, ch, 1800), { start: 90, src: "chapter" });
  assert.deepEqual(pickStart({}, { t: 754, n: 2 }, ch, 1800), { start: 754, src: "hn" });
  assert.deepEqual(pickStart({}, null, [], 3000), { start: 60, src: "guess" });
});

test("timecode parse/format round-trip", () => {
  assert.equal(parseTimecode("12:34"), 754);
  assert.equal(parseTimecode("1:02:03"), 3723);
  assert.equal(parseTimecode("754"), 754);
  assert.equal(parseTimecode("1h2m3s"), 3723);
  assert.equal(parseTimecode("abc"), null);
  assert.equal(parseTimecode(""), null);
  assert.equal(fmtTime(754), "12:34");
  assert.equal(fmtTime(3723), "1:02:03");
});

test("peakStart finds the replay peak after the intro, ignores flat heatmaps", () => {
  const h = Array(100).fill(0.2); h[0] = 1; h[1] = 1; h[60] = 0.95; h[61] = 0.9; // intro spike must be ignored
  const pk = peakStart(h, 1000);
  assert.ok(pk && pk.start >= 560 && pk.start <= 620, JSON.stringify(pk));
  assert.equal(peakStart(Array(100).fill(0.5), 1000), null);
  assert.equal(peakStart(h, 100), null); // too short a video
  assert.equal(peakStart(null, 1000), null);
});
test("pickStart: HN > peak (snapped to chapter) > chapter > guess", () => {
  const h = Array(100).fill(0.2); h[60] = 1; h[61] = 1; h[62] = 1;
  const ch = [{ t: 0, title: "Intro" }, { t: 590, title: "The key proof" }, { t: 900, title: "Wrap up" }];
  assert.deepEqual(pickStart({}, { t: 300, n: 1 }, ch, 1000, h), { start: 300, src: "hn" });
  assert.deepEqual(pickStart({}, null, ch, 1000, h), { start: 590, src: "peak" });
  assert.equal(pickStart({}, null, ch, 1000, null).src, "chapter");
  assert.equal(pickStart({}, null, [], 1000, null).src, "guess");
});
test("ranking: variety, seen penalty, taste", () => {
  const mk2 = (id, ch, score, topic = "math") => ({ id, title: id, channel: ch, topic, level: "general", start: null, dur: 600, score, recs: 0, mentions: 0, first: 0, last: 0 });
  const V = [mk2("a1", "A", 90), mk2("a2", "A", 89), mk2("a3", "A", 88), mk2("a4", "A", 87), mk2("b1", "B", 50), mk2("c1", "C", 49, "arts")];
  const ids = (o) => buildList(V, o).map((v) => v.id);
  // 3 videos from A in a row are not allowed: B/C slotted in
  const order = ids({});
  for (let i = 0; i + 3 < order.length; i++) assert.ok(!order.slice(i, i + 4).every((x) => x.startsWith("a")), order.join());
  assert.equal(ids({ seen: ["a1"] }).indexOf("a1") > ids({}).indexOf("a1"), true);
  assert.equal(ids({ liked: ["c1"], seen: [] })[0] === "a1", true); // taste nudges, it does not override a 40-point quality gap
  // hiding three videos from channel A pushes its remaining video (87) below B (60): 87 - 30 = 57
  const V2 = [mk2("a1", "A", 90), mk2("a2", "A", 89), mk2("a3", "A", 88), mk2("a4", "A", 87), mk2("b1", "B", 60)];
  assert.equal(buildList(V2, { hidden: ["a1", "a2", "a3"] })[0].id, "b1");
  assert.equal(buildList(V2, {})[0].id, "a1");
});

import { buildTracks, difficulty } from "./tracks.mjs";
test("difficulty: intro < lecture < advanced talk; clamps 1..5", () => {
  const mkv = (title, o = {}) => ({ id: title, title, channel: "X", level: "general", dur: 1200, score: 50, ...o });
  assert.ok(difficulty(mkv("Intro to linear algebra")) < difficulty(mkv("Linear algebra lecture 14")));
  assert.ok(difficulty(mkv("Linear algebra", { channel: "Khan Academy", level: "school" })) <= 1.5);
  assert.ok(difficulty(mkv("Advanced theorem proof deep dive", { level: "university", channel: "MIT CSAIL", dur: 7000 })) <= 5);
});
test("buildTracks orders beginner -> advanced and avoids same-channel neighbours", () => {
  const vids = [];
  for (let i = 0; i < 14; i++) vids.push({ id: "v" + i, title: `Linear algebra part ${i}${i < 5 ? " intro basics" : i > 10 ? " advanced proof" : ""}`, channel: "C" + (i % 4), level: i < 5 ? "school" : i > 10 ? "university" : "general", dur: 900, score: 90 - i });
  const [t] = buildTracks(vids, {}, { min: 5 });
  assert.equal(t.id, "linear-algebra");
  const d = t.items.map((id) => difficulty(vids.find((v) => v.id === id)));
  const third = Math.ceil(d.length / 3);
  assert.ok(d.slice(0, third).reduce((a, b) => a + b) / third <= d.slice(-third).reduce((a, b) => a + b) / third); // first third easier than last third
  const ch = t.items.map((id) => vids.find((v) => v.id === id).channel);
  for (let i = 1; i < ch.length; i++) assert.notEqual(ch[i], ch[i - 1]);
});

import { episodeNo } from "./tracks.mjs";
test("episode numbers parse; series stay in order", () => {
  assert.equal(episodeNo("Essence of linear algebra: Chapter 3"), 3);
  assert.equal(episodeNo("Linear Algebra 14a: Why Determinants?"), 14);
  assert.equal(episodeNo("Neural Networks from Scratch - P.4 Forward"), 4);
  assert.equal(episodeNo("Just a talk"), null);
  const vids = [3, 1, 2].map((n, i) => ({ id: "e" + n, title: `Linear algebra chapter ${n}`, channel: "S", level: "general", dur: 900, score: 80 - i }))
    .concat(Array.from({ length: 10 }, (_, i) => ({ id: "o" + i, title: `Linear algebra talk ${i}`, channel: "O" + (i % 3), level: "general", dur: 900, score: 60 - i })));
  const [tr] = buildTracks(vids, {}, { min: 5 });
  const eps = tr.items.filter((id) => id.startsWith("e"));
  assert.deepEqual(eps, ["e1", "e2", "e3"]);
});

test("pinned series come first in episode order", () => {
  const vids = [3, 1, 2].map((n) => ({ id: "p" + n, title: `Essence of linear algebra | Chapter ${n}`, channel: "3B", level: "general", dur: 900, score: 10 }))
    .concat(Array.from({ length: 14 }, (_, i) => ({ id: "x" + i, title: `Linear algebra talk ${i}`, channel: "X" + (i % 5), level: "general", dur: 900, score: 90 - i })));
  const [tr] = buildTracks(vids, {}, { min: 5 });
  assert.deepEqual(tr.items.slice(0, 3), ["p1", "p2", "p3"]);
  assert.equal(new Set(tr.items).size, tr.items.length); // no duplicates
});

test("buildList track mode keeps the given order and skips hidden videos", () => {
  const mk3 = (id) => ({ id, title: id, channel: "C" + id, topic: "math", level: "general", start: null, dur: 600, score: Number(id.slice(1)), recs: 0, mentions: 0, first: 0, last: 0 });
  const V3 = ["a1", "a5", "a3", "a9"].map(mk3);
  assert.deepEqual(buildList(V3, { track: ["a3", "a1", "a9", "nope"] }).map((v) => v.id), ["a3", "a1", "a9"]);
  assert.deepEqual(buildList(V3, { track: ["a3", "a1", "a9"], hidden: ["a1"] }).map((v) => v.id), ["a3", "a9"]);
});
