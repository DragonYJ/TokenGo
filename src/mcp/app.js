import { App } from '@modelcontextprotocol/ext-apps';
const app = new App({ name: 'TokenGo', version: '0.4.0' });
let latest,
  listener,
  deepLink,
  timer,
  refreshing = false;
const unpack = (result) => {
  if (result?.isError || result?._meta?.error)
    throw new Error(result?._meta?.error || 'The local collector is unavailable.');
  return result?._meta?.value;
};
function navigation(snapshot) {
  if (!deepLink) return snapshot;
  try {
    const url = new URL(deepLink, 'https://tokengo.invalid');
    const match = /^\/achievements\/([a-zA-Z0-9._-]+)$/.exec(url.pathname);
    if (match)
      return {
        ...snapshot,
        openAchievement: match[1],
        shareAchievement: url.searchParams.get('share') === '1',
        sharePlatform: ['x', 'reddit'].includes(url.searchParams.get('platform'))
          ? url.searchParams.get('platform')
          : null,
      };
    if (url.pathname === '/statistics') return { ...snapshot, openView: 'statistics' };
  } catch {}
  return snapshot;
}
app.ontoolresult = (result) => {
  try {
    latest = unpack(result);
    if (latest && listener) {
      listener(navigation(latest));
      deepLink = undefined;
    }
  } catch (error) {
    console.error(error.message);
  }
};
function contextChanged(context) {
  deepLink = context?.['openai/deepLink']?.url || deepLink;
  if (latest && listener && deepLink) {
    listener(navigation(latest));
    deepLink = undefined;
  }
}
app.addEventListener('hostcontextchanged', contextChanged);
await app.connect();
contextChanged(app.getHostContext());
window.tokenGo = {
  embedded: true,
  invoke: async (action, payload) => {
    if (action === 'snapshot' && latest) return latest;
    const value = unpack(
      await app.callServerTool({
        name: 'tokengo.action',
        arguments: { action, ...(payload === undefined ? {} : { payload }) },
      }),
    );
    if (action === 'snapshot' || (value?.achievements && value?.settings)) latest = value;
    return value;
  },
  onUpdate: (callback) => {
    listener = callback;
    if (latest && deepLink) {
      callback(navigation(latest));
      deepLink = undefined;
    }
    timer = setInterval(async () => {
      if (refreshing || document.hidden) return;
      refreshing = true;
      try {
        latest = unpack(
          await app.callServerTool({ name: 'tokengo.action', arguments: { action: 'snapshot' } }),
        );
        callback(latest);
      } catch {
      } finally {
        refreshing = false;
      }
    }, 5000);
    return () => {
      clearInterval(timer);
      listener = undefined;
    };
  },
};
document.documentElement.dataset.embedded = 'true';
await import('../ui/app.js');
await app.callServerTool({ name: 'tokengo.action', arguments: { action: 'sidebar-ready' } });
