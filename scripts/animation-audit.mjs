import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const revision = '3f7a55a2986a84ca2173e86ee9127eefe31d046d';
const root = fileURLToPath(new URL('../', import.meta.url));
const artifactRoot = join(root, 'visual-qa', 'animation');
const reference = 'https://aventuradentalarts.com';
const pauseVideos = `document.querySelectorAll('video').forEach(video => {
  video.pause();
  if (!video.poster || !video.hasAttribute('src')) return;
  video.removeAttribute('src');
  video.load();
})`;

const scenarios = {
  hero: {
    viewport: '1440x900', duration: '3500', fps: '12',
    trigger: ['--trigger', 'load'], track: 'header, .hero, .hero h1, .hero .video-el',
  },
  'mobile-hero': {
    viewport: '390x844', duration: '3000', fps: '10',
    trigger: ['--trigger', 'load'], track: 'header, .hero, .hero h1, .hero .video-el',
  },
  'hero-entrance': {
    viewport: '1440x900', duration: '9000', fps: '12',
    trigger: ['--trigger', 'load', '--clip', '720,0,720,900', '--clock', 'virtual', '--network-wait', '150'],
    track: '.hero .right-title, .hero .video-el',
  },
  goal: {
    viewport: '1440x900', duration: '2800', fps: '10',
    trigger: ['--trigger', 'scroll', '--scroll-to', '.our-goal'],
    track: '.our-goal, .our-goal h2, .our-goal img',
  },
  'goal-settled': {
    viewport: '1440x900', duration: '2800', fps: '10',
    trigger: ['--trigger', 'scroll', '--scroll-to', '.our-goal', '--wait-before', '4000'],
    track: '.hero .right-title, .hero .video-el, .our-goal, .our-goal h2',
  },
  services: {
    viewport: '1440x900', duration: '1500', fps: '12',
    trigger: ['--trigger', 'click', '--target', '.header-btn.service', '--wait-before', '3000'],
    track: '.header, .header-btn.service, .service-modal, .menu-modal',
    settledRegion: [291, 0, 940, 264],
  },
  'mobile-menu': {
    viewport: '390x844', duration: '1500', fps: '12',
    trigger: ['--trigger', 'click', '--target', '.menu-btn-mob', '--wait-before', '3000'],
    track: '.header, .menu-btn-mob, .service-modal, .menu-modal',
  },
  'mobile-menu-controlled': {
    viewport: '390x844', duration: '1500', fps: '12',
    trigger: ['--trigger', 'click', '--target', '.menu-btn-mob', '--wait-before', '6000',
      '--clock', 'virtual', '--network-wait', '150', '--pre-js', pauseVideos],
    track: '.menu-btn-mob, .menu[data-v-7362e42f] .bg, .menu[data-v-7362e42f] .anim-part',
  },
};

const [command, scenario, local = 'http://127.0.0.1:4173'] = process.argv.slice(2);
if (!['setup', 'reference', 'local', 'compare', 'settled', 'filmstrip', 'all'].includes(command)) {
  throw new Error(`Usage: node scripts/animation-audit.mjs setup | reference|local|compare|settled|filmstrip|all <${Object.keys(scenarios).join('|')}> [local-url]`);
}

const chrome = process.platform === 'win32';
const run = (file, args, cwd) => execFileSync(file, args, { cwd, stdio: 'inherit' });

function setup() {
  const checkout = mkdtempSync(join(tmpdir(), 'dental-reanimate-'));
  run('git', ['init', '-q'], checkout);
  run('git', ['fetch', '-q', '--depth', '1', 'https://github.com/NiazMorshed2007/reanimate.git', revision], checkout);
  run('git', ['checkout', '-q', '--detach', 'FETCH_HEAD'], checkout);
  const scripts = join(checkout, 'skills', 'reanimate', 'scripts');

  if (chrome) {
    run('cmd.exe', ['/d', '/c', 'npm.cmd install --no-audit --no-fund'], scripts);
    const patches = {
      'lib.ts': ['"ffmpeg-static", "ffmpeg"', '"ffmpeg-static", "ffmpeg.exe"'],
      'capture.ts': ['headless: !a.headed, args: launchArgs', 'headless: !a.headed, args: launchArgs, channel: "chrome"'],
      'sheet.ts': ['chromium.launch()', 'chromium.launch({ channel: "chrome" })'],
    };
    for (const [filename, [before, after]] of Object.entries(patches)) {
      const path = join(scripts, filename);
      const source = readFileSync(path, 'utf8');
      if (!source.includes(before)) throw new Error(`Unexpected Reanimate source in ${filename}`);
      writeFileSync(path, source.replace(before, after));
    }
  } else {
    run('bash', ['setup.sh'], scripts);
  }

  return scripts;
}

