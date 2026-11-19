import { t } from './i18n.js';
import { achievementFact } from './toast-view.js';
export const isDemoShare = (awards, demo = false) =>
  demo || awards.some((a) => a.demo || a.source === 'demo' || a.award?.source === 'demo');
export function shareTitle(awards, demo = false) {
  return `${isDemoShare(awards, demo) ? `[${t('Demo')}] ` : ''}${t('Achievement unlocked')}: ${awards.map((a) => t(a.name)).join(', ')}`;
}
export function shareCopy(awards, demo, repo) {
  return [
    shareTitle(awards, demo),
    awards.length === 1 ? t(achievementFact(awards[0])) : t('My Codex achievements'),
    t('Collect your own Codex achievements'),
    repo,
  ].join('\n');
}
