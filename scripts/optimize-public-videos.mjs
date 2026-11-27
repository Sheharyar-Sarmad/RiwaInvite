
import fs from "node:fs/promises";
import path from "node:path";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PUBLIC_DIR = path.resolve("public");

const APPLY = process.argv.includes("--apply");

// Video encoding settings.
const CRF = Number(process.env.VIDEO_CRF ?? 26);
const PRESET = process.env.VIDEO_PRESET ?? "medium";
const AUDIO_BITRATE = process.env.VIDEO_AUDIO_BITRATE ?? "128k";

const SUPPORTED = new Set([".mp4"]);

let scanned = 0;
let optimized = 0;
let failed = 0;

let totalBefore = 0;
let totalAfter = 0;

function formatMB(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function checkFFmpeg() {
  try {
    await execFileAsync("ffmpeg", ["-version"], {
      windowsHide: true,
    });

    await execFileAsync("ffprobe", ["-version"], {
      windowsHide: true,
    });
  } catch {
    throw new Error(
      "FFmpeg or FFprobe was not found. Restart PowerShell and run ffmpeg -version."
    );
  }
}

async function collectFiles(directory) {
  const entries = await fs.readdir(directory, {
    withFileTypes: true,
  });

  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
    } else if (
      entry.isFile() &&
      SUPPORTED.has(path.extname(entry.name).toLowerCase())
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

function encodeVideo(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      "-hide_banner",
      "-loglevel", "error",
      "-nostdin",
      "-y",

      "-i", inputPath,

      // Keep the primary video and any audio streams.
      "-map", "0:v:0",
      "-map", "0:a?",

      // Video encoding.
      "-c:v", "libx264",
      "-preset", PRESET,
      "-crf", String(CRF),
      "-pix_fmt", "yuv420p",

      // Audio encoding.
      "-c:a", "aac",
      "-b:a", AUDIO_BITRATE,

      // Preserve metadata and enable fast playback startup.
      "-map_metadata", "0",
      "-movflags", "+faststart",

      outputPath,
    ];

    const child = spawn("ffmpeg", args, {
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe"],
    });

    let errorOutput = "";

    child.stderr.setEncoding("utf8");

    child.stderr.on("data", (chunk) => {
      errorOutput = (errorOutput + chunk).slice(-8000);
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            errorOutput || `FFmpeg exited with code ${code}`
          )
        );
      }
    });
  });
}

async function verifyVideo(filePath) {
  const { stdout } = await execFileAsync(
    "ffprobe",
    [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=codec_name,width,height",
      "-of", "json",
      filePath,
    ],
    {
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    }
  );

  const result = JSON.parse(stdout);

  if (!result.streams?.length) {
    throw new Error("Output does not contain a valid video stream.");
  }
}

async function optimizeVideo(filePath, index) {
  const original = await fs.stat(filePath);

  const directory = path.dirname(filePath);
  const name = path.parse(filePath).name;

  const relativePath = path.relative(PUBLIC_DIR, filePath);

  const tempPath = path.join(
    directory,
    `${name}.optimized-${process.pid}-${index}.mp4`
  );

  try {
    await encodeVideo(filePath, tempPath);

    await verifyVideo(tempPath);

    const compressed = await fs.stat(tempPath);

    totalBefore += original.size;
    scanned++;

    console.log(`\n${relativePath}`);
    console.log(`Original:   ${formatMB(original.size)}`);
    console.log(`Compressed: ${formatMB(compressed.size)}`);

    if (compressed.size >= original.size) {
      totalAfter += original.size;

      console.log("No savings. Keeping original.");

      return;
    }

    const savings = original.size - compressed.size;

    console.log(`Saved: ${formatMB(savings)}`);

    totalAfter += compressed.size;
    optimized++;

    if (APPLY) {
      // Replace original only after successful compression
      // and output verification.
      await fs.rename(tempPath, filePath);

      console.log("Applied successfully.");
    } else {
      console.log("Preview only. Original unchanged.");
    }
  } catch (error) {
    failed++;

    console.error(
      `Failed: ${relativePath}`,
      error instanceof Error ? error.message : error
    );
  } finally {
    // Remove temporary output when it still exists.
    await fs.rm(tempPath, { force: true }).catch(() => {});
  }
}

async function main() {
  if (!Number.isFinite(CRF) || CRF < 0 || CRF > 51) {
    throw new Error("VIDEO_CRF must be between 0 and 51.");
  }

  if (!SUPPORTED.size) {
    return;
  }

  await checkFFmpeg();

  console.log("================================");
  console.log("RIWAINVITE VIDEO OPTIMIZER");
  console.log("================================");

  console.log(`Mode: ${APPLY ? "APPLY" : "PREVIEW"}`);
  console.log(`CRF: ${CRF}`);
  console.log(`Preset: ${PRESET}`);

  const files = await collectFiles(PUBLIC_DIR);

  if (files.length === 0) {
    console.log("No MP4 videos found in public/.");
    return;
  }

  console.log(`Found ${files.length} MP4 videos.`);

  for (let i = 0; i < files.length; i++) {
    await optimizeVideo(files[i], i);
  }

  const savings = totalBefore - totalAfter;

  console.log("\n================================");
  console.log("VIDEO OPTIMIZATION SUMMARY");
  console.log("================================");

  console.log(`Mode: ${APPLY ? "APPLY" : "PREVIEW"}`);
  console.log(`Videos scanned: ${scanned}`);
  console.log(`Videos reducible: ${optimized}`);
  console.log(`Failed videos: ${failed}`);

  console.log(`Before: ${formatMB(totalBefore)}`);
  console.log(`After:  ${formatMB(totalAfter)}`);
  console.log(`Saved:  ${formatMB(savings)}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Video optimization failed:", error);
  process.exitCode = 1;
});
