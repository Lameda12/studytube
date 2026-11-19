// Step 4: "most replayed" heatmap + chapters per video via yt-dlp (metadata only, nothing downloaded), build-time only.
// Slow mode: one request at a time, ~10s apart, stops at the first sign of a bot check (never uses cookies). Resumable: data/heat.json { id: { h: [100 values 0-1] | null, ch: [[sec,title],...] } }. Best-ranked videos first.
import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";

const rd = async (f, d) => { try { return JSON.parse(await readFile(new URL(f, import.meta.url), "utf8")); } catch { return d; } };
const videos = await rd("../public/videos.json", []);
const heat = await rd("../data/heat.json", {});
const LIMIT = Number(process.argv[2] ?? 100000);
const todo = videos.filter((v) => !(v.id in heat)).slice(0, LIMIT).map((v) => v.id);
console.log(`to fetch ${todo.length}, already ${Object.keys(heat).length}`);

const run = (id) => new Promise((res) =>
  execFile("yt-dlp", ["--skip-download", "--dump-single-json", "--no-warnings", "--no-playlist", `https://www.youtube.com/watch?v=${id}`], { maxBuffer: 64e6, timeout: 60000 }, (err, out) => {
    if (err) return res({ err: String(err.message).slice(0, 120) });
    try {
      const d = JSON.parse(out);
      res({ h: d.heatmap ? d.heatmap.map((b) => Math.round(b.value * 100) / 100) : null, ch: (d.chapters ?? []).map((c) => [Math.round(c.start_time), c.title]) });
    } catch (e) { res({ err: "parse" }); }
  }));

let i = 0, done = 0, fails = 0, streak = 0, stop = false;
const save = () => writeFile(new URL("../data/heat.json", import.meta.url), JSON.stringify(heat));
const DELAY = Number(process.env.HEAT_DELAY_MS ?? 10000);
await Promise.all(Array.from({ length: 1 }, async () => {
  while (i < todo.length && !stop) {
    const id = todo[i++];
    const r = await run(id);
    if (r.err) { fails++; if (++streak >= 3) { stop = true; console.log("STOP: 3 failures in a row (likely bot check):", r.err); } else await new Promise((r) => setTimeout(r, 60000)); continue; }
    streak = 0; heat[id] = r;
    await new Promise((r) => setTimeout(r, DELAY * (0.7 + Math.random() * 0.6)));
    if (++done % 20 === 0) { await save(); console.log(`${done}/${todo.length} (fails ${fails})`); }
  }
}));
await save();
console.log(`done ${done}, fails ${fails}, with heatmap ${Object.values(heat).filter((x) => x.h).length}`);
