// Step 2c: merge candidates + YouTube metadata + HN-linked moments into the final public/videos.json.
// Filters: embeddable, not live, 3-120 min, English (or unlabelled), study-ish YouTube category.
// Clip start priority: moment most linked on HN > first real chapter > guess (0:00 for short talks, 1:00 for long).
import { readFile, writeFile } from "node:fs/promises";
import { chapters, classify, pickStart } from "./lib.mjs";
import { buildTracks, difficulty } from "./tracks.mjs";

const rd = async (f, d) => { try { return JSON.parse(await readFile(new URL(`../data/${f}`, import.meta.url), "utf8")); } catch { return d; } };
const cands = await rd("candidates.json", []), yt = await rd("yt-cache.json", {}), times = await rd("hn-times.json", {}), heat = await rd("heat.json", {});
const block = new Set(await rd("block.json", []));
const BAD_CAT = new Set(["10", "15", "17", "20", "23", "24", "2", "30", "31", "32", "33", "34", "35", "36", "38", "43", "44"]); // music, pets, sports, gaming, comedy, entertainment, autos, movies/shows
const clamp = (x) => Math.max(0, Math.min(1, x));
// One 0-100 quality score for both sources: HN recommenders 55%, view count 15%, like ratio 10%, hand-picked channel 10%, plus clip-start evidence.
function quality(c, y, src) {
  const hn = clamp(Math.log1p(c.recs) / Math.log1p(60)), pop = clamp((Math.log10(y.views + 1) - 4) / 3), like = clamp(y.likes / Math.max(y.views, 1) / 0.05);
  const q = 100 * (0.55 * hn + 0.15 * pop + 0.1 * like + 0.1 * (c.seed ? 1 : 0)) + ({ hn: 8, peak: 5, chapter: 3 }[src] ?? 0);
  return Math.round(q * 10) / 10;
}
const out = [], why = {};
const drop = (r) => (why[r] = (why[r] ?? 0) + 1);
for (const c of cands) {
  const y = yt[c.id];
  if (block.has(c.id)) { drop("blocked"); continue; }
  if (!y) { drop("gone"); continue; }
  if (!y.embed) { drop("no-embed"); continue; }
  if (y.live) { drop("live"); continue; }
  if (y.dur < 180 || y.dur > 7200) { drop("duration"); continue; }
  if (y.lang && !y.lang.startsWith("en")) { drop("language"); continue; }
  if (BAD_CAT.has(y.cat)) { drop("category"); continue; }
  const { topic: t0, level, matched } = classify(`${c.title} ${c.channel}`, c.topic, `${y.tags.join(" ")} ${y.desc.slice(0, 400)}`);
  if (!matched && !c.seed) { drop("off-topic"); continue; }
  const topic = matched ? t0 : c.topic; // seed videos keep their channel's topic when the title has no keyword
  const hc = heat[c.id], ch = hc?.ch?.length >= 3 ? hc.ch.map(([t, title]) => ({ t, title })) : chapters(y.desc);
  const { start, src } = pickStart(c, times[c.id], ch, y.dur, hc?.h ?? null);
  out.push({
    id: c.id, title: c.title, channel: c.channel, topic, level, start, startSrc: src, dur: y.dur,
    score: quality(c, y, src), seed: !!c.seed, recs: c.recs, mentions: c.mentions, first: c.first, last: c.last,
    views: y.views, pub: y.pub,
  });
}
// Per-channel decay: a channel's 2nd best video loses 5 points, 3rd loses 10, ... (max 30), so no channel floods the top.
out.sort((a, b) => b.score - a.score);
const rank = {};
for (const v of out) { const n = (rank[v.channel] = (rank[v.channel] ?? 0) + 1); v.score = Math.max(0, Math.round((v.score - Math.min(30, 5 * (n - 1))) * 10) / 10); }
out.sort((a, b) => b.score - a.score);
await writeFile(new URL("../public/videos.json", import.meta.url), JSON.stringify(out)); // full data, also published as a download
// Slim copy the app actually loads: only the fields the UI uses.
const slim = out.map((v) => ({ id: v.id, title: v.title, channel: v.channel, topic: v.topic, level: v.level, start: v.start, dur: v.dur, score: v.score, recs: v.recs, diff: difficulty(v) }));
await writeFile(new URL("../public/catalog.json", import.meta.url), JSON.stringify(slim));
const weak = Object.fromEntries(out.map((v) => [v.id, `${(yt[v.id]?.tags ?? []).join(" ")} ${(yt[v.id]?.desc ?? "").slice(0, 300)}`]));
const tracks = buildTracks(out, weak);
await writeFile(new URL("../public/tracks.json", import.meta.url), JSON.stringify(tracks));
console.log(`tracks: ${tracks.length}`); console.table(tracks.map((t) => ({ track: t.title, n: t.count, ...t.stages })));
console.log(`kept ${out.length} of ${cands.length}; dropped`, why);
const src = {}, cell = {};
for (const v of out) { src[v.startSrc] = (src[v.startSrc] ?? 0) + 1; cell[v.topic] ??= { school: 0, university: 0, general: 0 }; cell[v.topic][v.level]++; }
console.log("start source", src); console.table(cell);
