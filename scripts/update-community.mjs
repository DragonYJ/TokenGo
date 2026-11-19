import { writeFile } from 'node:fs/promises';
import { catalog } from '../src/core/runtime.mjs';
import { aggregateReports } from '../src/core/community.mjs';
const repository = process.env.GITHUB_REPOSITORY;
if (!/^[\w.-]+\/[\w.-]+$/.test(repository || '') || !process.env.GITHUB_TOKEN)
  throw new Error('Run this in the repository workflow');
const entries = [];
for (let page = 1; ; page++) {
  const response = await fetch(
    `https://api.github.com/repos/${repository}/issues?state=all&labels=community-approved&per_page=100&page=${page}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
      },
    },
  );
  if (!response.ok) throw new Error(`GitHub API: ${response.status}`);
  const issues = await response.json();
  if (!issues.length) break;
  for (const issue of issues) {
    if (issue.pull_request) continue;
    for (const block of (issue.body || '').matchAll(/```(?:json)?\s*([\s\S]*?)```/g)) {
      try {
        const report = JSON.parse(block[1]);
        if (report.schema === 'tokengo-community-v1') {
          entries.push({ updatedAt: issue.updated_at, owner: String(issue.user.id), report });
          break;
        }
      } catch {}
    }
  }
}
const data = aggregateReports(entries, new Set(catalog().map((a) => a.id)));
await writeFile('community/rates.json', JSON.stringify(data, null, 2) + '\n');
console.log(
  `Aggregated ${data.participants} self-reported installations. No identities stored in the published dataset.`,
);
