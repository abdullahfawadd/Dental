import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { basename, extname, join, posix } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const exec = promisify(execFile);
const project = fileURLToPath(new URL('../', import.meta.url));
const origin = 'https://aventuradentalarts.com';
const mediaHost = 'https://api.aventuradentalarts.com';
const marker = '__DENTAL_ROOT__';
const routes = JSON.parse(await readFile(join(project, 'config/routes.json'), 'utf8'));
const extraEndpoints = JSON.parse(await readFile(join(project, 'config/endpoints.json'), 'utf8'));
const endpoints = new Set(extraEndpoints);
const documents = new Map();
const chunks = new Set();
const media = new Map();
const missing = [];

async function save(path, data) {
  const target = join(project, path);
  await mkdir(join(target, '..'), { recursive: true });
  await writeFile(target, data);
}

async function download(url) {
  const cache = join(project, '.reference-cache', createHash('sha256').update(url).digest('hex'));
  try {
    return await readFile(cache);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await mkdir(join(cache, '..'), { recursive: true });
  await exec(process.platform === 'win32' ? 'curl.exe' : 'curl', [
    '--silent', '--show-error', '--fail', '--retry', '2', '--connect-timeout', '15',
    '--max-time', '150', '--output', cache + '.part', url,
  ]);
  await rename(cache + '.part', cache);
  return readFile(cache);
}

async function parallel(values, fn, concurrency = 8) {
  const pending = [...values];
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (pending.length) await fn(pending.shift());
  }));
}

function category(name, owner) {
  const lower = name.toLowerCase();
  if (/\.(woff2?|ttf|otf)$/.test(lower)) return 'fonts';
  if (/\.pdf$/.test(lower)) return 'legal';
  if (/\.json$/.test(lower)) return 'animation';
  if (/logo|favicon|brand/.test(lower)) return 'brand';
  if (/^(icon|arrow)|\.svg$/.test(lower)) return 'icons';
  if (/poster|hero|\.webm$|\.mp4$/.test(lower)) return 'hero';
  if (/ventura|bay.harbor|gables|location/.test(lower) || owner === '/contact') return 'locations';
  if (/veneer|implant|whiten|smile|oral.cancer|prophylaxis|nightguard/.test(lower) || owner.startsWith('/service/')) return 'services';
  if (/scanner|itero|solea|cad.cam|intra.oral/.test(lower) || owner.startsWith('/technology') || owner === '/laboratory') return 'technology';
  if (/nuria|grillo|gale|lugo|specialist|team|doctor/.test(lower) || owner === '/about') return 'team';
  return 'gallery';
}

const mediaLinks = /https:\/\/api\.aventuradentalarts\.com\/uploads\/[\w%./+~-]+|(?<![\w:/.])(?:\.\.)?\/(?:_nuxt|images|fonts|videos|icons|assets)\/[\w%./+~-]+\.(?:svg|png|jpe?g|webp|avif|gif|woff2?|ttf|otf|mp4|webm|ico|pdf)\b|\/lottie\/[\w.-]+\.json\b|\/tftl-logo\.json\b|(?<![\w:/])\/favicon\.ico\b/gi;

