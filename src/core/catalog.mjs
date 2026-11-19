// Declarative, finite metric vocabulary. Packs cannot execute code.
export const ladder = [
  1, 3, 5, 10, 20, 35, 50, 75, 100, 150, 250, 400, 650, 1000, 2000, 5000, 10000, 25000, 50000,
  100000,
];
export const rarities = ['bronze', 'silver', 'gold'];
export const categories = {
  tokens: 'General',
  tasks: 'Quests',
  tools: 'Professions',
  exploration: 'Exploration',
  time: 'Dedication',
  code: 'Engineering',
  creative: 'Creation',
  collaboration: 'Cooperation',
  hidden: 'Feats of strength',
};
const base = [
  ['tokens.total', 'Token Voyager', 'tokens', 100000, 'token', 'spark'],
  ['tokens.input', 'Fuel for Thought', 'tokens', 100000, 'Input tokens', 'spark'],
  ['tokens.output', 'Words into Worlds', 'tokens', 10000, 'Output tokens', 'feather'],
  ['tokens.cached', 'Cache Me If You Can', 'tokens', 100000, 'Cached tokens', 'orbit'],
  ['tokens.reasoning', 'Deep Thinker', 'tokens', 1000, 'Reasoning tokens', 'gem'],
  ['sessions', 'Adventure Awaits', 'tasks', 1, 'sessions', 'flag'],
  ['tasks.started', 'Quest Accepted', 'tasks', 1, 'task starts', 'flag'],
  ['tasks.completed', 'Quest Complete', 'tasks', 1, 'ended tasks', 'trophy'],
  ['messages', 'Keep Talking', 'tasks', 1, 'user messages', 'feather'],
  ['tools.total', 'Tool Time', 'tools', 1, 'tool calls', 'anvil'],
  ['tools.distinct', 'Well Equipped', 'exploration', 1, 'tools', 'compass'],
  ['projects', 'World Map', 'exploration', 1, 'project directories', 'compass'],
  ['models', 'Many Minds', 'exploration', 1, 'models', 'orbit'],
  ['days', 'Day by Day', 'time', 1, 'active days', 'sun'],
  ['streak', 'Back for More', 'time', 1, 'consecutive active days', 'flame'],
  ['weekends', 'Weekend Side Quest', 'time', 1, 'weekend active days', 'sun'],
  ['active.minutes', 'Time Alchemist', 'time', 10, 'observed active minutes', 'hourglass'],
  ['run.max_minutes', 'In the Zone', 'time', 5, 'minutes in one active run', 'hourglass'],
  ['session.max_tools', 'Bag of Tricks', 'tools', 1, 'tool calls in one session', 'anvil'],
  ['session.max_messages', 'Long Conversation', 'tasks', 1, 'messages in one session', 'feather'],
  ['session.max_tokens', 'Cosmic Echo', 'tokens', 100000, 'tokens in one session', 'spark'],
  ['task.max_tools', 'Precision Engineering', 'tools', 1, 'tool calls in one task', 'anvil'],
  ['compactions', 'Memory Relay', 'collaboration', 1, 'context compactions', 'orbit'],
  ['tools.mcp', 'Connected Worlds', 'collaboration', 1, 'MCP calls', 'link'],
];
export const toolFamilies = [
  ['shell', 'Terminal Traveler', 'code', 'terminal'],
  ['read', 'Between the Lines', 'code', 'book'],
  ['write', 'Put It in Writing', 'code', 'feather'],
  ['edit', 'Fine Tuning', 'code', 'anvil'],
  ['search', 'On the Trail', 'exploration', 'compass'],
  ['git', 'Save Point', 'code', 'branch'],
  ['test', 'Trial Run', 'code', 'shield'],
  ['build', 'Master Builder', 'code', 'anvil'],
  ['install', 'Supply Drop', 'code', 'box'],
  ['web', 'Beyond the Horizon', 'exploration', 'globe'],
  ['browser', 'Window Shopping', 'exploration', 'globe'],
  ['image', 'Picture This', 'creative', 'gem'],
  ['video', 'Moving Pictures', 'creative', 'film'],
  ['audio', 'Sound Check', 'creative', 'music'],
  ['document', 'Paper Worlds', 'creative', 'book'],
  ['spreadsheet', 'Cell Wizard', 'creative', 'grid'],
  ['presentation', 'Showtime', 'creative', 'flag'],
  ['pdf', 'Paper Trail', 'creative', 'book'],
  ['design', 'Design Eye', 'creative', 'gem'],
  ['diagram', 'Connect the Dots', 'creative', 'branch'],
  ['database', 'Data Delver', 'code', 'box'],
  ['network', 'Signal Found', 'code', 'link'],
  ['deploy', 'Ready for Launch', 'code', 'rocket'],
  ['debug', 'Bug Detective', 'code', 'compass'],
  ['agent', 'Party Up', 'collaboration', 'orbit'],
  ['plan', 'A Cunning Plan', 'tasks', 'flag'],
  ['memory', 'Never Forget', 'collaboration', 'book'],
  ['calendar', 'Time Keeper', 'time', 'sun'],
  ['tasks', 'Quest Keeper', 'tasks', 'trophy'],
  ['communication', 'Pass the Spark', 'collaboration', 'link'],
  ['cloud', 'Cloud Walker', 'exploration', 'globe'],
  ['security', 'Shield Bearer', 'code', 'shield'],
  ['monitoring', 'Watchful Eye', 'exploration', 'compass'],
  ['filesystem', 'File Explorer', 'code', 'box'],
  ['notebook', 'Lab Notes', 'creative', 'book'],
  ['automation', 'Clockwork Magic', 'tools', 'anvil'],
];
export const families = [
  ...base,
  ...toolFamilies.map(([key, title, category, icon]) => [
    `tool.${key}`,
    title,
    category,
    1,
    'related tool calls',
    icon,
  ]),
];
export const knownMetrics = new Set(families.map((f) => f[0]));
const dailyMilestones = [
  1, 2, 3, 5, 7, 10, 14, 21, 30, 45, 60, 90, 120, 180, 270, 365, 500, 730, 1000, 1825,
];
const overrides = {
  models: Array.from({ length: 20 }, (_, i) => i + 1),
  'tools.distinct': [
    1, 2, 3, 4, 5, 7, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 400, 500,
  ],
  projects: [1, 2, 3, 5, 8, 12, 16, 20, 30, 40, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 2000],
  days: dailyMilestones,
  streak: dailyMilestones,
  weekends: dailyMilestones,
  'run.max_minutes': [
    1, 2, 3, 5, 8, 10, 15, 20, 30, 45, 60, 75, 90, 120, 150, 180, 240, 360, 480, 720,
  ],
  'session.max_tools': [
    1, 3, 5, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 1500, 2000, 5000,
  ],
  'task.max_tools': [
    1, 3, 5, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 1500, 2000, 5000,
  ],
  'session.max_messages': [
    1, 2, 3, 5, 8, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 2000,
  ],
};
export function validatePack(pack) {
  if (
    !pack ||
    typeof pack.id !== 'string' ||
    !Array.isArray(pack.achievements) ||
    pack.achievements.length > 5000
  )
    throw new Error('Invalid achievement pack');
  const ids = new Set();
  for (const a of pack.achievements) {
    if (!/^[a-z0-9][a-z0-9._-]{1,95}$/.test(a.id) || ids.has(a.id))
      throw new Error(`Duplicate or invalid id: ${a.id}`);
    ids.add(a.id);
    if (
      typeof a.name !== 'string' ||
      a.name.length > 80 ||
      typeof a.description !== 'string' ||
      a.description.length > 400
    )
      throw new Error(`Invalid text: ${a.id}`);
    if (!categories[a.category] || !rarities.includes(a.rarity))
      throw new Error(`Invalid category/rarity: ${a.id}`);
    if (!Array.isArray(a.conditions) || !a.conditions.length || a.conditions.length > 8)
      throw new Error(`Missing conditions: ${a.id}`);
    for (const c of a.conditions)
      if (!knownMetrics.has(c.metric) || !Number.isFinite(c.gte) || c.gte <= 0)
        throw new Error(`Invalid metric or threshold: ${a.id}`);
    if (typeof a.hidden !== 'boolean') throw new Error(`Missing hidden boolean: ${a.id}`);
    if (a.icon && !/^[a-z]+$/.test(a.icon)) throw new Error(`Invalid icon: ${a.id}`);
  }
  return pack;
}
export function createCatalog(packs = []) {
  const catalog = families.flatMap(([metric, title, category, scale, unit, icon]) =>
    (overrides[metric] || ladder.map((n) => n * scale)).map((threshold, index) => ({
      id: `core.${metric}.${index + 1}`,
      name: `${title} ${String(index + 1).padStart(2, '0')}`,
      description: `${threshold.toLocaleString('en-US')} ${unit}`,
      category,
      icon,
      family: metric,
      tier: index + 1,
      rarity: 'bronze',
      hidden: false,
      conditions: [{ metric, gte: threshold }],
      version: 1,
      pack: 'core',
    })),
  );
  const ids = new Set(catalog.map((a) => a.id));
  for (const pack of packs)
    for (const a of validatePack(pack).achievements) {
      if (ids.has(a.id)) throw new Error(`Duplicate catalog id: ${a.id}`);
      ids.add(a.id);
      catalog.push({ ...a, version: a.version || 1, pack: pack.id });
    }
  return catalog;
}
