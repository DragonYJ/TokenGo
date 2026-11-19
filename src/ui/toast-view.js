import { badge } from './badges.js';
const escape = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const labels = {
  'tokens.total': 'Total tokens',
  'tokens.input': 'Input tokens',
  'tokens.output': 'Output tokens',
  'tokens.cached': 'Cached tokens',
  'tokens.reasoning': 'Reasoning tokens',
  sessions: 'Total sessions',
  'tasks.started': 'Tasks started',
  'tasks.completed': 'Tasks ended',
  messages: 'User messages',
  'tools.total': 'Tool calls',
  'tools.distinct': 'Distinct tools',
  projects: 'Project directories',
  models: 'Distinct models',
  days: 'Active days',
  streak: 'Consecutive active days',
  weekends: 'Weekend active days',
  'active.minutes': 'Observed active minutes',
  'session.max_tools': 'Tool calls in one session',
  'session.max_messages': 'Messages in one session',
  'session.max_tokens': 'tokens in one session',
  'task.max_tools': 'Tool calls in one task',
  compactions: 'Context compactions',
  'tools.mcp': 'MCP Tool calls',
};
export function achievementFact(a) {
  return (
    (a.earnedConditions?.length ? a.earnedConditions : a.conditions || [])
      .map((c) => {
        if (c.metric === 'run.max_minutes')
          return `Agent active run reached ${c.gte % 60 === 0 ? `${c.gte / 60} hours` : `${c.gte} minutes`}`;
        return `${labels[c.metric] || 'Related tool calls'} reached ${c.gte.toLocaleString('en-US')}${c.metric.startsWith('tool.') ? ' calls' : ''}`;
      })
      .join('，') || a.description
  );
}
const icons = {
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23 22h-6.3l-4.9-7.5L5.2 22H2l7.4-8.6L1 2h6.5l4.5 6.9L18.9 2Zm-1.1 18h1.7L6.6 3.9H4.8L17.8 20Z"/></svg>',
  reddit:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="m12 8 2-6 5 1M5 10a3 3 0 1 0-3 5m17-5a3 3 0 1 1 3 5"/><circle cx="20" cy="3" r="2"/><ellipse cx="12" cy="15" rx="9" ry="6"/><circle cx="8" cy="14" r="1" fill="currentColor"/><circle cx="16" cy="14" r="1" fill="currentColor"/><path d="M8 18q4 3 8 0"/></svg>',
  other:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M5 12v8h14v-8"/></svg>',
};
export function toastMarkup(a) {
  return `<div class="toast-card"><button class="toast-dismiss" aria-label="Dismiss card">×</button><button class="toast-open" aria-label="View in achievement cabinet: ${escape(a.name)}"><span class="toast-badge">${badge(a.icon, a.rarity)}</span><span class="toast-copy"><strong>${escape(a.name)}</strong><span class="toast-fact">${escape(achievementFact(a))}</span>${a.demo ? '<span class="toast-demo">Demo</span>' : ''}${a.batch > 1 ? `<span class="toast-batch">Also unlocked ${a.batch - 1} achievements</span>` : ''}</span></button><div class="toast-share-icons" aria-label="Share achievement">${[
    ['x', 'X'],
    ['reddit', 'Reddit'],
    ['other', 'More'],
  ]
    .map(
      ([id, label]) =>
        `<button class="toast-platform ${id}" data-platform="${id}" aria-label="${id === 'other' ? 'Other sharing options' : `Share to ${label}`}">${icons[id]}<span>${label}</span></button>`,
    )
    .join('')}</div><div class="native-toast-progress"></div></div>`;
}
