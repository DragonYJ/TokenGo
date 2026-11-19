import { zhCN } from './locales.js';
import ja from './languages/ja.js';
import ko from './languages/ko.js';
import es from './languages/es.js';
import fr from './languages/fr.js';
import de from './languages/de.js';
import pt from './languages/pt.js';
import { languages, isSupportedLanguage } from './languages/registry.js';
export const dictionaries = { en: {}, zh: zhCN, ja, ko, es, fr, de, pt };
let language = 'en';
const originals = new WeakMap(),
  compiled = new Map();
export const getLanguage = () => language;
export const formatLocale = () => languages[language].locale;
export function setLanguage(value) {
  language = isSupportedLanguage(value) ? value : 'en';
  if (typeof document !== 'undefined') document.documentElement.lang = languages[language].locale;
}
const normalize = (text) => text.replace(/\s+/g, ' ').trim();
export function t(value) {
  const text = String(value ?? '');
  if (language === 'en') return text;
  const dictionary = dictionaries[language];
  const normalized = normalize(text);
  if (Object.hasOwn(dictionary, normalized))
    return text.replace(/\S[\s\S]*\S|\S/, () => dictionary[normalized]);
  if (!compiled.has(language)) {
    const keys = Object.keys(dictionary)
      .filter((key) => key.trim())
      .sort((a, b) => b.length - a.length);
    compiled.set(
      language,
      new RegExp(
        '(?<![A-Za-z0-9_])(?:' +
          keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') +
          ')(?![A-Za-z0-9_])',
        'g',
      ),
    );
  }
  // Translate complete source phrases once. Unknown community content stays in English.
  return text.replace(compiled.get(language), (match) => dictionary[match]);
}
export function translateDOM(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (
      ['SCRIPT', 'STYLE', 'PRE', 'CODE'].includes(node.parentElement?.tagName) ||
      node.parentElement?.closest('#language')
    )
      continue;
    const old = originals.get(node),
      source = old && node.nodeValue === old.last ? old.source : node.nodeValue;
    const result = t(source);
    originals.set(node, { source, last: result });
    node.nodeValue = result;
  }
  for (const el of root.querySelectorAll('[aria-label],[placeholder],[title]')) {
    const saved = originals.get(el) || {};
    for (const attr of ['aria-label', 'placeholder', 'title'])
      if (el.hasAttribute(attr)) {
        const current = el.getAttribute(attr),
          old = saved[attr],
          source = old && current === old.last ? old.source : current;
        const result = t(source);
        saved[attr] = { source, last: result };
        el.setAttribute(attr, result);
      }
    originals.set(el, saved);
  }
  document.body.classList.add('ready');
}
