// Aggregate counts only: no prompts, commands, titles, paths, or raw model names.
export const blankAnalytics = () => ({
  version: 1,
  days: {},
  modelLabels: {},
  startedAt: null,
  rebuiltAt: null,
  legacy: false,
});
export function knownModelLabel(raw) {
  const match = String(raw).match(/\b(gpt-\d+(?:\.\d+)?|o[1-9]\d*)(?:[-\s/]|$)/i);
  return match ? match[1].toUpperCase() : 'Other model';
}
export function prepareAnalytics(engine, event, session, day, hour) {
  const analytics = engine.state.analytics;
  analytics.startedAt ||= event.at;
  const row = (analytics.days[day] ||= {
    totals: {},
    models: {},
    sessions: {},
    tools: {},
    hours: Array(24).fill(0),
  });
  const record = (row.sessions[event.session] ||= {
    totals: {},
    first: event.at,
    last: event.at,
    project: session.project || null,
  });
  record.first = record.first < event.at ? record.first : event.at;
  record.last = record.last > event.at ? record.last : event.at;
  if (event.kind === 'session') {
    session.project = event.project;
    record.project = event.project || null;
  }
  if (event.kind === 'model') {
    session.model = event.model;
    analytics.modelLabels[event.model] = event.modelLabel || 'Other model';
  }
  if (event.kind === 'tool' || event.kind === 'message') row.hours[hour]++;
  engine.analyticsContext = { row, record, session };
}
export function account(engine, key, value) {
  const c = engine.analyticsContext;
  if (!c) return;
  const bump = (target, k, n) => (target[k] = (target[k] || 0) + n);
  if (key.startsWith('tool.')) {
    bump(c.row.tools, key.slice(5), value);
    return;
  }
  if (
    ![
      'sessions',
      'tasks.started',
      'tasks.completed',
      'messages',
      'tools.total',
      'active.minutes',
    ].includes(key) &&
    !key.startsWith('tokens.')
  )
    return;
  bump(c.row.totals, key, value);
  bump(c.record.totals, key, value);
  if (key.startsWith('tokens.')) {
    const model = c.session.model || 'unattributed';
    const target = (c.row.models[model] ||= {});
    bump(target, key, value);
  }
}
