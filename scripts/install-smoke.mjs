import { _electron } from '@playwright/test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const temp = await mkdtemp(join(tmpdir(), 'tokengo-install-'));
let app;
try {
  const packed = JSON.parse(
    execFileSync('npm', ['pack', '--json', '--pack-destination', temp], { encoding: 'utf8' }),
  )[0];
  assert.ok(packed.files.some((file) => file.path === 'src/launcher/launch.mjs'));
  assert.ok(!packed.files.some((file) => file.path.startsWith('node_modules/')));
  const prefix = join(temp, 'installed');
  execFileSync('npm', [
    'install',
    '--prefix',
    prefix,
    '--omit=dev',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    join(temp, packed.filename),
  ]);
  const installed = join(prefix, 'node_modules/tokengo');
  const help = execFileSync(process.execPath, [join(installed, 'src/cli.mjs'), '--help'], {
    encoding: 'utf8',
  });
  assert.match(help, /start --collect/);
  const codex = join(temp, 'codex');
  await mkdir(join(codex, 'sessions'), { recursive: true });
  await writeFile(
    join(codex, 'sessions', 'fixture.jsonl'),
    [
      { type: 'session_meta', timestamp: '2026-11-19T01:00:00Z', payload: { id: 'install-test' } },
      {
        type: 'event_msg',
        timestamp: '2026-11-19T01:00:01Z',
        payload: { type: 'task_complete', turn_id: 'one' },
      },
    ]
      .map((r) => JSON.stringify(r))
      .join('\n') + '\n',
  );
  app = await _electron.launch({
    args: [installed, '--collect'],
    env: { ...process.env, TOKENGO_HOME: join(temp, 'records'), CODEX_HOME: codex },
  });
  const page = await app.firstWindow();
  await page.waitForFunction(
    async () => (await window.tokenGo.invoke('snapshot')).settings.watching,
  );
  const snapshot = await page.evaluate(() => window.tokenGo.invoke('snapshot'));
  assert.equal(snapshot.metrics['tasks.completed'], 1);
  assert.equal(snapshot.demo, false);
  assert.equal(await page.locator('#mode-indicator').isVisible(), true);
  console.log(
    `Git-distribution smoke passed: clean package, CLI help, native --collect startup and synthetic ingestion (${packed.size} bytes packed).`,
  );
} finally {
  if (app) await app.close();
  await rm(temp, { recursive: true, force: true });
}
