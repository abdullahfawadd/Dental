import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { caseId, localOrigin, pageUrl, referenceOrigin, routes, viewports } from './visual-matrix.mjs';

const { values } = parseArgs({
  options: {
    target: { type: 'string', default: 'both' },
    output: { type: 'string', default: 'visual-qa' },
    route: { type: 'string', multiple: true },
    viewport: { type: 'string', multiple: true },
    only: { type: 'string' },
    workers: { type: 'string', default: '2' },
    resume: { type: 'boolean', default: false },
  },
});

const targets = {
  reference: process.env.QA_REFERENCE_URL || referenceOrigin,
  local: process.env.QA_LOCAL_URL || localOrigin,
};

if (values.target !== 'both' && !Object.hasOwn(targets, values.target)) {
  throw new Error('--target must be reference, local, or both');
}
if (values.only && !['viewport', 'full'].includes(values.only)) {
  throw new Error('--only must be viewport or full');
}

const selectedRoutes = values.route || routes;
if (selectedRoutes.some((route) => !routes.includes(route))) {
  throw new Error('--route must be a route listed in scripts/visual-matrix.mjs');
}
const selectedViewports = values.viewport
  ? viewports.filter(({ width, height }) => values.viewport.includes(`${width}x${height}`))
  : viewports;
const workerCount = Number(values.workers);
if (!selectedViewports.length || !Number.isSafeInteger(workerCount) || workerCount < 1) {
  throw new Error('Select at least one listed viewport and one worker.');
}

const output = resolve(values.output);
const browser = await chromium.launch({ channel: process.env.QA_BROWSER_CHANNEL || undefined });
let failed = 0;

async function waitForImages(page) {
  await page.evaluate(async () => {
    const visible = [...document.images].filter((img) => {
      const bounds = img.getBoundingClientRect();
      return bounds.width > 0 && bounds.height > 0 && bounds.top < innerHeight && bounds.bottom > 0;
    });
    await Promise.race([
      Promise.allSettled(visible.map((img) => img.decode())),
      new Promise((finish) => setTimeout(finish, 4000)),
    ]);
  });
}

async function settleIntro(page) {
  await page.evaluate(() => Promise.race([
    document.fonts.ready,
    new Promise((finish) => setTimeout(finish, 5000)),
  ]));
  const introCleared = await page.waitForFunction(() => {
    const overlays = [...document.querySelectorAll('#preloader, #between-pages-overlay')];
    return overlays.every((overlay) => {
      const style = getComputedStyle(overlay);
      const rect = overlay.getBoundingClientRect();
      return style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) < 0.02
        || rect.width === 0 || rect.height === 0 || rect.bottom <= 0 || rect.top >= innerHeight;
    });
  }, undefined, { timeout: 16000 }).then(() => true, () => false);
  await waitForImages(page);
  return introCleared;
}

async function pauseVideos(page) {
  return page.evaluate(async () => Promise.all([...document.querySelectorAll('video')].map(async (video) => {
    const bounds = video.getBoundingClientRect();
    if (!bounds.width || !bounds.height || !video.currentSrc) return null;
    video.pause();
    video.preload = 'auto';
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.duration > 0.5
      && Math.abs(video.currentTime - 0.5) > 0.01) {
      video.currentTime = 0.5;
    }
    const frameReady = await new Promise((finish) => {
      const hasFrame = () => !video.seeking && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
      if (hasFrame()) return finish(true);
      const interval = setInterval(() => {
        if (hasFrame()) {
          clearTimeout(timeout);
          clearInterval(interval);
          finish(true);
        }
      }, 50);
      const timeout = setTimeout(() => {
        clearInterval(interval);
        finish(false);
      }, 6000);
    });
    return { src: video.currentSrc, time: video.currentTime, readyState: video.readyState, frameReady };
  })));
}

async function scanPage(page) {
  await page.evaluate(async () => {
    const afterLayout = () => new Promise((finish) => {
      requestAnimationFrame(() => requestAnimationFrame(finish));
    });
    const images = [...document.images].filter((img) => img.getClientRects().length);
    for (const image of images) image.loading = 'eager';
    const root = document.documentElement;
    const originalScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    const step = Math.ceil(innerHeight * 0.85);
    for (let top = 0; top < document.documentElement.scrollHeight; top += step) {
      scrollTo(0, top);
      await afterLayout();
    }
    await Promise.race([
      Promise.allSettled(images.map((img) => img.decode())),
      new Promise((finish) => setTimeout(finish, 8000)),
    ]);
    scrollTo(0, 0);
    root.style.scrollBehavior = originalScrollBehavior;
    await afterLayout();
  });
}

