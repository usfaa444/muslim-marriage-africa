/** Drops a Stitch review block. The end marker stays on the served page. */
export function dropUntil(html: string, start: string, end: string, label: string): string {
  const from = html.indexOf(start)
  const to = from < 0 ? -1 : html.indexOf(end, from + start.length)
  if (from < 0 || to < 0) {
    throw new Error(`${label} is missing its design-artifact markers`)
  }
  return html.slice(0, from) + html.slice(to)
}

/** Replaces the span that begins at start and stops before end. The end marker stays. */
export function replaceUntil(
  html: string,
  start: string,
  end: string,
  replacement: string,
  label: string,
): string {
  const from = html.indexOf(start)
  const to = from < 0 ? -1 : html.indexOf(end, from + start.length)
  if (from < 0 || to < 0) {
    throw new Error(`${label} is missing its design-artifact markers`)
  }
  return html.slice(0, from) + replacement + html.slice(to)
}
