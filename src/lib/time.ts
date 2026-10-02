/** Current time in ms. Wrapped so components can read the clock explicitly per request/event. */
export function nowMs() {
  return Date.now();
}

export function daysAgoIso(days: number) {
  return new Date(nowMs() - days * 86_400_000).toISOString();
}
