import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { executable } from './launch.mjs';

const label = 'io.tokengo.codex-companion';
const root = fileURLToPath(new URL('../../', import.meta.url));
export function hasCodex(output) {
  return output.split('\n').some((line) => {
    const name = line.trim();
    return /\/Contents\/MacOS\/Codex(?: \(Aperitif\))?$/.test(name) || /(?:^|\/)codex$/.test(name);
  });
}
const xml = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
export function plist(args, log, env = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>Label</key><string>${label}</string>
<key>ProgramArguments</key><array>${args.map((arg) => `<string>${xml(arg)}</string>`).join('')}</array>
<key>EnvironmentVariables</key><dict>${Object.entries(env)
    .map(([k, v]) => `<key>${xml(k)}</key><string>${xml(v)}</string>`)
    .join('')}</dict>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
<key>ThrottleInterval</key><integer>15</integer>
<key>StandardOutPath</key><string>${xml(log)}</string>
<key>StandardErrorPath</key><string>${xml(log)}</string>
</dict></plist>\n`;
}
export async function configure(command) {
  if (process.platform !== 'darwin')
    throw new Error('Automatic Codex following currently supports macOS.');
  const domain = `gui/${process.getuid()}`;
  const file = join(homedir(), 'Library/LaunchAgents', `${label}.plist`);
  if (command === 'status') {
    console.log(
      existsSync(file) ? 'Codex following is installed.' : 'Codex following is disabled.',
    );
    try {
      console.log(
        execFileSync('/bin/launchctl', ['print', `${domain}/${label}`], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }),
      );
    } catch {}
    return;
  }
  if (command === 'disable') {
    try {
      execFileSync('/bin/launchctl', ['bootout', `${domain}/${label}`], { stdio: 'ignore' });
    } catch {}
    rmSync(file, { force: true });
    console.log('Codex following disabled. Achievement records are preserved.');
    return;
  }
  // Prepare the runtime once during explicit installation, never during observation.
  const cache = process.env.TOKENGO_RUNTIME_HOME || join(homedir(), '.cache/tokengo');
  const binary = await executable(cache);
  mkdirSync(cache, { recursive: true });
  mkdirSync(join(homedir(), 'Library/LaunchAgents'), { recursive: true });
  const env = Object.fromEntries(
    ['CODEX_HOME', 'TOKENGO_HOME']
      .filter((key) => process.env[key])
      .map((key) => [key, process.env[key]]),
  );
  const content = plist(
    [process.execPath, fileURLToPath(import.meta.url), '--supervise', binary],
    join(cache, 'companion.log'),
    env,
  );
  const temporary = file + '.tmp';
  writeFileSync(temporary, content, { mode: 0o600 });
  execFileSync('/usr/bin/plutil', ['-lint', temporary], { stdio: 'ignore' });
  try {
    execFileSync('/bin/launchctl', ['bootout', `${domain}/${label}`], { stdio: 'ignore' });
  } catch {}
  const { renameSync } = await import('node:fs');
  renameSync(temporary, file);
  execFileSync('/bin/launchctl', ['bootstrap', domain, file]);
  console.log(
    'TokenGo now follows Codex. Collection starts silently while Codex is open. Run tokengo disable to remove this integration.',
  );
}

export function supervise(
  binary,
  probe = () =>
    hasCodex(
      execFileSync('/bin/ps', ['-U', String(process.getuid()), '-o', 'comm='], {
        encoding: 'utf8',
      }),
    ),
) {
  let child,
    stopping = false,
    dismissed = false,
    stopRequested = false;
  const tick = () => {
    if (stopping) return;
    let running;
    try {
      running = probe();
    } catch {
      return;
    } // Inspection failure must not kill a healthy companion.
    if (!running) dismissed = false;
    if (running && !child && !dismissed) {
      stopRequested = false;
      const env = { ...process.env };
      delete env.ELECTRON_RUN_AS_NODE;
      child = spawn(binary, [root, '--background', '--collect', '--follow-codex'], {
        stdio: 'inherit',
        env,
      });
      child.once('error', (error) => console.error(error.message));
      child.once('close', (code) => {
        child = undefined;
        if (code === 0 && !stopRequested) dismissed = true;
      });
    } else if (!running && child) {
      stopRequested = true;
      child.kill('SIGTERM');
    }
  };
  const timer = setInterval(tick, 5000);
  tick();
  const stop = () => {
    stopping = true;
    clearInterval(timer);
    process.removeListener('SIGTERM', stop);
    process.removeListener('SIGINT', stop);
    child?.kill('SIGTERM');
  };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  return stop;
}
if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2] === '--supervise')
  supervise(process.argv[3]);
