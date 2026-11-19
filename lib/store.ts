"use client";
import { useCallback, useEffect, useState } from "react";

const read = <T,>(k: string, d: T): T => {
  try { const s = localStorage.getItem(k); return s ? (JSON.parse(s) as T) : d; } catch { return d; }
};
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

/** localStorage-backed state. `ready` is false until the client has read storage (avoids hydration mismatch). */
export function useStored<T>(key: string, initial: T): [T, (v: T) => void, boolean] {
  const [v, setV] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => { setV(read(key, initial)); setReady(true); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = useCallback((n: T) => { setV(n); write(key, n); }, [key]);
  return [v, set, ready];
}

const today = () => new Date().toISOString().slice(0, 10);
/** Clips watched today; resets on a new day. */
export function useDayCount(): [number, () => void] {
  const [d, setD] = useStored<{ d: string; n: number }>("st.day", { d: today(), n: 0 });
  const n = d.d === today() ? d.n : 0;
  return [n, () => setD({ d: today(), n: n + 1 })];
}
