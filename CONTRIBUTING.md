# Contribute a little surprise / 贡献一点惊喜

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
  "achievements": [{
    "id": "community.clockwork",
    "name": "精密时钟",
    "description": "一个任务里，五十次工具调用环环相扣。",
    "category": "tools",
    "rarity": "rare",
    "hidden": true,
    "icon": "anvil",
    "version": 1,
    "conditions": [{"metric": "task.max_tools", "gte": 50}]
  }]
}
```

Categories: `tokens`, `tasks`, `tools`, `exploration`, `time`, `code`, `creative`, `collaboration`, `hidden`.

Rarities: `common`, `uncommon`, `rare`, `epic`, `legendary`. These are editorial tiers, **not population statistics**.

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

Node.js 22+, `npm ci`, `npm start`. `npm run demo` does not ingest logs. Tests do not access the developer's Codex history; use synthetic fixtures and temporary directories. Do not attach real session logs to issues.

By contributing, you agree that your contributions are distributed under the repository's MIT license. Include attribution and compatible licenses for any third-party assets.
