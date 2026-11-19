import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Engine, Store, IntegrityError } from '../src/core/engine.mjs';
import { normalize } from '../src/core/codex.mjs';
import { Collector } from '../src/core/collector.mjs';
import { catalog, demoSnapshot } from '../src/core/runtime.mjs';
import { validatePack } from '../src/core/catalog.mjs';
const all = catalog();
const at = (minutes = 0) => new Date(Date.UTC(2026, 0, 1, 0, minutes)).toISOString();
const event = (kind, id, extra = {}) => ({ kind, id, session: 's', at: at(), ...extra });
function temp(t) {
  const dir = mkdtempSync(join(tmpdir(), 'tokengo-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}
test('1,224 unique achievements; locked secrets redact titles and conditions', () => {
  assert.equal(all.length, 1224);
  assert.equal(new Set(all.map((a) => a.id)).size, 1224);
  const e = new Engine(all);
  const secret = e.snapshot().achievements.find((a) => a.id === 'secrets.still-working');
  assert.equal(secret.name, '未发现的秘密');
  assert.equal(secret.conditions, undefined);
  assert.equal(secret.description.includes('120'), false);
});
test('duplicate events and cumulative token snapshots cannot farm achievements', () => {
  const e = new Engine(all),
    tokens = event('tokens', 'first', {
      totals: { total: 1000000, input: 800000, output: 200000, cached: 300000, reasoning: 50000 },
    });
  e.consume(tokens);
  const count = Object.keys(e.state.unlocked).length;
  e.consume(tokens);
  e.consume({ ...tokens, id: 'second' });
  assert.equal(e.state.metrics['tokens.total'], 1000000);
  assert.equal(Object.keys(e.state.unlocked).length, count);
  e.consume({ ...tokens, id: 'third', totals: { ...tokens.totals, total: 1200000 } });
  assert.equal(e.state.metrics['tokens.total'], 1200000);
});
test('a two-hour active run unlocks a hidden achievement, idle gaps do not', () => {
  const e = new Engine(all);
  e.consume(event('start', 'start'));
  for (let i = 1; i <= 120; i++)
    e.consume(event('tool', `tool-${i}`, { at: at(i), tool: 'shell', families: ['shell'] }));
  assert.ok(e.state.unlocked['secrets.still-working']);
  assert.equal(e.state.metrics['run.max_minutes'], 120);
  const idle = new Engine(all);
  idle.consume(event('start', 'start'));
  idle.consume(event('tool', 'after-idle', { at: at(120), tool: 'shell' }));
  assert.equal(idle.state.unlocked['secrets.still-working'], undefined);
});
test('task completion and stop end an active run; duplicate completion counted once', () => {
  const e = new Engine(all);
  e.consume(event('start', 'start'));
  e.consume(event('complete', 'done', { at: at(2) }));
  e.consume(event('complete', 'done', { at: at(2) }));
  e.consume(event('tool', 'late', { at: at(4), tool: 'shell' }));
  assert.equal(e.state.metrics['tasks.completed'], 1);
  assert.equal(e.state.metrics['run.max_minutes'], 2);
});
test('both token formats share one cumulative ledger; no conversation content retained', () => {
  const context = { session: 's', salt: 'salt' },
    e = new Engine(all);
  const usage = {
    total_tokens: 1500000,
    input_tokens: 1000000,
    output_tokens: 500000,
    cached_input_tokens: 200000,
  };
  const modern = {
    type: 'token_usage_record',
    timestamp: at(),
    payload: { response_id: 'r1', thread_token_usage: usage },
  };
  const legacy = {
    type: 'event_msg',
    timestamp: at(1),
    payload: { type: 'token_count', info: { total_token_usage: usage } },
  };
  for (const r of [modern, legacy]) for (const ev of normalize(r, context)) e.consume(ev);
  assert.equal(e.state.metrics['tokens.total'], 1500000);
  const message = {
    type: 'response_item',
    timestamp: at(2),
    payload: { type: 'message', role: 'user', content: [{ text: 'PRIVATE SECRET' }] },
  };
  const normalized = normalize(message, context);
  e.consume(normalized[0]);
  assert.equal(JSON.stringify(e.state).includes('PRIVATE SECRET'), false);
});
test('forked rollout replay is deliberately excluded', () => {
  const context = { fileId: 'file', salt: 's' };
  assert.deepEqual(
    normalize(
      {
        type: 'session_meta',
        timestamp: at(),
        payload: { id: 'fork', forked_from_id: 'parent', cwd: '/secret' },
      },
      context,
    ),
    [],
  );
  assert.deepEqual(
    normalize(
      { type: 'event_msg', timestamp: at(1), payload: { type: 'task_complete', turn_id: 'x' } },
      context,
    ),
    [],
  );
});
test('local state persists and detects accidental tampering without deleting evidence', (t) => {
  const dir = temp(t),
    store = new Store(dir),
    e = new Engine(all);
  e.consume(event('complete', 'done'));
  store.save(e.state);
  assert.deepEqual(store.load().unlocked, e.state.unlocked);
  const file = join(dir, 'state.json'),
    data = JSON.parse(readFileSync(file, 'utf8'));
  data.data = data.data.replace('tasks.completed":1', 'tasks.completed":999');
  writeFileSync(file, JSON.stringify(data));
  assert.throws(() => store.load(), IntegrityError);
  assert.ok(readFileSync(file, 'utf8').includes('999'));
});
test('incremental UTF-8 and CRLF reading preserves partial lines across restarts', async (t) => {
  const dir = temp(t),
    home = join(dir, 'codex');
  mkdirSync(join(home, 'sessions'), { recursive: true });
  const file = join(home, 'sessions', 'test.jsonl'),
    store = new Store(join(dir, 'state')),
    e = new Engine(all),
    collector = new Collector(e, store, home);
  const meta = JSON.stringify({
    type: 'session_meta',
    timestamp: at(),
    payload: { id: 's', timestamp: at(), cwd: '/private/项目' },
  });
  const msg = JSON.stringify({
    type: 'response_item',
    timestamp: at(1),
    payload: { type: 'message', role: 'user', content: [{ text: '用户秘密' }] },
  });
  writeFileSync(file, meta + '\r\n' + msg.slice(0, 40));
  await collector.scan('history');
  assert.equal(e.state.metrics.sessions, 1);
  assert.equal(e.state.metrics.messages, undefined);
  writeFileSync(file, meta + '\r\n' + msg + '\r\n');
  await collector.scan('history');
  assert.equal(e.state.metrics.messages, 1);
  const restarted = new Engine(all, store.load()),
    next = new Collector(restarted, store, home);
  await next.scan('live');
  assert.equal(restarted.state.metrics.messages, 1);
  assert.equal(readFileSync(join(dir, 'state', 'state.json'), 'utf8').includes('用户秘密'), false);
  assert.equal(readFileSync(join(dir, 'state', 'state.json'), 'utf8').includes('/private/'), false);
});
test('archive moves cannot double count a session', async (t) => {
  const dir = temp(t),
    home = join(dir, 'codex');
  mkdirSync(join(home, 'sessions'), { recursive: true });
  mkdirSync(join(home, 'archived_sessions'), { recursive: true });
  const text =
    JSON.stringify({
      type: 'session_meta',
      timestamp: at(),
      payload: { id: 's', timestamp: at() },
    }) +
    '\n' +
    JSON.stringify({
      type: 'event_msg',
      timestamp: at(1),
      payload: { type: 'task_complete', turn_id: 't' },
    }) +
    '\n';
  writeFileSync(join(home, 'sessions', 'one.jsonl'), text);
  writeFileSync(join(home, 'archived_sessions', 'one.jsonl'), text);
  const store = new Store(join(dir, 'state')),
    e = new Engine(all);
  await new Collector(e, store, home).scan('history');
  assert.equal(e.state.metrics.sessions, 1);
  assert.equal(e.state.metrics['tasks.completed'], 1);
});
test('invalid custom pack conditions are rejected; demo never populates real state', () => {
  assert.throws(() =>
    validatePack({
      id: 'bad',
      achievements: [
        {
          id: 'bad.x',
          name: 'x',
          description: 'x',
          category: 'tools',
          rarity: 'rare',
          hidden: false,
          conditions: [{ metric: 'run_arbitrary_code', gte: 1 }],
        },
      ],
    }),
  );
  assert.equal(demoSnapshot().demo, true);
  assert.equal(Object.keys(new Engine(all).state.unlocked).length, 0);
});
