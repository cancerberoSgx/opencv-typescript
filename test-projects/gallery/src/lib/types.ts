import type { Mat } from "opencv-ts";

export type ParamValue = number | string | boolean;
export type Params = Record<string, ParamValue>;

export interface SliderControl {
  kind: "slider";
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectControl {
  kind: "select";
  key: string;
  label: string;
  options: readonly SelectOption[];
  default: string;
}

export interface CheckboxControl {
  kind: "checkbox";
  key: string;
  label: string;
  default: boolean;
}

export type Control = SliderControl | SelectControl | CheckboxControl;

/** Normalized rectangle in source-canvas pixel coordinates. */
export interface RectShape {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Four corner points (TL, TR, BR, BL) in source-canvas pixel coordinates. */
export type Corners = [
  { x: number; y: number },
  { x: number; y: number },
  { x: number; y: number },
  { x: number; y: number },
];

/** Extra, mouse-driven inputs a handful of examples need beyond sliders/selects. */
export interface Interaction {
  rect?: RectShape;
  corners?: Corners;
}

export type TypingStatus = "full" | "partial" | "workaround";

export type Category =
  | "Core Image Ops"
  | "Filtering & Morphology"
  | "Shape & Structure";

export interface ExampleDef {
  id: string;
  title: string;
  category: Category;
  summary: string;
  /** Which mouse-driven overlay (if any) the source canvas should offer. */
  interaction?: "rect" | "corners";
  /** Id of the SOURCE_SCENES entry to switch to when the user picks this example, since
   * some scenes demo a given algorithm much better than others (e.g. checkerboard for
   * warps). The user can still override it via the source picker. */
  defaultSourceId?: string;
  tutorialUrl: string;
  typingStatus: TypingStatus;
  typingNote?: string;
  controls: readonly Control[];
  /** Runs the OpenCV pipeline. Must return a fresh Mat the caller will imshow + delete. */
  run: (src: Mat, params: Params, interaction: Interaction) => Mat;
  /** Renders the equivalent opencv-ts call(s) for the "code" panel. */
  code: (params: Params, interaction: Interaction) => string;
}

export function defaultParams(controls: readonly Control[]): Params {
  const params: Params = {};
  for (const c of controls) params[c.key] = c.default;
  return params;
}

export function num(params: Params, key: string): number {
  return params[key] as number;
}

export function str(params: Params, key: string): string {
  return params[key] as string;
}

export function bool(params: Params, key: string): boolean {
  return params[key] as boolean;
}

/** Rounds to an odd integer >= 1, since most kernel-size params require it. */
export function odd(n: number): number {
  const r = Math.round(n);
  return r % 2 === 0 ? r + 1 : r;
}

/** Default ROI for "rect" interaction examples: centered, a third of the canvas. */
export function defaultRect(width: number, height: number): RectShape {
  return { x: width * 0.25, y: height * 0.25, width: width * 0.3, height: height * 0.3 };
}

/** Default quad for "corners" interaction examples: the image's own corners, inset a
 * touch so each handle starts fully visible and draggable. */
export function defaultCorners(width: number, height: number): Corners {
  const inset = 20;
  return [
    { x: inset, y: inset },
    { x: width - inset, y: inset },
    { x: width - inset, y: height - inset },
    { x: inset, y: height - inset },
  ];
}
