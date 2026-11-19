// A single, local line-icon vocabulary for controls. Badge artwork is separate.
const paths = {
  cabinet: 'M4 3h16v18H4zM4 12h16M12 3v18M7 7h2m6 0h2M7 16h2m6 0h2',
  medal: 'M8 3h3l1 5 1-5h3l-2 7M10 10 8 3M12 9a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z',
  lock: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5zM12 14v3',
  chart: 'M4 3v17h17M8 15v-4m5 4V6m5 9v-7',
  history: 'M4 7a9 9 0 1 1-1 8M4 3v5h5m3-2v6l4 2',
  community:
    'M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-3a6 6 0 0 1 12 0v3m3-17a4 4 0 0 1 0 8m1 3a5 5 0 0 1 4 5v1',
  settings: 'M4 6h16M4 18h16M8 3v6m8 6v6M4 12h16m-4-3v6',
  preview: 'M3 5h18v14H3zM7 9h4m-4 4h10',
  pin: 'M8 3h8l-1 7 4 4H5l4-4-1-7Zm4 11v7',
  check: 'm5 12 4 4L19 6',
  plus: 'M12 4v16M4 12h16',
  search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6',
  refresh: 'M4 7a9 9 0 0 1 15 0l2 3m0-6v6h-6M20 17a9 9 0 0 1-15 0l-2-3m0 6v-6h6',
};
export function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.medal}"/></svg>`;
}
