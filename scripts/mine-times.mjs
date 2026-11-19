// Step 2b: HN commenters often link to the exact moment (?t=754). Take the most-linked timestamp per video.
// Output: data/hn-times.json  { id: { t, n } }  t = chosen start second, n = how many links pointed near it.
import { readFile, writeFile } from "node:fs/promises";
import { startSeconds, videoId } from "./lib.mjs";

const sql = await readFile(new URL("./mine-times.sql", import.meta.url), "utf8");
const r = await fetch("https://play.clickhouse.com/?user=play&default_format=JSONEachRow", { method: "POST", body: sql });
if (!r.ok) throw new Error(`ClickHouse ${r.status}: ${(await r.text()).slice(0, 300)}`);
const byVideo = {};
for (const line of (await r.text()).trim().split("\n")) {
  const url = "https://" + JSON.parse(line).link;
  const id = videoId(url.replace("youtube.com/watch?", "www.youtube.com/watch?")), t = startSeconds(url.replace(/[?&]start=/, "&t="));
  if (id && t >= 10 && t < 20000) (byVideo[id] ??= []).push(t);
}
const out = {};
for (const [id, ts] of Object.entries(byVideo)) {
  // cluster: for each t count links within +-20s, pick the biggest cluster (ties: earliest)
  let best = { t: 0, n: 0 };
  for (const t of ts) { const n = ts.filter((x) => Math.abs(x - t) <= 20).length; if (n > best.n || (n === best.n && t < best.t)) best = { t, n }; }
  out[id] = { t: best.t, n: Math.ceil(best.n / 2) }; // HN renders each link twice (href + text)
}
await writeFile(new URL("../data/hn-times.json", import.meta.url), JSON.stringify(out));
const cat = Object.keys(JSON.parse(await readFile(new URL("../data/yt-cache.json", import.meta.url), "utf8")));
console.log(`videos with a linked moment: ${Object.keys(out).length}; in our catalog: ${cat.filter((id) => out[id]).length} of ${cat.length}; with >=2 agreeing links: ${cat.filter((id) => out[id]?.n >= 2).length}`);
