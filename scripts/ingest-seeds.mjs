// Step 3: pull each seed channel's recent uploads (<= 500) via the uploads playlist, fetch details, keep the most-viewed.
// Quota: ~10 units/channel for playlistItems + ~10 for videos.list. Writes data/seed.json (for curate) and fills data/yt-cache.json.
import { readFile, writeFile } from "node:fs/promises";

const env = await readFile(new URL("../.env.local", import.meta.url), "utf8");
const key = env.match(/^YOUTUBE_API_KEY=(.+)$/m)[1].trim();
const rd = async (f, d) => { try { return JSON.parse(await readFile(new URL(`../data/${f}`, import.meta.url), "utf8")); } catch { return d; } };
const groups = await rd("seed-resolved.json", {});
const cache = await rd("yt-cache.json", {});
const PER_CHANNEL = 40;
const SCHOOL = /^(khanacademy|crashcourse|ted-?ed|professordaveexplains|amoebasisters|minuteearth|thebrainscoop|mathantics|nancypi|jbstatistics|theorganicchemistrytutor|periodicvideos)$/i;
const UNIVERSITY = /^(mitocw|stanfordonline|cs50|yalecourses|harvard|oxforduniversity|cmudatabasegroup|mitcsail|stanfordgsb|mit)$/i;

const api = async (path, params) => {
  const u = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  u.search = new URLSearchParams({ ...params, key });
  const r = await fetch(u);
  if (!r.ok) throw new Error(`${path} ${r.status}: ${(await r.text()).replace(key, "***").slice(0, 200)}`);
  return r.json();
};
const iso = (d = "") => { const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0; };

const seed = [], seen = new Set();
for (const [topic, chans] of Object.entries(groups)) {
  for (const c of chans) {
   try {
    const ids = [];
    let page;
    for (let i = 0; i < 10; i++) {
      const j = await api("playlistItems", { part: "contentDetails", playlistId: c.uploads, maxResults: "50", ...(page ? { pageToken: page } : {}) });
      ids.push(...j.items.map((x) => x.contentDetails.videoId));
      if (!(page = j.nextPageToken)) break;
    }
    const det = [];
    for (let i = 0; i < ids.length; i += 50) {
      const j = await api("videos", { part: "snippet,contentDetails,statistics,status", id: ids.slice(i, i + 50).join(",") });
      for (const it of j.items ?? []) {
        const e = {
          dur: iso(it.contentDetails.duration), live: it.snippet.liveBroadcastContent !== "none", embed: it.status.embeddable,
          views: +(it.statistics.viewCount ?? 0), likes: +(it.statistics.likeCount ?? 0),
          lang: it.snippet.defaultAudioLanguage ?? it.snippet.defaultLanguage ?? null, cat: it.snippet.categoryId,
          pub: it.snippet.publishedAt?.slice(0, 10), desc: (it.snippet.description ?? "").slice(0, 4000), tags: (it.snippet.tags ?? []).slice(0, 15),
        };
        cache[it.id] = e;
        det.push({ id: it.id, ...e });
      }
    }
    const level = SCHOOL.test(c.handle) ? "school" : UNIVERSITY.test(c.handle) ? "university" : undefined;
    det.filter((d) => d.embed && !d.live && d.dur >= 180 && d.dur <= 7200).sort((a, b) => b.views - a.views).slice(0, PER_CHANNEL)
      .forEach((d) => { if (!seen.has(d.id)) { seen.add(d.id); seed.push({ id: d.id, topic, ...(level ? { level } : {}), channelHandle: c.handle }); } });
    console.log(`${topic}/${c.handle}: ${ids.length} uploads`);
   } catch (e) { console.log(`SKIP ${topic}/${c.handle}: ${String(e.message).slice(0, 90)}`); }
  }
}
await writeFile(new URL("../data/seed.json", import.meta.url), JSON.stringify(seed));
await writeFile(new URL("../data/yt-cache.json", import.meta.url), JSON.stringify(cache));
console.log(`seed videos: ${seed.length}`);
