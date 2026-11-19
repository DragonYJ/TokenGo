const { randomBytes } = require('node:crypto');
const {
  app,
  BrowserWindow,
  ipcMain,
  session,
  shell,
  dialog,
  clipboard,
  nativeImage,
  screen,
  Tray,
  Menu,
  powerMonitor,
} = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
const os = require('node:os');
const REPO = 'https://github.com/DragonYJ/TokenGo';
const ROOT = path.resolve(__dirname, '../..');
let main,
  toast,
  tray,
  runtime,
  demoSnapshot,
  demo = false,
  timer,
  toastTimer,
  toastCurrent,
  quitting = false,
  suspended = false;
let toastQueue = [];
let collectionRequested = process.argv.includes('--collect');
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', (_event, argv) => {
  if (argv.includes('--collect')) {
    collectionRequested = true;
    if (runtime && toast) enableCollection().catch((e) => update({ error: e.message }));
  }
  main?.show();
  main?.focus();
});
async function enableCollection() {
  if (demo) return;
  if (!runtime.engine.state.lastScan) await scan('history');
  runtime.engine.state.settings.watching = true;
  runtime.store.save(runtime.engine.state);
  update();
}
function secureWindow(options) {
  const win = new BrowserWindow({
    ...options,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  return win;
}
async function localizeTray() {
  if (!tray) return;
  const { setLanguage, t } = await import(pathToFileURL(path.join(ROOT, 'src/ui/i18n.js')).href);
  setLanguage(runtime.engine.state.settings.language || 'en');
  tray.setToolTip('TokenGo · ' + t('Offline achievements'));
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: t('Open TokenGo'), click: () => main.show() },
      {
        label: t('Quit'),
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ]),
  );
}
function snapshot() {
  return {
    ...(demo ? demoSnapshot() : runtime.engine.snapshot()),
    repository: REPO,
    startup: app.getLoginItemSettings().openAtLogin,
  };
}
function update(extra = {}) {
  main?.webContents.send('tokengo:update', { ...snapshot(), ...extra });
}
function scheduleDismiss() {
  clearTimeout(toastTimer);
  toastTimer = setTimeout(closeToast, 6500);
}
function closeToast() {
  clearTimeout(toastTimer);
  toast?.hide();
  toastCurrent = null;
  setTimeout(nextToast, 300);
}
function nextToast() {
  if (toastCurrent || !toastQueue.length || !toast) return;
  toastCurrent = toastQueue.shift();
  const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  toast.setBounds({
    x: area.x + area.width - 620,
    y: area.y + area.height - 174,
    width: 600,
    height: 154,
  });
  toast.webContents.send('tokengo:toast', toastCurrent);
  toast.showInactive();
  scheduleDismiss();
}
function enqueue(awards, isDemo = false, manual = false) {
  if (!isDemo && !manual && runtime.engine.state.settings.quiet) return;
  // Celebrate a batch once; never flood the desktop with hundreds of tiers.
  const chosen = [...awards].sort(
    (a, b) =>
      Number(b.hidden) - Number(a.hidden) ||
      ['bronze', 'silver', 'gold'].indexOf(b.rarity) -
        ['bronze', 'silver', 'gold'].indexOf(a.rarity),
  )[0];
  if (chosen) {
    toastQueue.push({
      ...chosen,
      batch: awards.length,
      demo: isDemo,
      language: runtime.engine.state.settings.language || 'en',
    });
    if (toastQueue.length > 3) toastQueue = toastQueue.slice(-3);
    nextToast();
  }
}
async function scan(source) {
  const result = await runtime.collector.scan(source);
  if (result) {
    if (result.files || source === 'history')
      update({
        scanResult: {
          files: result.files,
          events: result.events,
          awards: result.awards.length,
          malformed: result.malformed,
          forksSkipped: result.forksSkipped,
        },
      });
    if (source === 'live') enqueue(result.awards.filter((a) => a.source === 'live'));
  }
  return snapshot();
}
function png(payload) {
  if (
    typeof payload !== 'string' ||
    payload.length > 16 * 1024 * 1024 ||
    !payload.startsWith('data:image/png;base64,')
  )
    throw new Error('Invalid PNG');
  const image = nativeImage.createFromDataURL(payload);
  if (image.isEmpty()) throw new Error('Invalid image');
  return image;
}
app.whenReady().then(async () => {
  app.setName('TokenGo');
  // Network-deny applies to every renderer. External sharing is explicit IPC only.
  session.defaultSession.webRequest.onBeforeRequest((details, callback) =>
    callback({ cancel: !['file:', 'data:', 'devtools:'].includes(new URL(details.url).protocol) }),
  );
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) =>
    callback(false),
  );
  const core = await import(pathToFileURL(path.join(ROOT, 'src/core/runtime.mjs')).href);
  demoSnapshot = core.demoSnapshot;
  demo = process.argv.includes('--demo');
  try {
    runtime = core.runtime(
      process.env.TOKENGO_HOME || path.join(app.getPath('userData'), 'records'),
      process.env.CODEX_HOME || path.join(os.homedir(), '.codex'),
    );
  } catch (error) {
    dialog.showErrorBox('TokenGo · Record protection', error.message);
    app.quit();
    return;
  }
  main = secureWindow({
    width: 1440,
    height: 980,
    minWidth: 940,
    minHeight: 680,
    backgroundColor: '#101725',
    title: 'TokenGo',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 22, y: 22 },
    show: false,
  });
  await main.loadFile(path.join(ROOT, 'src/ui/index.html'));
  main.show();
  main.on('close', (event) => {
    if (!quitting && tray) {
      event.preventDefault();
      main.hide();
    }
  });
  toast = secureWindow({
    width: 600,
    height: 154,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    focusable: false,
    hasShadow: false,
  });
  toast.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  await toast.loadFile(path.join(ROOT, 'src/ui/toast.html'));
  nextToast();
  if (collectionRequested && !demo)
    await enableCollection().catch((e) => update({ error: e.message }));
  const trayImg = nativeImage
    .createFromPath(path.join(ROOT, 'assets/tray.png'))
    .resize({ width: 18, height: 18 });
  trayImg.setTemplateImage(true);
  try {
    tray = new Tray(trayImg);
    await localizeTray();
    tray.on('click', () => main.show());
  } catch {}
  powerMonitor.on('suspend', () => {
    suspended = true;
  });
  powerMonitor.on('resume', () => {
    suspended = false;
    for (const s of Object.values(runtime.engine.state.sessions)) {
      s.run = 0;
      s.last = 0;
    }
  });
  timer = setInterval(() => {
    if (!demo && !suspended && runtime.engine.state.settings.watching)
      scan('live').catch((e) => update({ error: e.message }));
  }, 5000);
});
ipcMain.handle('tokengo:action', async (event, action, payload) => {
  if (event.sender !== main?.webContents) throw new Error('Untrusted sender');
  if (action === 'snapshot') return snapshot();
  if (action === 'language') {
    const { isSupportedLanguage } = await import(
      pathToFileURL(path.join(ROOT, 'src/ui/languages/registry.js')).href
    );
    if (!isSupportedLanguage(payload)) throw new Error('Invalid language');
    runtime.engine.state.settings.language = payload;
    runtime.store.save(runtime.engine.state);
    await localizeTray();
    return snapshot();
  }
  if (action === 'analytics-rebuild') {
    if (demo) throw new Error('Demo data cannot scan local logs.');
    await runtime.collector.rebuildAnalytics();
    update();
    return snapshot();
  }
  if (action === 'community-report' || action === 'community-copy') {
    if (demo) throw new Error('Demo achievements cannot contribute to the community sample.');
    runtime.engine.state.settings.communityId ||= randomBytes(16).toString('hex');
    runtime.store.save(runtime.engine.state);
    const report = {
      schema: 'tokengo-community-v1',
      participant: runtime.engine.state.settings.communityId,
      achievements: Object.values(runtime.engine.state.unlocked)
        .filter((a) => a.source !== 'demo')
        .map((a) => ({ id: a.id, level: a.level || 1 }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    };
    if (action === 'community-copy') {
      clipboard.writeText(JSON.stringify(report, null, 2));
      return true;
    }
    return report;
  }
  if (action === 'community-submit') {
    if (demo) throw new Error('Demo reports cannot be submitted.');
    await shell.openExternal(REPO + '/issues/new?template=community-sample.yml');
    return true;
  }
  if (action === 'community-import') {
    const result = await dialog.showOpenDialog(main, {
      properties: ['openFile'],
      filters: [{ name: 'Community sample', extensions: ['json'] }],
    });
    if (result.canceled) return null;
    const size = (await fs.promises.stat(result.filePaths[0])).size;
    if (size > 2 * 1024 * 1024) throw new Error('Sample file is too large');
    const { validateRates } = await import(
      pathToFileURL(path.join(ROOT, 'src/core/community.mjs')).href
    );
    const rates = validateRates(
      JSON.parse(await fs.promises.readFile(result.filePaths[0], 'utf8')),
      new Set(runtime.engine.catalog.map((a) => a.id)),
    );
    await fs.promises.writeFile(
      path.join(runtime.store.directory, 'community-rates.json'),
      JSON.stringify(rates),
      { mode: 0o600 },
    );
    runtime.engine.community = rates;
    update();
    return snapshot();
  }
  if (action === 'scan') {
    if (demo) return snapshot();
    return scan('history');
  }
  if (action === 'watch') {
    if (typeof payload !== 'boolean') throw new Error('Invalid setting');
    if (demo) {
      demo = false;
      update();
    }
    if (payload && !runtime.engine.state.lastScan) await scan('history');
    runtime.engine.state.settings.watching = payload;
    runtime.store.save(runtime.engine.state);
    update();
    return snapshot();
  }
  if (action === 'quiet') {
    runtime.engine.state.settings.quiet = Boolean(payload);
    runtime.store.save(runtime.engine.state);
    if (payload) {
      toastQueue = [];
      closeToast();
    }
    update();
    return snapshot();
  }
  if (action === 'startup') {
    app.setLoginItemSettings({ openAtLogin: Boolean(payload) });
    return snapshot();
  }
  if (action === 'demo-toast') {
    const earned = demo
      ? []
      : runtime.engine
          .snapshot()
          .achievements.filter((a) => !a.locked)
          .sort((a, b) => b.award.at.localeCompare(a.award.at));
    const a =
      earned[0] || demoSnapshot().achievements.find((a) => a.id === 'secrets.still-working');
    enqueue([a], !earned.length, true);
    return true;
  }
  if (action === 'save-image') {
    const image = png(payload);
    const r = await dialog.showSaveDialog(main, {
      defaultPath: 'TokenGo-achievement.png',
      filters: [{ name: 'PNG image', extensions: ['png'] }],
    });
    if (!r.canceled) {
      await fs.promises.writeFile(r.filePath, image.toPNG());
      return true;
    }
    return false;
  }
  if (action === 'copy-image') {
    clipboard.writeImage(png(payload));
    return true;
  }
  if (action === 'copy-text') {
    if (typeof payload !== 'string' || payload.length > 4000) throw new Error('Invalid text');
    clipboard.writeText(payload);
    return true;
  }
  if (action === 'open-repo') {
    await shell.openExternal(REPO);
    return true;
  }
  if (action === 'share') {
    if (
      !payload ||
      !['x', 'reddit'].includes(payload.platform) ||
      typeof payload.text !== 'string' ||
      typeof payload.title !== 'string' ||
      payload.text.length > 4000
    )
      throw new Error('Invalid share');
    const target =
      payload.platform === 'x'
        ? `https://x.com/intent/post?text=${encodeURIComponent(payload.text)}`
        : `https://www.reddit.com/submit?selftext=true&title=${encodeURIComponent(payload.title.slice(0, 250))}&text=${encodeURIComponent(payload.text)}`;
    await shell.openExternal(target);
    return true;
  }
  if (action === 'export') {
    const r = await dialog.showSaveDialog(main, {
      defaultPath: 'TokenGo-achievements.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (!r.canceled) {
      const s = snapshot();
      await fs.promises.writeFile(
        r.filePath,
        JSON.stringify(
          {
            product: 'TokenGo',
            version: 1,
            demo: s.demo,
            trust: 'local-record',
            achievements: s.achievements
              .filter((a) => !a.locked)
              .map((a) => ({ id: a.id, name: a.name, award: a.award })),
          },
          null,
          2,
        ),
      );
      return true;
    }
    return false;
  }
  throw new Error('Unknown action');
});
ipcMain.on('tokengo:toast-action', (event, action) => {
  if (event.sender !== toast?.webContents) return;
  if (action === 'pause') clearTimeout(toastTimer);
  if (action === 'resume') scheduleDismiss();
  if (['open', 'x', 'reddit', 'other'].includes(action)) {
    main.show();
    main.webContents.send('tokengo:update', {
      ...snapshot(),
      openAchievement: toastCurrent?.id,
      shareAchievement: action !== 'open',
      sharePlatform: ['x', 'reddit'].includes(action) ? action : null,
      previewAward: toastCurrent?.demo ? toastCurrent : null,
    });
    closeToast();
  }
  if (action === 'close') closeToast();
});
app.on('before-quit', () => {
  quitting = true;
  clearInterval(timer);
  clearTimeout(toastTimer);
});
app.on('activate', () => main?.show());
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
