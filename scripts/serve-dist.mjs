// Serves dist/ with the headers from public/_headers, so the Content-Security-Policy and other
// production headers can be tested locally before deploying. Usage: npm run build && node scripts/serve-dist.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';

const root = join(import.meta.dirname, '..', 'dist');
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };

// Minimal reader for the Cloudflare _headers format: a path line, then indented "Name: value" lines.
function parseHeaders(text) {
  const rules = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) { current = { path: line.trim(), headers: {} }; rules.push(current); continue; }
    const i = line.indexOf(':');
    if (current && i > 0) current.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return rules;
}
const rules = parseHeaders(await readFile(join(root, '_headers'), 'utf8'));
const matches = (rule, path) => rule.path === '/*' || rule.path === path;

createServer(async (req, res) => {
  let path;
  try { path = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(root, path));
  // Only files inside dist/ (the trailing separator keeps a sibling like "dist-x" out).
  if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    const headers = { 'Content-Type': types[extname(file)] || 'application/octet-stream' };
    for (const rule of rules) if (matches(rule, path)) Object.assign(headers, rule.headers);
    delete headers['Strict-Transport-Security']; // HTTPS-only; meaningless on localhost
    res.writeHead(200, headers).end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, 'localhost', () => console.log(`dist on http://localhost:${port}`));
