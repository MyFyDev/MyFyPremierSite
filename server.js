import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// utilities is ESM as of a4517e3 and both of these are default exports. The
// package's exports map covers ./logging explicitly and ./general/mime-types.js
// through its ./* catch-all.
import logging from 'utilities/logging';
import getMimeType from 'utilities/general/mime-types.js';

const dm = logging.colors.dim;
const hl = logging.colors.whiteBright;

logging.logMissingEnvVars([
  'HOST',
  'HTTP_PORT',
  'HTTPS_PORT',
  'SSL_KEY',
  'SSL_CERT',
  'LOG_LEVEL'
], 'MyFy Premier site: start up');

const HOST = process.env.HOST || 'localhost';
const HTTP_PORT = process.env.HTTP_PORT || 80;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;

// Written into .env (base64) by deployment-scripts/scripts/create-or-renew-ssl.sh.
// Absent locally, which is why HTTPS is conditional in start() below.
const keys = {
  key: Buffer.from(process.env.SSL_KEY || '', 'base64'),
  cert: Buffer.from(process.env.SSL_CERT || '', 'base64')
}
const hasCerts = keys.key.length > 0 && keys.cert.length > 0;

// __dirname does not exist in an ES module. import.meta.dirname is the direct
// replacement (node 20.11+), and it matters here beyond convenience: ROOT is
// the web root, and every allowlist decision in resolve() is made against it.
const ROOT = import.meta.dirname;

// The repo root doubles as the web root, so reachability is an ALLOWLIST rather
// than a denylist — .env (which holds SSL_KEY, SSL_CERT and every other secret),
// package.json, server.js, node_modules/ and deployment/ all live here and must
// never be served. Only assets/ and the site's own top-level files resolve.
const SERVE_DIRS = ['assets'];
const SERVE_FILES = new Set([
  ...fs.readdirSync(ROOT).filter(f => f.endsWith('.html')),
  'robots.txt',
  'sitemap.xml'
]);

// Unfingerprinted filenames (site.css, site.js), so a long max-age would pin
// stale copies in browsers after a deploy. HTML always revalidates.
const ASSET_CACHE_SECONDS = process.env.ASSET_CACHE_SECONDS || 3600;
// svg is text and compresses well; woff2/mp4/png/jpg are already compressed and
// would only get bigger, so the list is an allowlist rather than an exclusion.
const COMPRESSIBLE = /^(text\/|image\/svg\+xml|application\/(json|xml|javascript))/;

// `require.main === module` has no ESM equivalent. import.meta.filename is the
// path node puts in argv[1] when this file is the entry point, so the server
// still starts when run directly and stays importable for a test.
if (process.argv[1] === import.meta.filename) start();

export { start, handler };

function start() {
  http.createServer(hasCerts ? redirectToHttps : handler).listen(HTTP_PORT, () => {
    const role = hasCerts ? 'redirecting to HTTPS' : 'serving';
    console.log(`\n${dm(`HTTP server ${role} on `)}${hl('http://')}${hl(HOST)}:${hl(HTTP_PORT)}`);
  })

  if (!hasCerts) {
    console.warn(`${dm('No SSL_KEY/SSL_CERT in the environment — HTTPS listener not started.')}`);
    return;
  }

  https.createServer(keys, handler).listen(HTTPS_PORT, () => {
    console.log(`${dm('HTTPS server running on ')}${hl('https://')}${hl(HOST)}:${hl(HTTPS_PORT)}`);
  })
}

function redirectToHttps(req, res) {
  const host = req.headers.host?.split(':').shift() || HOST;
  const port = String(HTTPS_PORT) === '443' ? '' : `:${HTTPS_PORT}`;
  res.writeHead(308, { 'location': `https://${host}${port}${req.url}` });
  res.end();
}

function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    logging.warn(`405 ${req.method} ${req.url}`);
    return send(res, 405, 'Method Not Allowed', { 'allow': 'GET, HEAD' });
  }

  const filePath = resolve(req.url);

  if (!filePath) {
    logging.info(`404 ${req.method} ${req.url}`);
    return send(res, 404, 'Not Found');
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      logging.info(`404 ${req.method} ${req.url}`);
      return send(res, 404, 'Not Found');
    }
    serve(req, res, filePath, stat);
  })
}

