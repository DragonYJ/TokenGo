# Offline localization

TokenGo includes English (`en`), Simplified Chinese (`zh`), Japanese (`ja`), Korean (`ko`), Spanish (`es`), French (`fr`), German (`de`) and Brazilian Portuguese (`pt`). English remains the default, independently of the OS language. The user's explicit choice persists locally.

Language metadata lives in `src/ui/languages/registry.js`. Chinese translations live in `src/ui/locales.js`; the six additional dictionaries live in `src/ui/languages/`. No translation service, remote font or external asset is used. The desktop validates language codes against the same registry and applies the selection to notifications and the tray menu.

## Coverage

The language packs cover navigation, the cabinet, built-in achievement names, medal levels, statistics, settings, community consent, notifications and share copy. `Intl` formats summary values and dates for the selected locale. Protocol identifiers, JSON contribution previews, source-code examples, public model names and URLs remain unchanged. Community packs without translations fall back to their source text. Technical diagnostics may also use the English fallback.

Translations use the English source phrase as a key. Exact lookup normalizes layout whitespace. Dynamic strings match whole source phrases with word boundaries; replacements are applied once to prevent recursive substitutions. Unknown text remains intact. DOM translation remembers the original text so switching back to English does not leave stale translations behind. Language names stay in their native scripts; other select options are translated.

## Add or improve a language

1. Copy an existing dictionary in `src/ui/languages/` and translate its values. Keep keys unchanged, with no empty keys or values.
2. Register its code, native display name and `Intl` locale in `registry.js`, and import the dictionary in `i18n.js`.
3. Add the language to the localization test matrix. Translate new core copy in each supported dictionary; keep source keys consistent across the six expanded packs.
4. Run `npm test`, `npm run test:ui` and `npm run test:desktop`. Inspect long labels at narrow widths and check the generated share image.

Never translate achievement IDs, metric keys, community protocol fields or user-entered captions. Contributions improving native phrasing and accessibility are welcome.
