export const emptyRates = () => ({
  schema: 'tokengo-rates-v1',
  participants: 0,
  updatedAt: null,
  counts: {},
});
export function validateReport(report, ids) {
  if (
    !report ||
    report.schema !== 'tokengo-community-v1' ||
    !/^[a-f0-9]{32}$/.test(report.participant) ||
    !Array.isArray(report.achievements) ||
    report.achievements.length > ids.size
  )
    throw new Error('Invalid anonymous report');
  if (Object.keys(report).some((k) => !['schema', 'participant', 'achievements'].includes(k)))
    throw new Error('Report contains unexpected data');
  const seen = new Set();
  for (const a of report.achievements) {
    if (
      !a ||
      !ids.has(a.id) ||
      seen.has(a.id) ||
      ![1, 2, 3].includes(a.level) ||
      Object.keys(a).some((k) => !['id', 'level'].includes(k))
    )
      throw new Error('Invalid achievement in report');
    seen.add(a.id);
  }
  return report;
}
export function validateRates(data, ids) {
  if (
    !data ||
    data.schema !== 'tokengo-rates-v1' ||
    !Number.isSafeInteger(data.participants) ||
    data.participants < 0 ||
    !data.counts ||
    typeof data.counts !== 'object' ||
    Array.isArray(data.counts) ||
    Object.keys(data.counts).length > ids.size
  )
    throw new Error('Invalid community sample');
  if (Object.keys(data).some((k) => !['schema', 'participants', 'updatedAt', 'counts'].includes(k)))
    throw new Error('Unexpected sample data');
  if (data.updatedAt !== null && !Number.isFinite(Date.parse(data.updatedAt)))
    throw new Error('Invalid sample date');
  for (const [id, row] of Object.entries(data.counts)) {
    if (
      !ids.has(id) ||
      !row ||
      Object.keys(row).some((k) => !['bronze', 'silver', 'gold'].includes(k)) ||
      !['bronze', 'silver', 'gold'].every(
        (k) => Number.isSafeInteger(row[k]) && row[k] >= 0 && row[k] <= data.participants,
      ) ||
      row.bronze < row.silver ||
      row.silver < row.gold
    )
      throw new Error('Invalid community counts');
  }
  return {
    schema: data.schema,
    participants: data.participants,
    updatedAt: data.updatedAt,
    counts: data.counts,
  };
}
export function aggregateReports(entries, ids, now = new Date().toISOString()) {
  const latest = new Map(),
    owners = new Map();
  for (const entry of [...entries].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))) {
    try {
      validateReport(entry.report, ids);
      owners.set(entry.owner || entry.report.participant, entry);
    } catch {}
  }
  for (const entry of owners.values()) latest.set(entry.report.participant, entry.report);
  const result = { ...emptyRates(), participants: latest.size, updatedAt: now };
  for (const report of latest.values())
    for (const a of report.achievements) {
      const row = (result.counts[a.id] ||= { bronze: 0, silver: 0, gold: 0 });
      ['bronze', 'silver', 'gold'].slice(0, a.level).forEach((medal) => row[medal]++);
    }
  return result;
}
