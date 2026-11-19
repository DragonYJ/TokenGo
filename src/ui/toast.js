import { badge } from './badges.js';
const el = document.querySelector('#toast');
window.tokenGo.onToast((a) => {
  el.innerHTML = `<div class="toast-card"><button class="toast-dismiss" aria-label="关闭">×</button><div class="toast-badge">${badge(a.icon, a.rarity)}</div><div class="toast-copy"><div class="toast-eyebrow"></div><h3></h3><p></p><button class="toast-share">分享这一刻 ↗</button></div><div class="native-toast-progress"></div></div>`;
  el.querySelector('.toast-eyebrow').textContent =
    `✦ ${a.hidden ? '隐藏成就' : '成就'}已解锁${a.demo ? ' · 演示' : ''}${a.batch > 1 ? ` · 另有 ${a.batch - 1} 枚` : ''}`;
  el.querySelector('h3').textContent = a.name;
  el.querySelector('p').textContent = a.description;
  el.querySelector('.toast-dismiss').onclick = () => window.tokenGo.toastAction('close');
  el.querySelector('.toast-share').onclick = () => window.tokenGo.toastAction('share');
  el.querySelector('h3').onclick = () => window.tokenGo.toastAction('open');
  el.onmouseenter = () => window.tokenGo.toastAction('pause');
  el.onmouseleave = () => window.tokenGo.toastAction('resume');
});
