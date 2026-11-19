import { formatLocale } from './i18n.js';
const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const short = (n) =>
  new Intl.NumberFormat(formatLocale(), { notation: 'compact', maximumFractionDigits: 1 }).format(
    n || 0,
  );
const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const sum = (target, values) => {
  for (const [key, value] of Object.entries(values || {}))
    if (Number.isFinite(value)) target[key] = (target[key] || 0) + value;
};
export function summarize(snapshot, range = '30', selectedDay = null) {
  const analytics = snapshot.analytics || { days: {}, modelLabels: {} };
  const keys = Object.keys(analytics.days).sort();
  const end = snapshot.demo && keys.length ? new Date(keys.at(-1) + 'T12:00:00') : new Date();
  end.setHours(12, 0, 0, 0);
  const start = new Date(end);
  start.setDate(
    start.getDate() -
      (range === 'all'
        ? Math.max(
            0,
            Math.round((end - new Date((keys[0] || dateKey(end)) + 'T12:00:00')) / 86400000),
          )
        : Number(range) - 1),
  );
  const startKey = dateKey(start),
    endKey = dateKey(end);
  const days = keys.filter((day) =>
    selectedDay ? day === selectedDay : day >= startKey && day <= endKey,
  );
  const totals = {},
    models = {},
    sessions = {},
    tools = {},
    hours = Array(24).fill(0);
  for (const day of days) {
    const row = analytics.days[day];
    sum(totals, row.totals);
    sum(tools, row.tools);
    for (const [id, counts] of Object.entries(row.models || {})) sum((models[id] ||= {}), counts);
    for (const [id, session] of Object.entries(row.sessions || {})) {
      const target = (sessions[id] ||= {
        id,
        totals: {},
        first: session.first,
        last: session.last,
        project: session.project,
      });
      sum(target.totals, session.totals);
      target.first = target.first < session.first ? target.first : session.first;
      target.last = target.last > session.last ? target.last : session.last;
    }
    (row.hours || []).forEach((n, i) => (hours[i] += n));
  }
  const series = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = dateKey(d);
    series.push({ day, totals: analytics.days[day]?.totals || {} });
  }
  return {
    totals,
    models,
    sessions: Object.values(sessions),
    tools,
    hours,
    series,
    days: days.length,
    start: startKey,
    end: endKey,
    labels: analytics.modelLabels || {},
  };
}
function kpi(label, value, note, icon) {
  return `<article class="metric-card"><span class="metric-symbol">${icon}</span><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`;
}
function dailyChart(data, metric, selectedDay) {
  const max = Math.max(1, ...data.series.map((d) => d.totals[metric] || 0));
  return `<div class="daily-chart" role="group" aria-label="Daily activity chart"><div class="chart-scale"><span>${short(max)}</span><span>${short(max / 2)}</span><span>0</span></div><div class="chart-bars">${data.series
    .map((d) => {
      const n = d.totals[metric] || 0;
      return `<button class="chart-day ${selectedDay === d.day ? 'selected' : ''}" data-stats-day="${d.day}" aria-label="${d.day}: ${n.toLocaleString(formatLocale())} ${metric === 'tokens.total' ? 'tokens' : 'tasks'}" title="${d.day} · ${n.toLocaleString(formatLocale())}"><span style="height:${Math.max(n ? 2 : 0, (100 * n) / max)}%"></span></button>`;
    })
    .join(
      '',
    )}</div></div><div class="chart-dates"><span>${data.start}</span><span>Click a day to inspect</span><span>${data.end}</span></div>`;
}
function modelRows(data) {
  const sorted = Object.entries(data.models).sort(
    (a, b) => (b[1]['tokens.total'] || 0) - (a[1]['tokens.total'] || 0),
  );
  return sorted.length
    ? sorted
        .map(
          ([id, row]) =>
            `<tr><td><span class="model-dot"></span>${esc(id === 'unattributed' ? 'Unattributed' : data.labels[id] || 'Other model')}<small class="table-secondary">${esc(id === 'unattributed' ? 'No model context' : id.slice(0, 8))}</small></td><td>${short(row['tokens.input'])}</td><td>${short(row['tokens.output'])}</td><td>${short(row['tokens.cached'])}</td><td class="table-emphasis">${short(row['tokens.total'])}</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="5" class="table-empty">No model usage in this period.</td></tr>';
}
export function renderStatistics(snapshot, options = {}) {
  const {
    range = '30',
    metric = 'tokens.total',
    selectedDay = null,
    sort = 'tokens.total',
  } = options;
  const d = summarize(snapshot, range, selectedDay),
    total = d.totals;
  const input = total['tokens.input'] || 0,
    cached = total['tokens.cached'] || 0,
    output = total['tokens.output'] || 0;
  const sessions = [...d.sessions].sort((a, b) => (b.totals[sort] || 0) - (a.totals[sort] || 0));
  const tools = Object.entries(d.tools)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8),
    toolMax = Math.max(1, ...tools.map((x) => x[1]));
  const hoursMax = Math.max(1, ...d.hours);
  return `<section class="page-heading statistics-heading"><div><span class="section-kicker">The story behind the badges</span><h1>Your adventure, in numbers.</h1><p>Local Codex activity. No account, no live pricing calls, no upload.</p></div><button class="button secondary" data-action="analytics-rebuild" ${snapshot.demo ? 'disabled' : ''}>↻ Rebuild from local logs</button></section>
 <div class="statistics-toolbar"><div class="period-tabs" role="group" aria-label="Statistics period">${[
   ['7', '7 days'],
   ['30', '30 days'],
   ['90', '90 days'],
   ['all', 'All time'],
 ]
   .map(
     ([id, label]) =>
       `<button data-stats-range="${id}" class="${range === id ? 'active' : ''}">${label}</button>`,
   )
   .join(
     '',
   )}</div><span class="muted">${selectedDay ? `<button class="text-button" data-action="stats-reset-day">${selectedDay} × Clear day filter</button>` : `${d.start} — ${d.end}`}</span></div>
 ${snapshot.analytics?.legacy ? '<div class="banner">Earlier records do not have daily aggregates yet. Rebuild statistics from local logs; earned badges are preserved.</div>' : ''}
 <div class="metric-grid">${kpi('Total tokens', short(total['tokens.total']), 'Input + output; cache is not added twice', '✦')}${kpi('Tasks ended', short(total['tasks.completed']), 'Completion markers, not quality scores', '⚑')}${kpi('Active sessions', d.sessions.length, 'Distinct sessions with activity', '◈')}${kpi('Observed active time', `${short((total['active.minutes'] || 0) / 60)} h`, `${d.days} active days in this period`, '◷')}</div>
 <div class="statistics-panels"><section class="analytics-panel trend-panel"><div class="section-header"><div><h2>Activity over time</h2><p class="panel-subtitle">A little work, adding up.</p></div><div class="segmented">${[
   ['tokens.total', 'Tokens'],
   ['tasks.completed', 'Tasks'],
 ]
   .map(
     ([id, label]) =>
       `<button class="${metric === id ? 'active' : ''}" data-stats-metric="${id}">${label}</button>`,
   )
   .join(
     '',
   )}</div></div>${dailyChart(d, metric, selectedDay)}</section><section class="analytics-panel token-panel"><h2>Where the tokens go</h2><div class="token-ring" style="--cached:${input ? Math.min(100, (100 * cached) / input) : 0}%"><div><strong>${input ? Math.min(100, (100 * cached) / input).toFixed(1) + '%' : '—'}</strong><span>Input cached</span></div></div><div class="token-legend"><span><i class="legend-input"></i>Input <b>${short(input)}</b></span><span><i class="legend-output"></i>Output <b>${short(output)}</b></span><span><i class="legend-cache"></i>Cache read <b>${short(cached)}</b></span></div><p class="panel-footnote">Cache is part of input. Reasoning is part of output. Costs are not estimated.</p></section></div>
 <div class="statistics-panels equal"><section class="analytics-panel"><div class="section-header"><h2>Model mix</h2><span class="muted">${Object.keys(d.models).length} model groups</span></div><div class="table-scroll"><table class="data-table"><thead><tr><th>Model family</th><th>Input</th><th>Output</th><th>Cached</th><th>Total</th></tr></thead><tbody>${modelRows(d)}</tbody></table></div><p class="panel-footnote">Only public model families are named. Other identifiers stay anonymous.</p></section><section class="analytics-panel"><div class="section-header"><h2>Your tool belt</h2><span class="muted">${short(total['tools.total'])} calls</span></div>${tools.length ? `<div class="tool-bars">${tools.map(([name, n]) => `<div class="tool-row"><span>${esc(name)}</span><div><i style="width:${(100 * n) / toolMax}%"></i></div><b>${n}</b></div>`).join('')}</div>` : '<p class="table-empty">No categorized tool calls in this period.</p>'}<p class="panel-footnote">Categories can overlap. A call is not proof of a successful result.</p></section></div>
 <section class="analytics-panel rhythm-panel"><div><h2>Your daily rhythm</h2><p class="panel-subtitle">Messages and tool calls by local hour</p></div><div class="hour-bars">${d.hours.map((n, i) => `<div title="${String(i).padStart(2, '0')}:00 · ${n} events"><span style="height:${Math.max(n ? 3 : 0, (80 * n) / hoursMax)}px"></span><small>${i % 3 === 0 ? String(i).padStart(2, '0') : ''}</small></div>`).join('')}</div></section>
 <section class="analytics-panel session-panel"><div class="section-header"><div><h2>Session explorer</h2><p class="panel-subtitle">Anonymous local references. No conversation titles or project paths.</p></div><select id="stats-sort" aria-label="Sort sessions">${[
   ['tokens.total', 'Most tokens'],
   ['tools.total', 'Most tool calls'],
   ['tasks.completed', 'Most tasks'],
 ]
   .map(([id, label]) => `<option value="${id}" ${sort === id ? 'selected' : ''}>${label}</option>`)
   .join(
     '',
   )}</select></div><div class="table-scroll"><table class="data-table"><thead><tr><th>Session</th><th>Last activity</th><th>Project</th><th>Tasks</th><th>Tools</th><th>Tokens</th></tr></thead><tbody>${
   sessions.length
     ? sessions
         .slice(0, 20)
         .map(
           (s) =>
             `<tr><td>Session ${esc(s.id.slice(-8))}</td><td>${esc(s.last?.slice(0, 10) || '—')}</td><td>${s.project ? `Project ${esc(s.project.slice(-6))}` : '—'}</td><td>${s.totals['tasks.completed'] || 0}</td><td>${s.totals['tools.total'] || 0}</td><td class="table-emphasis">${short(s.totals['tokens.total'])}</td></tr>`,
         )
         .join('')
     : '<tr><td colspan="6" class="table-empty">No sessions yet. Start collecting or rebuild from local logs.</td></tr>'
 }</tbody></table></div>${sessions.length > 20 ? '<p class="panel-footnote">Showing the top 20 sessions for this period.</p>' : ''}</section>
 <p class="statistics-method">Counts use deduplicated local records. Active time sums gaps of up to five minutes and may overlap across parallel sessions. Historical logs that are missing, compressed or forked are not included. This is a view of available records, not a complete billing ledger.</p>`;
}
