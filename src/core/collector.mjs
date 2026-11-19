import { readdir, stat, open } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { hash, Engine } from './engine.mjs';
import { normalize } from './codex.mjs';

async function filesIn(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
  const files = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesIn(path)));
    else if (entry.isFile() && entry.name.endsWith('.jsonl')) files.push(path);
  }
  return files.sort();
}
export class Collector {
  constructor(engine, store, codexHome) {
    this.engine = engine;
    this.store = store;
    this.home = resolve(codexHome);
    this.running = false;
    this.liveSince = Date.now();
  }
  async rebuildAnalytics() {
    if (this.running) throw new Error('A scan is already running. Try again shortly.');
    this.running = true;
    try {
      const working = new Engine(this.engine.catalog, structuredClone(this.engine.state));
      const shadow = new Engine(this.engine.catalog);
      const memoryStore = { sign: (value) => this.store.sign(value), save: () => {} };
      const fresh = new Collector(shadow, memoryStore, this.home);
      fresh.mirror = (event) => working.consume(event, 'history');
      const result = await fresh.scan('history');
      working.state.analytics = shadow.state.analytics;
      working.state.analytics.rebuiltAt = new Date().toISOString();
      working.state.analytics.legacy = false;
      working.state.offsets = { ...working.state.offsets, ...shadow.state.offsets };
      working.state.lastScan = shadow.state.lastScan;
      this.store.save(working.state);
      this.engine.state = working.state;
      this.engine.pending = [];
      return { ...result, awards: working.pending };
    } finally {
      this.running = false;
    }
  }
  async scan(source = 'live') {
    if (this.running) return null;
    this.running = true;
    const result = { files: 0, events: 0, malformed: 0, forksSkipped: 0, awards: [], source };
    try {
      const paths = [
        ...(await filesIn(join(this.home, 'sessions'))),
        ...(await filesIn(join(this.home, 'archived_sessions'))),
      ];
      for (const path of paths) {
        const fileId = hash(path),
          info = await stat(path);
        let saved = this.engine.state.offsets[fileId];
        if (!saved || info.size < saved.offset)
          saved = { offset: 0, context: { fileId, salt: this.store.sign('project-salt') } };
        if (info.size === saved.offset) continue;
        result.files++;
        const file = await open(path, 'r');
        let position = saved.offset,
          committed = position,
          buffer = Buffer.alloc(0),
          oversized = false;
        try {
          while (position < info.size) {
            const chunk = Buffer.alloc(Math.min(262144, info.size - position));
            const { bytesRead } = await file.read(chunk, 0, chunk.length, position);
            if (!bytesRead) break;
            position += bytesRead;
            buffer = Buffer.concat([buffer, chunk.subarray(0, bytesRead)]);
            let end;
            while ((end = buffer.indexOf(10)) >= 0) {
              const raw = buffer.subarray(0, end),
                consumed = end + 1;
              buffer = buffer.subarray(consumed);
              committed += consumed;
              if (oversized) {
                oversized = false;
                continue;
              }
              let record;
              try {
                record = JSON.parse(raw.toString('utf8'));
              } catch {
                result.malformed++;
                continue;
              }
              for (const event of normalize(record, saved.context)) {
                const origin =
                  source === 'live' && Date.parse(event.at) < this.liveSince ? 'history' : source;
                result.events++;
                if (this.mirror) this.mirror(event, origin);
                result.awards.push(...this.engine.consume(event, origin));
              }
            }
            if (buffer.length > 16 * 1024 * 1024) {
              committed += buffer.length;
              buffer = Buffer.alloc(0);
              oversized = true;
              result.malformed++;
            }
          }
        } finally {
          await file.close();
        }
        // Don't commit an incomplete or oversized line until its newline arrives.
        if (!oversized)
          this.engine.state.offsets[fileId] = { offset: committed, context: saved.context };
        if (saved.context.forked) result.forksSkipped++;
      }
      if (result.files || !this.engine.state.lastScan || source === 'history') {
        this.engine.state.lastScan = {
          at: new Date().toISOString(),
          files: result.files,
          events: result.events,
          malformed: result.malformed,
          forksSkipped: result.forksSkipped,
        };
        this.store.save(this.engine.state);
      }
      this.engine.pending = [];
      return result;
    } finally {
      this.running = false;
    }
  }
}
