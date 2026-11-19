import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createCatalog } from './catalog.mjs';
import { Engine, Store, emptyState } from './engine.mjs';
import { Collector } from './collector.mjs';
export function catalog() {
  const directory = fileURLToPath(new URL('../../packs/', import.meta.url));
  return createCatalog(
    readdirSync(directory)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .map((f) => JSON.parse(readFileSync(join(directory, f), 'utf8'))),
  );
}
export function runtime(directory, codexHome) {
  const store = new Store(directory),
    engine = new Engine(catalog(), store.load());
  engine.evaluate('migration');
  store.save(engine.state);
  return { store, engine, collector: new Collector(engine, store, codexHome) };
}
export function demoSnapshot() {
  const state = emptyState();
  state.metrics = {
    'tokens.total': 2847600,
    'tokens.input': 2200000,
    'tokens.output': 647600,
    'tokens.cached': 1150000,
    'tokens.reasoning': 114000,
    sessions: 24,
    'tasks.started': 81,
    'tasks.completed': 78,
    messages: 216,
    'tools.total': 840,
    'tools.distinct': 18,
    projects: 4,
    models: 3,
    days: 12,
    streak: 7,
    weekends: 3,
    'active.minutes': 720,
    'run.max_minutes': 126,
    'session.max_tools': 105,
    'session.max_messages': 32,
    'session.max_tokens': 680000,
    'task.max_tools': 62,
    compactions: 4,
    'tools.mcp': 48,
    'tool.shell': 235,
    'tool.edit': 168,
    'tool.read': 190,
    'tool.search': 76,
    'tool.git': 32,
    'tool.test': 24,
    'tool.image': 3,
    'tool.web': 16,
    'tool.agent': 5,
    'tool.build': 18,
    'tool.document': 4,
  };
  const engine = new Engine(catalog(), state);
  engine.evaluate('demo', '2026-11-19T06:30:00.000Z', 'demo-only');
  const snapshot = engine.snapshot({ demo: true });
  snapshot.settings = { watching: false, quiet: false };
  return snapshot;
}
