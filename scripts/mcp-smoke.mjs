import { _electron, chromium } from '@playwright/test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
const temp = await mkdtemp(join(tmpdir(), 'tg-mcp-'));
const env = {
  ...process.env,
  TOKENGO_HOME: join(temp, 'records'),
  CODEX_HOME: join(temp, 'codex'),
  TOKENGO_BRIDGE_HOME: '/tmp/tg-' + Math.random().toString(36).slice(2),
};
let desktop, browser, transport;
const http = createServer((_request, response) => {
  response.end(
    '<html><body style="margin:0"><iframe id="app" style="border:0;width:100vw;height:100vh"></iframe></body></html>',
  );
});
try {
  await mkdir(join(env.CODEX_HOME, 'sessions'), { recursive: true });
  const at = new Date(Date.now() - 60000).toISOString();
  await writeFile(
    join(env.CODEX_HOME, 'sessions/test.jsonl'),
    [
      { type: 'session_meta', timestamp: at, payload: { id: 'sidebar-fixture' } },
      { type: 'event_msg', timestamp: at, payload: { type: 'task_complete', turn_id: 'one' } },
    ]
      .map((r) => JSON.stringify(r))
      .join('\n') + '\n',
  );
  desktop = await _electron.launch({
    args: ['.', '--collect', '--background', `--user-data-dir=${join(temp, 'profile')}`],
    env,
  });
  const client = new Client({ name: 'TokenGo integration test', version: '1.0.0' });
  transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolve('plugins/tokengo/server.mjs')],
    env,
    stderr: 'pipe',
  });
  await client.connect(transport);
  const listing = await client.listTools();
  assert.equal(listing.tools.length, 2);
  const entry = listing.tools.find((t) => t.name === 'tokengo.cabinet');
  assert.equal(entry._meta['openai/ui'].entrypoints[0].type, 'global');
  assert.deepEqual(entry._meta.ui.visibility, ['app']);
  let initial;
  for (let i = 0; i < 100; i++) {
    initial = await client.callTool({ name: entry.name, arguments: {} });
    if (initial._meta?.value?.settings.watching) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.equal(initial._meta.value.metrics['tasks.completed'], 1);
  assert.deepEqual(initial.content, []);
  assert.equal(initial.structuredContent, undefined);
  const resource = await client.readResource({ uri: entry._meta.ui.resourceUri });
  assert.deepEqual(resource.contents[0]._meta.ui.csp.connectDomains, []);
  await new Promise((r) => http.listen(0, '127.0.0.1', r));
  browser = await chromium.launch({
    ...(existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
      ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' }
      : {}),
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [],
    network = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (!r.url().startsWith('http://127.0.0.1') && !r.url().startsWith('data:'))
      network.push(r.url());
  });
  await page.exposeFunction('mcpCall', (params) => client.callTool(params));
  await page.goto(`http://127.0.0.1:${http.address().port}`);
  await page.evaluate(
    ({ html, initial }) => {
      const iframe = document.querySelector('#app');
      window.addEventListener('message', async (event) => {
        if (event.source !== iframe.contentWindow) return;
        const m = event.data;
        if (!m?.method) return;
        let result;
        if (m.method === 'ui/initialize')
          result = {
            protocolVersion: '2026-01-26',
            hostInfo: { name: 'Test host', version: '1.0.0' },
            hostCapabilities: { serverTools: {} },
            hostContext: { theme: 'dark', displayMode: 'fullscreen' },
          };
        else if (m.method === 'tools/call') result = await window.mcpCall(m.params);
        else if (m.method === 'ui/notifications/initialized') {
          iframe.contentWindow.postMessage(
            { jsonrpc: '2.0', method: 'ui/notifications/tool-result', params: initial },
            '*',
          );
          return;
        } else if (m.id !== undefined) result = {};
        if (m.id !== undefined)
          iframe.contentWindow.postMessage({ jsonrpc: '2.0', id: m.id, result }, '*');
      });
      iframe.srcdoc = html;
    },
    { html: resource.contents[0].text, initial },
  );
  const frame = page.frameLocator('#app');
  await frame.locator('.achievement').first().waitFor();
  assert.equal(
    await frame.locator('#profile-mode').textContent(),
    `${initial._meta.value.achievements.filter((a) => !a.locked).length} achievements · local record`,
  );
  await frame.locator('#language').selectOption('ja');
  await frame.locator('html').evaluate((el) => {
    if (el.lang !== 'ja-JP') throw Error('Language not applied');
  });
  await frame.locator('#language').selectOption('en');
  const id = initial._meta.value.achievements.find((a) => !a.locked).id;
  await client.callTool({ name: 'tokengo.action', arguments: { action: 'pins', payload: [id] } });
  const mainWindow = desktop.windows().find((w) => w.url().endsWith('index.html'));
  assert.deepEqual(
    (await mainWindow.evaluate(() => window.tokenGo.invoke('snapshot'))).settings.pins,
    [id],
  );
  await page.evaluate(
    (id) =>
      document.querySelector('#app').contentWindow.postMessage(
        {
          jsonrpc: '2.0',
          method: 'ui/notifications/host-context-changed',
          params: { 'openai/deepLink': { url: '/achievements/' + id } },
        },
        '*',
      ),
    id,
  );
  await frame.locator('.focused-award').waitFor();
  await page.evaluate(() =>
    document.querySelector('#app').contentWindow.postMessage(
      {
        jsonrpc: '2.0',
        method: 'ui/notifications/host-context-changed',
        params: { 'openai/deepLink': { url: '/statistics' } },
      },
      '*',
    ),
  );
  await frame.locator('#view-label').filter({ hasText: 'Statistics' }).waitFor();
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/sidebar-statistics.png' });
  await desktop.evaluate(({ shell }) => {
    shell.openExternal = async (url) => {
      globalThis.sidebarTestUrl = url;
    };
  });
  await client.callTool({ name: 'tokengo.action', arguments: { action: 'sidebar-ready' } });
  await client.callTool({ name: 'tokengo.action', arguments: { action: 'demo-toast' } });
  const toastWindow = desktop.windows().find((w) => w.url().endsWith('toast.html'));
  await toastWindow.locator('.toast-open').click();
  const target = await desktop.evaluate(() => globalThis.sidebarTestUrl);
  assert.ok(target.startsWith('codex://plugins/tokengo@tokengo/app/tokengo.cabinet?path='));
  assert.deepEqual(network, []);
  assert.deepEqual(errors, []);
  console.log(
    'MCP integration passed: real synthetic records, global metadata, app-only results, offline embedded UI, language and deep links.',
  );
} finally {
  await browser?.close();
  await transport?.close();
  await desktop?.close();
  http.close();
  await rm(temp, { recursive: true, force: true });
  await rm(env.TOKENGO_BRIDGE_HOME, { recursive: true, force: true });
}
