import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

/**
 * Compare all screenshots within a prompt's iterations pairwise.
 *
 * Returns a visual diff analysis object:
 * {
 *   pairwiseDiffs: [{ iterA, iterB, diffPercent, diffPixels, totalPixels, diffImagePath }],
 *   averageDiffPercent: number,
 *   minDiffPercent: number,
 *   maxDiffPercent: number,
 *   iterationsCompared: number,
 *   description: string,
 * }
 *
 * @param {Array<{iteration: number, screenshotPath: string|null}>} iterations
 * @param {string} promptOutputDir - e.g. output/2026-03-27-12.29/control
 * @returns {Promise<object>}
 */
export async function computeVisualDiff(iterations, promptOutputDir) {
  // Collect iterations that have valid screenshot paths
  const withScreenshots = iterations
    .filter((iter) => iter.screenshotPath && existsSync(iter.screenshotPath))
    .map((iter) => ({
      iteration: iter.iteration,
      path: iter.screenshotPath,
    }));

  if (withScreenshots.length < 2) {
    return {
      pairwiseDiffs: [],
      averageDiffPercent: null,
      minDiffPercent: null,
      maxDiffPercent: null,
      iterationsCompared: withScreenshots.length,
      description:
        "Need at least 2 iterations with screenshots to compute visual diff",
    };
  }

  // Load all PNGs
  const loaded = [];
  for (const entry of withScreenshots) {
    try {
      const img = await loadPng(entry.path);
      loaded.push({ ...entry, img });
    } catch (err) {
      console.warn(
        `[visual-diff] Failed to load ${entry.path}: ${err.message}`,
      );
    }
  }

  if (loaded.length < 2) {
    return {
      pairwiseDiffs: [],
      averageDiffPercent: null,
      minDiffPercent: null,
      maxDiffPercent: null,
      iterationsCompared: loaded.length,
      description:
        "Need at least 2 loadable screenshots to compute visual diff",
    };
  }

  // Pairwise comparison
  const pairwiseDiffs = [];

  for (let i = 0; i < loaded.length; i++) {
    for (let j = i + 1; j < loaded.length; j++) {
      const a = loaded[i];
      const b = loaded[j];

      const result = compareImages(a.img, b.img);

      // Save the diff image
      let diffImagePath = null;
      if (result.diffPng && promptOutputDir) {
        const diffFileName = `diff_iter${a.iteration}_vs_iter${b.iteration}.png`;
        diffImagePath = resolve(promptOutputDir, diffFileName);
        try {
          const buffer = PNG.sync.write(result.diffPng);
          await writeFile(diffImagePath, buffer);
        } catch (err) {
          console.warn(
            `[visual-diff] Failed to save diff image: ${err.message}`,
          );
          diffImagePath = null;
        }
      }

      pairwiseDiffs.push({
        iterA: a.iteration,
        iterB: b.iteration,
        diffPercent: round(result.diffPercent, 2),
        diffPixels: result.diffPixels,
        totalPixels: result.totalPixels,
        diffImagePath,
      });
    }
  }

  const percents = pairwiseDiffs.map((d) => d.diffPercent);
  const avg = percents.reduce((a, b) => a + b, 0) / percents.length;

  return {
    pairwiseDiffs,
    averageDiffPercent: round(avg, 2),
    minDiffPercent: round(Math.min(...percents), 2),
    maxDiffPercent: round(Math.max(...percents), 2),
    iterationsCompared: loaded.length,
    description:
      "Pixel-level visual diff between screenshots. 0% = identical, 100% = completely different. Diff images highlight changed pixels in red.",
  };
}

/**
 * Load a PNG file and return a parsed PNG object.
 *
 * @param {string} filePath
 * @returns {Promise<PNG>}
 */
async function loadPng(filePath) {
  const buffer = await readFile(filePath);
  return PNG.sync.read(buffer);
}

/**
 * Compare two PNG images using pixelmatch.
 * Images are normalized to the same dimensions (the larger canvas) before comparison.
 *
 * @param {PNG} imgA
 * @param {PNG} imgB
 * @returns {{ diffPercent: number, diffPixels: number, totalPixels: number, diffPng: PNG }}
 */
function compareImages(imgA, imgB) {
  // Normalize to the same dimensions — use the max of each dimension
  const width = Math.max(imgA.width, imgB.width);
  const height = Math.max(imgA.height, imgB.height);
  const totalPixels = width * height;

  // Pad images to the common canvas size (extra pixels filled with transparent/white)
  const dataA = padImage(imgA, width, height);
  const dataB = padImage(imgB, width, height);

  // Create output diff image
  const diffPng = new PNG({ width, height });

  const diffPixels = pixelmatch(dataA, dataB, diffPng.data, width, height, {
    threshold: 0.1, // perceptual color distance threshold
    includeAA: false, // ignore anti-aliasing differences
    alpha: 0.3, // opacity of original image in diff output
  });

  const diffPercent = (diffPixels / totalPixels) * 100;

  return {
    diffPercent,
    diffPixels,
    totalPixels,
    diffPng,
  };
}

/**
 * Pad a PNG image to the target dimensions.
 * Returns a raw RGBA Uint8Array at the target size.
 * Extra space is filled with white (#FFFFFF, full opacity).
 *
 * @param {PNG} img
 * @param {number} targetWidth
 * @param {number} targetHeight
 * @returns {Uint8Array}
 */
function padImage(img, targetWidth, targetHeight) {
  const data = new Uint8Array(targetWidth * targetHeight * 4);

  // Fill with white (RGBA: 255, 255, 255, 255)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = 255;
  }

  // Copy the original image data into the padded canvas
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const srcIdx = (y * img.width + x) * 4;
      const dstIdx = (y * targetWidth + x) * 4;
      data[dstIdx] = img.data[srcIdx];
      data[dstIdx + 1] = img.data[srcIdx + 1];
      data[dstIdx + 2] = img.data[srcIdx + 2];
      data[dstIdx + 3] = img.data[srcIdx + 3];
    }
  }

  return data;
}

function round(n, decimals = 3) {
  if (n === null || n === undefined || isNaN(n)) return n;
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}
