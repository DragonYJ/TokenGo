# TokenGo interface

The design is a game achievement library for Codex activity: quiet controls, readable records, and metal-colored badges. The cabinet, right-hand categories, six pinned slots, statistics and sharing remain in their original order.

## Direction

- Product: collect and share achievements observed in local Codex activity.
- Character: restrained, precise, with humor in the achievement names.
- Setting: a game client's achievement library, with graphite surfaces.
- Main visual elements: earned medals in the cabinet and the desktop unlock card.
- Recurring detail: a three-step Bronze / Silver / Gold track on badges and share images.

## Changes by pass

1. **Spacing:** align navigation rows, use 24px panel padding and 16px cabinet gaps, and reduce the empty space above the collection.
2. **Color:** graphite surfaces, three text roles and quiet borders. Metal colors stay in badges; the daily chart highlights its latest bar or selected day.
3. **Icons:** a single locally bundled line-icon vocabulary replaces Unicode navigation symbols and decorative stars. Badge art remains separate from control icons.
4. **Copy:** page titles name the context: Codex achievements, Codex activity, Settings and Unlock history. Short labels replace decorative slogans. The changes are translated into all eight supported languages.
5. **Type:** keep the platform font stack for offline multilingual coverage. Use weights 400–600, readable secondary text, sentence case and tabular figures.
6. **Layout:** preserve the cabinet and right-side category navigation. Keep three desktop showcase columns and two mobile columns; compact achievement browsing becomes one column on phones.
7. **Details:** remove glowing borders and colored card surfaces. Use consistent control radii, explicit focus states and the medal track as the repeated product detail.
8. **Visuals:** keep the original vector medals. Remove radial washes, orbital rings and decorative stat icons from the UI and canvas share images. No generated hero image is needed for this application.
9. **Motion:** use short surface changes for hover and an 8px notification entrance. Honor reduced-motion preferences. No decorative looping animation.

Demo disclosures, evidence sources, community-sample terminology and sharing consent remain visible. Achievement names can retain their jokes and punctuation; they are collectible titles, not marketing claims. No achievement IDs, thresholds, stored records or collection rules change in this design pass.

## Implementation and attribution

`theme.css` contains the active visual system, `icons.js` supplies control icons, and the existing renderer supplies the data and interactions. All assets and translations are local.

The review and pass order follow **Unslop by Damir Sokolovsky** ([@heydamir](https://x.com/heydamir)), [source](https://github.com/heydamir/unslop), licensed under **CC BY 4.0**. The skill itself is not redistributed in this repository. TokenGo's original application code and vector badges remain MIT licensed.
