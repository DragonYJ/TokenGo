import test from 'node:test';
import assert from 'node:assert/strict';
import { Engine, Store } from '../src/core/engine.mjs';
import { catalog, demoSnapshot } from '../src/core/runtime.mjs';
import { aggregateReports, validateReport, validateRates } from '../src/core/community.mjs';
import { knownModelLabel } from '../src/core/analytics.mjs';
import { summarize } from '../src/ui/statistics.js';
import { Collector } from '../src/core/collector.mjs';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const all = catalog(),
  ids = new Set(all.map((a) => a.id));
test('a badge grows through three medals, preserves first unlock and never awards a duplicate', () => {
  const a = all.find((a) => a.id === 'secrets.still-working'),
    e = new Engine([a]);
  e.state.metrics['run.max_minutes'] = 120;
  assert.equal(e.evaluate('history', '2026-01-01T00:00:00Z')[0].rarity, 'bronze');
  assert.equal(e.snapshot().achievements[0].progress, 0.5);
  e.state.metrics['run.max_minutes'] = 240;
  assert.equal(e.evaluate('live', '2026-01-02T00:00:00Z')[0].rarity, 'silver');
  assert.equal(e.snapshot().achievements[0].conditions[0].gte, 720);
  e.state.metrics['run.max_minutes'] = 720;
  assert.equal(e.evaluate('live', '2026-01-03T00:00:00Z')[0].rarity, 'gold');
  const badge = e.snapshot().achievements[0];
  assert.equal(badge.progress, 1);
  assert.equal(badge.nextMedal, null);
  assert.equal(badge.award.firstUnlockedAt, '2026-01-01T00:00:00Z');
  assert.equal(e.evaluate().length, 0);
  assert.equal(e.state.journal.length, 3);
});
test('community sample deduplicates reports and counts medals cumulatively; extra personal fields rejected', () => {
  const report = {
    schema: 'tokengo-community-v1',
    participant: 'a'.repeat(32),
    achievements: [{ id: 'secrets.still-working', level: 1 }],
  };
  const upgraded = structuredClone(report);
  upgraded.achievements[0].level = 3;
  const data = aggregateReports(
    [
      { updatedAt: '2026-01-01', report },
      { updatedAt: '2026-01-02', report: upgraded },
      { updatedAt: '2026-01-03', report: { ...report, participant: 'b'.repeat(32) } },
    ],
    ids,
  );
  assert.equal(data.participants, 2);
  assert.deepEqual(data.counts['secrets.still-working'], { bronze: 2, silver: 1, gold: 1 });
  assert.deepEqual(validateRates(data, ids), data);
  assert.throws(() => validateReport({ ...report, email: 'private@example.com' }, ids));
  assert.throws(() =>
    validateReport(
      { ...report, achievements: [report.achievements[0], report.achievements[0]] },
      ids,
    ),
  );
  assert.throws(() => validateRates({ ...data, participants: 1 }, ids));
  assert.equal(aggregateReports([], ids).participants, 0);
});
test('daily aggregates deduplicate and preserve token components without retaining model suffixes', () => {
  const e = new Engine(all),
    at = '2026-01-01T10:00:00Z',
    session = 'test';
  e.consume({
    kind: 'model',
    id: 'm',
    session,
    at,
    model: 'hashed-model',
    modelLabel: knownModelLabel('gpt-5.4-private-project'),
  });
  const event = {
    kind: 'tokens',
    id: 't',
    session,
    at,
    totals: { input: 800, output: 200, total: 1000, cached: 500, reasoning: 50 },
  };
  e.consume(event);
  e.consume(event);
  const day = Object.values(e.state.analytics.days)[0];
  assert.equal(day.totals['tokens.total'], 1000);
  assert.equal(day.models['hashed-model']['tokens.cached'], 500);
  assert.equal(e.state.analytics.modelLabels['hashed-model'], 'GPT-5.4');
  assert.equal(knownModelLabel('private-project'), 'Other model');
  const demo = demoSnapshot(),
    summary = summarize(demo, 'all');
  assert.equal(summary.totals['tokens.total'], demo.metrics['tokens.total']);
  assert.equal(
    summary.totals['tokens.input'] + summary.totals['tokens.output'],
    summary.totals['tokens.total'],
  );
  assert.equal(summarize(demo, '7').series.length, 7);
  const dayKey = Object.keys(demo.analytics.days).at(-1);
  assert.equal(
    summarize(demo, '30', dayKey).totals['tokens.total'],
    demo.analytics.days[dayKey].totals['tokens.total'],
  );
});
test('statistics rebuild preserves legacy awards and totals; repeated rebuild and scan cannot double count', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'tokengo-rebuild-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'sessions'));
  const at = '2026-01-01T10:00:00Z';
  const lines = [
    { type: 'session_meta', timestamp: at, payload: { id: 'fixture', cwd: '/private/work' } },
    {
      type: 'event_msg',
      timestamp: at,
      payload: {
        type: 'token_count',
        info: {
          total_token_usage: { total_tokens: 1000000, input_tokens: 800000, output_tokens: 200000 },
        },
      },
    },
  ];
  writeFileSync(
    join(dir, 'sessions', 'test.jsonl'),
    lines.map((x) => JSON.stringify(x)).join('\n') + '\n',
  );
  const store = new Store(join(dir, 'data')),
    e = new Engine(all),
    c = new Collector(e, store, dir);
  await c.scan('history');
  const metrics = structuredClone(e.state.metrics),
    awards = structuredClone(e.state.unlocked);
  delete e.state.analytics;
  const legacy = new Engine(all, e.state),
    collector = new Collector(legacy, store, dir);
  assert.equal(legacy.state.analytics.legacy, true);
  await collector.rebuildAnalytics();
  assert.deepEqual(legacy.state.metrics, metrics);
  assert.deepEqual(legacy.state.unlocked, awards);
  assert.equal(Object.values(legacy.state.analytics.days)[0].totals['tokens.total'], 1000000);
  await collector.rebuildAnalytics();
  await collector.scan('history');
  assert.deepEqual(legacy.state.metrics, metrics);
  assert.deepEqual(legacy.state.unlocked, awards);
  assert.equal(JSON.stringify(legacy.state).includes('/private/work'), false);
});
