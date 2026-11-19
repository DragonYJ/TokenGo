import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { existsSync } from 'node:fs';
const root = resolve('dist/site');
const server = createServer(async (req, res) => {
  try {
    const path = resolve(
      root,
      '.' + new URL(req.url, 'http://local').pathname.replace(/\/$/, '/index.html'),
    );
    if (!path.startsWith(root + sep)) throw new Error('path');
    res.setHeader(
      'Content-Type',
      {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.svg': 'image/svg+xml',
      }[extname(path)] || 'application/octet-stream',
    );
    res.end(await readFile(path));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const address = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    (existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : undefined),
  headless: true,
});
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1040 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage(),
    errors = [],
    external = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await context.route('**/*', (route) => {
    if (route.request().url().startsWith(address)) return route.continue();
    external.push(route.request().url());
    return route.abort();
  });
  await page.goto(address);
  await page.waitForSelector('.achievement');
  assert.equal(await page.locator('.achievement').count(), 24);
  assert.ok((await page.locator('#banner').textContent()).includes('演示'));
  await mkdir('artifacts', { recursive: true });
  await mkdir('docs/screenshots', { recursive: true });
  await page.screenshot({ path: 'artifacts/collection-full.png', fullPage: true });
  await page.screenshot({ path: 'docs/screenshots/collection.png' });
  await page.locator('#search').fill('星河漫游');
  assert.equal(await page.locator('.achievement').count(), 20);
  await page.getByRole('button', { name: '秘密档案', exact: false }).first().click();
  assert.ok((await page.locator('.achievement.locked').count()) > 0);
  await page.locator('.achievement.locked').first().click();
  assert.equal(await page.locator('.detail-title').textContent(), '未发现的秘密');
  assert.ok(!(await page.locator('.detail-conditions').textContent()).includes('gte'));
  await page.locator('#detail-dialog [data-close]').click();
  await page.getByRole('button', { name: '我的展柜', exact: false }).first().click();
  assert.equal(await page.locator('.cabinet-slot.filled').count(), 3);
  await page.getByRole('button', { name: '分享展柜' }).click();
  await page.waitForTimeout(150);
  assert.ok(await page.locator('#share-dialog').isVisible());
  assert.ok((await page.locator('#share-text').inputValue()).startsWith('[演示]'));
  const data = await page.locator('#share-canvas').evaluate((c) => c.toDataURL());
  assert.ok(data.length > 30000);
  await writeFile('artifacts/share-cabinet.png', Buffer.from(data.split(',')[1], 'base64'));
  await page.locator('#share-dialog [data-close]').click();
  await page.getByRole('button', { name: '预览成就弹卡' }).click();
  assert.ok(await page.locator('.toast-card').isVisible());
  await page.screenshot({ path: 'artifacts/toast.png' });
  await page.locator('.toast-dismiss').click();
  await page.getByRole('button', { name: '偏好设置', exact: false }).first().click();
  assert.equal(await page.locator('.settings-panel').count(), 2);
  await page.getByRole('button', { name: '成就图鉴', exact: false }).first().click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(
    'UI smoke passed: filtering, secret masking, cabinet, PNG sharing, toast, settings, 390px layout; no external requests or page errors.',
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
