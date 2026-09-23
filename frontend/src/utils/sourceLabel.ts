/**
 * Reusable helper to format human-readable source labels for recipe links and photo imports.
 */
export function formatSourceLabel(rawLabel: string): string {
  if (!rawLabel) return 'Rezept';
  if (rawLabel.startsWith('photo://')) return 'Foto-Rezept';
  try {
    if (rawLabel.startsWith('http://') || rawLabel.startsWith('https://')) {
      const url = new URL(rawLabel);
      const hostname = url.hostname.toLowerCase();
      if (hostname.includes('instagram.com')) return 'Instagram Reel';
      if (hostname.includes('tiktok.com')) return 'TikTok Video';
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'YouTube Shorts';
      if (hostname.includes('facebook.com')) return 'Facebook Video';
      return hostname.replace(/^www\./, '');
    }
  } catch {
    // fallback to raw label
  }
  return rawLabel;
}

export type SourceChannel = 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'photo' | 'web';

export function getSourceChannel(sourceUrl: string): SourceChannel {
  if (!sourceUrl) return 'web';
  if (sourceUrl.startsWith('photo://')) return 'photo';
  const lower = sourceUrl.toLowerCase();
  if (lower.includes('instagram.com')) return 'instagram';
  if (lower.includes('tiktok.com')) return 'tiktok';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('facebook.com')) return 'facebook';
  return 'web';
}

/**
 * Extracts a distinctive short identifier or title slug from a recipe URL to distinguish queue items.
 */
export function getUrlIdentifier(rawUrl: string): string | null {
  if (!rawUrl || rawUrl.startsWith('photo://')) return null;
  try {
    const url = new URL(rawUrl);
    const pathname = url.pathname.replace(/\/+$/, '');
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) return null;

    const hostname = url.hostname.toLowerCase();

    // Instagram: /reel/CODE or /p/CODE
    if (hostname.includes('instagram.com')) {
      const idx = parts.findIndex((p) => p === 'reel' || p === 'p');
      if (idx !== -1 && parts[idx + 1]) {
        return `reel/${parts[idx + 1].slice(0, 10)}`;
      }
      return parts[parts.length - 1]?.slice(0, 10) || null;
    }

    // TikTok: /@username/video/12345
    if (hostname.includes('tiktok.com')) {
      const userPart = parts.find((p) => p.startsWith('@'));
      if (userPart) {
        return userPart;
      }
      return parts[parts.length - 1] || null;
    }

    // YouTube: /shorts/CODE or watch?v=CODE
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      if (parts[0] === 'shorts' && parts[1]) {
        return `shorts/${parts[1].slice(0, 8)}`;
      }
      const v = url.searchParams.get('v');
      if (v) return `v/${v.slice(0, 8)}`;
      return parts[parts.length - 1] || null;
    }

    // Web recipes: clean slug from last path segment
    const last = parts[parts.length - 1];
    if (last) {
      const cleanSlug = last.replace(/\.(html?|php)$/i, '').replace(/^\d+[-_]?/, '');
      if (cleanSlug.length > 2) {
        return cleanSlug
          .replace(/[-_]+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .slice(0, 24);
      }
    }
    return null;
  } catch {
    return null;
  }
}