// Maps a request URL onto an allowlisted file on disk, or null if it is not
// servable. Returns an absolute path; every branch is confined to ROOT.
function resolve(url) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname);
  } catch {
    return null; // malformed percent-encoding
  }

  if (pathname.includes('\0')) return null;
  if (pathname === '/') return path.join(ROOT, 'index.html');

  // Normalize away ../ and ./ before any allowlist decision is made.
  const rel = path.normalize(pathname).replace(/^[/\\]+/, '');
  if (!rel || rel.startsWith('..')) return null;

  const abs = path.join(ROOT, rel);
  // Belt-and-braces against traversal that survives normalization (e.g. via a
  // symlink inside assets/) — the resolved path must still sit under ROOT.
  if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) return null;

  const top = rel.split(path.sep).shift();
  if (SERVE_DIRS.includes(top)) return abs;
  if (SERVE_FILES.has(rel)) return abs;
  // Tolerate extensionless links (/yacht-financing) even though the site's own
  // markup and sitemap.xml both use explicit .html.
  if (!path.extname(rel) && SERVE_FILES.has(`${rel}.html`)) return `${abs}.html`;

  return null;
}

function serve(req, res, filePath, stat) {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const type = getMimeType(ext);
  const isHtml = ext === 'html';
  const etag = `"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;

  const headers = {
    'content-type': type,
    'etag': etag,
    'last-modified': stat.mtime.toUTCString(),
    'accept-ranges': 'bytes',
    'cache-control': isHtml ? 'no-cache' : `public, max-age=${ASSET_CACHE_SECONDS}`,
    'x-content-type-options': 'nosniff'
  };

  if (isFresh(req, etag, stat)) {
    logging.debug(`304 ${req.method} ${req.url}`);
    res.writeHead(304, headers);
    return res.end();
  }

  const range = parseRange(req.headers.range, stat.size);

  if (range === -1) {
    logging.info(`416 ${req.method} ${req.url} (${req.headers.range})`);
    return send(res, 416, 'Range Not Satisfiable', { 'content-range': `bytes */${stat.size}` });
  }

  // Ranged read: hero.mp4 is streamed, and Safari will not play a video whose
  // server ignores Range — it requires the 206 to start playback at all.
  if (range) {
    headers['content-length'] = range.end - range.start + 1;
    headers['content-range'] = `bytes ${range.start}-${range.end}/${stat.size}`;
    logging.debug(`206 ${req.method} ${req.url} (${headers['content-range']})`);
    res.writeHead(206, headers);
    if (req.method === 'HEAD') return res.end();
    return pipe(req, res, fs.createReadStream(filePath, { start: range.start, end: range.end }), filePath);
  }

  // Compress text only, and only on a full-body response — a gzipped 206 would
  // have to report compressed offsets, which is not what the client asked for.
  const gzip = COMPRESSIBLE.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] || '');

  if (gzip) {
    headers['content-encoding'] = 'gzip';
    headers['etag'] = `${etag.slice(0, -1)}-gz"`; // distinct entity from the identity encoding
    headers['vary'] = 'accept-encoding';
  } else {
    headers['content-length'] = stat.size;
  }

  logging.debug(`200 ${req.method} ${req.url}${gzip ? ' (gzip)' : ''}`);
  res.writeHead(200, headers);
  if (req.method === 'HEAD') return res.end();

  const file = fs.createReadStream(filePath);
  pipe(req, res, gzip ? file.pipe(zlib.createGzip()) : file, filePath);
}

function pipe(req, res, stream, filePath) {
  stream.on('error', err => {
    logging.error(`Failed reading ${filePath}: ${err.message}`);
    // Headers are already out by this point, so the only signal left to the
    // client is an abrupt close — which is what destroy() gives us.
    res.destroy();
  })
  stream.pipe(res);
}

// Single-range only. Returns null for no/unparseable range (serve the whole
// file), -1 for a syntactically valid but unsatisfiable range (416).
function parseRange(header, size) {
  if (!header) return null;

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  let start, end;

  if (rawStart === '') {
    if (rawEnd === '') return null;
    const suffix = parseInt(rawEnd, 10); // trailing N bytes
    if (suffix === 0) return -1;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = parseInt(rawStart, 10);
    end = rawEnd === '' ? size - 1 : Math.min(parseInt(rawEnd, 10), size - 1);
  }

  if (start > end || start >= size) return -1;
  return { start, end };
}

function isFresh(req, etag, stat) {
  const noneMatch = req.headers['if-none-match'];
  // An If-None-Match wins outright when present; the date check is the fallback
  // for clients that only sent If-Modified-Since.
  if (noneMatch) {
    return noneMatch.split(',').some(t => {
      const tag = t.trim().replace(/^W\//, '');
      return tag === etag || tag === `${etag.slice(0, -1)}-gz"` || tag === '*';
    })
  }

  const since = req.headers['if-modified-since'];
  if (!since) return false;

  const sinceMs = Date.parse(since);
  if (isNaN(sinceMs)) return false;

  // Last-Modified is second-precision, so compare at that granularity.
  return Math.floor(stat.mtimeMs / 1000) * 1000 <= sinceMs;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    ...headers
  });
  res.end(body);
}
