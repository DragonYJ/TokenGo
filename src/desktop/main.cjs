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
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => {
  main?.show();
  main?.focus();
});
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
    x: area.x + area.width - 440,
    y: area.y + area.height - 166,
    width: 420,
    height: 146,
  });
  toast.webContents.send('tokengo:toast', toastCurrent);
  toast.showInactive();
  scheduleDismiss();
}
function enqueue(awards, isDemo = false) {
  if (!isDemo && runtime.engine.state.settings.quiet) return;
  // Celebrate a batch once; never flood the desktop with hundreds of tiers.
  const chosen = [...awards].sort(
    (a, b) =>
      Number(b.hidden) - Number(a.hidden) ||
      ['common', 'uncommon', 'rare', 'epic', 'legendary'].indexOf(b.rarity) -
        ['common', 'uncommon', 'rare', 'epic', 'legendary'].indexOf(a.rarity),
  )[0];
  if (chosen) {
    toastQueue.push({ ...chosen, batch: awards.length, demo: isDemo });
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
    dialog.showErrorBox('TokenGo · 记录保护', error.message);
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
    width: 420,
    height: 146,
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
  const trayImg = nativeImage
    .createFromPath(path.join(ROOT, 'assets/tray.png'))
    .resize({ width: 18, height: 18 });
  trayImg.setTemplateImage(true);
  try {
    tray = new Tray(trayImg);
    tray.setToolTip('TokenGo · 离线成就');
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: '打开 TokenGo', click: () => main.show() },
        {
          label: '退出',
          click: () => {
            quitting = true;
            app.quit();
          },
        },
      ]),
    );
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
    const a = demoSnapshot().achievements.find((a) => a.id === 'secrets.still-working');
    enqueue([a], true);
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
  if (['open', 'share'].includes(action)) {
    main.show();
    main.webContents.send('tokengo:update', {
      ...snapshot(),
      openAchievement: toastCurrent?.id,
      shareAchievement: action === 'share',
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
