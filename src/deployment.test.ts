import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('static deployment policy', () => {
  it('ships a deploy-consumed security, MIME, and immutable-cache policy', async () => {
    const headers = await readFile(new URL('../public/_headers', import.meta.url), 'utf8');
    const azureConfig = await readFile(new URL('../public/staticwebapp.config.json', import.meta.url), 'utf8');
    expect(headers).toContain("Content-Security-Policy: default-src 'self'");
    expect(headers).toContain("frame-ancestors 'none'");
    expect(headers).toContain('Permissions-Policy: camera=(), geolocation=(), microphone=(), payment=()');
    expect(headers).toContain('X-Frame-Options: DENY');
    expect(headers).toContain('X-Content-Type-Options: nosniff');
    expect(headers).toContain('Cache-Control: public, max-age=31536000, immutable');
    expect(headers).toContain('Content-Type: application/manifest+json; charset=utf-8');
    expect(azureConfig).toContain("frame-ancestors 'none'");
    expect(azureConfig).toContain('"Permissions-Policy"');
    expect(azureConfig).toContain('"X-Frame-Options": "DENY"');
    expect(azureConfig).toContain('"route": "/assets/*.js"');
    expect(azureConfig).toContain('".webmanifest": "application/manifest+json"');
  });

  it('builds fingerprinted JS and CSS so immutable caching is safe', async () => {
    const config = await readFile(new URL('../vite.config.ts', import.meta.url), 'utf8');
    expect(config).toContain("entryFileNames: 'assets/app-[hash].js'");
    expect(config).toContain("assetFileNames: 'assets/[name]-[hash][extname]'");
  });
});
