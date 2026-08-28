import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

for (const route of ['privacy', 'terms']) {
  await mkdir(new URL(`../dist/${route}/`, import.meta.url), { recursive: true });
  await copyFile(new URL('../dist/index.html', import.meta.url), new URL(`../dist/${route}/index.html`, import.meta.url));
}

const assets = await readdir(new URL('../dist/assets/', import.meta.url));
const shell = [
  '/', '/index.html', '/offline.html', '/manifest.webmanifest',
  '/icons/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/assets/hero-cassette.webp',
  ...assets.filter(file => /\.(?:js|css)$/.test(file)).sort().map(file => `/assets/${file}`)
];
const cacheFingerprint = createHash('sha256');
for (const file of shell.filter(file => file !== '/')) {
  cacheFingerprint.update(await readFile(new URL(`../dist${file}`, import.meta.url)));
}
const version = cacheFingerprint.digest('hex').slice(0, 12);
const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
const serviceWorker = source
  .replace("'pnc-build'", `'pnc-${version}'`)
  .replace('/* __PRECACHE_MANIFEST__ */ []', JSON.stringify(shell));
await writeFile(new URL('../dist/sw.js', import.meta.url), serviceWorker);