if (command === 'setup') {
  console.log(setup());
  process.exit(0);
}

const settings = scenarios[scenario];
if (!settings) throw new Error(`Unknown animation scenario: ${scenario}`);

const output = join(artifactRoot, scenario);
mkdirSync(output, { recursive: true });
const round = process.env.ANIMATION_ROUND;
if (round && !/^[1-9]\d*$/.test(round)) throw new Error('ANIMATION_ROUND must be a positive integer');
const localLabel = round ? `local-${round}` : 'local';
const comparison = join(output, round ? `comparison-${round}` : 'comparison');

function compareSettled() {
  const original = PNG.sync.read(readFileSync(join(output, 'reference', 'final.png')));
  const clone = PNG.sync.read(readFileSync(join(output, localLabel, 'final.png')));
  if (clone.width !== original.width || clone.height !== original.height) throw new Error('Settled screenshot dimensions differ');
  mkdirSync(comparison, { recursive: true });

  function compareRegion(name, x, y, width, height) {
    const originalRegion = new PNG({ width, height });
    const cloneRegion = new PNG({ width, height });
    PNG.bitblt(original, originalRegion, x, y, width, height, 0, 0);
    PNG.bitblt(clone, cloneRegion, x, y, width, height, 0, 0);
    const diff = new PNG({ width, height });
    const mismatchPixels = pixelmatch(originalRegion.data, cloneRegion.data, diff.data, width, height, { threshold: 0.1 });
    const report = { x, y, width, height, mismatchPixels, mismatchPercentage: 100 * mismatchPixels / (width * height) };
    writeFileSync(join(comparison, `${name}-diff.png`), PNG.sync.write(diff));
    writeFileSync(join(comparison, `${name}.json`), JSON.stringify(report, null, 2) + '\n');
    console.log(name, report);
  }

  compareRegion('settled', 0, 0, original.width, original.height);
  if (settings.settledRegion) compareRegion('settled-panel', ...settings.settledRegion);
}

if (command === 'settled') {
  compareSettled();
  process.exit(0);
}

const scripts = process.env.REANIMATE_SCRIPTS_DIR || setup();
const runtime = chrome ? process.execPath : 'bun';

function filmstrip(label) {
  run(runtime, [join(scripts, 'sheet.ts'), 'filmstrip', '--frames', join(output, label, 'frames'),
    '--out', join(output, label, 'sheets'), '--fps', settings.fps, '--every', '4'], scripts);
}

function capture(label, url) {
  run(runtime, [join(scripts, 'capture.ts'), '--url', url, '--out', join(output, label),
    '--viewport', settings.viewport, '--duration', settings.duration, '--fps', settings.fps,
    ...settings.trigger, '--track', settings.track], scripts);
}

if (command === 'reference' || command === 'all') capture('reference', reference);
if (command === 'local' || command === 'all') capture(localLabel, local);
if (command === 'filmstrip') filmstrip('reference');

if (command === 'compare' || command === 'all') {
  compareSettled();
  const refFrames = join(output, 'reference', 'frames');
  const localFrames = join(output, localLabel, 'frames');
  run(runtime, [join(scripts, 'compare.ts'), '--ref', refFrames, '--clone', localFrames,
    '--out', comparison, '--fps', settings.fps, '--threshold', '0.02', '--offset', '0'], scripts);
  run(runtime, [join(scripts, 'sheet.ts'), 'compare', '--ref', refFrames, '--clone', localFrames,
    '--diff', join(comparison, 'diff'), '--out', join(comparison, 'sheets'), '--every', '3'], scripts);
}
