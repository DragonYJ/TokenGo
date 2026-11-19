# Privacy and security boundaries

## Data flow

`Codex JSONL (read-only) → normalized local events → metrics + evidence hashes → local achievements → optional local PNG/export`

Only explicit **Share**, **GitHub**, or **Install** actions open a browser. The collector has no HTTP client, analytics, remote assets, credential collection, or cloud endpoint. The desktop renderer blocks outbound requests and permissions. It uses isolated preload IPC, sandboxing, no renderer Node integration, a CSP, blocked in-app navigation, and a fixed allowlist of browser destinations.

Installation, GitHub browsing, GitHub Pages hosting, dependency downloads, and user-selected social platforms necessarily use the network. This guarantee concerns the TokenGo collection runtime, not Codex itself or a modified fork. GitHub and social services have their own logging policies.

## Stored data

Local files contain metrics, activity dates, pseudonymous session identifiers, SHA-256 tool/model identifiers, keyed project hashes, keyed local integrity signatures, file-path hashes with byte offsets, deduplication keys, and unlock evidence. No raw user messages, code, shell arguments, or original file paths are persisted. This local metadata is still personal information and should be protected with normal device access controls.

## Integrity, not remote attestation

The state envelope is HMAC-SHA256 authenticated with a locally created key. Award records form a SHA-256 chain. Bad signatures stop loading without silently resetting or overwriting the user's evidence.

The key is local, so a person controlling the machine can modify the code, forge logs, reconstruct signatures, or edit screenshots. There is no hardware-backed attestation or server-side verification. Do not treat TokenGo achievements as eligibility for money, competitive ranks, or certified claims.

## Threat limitations

- Local account compromise defeats this model.
- Tool classification is heuristic; logs can be malformed or forged.
- Updates to Codex log schemas can cause undercounting. Unknown event types are ignored.
- Local state and dedup sets currently grow with usage; very large histories may need compaction in a future release.
- JSON packs are trusted at distribution time and limited to a known metric vocabulary; no arbitrary scripts run. Installing arbitrary desktop forks is a separate trust decision.
- Unsigned desktop binaries require the user to make an explicit OS-level trust decision; no instructions disable global OS protections.

Report suspected problems through a minimal, redacted issue or GitHub private vulnerability reporting when enabled. Do not publish live rollout files, keys, tokens, or private code.

## Optional community contributions

The default collection path remains entirely local. Community reports contain a random installation identifier and earned badge IDs/levels. Creating a preview or copying a report does not upload it. The user explicitly opens GitHub and submits it themselves; their GitHub account and report become public. The report is pseudonymous in structure, **not anonymous once submitted through an identified account**.

The aggregation workflow treats issue content as untrusted JSON, validates exact fields against the catalog, requires a maintainer label, and executes repository code only. Edits invalidate approval. Published files contain aggregate counts, without account or installation identifiers. Reports and old GitHub revisions can remain public. Samples are voluntary, biased and self-reported, not a security boundary or certified population statistic.

Daily statistics retain local dates, hour buckets, counts and pseudonymous session/model/project references. Public model-family labels may be stored; private model suffixes are discarded. Importing a community sample validates its shape and counts but cannot certify its origin.
