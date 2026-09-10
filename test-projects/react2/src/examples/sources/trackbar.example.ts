// Ported from mirada-ts-playground's examples/toPack/trackbar.ts, adapted to opencv-ts.
// Blends two images with `cv.addWeighted()`; drag the slider to control the blend.
export {};

(async () => {
  const canvas = document.getElementById("outputCanvas") as HTMLCanvasElement;
  canvas.insertAdjacentHTML(
    "afterend",
    `<input type="range" id="trackbar" value="50" min="0" max="100" step="1">`
  );
  const orange = await fromUrl("assets/orange.png");
  const apple = await fromUrl("assets/apple.png");
  const dst = new cv.Mat();
  const trackbar = document.getElementById("trackbar") as HTMLInputElement;
  const listener = () => {
    const alpha = trackbar.valueAsNumber / parseInt(trackbar.max, 10);
    const beta = 1.0 - alpha;
    cv.addWeighted(orange, alpha, apple, beta, 0.0, dst, -1);
    cv.imshow(canvas, dst);
  };
  trackbar.addEventListener("input", listener);
  await sleep(300);
  listener();
  await sleep(12000);
  trackbar.removeEventListener("input", listener);
  trackbar.remove();
  orange.delete();
  apple.delete();
  dst.delete();
})();
