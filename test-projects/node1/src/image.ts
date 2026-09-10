import { Jimp } from "jimp";
import type { Mat } from "opencv-ts";

export interface DecodedImage {
  mat: Mat;
  width: number;
  height: number;
}

/**
 * Reads a `.png`/`.jpg`/`.jpeg` file (format inferred from content, via jimp) into an RGBA
 * (`CV_8UC4`) `Mat` ready for opencv.js operations. The caller owns the returned `Mat` and
 * must `.delete()` it.
 */
export async function readImageAsMat(path: string): Promise<DecodedImage> {
  const image = await Jimp.read(path);
  const { width, height, data } = image.bitmap;
  const mat = cv.matFromArray(height, width, cv.CV_8UC4, data);
  return { mat, width, height };
}

/**
 * Writes a `Mat` back out as an image file, format inferred from `path`'s extension (`.png`
 * or `.jpg`/`.jpeg`). Accepts either a 4-channel RGBA `Mat` (e.g. `blur`'s output, which
 * stays RGBA) or a single-channel one (e.g. `grayscale`/`cannyEdges`/`sobelEdges`'s output),
 * expanding the latter back out to RGBA (with a fully opaque alpha channel) since that's the
 * only pixel layout jimp's encoders accept.
 */
export async function writeMatAsImage(mat: Mat, path: string): Promise<void> {
  const width = mat.cols;
  const height = mat.rows;
  const channels = mat.channels();
  const rgba = Buffer.alloc(width * height * 4);

  if (channels === 4) {
    Buffer.from(mat.data.buffer, mat.data.byteOffset, mat.data.byteLength).copy(rgba);
  } else if (channels === 1) {
    const gray = mat.data;
    for (let i = 0; i < width * height; i++) {
      const value = gray[i];
      const offset = i * 4;
      rgba[offset] = value;
      rgba[offset + 1] = value;
      rgba[offset + 2] = value;
      rgba[offset + 3] = 255;
    }
  } else {
    throw new Error(`Unsupported Mat channel count for image output: ${channels}`);
  }

  const image = Jimp.fromBitmap({ width, height, data: rgba });
  // jimp's `write` return type is keyed on a template-literal extension it infers from the
  // registered codecs; `path` here is a plain runtime `string` (from the CLI), not a literal
  // type, so it needs this cast to satisfy that overload.
  await image.write(path as `${string}.${string}`);
}
