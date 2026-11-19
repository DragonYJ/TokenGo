#!/usr/bin/env node
import { homedir } from 'node:os';
import { join } from 'node:path';
import { runtime } from './core/runtime.mjs';
const command = process.argv[2];
if (['enable', 'disable', 'status'].includes(command)) {
  try {
    const { configure } = await import('./launcher/follow.mjs');
    await configure(command);
  } catch (error) {
    console.error(`TokenGo: ${error.message}`);
    process.exitCode = 1;
  }
} else if (command === 'start' || command === 'open') {
  try {
    const { launch } = await import('./launcher/launch.mjs');
    await launch(process.argv.slice(3));
  } catch (error) {
    console.error(`TokenGo: ${error.message}`);
    process.exitCode = 1;
  }
} else {
  if (!['scan', 'watch'].includes(command)) {
    console.log(
      `TokenGo — local achievements for Codex

  tokengo start --collect   Open the cabinet and enable local collection
  tokengo enable           Follow Codex automatically (macOS)
  tokengo disable          Stop following Codex
  tokengo status           Inspect the follow service
  tokengo open              Open without changing collection preferences
  tokengo start --foreground  Keep the desktop process attached to this terminal
  tokengo scan              Scan history once (headless)
  tokengo watch             Collect in this terminal (headless)

The first desktop launch downloads an Electron runtime. Collection stays offline.
Close the cabinet to keep collecting in the tray; choose Quit to stop.
Uses CODEX_HOME and TOKENGO_HOME. Desktop and headless records have separate defaults.`,
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
}
