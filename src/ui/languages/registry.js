export const languages = {
  en: { name: 'English', locale: 'en-US' },
  zh: { name: '简体中文', locale: 'zh-CN' },
  ja: { name: '日本語', locale: 'ja-JP' },
  ko: { name: '한국어', locale: 'ko-KR' },
  es: { name: 'Español', locale: 'es-ES' },
  fr: { name: 'Français', locale: 'fr-FR' },
  de: { name: 'Deutsch', locale: 'de-DE' },
  pt: { name: 'Português', locale: 'pt-BR' },
};
export const isSupportedLanguage = (value) => Object.hasOwn(languages, value);
