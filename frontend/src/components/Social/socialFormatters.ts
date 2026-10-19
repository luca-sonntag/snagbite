export function formatSmartDate(dateIso: string, language: string): string {
  const d = new Date(dateIso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const isEn = language.startsWith('en');

  if (diffSec < 60) return isEn ? 'Just now' : 'Gerade eben';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return isEn ? `${diffMin}m ago` : `vor ${diffMin} Min.`;

  const diffHours = Math.floor(diffMin / 60);
  const isToday = d.toDateString() === now.toDateString();
  const timeStr = d.toLocaleTimeString(isEn ? 'en-US' : 'de-DE', { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    if (diffHours < 4) return isEn ? `${diffHours}h ago` : `vor ${diffHours} Std.`;
    return isEn ? `Today, ${timeStr}` : `Heute, ${timeStr} Uhr`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return isEn ? `Yesterday, ${timeStr}` : `Gestern, ${timeStr} Uhr`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 6) {
    const weekday = d.toLocaleDateString(isEn ? 'en-US' : 'de-DE', { weekday: 'short' });
    return isEn ? `${weekday}, ${timeStr}` : `${weekday}, ${timeStr} Uhr`;
  }

  return d.toLocaleDateString(isEn ? 'en-US' : 'de-DE', { day: 'numeric', month: 'short' });
}

export function formatReactorsSummary(
  reactors: Array<{ displayName: string }>,
  language: string,
): string {
  if (!reactors || reactors.length === 0) return '';
  const isEn = language.startsWith('en');
  const first = reactors[0].displayName.split(' ')[0];
  if (reactors.length === 1) return isEn ? `${first} reacted` : `${first} gefällt das`;
  if (reactors.length === 2) return `${first} & ${reactors[1].displayName.split(' ')[0]}`;
  return `${first}, ${reactors[1].displayName.split(' ')[0]} +${reactors.length - 2}`;
}