function discover(content, owner, location) {
  for (const match of content.matchAll(/\/_nuxt\/([\w./-]+\.(?:js|css|json))\b/g)) chunks.add('/_nuxt/' + match[1]);
  if (location?.startsWith('/_nuxt/')) {
    for (const match of content.matchAll(/["'](?:\.\/)?([\w.-]+\.(?:js|css))["']/g)) chunks.add('/_nuxt/' + match[1]);
  }
  for (const match of content.matchAll(mediaLinks)) {
    const source = new URL(match[0], origin).href;
    let asset = media.get(source);
    if (!asset) {
      const name = basename(new URL(source).pathname);
      const suffix = extname(name);
      const directory = category(name, owner);
      const distinct = createHash('sha256').update(source).digest('hex').slice(0, 7);
      asset = { source, local: posix.join('assets', directory, name.slice(0, -suffix.length) + '-' + distinct + suffix), references: new Set() };
      media.set(source, asset);
    }
    asset.references.add(owner);
  }
}

function rewrite(text) {
  return text.replace(mediaLinks, (original) => {
    const asset = media.get(new URL(original, origin).href);
    return asset?.bytes ? marker + asset.local : original;
  });
}

function rewritePage(html) {
  return rewrite(html.replace(/(<script[^>]+id="__NUXT_DATA__"[^>]*>)([\s\S]*?)(<\/script>)/,
    (_, start, data, end) => {
      const table = JSON.parse(data);
      for (const entry of table) {
        if (entry && Number.isInteger(entry.emailTo)) table[entry.emailTo] = '';
      }
      return start + JSON.stringify(table).replaceAll('<', '\\u003C') + end;
    }))
    .replaceAll('href="/_nuxt/', 'href="' + marker + '_nuxt/')
    .replaceAll('src="/_nuxt/', 'src="' + marker + '_nuxt/')
    .replace(/href="(\/[^"?#]*)([?#][^"]*)?"/g, (original, path, suffix = '') =>
      routes.includes(path) ? 'href="' + marker + path.slice(1) + suffix + '"' : original)
    .replace('app:{baseURL:"/"', 'app:{baseURL:"' + marker + '"')
    .replace('<head>', '<head><meta name="robots" content="noindex,nofollow"><script src="' + marker + 'runtime/adapter.js"></script><link rel="stylesheet" href="' + marker + 'runtime/accessibility.css">');
}

await parallel(routes, async (route) => {
  const html = (await download(origin + route)).toString();
  if (!html.includes('id="__NUXT_DATA__"') || !html.includes('data-ssr="true"')) throw new Error('Expected public page at ' + route);
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  if (!title || /404|Not found/i.test(title)) throw new Error('Unexpected title for ' + route + ': ' + title);
  documents.set(route, html);
});
for (const route of routes) discover(documents.get(route), route);
console.log('Captured', documents.size, 'public HTML routes');

const runtime = new Map();
while ([...chunks].some((chunk) => !runtime.has(chunk))) {
  await parallel([...chunks].filter((chunk) => !runtime.has(chunk)), async (chunk) => {
    const content = (await download(origin + chunk)).toString();
    runtime.set(chunk, content);
    discover(content, 'Runtime ' + chunk, chunk);
    for (const match of content.matchAll(/["'`](\/api\/[\w/-]+-page|\/api\/common-data)["'`]/g)) endpoints.add(match[1]);
  });
}
console.log('Captured', runtime.size, 'Nuxt browser chunks and metadata');

const responses = new Map();
await parallel([...endpoints].sort(), async (endpoint) => {
  if (!/^\/api\/[\w/-]+$/.test(endpoint)) throw new Error('Unsupported public content path: ' + endpoint);
  const contents = (await download(origin + endpoint)).toString();
  responses.set(endpoint, JSON.stringify(JSON.parse(contents), (key, value) => key === 'emailTo' ? '' : value));
  discover(contents, 'Content ' + endpoint);
});
console.log('Captured', responses.size, 'public content endpoints');

await parallel(media.values(), async (asset) => {
  try {
    const bytes = await download(asset.source);
    asset.bytes = bytes.length;
    if (/\.(webp|png|svg|jpe?g|gif|avif)$/i.test(asset.source)) {
      const dimensions = await sharp(bytes).metadata().catch(() => null);
      if (dimensions) asset.dimensions = [dimensions.width, dimensions.height];
    }
    await save('public/' + asset.local, bytes);
  } catch (error) {
    missing.push({ source: asset.source, failure: error.code ?? String(error) });
  }
});
console.log('Captured', media.size - missing.length, 'assets;', missing.length, 'unavailable');

for (const [route, html] of documents) {
  await save(posix.join('public', route, 'index.html'), rewritePage(html));
}
for (const [chunk, source] of runtime) {
  await save('public' + chunk, rewrite(source));
}
for (const [endpoint, source] of responses) {
  await save('public/content' + endpoint.slice(4) + '.json', rewrite(source));
}

const entries = [...media.values()].filter((asset) => asset.bytes).sort((a, b) => a.local.localeCompare(b.local))
  .map((asset) => ({ ...asset, references: [...asset.references].sort() }));
await save('config/snapshot-manifest.json', JSON.stringify({
  source: origin,
  routes,
  endpoints: [...responses.keys()].sort(),
  runtime: [...runtime.keys()].sort(),
  assets: entries,
  unavailable: missing,
}, null, 2) + '\n');

const lines = entries.map((entry) => '| ' + entry.local + ' | ' + entry.source + ' | ' +
  (entry.dimensions?.join(' × ') ?? '—') + ' | ' + extname(entry.local).slice(1).toUpperCase() + ' | ' +
  entry.references.join(', ') + ' | Authorized public original |');
await save('docs/asset-manifest.md', [
  '# Asset manifest', '',
  'The project uses the publicly delivered originals under the reproduction authorization supplied with the brief. The Nuxt browser runtime also contains inline SVGs and uses the same component-specific crops and breakpoints.',
  '', '| Local file | Original | Pixels | Type | Referenced by | Status |',
  '| --- | --- | --- | --- | --- | --- |', ...lines, '',
  '## Unavailable source requests', '',
  ...(missing.length ? missing.map((item) => '- ' + item.source + ' (' + item.failure + ')') : ['None during the capture.']), '',
].join('\n'));

const max = Math.max(0, ...entries.map((entry) => entry.bytes));
console.log('Largest asset:', Math.round(max / 1024 / 1024 * 10) / 10, 'MiB');
if (max >= 100 * 1024 * 1024) throw new Error('At least one asset exceeds GitHub’s per-file limit');
