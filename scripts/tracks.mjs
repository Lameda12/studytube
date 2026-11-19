// Learn tracks: ordered beginner -> advanced playlists per subject. Heuristic (no AI): keyword membership + a 1-5 difficulty estimate.
import { has } from "./lib.mjs";

export const TRACKS = [
  { id: "calculus", pin: [/essence of calculus/i], title: "Calculus", icon: "∫", topic: "math", blurb: "Limits, derivatives, integrals", match: ["calculus", "derivative", "integral", "differential equation", "taylor series", "chain rule", "limits of"] },
  { id: "linear-algebra", pin: [/essence of linear algebra/i], title: "Linear algebra", icon: "▦", topic: "math", blurb: "Vectors, matrices, eigenvalues", match: ["linear algebra", "matrices", "eigen", "determinant", "linear transformation", "linear map", "vector space", "inner product", "singular value", "matrix multiplication"] },
  { id: "probability-stats", title: "Probability & statistics", icon: "🎲", topic: "math", blurb: "From dice to Bayes", match: ["probability", "statistic", "bayes", "random variable", "probability distribution", "hypothesis test", "confidence interval", "central limit"] },
  { id: "number-theory-logic", title: "Number theory & logic", icon: "🔢", topic: "math", blurb: "Primes, proofs, puzzles", match: ["number theory", "prime", "proof", "modular", "cryptograph", "logic", "set theory", "infinity", "godel", "gödel", "combinatoric"] },
  { id: "algorithms", title: "Algorithms & data structures", icon: "🧩", topic: "computer-science", blurb: "Sorting, graphs, complexity", match: ["algorithm", "data structure", "sorting", "complexity", "big o", "graph theory", "dynamic programming", "hash table", "binary tree", "leetcode"] },
  { id: "systems", title: "Operating systems & systems", icon: "🖥️", topic: "computer-science", blurb: "Kernels, memory, concurrency", match: ["operating system", "kernel", "linux", "unix", "concurrency", "filesystem", "virtual memory", "assembly language", "systems programming"] },
  { id: "languages", title: "Programming languages", icon: "λ", topic: "computer-science", blurb: "Types, functional, compilers", match: ["programming language", "type system", "functional programming", "lisp", "haskell", "rust", "compiler", "interpreter", "lambda", "category theory", "scheme"] },
  { id: "databases-distributed", title: "Databases & distributed systems", icon: "🗄️", topic: "computer-science", blurb: "Storage, consensus, scale", match: ["database", "sql", "distributed", "consensus", "raft", "paxos", "scalab", "cache", "queue", "storage"] },
  { id: "security", title: "Security & cryptography", icon: "🔐", topic: "computer-science", blurb: "How systems get broken", match: ["security", "cryptograph", "encryption", "hacking", "exploit", "vulnerab", "malware", "tls", "passwords"] },
  { id: "neural-networks", pin: [/deep learning,? chapter/i, /zero to hero|micrograd|makemore/i], title: "Neural networks & deep learning", icon: "🧠", topic: "machine-learning", blurb: "Backprop to convnets", match: ["neural network", "deep learning", "backprop", "gradient descent", "convolution", "cnn", "perceptron", "pytorch", "tensorflow"] },
  { id: "transformers-llms", pin: [/large language models explained briefly/i, /attention in transformers/i, /let.s build gpt/i], title: "Transformers & LLMs", icon: "🤖", topic: "machine-learning", blurb: "Attention, GPT, scaling", match: ["transformer", "attention", "gpt", "llm", "language model", "chatgpt", "bert", "tokeniz", "fine-tun", "diffusion"] },
  { id: "classic-ml", pin: [/^statquest/i], title: "Classic ML & data", icon: "📊", topic: "machine-learning", blurb: "Regression, trees, clustering", match: ["machine learning", "regression", "decision tree", "random forest", "clustering", "svm", "pca", "bias and variance", "overfit", "statquest"] },
  { id: "physics", title: "Physics", icon: "⚛️", topic: "science", blurb: "Motion, relativity, fields", match: ["physics", "relativity", "mechanics", "newton", "electromagnet", "thermodynamic", "entropy", "gravity", "feynman"] },
  { id: "quantum", title: "Quantum physics", icon: "🌀", topic: "science", blurb: "Waves, spin, entanglement", match: ["quantum", "wave function", "schrodinger", "schrödinger", "entangle", "uncertainty principle", "bell", "double slit", "particle"] },
  { id: "space", title: "Space & cosmology", icon: "🪐", topic: "science", blurb: "Stars, black holes, the universe", match: ["black hole", "cosmology", "universe", "astronomy", "galaxy", "big bang", "telescope", "exoplanet", "solar system"] },
  { id: "biology", title: "Biology & evolution", icon: "🧬", topic: "science", blurb: "Cells, genes, life", match: ["biology", "evolution", "genetic", "dna", "cells", "protein", "ecology", "virus", "immune", "crispr"] },
  { id: "chemistry", title: "Chemistry", icon: "⚗️", topic: "science", blurb: "Atoms to reactions", match: ["chemistry", "chemical reaction", "molecule", "periodic table", "organic chemistry", "acids and bases", "chemical bond"] },
  { id: "neuroscience", title: "Brain & mind", icon: "🧠", topic: "science", blurb: "Neurons, memory, consciousness", match: ["neuroscience", "the brain", "neurons", "consciousness", "psychology", "cognitive", "how memory works"] },
  { id: "electronics", title: "Electronics & hardware", icon: "🔌", topic: "engineering", blurb: "Circuits, chips, computers from scratch", match: ["electronics", "circuit", "transistor", "semiconductor", "microchip", "chip design", "fpga", "cpu", "processor", "arduino", "resistor", "op amp", "pcb"] },
  { id: "control-robotics", title: "Control & robotics", icon: "🦾", topic: "engineering", blurb: "Feedback, sensors, motion", match: ["control system", "pid", "robot", "feedback control", "kalman", "sensors", "servo", "autonomous", "drone"] },
  { id: "aerospace-energy", title: "Aerospace & energy", icon: "🚀", topic: "engineering", blurb: "Rockets, planes, power", match: ["rocket", "aerospace", "aircraft", "spacex", "nasa", "orbital", "jet engine", "turbine", "nuclear", "battery", "solar power", "power grid"] },
  { id: "economics", title: "Economics", icon: "📉", topic: "business", blurb: "Markets, incentives, policy", match: ["economics", "economy", "inflation", "supply and demand", "monetary", "gdp", "incentives"] },
  { id: "startups", title: "Startups & product", icon: "🚀", topic: "business", blurb: "Ideas to company", match: ["startup", "founder", "y combinator", "product management", "venture", "fundraising", "customer discovery", "pitch", "entrepreneur"] },
  { id: "finance", title: "Finance & investing", icon: "💹", topic: "business", blurb: "Valuation, risk, markets", match: ["finance", "invest", "valuation", "stock market", "bonds", "portfolio", "options trading", "interest rate", "accounting", "hedge fund"] },
  { id: "philosophy", title: "Philosophy", icon: "🏛️", topic: "arts", blurb: "Ethics, mind, knowledge", match: ["philosophy", "ethics", "stoic", "existential", "metaphysic", "epistemology", "kant", "nietzsche", "plato", "consciousness"] },
  { id: "history-society", title: "History & society", icon: "🌍", topic: "arts", blurb: "How we got here", match: ["history of", "ancient history", "empire", "industrial revolution", "world war", "civilization", "sociology", "medieval"] },
  { id: "music", title: "Music theory", icon: "🎹", topic: "arts", blurb: "Harmony, rhythm, composition", match: ["music theory", "harmony", "chord", "rhythm", "melody", "composition", "jazz", "scale", "counterpoint"] },
  { id: "film-design", title: "Film, design & writing", icon: "🎬", topic: "arts", blurb: "Storytelling and craft", match: ["film", "cinema", "screenplay", "storytelling", "graphic design", "typography", "architecture", "creative writing", "painting", "art history"] },
];

