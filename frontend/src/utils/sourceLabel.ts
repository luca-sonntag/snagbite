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
