import { mkdir, cp, writeFile, readFile } from 'node:fs/promises';
import { demoSnapshot } from '../src/core/runtime.mjs';
const output = new URL('../dist/site/', import.meta.url);
await mkdir(output, { recursive: true });
await cp(new URL('../src/ui/', import.meta.url), output, { recursive: true });
await cp(new URL('../assets/', import.meta.url), new URL('assets/', output), { recursive: true });
let html = await readFile(new URL('index.html', output), 'utf8');
html = html
  .replace('../../assets/icon.svg', 'assets/icon.svg')
  .replace(
    '<title>TokenGo — Your work. Unexpected achievements.</title>',
    '<meta name="description" content="TokenGo: 1,224 offline-first achievements for Codex. Hidden discoveries, Steam-style unlock cards, and shareable cabinets. Free and open source."><title>TokenGo — Your agent grinds. You collect.</title>',
  );
await writeFile(new URL('index.html', output), html);
await writeFile(
  new URL('demo-data.js', output),
  `// Generated demonstration only. Contains no user data.\nexport default ${JSON.stringify({ ...demoSnapshot(), repository: 'https://github.com/DragonYJ/TokenGo' })};\n`,
);
await writeFile(new URL('.nojekyll', output), '');
console.log('Static demo generated in dist/site. No analytics, remote fonts, or server API.');
