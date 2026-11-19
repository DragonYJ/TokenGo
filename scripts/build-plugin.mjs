import { build } from 'esbuild';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
const out = new URL('../plugins/tokengo/', import.meta.url);
await mkdir(out, { recursive: true });
const ui = await build({
  entryPoints: ['src/mcp/app.js'],
  bundle: true,
  write: false,
  format: 'esm',
  target: 'es2022',
  minify: true,
  metafile: true,
  plugins: [
    {
      name: 'no-demo',
      setup(b) {
        b.onResolve({ filter: /demo-data\.js$/ }, () => ({ path: 'demo', namespace: 'empty' }));
        b.onLoad({ filter: /.*/, namespace: 'empty' }, () => ({
          contents: 'export default null;',
        }));
      },
    },
  ],
});
let html = await readFile(new URL('../src/ui/index.html', import.meta.url), 'utf8');
html = html
  .replace(/<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>/, '')
  .replace(/<link rel="icon"[^>]+\/>/, '');
for (const file of ['style.css', 'expansion.css', 'theme.css'])
  html = html.replace(`<link rel="stylesheet" href="${file}" />`, '');
const css = (
  await Promise.all(
    ['style.css', 'expansion.css', 'theme.css'].map((file) =>
      readFile(new URL('../src/ui/' + file, import.meta.url), 'utf8'),
    ),
  )
).join('\n');
html = html.replace(
  '</head>',
  () =>
    `<style>${css}\n.titlebar{display:none!important} body{padding-top:0} .sidebar{top:0} .workspace{padding-top:0}</style></head>`,
);
html = html.replace(
  '<script type="module" src="app.js"></script>',
  () =>
    `<script type="module">${ui.outputFiles[0].text.replaceAll('</script', '<\\/script')}</script>`,
);
await writeFile(new URL('cabinet.html', out), html);
const server = await build({
  entryPoints: ['src/mcp/server.mjs'],
  outfile: 'plugins/tokengo/server.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  minify: true,
  metafile: true,
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
});
await copyFile(new URL('../assets/icon.svg', import.meta.url), new URL('icon.svg', out));
const dependencies = new Set(
  [...Object.keys(ui.metafile.inputs), ...Object.keys(server.metafile.inputs)]
    .map((file) => file.match(/^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//)?.[1])
    .filter(Boolean),
);
const notices = [];
for (const directory of [...dependencies].sort()) {
  const pkg = JSON.parse(await readFile(directory + '/package.json', 'utf8'));
  let license;
  for (const name of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'license']) {
    try {
      license = await readFile(directory + '/' + name, 'utf8');
      break;
    } catch {}
  }
  if (!license) throw new Error('Missing bundled dependency license: ' + pkg.name);
  notices.push(`${pkg.name} ${pkg.version}\n${'='.repeat(60)}\n${license}`);
}
await writeFile(new URL('THIRD_PARTY_NOTICES.txt', out), notices.join('\n\n'));
console.log('Built offline sidebar plugin: bundled MCP server and cabinet resource.');
