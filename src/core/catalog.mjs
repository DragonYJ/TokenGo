// Declarative, finite metric vocabulary. Packs cannot execute code.
export const ladder = [
  1, 3, 5, 10, 20, 35, 50, 75, 100, 150, 250, 400, 650, 1000, 2000, 5000, 10000, 25000, 50000,
  100000,
];
export const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export const categories = {
  tokens: '能量足迹',
  tasks: '冒险旅程',
  tools: '工具大师',
  exploration: '探索世界',
  time: '时间旅人',
  code: '代码工坊',
  creative: '造物空间',
  collaboration: '协作艺术',
  hidden: '秘密档案',
};
const base = [
  ['tokens.total', '星河漫游', 'tokens', 100000, 'token', 'spark'],
  ['tokens.input', '灵感燃料', 'tokens', 100000, '输入 token', 'spark'],
  ['tokens.output', '言之有物', 'tokens', 10000, '输出 token', 'feather'],
  ['tokens.cached', '记忆回响', 'tokens', 100000, '缓存 token', 'orbit'],
  ['tokens.reasoning', '深思熟虑', 'tokens', 1000, '推理 token', 'gem'],
  ['sessions', '冒险启程', 'tasks', 1, '个会话', 'flag'],
  ['tasks.started', '新的委托', 'tasks', 1, '次任务启动', 'flag'],
  ['tasks.completed', '使命达成', 'tasks', 1, '个结束的任务', 'trophy'],
  ['messages', '对话的力量', 'tasks', 1, '条用户消息', 'feather'],
  ['tools.total', '十八般武艺', 'tools', 1, '次工具调用', 'anvil'],
  ['tools.distinct', '工具收藏家', 'exploration', 1, '种工具', 'compass'],
  ['projects', '世界地图', 'exploration', 1, '个工作目录', 'compass'],
  ['models', '多面伙伴', 'exploration', 1, '种模型', 'orbit'],
  ['days', '日积月累', 'time', 1, '个活跃日', 'sun'],
  ['streak', '如约而至', 'time', 1, '天连续活跃', 'flame'],
  ['weekends', '周末奇遇', 'time', 1, '个周末活跃日', 'sun'],
  ['active.minutes', '时间炼金术', 'time', 10, '分钟观测活跃', 'hourglass'],
  ['run.max_minutes', '专注航线', 'time', 5, '分钟单段活跃', 'hourglass'],
  ['session.max_tools', '百宝行囊', 'tools', 1, '次单会话工具调用', 'anvil'],
  ['session.max_messages', '深入交流', 'tasks', 1, '条单会话消息', 'feather'],
  ['session.max_tokens', '宇宙回声', 'tokens', 100000, '单会话 token', 'spark'],
  ['task.max_tools', '精密工程', 'tools', 1, '次单任务工具调用', 'anvil'],
  ['compactions', '记忆接力', 'collaboration', 1, '次上下文压缩', 'orbit'],
  ['tools.mcp', '连接万物', 'collaboration', 1, '次 MCP 调用', 'link'],
];
export const toolFamilies = [
  ['shell', '终端旅者', 'code', 'terminal'],
  ['read', '字里行间', 'code', 'book'],
  ['write', '落笔生花', 'code', 'feather'],
  ['edit', '精雕细琢', 'code', 'anvil'],
  ['search', '蛛丝马迹', 'exploration', 'compass'],
  ['git', '时光存档', 'code', 'branch'],
  ['test', '试炼之路', 'code', 'shield'],
  ['build', '筑梦工匠', 'code', 'anvil'],
  ['install', '装备补给', 'code', 'box'],
  ['web', '远方来信', 'exploration', 'globe'],
  ['browser', '窗口之外', 'exploration', 'globe'],
  ['image', '光影织梦', 'creative', 'gem'],
  ['video', '流动故事', 'creative', 'film'],
  ['audio', '声入人心', 'creative', 'music'],
  ['document', '纸上世界', 'creative', 'book'],
  ['spreadsheet', '格子宇宙', 'creative', 'grid'],
  ['presentation', '登台时刻', 'creative', 'flag'],
  ['pdf', '纸间旅行', 'creative', 'book'],
  ['design', '设计之眼', 'creative', 'gem'],
  ['diagram', '思路成图', 'creative', 'branch'],
  ['database', '数据寻宝', 'code', 'box'],
  ['network', '远程信号', 'code', 'link'],
  ['deploy', '启航准备', 'code', 'rocket'],
  ['debug', '问题侦探', 'code', 'compass'],
  ['agent', '并肩作战', 'collaboration', 'orbit'],
  ['plan', '胸有成竹', 'tasks', 'flag'],
  ['memory', '念念不忘', 'collaboration', 'book'],
  ['calendar', '时间规划师', 'time', 'sun'],
  ['tasks', '任务管家', 'tasks', 'trophy'],
  ['communication', '传递火花', 'collaboration', 'link'],
  ['cloud', '云端足迹', 'exploration', 'globe'],
  ['security', '守护之盾', 'code', 'shield'],
  ['monitoring', '洞察之眼', 'exploration', 'compass'],
  ['filesystem', '文件漫步', 'code', 'box'],
  ['notebook', '实验笔记', 'creative', 'book'],
  ['automation', '魔法齿轮', 'tools', 'anvil'],
];
export const families = [
  ...base,
  ...toolFamilies.map(([key, title, category, icon]) => [
    `tool.${key}`,
    title,
    category,
    1,
    '次相关调用',
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
      rarity: rarities[Math.floor(index / 4)],
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
