import { zhCN } from './locales.js';
let language = 'en';
const originals = new WeakMap();
const substitutions = Object.entries(zhCN).sort((a, b) => b[0].length - a[0].length);
export const getLanguage = () => language;
export const formatLocale = () => (language === 'zh' ? 'zh-CN' : 'en-US');
export function setLanguage(value) {
  language = value === 'zh' ? 'zh' : 'en';
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
}
export function t(value) {
  const text = String(value ?? '');
  if (language === 'en') return text;
  if (zhCN[text]) return zhCN[text];
  // Replace only original English spans once; never recursively translate replacements.
  const keys = substitutions.filter(([key]) => key.length > 3 && text.includes(key));
  if (!keys.length) return text;
  const escaped = keys.map(([key]) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return text.replace(new RegExp(escaped.join('|'), 'g'), (match) => zhCN[match]);
}
export function translateDOM(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (['SCRIPT', 'STYLE', 'OPTION'].includes(node.parentElement?.tagName)) continue;
    const old = originals.get(node);
    const source = old && node.nodeValue === old.last ? old.source : node.nodeValue;
    const result = t(source);
    originals.set(node, { source, last: result });
    node.nodeValue = result;
  }
  for (const el of root.querySelectorAll('[aria-label],[placeholder],[title]')) {
    const saved = originals.get(el) || {};
    for (const attr of ['aria-label', 'placeholder', 'title'])
      if (el.hasAttribute(attr)) {
        const current = el.getAttribute(attr),
          old = saved[attr];
        const source = old && current === old.last ? old.source : current;
        const result = t(source);
        saved[attr] = { source, last: result };
        el.setAttribute(attr, result);
      }
    originals.set(el, saved);
  }
  document.body.classList.add('ready');
}
