# Contribute a little surprise

Contributions welcome: achievements, badge art, themes, translations, performance improvements, adapters, accessibility, and bug reports.

## Add an achievement

1. Add a JSON pack in `packs/`, or extend an existing community pack. Use a globally unique stable ID such as `community.clockwork`.
2. Choose existing metrics from `src/core/catalog.mjs`. Conditions are an **AND** of positive numeric thresholds. No JavaScript, filesystem paths, URLs, or executable expressions are evaluated by packs.
3. Add meaningful positive and negative test examples to `tests/`. A metric requiring new evidence must first be implemented and documented in the adapter.
4. Run `npm test` and `npm run validate`. Open a pull request with the intended moment of delight and how it can be observed reliably.

```json
{
  "id": "community",
  "version": 1,
  "achievements": [
    {
      "id": "community.clockwork",
      "name": "Clockwork",
      "description": "Make 50 tool calls in one task.",
      "category": "tools",
      "rarity": "bronze",
      "hidden": true,
      "icon": "anvil",
      "version": 1,
      "conditions": [{ "metric": "task.max_tools", "gte": 50 }]
    }
  ]
}
```

Categories: `tokens`, `tasks`, `tools`, `exploration`, `time`, `code`, `creative`, `collaboration`, `hidden`.

Medals: `bronze`, `silver`, `gold`. Rules declare Bronze thresholds. The engine applies 1× / 2× / 6× to every condition for Bronze / Silver / Gold and records upgrades without revoking previous awards. These grades are **not population statistics**. All new packs should declare `rarity: "bronze"`.

Icons: `trophy`, `spark`, `gem`, `hourglass`, `flame`, `compass`, `flag`, `orbit`, `anvil`, `book`, `feather`, `sun`, `link`, `terminal`, `branch`, `shield`, `box`, `globe`, `film`, `music`, `grid`, `rocket`, `lock`.

## Design principles

- A huge library should have variety, not misleading promises. Tiered milestones are labeled as tiers.
- Reward observable actions. Tool invocation is not proof of successful output; a task completion event is not proof of correctness.
- Keep names and conditions hidden in the **locked UI**, while acknowledging that this is open-source software.
- Keep old IDs stable. New versions do not revoke earned achievements; newly qualifying migrated awards are labeled `migration`.
- Do not add telemetry, external asset loads, automatic uploads, purchases, fabricated global rarity, or unverifiable claims of certification.
- Token and activity milestones are descriptive records, not instructions to waste tokens or lose sleep.
- Share cards must not reveal prompt text, local paths, secrets, or code. Demo cards must remain labeled.

## Extensions

The normalized adapter interface is defined in `src/core/codex.mjs`; the engine accepts events through `Engine.consume`. The JSON export is a simple foundation for independently built cabinets or dashboards. This is an early interface and not a stable general-purpose plugin SDK.

Networked leaderboards, account systems, and public profiles belong in **explicitly opted-in external extensions**, with their own hosting and trust policies. A server should not treat an unsigned local export or image as independently verified achievement evidence.

## Development

Node.js 22.12+, `npm ci`, `npm start`. `npm run demo` does not ingest logs. Tests do not access the developer's Codex history; use synthetic fixtures and temporary directories. Do not attach real session logs to issues.

By contributing, you agree that your contributions are distributed under the repository's MIT license. Include attribution and compatible licenses for any third-party assets.

## Localization and community rates

English is the source language. Add translations in `src/ui/locales.js`; register languages in `src/ui/i18n.js`, the language selector and desktop IPC allowlist. Keep badge IDs stable across languages. Translate UI text and canvas copy; never translate metric identifiers or protocol keys.

Community rates are optional self-reported sample statistics, not global rates. Follow [the protocol](docs/COMMUNITY.md). Do not introduce automatic uploads or identity-anonymous claims about public GitHub submissions.
