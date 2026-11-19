import { spawnSync, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { configure } from './follow.mjs';
import { launch } from './launch.mjs';
import { requestBridge } from '../mcp/bridge.mjs';
function codexBinary() {
  const candidates = [
    process.env.TOKENGO_CODEX_BIN,
    'codex',
    '/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex',
    '/Applications/Codex.app/Contents/Resources/codex',
  ].filter(Boolean);
  const codex = candidates.find(
    (binary) => spawnSync(binary, ['plugin', '--help'], { stdio: 'ignore' }).status === 0,
  );
  if (!codex)
    throw new Error(
      'Codex CLI with plugin support was not found. Set TOKENGO_CODEX_BIN to its executable and retry.',
    );
  return codex;
}
export async function disconnectSidebar() {
  const codex = codexBinary();
  await requestBridge('sidebar-reset');
  execFileSync(codex, ['plugin', 'remove', 'tokengo@tokengo'], { stdio: 'inherit' });
  console.log(
    'Sidebar plugin removed. Notifications now open the local cabinet; achievement records are preserved.',
  );
}
export async function connectSidebar() {
  const codex = codexBinary();
  const root = fileURLToPath(new URL('../../', import.meta.url));
  if (!existsSync(new URL('../../plugins/tokengo/server.mjs', import.meta.url)))
    throw new Error('Plugin bundle is missing. Build it with npm run build:plugin.');
  execFileSync(codex, ['plugin', 'marketplace', 'add', root], { stdio: 'inherit' });
  execFileSync(codex, ['plugin', 'add', 'tokengo@tokengo'], { stdio: 'inherit' });
  if (process.platform === 'darwin') await configure('enable');
  else await launch(['--collect']);
  console.log(
    'TokenGo sidebar plugin installed. Open TokenGo from Plugins or the sidebar menu and pin it. Restart Codex if the new entry has not appeared yet.',
  );
}
