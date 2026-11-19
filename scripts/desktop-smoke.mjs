import { _electron } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, appendFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const temp = await mkdtemp(join(tmpdir(), 'tokengo-desktop-'));
const home = join(temp, 'codex'),
  store = join(temp, 'records');
await mkdir(join(home, 'sessions'), { recursive: true });
const started = new Date(Date.now() - 60000).toISOString(),
  file = join(home, 'sessions', 'fixture.jsonl');
const record = (type, payload, timestamp = started) =>
  JSON.stringify({ type, timestamp, payload }) + '\n';
await writeFile(
  file,
  record('session_meta', { id: 'test-session', timestamp: started, cwd: '/private/test-project' }) +
    record('event_msg', { type: 'task_started', turn_id: 't1' }) +
    record('response_item', {
      type: 'message',
      id: 'm1',
      role: 'user',
      content: [{ text: 'PRIVATE FIXTURE CONTENT' }],
    }) +
    record('event_msg', {
      type: 'token_count',
      info: {
        total_token_usage: {
          total_tokens: 1000000,
          input_tokens: 800000,
          output_tokens: 200000,
          cached_input_tokens: 100000,
        },
      },
    }) +
    record('event_msg', { type: 'task_complete', turn_id: 't1' }),
);
let app;
try {
  app = await _electron.launch({
    args: ['.'],
    env: { ...process.env, TOKENGO_HOME: store, CODEX_HOME: home },
    timeout: 30000,
  });
  const page = await app.firstWindow(),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.waitForSelector('.achievement');
  assert.equal(await page.evaluate(() => typeof require), 'undefined');
  assert.equal(
    (await page.evaluate(() => window.tokenGo.invoke('snapshot'))).achievements.filter(
      (a) => !a.locked,
    ).length,
    0,
  );
  const scanned = await page.evaluate(() => window.tokenGo.invoke('scan'));
  assert.equal(scanned.metrics['tokens.total'], 1000000);
  assert.equal(scanned.metrics['tasks.completed'], 1);
  const again = await page.evaluate(() => window.tokenGo.invoke('scan'));
  assert.equal(again.metrics['tokens.total'], 1000000);
  const networkDenied = await page.evaluate(() =>
    fetch('https://example.com').then(
      () => false,
      () => true,
    ),
  );
  assert.equal(networkDenied, true);
  const toast = app.windows().find((w) => w.url().endsWith('toast.html'));
  await page.evaluate(() => window.tokenGo.invoke('demo-toast'));
  await toast.waitForSelector('.toast-card');
  assert.ok((await toast.locator('.toast-eyebrow').textContent()).includes('演示'));
  const nativeState = await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows().find((w) =>
      w.webContents.getURL().endsWith('toast.html'),
    );
    return { visible: w.isVisible(), alwaysOnTop: w.isAlwaysOnTop(), focusable: w.isFocusable() };
  });
  assert.deepEqual(nativeState, { visible: true, alwaysOnTop: true, focusable: false });
  await mkdir('artifacts', { recursive: true });
  await new Promise((resolve) => setTimeout(resolve, 500));
  await toast.screenshot({ path: 'artifacts/native-toast.png' });
  await toast.locator('.toast-dismiss').click();
  await page.evaluate(() => window.tokenGo.invoke('watch', true));
  const now = new Date().toISOString();
  await appendFile(
    file,
    record('event_msg', { type: 'task_started', turn_id: 't2' }, now) +
      record(
        'response_item',
        { type: 'function_call', name: 'mcp__image_gen', call_id: 'image-1', arguments: '{}' },
        now,
      ) +
      record('event_msg', { type: 'task_complete', turn_id: 't2' }, now),
  );
  let live;
  const deadline = Date.now() + 15000;
  do {
    live = await page.evaluate(() => window.tokenGo.invoke('snapshot'));
    if (live.metrics['tasks.completed'] === 2) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  } while (Date.now() < deadline);
  assert.equal(live.metrics['tasks.completed'], 2, 'live poller ingested the appended task');
  assert.equal(
    live.achievements.find((a) => a.id === 'secrets.image-maker').award?.source,
    'live',
    JSON.stringify(live.metrics),
  );
  await toast.waitForFunction(
    () =>
      document.querySelector('.toast-eyebrow') &&
      !document.querySelector('.toast-eyebrow').textContent.includes('演示'),
  );
  await toast.locator('.toast-dismiss').click();
  await page.evaluate(() => window.tokenGo.invoke('quiet', true));
  await page.getByRole('button', { name: '秘密档案', exact: false }).first().click();
  await page.locator('[data-achievement="secrets.first-spark"]').click();
  await page.locator('[data-action="share"]').click();
  await page.waitForTimeout(200);
  const image = await page.locator('#share-canvas').evaluate((c) => c.toDataURL());
  assert.ok(image.length > 30000);
  const exportPath = join(temp, 'share.png');
  await app.evaluate(({ dialog }, file) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: file });
  }, exportPath);
  assert.equal(
    await page.evaluate((data) => window.tokenGo.invoke('save-image', data), image),
    true,
  );
  assert.ok((await readFile(exportPath)).length > 15000);
  await app.evaluate(({ shell }) => {
    shell.openExternal = async (url) => {
      globalThis.testExternal = url;
    };
  });
  await page.locator('#share-x').click();
  const external = await app.evaluate(() => globalThis.testExternal);
  assert.ok(external.startsWith('https://x.com/intent/post?text='));
  assert.ok(external.includes('TokenGo'));
  assert.equal(
    (await readFile(join(store, 'state.json'), 'utf8')).includes('PRIVATE FIXTURE CONTENT'),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    'Desktop smoke passed: real fixture ingestion, persistent deduplication, sandbox/CSP, non-focusing native toast, live watcher, PNG export, explicit share URL. No real user logs read.',
  );
} finally {
  if (app) await app.close();
  await rm(temp, { recursive: true, force: true });
}