async function saveFullPage(context, page, destination, width, height) {
  const client = await context.newCDPSession(page);
  const tiles = [];
  const maxTileHeight = Math.min(5000, Math.floor(5_000_000 / width));
  try {
    for (let y = 0; y < height; y += maxTileHeight) {
      const { data } = await client.send('Page.captureScreenshot', {
        format: 'png', captureBeyondViewport: true, optimizeForSpeed: true,
        clip: { x: 0, y, width, height: Math.min(maxTileHeight, height - y), scale: 1 },
      });
      tiles.push({ input: Buffer.from(data, 'base64'), left: 0, top: y });
    }
    await sharp({ create: { width, height, channels: 3, background: '#fff' } })
      .composite(tiles).png({ compressionLevel: 2 }).toFile(destination);
  } finally {
    await client.detach();
  }
}

async function captureCase(context, target, origin, route, viewport) {
  const id = caseId(route, viewport);
  const folder = resolve(output, target, id);
  const metadata = resolve(folder, 'capture.json');
  const viewportPath = resolve(folder, 'viewport.png');
  const fullPath = resolve(folder, 'full.png');
  const previousCapture = await readFile(metadata, 'utf8').then(JSON.parse, () => ({}));
  const hasViewport = values.resume && previousCapture.viewportVideos
    && await stat(viewportPath).catch(() => null);
  const hasFull = values.resume && previousCapture.fullPageVideos
    && await stat(fullPath).catch(() => null);
  const captureViewport = values.only !== 'full' && !hasViewport;
  const captureFull = values.only !== 'viewport' && !hasFull;
  if (!captureViewport && !captureFull) return;
  await mkdir(folder, { recursive: true });
  const page = await context.newPage();
  const errors = [];
  const failedRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (event) => {
    if (event.type() === 'error') errors.push(event.text());
  });
  page.on('requestfailed', (request) => {
    failedRequests.push({ url: request.url(), error: request.failure()?.errorText });
  });
  try {
    await page.setViewportSize(viewport);
    const response = await page.goto(pageUrl(origin, route), { waitUntil: 'domcontentloaded', timeout: 40000 });
    if (!response?.ok()) throw new Error(`HTTP ${response?.status() ?? 'unavailable'}`);
    const introCleared = await settleIntro(page);
    let viewportVideos = previousCapture.viewportVideos;
    if (captureViewport) {
      viewportVideos = (await pauseVideos(page)).filter(Boolean);
      await page.screenshot({ path: viewportPath, animations: 'disabled', timeout: 20000 });
    }
    let fullPageVideos = previousCapture.fullPageVideos;
    if (captureFull) {
      await scanPage(page);
      fullPageVideos = (await pauseVideos(page)).filter(Boolean);
    }
    const audit = await page.evaluate(() => ({
      title: document.title,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      fonts: [...document.fonts].filter((font) => font.status === 'loaded').map((font) => font.family),
      brokenImages: [...document.images].filter((image) => image.getClientRects().length && image.currentSrc
        && image.naturalWidth === 0).map((image) => ({ src: image.currentSrc, alt: image.alt })),
      links: [...new Set([...document.links].map(({ href }) => href))],
      headings: [...document.querySelectorAll('h1, h2, h3')].map(({ textContent }) => textContent.trim()),
    }));
    if (captureFull) await saveFullPage(context, page, fullPath, audit.documentWidth, audit.documentHeight);
    await writeFile(metadata, JSON.stringify({ target, route, viewport, url: page.url(), status: response.status(),
      ...audit, introCleared, viewportVideos, fullPageVideos,
      errors: [...new Set(errors)], failedRequests }, null, 2));
    console.log(`${target} ${id} (${audit.documentWidth} × ${audit.documentHeight})${introCleared ? '' : ' intro timeout'}`);
  } catch (error) {
    failed += 1;
    console.error(`${target} ${id}: ${error.message}`);
  } finally {
    await page.close();
  }
}

try {
  const cases = selectedViewports.flatMap((viewport) => selectedRoutes.map((route) => ({ route, viewport })));
  const selectedTargets = Object.entries(targets)
    .filter(([target]) => values.target === 'both' || values.target === target);
  const queue = cases.flatMap((item) => selectedTargets.map(([target, origin]) => ({ ...item, target, origin })));
  const context = await browser.newContext({
    deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'America/New_York',
    colorScheme: 'light', reducedMotion: 'reduce',
  });
  await Promise.all(Array.from({ length: workerCount }, async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      await captureCase(context, item.target, item.origin, item.route, item.viewport);
    }
  }));
} finally {
  await browser.close();
}

if (failed) process.exitCode = 1;
