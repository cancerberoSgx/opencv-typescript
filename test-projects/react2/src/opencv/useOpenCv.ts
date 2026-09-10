import { useEffect, useState } from "react";
import { loadOpenCv } from "./loadOpenCv";

export type OpenCvStatus = "loading" | "ready" | "error";

export interface UseOpenCvResult {
  status: OpenCvStatus;
  error: string | null;
}

/**
 * Loads opencv.js once and reports its readiness for React components to react to.
 *
 * Defaults to public/opencv.js (see the repo root README's `setup:opencv`) for local dev,
 * but the Pages build overrides this via `VITE_OPENCV_URL` to point at the shared
 * pages/demos/assets/opencv.js instead - see scripts/build-demo-react1.sh.
 */
export function useOpenCv(
  scriptUrl = import.meta.env.VITE_OPENCV_URL ?? "/opencv.js",
): UseOpenCvResult {
  const [status, setStatus] = useState<OpenCvStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadOpenCv(scriptUrl)
      .then(() => {
        if (!cancelled) setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [scriptUrl]);

  return { status, error };
}
