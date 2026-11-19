import test from 'node:test';
import assert from 'node:assert/strict';
import { launchOptions } from '../src/launcher/launch.mjs';

test('opening preserves consent; collection requires an explicit flag', () => {
  assert.deepEqual(launchOptions([]), { collect: false, foreground: false });
  assert.deepEqual(launchOptions(['--collect', '--foreground']), {
    collect: true,
    foreground: true,
  });
  assert.throws(() => launchOptions(['--upload']), /Unknown option/);
});
