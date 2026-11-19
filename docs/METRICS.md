# Metric definitions

All measurements are observations from local Codex log records. They are not output quality judgements or proof of work.

| Metric | Definition |
| --- | --- |
| `tokens.total/input/output/cached/reasoning` | Positive differences of per-session cumulative counters. New and legacy token record formats share the same maxima. Cached input and reasoning are displayed separately, not added again to total. |
| `sessions` | Distinct non-fork session metadata IDs. |
| `tasks.started/completed` | Distinct task lifecycle markers. Completion means the agent ended a turn, not that tests or acceptance criteria passed. |
| `messages` | Logged user-role response items, deduplicated by stable ID or timestamp/content hash. No content is retained. System-injected user-role messages can be included if the source log does not distinguish them. |
| `tools.total/distinct` | Tool invocation count and distinct hashed tool identifiers. Tool success is not inferred. |
| `projects` | Distinct keyed hashes of session working directories; these are not necessarily Git repositories. |
| `models` | Distinct hashed model strings from turn contexts. Aliases may count separately. |
| `days/weekends` | Unique activity dates in the machine's timezone when ingested. Changing timezone later does not rewrite old dates. |
| `streak` | Longest run of consecutive observed activity dates, not necessarily the current streak. |
| `active.minutes` | Sum of time gaps of at most five minutes between events in an explicitly active task. Parallel sessions can overlap. |
| `run.max_minutes` | Longest contiguous active segment in one task. A gap over five minutes, explicit stop, task completion, new task, or desktop sleep resets the segment. No wall-clock-only farming. |
| `session.max_tools/messages/tokens` | Highest observed corresponding count for a single session. |
| `task.max_tools` | Highest tool count between task-start and completion/stop. |
| `compactions` | Distinct compaction records. |
| `tools.mcp` | Invocations whose name includes `mcp__`. Calls hidden inside wrappers may not be visible. |
| `tool.*` | Heuristic category match on tool name and transient arguments. One call can contribute to multiple categories. |

The 36 tool families are shell, read, write, edit, search, git, test, build, install, web, browser, image, video, audio, document, spreadsheet, presentation, pdf, design, diagram, database, network, deploy, debug, agent, plan, memory, calendar, tasks, communication, cloud, security, monitoring, filesystem, notebook, automation.

Tool arguments are inspected in memory only and discarded. Keyword matching can overcount mentions and undercount indirect calls (for example a function orchestration wrapper invoking several tools internally). Contributions should improve adapters with fixtures rather than claiming semantic certainty.

Sources: `history` for pre-existing logs, `live` for activity observed after collector startup, `migration` for a rule newly satisfied by retained metrics, and `demo` for synthetic examples. All sources are shown in detail and export views. No source label is a cryptographic attestation to third parties.
