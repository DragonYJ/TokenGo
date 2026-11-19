import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const hash = (value) => createHash('sha256').update(String(value)).digest('hex');
export function emptyState() {
  return {
    version: 1,
    metrics: {},
    sets: {},
    seen: {},
    sessions: {},
    offsets: {},
    unlocked: {},
    journal: [],
    settings: { watching: false, quiet: false },
    lastScan: null,
  };
}
export class IntegrityError extends Error {}
export class Store {
  constructor(directory) {
    this.directory = directory;
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    this.file = join(directory, 'state.json');
    this.keyFile = join(directory, 'integrity.key');
    if (existsSync(this.file) && !existsSync(this.keyFile))
      throw new IntegrityError('本地完整性密钥丢失。请恢复备份，或选择一个新的数据目录。');
    if (!existsSync(this.keyFile))
      writeFileSync(this.keyFile, randomBytes(32), { mode: 0o600, flag: 'wx' });
    this.key = readFileSync(this.keyFile);
  }
  sign(data) {
    return createHmac('sha256', this.key).update(data).digest('hex');
  }
  load() {
    if (!existsSync(this.file)) return emptyState();
    try {
      const saved = JSON.parse(readFileSync(this.file, 'utf8'));
      const expected = Buffer.from(this.sign(saved.data), 'hex'),
        actual = Buffer.from(saved.mac || '', 'hex');
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
        throw new Error('signature');
      const state = JSON.parse(saved.data);
      if (state.version !== 1) throw new Error('version');
      let previous = '0';
      for (const entry of state.journal) {
        const { digest, ...body } = entry;
        if (body.previous !== previous || hash(JSON.stringify(body)) !== digest)
          throw new Error('chain');
        previous = digest;
      }
      return state;
    } catch {
      throw new IntegrityError(
        '本地记录完整性校验失败，已停止采集。原文件保持不变，请恢复可信备份。',
      );
    }
  }
  save(state) {
    const data = JSON.stringify(state),
      tmp = this.file + '.tmp';
    writeFileSync(tmp, JSON.stringify({ data, mac: this.sign(data) }), { mode: 0o600 });
    renameSync(tmp, this.file);
  }
}
export class Engine {
  constructor(catalog, state = emptyState()) {
    this.catalog = catalog;
    this.state = state;
    this.pending = [];
    this.dirty = new Set();
    this.index = new Map();
    for (const a of catalog)
      for (const c of a.conditions) {
        if (!this.index.has(c.metric)) this.index.set(c.metric, []);
        this.index.get(c.metric).push(a);
      }
  }
  increment(key, value = 1) {
    if (Number.isFinite(value) && value > 0) {
      this.state.metrics[key] = (this.state.metrics[key] || 0) + value;
      this.dirty.add(key);
    }
  }
  maximum(key, value) {
    if (Number.isFinite(value) && value > (this.state.metrics[key] || 0)) {
      this.state.metrics[key] = value;
      this.dirty.add(key);
    }
  }
  distinct(key, value) {
    if (!value) return;
    const set = (this.state.sets[key] ||= {});
    if (Object.hasOwn(set, value)) return;
    set[value] = true;
    this.state.metrics[key] = Object.keys(set).length;
    this.dirty.add(key);
  }
  consume(event, source = 'live') {
    if (
      !event ||
      typeof event.id !== 'string' ||
      typeof event.session !== 'string' ||
      ['__proto__', 'constructor', 'prototype'].includes(event.session) ||
      this.state.seen[event.id]
    )
      return [];
    this.dirty.clear();
    const timestamp = Date.parse(event.at);
    if (!Number.isFinite(timestamp) || timestamp > Date.now() + 300000) return [];
    this.state.seen[event.id] = true;
    const s = (this.state.sessions[event.session] ||= {
      tools: 0,
      messages: 0,
      tokens: 0,
      run: 0,
      last: 0,
      taskTools: 0,
      active: false,
      totals: {},
    });
    const at = new Date(timestamp),
      day = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`;
    this.distinct('days', day);
    if ([0, 6].includes(at.getDay())) this.distinct('weekends', day);
    const days = Object.keys(this.state.sets.days).sort();
    let streak = 1,
      best = 1;
    for (let i = 1; i < days.length; i++) {
      streak = Date.parse(days[i]) - Date.parse(days[i - 1]) === 86400000 ? streak + 1 : 1;
      best = Math.max(best, streak);
    }
    this.maximum('streak', best);
    if (s.active && s.last && timestamp > s.last) {
      const gap = (timestamp - s.last) / 60000;
      if (gap <= 5) {
        s.run += gap;
        this.increment('active.minutes', gap);
        this.maximum('run.max_minutes', s.run);
      } else {
        s.run = 0;
      }
    }
    s.last = Math.max(s.last, timestamp);
    switch (event.kind) {
      case 'session':
        this.increment('sessions');
        this.distinct('projects', event.project);
        break;
      case 'model':
        this.distinct('models', event.model);
        break;
      case 'start':
        this.increment('tasks.started');
        s.active = true;
        s.run = 0;
        s.taskTools = 0;
        break;
      case 'complete':
        this.increment('tasks.completed');
        s.active = false;
        s.run = 0;
        break;
      case 'stop':
        s.active = false;
        s.run = 0;
        break;
      case 'message':
        this.increment('messages');
        s.messages++;
        this.maximum('session.max_messages', s.messages);
        break;
      case 'compaction':
        this.increment('compactions');
        break;
      case 'tool':
        this.increment('tools.total');
        s.tools++;
        if (s.active) s.taskTools++;
        this.maximum('session.max_tools', s.tools);
        this.maximum('task.max_tools', s.taskTools);
        this.distinct('tools.distinct', event.tool);
        if (event.mcp) this.increment('tools.mcp');
        for (const family of event.families || []) this.increment(`tool.${family}`);
        break;
      case 'tokens':
        for (const key of ['total', 'input', 'output', 'cached', 'reasoning']) {
          const total = event.totals[key];
          if (!Number.isFinite(total) || total < 0) continue;
          const delta = Math.max(0, total - (s.totals[key] || 0));
          s.totals[key] = Math.max(s.totals[key] || 0, total);
          this.increment(`tokens.${key}`, delta);
          if (key === 'total') s.tokens += delta;
        }
        this.maximum('session.max_tokens', s.tokens);
        break;
    }
    const candidates = new Set([...this.dirty].flatMap((key) => this.index.get(key) || []));
    return this.evaluate(source, event.at, event.id, candidates);
  }
  evaluate(
    source = 'live',
    at = new Date().toISOString(),
    evidence = 'migration',
    candidates = this.catalog,
  ) {
    const awards = [];
    for (const a of candidates) {
      if (
        this.state.unlocked[a.id] ||
        !a.conditions.every((c) => (this.state.metrics[c.metric] || 0) >= c.gte)
      )
        continue;
      const record = {
        id: a.id,
        at,
        source,
        version: a.version,
        evidence,
        values: a.conditions.map((c) => ({
          metric: c.metric,
          value: this.state.metrics[c.metric],
        })),
      };
      const body = { ...record, previous: this.state.journal.at(-1)?.digest || '0' };
      this.state.journal.push({ ...body, digest: hash(JSON.stringify(body)) });
      this.state.unlocked[a.id] = record;
      awards.push({ ...a, ...record });
    }
    this.pending.push(...awards);
    return awards;
  }
  snapshot({ demo = false } = {}) {
    return {
      demo,
      metrics: this.state.metrics,
      settings: this.state.settings,
      lastScan: this.state.lastScan,
      achievements: this.catalog.map((a) => {
        const award = this.state.unlocked[a.id],
          progress = Math.min(
            ...a.conditions.map((c) => Math.min(1, (this.state.metrics[c.metric] || 0) / c.gte)),
          );
        if (a.hidden && !award)
          return {
            id: a.id,
            name: '未发现的秘密',
            description: '继续你的旅程，惊喜会在某个瞬间出现。',
            category: 'hidden',
            rarity: a.rarity,
            hidden: true,
            icon: 'lock',
            locked: true,
            progress: 0,
          };
        return {
          ...a,
          locked: !award,
          progress,
          award,
          conditions: a.conditions.map((c) => ({
            ...c,
            current: this.state.metrics[c.metric] || 0,
          })),
        };
      }),
    };
  }
}
