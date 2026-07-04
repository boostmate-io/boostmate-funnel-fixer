import { useRef } from "react";

/**
 * Keep a ref pointing at the most recent value on every render.
 * Handy when a callback captured earlier (e.g. inside a coach spec set
 * at click-time) needs to read the LATEST props/state at call-time
 * instead of the stale closure snapshot.
 */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
