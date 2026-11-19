// Uses Electron's published checksums and cache; no application data is involved.
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const directory = process.argv[2];
const require = createRequire(join(directory, 'package.json'));
const { version } = require('./package.json');
const { downloadArtifact } = require('@electron/get');
const curl = process.platform === 'win32' ? 'curl.exe' : 'curl';
const hasCurl = spawnSync(curl, ['--version'], { stdio: 'ignore' }).status === 0;
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', timeout: 320000 });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(
              `Runtime preparation failed (${command}, exit ${code}). Check your connection and retry.`,
            ),
          ),
    );
  });
}
try {
  console.log('Downloading and verifying the desktop runtime from Electron releases…');
  const zip = await downloadArtifact({
    version,
    artifactName: 'electron',
    platform: process.platform,
    arch: process.arch,
    checksums: require('./checksums.json'),
    downloadOptions: { signal: AbortSignal.timeout(300000) },
    ...(hasCurl
      ? {
          downloader: {
            download: (url, target) =>
              run(curl, [
                '--fail',
                '--location',
                '--progress-bar',
                '--connect-timeout',
                '20',
                '--max-time',
                '300',
                '--retry',
                '1',
                '--output',
                target,
                url,
              ]),
          },
        }
      : {}),
  });
  const dist = join(directory, 'dist');
  await mkdir(dist, { recursive: true });
  console.log('Preparing native achievement cards…');
  if (process.platform === 'darwin') await run('/usr/bin/ditto', ['-x', '-k', zip, dist]);
  else await require('@electron-internal/extract-zip').extract(zip, { dir: dist });
  const binary =
    process.platform === 'darwin'
      ? 'Electron.app/Contents/MacOS/Electron'
      : process.platform === 'win32'
        ? 'electron.exe'
        : 'electron';
  await writeFile(join(directory, 'path.txt'), binary);
} catch (error) {
  console.error(`TokenGo runtime: ${error.message}`);
  process.exitCode = 1;
}
