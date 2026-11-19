# Voluntary community sample

Collection stays offline. Contributions are separate, deliberate GitHub submissions. No app API, accounts service or paid backend is required.

## Contribution flow

1. Open Community in the installed app. Choose Preview my contribution.
2. Inspect the JSON. It contains only the schema, a random 128-bit installation identifier, and achievement IDs with earned levels (1–3). Demo records are excluded.
3. Acknowledge that the report and your GitHub identity will be public. Copy it, open the submission form, paste it, review it and publish it yourself.
4. A maintainer reviews the report and adds `community-approved`. Editing a report removes approval and requires review again.
5. GitHub Actions validates the schema and publishes only aggregate counts in `community/rates.json`. It refreshes the static demo. Desktop apps use the bundled snapshot until a new release or an explicitly imported sample file.

GitHub is a public third party. A payload without personal fields does not make an account-linked submission anonymous. Do not add logs, prompts, screenshots of private work, paths or other identifying details to the report.

## Formats

```json
{
  "schema": "tokengo-community-v1",
  "participant": "0123456789abcdef0123456789abcdef",
  "achievements": [{ "id": "secrets.still-working", "level": 3 }]
}
```

Unknown properties, unknown badge IDs, duplicate badges and invalid levels are rejected. Only the first valid report per issue is accepted; the latest approved report per GitHub account and participant identifier is retained. Account identifiers are used transiently by the workflow and never appear in the published aggregate.

```json
{
  "schema": "tokengo-rates-v1",
  "participants": 1,
  "updatedAt": "2026-11-19T00:00:00Z",
  "counts": { "secrets.still-working": { "bronze": 1, "silver": 1, "gold": 1 } }
}
```

A Gold badge contributes to all three medal counts. The denominator is the number of accepted contributors, including those with no earned badges. An absent badge count means zero only when the denominator is positive. A zero-sized sample displays no percentage. The UI labels the current medal's rate, the sample size, and its self-reported nature.

## Trust and withdrawal

This is a convenience sample: voluntary participation introduces selection bias. One account can still represent multiple people or vice versa, and new accounts can evade deduplication. Maintainer review and local integrity checks are not independent attestation. Do not use these figures for prizes, access control, verified leaderboards or claims about all Codex users.

To withdraw, delete your report issue, remove the report body, or ask a maintainer to remove approval. A subsequent workflow rebuild removes it from the current aggregate. Previously downloaded snapshots and GitHub history may remain available. A random participant ID is stable for one local record directory; resetting the directory changes it. Keep the same report updated rather than creating duplicates.

To import fresh counts, download `community/rates.json` from this repository using your browser, then choose Import sample file. The application itself makes no network request. The dataset is validated but not cryptographically certified.
