import { setLanguage, translateDOM } from './i18n.js';
import { toastMarkup } from './toast-view.js';
const el = document.querySelector('#toast');
window.tokenGo.onToast((a) => {
  setLanguage(a.language || 'en');
  el.innerHTML = toastMarkup(a);
  translateDOM(el);
  el.querySelector('.toast-dismiss').onclick = () => window.tokenGo.toastAction('close');
  el.querySelector('.toast-open').onclick = () => window.tokenGo.toastAction('open');
  el.querySelectorAll('[data-platform]').forEach(
    (button) => (button.onclick = () => window.tokenGo.toastAction(button.dataset.platform)),
  );
  el.onmouseenter = () => window.tokenGo.toastAction('pause');
  el.onmouseleave = () => window.tokenGo.toastAction('resume');
});
