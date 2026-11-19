import test from 'node:test';
import assert from 'node:assert/strict';
import { hasCodex, plist } from '../src/launcher/follow.mjs';
test('follow detection matches Codex hosts without matching helpers or unrelated paths', () => {
  for (const value of [
    '/Applications/Codex.app/Contents/MacOS/Codex',
    '/Applications/ChatGPT.app/Contents/Helpers/Codex (Aperitif).app/Contents/MacOS/Codex (Aperitif)',
    '/opt/bin/codex',
  ])
    assert.equal(hasCodex(value), true);
  for (const value of [
    '/Applications/Codex.app/Contents/Helpers/crashpad_handler',
    '/Applications/Helpers/Codex (Aperitif Renderer).app/Contents/MacOS/Codex (Aperitif Renderer)',
    '/tmp/codex-notes/node',
    '/usr/bin/node',
    '',
  ])
    assert.equal(hasCodex(value), false);
});
test('launch agent preserves argument boundaries and escapes XML', () => {
  const result = plist(['/a path/node', '/tmp/a&b/<script>'], '/tmp/log', {
    CODEX_HOME: '/tmp/a&b',
  });
  assert.ok(result.includes('<string>/a path/node</string>'));
  assert.ok(result.includes('/tmp/a&amp;b/&lt;script&gt;'));
  assert.ok(!result.includes('<script>'));
});
