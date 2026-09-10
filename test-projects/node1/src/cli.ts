#!/usr/bin/env node
import { Command } from "commander";
import type { Mat } from "opencv-ts";
import { readImageAsMat, writeMatAsImage } from "./image.js";
import { loadOpenCv } from "./opencv/loadOpenCv.js";
import { blur, cannyEdges, sobelEdges, toGrayscale } from "./opencv/operations.js";

const TRANSFORMATIONS = ["sobelEdges", "grayscale", "blur", "cannyEdges"] as const;
type Transformation = (typeof TRANSFORMATIONS)[number];

function isTransformation(value: string): value is Transformation {
  return (TRANSFORMATIONS as readonly string[]).includes(value);
}

/** Runs the named transformation, returning a fresh `Mat` the caller must `.delete()`. */
function applyTransformation(name: Transformation, src: Mat): Mat {
  switch (name) {
    case "grayscale":
      return toGrayscale(src);
    case "blur":
      return blur(src);
    case "cannyEdges":
      return cannyEdges(src);
    case "sobelEdges":
      return sobelEdges(src);
  }
}

interface CliOptions {
  inputImage: string;
  outputImage: string;
  transformation: string;
}

function parseArgs(argv: readonly string[]): CliOptions {
  const program = new Command();
  program
    .name("node1")
    .description(
      "Apply an OpenCV transformation to an image using opencv.js under Node.js, typed via opencv-ts."
    )
    .requiredOption("--inputImage <path>", "path to the input .png/.jpg/.jpeg image")
    .requiredOption("--outputImage <path>", "path to write the transformed .png/.jpg/.jpeg image to")
    .requiredOption(
      "--transformation <name>",
      `transformation to apply: ${TRANSFORMATIONS.join(", ")}`
    )
    .parse(argv);

  return program.opts<CliOptions>();
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);

  if (!isTransformation(opts.transformation)) {
    throw new Error(
      `Invalid --transformation "${opts.transformation}". Must be one of: ${TRANSFORMATIONS.join(", ")}`
    );
  }

  await loadOpenCv();

  const { mat: src } = await readImageAsMat(opts.inputImage);
  let dst: Mat | null = null;
  try {
    dst = applyTransformation(opts.transformation, src);
    await writeMatAsImage(dst, opts.outputImage);
    console.log(`Wrote "${opts.transformation}" result to ${opts.outputImage}`);
  } finally {
    src.delete();
    dst?.delete();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
