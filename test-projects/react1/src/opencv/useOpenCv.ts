import { useEffect, useState } from "react";
import { loadOpenCv } from "./loadOpenCv";

export type OpenCvStatus = "loading" | "ready" | "error";

export interface UseOpenCvResult {
  status: OpenCvStatus;
  error: string | null;
}

/** Loads opencv.js once and reports its readiness for React components to react to. */
export function useOpenCv(scriptUrl = "/opencv.js"): UseOpenCvResult {
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
