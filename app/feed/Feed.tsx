"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RATES, buildList, fmtCount, fmtTime, parseTimecode, stageAt, topicLabel, type Video } from "@/lib/videos";
import { useTracks, useVideos } from "@/lib/useVideos";
import { useDayCount, useStored } from "@/lib/store";
import { useMedia } from "@/lib/useMedia";
import Player, { CLIP, type Handle } from "./Player";

const DEFAULT_START = 45; // no HN timestamp: skip the usual intro
const toggle = (a: string[], id: string) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]);

export default function Feed() {
  const loaded = useVideos();
  const allTracks = useTracks();
  const videos = useMemo(() => loaded ?? [], [loaded]);
  const sp = useSearchParams();
  const topic = sp.get("topic") ?? undefined, level = sp.get("level") ?? undefined;
  const trackId = sp.get("track") ?? undefined, q = sp.get("q") ?? undefined, startId = sp.get("v") ?? undefined, savedOnly = sp.get("saved") === "1";

  const [seen, setSeen, seenReady] = useStored<string[]>("st.seen", []);
  const [saved, setSaved, savedReady] = useStored<string[]>("st.saved", []);
  const [hidden, setHidden, hiddenReady] = useStored<string[]>("st.hidden", []);
  const [unmuted, setUnmuted] = useStored<boolean>("st.unmuted", false);
  const [rate, setRateStored] = useStored<number>("st.rate", 1);
  const [today, bumpToday] = useDayCount();
  const ready = seenReady && savedReady && hiddenReady && loaded !== null && allTracks !== null;

  // Freeze order once storage is read so "seen"/"hidden" changes don't reshuffle the feed mid-scroll.
  const [frozen, setFrozen] = useState<{ seen: string[]; saved: string[]; hidden: string[]; seed: number } | null>(null);
  useEffect(() => { if (ready && !frozen) setFrozen({ seen, saved, hidden, seed: (Date.now() / 60000) | 0 }); }, [ready, frozen, seen, saved, hidden]);
  const track = useMemo(() => allTracks?.find((t) => t.id === trackId), [allTracks, trackId]);
  const list = useMemo(
    () => (frozen ? buildList(videos, { track: track?.items, topic, level, q, start: startId, seen: frozen.seen, hidden: frozen.hidden, saved: savedOnly ? frozen.saved : undefined, liked: frozen.saved, seed: frozen.seed }) : []),
    [videos, frozen, track, topic, level, q, startId, savedOnly],
  );

  const [limit, setLimit] = useState(40);
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [t, setT] = useState(0);
  const [win, setWin] = useState<{ start: number; end: number }>({ start: 0, end: CLIP });
  const [editing, setEditing] = useState<string | null>(null);
  const [playing, setPlaying] = useState(true);
  const [failed, setFailed] = useState<string | null>(null);
  const handle = useRef<Handle | null>(null);

  // Expanded = full-screen player. Manual (Expand button) or automatic when a touch phone is held sideways.
  const [manual, setManual] = useState(false);
  const [rotFallback, setRotFallback] = useState(false); // browser can't lock orientation (iPhone Safari): rotate the video with CSS instead
  const [chrome, setChrome] = useState(true); // overlay controls visible
  const [tick, setTick] = useState(0);
  const landscapePhone = useMedia("(orientation: landscape) and (max-height: 600px) and (pointer: coarse)");
  const portrait = useMedia("(orientation: portrait)");
  const expanded = manual || landscapePhone;
  const rot = manual && rotFallback && portrait;
  const frameEl = useRef<HTMLDivElement | null>(null);
  const enteredFs = useRef(false);
  const poke = () => { setChrome(true); setTick((x) => x + 1); };

  const visible = useMemo(() => list.slice(0, limit), [list, limit]);
  useEffect(() => { if (active >= limit - 8) setLimit((l) => l + 40); }, [active, limit]);
  useEffect(() => { setLimit(40); }, [list]);
  // Learn tracks open at the first step you haven't watched yet.
  useEffect(() => {
    if (!track || !frozen || !list.length) return;
    const i = Math.max(0, list.findIndex((v) => !frozen.seen.includes(v.id)));
    setLimit(Math.max(40, i + 10));
    requestAnimationFrame(() => requestAnimationFrame(() => { const el = root.current; if (el) el.scrollTo({ top: i * el.clientHeight }); }));
  }, [track, frozen, list]);

  const go = useCallback((d: number) => {
    const el = root.current; if (!el) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: Math.max(0, Math.round(el.scrollTop / el.clientHeight) + d) * el.clientHeight, behavior: reduce ? "auto" : "smooth" });
  }, []);

  useEffect(() => {
    const el = root.current; if (!el) return;
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActive(Number((e.target as HTMLElement).dataset.i))),
      { root: el, threshold: 0.6 },
    );
    el.querySelectorAll("[data-i]").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [visible]);

  const cur = visible[active];
  useEffect(() => {
    const st = cur ? (cur.start ?? DEFAULT_START) : 0;
    setT(st); setWin({ start: st, end: st + CLIP }); setPlaying(true); setFailed(null); setEditing(null); handle.current = null;
  }, [cur?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Count a clip as watched after 8s on screen.
  useEffect(() => {
    if (!cur) return;
    const t = setTimeout(() => {
      if (!seen.includes(cur.id)) { setSeen([...seen, cur.id]); bumpToday(); }
    }, 8000);
    return () => clearTimeout(t);
  }, [cur]); // eslint-disable-line react-hooks/exhaustive-deps

  // Broken embed: show the fallback briefly, then move on.
  useEffect(() => {
    if (!failed) return;
    const t = setTimeout(() => go(1), 2500);
    return () => clearTimeout(t);
  }, [failed, go]);

  const onEnd = () => (active < visible.length - 1 ? go(1) : handle.current?.toggle());
  const setRate = (r: number) => { setRateStored(r); handle.current?.setRate(r); };
  const stepRate = (d: number) => { const i = RATES.indexOf(rate); setRate(RATES[Math.min(RATES.length - 1, Math.max(0, (i < 0 ? 1 : i) + d))]); };
  // Jump anywhere in the video; seeking outside the clip window moves the window there.
  const seek = (to: number) => {
    const max = cur ? cur.dur : to;
    const x = Math.max(0, Math.min(to, max - 1));
    handle.current?.seek(x); setT(x);
    if (x < win.start || x > win.end) setWin({ start: x, end: x + CLIP });
  };
  const setMute = (m: boolean) => { handle.current?.mute(m); setUnmuted(!m); };
  const hide = (id: string) => { setHidden([...hidden, id]); go(1); };

  const expand = async () => {
    setManual(true); poke();
    let locked = false;
    try { await frameEl.current?.requestFullscreen?.(); enteredFs.current = !!document.fullscreenElement; } catch {}
    try { await (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.("landscape"); locked = true; } catch {}
    setRotFallback(!locked);
  };
  const collapse = useCallback(() => {
    setManual(false);
    try { if (document.fullscreenElement) void document.exitFullscreen(); } catch {}
    try { screen.orientation.unlock(); } catch {}
    enteredFs.current = false;
  }, []);
  // System "back"/swipe out of browser fullscreen also leaves expanded mode.
  useEffect(() => {
    const f = () => { if (!document.fullscreenElement && enteredFs.current) collapse(); };
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, [collapse]);
  // Overlay controls fade out 3.5s after the last touch while playing.
  useEffect(() => {
    if (!expanded || !chrome || !playing) return;
    const id = setTimeout(() => setChrome(false), 3500);
    return () => clearTimeout(id);
  }, [expanded, chrome, playing, tick]);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "arrowdown" || k === "j") { e.preventDefault(); go(1); }
      else if (k === "arrowup" || k === "k") { e.preventDefault(); go(-1); }
      else if (k === " " && !(e.target as HTMLElement).closest("button,a")) { e.preventDefault(); handle.current?.toggle(); }
      else if (k === "arrowright") { e.preventDefault(); seek(t + 5); }
      else if (k === "arrowleft") { e.preventDefault(); seek(t - 5); }
      else if (k === ">" || k === ".") stepRate(1);
      else if (k === "<" || k === ",") stepRate(-1);
      else if (k === "f") { if (manual) collapse(); else void expand(); }
      else if (k === "escape" && manual) collapse();
      else if (k === "m") setMute(!!handle.current && !handle.current.isMuted());
      else if (k === "s" && cur) setSaved(toggle(saved, cur.id));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const renderControls = (v: Video) => (
    <div className="controls">
      {editing === null ? (
        <button className="time" onClick={() => setEditing(fmtTime(t))} aria-label={`Jump to a time. Now ${fmtTime(t)} of ${fmtTime(v.dur)}`}>
          ⏱ {fmtTime(t)} <small>/ {fmtTime(v.dur)}</small>
        </button>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); const x = parseTimecode(editing); if (x !== null) seek(x); setEditing(null); }}>
          <label className="sr" htmlFor="tc">Jump to time (m:ss, h:mm:ss or seconds)</label>
          <input id="tc" className="tc" autoFocus value={editing} onChange={(e) => setEditing(e.target.value)} onBlur={() => setEditing(null)} inputMode="text" placeholder="12:34" />
        </form>
      )}
      <div className="speed" role="group" aria-label="Playback speed">
        {RATES.map((r) => (
          <button key={r} aria-pressed={r === rate} onClick={() => { setRate(r); poke(); }}>{r}×</button>
        ))}
      </div>
      {Number.isFinite(win.end) && <button className="more" onClick={() => { setWin({ ...win, end: Infinity }); poke(); }}>Keep watching</button>}
      {!expanded && <button className="more" onClick={() => void expand()} aria-label="Expand to full screen, landscape">⛶ Expand</button>}
    </div>
  );

  const label = track ? `Learn · ${track.title}` : savedOnly ? "Saved" : q ? `“${q}”` : topic ? topicLabel(topic) : "For you";

  return (
    <main className={`feedpage${expanded ? " xpd" : ""}`}>
      <header className="bar">
        <Link className="back" href="/" aria-label="Home and search">← <span>Home</span></Link>
        <h1>{label}{level ? ` · ${level}` : ""}</h1>
        <span className="count" title="Clips watched today">🔥 {today}</span>
      </header>

      <div className="feed" ref={root} tabIndex={-1}>
        {ready && list.length === 0 && (
          <div className="empty">
            <p>{savedOnly ? "No saved videos yet. Tap ☆ on a clip to keep it." : "Nothing here with these filters."}</p>
            <Link className="pill" href="/">Back to home</Link>
          </div>
        )}
        {visible.map((v, i) => {
          const start = v.start ?? DEFAULT_START;
          const on = i === active;
          const isSaved = saved.includes(v.id);
          return (
            <section key={v.id} data-i={i} aria-label={v.title}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {Math.abs(i - active) <= 1 && <img className="bg" src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" />}
              <div className="stage">
                <div className={`frame${on && expanded ? " xp" : ""}${on && rot ? " rot" : ""}`} ref={on ? frameEl : undefined}>
                  {on && <Player id={v.id} start={start} muted={!unmuted} rate={rate} endAt={win.end} onReady={(h) => (handle.current = h)} onEnd={onEnd} onError={() => setFailed(v.id)} onProgress={setT} onState={setPlaying} />}
                  {on && (
                    <button
                      className="tap" aria-label={expanded ? "Show or hide controls" : playing ? "Pause" : "Play"}
                      onClick={() => (expanded ? (chrome ? setChrome(false) : poke()) : handle.current?.toggle())}
                      onTouchStart={(e) => { swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
                      onTouchEnd={(e) => {
                        const s0 = swipe.current; swipe.current = null;
                        if (!s0 || !expanded || rot) return;
                        const dx = e.changedTouches[0].clientX - s0.x, dy = e.changedTouches[0].clientY - s0.y;
                        if (Math.abs(dy) > 70 && Math.abs(dy) > Math.abs(dx)) go(dy < 0 ? 1 : -1); // swipe up = next clip
                      }}
                    >
                      {!playing && !expanded && <span aria-hidden>▶</span>}
                    </button>
                  )}
                  {on && failed === v.id && (
                    <div className="fail">
                      <p>This one can’t play here.</p>
                      <a href={`https://www.youtube.com/watch?v=${v.id}&t=${start}s`} target="_blank" rel="noreferrer">Open on YouTube ↗</a>
                    </div>
                  )}
                  {on && !unmuted && !failed && <button className="sound" onClick={() => setMute(false)}>🔇 Tap for sound</button>}
                  {on && Number.isFinite(win.end) && (
                    <div
                      className="progress" role="slider" tabIndex={0} aria-label="Seek within clip"
                      aria-valuemin={Math.round(win.start)} aria-valuemax={Math.round(win.end)} aria-valuenow={Math.round(Math.min(Math.max(t, win.start), win.end))}
                      onClick={(e) => {
                        const r = e.currentTarget.getBoundingClientRect();
                        const f = rot ? (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width; // rotated 90deg: the bar runs top to bottom on screen
                        seek(win.start + Math.min(1, Math.max(0, f)) * (win.end - win.start)); poke();
                      }}
                    >
                      <i style={{ width: `${Math.min(1, Math.max(0, (t - win.start) / (win.end - win.start))) * 100}%` }} />
                    </div>
                  )}
                  {on && expanded && (
                    <div className={`xbar${chrome ? " show" : ""}`} onClick={poke}>
                      <div className="xtop">
                        <button onClick={collapse} aria-label="Exit full screen">✕</button>
                        <span>{v.title}</span>
                      </div>
                      <div className="xmid">
                        <button onClick={() => go(-1)} aria-label="Previous clip">⏮</button>
                        <button className="big" onClick={() => handle.current?.toggle()} aria-label={playing ? "Pause" : "Play"}>{playing ? "⏸" : "▶"}</button>
                        <button onClick={() => go(1)} aria-label="Next clip">⏭</button>
                      </div>
                      {renderControls(v)}
                    </div>
                  )}
                </div>
                {on && !expanded && renderControls(v)}
                <div className="meta">
                  {track && <span className="step">Step {i + 1} of {list.length} · {stageAt(track, i)}</span>}
                  <h2>{v.title}</h2>
                  <p>{v.channel} · {topicLabel(v.topic)} · {v.level}</p>
                  <p className="hn">▲ Recommended by {fmtCount(v.recs)} Hacker News readers</p>
                  <div className="actions">
                    <button aria-pressed={isSaved} onClick={() => setSaved(toggle(saved, v.id))}>{isSaved ? "★ Saved" : "☆ Save"}</button>
                    <a href={`https://www.youtube.com/watch?v=${v.id}&t=${start}s`} target="_blank" rel="noreferrer">Full video ↗</a>
                    <a href={`https://hn.algolia.com/?q=${v.id}`} target="_blank" rel="noreferrer">HN threads ↗</a>
                    <button onClick={() => hide(v.id)} aria-label={`Hide ${v.title}`}>Not for me</button>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
      <p className="keys" aria-hidden>↑↓ J/K next · ←→ seek 5s · &lt; &gt; speed · Space pause · M sound · S save</p>
    </main>
  );
}
