
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve("public");
const MAX_EDGE = 2400;

// Default is preview mode.
// Pass --apply to overwrite the original files.
const APPLY = process.argv.includes("--apply");

const SUPPORTED = new Set([".jpg", ".jpeg", ".png"]);

let totalBefore = 0;
let totalAfter = 0;
let optimizedCount = 0;

async function collectFiles(directory) {
  const entries = await fs.readdir(directory, {
    withFileTypes: true,
  });

  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function optimizeFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (!SUPPORTED.has(extension)) return;

  const original = await fs.stat(filePath);
  const metadata = await sharp(filePath, {
    failOn: "none",
  }).metadata();

  // Skip unsupported and animated images.
  if (!metadata.width || !metadata.height || (metadata.pages ?? 1) > 1) {
    return;
  }

  let pipeline = sharp(filePath, {
    failOn: "none",
  }).rotate();

  // Resize only oversized images.
  if (Math.max(metadata.width, metadata.height) > MAX_EDGE) {
    pipeline = pipeline.resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  let output;

  if (extension === ".jpg" || extension === ".jpeg") {
    output = await pipeline
      .jpeg({
        quality: 82,
        mozjpeg: true,
        progressive: true,
      })
      .toBuffer();
  } else {
    output = await pipeline
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
        effort: 10,
      })
      .toBuffer();
  }

  totalBefore += original.size;
  totalAfter += Math.min(original.size, output.length);

  // Never replace an image with a larger file.
  if (output.length >= original.size) return;

  const saved = original.size - output.length;
  optimizedCount++;

  console.log(
    `${path.relative(ROOT, filePath)}: ` +
    `${(original.size / 1024).toFixed(1)} KB -> ` +
    `${(output.length / 1024).toFixed(1)} KB`
  );

  if (APPLY) {
    await fs.writeFile(filePath, output);
  }

  console.log(
    `Saved ${(saved / 1024).toFixed(1)} KB`
  );
}

async function main() {
  const files = await collectFiles(ROOT);

  for (const file of files) {
    await optimizeFile(file);
  }

  console.log("\n--- Asset optimization summary ---");
  console.log(`Mode: ${APPLY ? "APPLY" : "PREVIEW"}`);
  console.log(`Images optimized: ${optimizedCount}`);
  console.log(
    `Estimated savings: ${((totalBefore - totalAfter) / 1024 / 1024).toFixed(2)} MB`
  );
}

main().catch((error) => {
  console.error("Asset optimization failed:", error);
  process.exitCode = 1;
});
