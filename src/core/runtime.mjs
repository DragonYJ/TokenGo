import { emptyRates, validateRates } from './community.mjs';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
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
  try {
    engine.community = validateRates(
      JSON.parse(
        readFileSync(
          existsSync(join(directory, 'community-rates.json'))
            ? join(directory, 'community-rates.json')
            : new URL('../../community/rates.json', import.meta.url),
          'utf8',
        ),
      ),
      new Set(engine.catalog.map((a) => a.id)),
    );
  } catch {
    engine.community = emptyRates();
  }
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
    'active.minutes': 1800,
    'run.max_minutes': 740,
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
  seedDemoAnalytics(state);
  engine.evaluate('demo', '2026-11-19T06:30:00.000Z', 'demo-only');
  try {
    engine.community = validateRates(
      JSON.parse(readFileSync(new URL('../../community/rates.json', import.meta.url), 'utf8')),
      new Set(engine.catalog.map((a) => a.id)),
    );
  } catch {
    engine.community = emptyRates();
  }
  const snapshot = engine.snapshot({ demo: true });
  snapshot.settings = { watching: false, quiet: false };
  return snapshot;
}

function seedDemoAnalytics(state) {
  const weights = Array.from({ length: 84 }, (_, i) =>
    i % 8 === 2 ? 0 : Math.round(8 + 6 * Math.sin(i * 1.7) + i / 10),
  );
  const total = weights.reduce((a, b) => a + b, 0),
    remaining = { ...state.metrics };
  const end = new Date();
  end.setHours(12, 0, 0, 0);
  state.analytics.modelLabels = { 'demo-model-1': 'GPT-6', 'demo-model-2': 'GPT-5.4' };
  let active = 0;
  weights.forEach((weight, i) => {
    const date = new Date(end);
    date.setDate(date.getDate() - 83 + i);
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (!weight) return;
    active++;
    const totals = {};
    for (const key of [
      'tokens.total',
      'tokens.input',
      'tokens.output',
      'tokens.cached',
      'tokens.reasoning',
      'tasks.completed',
      'tools.total',
      'messages',
      'active.minutes',
    ]) {
      totals[key] = i === 83 ? remaining[key] : Math.floor((state.metrics[key] * weight) / total);
      remaining[key] -= totals[key];
    }
    const input = totals['tokens.input'],
      output = totals['tokens.output'];
    totals['tokens.total'] = input + output;
    const models = {};
    for (const [id, part] of [
      ['demo-model-1', 0.72],
      ['demo-model-2', 0.28],
    ])
      models[id] = Object.fromEntries(
        Object.entries(totals)
          .filter(([key]) => key.startsWith('tokens.'))
          .map(([key, value]) => [
            key,
            id === 'demo-model-1' ? Math.round(value * 0.72) : value - Math.round(value * 0.72),
          ]),
      );
    const tools = {
      shell: Math.floor(totals['tools.total'] * 0.38),
      edit: Math.floor(totals['tools.total'] * 0.32),
      search: Math.floor(totals['tools.total'] * 0.18),
      test: Math.floor(totals['tools.total'] * 0.12),
    };
    const hours = Array.from({ length: 24 }, (_, h) =>
      h >= 8 && h <= 20 ? Math.floor(totals['tools.total'] / 13) : 0,
    );
    state.analytics.days[day] = {
      totals,
      models,
      tools,
      hours,
      sessions: {
        [`demo-session-${i % 24}`]: {
          totals,
          first: date.toISOString(),
          last: date.toISOString(),
          project: `demo-project-${i % 4}`,
        },
      },
    };
  });
  state.metrics.days = active;
  state.analytics.startedAt = Object.keys(state.analytics.days).sort()[0];
  state.analytics.rebuiltAt = new Date().toISOString();
}
