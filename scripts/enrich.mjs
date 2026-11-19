// Step 2a: YouTube Data API v3 metadata for every candidate in data/candidates.json (cached in data/yt-cache.json).
// Needs YOUTUBE_API_KEY in .env.local. ~1 quota unit per 50 videos.
import { readFile, writeFile } from "node:fs/promises";

const env = await readFile(new URL("../.env.local", import.meta.url), "utf8").catch(() => "");
const key = process.env.YOUTUBE_API_KEY ?? env.match(/^YOUTUBE_API_KEY=(.+)$/m)?.[1]?.trim();
if (!key) throw new Error("YOUTUBE_API_KEY missing (.env.local)");

const rd = async (f, d) => { try { return JSON.parse(await readFile(new URL(f, import.meta.url), "utf8")); } catch { return d; } };
const videos = await rd("../data/candidates.json", []);
const cache = await rd("../data/yt-cache.json", {});
const todo = videos.map((v) => v.id).filter((id) => !(id in cache));
console.log(`fetching ${todo.length} of ${videos.length}`);

for (let i = 0; i < todo.length; i += 50) {
  const ids = todo.slice(i, i + 50);
  const u = new URL("https://www.googleapis.com/youtube/v3/videos");
  u.search = new URLSearchParams({ part: "snippet,contentDetails,statistics,status", id: ids.join(","), key, maxResults: "50" });
  const r = await fetch(u);
  if (!r.ok) throw new Error(`YouTube API ${r.status}: ${(await r.text()).replace(key, "***").slice(0, 300)}`);
  const got = new Set();
  for (const it of (await r.json()).items ?? []) {
    got.add(it.id);
    cache[it.id] = {
      dur: iso(it.contentDetails.duration), live: it.snippet.liveBroadcastContent !== "none",
      embed: it.status.embeddable, views: +(it.statistics.viewCount ?? 0), likes: +(it.statistics.likeCount ?? 0),
      lang: it.snippet.defaultAudioLanguage ?? it.snippet.defaultLanguage ?? null, cat: it.snippet.categoryId,
      pub: it.snippet.publishedAt?.slice(0, 10), desc: (it.snippet.description ?? "").slice(0, 4000),
      tags: (it.snippet.tags ?? []).slice(0, 15),
    };
  }
  for (const id of ids) if (!got.has(id)) cache[id] = null; // removed/private
  if ((i / 50) % 10 === 9) await writeFile(new URL("../data/yt-cache.json", import.meta.url), JSON.stringify(cache));
}
await writeFile(new URL("../data/yt-cache.json", import.meta.url), JSON.stringify(cache));
console.log(`cached ${Object.keys(cache).length}`);

function iso(d) { const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); if (!m) return 0; return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0); }
