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
      {
        type: 'session_meta',
        timestamp: new Date(Date.now() - 60000).toISOString(),
        payload: { id: 'install-test' },
      },
      {
        type: 'event_msg',
        timestamp: new Date(Date.now() - 59000).toISOString(),
        payload: { type: 'task_complete', turn_id: 'one' },
      },
    ]
      .map((r) => JSON.stringify(r))
      .join('\n') + '\n',
  );
  app = await _electron.launch({
    args: [installed, '--collect', '--background', `--user-data-dir=${join(temp, 'profile')}`],
    env: { ...process.env, TOKENGO_HOME: join(temp, 'records'), CODEX_HOME: codex },
  });
  const page = await app.firstWindow();
  assert.equal(
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows().some((window) => window.isVisible()),
    ),
    false,
  );
  let snapshot;
  for (let attempt = 0; attempt < 100; attempt++) {
    snapshot = await page.evaluate(() => window.tokenGo.invoke('snapshot'));
    if (snapshot.settings.watching) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(snapshot.settings.watching, true);
  assert.equal(
    snapshot.metrics['tasks.completed'],
    1,
    JSON.stringify({
      metrics: snapshot.metrics,
      lastScan: snapshot.lastScan,
      settings: snapshot.settings,
    }),
  );
  assert.equal(snapshot.demo, false);
  assert.equal(await page.locator('#mode-indicator').isVisible(), true);
  console.log(
    `Git-distribution smoke passed: clean package, CLI help, native --collect startup and synthetic ingestion (${packed.size} bytes packed).`,
  );
} finally {
  if (app) await app.close();
  await rm(temp, { recursive: true, force: true });
}
