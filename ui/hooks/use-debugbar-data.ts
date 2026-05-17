import { useState, useEffect } from 'preact/compat';
import type { DebugbarData } from '../types';

export function useDebugbarData(requestId: string | null, baseUrl = '') {
  const [data, setData] = useState<DebugbarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId) {
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    // The fetch interceptor already excludes /__debugbar/* URLs so this won't
    // be captured as a "user request" in the panel.
    fetch(`${baseUrl}/__debugbar/requests/${requestId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json() as Promise<DebugbarData>;
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [requestId, baseUrl]);

  return { data, loading, error };
}
