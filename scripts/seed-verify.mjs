// Resolves every handle in data/seed-channels.json via channels.list (1 quota unit each). Writes data/seed-resolved.json.
import { readFile, writeFile } from "node:fs/promises";
const env = await readFile(new URL("../.env.local", import.meta.url), "utf8");
const key = env.match(/^YOUTUBE_API_KEY=(.+)$/m)[1].trim();
const groups = JSON.parse(await readFile(new URL("../data/seed-channels.json", import.meta.url), "utf8"));
const out = {}, missing = [];
for (const [topic, handles] of Object.entries(groups)) {
  out[topic] = [];
  await Promise.all(handles.map(async (h) => {
    const u = new URL("https://www.googleapis.com/youtube/v3/channels");
    u.search = new URLSearchParams({ part: "snippet,statistics,contentDetails", forHandle: "@" + h, key });
    const r = await fetch(u); const j = await r.json();
    const c = j.items?.[0];
    if (!c) return missing.push(`${topic}:${h}`);
    out[topic].push({ handle: h, id: c.id, title: c.snippet.title, subs: +c.statistics.subscriberCount || 0, videos: +c.statistics.videoCount, uploads: c.contentDetails.relatedPlaylists.uploads });
  }));
  out[topic].sort((a, b) => b.subs - a.subs);
}
await writeFile(new URL("../data/seed-resolved.json", import.meta.url), JSON.stringify(out, null, 1));
const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : Math.round(n / 1e3) + "k");
for (const [t, cs] of Object.entries(out)) console.log(`\n${t} (${cs.length})\n` + cs.map((c) => `${c.title} ${fmt(c.subs)}`).join(" · "));
console.log("\nNOT FOUND:", missing.join(", ") || "none");
