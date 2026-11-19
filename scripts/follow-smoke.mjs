import { supervise } from '../src/launcher/follow.mjs';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const directory = mkdtempSync(join(tmpdir(), 'tokengo-lifecycle-'));
const log = join(directory, 'events');
const script = join(directory, 'companion');
writeFileSync(
  script,
  `#!${process.execPath}\nrequire('node:fs').appendFileSync(${JSON.stringify(log)},'start\\n');process.on('SIGTERM',()=>{require('node:fs').appendFileSync(${JSON.stringify(log)},'stop\\n');process.exit(0)});setInterval(()=>{},1000);`,
  { mode: 0o700 },
);
let present = true;
const stop = supervise(script, () => present);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function expect(value) {
  for (let i = 0; i < 60; i++) {
    try {
      if (readFileSync(log, 'utf8') === value) return;
    } catch {}
    await wait(250);
  }
  throw new Error('Lifecycle did not reach ' + JSON.stringify(value));
}
try {
  await expect('start\n');
  present = false;
  await expect('start\nstop\n');
  present = true;
  await expect('start\nstop\nstart\n');
  console.log(
    'Follow lifecycle passed: start, stop, restart. No Codex processes or user records touched.',
  );
} finally {
  stop();
  await wait(1000);
  rmSync(directory, { recursive: true, force: true });
}
