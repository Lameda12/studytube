// Step 1b: turn data/mined.json (HN recommenders) into data/candidates.json.
// oEmbed (no key) gives title/channel and drops private/non-embeddable videos; results are cached so reruns resume.
// Optional: data/seed.json [{id, topic, level, start?, title?}] always included; data/block.json ["id", ...] always excluded.
import { readFile, writeFile } from "node:fs/promises";
import { classify } from "./lib.mjs";

const rd = async (f, d) => { try { return JSON.parse(await readFile(new URL(`../data/${f}`, import.meta.url), "utf8")); } catch { return d; } };
const mined = await rd("mined.json", []);
const seed = await rd("seed.json", []);
const block = new Set(await rd("block.json", []));
const cache = await rd("oembed-cache.json", {}); // id -> {t, c} | 0 (unavailable)

const todo = mined.map((m) => m.id).concat(seed.map((s) => s.id)).filter((id) => !(id in cache) && !block.has(id));
console.log(`mined ${mined.length}, seed ${seed.length}, to fetch ${todo.length}`);

async function oembed(id) {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent("https://www.youtube.com/watch?v=" + id)}`);
      if (r.ok) { const o = await r.json(); return { t: o.title, c: o.author_name }; }
      if (r.status === 401 || r.status === 404 || r.status === 403) return 0; // private, removed, or embedding off
    } catch {}
    await new Promise((r) => setTimeout(r, 500 * (a + 1)));
  }
  return undefined; // transient failure: leave uncached so a rerun retries
}

let done = 0, i = 0;
const save = () => writeFile(new URL("../data/oembed-cache.json", import.meta.url), JSON.stringify(cache));
await Promise.all(Array.from({ length: 16 }, async () => {
  while (i < todo.length) {
    const id = todo[i++];
    const o = await oembed(id);
    if (o !== undefined) cache[id] = o;
    if (++done % 500 === 0) { await save(); console.log(`${done}/${todo.length}`); }
  }
}));
await save();

const seedById = new Map(seed.map((s) => [s.id, s]));
const out = [];
for (const m of [...mined, ...seed.filter((s) => !mined.some((x) => x.id === s.id)).map((s) => ({ id: s.id, recs: 0, mentions: 0, first: 0, last: 0 }))]) {
  const o = cache[m.id];
  if (!o || block.has(m.id)) continue;
  const s = seedById.get(m.id);
  const { topic, level, matched } = classify(`${o.t} ${o.c}`, s?.topic ?? "");
  if (!matched && !s) continue; // no study-topic keyword in title/channel
  out.push({
    id: m.id, title: o.t, channel: o.c, topic: matched ? topic : s?.topic ?? topic, level: s?.level ?? level, start: s?.start ?? null, seed: !!s,
    score: Math.round(m.recs * 10 + m.mentions), recs: m.recs, mentions: m.mentions, first: m.first, last: m.last,
  });
}
out.sort((a, b) => b.score - a.score);
await writeFile(new URL("../data/candidates.json", import.meta.url), JSON.stringify(out));
const by = {};
for (const v of out) { by[v.topic] ??= { school: 0, university: 0, general: 0 }; by[v.topic][v.level]++; }
console.log(`wrote ${out.length} videos`); console.table(by);
