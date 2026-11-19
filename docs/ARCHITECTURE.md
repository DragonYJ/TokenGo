# Architecture

```text
~/.codex/sessions + archived_sessions
                 ↓ read-only, incremental, newline-safe
           Codex adapter
                 ↓ content-free normalized events
          Achievement engine ← core families + JSON packs
                 ↓
          signed local state
                 ↓
    Electron main process (5-second polling)
           ↙                   ↘
 isolated collection UI      inactive desktop toast
           ↓ explicit user gesture
 local PNG + text → system browser → X / Reddit composer
```

## Core

`catalog.mjs` defines 60 metric families and twenty thresholds per family. `packs/secrets.json` adds 24 authored hidden achievements. Pack validation restricts IDs, metric names, numeric thresholds, text lengths, and categorical values. All conditions are AND comparisons. Catalog updates preserve existing awards; newly qualifying milestones receive a migration label.

`codex.mjs` understands session metadata, task lifecycle markers, user messages, tool calls, context compaction, cumulative token snapshots and thread token usage. It removes content before persistence. Identifiers are hashed. Forked sessions are conservatively skipped.

`collector.mjs` maintains file byte offsets and context for restarts, handles CRLF and split UTF-8 lines, skips malformed lines, and ignores symlinks. No unfinished line is committed before a newline. Active and archived session duplication is handled by event identity. Events prior to the current collector startup are history discoveries, even when discovered by the live poller.

`engine.mjs` stores counters and maxima, distinct sets, an event deduplication set, and an append-only award hash chain inside an HMAC-protected state envelope. State writes use temporary-file replacement. Simultaneous writers to one store are not supported.

## Desktop

Electron supplies a normal library window, a tray menu, a non-focusing bottom-right overlay window, save dialogs and clipboard image support. One IPC entry point allowlists actions and validates renderer identity. Outbound renderer requests and automatic popup navigation are denied. Desktop startup is opt-in; collecting is also opt-in. Minimized/closed windows do not stop the tray collector.

The toast coalesces a scan batch into one highlight plus a count. A maximum of three pending batches prevents notification floods. Historical imports never flood the desktop. Quiet mode suppresses live toasts. Native OS do-not-disturb status is not currently integrated; use TokenGo's own quiet mode.

## Website and distribution

`npm run site` creates an interactive static demo from synthetic metrics. It cannot read local Codex logs and has no account or backend. It reuses the renderer with an explicit demo marker on the page and every share image.

GitHub Actions validates pull requests, deploys the demo with Pages, and builds tagged cross-platform releases. There are no paid API services or server deployments in the project. Hosted platform quotas and policies still apply.

## Medal growth and statistics

Every achievement has Bronze, Silver and Gold requirements at 1×, 2× and 6× its declared thresholds. Existing v0.1 awards load as Bronze; qualifying upgrades append evidence without discarding the original unlock time. The cabinet displays progress toward the next medal. Hidden requirements remain masked until the first unlock.

`analytics.mjs` aggregates deduplicated events by local date, model identifier, session, tool family and hour. It retains only public model-family labels, never custom model strings. Cache and reasoning counters are components of input/output, not additional total tokens. `Collector.rebuildAnalytics()` reads available logs into a fresh aggregate and preserves existing lifetime metrics and awards; the update is saved only after the rebuild succeeds. Statistics may cover less history than lifetime totals when older logs are unavailable.

## Voluntary community sample

`community.mjs` validates opt-in reports and aggregates cumulative medal counts. The client previews minimal reports locally and only opens GitHub after the user chooses to do so. Maintainer-approved issues drive an Actions workflow; the checked-in dataset contains aggregate counts only. Edits require new approval. The desktop has no fetch endpoint: sample updates arrive with releases or explicit file imports. See [the protocol](COMMUNITY.md) for identity disclosure, deduplication and withdrawal limitations.
