import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { base } from './build.mjs';

const { values: options } = parseArgs({ options: {
  host: { type: 'string', default: '127.0.0.1' },
  port: { type: 'string', default: '4173' },
  strictPort: { type: 'boolean' },
} });
const root = fileURLToPath(new URL('../dist', import.meta.url));
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/vnd.microsoft.icon',
  '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif',
  '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.webm': 'video/webm', '.mp4': 'video/mp4', '.pdf': 'application/pdf', '.ttf': 'font/ttf', '.otf': 'font/otf',
};

async function fileInfo(path) {
  return stat(path).catch((error) => {
    if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
    return null;
  });
}

function byteRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  return start <= end && start < size ? { start, end } : null;
}

const server = createServer(async (request, response) => {
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let path = pathname.startsWith(base) ? resolve(root, pathname.slice(base.length)) : null;
    if (path !== root && !path?.startsWith(root + sep)) path = null;
    let info = path && await fileInfo(path);
    if (info?.isDirectory()) {
      path = join(path, 'index.html');
      info = await fileInfo(path);
    }
    const found = Boolean(info?.isFile());
    if (!found) {
      path = join(root, '404.html');
      info = await stat(path);
    }
    const type = mime[extname(path).toLowerCase()] ?? 'application/octet-stream';
    const headers = { 'Content-Type': type, 'Content-Length': info.size, 'Accept-Ranges': 'bytes' };
    const range = found && request.headers.range && byteRange(request.headers.range, info.size);
    if (found && request.headers.range && !range) {
      response.writeHead(416, { 'Content-Range': 'bytes */' + info.size }).end();
      return;
    }
    if (range) {
      headers['Content-Range'] = 'bytes ' + range.start + '-' + range.end + '/' + info.size;
      headers['Content-Length'] = range.end - range.start + 1;
    }
    response.writeHead(found ? (range ? 206 : 200) : 404, headers);
    if (request.method === 'HEAD') response.end();
    else createReadStream(path, range || {}).on('error', () => response.destroy()).pipe(response);
  } catch (error) {
    if (response.headersSent) response.destroy();
    else response.writeHead(error instanceof URIError ? 400 : 500).end();
  }
});
server.listen(Number(options.port), options.host, () => {
  console.log('Serving http://' + options.host + ':' + server.address().port + base);
});
