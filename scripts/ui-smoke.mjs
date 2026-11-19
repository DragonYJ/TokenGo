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
  assert.equal(await page.locator('.achievement').count(), 3);
  assert.ok((await page.locator('#banner').textContent()).includes('demo'));
  assert.equal(await page.locator('.cabinet-slot.filled').count(), 3);
  assert.equal(await page.locator('.medal-levels').count(), 6);
  await mkdir('artifacts', { recursive: true });
  await mkdir('docs/screenshots', { recursive: true });
  await page.screenshot({ path: 'docs/screenshots/collection.png' });
  await page.locator('[data-category="tokens"]').click();
  assert.equal(await page.locator('.achievement').count(), 12);
  assert.ok(
    (await page.locator('.community-rate').first().textContent()).includes('No community sample'),
  );
  await page.locator('#search').fill('impossible-query');
  assert.equal(await page.locator('.achievement').count(), 0);
  await page.locator('[data-view="hidden"]').click();
  await page.locator('.achievement.locked').first().click();
  assert.equal(await page.locator('.detail-title').textContent(), 'An undiscovered secret');
  assert.ok(!(await page.locator('.detail-conditions').textContent()).includes('gte'));
  await page.locator('#detail-dialog [data-close]').click();
  await page.locator('[data-view="collection"]').click();
  await page.locator('[data-action="share-cabinet"]').click();
  await page.waitForTimeout(150);
  assert.ok((await page.locator('#share-text').inputValue()).startsWith('[Demo]'));
  const data = await page.locator('#share-canvas').evaluate((c) => c.toDataURL());
  assert.ok(data.length > 30000);
  await writeFile('docs/screenshots/share.png', Buffer.from(data.split(',')[1], 'base64'));
  await page.locator('#share-dialog [data-close]').click();
  await page.locator('#preview-toast').click();
  await page.waitForTimeout(500);
  assert.equal(await page.locator('.toast-platform').count(), 3);
  assert.equal(await page.locator('.toast-eyebrow').count(), 0);
  assert.ok((await page.locator('.toast-fact').textContent()).includes('12 hours'));
  await page.locator('.toast-card').screenshot({ path: 'docs/screenshots/toast.png' });
  await page.locator('.toast-open').click();
  assert.ok(await page.locator('.focused-award').isVisible());
  await page.locator('[data-view="statistics"]').first().click();
  assert.equal(await page.locator('.chart-day').count(), 30);
  await page.screenshot({ path: 'docs/screenshots/statistics.png' });
  await page.locator('[data-stats-range="7"]').click();
  assert.equal(await page.locator('.chart-day').count(), 7);
  await page.locator('.chart-day').last().click();
  assert.ok(await page.locator('[data-action="stats-reset-day"]').isVisible());
  await page.locator('[data-view="collection"]').click();
  const localeInfo = {
    en: 'en-US',
    zh: 'zh-CN',
    ja: 'ja-JP',
    ko: 'ko-KR',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    pt: 'pt-BR',
  };
  for (const [code, locale] of Object.entries(localeInfo)) {
    await page.locator('#language').selectOption(code);
    assert.equal(await page.locator('html').getAttribute('lang'), locale);
    await page.locator('[data-view="statistics"]').first().click();
    const heading = await page.locator('h1').textContent();
    if (code !== 'en') assert.notEqual(heading, 'Your adventure, in numbers.');
    const option = await page.locator('#stats-sort option').first().textContent();
    if (code !== 'en') assert.notEqual(option, 'Most tokens');
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
      `statistics overflow: ${code}`,
    );
    await page.locator('[data-view="collection"]').click();
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) {
      await page.screenshot({ path: `artifacts/overflow-${code}.png`, fullPage: true });
      console.log(
        await page.evaluate(() =>
          [...document.querySelectorAll('body *')]
            .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
            .map((e) => ({
              tag: e.tagName,
              cls: e.className,
              text: e.textContent.slice(0, 60),
              right: e.getBoundingClientRect().right,
            }))
            .slice(-12),
        ),
      );
    }
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
      `cabinet overflow: ${code}`,
    );
    await page.setViewportSize({ width: 1440, height: 1040 });
    if (code === 'ja' || code === 'de')
      await page.screenshot({ path: `artifacts/cabinet-${code}.png` });
    await page.locator('#preview-toast').click();
    await page.waitForTimeout(500);
    await page.locator('.toast-platform.other').click();
    const caption = await page.locator('#share-text').inputValue();
    assert.ok(caption.startsWith('['));
    assert.ok(!caption.includes('.!'));
    assert.ok(!caption.includes('\\'));
    await page.locator('#share-dialog [data-close]').click();
  }
  await page.reload();
  await page.waitForSelector('.cabinet-stage');
  assert.equal(await page.locator('html').getAttribute('lang'), 'pt-BR');
  await page.locator('#language').selectOption('zh');
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN');
  await page.locator('#language').selectOption('en');
  assert.equal(await page.locator('html').getAttribute('lang'), 'en-US');
  assert.equal(
    await page
      .locator('body')
      .evaluate((el) =>
        /[\p{Script=Han}]/u.test(
          el.innerText.replace(document.querySelector('#language').innerText, ''),
        ),
      ),
    false,
  );
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
