import { icon } from './icons.js';
import { isDemoShare, shareTitle, shareCopy } from './share-copy.js';
import { languages } from './languages/registry.js';
import { renderStatistics } from './statistics.js';
let statsOptions = { range: '30', metric: 'tokens.total', selectedDay: null, sort: 'tokens.total' };
import { t, translateDOM, setLanguage, getLanguage, formatLocale } from './i18n.js';
import { toastMarkup, achievementFact } from './toast-view.js';
import { badge, glyph, palette, rarityNames } from './badges.js';
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
const desktop = Boolean(window.tokenGo),
  repo = 'https://github.com/DragonYJ/TokenGo';
let cabinetFocus = null;
let webToastTimer;
let state,
  view = 'collection',
  tab = 'all',
  category = 'all',
  query = '',
  rarity = 'all',
  page = 1,
  selected = null,
  sharing = [],
  busy = false;
const categoryLabels = {
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
const viewLabels = {
  collection: 'Achievement cabinet',
  hidden: 'Feats of strength',
  cabinet: 'My showcase',
  activity: 'Unlock history',
  statistics: 'Statistics',
  community: 'Community',
  settings: 'Settings',
};
const sourceNames = {
  history: 'Historical discovery',
  live: 'Live observation',
  migration: 'Rule update',
  demo: 'Demo record',
};
const fmt = (n) =>
  new Intl.NumberFormat(formatLocale(), {
    notation: n >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(n || 0);
const earned = () => state.achievements.filter((a) => !a.locked);
const pinsKey = () => `tokengo.pins.${state.demo ? 'demo' : 'local'}`;
function pins() {
  try {
    return JSON.parse(localStorage.getItem(pinsKey()) || '[]').filter((id) =>
      state.achievements.some((a) => a.id === id && !a.locked),
    );
  } catch {
    return [];
  }
}
function notify(message) {
  $('#snackbar').textContent = t(message);
  $('#snackbar').classList.add('visible');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => $('#snackbar').classList.remove('visible'), 3200);
}
async function invoke(action, payload) {
  try {
    if (desktop) return await window.tokenGo.invoke(action, payload);
    if (action === 'open-repo') {
      window.open(repo, '_blank', 'noopener,noreferrer');
      return true;
    }
    if (action === 'copy-text') {
      await navigator.clipboard.writeText(payload);
      return true;
    }
    if (action === 'save-image') {
      const a = document.createElement('a');
      a.href = payload;
      a.download = 'TokenGo-achievement.png';
      a.click();
      return true;
    }
    if (action === 'copy-image') {
      const blob = await new Promise((resolve) => $('#share-canvas').toBlob(resolve));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return true;
    }
    if (action === 'share') {
      const url =
        payload.platform === 'x'
          ? `https://x.com/intent/post?text=${encodeURIComponent(payload.text)}`
          : `https://www.reddit.com/submit?selftext=true&title=${encodeURIComponent(payload.title)}&text=${encodeURIComponent(payload.text)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      return true;
    }
    if (action === 'demo-toast') {
      webToast();
      return true;
    }
    notify('This is the demo. Install the desktop app to collect your own achievements locally.');
    return null;
  } catch (error) {
    notify(`Could not finish: ${error.message}`);
    return null;
  }
}
function updateChrome() {
  $('#view-label').textContent = viewLabels[view];
  $('#nav-total').textContent = state.achievements.length.toLocaleString();
  $('#profile-mode').textContent = state.demo
    ? 'Demo adventurer · sample data'
    : `${earned().length} achievements · local record`;
  $('#mode-indicator').innerHTML =
    `<i class="status-dot"></i> ${state.demo ? 'Demo gallery' : state.settings.watching ? 'Collecting locally' : 'Collection paused'}`;
  document
    .querySelectorAll('[data-view]')
    .forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  $('#banner').hidden = !state.demo;
  $('#banner').textContent =
    'You are exploring a demo. Progress is fictional and share cards are marked Demo. Your real records stay on your device.';
}
function stat(icon, value, label) {
  return `<div class="stat"><div><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div></div>`;
}
function featuredCard(a) {
  return `<button class="featured ${a.rarity}" data-achievement="${a.id}" style="--rarity:${palette[a.rarity][0]}"><div class="featured-badge">${badge(a.icon, a.rarity, a.locked)}</div><div class="featured-info"><span class="rarity-tag">${rarityNames[a.rarity]}${a.hidden ? ' · Hidden achievement' : ''}</span><h3>${esc(a.name)}</h3><p>${esc(a.locked ? a.description : achievementFact(a))}</p><small>${a.locked ? 'Waiting on your next adventure' : `${state.demo ? 'Demo unlock' : sourceNames[a.award.source] || 'Local record'}`}</small></div></button>`;
}
function card(a) {
  const progress = Math.round(a.progress * 100),
    current = a.conditions?.[0];
  return `<button class="achievement ${a.locked ? 'locked' : 'unlocked'}" data-achievement="${a.id}" style="--rarity:${palette[a.rarity][0]}" aria-label="${esc(a.name)}, ${a.locked ? 'Locked' : 'Unlocked'}"><span class="rarity-corner">${rarityNames[a.rarity]}</span>${!a.locked ? `<span class="earned-check">${icon('check')}</span>` : ''}${pins().includes(a.id) ? `<span class="pin-mark" aria-label="Pinned">${icon('pin')}</span>` : ''}<div class="achievement-badge">${badge(a.icon, a.rarity, a.hidden && a.locked)}</div><h3>${esc(a.name)}</h3><p>${esc(a.locked ? a.description : achievementFact(a))}</p>${medals(a)}<div class="progress"><span style="width:${progress}%"></span></div><div class="progress-label"><span>${a.hidden && a.locked ? 'Undiscovered' : a.medalLevel < 3 && current ? `${fmt(current.current)} / ${fmt(current.gte)}` : 'Gold complete'}</span><span>${a.hidden && a.locked ? '—' : `${progress}%`}</span></div>${communityRate(a)}</button>`;
}
function communityRate(a) {
  const sample = state.community || { participants: 0, counts: {} };
  if (!sample.participants) return '<span class="community-rate">No community sample yet</span>';
  const grade = a.rarity || 'bronze',
    n = sample.counts[a.id]?.[grade] || 0;
  return `<span class="community-rate">${((100 * n) / sample.participants).toFixed(1)}% of community sample · ${rarityNames[grade]}<br>n = ${sample.participants} · self-reported</span>`;
}
function medals(a) {
  return `<div class="medal-levels">${['bronze', 'silver', 'gold'].map((m, i) => `<span class="${m} ${(a.medalLevel || 0) > i ? 'achieved' : ''}">● ${rarityNames[m]}</span>`).join('')}</div>`;
}
function showcase() {
  const awards = pins().map((id) => state.achievements.find((a) => a.id === id));
  return `<section class="cabinet-stage"><div class="section-header"><div><h2>Pinned achievements</h2><p>Choose up to six earned badges</p></div><button class="button" data-action="share-cabinet" ${awards.length ? '' : 'disabled'}>Share showcase ↗</button></div><div class="cabinet-slots">${Array.from({ length: 6 }, (_, i) => (awards[i] ? `<div class="cabinet-slot filled"><button data-achievement="${awards[i].id}" class="showcase-medal">${badge(awards[i].icon, awards[i].rarity)}<strong>${esc(awards[i].name)}</strong></button>${medals(awards[i])}<div class="progress"><span style="width:${awards[i].progress * 100}%"></span></div><small>${awards[i].nextMedal ? 'Next: ' + rarityNames[awards[i].nextMedal] + ' · ' + Math.round(awards[i].progress * 100) + '%' : 'Gold complete'}</small><button data-unpin="${awards[i].id}" class="text-button">Unpin</button></div>` : `<div class="cabinet-slot"><span class="empty-slot">${icon('plus')}</span><strong>Empty slot</strong><small>Choose an earned badge to pin here</small></div>`)).join('')}</div></section>`;
}
function collection() {
  const domains = Object.entries(categoryLabels)
    .map(([id, label]) => {
      const all = state.achievements.filter((a) => a.category === id),
        n = all.filter((a) => !a.locked).length;
      return `<button class="domain-button ${category === id ? 'active' : ''}" data-category="${id}"><span>${label}<small>${n} / ${all.length}</small></span><div class="progress"><span style="width:${(100 * n) / all.length}%"></span></div></button>`;
    })
    .join('');
  const near = state.achievements
    .filter((a) => !a.hidden && a.medalLevel < 3)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3);
  return `<div class="page-heading"><h1>Codex achievements</h1><p>Collected locally from your Codex activity</p></div><section class="stats">${stat('trophy', earned().length + '<small> / ' + state.achievements.length + '</small>', 'Achievements collected')}${stat('spark', fmt(state.metrics['tokens.total']), 'Total tokens')}${stat('flag', fmt(state.metrics['tasks.completed']), 'Tasks ended')}${stat('flame', `${state.metrics.streak || 0}<small> days</small>`, 'Longest streak')}</section><div class="collection-layout"><div class="collection-main">${cabinetFocus ? `<section class="focused-award"><span class="section-kicker">Recently earned</span>${featuredCard(cabinetFocus)}<p>${esc(achievementFact(cabinetFocus))}</p></section>` : ''}${showcase()}${category === 'all' ? `<div class="section-header"><h2>Next medals</h2><button class="text-button" data-view="statistics">Explore your statistics ↗</button></div><div class="achievement-grid next-milestones">${near.map(card).join('')}</div>` : `<div class="section-header"><h2>${categoryLabels[category]}</h2><button class="text-button" data-category="all">Back to overview</button></div>${filters()}<div id="results"></div>`}</div><aside class="domain-nav"><span class="section-kicker">Categories</span><button class="domain-button ${category === 'all' ? 'active' : ''}" data-category="all">Overview</button>${domains}<p>Each achievement grows through Bronze, Silver and Gold.</p><button class="button secondary" data-action="${state.demo ? 'install' : state.settings.watching ? 'preview' : 'watch'}">${state.demo ? 'Get TokenGo ↗' : state.settings.watching ? 'Preview an unlock' : 'Start collecting'}</button></aside></div>`;
}
function filters() {
  return `<div class="toolbar"><div class="tabs" role="tablist" aria-label="Achievement status">${[
    ['all', 'All achievements', state.achievements.length],
    ['earned', 'Unlocked', earned().length],
    [
      'progress',
      'In progress',
      state.achievements.filter((a) => a.medalLevel < 3 && a.progress > 0).length,
    ],
  ]
    .map(
      ([id, label, count]) =>
        `<button role="tab" aria-selected="${tab === id}" class="tab ${tab === id ? 'active' : ''}" data-tab="${id}">${label}<small>${count}</small></button>`,
    )
    .join(
      '',
    )}</div><div class="filter-controls"><label class="search-wrap"><span>${icon('search')}</span><input id="search" type="search" placeholder="Search" aria-label="Search achievements" value="${esc(query)}"></label><select id="rarity" aria-label="Filter medal level"><option value="all">All medals</option>${Object.entries(
    rarityNames,
  )
    .map(
      ([id, label]) => `<option value="${id}" ${rarity === id ? 'selected' : ''}>${label}</option>`,
    )
    .join('')}</select></div></div>${
    view === 'hidden' || view === 'collection'
      ? ''
      : `<div class="categories"><button class="chip ${category === 'all' ? 'active' : ''}" data-category="all">All domains</button>${Object.entries(
          categoryLabels,
        )
          .map(
            ([id, label]) =>
              `<button class="chip ${category === id ? 'active' : ''}" data-category="${id}">${label}</button>`,
          )
          .join('')}</div>`
  }`;
}
function renderResults() {
  let all = state.achievements.filter(
    (a) =>
      (view !== 'hidden' || a.hidden) &&
      (category === 'all' || a.category === category) &&
      (rarity === 'all' || a.rarity === rarity) &&
      (tab === 'all' || (tab === 'earned' ? !a.locked : a.medalLevel < 3 && a.progress > 0)) &&
      `${a.name} ${a.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  // Interleave tiers so the first page is a world of possibilities, not twenty token thresholds.
  all.sort((a, b) => (a.tier || 1.5) - (b.tier || 1.5) || a.category.localeCompare(b.category));
  const pages = Math.max(1, Math.ceil(all.length / 12));
  page = Math.min(page, pages);
  $('#results').innerHTML = all.length
    ? `<div class="achievement-grid">${all
        .slice((page - 1) * 12, page * 12)
        .map(card)
        .join(
          '',
        )}</div><div class="pagination"><span>Total ${all.length.toLocaleString()} achievements · Page ${page} / ${pages}</span><div><button data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>Previous</button><button data-page="${page + 1}" ${page === pages ? 'disabled' : ''}>Next</button></div></div>`
    : `<div class="empty"><div class="empty-icon">${glyph('compass')}</div><h3>No footsteps here yet</h3><p>${query ? 'Try another keyword or change your filters.' : 'Keep exploring. The next achievement is out there.'}</p><button class="button secondary" data-action="clear">Browse achievements</button></div>`;
  translateDOM($('#results'));
}

function hidden() {
  return `<div class="page-heading"><h1>Feats of strength</h1><p>24 hidden achievements in your everyday work. Titles and conditions stay secret until unlocked.</p></div>${filters()}<div id="results"></div>`;
}
function cabinet() {
  return collection();
}
function statistics() {
  return renderStatistics(state, statsOptions);
}
function activity() {
  return `<div class="page-heading"><h1>Unlock history</h1><p>Unlock times and sources, stored only on your device.</p></div>${
    earned().length
      ? earned()
          .sort((a, b) => b.award.at.localeCompare(a.award.at))
          .slice(0, 100)
          .map(
            (a) =>
              `<div class="timeline-row"><div class="timeline-badge">${badge(a.icon, a.rarity)}</div><div><h3>${esc(a.name)}</h3><p>${sourceNames[a.award.source] || 'Local record'} · ${rarityNames[a.rarity]}${a.hidden ? ' · Hidden achievement' : ''}</p></div><time>${new Date(a.award.at).toLocaleString(formatLocale())}</time><button data-achievement="${a.id}">View</button></div>`,
          )
          .join('')
      : '<div class="empty"><div class="empty-icon">' +
        glyph('flag') +
        '</div><h3>A new story starts here</h3><p>No unlocks yet. Scan local Codex history or start collecting.</p><button class="button" data-action="scan">Scan history</button></div>'
  }${earned().length > 100 ? '<p class="muted">Showing your latest 100 unlocks. Export all records from Settings.</p>' : ''}`;
}
function settings() {
  return `<div class="page-heading"><h1>Settings</h1><p>No account needed. Nothing uploads automatically. You decide when to share.</p></div><section class="settings-panel"><h2>Background & notifications</h2><div class="setting-row"><div>Collect in the background<p>Incrementally checks Codex logs every 5 seconds. The tray companion can keep collecting when the window is closed.</p></div><label class="switch"><input id="watch-toggle" type="checkbox" aria-label="Collect in the background" ${state.settings.watching ? 'checked' : ''}></label></div><div class="setting-row"><div>Quiet mode<p>Keep collecting without popups.</p></div><label class="switch"><input id="quiet-toggle" type="checkbox" aria-label="Quiet mode" ${state.settings.quiet ? 'checked' : ''}></label></div><div class="setting-row"><div>Launch at login<p>Off by default. Enable after installing the packaged desktop app.</p></div><label class="switch"><input id="startup-toggle" type="checkbox" aria-label="Launch at login" ${state.startup ? 'checked' : ''}></label></div><div class="setting-row"><div>Unlock cards<p>Preview a card using an earned achievement. If none are available, a labeled example is shown.</p></div><button class="button secondary" data-action="preview">Preview card</button></div></section><section class="settings-panel"><h2>Records & trust</h2><div class="setting-row"><div>Discover past achievements<p>Read-only scan of local Codex logs. Historical discoveries are labeled and do not flood you with popups.</p></div><button class="button secondary" data-action="scan">Scan history</button></div><div class="setting-row"><div>Export achievements<p>Export badge IDs, unlock times and numeric evidence. No conversations, code, or paths.</p></div><button class="button secondary" data-action="export">Export JSON</button></div><div class="setting-row"><div>Local records, not official certification<p>Integrity checks detect basic edits. A device owner can still forge data; local badges are not certified competitive results.</p></div></div><div class="setting-row"><div>Latest scan<p>${state.lastScan ? `${new Date(state.lastScan.at).toLocaleString(formatLocale())} · ${state.lastScan.files} changed files · ${state.lastScan.events} normalized events · ${state.lastScan.forksSkipped} fork files skipped` : 'Your Codex logs have not been read. Scanning begins only when you choose to start.'}</p></div></div></section>`;
}
function community() {
  return `<section class="settings-panel"><h2>Community unlock rates</h2><p>${state.community?.participants || 0} voluntary participants. These are community sample rates, never global rates. Snapshot: ${state.community?.updatedAt ? new Date(state.community.updatedAt).toLocaleDateString(formatLocale()) : 'Not yet published'}.</p><p>Contribute only a random participant ID and earned badge IDs with medal levels. No prompts, code, usage totals or paths. GitHub submissions are public and linked to your GitHub account. Participation is optional; nothing is sent automatically.</p><button class="button" data-action="community-report" ${state.demo ? 'disabled' : ''}>Preview my contribution</button> <button class="button secondary" data-action="community-import" ${state.demo ? 'disabled' : ''}>Import sample file</button><pre id="community-preview" class="code-sample"></pre><div id="community-consent" hidden><label><input type="checkbox" id="consent-check"> I understand that my GitHub account and this report will be public.</label><p><button class="button secondary" data-action="community-copy">Copy report</button> <button class="button" data-action="community-submit">Open GitHub submission ↗</button></p><p>Paste and review the report on GitHub. You publish it yourself. Maintainer-approved reports are aggregated; reports are self-reported, not certified.</p></div></section><div class="page-heading"><h1>Community</h1><p>An open workshop for unexpected achievements. Add a badge or build something of your own.</p></div><div class="community-grid"><article class="community-card"><h3>Contribute a badge</h3><p>A fun title and an observable rule. JSON packs need no engine changes and execute no arbitrary code.</p></article><article class="community-card"><h3>Make it look like you</h3><p>Design badge art, share cards and showcase themes. Every adventure can have its own look.</p></article><article class="community-card"><h3>Build what comes next</h3><p>Write local adapters for other agents or explicitly opt-in community extensions.</p></article></div><section class="settings-panel" style="margin-top:24px"><div class="section-header"><h2>A badge starts here</h2><button class="button secondary" data-action="install">Join us on GitHub ↗</button></div><pre class="code-sample">${esc(JSON.stringify({ id: 'community.still-working', name: 'Still Grinding. I’m AFK.', description: 'Agent active run reached 2 hours.', category: 'hidden', rarity: 'bronze', hidden: true, icon: 'hourglass', conditions: [{ metric: 'run.max_minutes', gte: 120 }] }, null, 2))}</pre><p class="muted" style="font-size:12px;line-height:1.8">MIT licensed · Auditable rules · Built to extend<br>Share links point to the open-source project. No personal tracking codes. No paid server required.</p></section>`;
}
function render() {
  updateChrome();
  document.querySelectorAll('[data-icon]').forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
  $('#content').innerHTML = {
    collection,
    hidden,
    cabinet,
    activity,
    settings,
    community,
    statistics,
  }[view]();
  if ($('#results')) renderResults();
  translateDOM(document.body);
  if ($('#language')) $('#language').value = getLanguage();
}
function go(next) {
  view = next;
  page = 1;
  category = 'all';
  query = '';
  tab = 'all';
  rarity = 'all';
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function showDetail(id) {
  selected = state.achievements.find((a) => a.id === id);
  if (!selected) return;
  const a = selected;
  $('#detail-body').innerHTML =
    `<div class="detail-badge">${badge(a.icon, a.rarity, a.hidden && a.locked)}</div><span class="rarity-tag" style="justify-content:center;--rarity:${palette[a.rarity][0]}">${rarityNames[a.rarity]}${a.hidden ? ' · Hidden achievement' : ''}</span><h2 class="detail-title">${esc(a.name)}</h2><p class="detail-desc">${esc(a.locked ? a.description : achievementFact(a))}</p>${medals(a)}${communityRate(a)}<div class="detail-conditions">${a.hidden && a.locked ? 'This secret is still out there. Stay curious and keep doing your thing.' : `<strong>${a.medalLevel < 3 ? 'Next medal requirement' : 'Gold requirement'}</strong><br>${a.conditions.map((c) => `${esc(c.metric)}: ${fmt(c.current)} / ${fmt(c.gte)}`).join('<br>')}${a.award ? `<br><br>${sourceNames[a.award.source] || 'Local record'} · ${new Date(a.award.at).toLocaleString(formatLocale())}` : ''}`}</div>${!a.locked ? `<div class="detail-actions"><button class="button secondary" data-action="pin">${pins().includes(a.id) ? 'Unpin from showcase' : 'Pin to showcase'}</button><button class="button" data-action="share">Share this moment ↗</button></div>` : ''}<p class="detail-footnote">${state.demo ? 'Demo data · not a real achievement' : 'Local record · not officially certified'}<br>Evidence stays on your device. No automatic upload.</p>`;
  translateDOM($('#detail-dialog'));
  if (!$('#detail-dialog').open) $('#detail-dialog').showModal();
}
function togglePin(id) {
  let ids = pins();
  if (ids.includes(id)) ids = ids.filter((x) => x !== id);
  else {
    if (ids.length >= 6) {
      notify('Your showcase has six slots. Unpin a badge to make room.');
      return;
    }
    ids.push(id);
  }
  localStorage.setItem(pinsKey(), JSON.stringify(ids));
  render();
  if ($('#detail-dialog').open) showDetail(id);
  notify(ids.includes(id) ? 'Pinned to your showcase' : 'Removed from your showcase');
}
async function drawShare(awards) {
  const canvas = $('#share-canvas'),
    ctx = canvas.getContext('2d');
  const baseFill = CanvasRenderingContext2D.prototype.fillText;
  ctx.fillText = function (text, ...args) {
    return baseFill.call(this, t(text), ...args);
  };
  ctx.fillStyle = '#141516';
  ctx.fillRect(0, 0, 1200, 675);
  ctx.fillStyle = '#ededeb';
  ctx.font = '500 30px -apple-system, sans-serif';
  ctx.fillText('TokenGo', 60, 65);
  ctx.fillStyle = '#a3a4a6';
  ctx.font = '18px -apple-system, sans-serif';
  ctx.fillText(
    isDemoShare(awards, state.demo)
      ? 'Demo achievement · sample data'
      : 'Local record · not officially certified',
    60,
    100,
  );
  const drawBadge = async (a, x, y, w) => {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(badge(a.icon, a.rarity));
    await img.decode();
    ctx.drawImage(img, x, y, w, (w * 156) / 140);
  };
  const drawMedalTrack = (a, x, y) => {
    const grades = ['bronze', 'silver', 'gold'];
    const level = a.medalLevel || grades.indexOf(a.rarity) + 1;
    grades.forEach((grade, i) => {
      ctx.fillStyle = i < level ? palette[grade][0] : '#3a3b3d';
      ctx.fillRect(x + i * 28, y, 20, 3);
    });
  };
  if (awards.length === 1) {
    const a = awards[0];
    await drawBadge(a, 815, 145, 250);
    drawMedalTrack(a, 902, 460);
    ctx.fillStyle = palette[a.rarity][0];
    ctx.font = '20px -apple-system, sans-serif';
    ctx.fillText(
      `${a.hidden ? 'Hidden achievement unlocked' : 'Achievement unlocked'}  /  ${rarityNames[a.rarity]}`,
      60,
      218,
    );
    ctx.fillStyle = '#ededeb';
    ctx.font = '500 48px -apple-system, sans-serif';
    ctx.fillText(a.name, 56, 302, 720);
    ctx.fillStyle = '#a3a4a6';
    ctx.font = '24px -apple-system, sans-serif';
    wrapText(ctx, t(achievementFact(a)), 60, 364, 680, 38);
    ctx.fillStyle = '#a3a4a6';
    ctx.font = '18px -apple-system, sans-serif';
    ctx.fillText(
      `${sourceNames[a.award.source] || 'Local record'} · ${new Date(a.award.at).toLocaleDateString(formatLocale())}`,
      60,
      470,
    );
  } else {
    ctx.fillStyle = '#ededeb';
    ctx.font = '500 32px -apple-system, sans-serif';
    ctx.fillText('My Codex achievements', 60, 162);
    const width = 1080 / awards.length;
    for (let i = 0; i < awards.length; i++) {
      const a = awards[i],
        x = 60 + i * width;
      await drawBadge(a, x + (width - 115) / 2, 225, 115);
      ctx.fillStyle = palette[a.rarity][0];
      ctx.font = '16px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(a.name, x + width / 2, 392, width - 12);
      ctx.fillStyle = '#a3a4a6';
      ctx.font = '14px -apple-system, sans-serif';
      ctx.fillText(rarityNames[a.rarity], x + width / 2, 425);
      ctx.textAlign = 'left';
      drawMedalTrack(a, x + width / 2 - 38, 450);
    }
  }
  ctx.strokeStyle = '#37383a';
  ctx.beginPath();
  ctx.moveTo(60, 540);
  ctx.lineTo(1140, 540);
  ctx.stroke();
  ctx.fillStyle = '#ededeb';
  ctx.font = '20px -apple-system, sans-serif';
  ctx.fillText('Collect your own Codex achievements', 60, 588);
  ctx.fillStyle = '#a3a4a6';
  ctx.font = '17px -apple-system, sans-serif';
  ctx.fillText('github.com/DragonYJ/TokenGo', 60, 623);
  ctx.fillStyle = '#a3a4a6';
  ctx.textAlign = 'right';
  ctx.fillText('Offline achievements. Free & open source.', 1140, 608);
  ctx.textAlign = 'left';
}
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  let line = '';
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxWidth) {
      ctx.fillText(line, x, y);
      line = ch;
      y += lineHeight;
    } else line += ch;
  }
  ctx.fillText(line, x, y);
}
async function showShare(awards) {
  sharing = awards.filter((a) => a && !a.locked);
  if (!sharing.length) return;
  $('#detail-dialog').close();
  $('#share-dialog').showModal();
  await drawShare(sharing);
  $('#share-text').value = shareCaption(sharing);
  translateDOM($('#share-dialog'));
}
function webToast() {
  clearTimeout(webToastTimer);
  const found = state.achievements.find((a) => a.id === 'secrets.still-working' && !a.locked);
  const a = {
    ...(found || {
      id: 'demo',
      name: 'Still Grinding. I’m AFK.',
      description: 'Agent active run reached 12 hours.',
      rarity: 'gold',
      icon: 'hourglass',
      conditions: [{ metric: 'run.max_minutes', gte: 720 }],
      award: { source: 'demo', at: new Date().toISOString() },
    }),
    demo: true,
  };
  $('#web-toast').innerHTML = toastMarkup(a);
  translateDOM($('#web-toast'));
  const hide = () => {
    clearTimeout(webToastTimer);
    $('#web-toast').innerHTML = '';
  };
  webToastTimer = setTimeout(hide, 6500);
  $('#web-toast').onmouseenter = () => clearTimeout(webToastTimer);
  $('#web-toast').onmouseleave = () => {
    if ($('#web-toast .toast-card')) webToastTimer = setTimeout(hide, 6500);
  };
  $('.toast-dismiss').onclick = hide;
  $('.toast-open').onclick = () => {
    hide();
    cabinetFocus = a;
    go('collection');
  };
  document.querySelectorAll('#web-toast [data-platform]').forEach(
    (button) =>
      (button.onclick = () => {
        const platform = button.dataset.platform;
        hide();
        if (platform !== 'other')
          invoke('share', {
            platform,
            text: shareCaption([a]),
            title: shareTitle([a], state.demo),
          });
        showShare([a]);
      }),
  );
}
function shareCaption(awards) {
  return shareCopy(awards, state.demo, repo);
}
document.addEventListener('click', async (event) => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.hasAttribute('data-close')) {
    target.closest('dialog').close();
    return;
  }
  if (target.dataset.view) {
    go(target.dataset.view);
    return;
  }
  if (target.dataset.achievement) {
    showDetail(target.dataset.achievement);
    return;
  }
  if (target.dataset.tab) {
    tab = target.dataset.tab;
    page = 1;
    render();
    return;
  }
  if (target.dataset.category) {
    category = target.dataset.category;
    page = 1;
    render();
    return;
  }
  if (target.dataset.page) {
    page = Number(target.dataset.page);
    renderResults();
    return;
  }
  if (target.dataset.unpin) {
    togglePin(target.dataset.unpin);
    return;
  }
  if (target.dataset.statsRange) {
    statsOptions.range = target.dataset.statsRange;
    statsOptions.selectedDay = null;
    render();
    return;
  }
  if (target.dataset.statsMetric) {
    statsOptions.metric = target.dataset.statsMetric;
    render();
    return;
  }
  if (target.dataset.statsDay) {
    statsOptions.selectedDay = target.dataset.statsDay;
    render();
    return;
  }
  const action = target.dataset.action;
  if (action === 'stats-reset-day') {
    statsOptions.selectedDay = null;
    render();
    return;
  }
  if (action === 'analytics-rebuild') {
    target.disabled = true;
    const result = await invoke(action);
    if (result) {
      state = result;
      render();
    } else target.disabled = false;
    return;
  }
  if (action === 'community-report') {
    const report = await invoke(action);
    if (report) {
      $('#community-preview').textContent = JSON.stringify(report, null, 2);
      $('#community-consent').hidden = false;
      translateDOM($('#content'));
    }
    return;
  }
  if (action === 'community-copy' || action === 'community-submit') {
    if ($('#consent-check')?.checked) {
      await invoke(action);
      if (action === 'community-copy') notify('Report copied');
    }
    return;
  }
  if (action === 'community-import') {
    const result = await invoke(action);
    if (result) {
      state = result;
      render();
    }
    return;
  }

  if (['activity', 'cabinet'].includes(action)) {
    go(action);
    return;
  }
  if (action === 'clear') {
    query = '';
    category = 'all';
    tab = 'all';
    rarity = 'all';
    render();
    return;
  }
  if (action === 'install') {
    invoke('open-repo');
    return;
  }
  if (action === 'preview') {
    invoke('demo-toast');
    return;
  }
  if (action === 'pin') {
    togglePin(selected.id);
    return;
  }
  if (action === 'share') {
    await showShare([selected]);
    return;
  }
  if (action === 'share-cabinet') {
    await showShare(pins().map((id) => state.achievements.find((a) => a.id === id)));
    return;
  }
  if (action === 'export') {
    if (await invoke('export')) notify('Achievement records exported');
    return;
  }
  if (['watch', 'scan'].includes(action) && !busy) {
    busy = true;
    target.disabled = true;
    const old = target.textContent;
    target.textContent = 'Scanning locally…';
    try {
      const result = await invoke(action, action === 'watch' ? true : undefined);
      if (result) {
        state = result;
        render();
        notify(
          action === 'watch'
            ? 'Collection is on. Every record stays on this device.'
            : 'History scan complete. Meet your new achievements.',
        );
      }
    } finally {
      busy = false;
      target.disabled = false;
      target.textContent = old;
    }
  }
});
document.addEventListener('input', (event) => {
  if (event.target.id === 'search') {
    query = event.target.value;
    page = 1;
    renderResults();
  }
});
document.addEventListener('change', async (event) => {
  if (event.target.id === 'language') {
    setLanguage(event.target.value);
    localStorage.setItem('tokengo.language', getLanguage());
    if (desktop) await invoke('language', getLanguage());
    render();
    return;
  }
  if (event.target.id === 'stats-sort') {
    statsOptions.sort = event.target.value;
    render();
    return;
  }
  if (event.target.id === 'rarity') {
    rarity = event.target.value;
    page = 1;
    renderResults();
  }
  const actions = { 'watch-toggle': 'watch', 'quiet-toggle': 'quiet', 'startup-toggle': 'startup' };
  if (actions[event.target.id]) {
    const result = await invoke(actions[event.target.id], event.target.checked);
    if (result) {
      state = result;
      render();
    } else event.target.checked = !event.target.checked;
  }
});
$('#preview-toast').onclick = () => invoke('demo-toast');
$('#copy-image').onclick = async () => {
  if (await invoke('copy-image', $('#share-canvas').toDataURL('image/png')))
    notify('Image copied. Paste it in the platform composer.');
};
$('#save-image').onclick = async () => {
  if (await invoke('save-image', $('#share-canvas').toDataURL('image/png'))) notify('Image saved');
};
$('#copy-text').onclick = async () => {
  if (await invoke('copy-text', $('#share-text').value)) notify('Caption copied');
};
for (const platform of ['x', 'reddit'])
  $(`#share-${platform}`).onclick = () =>
    invoke('share', {
      platform,
      text: $('#share-text').value,
      title: shareTitle(sharing, state.demo),
    });
document.querySelectorAll('dialog').forEach((d) =>
  d.addEventListener('click', (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
        d.close();
    }
  }),
);
try {
  state = desktop
    ? await window.tokenGo.invoke('snapshot')
    : (await import('./demo-data.js')).default;
  if (state.demo && !localStorage.getItem(pinsKey()))
    localStorage.setItem(
      pinsKey(),
      JSON.stringify(['secrets.still-working', 'secrets.returning', 'secrets.million']),
    );
  $('#language').innerHTML = Object.entries(languages)
    .map(([code, meta]) => `<option value="${code}">${meta.name}</option>`)
    .join('');
  setLanguage(state.settings.language || localStorage.getItem('tokengo.language') || 'en');
  render();
  if (desktop)
    window.tokenGo.onUpdate(async (next) => {
      state = next;
      render();
      if (next.error) notify(next.error);
      if (next.openAchievement) {
        const a =
          next.previewAward || state.achievements.find((a) => a.id === next.openAchievement);
        if (a && !a.locked) {
          if (next.shareAchievement) {
            await showShare([a]);
            if (next.sharePlatform)
              await invoke('share', {
                platform: next.sharePlatform,
                text: $('#share-text').value,
                title: shareTitle([a], state.demo),
              });
          } else {
            cabinetFocus = a;
            go('collection');
          }
        } else {
          go('collection');
          notify('This is a demo card. It does not add a real achievement.');
        }
      }
    });
} catch (error) {
  $('#content').innerHTML =
    `<div class="empty"><h3>Could not open your records</h3><p>${esc(error.message)}</p><p>Restart TokenGo and try again.</p></div>`;
}
