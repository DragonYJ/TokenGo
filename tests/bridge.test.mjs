import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import net from 'node:net';
import { serveBridge, requestBridge, bridgePaths } from '../src/mcp/bridge.mjs';
test('local bridge authenticates requests and rejects undeclared operations', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'tg-bridge-'));
  process.env.TOKENGO_BRIDGE_HOME = directory;
  let called = 0;
  const stop = await serveBridge(async () => {
    called++;
    return { ok: true };
  });
  try {
    assert.deepEqual(await requestBridge('snapshot'), { ok: true });
    await assert.rejects(requestBridge('shell', 'anything'), /Unsupported action/);
    const denial = await new Promise((resolve, reject) => {
      const socket = net.createConnection(bridgePaths().socket);
      let data = '';
      socket.on('error', reject);
      socket.on('connect', () =>
        socket.write(JSON.stringify({ token: 'bad', action: 'snapshot' }) + '\n'),
      );
      socket.on('data', (chunk) => {
        data += chunk;
      });
      socket.on('end', () => resolve(JSON.parse(data)));
    });
    assert.match(denial.error, /Unauthorized/);
    assert.equal(called, 1);
    if (process.platform !== 'win32')
      assert.equal(statSync(bridgePaths().secret).mode & 0o777, 0o600);
  } finally {
    stop();
    delete process.env.TOKENGO_BRIDGE_HOME;
    rmSync(directory, { recursive: true, force: true });
  }
});
