"use client";
import { useEffect, useState } from "react";
import type { Track, Video } from "./videos";

let cache: Promise<Video[]> | null = null;
/** Loads the slim catalog once per page session; later pages reuse it (and the CDN/browser caches the file). */
export function useVideos(): Video[] | null {
  const [v, setV] = useState<Video[] | null>(null);
  useEffect(() => {
    cache ??= fetch("/catalog.json").then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }).catch((e) => { cache = null; throw e; });
    let live = true;
    cache.then((d) => live && setV(d)).catch(() => live && setV([]));
    return () => { live = false; };
  }, []);
  return v;
}

let tcache: Promise<Track[]> | null = null;
/** Learn tracks (ordered id lists). null while loading. */
export function useTracks(): Track[] | null {
  const [t, setT] = useState<Track[] | null>(null);
  useEffect(() => {
    tcache ??= fetch("/tracks.json").then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }).catch((e) => { tcache = null; throw e; });
    let live = true;
    tcache.then((d) => live && setT(d)).catch(() => live && setT([]));
    return () => { live = false; };
  }, []);
  return t;
}
