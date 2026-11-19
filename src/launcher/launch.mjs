import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, openSync, closeSync } from 'node:fs';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../../', import.meta.url));
const electronVersion = require('../../package.json').devDependencies.electron;

export function launchOptions(args) {
  const allowed = new Set(['--collect', '--foreground']);
  for (const arg of args) if (!allowed.has(arg)) throw new Error(`Unknown option: ${arg}`);
  return { collect: args.includes('--collect'), foreground: args.includes('--foreground') };
}

function npmCommand() {
  if (process.env.npm_execpath && existsSync(process.env.npm_execpath))
    return [process.execPath, [process.env.npm_execpath]];
  if (process.platform !== 'win32') return ['npm', []];
  const npm = execFileSync('where.exe', ['npm.cmd'], { encoding: 'utf8' }).trim().split(/\r?\n/)[0];
  return [process.execPath, [join(dirname(npm), 'node_modules/npm/bin/npm-cli.js')]];
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`Process exited with code ${code}`)),
    );
  });
}

async function executable(cache) {
  // Development checkouts can use their already installed, pinned runtime.
  try {
    const binary = require('electron');
    if (require('electron/package.json').version === electronVersion && existsSync(binary))
      return binary;
  } catch {}
  const prefix = join(cache, `electron-${electronVersion}`);
  const module = join(prefix, 'node_modules/electron');
  const resolveBinary = () => {
    const binary = require(module);
    if (!existsSync(binary)) throw new Error('Electron runtime is incomplete.');
    return binary;
  };
  try {
    return resolveBinary();
  } catch {}
  console.log(
    `Preparing Electron ${electronVersion} for native achievement cards (first launch only)…`,
  );
  mkdirSync(prefix, { recursive: true });
  const [command, leading] = npmCommand();
  await run(
    command,
    [
      ...leading,
      'install',
      '--prefix',
      prefix,
      '--no-audit',
      '--no-fund',
      '--package-lock=false',
      `electron@${electronVersion}`,
    ],
    { stdio: 'inherit' },
  );
  // Also works when npm is configured to ignore lifecycle scripts.
  if (!existsSync(join(module, 'path.txt')))
    await run(process.execPath, [join(module, 'install.js')], { stdio: 'inherit' });
  return resolveBinary();
}

export async function launch(args) {
  const { collect, foreground } = launchOptions(args);
  const cache = join(process.env.TOKENGO_RUNTIME_HOME || join(homedir(), '.cache', 'tokengo'));
  const binary = await executable(cache);
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const appArgs = [root, ...(collect ? ['--collect'] : [])];
  if (foreground) {
    await run(binary, appArgs, { stdio: 'inherit', env });
    return;
  }
  mkdirSync(cache, { recursive: true });
  const log = join(cache, 'desktop.log');
  const fd = openSync(log, 'a', 0o600);
  let child;
  try {
    child = spawn(binary, appArgs, { detached: true, stdio: ['ignore', fd, fd], env });
  } finally {
    closeSync(fd);
  }
  await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('spawn', resolve);
  });
  child.unref();
  console.log(
    'TokenGo launch requested. Close the cabinet to keep it in the tray; choose Quit to stop.',
  );
  console.log(`If no window appears, run tokengo start --foreground. Diagnostic log: ${log}`);
}
