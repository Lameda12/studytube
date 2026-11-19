// Pure helpers for the curation pipeline.

export const TOPICS = {
  "machine-learning": ["machine learning", "neural net", "deep learning", "transformer", "gpt", "llm", "language model", "attention is", "backprop", "diffusion", "reinforcement learning", "karpathy", "tensorflow", "pytorch", "artificial intelligence", "deepmind", "openai", "computer vision", "nlp"],
  "computer-science": ["algorithm", "data structure", "compiler", "operating system", "database", "programming", "computer science", "cs50", "sicp", "complexity", "type theory", "networking", "c++", "cppcon", "python", "rust", "javascript", "lisp", "haskell", "unix", "linux", "kernel", "software", "strange loop", "pycon", "goto ", "gotocon", "lambda", "functional", "object-oriented", "distributed", "security", "cryptograph", "git ", "api", "web ", "browser", "javascript", "scheme", "turing", "computer history"],
  math: ["math", "calculus", "linear algebra", "probability", "statistic", "topology", "number theory", "proof", "geometry", "algebra", "euler", "fourier", "prime", "infinity", "theorem", "numberphile", "3blue1brown", "combinatorics", "logic"],
  science: ["physics", "chemistry", "biology", "quantum", "relativity", "astronomy", "cosmology", "neuroscience", "genetics", "evolution", "ecology", "geology", "feynman", "universe", "black hole", "particle", "brain", "dna", "climate", "space", "planet", "medicine"],
  engineering: ["engineering", "circuit", "electronics", "mechanical", "control system", "aerospace", "rocket", "chip", "semiconductor", "robot", "materials", "manufactur", "battery", "engine", "spacex", "nasa", "fpga", "hardware", "processor", "cpu", "bridge", "reactor"],
  business: ["business", "economics", "economy", "startup", "finance", "marketing", "management", "accounting", "invest", "entrepreneur", "negotiation", "y combinator", "venture", "product management", "leadership", "market", "pricing", "founder"],
  arts: ["art history", "painting", "music theory", "music", "film", "cinema", "architecture", "literature", "philosophy", "poetry", "history of", "typography", "history", "language", "linguistics", "psychology", "sociology", "culture", "writing", "novel", "photograph"],
};

export const LEVELS = {
  school: ["khan academy", "crash course", "high school", "grade ", "k-12", "elementary", "for kids", "for beginners", "basics of", "gcse", "a-level", "ted-ed", "for dummies"],
  university: ["lecture", "course", "mit ", "ocw", "opencourseware", "stanford", "cs229", "cs231n", "cs50", "6.0", "6.8", "berkeley", "harvard", "oxford", "cambridge", "yale", "university", "seminar", "graduate", "professor", "lec "],
};

export function videoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1, 12) || null;
    if (/(^|\.)youtube\.com$/.test(u.hostname) && u.pathname === "/watch") return u.searchParams.get("v")?.slice(0, 11) || null;
  } catch {}
  return null;
}

export function startSeconds(url) {
  try {
    const t = new URL(url).searchParams.get("t") ?? new URL(url).searchParams.get("start");
    if (!t) return null;
    if (/^\d+$/.test(t)) return +t;
    const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : null;
  } catch {}
  return null;
}

// Not study content even if a topic word appears.
const NOISE = /\b(ukraine|russia|trump|biden|election|republican|democrat|jordan peterson|ben shapiro|mearsheimer|conspiracy|israel|gaza|vaccine mandate)\b/i;
// Keywords match from a word start ("invest" hits "investing", "api" does not hit "capital").
export const has = (text, w) => new RegExp(`(?<![a-z0-9])${w.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(text);

export function classify(text, query, weak = "") {
  const strong = ` ${text.toLowerCase()} `, soft = ` ${weak.toLowerCase()} `;
  if (NOISE.test(text)) return { topic: query, level: "general", matched: false };
  const score = Object.entries(TOPICS).map(([k, words]) => [k, words.reduce((n, w) => n + (has(strong, w) ? 3 : 0) + (has(soft, w) ? 1 : 0), 0)]);
  score.sort((a, b) => b[1] - a[1]);
  const matched = score[0][1] >= 3 || (score[0][1] >= 2 && score[0][1] > score[1][1]);
  const topic = matched ? score[0][0] : query;
  const all = strong + soft;
  const level = Object.entries(LEVELS).find(([, ws]) => ws.some((w) => has(all, w)))?.[0] ?? "general";
  return { topic, level, matched };
}

const SKIP_CH = /intro|welcome|sponsor|overview|agenda|outline|housekeeping|recap|preview|about|trailer|ad\b|credits|thanks|q&a|questions/i;

export function chapters(desc) {
  const out = [];
  for (const m of desc.matchAll(/^\s*[-•>*\s]*\(?(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\)?\s*[-–—:|.]?\s*(.+)$/gm)) {
    out.push({ t: (+m[1] || 0) * 3600 + +m[2] * 60 + +m[3], title: m[4].trim() });
  }
  return out.length >= 3 && out[0].t <= 5 && out.every((c, i) => !i || c.t > out[i - 1].t) ? out : [];
}

/** Best clip start from YouTube's "most replayed" heatmap (100 buckets, 0-1). Skips the intro, needs a clear peak. */
export function peakStart(h, dur, clip = 90) {
  if (!h || h.length < 20 || dur < 240) return null;
  const n = h.length, bucket = dur / n, w = Math.max(1, Math.round(clip / bucket));
  let best = null;
  for (let i = Math.ceil(n * 0.06); i + w <= n; i++) {
    let sum = 0;
    for (let k = 0; k < w; k++) sum += h[i + k];
    const avg = sum / w;
    if (!best || avg > best.avg) best = { i, avg };
  }
  const median = [...h].sort((a, b) => a - b)[n >> 1];
  if (!best || best.avg - median < 0.15) return null; // flat heatmap: no real signal
  return { start: Math.max(0, Math.round(best.i * bucket) - 4), avg: best.avg };
}

/**
 * Start priority: a moment HN readers linked > the most-replayed peak (snapped to a chapter start just before it)
 * > first real chapter > a guess. `ch` = [{t,title}], `heat` = array|null.
 */
export function pickStart(v, hn, ch, dur, heat = null) {
  if (hn && hn.t < dur - 120) return { start: hn.t, src: "hn" };
  const pk = peakStart(heat, dur);
  if (pk) {
    const c = ch.filter((c) => c.t <= pk.start + 5 && pk.start - c.t <= 25).pop();
    return { start: c ? c.t : pk.start, src: "peak" };
  }
  for (let i = 0; i < ch.length; i++) {
    const len = (ch[i + 1]?.t ?? dur) - ch[i].t;
    if (!SKIP_CH.test(ch[i].title) && len >= 90) return { start: ch[i].t, src: "chapter" };
  }
  return { start: dur > 1200 ? 60 : 0, src: "guess" };
}
