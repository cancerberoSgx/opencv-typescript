/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Overrides opencv.js's script URL at build time - see useOpenCv.ts. */
  readonly VITE_OPENCV_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
