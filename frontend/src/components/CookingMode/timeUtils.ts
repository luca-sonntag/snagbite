// ─── Time parsing helpers for Cooking Mode ────────────────────────────────────

export function parseTimeToSeconds(timeStr: string): number {
  const s = timeStr.toLowerCase().trim();
  const numMatch = s.match(/(\d+(?:[.,]\d+)?)/);
  if (!numMatch) return 0;
  const value = parseFloat(numMatch[1].replace(',', '.'));
  const isHour = /stunden?|hours?|heures?|horas?|ore|uur|saat|std\.?|hrs?\.?|h\.?|godz\.?|godzin|godziny\b/.test(s);
  const isMinute = /minuten?|minutes?|minutos?|minuti|minuts?|minuty|minute?|minuta|minuty|dakika|min\.?|mins?\.?|dk\.?\b/.test(s);
  const isSecond = /sekunden?|seconds?|segundos?|secondes?|secondi|sekunda|sekundy|sekund|sekunde|saniye|sek\.?|secs?\.?|sec\.?|seg\.?|sn\.?\b/.test(s);
  if (isHour) return Math.round(value * 3600);
  if (isMinute) return Math.round(value * 60);
  if (isSecond) return Math.round(value);
  return Math.round(value * 60);
}

export function extractFirstDuration(text: string): number {
  if (!text) return 0;
  const rangeSeparator = `(?:–|—|-|bis|to|a|al|et|and|or|ve)`;
  const timePattern = `\\b\\d+(?:[.,]\\d+)?(?:\\s*${rangeSeparator}\\s*\\d+(?:[.,]\\d+)?)?\\s*(?:Sekunden|segundos|secondes|Minuten|minutes|minutos|Stunden|godzina|godziny|seconds|secondi|sekunda|seconde|secondo|segundo|sekundy|minuti|dakika|minuts|minuta|minuto|minute|minuty|heures|godzin|stunde|saniye|sekund|second|minut|hours|horas|godz\\.|heure|min\\.|mins|hour|hora|std\\.|godz|uren|saat|sek\\.|secs|sec\\.|sec\\.|seg\\.|min|dk\\.|std|hrs|hr\\.|ore|ora|uur|sek|sec|seg|sn\\.|dk|hr|u\\.|h\\.|sn|u|h)(?![a-zA-Z0-9])`;
  const regex = new RegExp(timePattern, 'gi');
  const match = text.match(regex);
  if (match && match[0]) {
    return parseTimeToSeconds(match[0]);
  }
  return 0;
}
