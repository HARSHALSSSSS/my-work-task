function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseEtaMinutes(source: any): number | null {
  const minuteCandidate =
    toNumber(source?.etaMinutes)
    ?? toNumber(source?.eta_minutes)
    ?? toNumber(source?.readyInMinutes)
    ?? toNumber(source?.ready_in_minutes)
    ?? toNumber(source?.pickupEtaMinutes)
    ?? toNumber(source?.pickup_eta_minutes)
    ?? toNumber(source?.turnaroundMinutes)
    ?? toNumber(source?.turnaround_minutes);

  if (minuteCandidate !== null && minuteCandidate > 0) {
    return minuteCandidate;
  }

  const hoursCandidate =
    toNumber(source?.etaHours)
    ?? toNumber(source?.eta_hours)
    ?? toNumber(source?.readyInHours)
    ?? toNumber(source?.ready_in_hours)
    ?? toNumber(source?.pickupEtaHours)
    ?? toNumber(source?.pickup_eta_hours)
    ?? toNumber(source?.turnaroundHours)
    ?? toNumber(source?.turnaround_hours);

  if (hoursCandidate !== null && hoursCandidate > 0) {
    return Math.round(hoursCandidate * 60);
  }

  return null;
}

function parseEtaDate(source: any): Date | null {
  const raw =
    source?.pickupBy
    || source?.pickup_by
    || source?.readyBy
    || source?.ready_by
    || source?.readyAt
    || source?.ready_at
    || source?.estimatedReadyAt
    || source?.estimated_ready_at
    || source?.etaAt
    || source?.eta_at
    || '';

  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function parseEtaLabel(source: any): string {
  const value = String(
    source?.pickupEtaLabel
    || source?.pickup_eta_label
    || source?.etaLabel
    || source?.eta_label
    || source?.readyLabel
    || source?.ready_label
    || source?.pickupEtaText
    || source?.pickup_eta_text
    || source?.etaText
    || source?.eta_text
    || source?.readyText
    || source?.ready_text
    || '',
  ).trim();

  return value;
}

function formatRelativeReadyTime(etaMinutes: number): string {
  if (etaMinutes < 60) return `Ready in ${etaMinutes} min`;
  const roundedHours = Math.round((etaMinutes / 60) * 10) / 10;
  const display = Number.isInteger(roundedHours) ? `${roundedHours}` : `${roundedHours}`;
  return `Ready in ${display} hour${roundedHours === 1 ? '' : 's'}`;
}

function formatPickupByDate(date: Date): string {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isTomorrow =
    date.getFullYear() === tomorrow.getFullYear()
    && date.getMonth() === tomorrow.getMonth()
    && date.getDate() === tomorrow.getDate();

  const timeText = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (date <= endOfToday) {
    return `Pickup by ${timeText}`;
  }

  if (isTomorrow) {
    return `Pickup by tomorrow ${timeText}`;
  }

  const dayText = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `Pickup by ${dayText}, ${timeText}`;
}

export function resolvePickupEtaLabel(source: any, fallbackLabel = ''): string {
  const directLabel = parseEtaLabel(source);
  if (directLabel) return directLabel;

  const etaMinutes = parseEtaMinutes(source);
  if (etaMinutes && etaMinutes > 0) {
    return formatRelativeReadyTime(etaMinutes);
  }

  const etaDate = parseEtaDate(source);
  if (etaDate) {
    return formatPickupByDate(etaDate);
  }

  return fallbackLabel;
}
