"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LEVELS, TOPICS, fmtCount, search, topicLabel } from "@/lib/videos";
import { useTracks, useVideos } from "@/lib/useVideos";
import { useStored } from "@/lib/store";

const href = (p: Record<string, string | undefined>) => {
  const q = new URLSearchParams(Object.entries(p).filter(([, v]) => v) as [string, string][]).toString();
  return `/feed${q ? `?${q}` : ""}`;
};

export default function Home() {
  const loaded = useVideos();
  const tracks = useTracks() ?? [];
  const videos = loaded ?? [];
  const router = useRouter();
  const [q, setQ] = useState("");
  const [level, setLevel] = useStored<string>("st.level", "");
  const [seen, , ready] = useStored<string[]>("st.seen", []);
  const [saved] = useStored<string[]>("st.saved", []);
  const [hidden] = useStored<string[]>("st.hidden", []);

  const pool = useMemo(() => videos.filter((v) => !hidden.includes(v.id)), [videos, hidden]);
  const results = useMemo(() => search(pool, q).slice(0, 30), [pool, q]);
  const trending = useMemo(() => pool.slice(0, 12), [pool]); // videos.json is sorted by HN score
  const lv = level || undefined;

  return (
    <main className="home">
      <header className="top">
        <h1 className="logo">Study<span>Tube</span></h1>
        <Link className="pill" href={href({ saved: "1" })} aria-label={`Saved videos, ${saved.length}`}>★ Saved{saved.length ? ` · ${saved.length}` : ""}</Link>
      </header>

      <form role="search" onSubmit={(e) => { e.preventDefault(); if (results[0]) router.push(href({ q, v: results[0].id, level: lv })); }}>
        <label className="sr" htmlFor="q">Search videos</label>
        <input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: transformers, calculus, Feynman…" autoComplete="off" enterKeyHint="search" />
      </form>

      {q.trim() ? (
        <section aria-live="polite">
          <h2 className="h">{results.length ? `${results.length} result${results.length > 1 ? "s" : ""}` : "No matches"}</h2>
          {!results.length && <p className="mut">Try a topic like “math” or a channel name.</p>}
          <ul className="list">
            {results.map((v) => (
              <li key={v.id}>
                <Link className="row" href={href({ q, v: v.id, level: lv })}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`} alt="" loading="lazy" />
                  <span><b>{v.title}</b><small>{v.channel} · {topicLabel(v.topic)}</small></span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mut">Tap a result, then keep scrolling for more like it.</p>
        </section>
      ) : (
        <>
          <Link className="cta" href={href({ level: lv })}>
            <span>▶ {ready && seen.length ? "Keep scrolling" : "Start scrolling"}</span>
            <small>{!loaded ? "Loading the library…" : ready && seen.length ? `${seen.length} watched · best unseen first` : `90-second clips from ${videos.length.toLocaleString()} study videos`}</small>
          </Link>

          <div className="chips" role="group" aria-label="Level">
            {["", ...LEVELS].map((l) => (
              <button key={l} className={l === level ? "on" : ""} aria-pressed={l === level} onClick={() => setLevel(l)}>{l || "any level"}</button>
            ))}
          </div>

          {tracks.length > 0 && (
            <section>
              <h2 className="h">Learn · beginner to advanced</h2>
              <ul className="rail">
                {tracks.map((t) => {
                  const done = t.items.filter((id) => seen.includes(id)).length;
                  return (
                    <li key={t.id}>
                      <Link className="track" href={href({ track: t.id })}>
                        <span aria-hidden className="ti">{t.icon}</span>
                        <b>{t.title}</b>
                        <small>{t.blurb}</small>
                        <small className="prog">{ready && done ? `${done}/${t.count} watched` : `${t.count} clips`}</small>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section>
            <h2 className="h">Topics</h2>
            <div className="tiles">
              {TOPICS.map((t) => (
                <Link key={t.id} className="tile" href={href({ topic: t.id, level: lv })}>
                  <span aria-hidden>{t.icon}</span>{t.label}
                  <small>{pool.filter((v) => v.topic === t.id && (!lv || v.level === lv)).length} clips</small>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <h2 className="h">Trending on Hacker News</h2>
            <ul className="rail">
              {trending.map((v) => (
                <li key={v.id}>
                  <Link className="card" href={href({ v: v.id, level: lv })}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`} alt="" loading="lazy" />
                    <b>{v.title}</b>
                    <small>▲ {fmtCount(v.recs)} readers · {v.channel}</small>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <footer className="mut">
            Videos are the ones Hacker News keeps linking to, checked for embedding, shown as 90-second clips. No login; your progress stays in this browser.
          </footer>
        </>
      )}
    </main>
  );
}
