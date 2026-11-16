import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../', import.meta.url));
const destination = join(project, 'dist');
const publicDir = join(project, 'public');
const marker = '__DENTAL_ROOT__';
export const base = process.env.DENTAL_BASE || '/';

if (!/^\/(?:[\w.-]+\/)*$/.test(base) || base.split('/').some((segment) => segment === '.' || segment === '..')) {
  throw new Error('DENTAL_BASE must be / or a slash-delimited path such as /Dental/');
}

export async function build() {
  const manifest = JSON.parse(await readFile(join(project, 'config/snapshot-manifest.json'), 'utf8'));
  const endpoint = process.env.DENTAL_BOOKING_ENDPOINT;
  if (endpoint && !/^https:\/\//.test(endpoint)) throw new Error('Booking endpoint must use HTTPS');
  const bookingUrl = endpoint ? new URL(endpoint) : null;
  if (bookingUrl?.username || bookingUrl?.password) throw new Error('The public booking URL cannot contain login credentials');
  const safeEndpoint = bookingUrl ? bookingUrl.href.replaceAll('&', '&amp;').replaceAll('"', '&quot;') : '';

  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  const pages = manifest.routes.map((route) => route.slice(1) + (route === '/' ? '' : '/') + 'index.html');
  const json = manifest.endpoints.map((path) => 'content' + path.slice(4) + '.json');
  const chunks = manifest.runtime.map((path) => path.slice(1));
  await Promise.all([
    cp(join(publicDir, 'assets'), join(destination, 'assets'), { recursive: true }),
    cp(join(publicDir, 'runtime'), join(destination, 'runtime'), { recursive: true }),
    ...[...pages, ...json, ...chunks].map(async (relative) => {
      let contents = (await readFile(join(publicDir, relative), 'utf8')).replaceAll(marker, base);
      if (relative.endsWith('.js') && contents.includes('globalThis.__publicAssetsURL=')) {
        // Asset literals rewritten by the snapshot may already begin with the Pages base path.
        const original = 'return i.length?joinRelativeURL(r,...i):r';
        if (!contents.includes(original)) throw new Error('Nuxt public asset resolver changed in ' + relative);
        contents = contents.replace(original, 'return i.length?joinRelativeURL(...(typeof i[0]==="string"&&i[0].startsWith(r)?i:[r,...i])):r');
      }
      if (safeEndpoint && relative.endsWith('.html')) {
        contents = contents.replace('src="' + base + 'runtime/adapter.js"', 'src="' + base + 'runtime/adapter.js" data-booking-endpoint="' + safeEndpoint + '"');
      }
      const target = join(destination, relative);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, contents);
    }),
  ]);
  await Promise.all([
    writeFile(join(destination, '.nojekyll'), ''),
    writeFile(join(destination, '404.html'), '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex"><title>Page not found | ADA</title><main><h1>Page not found</h1><p><a href="' + base + '">Return to the homepage</a></p></main></html>'),
  ]);
  console.log('Built ' + pages.length + ' public routes at ' + base);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) await build();
