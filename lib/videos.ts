// Shared types + pure helpers (no imports, so node can run the test on it directly).
export type Video = {
  id: string; title: string; channel: string; topic: string; level: string;
  start: number | null; startSrc?: string; dur: number; score: number; recs: number; mentions: number; first: number; last: number; views?: number; pub?: string; diff?: number;
};

export const TOPICS: { id: string; label: string; icon: string }[] = [
  { id: "machine-learning", label: "Machine learning", icon: "🧠" },
  { id: "computer-science", label: "Computer science", icon: "💻" },
  { id: "math", label: "Math", icon: "∑" },
  { id: "science", label: "Science", icon: "🔬" },
  { id: "engineering", label: "Engineering", icon: "⚙️" },
  { id: "business", label: "Business", icon: "📈" },
  { id: "arts", label: "Arts", icon: "🎨" },
];
export type Track = { id: string; title: string; icon: string; topic: string; blurb: string; count: number; stages: Record<string, number>; items: string[] };
export const LEVELS = ["school", "university", "general"] as const;

export const topicLabel = (id: string) => TOPICS.find((t) => t.id === id)?.label ?? id;

/** Rank by how many query words hit title (x3), channel (x2), topic (x1). Empty query = []. */
export function search(videos: Video[], q: string): Video[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return videos
    .map((v) => {
      const t = v.title.toLowerCase(), c = v.channel.toLowerCase(), tp = `${v.topic} ${topicLabel(v.topic)}`.toLowerCase();
      let s = 0;
      for (const w of words) {
        if (!t.includes(w) && !c.includes(w) && !tp.includes(w)) return { v, s: 0 }; // every word must match somewhere
        s += (t.includes(w) ? 3 : 0) + (c.includes(w) ? 2 : 0) + (tp.includes(w) ? 1 : 0);
      }
      return { v, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.v.score - a.v.score)
    .map((x) => x.v);
}

export type FeedOpts = {
  topic?: string; level?: string; q?: string; start?: string; saved?: string[]; hidden?: string[]; seen?: string[];
  liked?: string[]; // ids the user saved: boosts their channels/topics (kept separate from `saved`, which restricts the pool)
  track?: string[]; // ordered video ids of a Learn track: returned in that order, no re-ranking
  seed?: number; // session seed: small per-visit shuffle so the feed isn't identical every time
};

const jitter = (id: string, seed: number) => {
  let h = seed | 0;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 2654435761);
  return (((h >>> 0) % 1000) / 1000 - 0.5) * 8; // -4..+4 points
};

/** Effective rank: quality score, minus watched, plus taste (saved channels/topics up, hidden channels down), plus jitter. */
function effective(videos: Video[], o: FeedOpts) {
  const by = new Map(videos.map((v) => [v.id, v]));
  const seen = new Set(o.seen ?? []);
  const likedCh = new Map<string, number>(), likedTopic = new Map<string, number>(), hiddenCh = new Map<string, number>();
  for (const id of o.liked ?? []) { const v = by.get(id); if (v) { likedCh.set(v.channel, (likedCh.get(v.channel) ?? 0) + 1); likedTopic.set(v.topic, (likedTopic.get(v.topic) ?? 0) + 1); } }
  for (const id of o.hidden ?? []) { const v = by.get(id); if (v) hiddenCh.set(v.channel, (hiddenCh.get(v.channel) ?? 0) + 1); }
  const nLiked = (o.liked ?? []).length || 1;
  return (v: Video) =>
    v.score - (seen.has(v.id) ? 40 : 0)
    + Math.min(20, 10 * (likedCh.get(v.channel) ?? 0)) + 8 * ((likedTopic.get(v.topic) ?? 0) / nLiked)
    - Math.min(30, 12 * (hiddenCh.get(v.channel) ?? 0))
    + (o.seed ? jitter(v.id, o.seed) : 0);
}

/** Greedy pass: best remaining video whose channel isn't among the last `gap` picks. Only the head is reordered (cheap). */
function spread(sorted: Video[], gap = 3, head = 400): Video[] {
  const pool = sorted.slice(0, head), out: Video[] = [];
  while (pool.length) {
    const recent = new Set(out.slice(-gap).map((v) => v.channel));
    const i = pool.findIndex((v) => !recent.has(v.channel));
    out.push(...pool.splice(i < 0 ? 0 : i, 1));
  }
  return [...out, ...sorted.slice(head)];
}

/**
 * Feed order: the clicked video first, then search hits, then everything else ranked by `effective`
 * (unseen first, taste-adjusted, no channel back-to-back). `saved` restricts the pool to saved ids.
 */
export function buildList(videos: Video[], o: FeedOpts): Video[] {
  const hidden = new Set(o.hidden ?? []);
  if (o.track) {
    const by = new Map(videos.map((v) => [v.id, v]));
    return o.track.map((id) => by.get(id)).filter((v): v is Video => !!v && !hidden.has(v.id));
  }
  const pool = videos.filter(
    (v) => !hidden.has(v.id) && (!o.topic || v.topic === o.topic) && (!o.level || v.level === o.level) && (!o.saved || o.saved.includes(v.id)),
  );
  const eff = effective(videos, o);
  const first = o.start ? videos.find((v) => v.id === o.start) : undefined;
  const hits = o.q ? search(pool, o.q) : [];
  const hitIds = new Set(hits.map((v) => v.id));
  const rest = pool.filter((v) => !hitIds.has(v.id)).map((v) => [v, eff(v)] as const).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
  const out = spread([...hits, ...rest]).filter((v) => v.id !== first?.id);
  return first ? [first, ...out] : out;
}

export const fmtCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

export const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2]; // YouTube's embedded player tops out at 2x

export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${p(m)}:${p(r)}` : `${m}:${p(r)}`;
}

/** "754", "12:34", "1:02:03", "12m34s", "1h2m3s" -> seconds, or null if not a time. */
export function parseTimecode(input: string): number | null {
  const t = input.trim().toLowerCase();
  if (/^\d+$/.test(t)) return +t;
  if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(t)) return t.split(":").reduce((a, x) => a * 60 + +x, 0);
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  return m && t ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : null;
}

/** Stage name for the n-th (0-based) step of a track, from its stage sizes. */
export function stageAt(t: Track, n: number): string {
  let left = n;
  for (const [name, size] of Object.entries(t.stages)) { if (left < size) return name; left -= size; }
  return Object.keys(t.stages).pop() ?? "";
}
