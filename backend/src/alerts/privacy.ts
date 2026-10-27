/**
 * Data-minimisation helpers for operator alerts. Alerts leave our
 * infrastructure (ntfy server, mobile push relay), so personal data is reduced
 * before it is ever put into a message.
 */

/** `lucas@gmail.com` → `l***@gmail.com`. Returns `null` for missing/invalid input. */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.lastIndexOf('@');
  if (at < 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!domain) return null;
  return `${local[0]}***@${domain}`;
}

/** Collapses whitespace and cuts text to `max` characters with an ellipsis. */
export function excerpt(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}
