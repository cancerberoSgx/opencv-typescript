import { useCallback, useRef } from "react";
import type { Corners, Interaction, RectShape } from "../lib/types";
import { defaultCorners, defaultRect } from "../lib/types";

interface InteractionOverlayProps {
  mode: "rect" | "corners";
  canvasWidth: number;
  canvasHeight: number;
  interaction: Interaction;
  onChange: (interaction: Interaction) => void;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** A transparent, absolutely-positioned layer sitting on top of the source canvas that
 * lets a handful of examples (template matching's ROI, perspective warp's corners) take a
 * mouse-driven input instead of just sliders. Handles are positioned in percentages of the
 * container, so they track the canvas's on-screen size with no resize listener needed. */
export function InteractionOverlay({
  mode,
  canvasWidth,
  canvasHeight,
  interaction,
  onChange,
}: InteractionOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const toCanvasPoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: clamp(((clientX - rect.left) / rect.width) * canvasWidth, 0, canvasWidth),
        y: clamp(((clientY - rect.top) / rect.height) * canvasHeight, 0, canvasHeight),
      };
    },
    [canvasWidth, canvasHeight],
  );

  const dragHandle = (
    getStart: () => { x: number; y: number },
    apply: (point: { x: number; y: number }) => void,
  ) => {
    return (downEvent: React.PointerEvent) => {
      downEvent.preventDefault();
      downEvent.stopPropagation();
      getStart();
      const move = (e: PointerEvent) => apply(toCanvasPoint(e.clientX, e.clientY));
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
  };

  const pct = (v: number, total: number) => `${(v / total) * 100}%`;

  if (mode === "rect") {
    const rect: RectShape = interaction.rect ?? defaultRect(canvasWidth, canvasHeight);

    const setRect = (next: RectShape) => onChange({ ...interaction, rect: next });

    return (
      <div ref={containerRef} className="interaction-overlay">
        <div
          className="overlay-rect"
          style={{
            left: pct(rect.x, canvasWidth),
            top: pct(rect.y, canvasHeight),
            width: pct(rect.width, canvasWidth),
            height: pct(rect.height, canvasHeight),
          }}
        />
        <div
          className="overlay-handle"
          style={{ left: pct(rect.x, canvasWidth), top: pct(rect.y, canvasHeight) }}
          onPointerDown={dragHandle(
            () => rect,
            (p) =>
              setRect({
                x: Math.min(p.x, rect.x + rect.width - 10),
                y: Math.min(p.y, rect.y + rect.height - 10),
                width: rect.x + rect.width - Math.min(p.x, rect.x + rect.width - 10),
                height: rect.y + rect.height - Math.min(p.y, rect.y + rect.height - 10),
              }),
          )}
        />
        <div
          className="overlay-handle"
          style={{
            left: pct(rect.x + rect.width, canvasWidth),
            top: pct(rect.y + rect.height, canvasHeight),
          }}
          onPointerDown={dragHandle(
            () => rect,
            (p) =>
              setRect({
                x: rect.x,
                y: rect.y,
                width: Math.max(10, p.x - rect.x),
                height: Math.max(10, p.y - rect.y),
              }),
          )}
        />
      </div>
    );
  }

  const corners: Corners = interaction.corners ?? defaultCorners(canvasWidth, canvasHeight);

  const setCorner = (index: number, point: { x: number; y: number }) => {
    const next = [...corners] as Corners;
    next[index] = point;
    onChange({ ...interaction, corners: next });
  };

  return (
    <div ref={containerRef} className="interaction-overlay">
      <svg className="overlay-quad" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}>
        <polygon
          points={corners.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="rgba(74,222,128,0.15)"
          stroke="#4ade80"
          strokeWidth={2}
        />
      </svg>
      {corners.map((p, i) => (
        <div
          key={i}
          className="overlay-handle"
          style={{ left: pct(p.x, canvasWidth), top: pct(p.y, canvasHeight) }}
          onPointerDown={dragHandle(
            () => p,
            (next) => setCorner(i, next),
          )}
        />
      ))}
    </div>
  );
}
