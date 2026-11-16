import { mkdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import pixelmatch from 'pixelmatch';
import sharp from 'sharp';
import { caseId, routes, screenshotTypes, viewports } from './visual-matrix.mjs';

const { values } = parseArgs({
  options: {
    output: { type: 'string', default: 'visual-qa' },
    threshold: { type: 'string', default: '0.1' },
  },
});

const output = resolve(values.output);
const threshold = Number(values.threshold);
if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
  throw new Error('--threshold must be between 0 and 1.');
}

async function loadPng(file) {
  const { data, info } = await sharp(resolve(output, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function topLeftPixels(image, width, height) {
  if (image.width === width && image.height === height) return image.data;
  const cropped = Buffer.alloc(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    const start = row * image.width * 4;
    image.data.copy(cropped, row * width * 4, start, start + width * 4);
  }
  return cropped;
}

async function compare(id, screenshot) {
  const stem = `${id}/${screenshot}.png`;
  const referencePath = `reference/${stem}`;
  const localPath = `local/${stem}`;
  const paths = { reference: referencePath, local: localPath };
  const availability = await Promise.all(Object.entries(paths).map(async ([key, file]) => {
    try {
      await stat(resolve(output, file));
      return null;
    } catch (error) {
      if (error.code === 'ENOENT') return key;
      throw error;
    }
  }));
  const missing = availability.filter(Boolean);
  if (missing.length) {
    return { status: 'missing', paths, missing };
  }
  const reference = await loadPng(referencePath);
  const local = await loadPng(localPath);

  const sameDimensions = reference.width === local.width && reference.height === local.height;
  const width = Math.min(reference.width, local.width);
  const height = Math.min(reference.height, local.height);
  const diff = Buffer.alloc(width * height * 4);
  const mismatchPixels = pixelmatch(topLeftPixels(reference, width, height), topLeftPixels(local, width, height),
    diff, width, height, { threshold, includeAA: false });
  const diffFolder = resolve(output, 'diff', id);
  await mkdir(diffFolder, { recursive: true });
  const diffName = sameDimensions ? `${screenshot}.png` : `${screenshot}-overlap.png`;
  await sharp(diff, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 2 }).toFile(resolve(diffFolder, diffName));

  return {
    status: sameDimensions ? 'same-dimensions' : 'overlap-only',
    referenceDimensions: { width: reference.width, height: reference.height },
    localDimensions: { width: local.width, height: local.height },
    comparedDimensions: { width, height },
    mismatchPixels,
    comparedPixels: width * height,
    mismatchPercentage: mismatchPixels / (width * height) * 100,
    paths: { ...paths, diff: `diff/${id}/${diffName}` },
  };
}

const pairs = [];
for (const route of routes) {
  for (const viewport of viewports) {
    const id = caseId(route, viewport);
    for (const screenshot of screenshotTypes) {
      pairs.push({ route, viewport, screenshot, ...await compare(id, screenshot) });
    }
  }
}

function summarize(status, screenshot) {
  const matches = pairs.filter((pair) => pair.status === status && pair.screenshot === screenshot);
  return {
    count: matches.length,
    averageMismatchPercentage: matches.length
      ? matches.reduce((sum, pair) => sum + pair.mismatchPercentage, 0) / matches.length : null,
  };
}

const summary = Object.fromEntries(screenshotTypes.map((screenshot) => [screenshot, {
  matchingDimensions: summarize('same-dimensions', screenshot),
  overlapOnly: summarize('overlap-only', screenshot),
  missing: pairs.filter((pair) => pair.status === 'missing' && pair.screenshot === screenshot).length,
}]));

const reportFolder = resolve(output, 'reports');
await mkdir(reportFolder, { recursive: true });
await writeFile(resolve(reportFolder, 'pixelmatch.json'), JSON.stringify({ threshold, includeAA: false,
  masks: [], summary, pairs }, null, 2));

const formatDims = ({ width, height }) => `${width}×${height}`;
const rows = pairs.map(({ route, viewport, screenshot, status, referenceDimensions, localDimensions,
  mismatchPercentage, missing, paths }) => {
  const dimensions = status === 'missing' ? `Missing ${missing.join(', ')}`
    : `[${formatDims(referenceDimensions)}](../${paths.reference}) / [${formatDims(localDimensions)}](../${paths.local})`;
  const result = status === 'missing' ? '-' : `${mismatchPercentage.toFixed(3)}% [${status}](../${paths.diff})`;
  return `| ${route} | ${formatDims(viewport)} | ${screenshot} | ${dimensions} | ${result} |`;
});
const table = ['# Pixelmatch comparison', '',
  `Threshold ${threshold}. Anti-alias filtering enabled. No pixel masks.`, '',
  'Full-page images with different dimensions have a comparison of the common area from the top-left. The report excludes those overlaps from equal-dimension averages.', '',
  ...Object.entries(summary).map(([screenshot, { matchingDimensions, overlapOnly, missing }]) => {
    const mean = matchingDimensions.averageMismatchPercentage?.toFixed(3) ?? 'unavailable';
    return `- ${screenshot} has ${matchingDimensions.count} same-size pairs (mean ${mean}%), ${overlapOnly.count} overlapping pairs and ${missing} missing pairs.`;
  }), '',
  '| Route | Viewport | Capture | Reference / local size | Mismatch |',
  '| --- | --- | --- | --- | --- |', ...rows, ''].join('\n');
await writeFile(resolve(reportFolder, 'pixelmatch.md'), table);
console.log(JSON.stringify(summary, null, 2));
