# Demo and test copy audit

Reviewed runtime UI, desktop actions, share captions and platform titles, canvas exports, achievement definitions, translations, documentation and developer scripts.

| Context                                         | Intended behavior                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Genuine local achievements                      | No Demo prefix in the caption, image or social-platform title.                                    |
| Manual card preview with earned achievements    | Preview a genuine earned achievement, without changing its evidence or adding a demo label.       |
| Manual preview without achievements             | Use a clearly labeled fictional card; it never creates a real award.                              |
| Website gallery and explicit demo mode          | Keep visible demo disclosure and label all generated sharing content.                             |
| Community unlock percentages                    | Keep the word “sample”: it describes voluntary community data, not demonstration data.            |
| Test scripts, fixtures and development commands | Keep technical names; they are development infrastructure, not product-facing achievement claims. |
| Achievement rules tracking tests                | Keep test-related metric names. Running a test is a real observable developer action.             |

## Corrections

- Removed demo-oriented prose from ordinary quiet-mode settings. The preview explanation now describes real-achievement-first behavior.
- Replaced development commands in the user-facing load-error message with a restart instruction.
- Unified fictional-source detection across PNG cards, captions and X/Reddit titles, including preview cards opened from a real installation.
- Removed the unconditional exclamation mark that produced `AFK.!`.
- Captions contain actual newline characters, not literal backslashes or escaped `\\n` sequences.
- Fixed stale browser preview timers that could dismiss a later card.
- Kept manual previews available in quiet mode while automatic live notifications remain silent.

The intentional `[Demo]` marker remains on fictional data. Removing it would make a sample look like a genuine earned achievement.
