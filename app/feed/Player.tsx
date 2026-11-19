"use client";
import { useEffect, useRef } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
let api: Promise<any> | null = null;
const loadYT = () =>
  (api ??= new Promise((res) => {
    const w = window as any;
    if (w.YT?.Player) return res(w.YT);
    w.onYouTubeIframeAPIReady = () => res(w.YT);
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  }));

export const CLIP = 90; // default seconds per clip (in video time, so 2x speed finishes in 45s)

export type Handle = {
  toggle(): void; mute(m: boolean): void; isMuted(): boolean;
  setRate(r: number): void; seek(t: number): void; time(): number;
};

type Props = {
  id: string; start: number; muted: boolean; rate: number;
  endAt: number; // video-time second where the clip ends (Infinity = keep playing)
  onReady(h: Handle): void; onEnd(): void; onError(): void;
  onProgress(t: number): void; onState(playing: boolean): void;
};

/** One YouTube player, mounted only for the active card. We watch the clock ourselves so the end can move. */
export default function Player(p: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const cb = useRef(p);
  cb.current = p;

  useEffect(() => {
    let player: any, dead = false, timer: any, ended = false;
    const host = document.createElement("div");
    wrap.current?.appendChild(host);
    loadYT().then((YT) => {
      if (dead) return;
      player = new YT.Player(host, {
        host: "https://www.youtube-nocookie.com",
        videoId: p.id,
        playerVars: { start: p.start, autoplay: 1, mute: 1, playsinline: 1, rel: 0, modestbranding: 1, controls: 0, disablekb: 1, iv_load_policy: 3, fs: 0 },
        events: {
          onReady: (e: any) => {
            if (!cb.current.muted) e.target.unMute();
            e.target.setPlaybackRate(cb.current.rate);
            e.target.playVideo();
            cb.current.onReady({
              toggle: () => (e.target.getPlayerState() === 1 ? e.target.pauseVideo() : e.target.playVideo()),
              mute: (m) => (m ? e.target.mute() : e.target.unMute()),
              isMuted: () => e.target.isMuted(),
              setRate: (r) => e.target.setPlaybackRate(r),
              seek: (t) => { ended = false; e.target.seekTo(t, true); },
              time: () => e.target.getCurrentTime(),
            });
          },
          onStateChange: (e: any) => {
            if (e.data === 1) e.target.setPlaybackRate(cb.current.rate); // some videos reset the rate when playback starts
            if (e.data === 0 && !ended) { ended = true; cb.current.onEnd(); } // the whole video ended
            cb.current.onState(e.data === 1);
          },
          onError: () => cb.current.onError(),
        },
      });
      timer = setInterval(() => {
        try {
          const t = player.getCurrentTime();
          cb.current.onProgress(t);
          if (t >= cb.current.endAt && !ended) { ended = true; cb.current.onEnd(); }
          else if (t < cb.current.endAt - 1) ended = false;
        } catch {}
      }, 250);
    });
    return () => {
      dead = true;
      clearInterval(timer);
      try { player?.destroy(); } catch {}
      if (wrap.current) wrap.current.innerHTML = "";
    };
  }, [p.id, p.start]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={wrap} className="player" />;
}
