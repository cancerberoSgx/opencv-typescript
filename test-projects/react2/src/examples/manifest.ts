// The gallery shown in the UI: each entry pairs a title/description with its source's raw
// text (via Vite's `?raw` import) - the *editable* string fed to Monaco and, on Run, to
// runExample(). See src/examples/sources/*.example.ts for the actual code and porting notes.
//
// Ported so far from mirada-ts-playground's src/examples/toPack/** (see this repo's
// notes/prompts.md for the original ask): contourFunctionsShape, dilate, faceDetection,
// featuresEllipse, fft, trackbar - plus watershed (a well-known opencv.js tutorial example,
// not from toPack). Not yet ported: denseOpticalFlow, dnnHighLevelGeneration,
// faceDetectionCamera, faceRecognOtherModelsTest, lucasKanadeOpticalFlow, trackbarVideo,
// trainingTest, videoDisplay - the camera/video ones need a live getUserMedia stream (this
// gallery's CameraHelper, see src/opencv/playgroundHelpers.ts, already supports that, they
// just haven't been ported yet), and the dnn/training ones need pretrained model assets this
// app doesn't fetch/bundle yet.
import contourFunctionsShape from "./sources/contourFunctionsShape.example.ts?raw";
import dilate from "./sources/dilate.example.ts?raw";
import faceDetection from "./sources/faceDetection.example.ts?raw";
import featuresEllipse from "./sources/featuresEllipse.example.ts?raw";
import fft from "./sources/fft.example.ts?raw";
import trackbar from "./sources/trackbar.example.ts?raw";
import watershed from "./sources/watershed.example.ts?raw";

export interface ExampleDef {
  id: string;
  title: string;
  description: string;
  source: string;
}

export const examples: ExampleDef[] = [
  {
    id: "dilate",
    title: "Dilate",
    description: "A morphological dilation: expands bright regions, closing small dark gaps.",
    source: dilate,
  },
  {
    id: "faceDetection",
    title: "Face detection",
    description: "Haar cascades find a face, then eyes within it, and draw rectangles around both.",
    source: faceDetection,
  },
  {
    id: "contourFunctionsShape",
    title: "Contour matching",
    description: "Finds contours in a coin image and compares two of them with cv.matchShapes.",
    source: contourFunctionsShape,
  },
  {
    id: "featuresEllipse",
    title: "Ellipse fitting",
    description: "Fits an ellipse to the largest contour of a thresholded shape image.",
    source: featuresEllipse,
  },
  {
    id: "fft",
    title: "FFT magnitude spectrum",
    description: "Computes the 2D discrete Fourier transform and displays its magnitude spectrum.",
    source: fft,
  },
  {
    id: "watershed",
    title: "Watershed segmentation",
    description: "Marker-based watershed segmentation separates touching coins.",
    source: watershed,
  },
  {
    id: "trackbar",
    title: "Trackbar blend",
    description: "Blends two images with cv.addWeighted() - drag the slider to control the mix.",
    source: trackbar,
  },
];