const NOISE = /\b(the matrix|glitch in the matrix|reloaded|trailer|racing|minecraft|gameplay|speedrun|parody|reaction video)\b/i;
/** Episode/chapter number from titles like "Chapter 3", "Lecture 14", "Part 2", "P.4", "2c:" (null if none). */
export const episodeNo = (t) => { const m = t.match(/(?:chapter|lecture|lec|part|episode|ep\.?|p\.|#)\s*(\d{1,3})\b/i) ?? t.match(/\b(\d{1,2})[a-z]?[:\s]\s*[A-Z]/); return m ? +m[1] : null; };

const BEGINNER_CH = /khan academy|crashcourse|crash course|ted-?ed|professor dave|amoeba|mathantics|nancypi|minuteearth|the organic chemistry tutor|periodic videos|school of life/i;
const ADVANCED_CH = /cppcon|strange loop|goto conferences|pycon|jane street|cmu database|mit csail|llvm|usenix|infoq|papers we love|lex fridman/i;

const pinIdx = (tr, v) => tr.pin.findIndex((re) => re.test(v.title));

/** 1 (gentle) .. 5 (hard). Heuristic: level, title wording, channel type, length. */
export function difficulty(v) {
  let d = v.level === "school" ? 1.2 : v.level === "university" ? 3.4 : 2.6;
  const t = `${v.title}`.toLowerCase();
  if (/\b(intro|introduction|basics?|beginner|for beginners|what is|what are|explained|visual|simply|101|first|crash course|from scratch|made easy|for dummies|in \d+ minutes|overview)\b/.test(t)) d -= 1;
  if (/\b(advanced|deep dive|proof of|theorem|graduate|rigorous|research|internals|in depth|in-depth|masterclass|part [2-9]|lecture (1[0-9]|[2-9][0-9])|lec (1[0-9]|[2-9][0-9])|keynote)\b/.test(t)) d += 1;
  if (/\blecture\b/.test(t)) d += 0.4;
  if (BEGINNER_CH.test(v.channel)) d -= 0.8;
  if (ADVANCED_CH.test(v.channel)) d += 0.8;
  const ep = episodeNo(v.title);
  if (ep) d += Math.min(1, ep / 25); // later chapters of a series are harder
  if (v.dur > 3600) d += 0.4;
  if (v.dur < 600) d -= 0.3;
  return Math.max(1, Math.min(5, Math.round(d * 2) / 2));
}

/** Keep episodes of one channel in number order within the slots they already hold. */
function orderEpisodes(list) {
  const byCh = new Map();
  list.forEach((v, i) => { const e = episodeNo(v.title); if (e !== null) (byCh.get(v.channel) ?? byCh.set(v.channel, []).get(v.channel)).push(i); });
  const out = [...list];
  for (const idx of byCh.values()) { const sorted = idx.map((i) => list[i]).sort((a, b) => episodeNo(a.title) - episodeNo(b.title)); idx.forEach((i, k) => (out[i] = sorted[k])); }
  return out;
}

/** No two neighbours from the same channel unless they are consecutive episodes of one series. */
function spreadByChannel(list) {
  const pool = orderEpisodes(list), out = [];
  const ok = (a, b) => !a || a.channel !== b.channel || (episodeNo(a.title) !== null && episodeNo(b.title) > episodeNo(a.title));
  while (pool.length) {
    const i = pool.findIndex((v) => ok(out[out.length - 1], v));
    out.push(...pool.splice(i < 0 ? 0 : i, 1));
  }
  return out;
}

/**
 * videos: final catalog rows (title, channel, level, dur, score...). weak: id -> tags/description text.
 * Returns [{ id, title, icon, topic, blurb, count, stages: {Beginner: n,...}, items: [ids in order] }].
 */
export function buildTracks(videos, weak = {}, { size = 36, min = 12 } = {}) {
  const out = [];
  for (const tr of TRACKS) {
    const members = [];
    for (const v of videos) {
      const strong = `${v.title} ${v.channel}`.toLowerCase(), soft = (weak[v.id] ?? "").toLowerCase();
      const pts = tr.match.reduce((n, w) => n + (has(` ${strong} `, w) ? 3 : 0) + (has(` ${soft} `, w) ? 1 : 0), 0);
      if (pts >= 3 && v.dur >= 240 && !NOISE.test(v.title)) members.push({ v, pts });
    }
    if (members.length < min) continue;
    const pinned = (tr.pin ?? []).length
      ? videos.filter((v) => v.dur >= 120 && tr.pin.some((re) => re.test(v.title)) && !NOISE.test(v.title))
          .sort((a, b) => pinIdx(tr, a) - pinIdx(tr, b) || (episodeNo(a.title) ?? 0) - (episodeNo(b.title) ?? 0)).slice(0, 12).map((v) => ({ ...v, diff: difficulty(v) }))
      : [];
    const pinnedIds = new Set(pinned.map((v) => v.id));
    // best quality first (title relevance breaks ties), keep `size`, then order as a ramp
    const picked = members.sort((a, b) => (b.v.score + b.pts + (b.v.seed ? 12 : 0)) - (a.v.score + a.pts + (a.v.seed ? 12 : 0))).filter((m) => !pinnedIds.has(m.v.id)).slice(0, size - pinned.length).map((m) => ({ ...m.v, diff: difficulty(m.v) }));
    // Easy -> hard by difficulty, then shorter first; stages are thirds of that order so every track has a real ramp.
    const key = (v) => v.diff + 0.2 * Math.log10(Math.max(v.dur, 60) / 600);
    picked.sort((a, b) => key(a) - key(b) || b.score - a.score);
    const third = Math.ceil(picked.length / 3);
    const stages = { Foundations: picked.slice(0, third), Core: picked.slice(third, 2 * third), "Deep dive": picked.slice(2 * third) };
    const ordered = [...pinned, ...Object.values(stages).flatMap((a) => spreadByChannel(a))];
    stages.Foundations = [...pinned, ...stages.Foundations];
    out.push({ id: tr.id, title: tr.title, icon: tr.icon, topic: tr.topic, blurb: tr.blurb, count: ordered.length, stages: Object.fromEntries(Object.entries(stages).map(([k, a]) => [k, a.length])), items: ordered.map((v) => v.id) });
  }
  return out;
}
