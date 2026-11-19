import net from 'node:net';
import { mkdirSync, writeFileSync, readFileSync, chmodSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';

export const actions = [
  'sidebar-ready',
  'sidebar-reset',
  'snapshot',
  'pins',
  'language',
  'analytics-rebuild',
  'community-report',
  'community-copy',
  'community-submit',
  'community-import',
  'scan',
  'watch',
  'quiet',
  'save-image',
  'copy-image',
  'copy-text',
  'share',
  'open-repo',
  'demo-toast',
  'export',
  'startup',
];
export function bridgePaths() {
  const directory =
    process.env.TOKENGO_BRIDGE_HOME ||
    (process.env.TOKENGO_HOME
      ? join(process.env.TOKENGO_HOME, '.bridge')
      : join(homedir(), '.cache/tokengo/bridge'));
  return {
    directory,
    secret: join(directory, 'access.key'),
    socket:
      process.platform === 'win32'
        ? `\\\\.\\pipe\\tokengo-${createHash('sha256').update(directory).digest('hex').slice(0, 24)}`
        : join(directory, 'app.sock'),
  };
}
export async function serveBridge(dispatch) {
  const paths = bridgePaths(),
    token = randomBytes(32).toString('hex');
  mkdirSync(paths.directory, { recursive: true, mode: 0o700 });
  if (process.platform !== 'win32') rmSync(paths.socket, { force: true });
  writeFileSync(paths.secret, token, { mode: 0o600 });
  chmodSync(paths.secret, 0o600);
  const server = net.createServer((socket) => {
    let data = '',
      handled = false;
    socket.setEncoding('utf8');
    socket.setTimeout(120000, () => socket.destroy());
    socket.on('error', () => {});
    socket.on('data', async (chunk) => {
      if (handled) return;
      data += chunk;
      if (data.length > 17 * 1024 * 1024) return socket.destroy();
      if (!data.includes('\n')) return;
      handled = true;
      try {
        const request = JSON.parse(data.slice(0, data.indexOf('\n')));
        const supplied = Buffer.from(String(request.token || ''));
        if (supplied.length !== token.length || !timingSafeEqual(supplied, Buffer.from(token)))
          throw new Error('Unauthorized local request');
        if (!actions.includes(request.action)) throw new Error('Unsupported action');
        socket.end(
          JSON.stringify({ value: await dispatch(request.action, request.payload) }) + '\n',
        );
      } catch (error) {
        socket.end(JSON.stringify({ error: error.message }) + '\n');
      }
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(paths.socket, resolve);
  });
  if (process.platform !== 'win32') chmodSync(paths.socket, 0o600);
  return () => {
    server.close();
    if (process.platform !== 'win32') rmSync(paths.socket, { force: true });
    rmSync(paths.secret, { force: true });
  };
}
export async function requestBridge(action, payload) {
  const paths = bridgePaths();
  let token;
  try {
    token = readFileSync(paths.secret, 'utf8');
  } catch {
    throw new Error(
      'TokenGo collector is not running. Run tokengo enable on macOS, or tokengo start --collect.',
    );
  }
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(paths.socket);
    let data = '';
    socket.setEncoding('utf8');
    socket.setTimeout(120000, () => socket.destroy(new Error('Local collector did not respond')));
    socket.on('connect', () => socket.write(JSON.stringify({ token, action, payload }) + '\n'));
    socket.on('error', () =>
      reject(new Error('Cannot connect to TokenGo. Restart or update the local companion.')),
    );
    socket.on('data', (chunk) => {
      data += chunk;
      if (data.length > 24 * 1024 * 1024) socket.destroy(new Error('Response too large'));
    });
    socket.on('end', () => {
      try {
        const result = JSON.parse(data);
        result.error ? reject(new Error(result.error)) : resolve(result.value);
      } catch (error) {
        reject(error);
      }
    });
  });
}
