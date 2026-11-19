import { homedir } from 'node:os';
import { join } from 'node:path';
import { runtime } from './core/runtime.mjs';
const command = process.argv[2];
if (!['scan', 'watch'].includes(command)) {
  console.log(
    'TokenGo: node src/cli.mjs scan | watch\nUses CODEX_HOME and TOKENGO_HOME. No outbound network.',
  );
  process.exit(0);
}
try {
  const { collector } = runtime(
    process.env.TOKENGO_HOME || join(homedir(), '.tokengo'),
    process.env.CODEX_HOME || join(homedir(), '.codex'),
  );
  const scan = async (source) => {
    const result = await collector.scan(source);
    if (result)
      console.log(
        JSON.stringify({
          files: result.files,
          events: result.events,
          unlocked: result.awards.map((a) => ({ id: a.id, name: a.name })),
          malformed: result.malformed,
          forksSkipped: result.forksSkipped,
        }),
      );
  };
  await scan('history');
  if (command === 'watch')
    setInterval(() => scan('live').catch((e) => console.error(e.message)), 5000);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
