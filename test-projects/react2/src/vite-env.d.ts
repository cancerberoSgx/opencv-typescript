/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Overrides opencv.js's script URL at build time - see opencv/useOpenCv.ts. */
  readonly VITE_OPENCV_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Every opencv-ts `.d.ts` file's path (relative to the package root) and content, collected
 * at build/serve time straight from the sibling `opencv-ts` package - see
 * vite.config.ts#opencvTsLibsPlugin and src/editor/setupOpenCvTypes.ts.
 */
declare module "virtual:opencv-ts-libs" {
  export const opencvTsLibs: { path: string; content: string }[];
}
