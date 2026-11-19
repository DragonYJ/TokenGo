import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const files = (await readdir('dist'))
  .filter((name) => /\.(dmg|zip|exe|AppImage)$/.test(name))
  .sort();
const lines = [];
for (const name of files) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(join('dist', name))) hash.update(chunk);
  lines.push(`${hash.digest('hex')}  ${name}`);
}
if (!lines.length) throw new Error('No release installers found');
await writeFile(
  `dist/TokenGo-SHA256SUMS-${process.platform}-${process.arch}.txt`,
  lines.join('\n') + '\n',
);
console.log(`Generated SHA-256 checksums for ${lines.length} release files.`);
