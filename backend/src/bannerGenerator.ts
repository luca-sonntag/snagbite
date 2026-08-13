import sharp from 'sharp';

export type BannerTheme =
  | 'italian'
  | 'fresh'
  | 'asian'
  | 'hearty'
  | 'sweet'
  | 'breakfast'
  | 'seafood'
  | 'emerald';

interface ThemePalette {
  startColor: string;
  endColor: string;
  glowColor: string;
}

export const THEME_PALETTES: Record<BannerTheme, ThemePalette> = {
  italian: {
    startColor: '#D9381E',
    endColor: '#F39C12',
    glowColor: '#FF7E67',
  },
  fresh: {
    startColor: '#10B981',
    endColor: '#046A38',
    glowColor: '#34D399',
  },
  asian: {
    startColor: '#E11D48',
    endColor: '#D97706',
    glowColor: '#FB7185',
  },
  hearty: {
    startColor: '#B45309',
    endColor: '#581C87',
    glowColor: '#F59E0B',
  },
  sweet: {
    startColor: '#DB2777',
    endColor: '#7C3AED',
    glowColor: '#F472B6',
  },
  breakfast: {
    startColor: '#D97706',
    endColor: '#CA8A04',
    glowColor: '#FBBF24',
  },
  seafood: {
    startColor: '#0284C7',
    endColor: '#0F766E',
    glowColor: '#38BDF8',
  },
  emerald: {
    startColor: '#059669',
    endColor: '#064E3B',
    glowColor: '#6EE7B7',
  },
};

export const THEME_DEFAULT_EMOJIS: Record<BannerTheme, string> = {
  italian: '🍕',
  fresh: '🥗',
  asian: '🍜',
  hearty: '🍔',
  sweet: '🍰',
  breakfast: '🥞',
  seafood: '🐟',
  emerald: '🥪',
};

/**
 * Extracts the first emoji grapheme cluster from a string.
 * Strips surrounding text, whitespace, or extra trailing emojis.
 */
export function extractFirstEmoji(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Match single emoji including skin tones, variation selectors, and ZWJ sequences
  const match = trimmed.match(/\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|\uD83C[\uDFFB-\uDFFF])*/u);
  return match ? match[0] : null;
}

/**
 * Generate candidate hex codes for Noto / Twemoji URL lookup.
 * Returns variants with and without variation selector \uFE0F, plus fallback if ZWJ sequence.
 */
export function getHexVariants(emoji: string): string[] {
  const allCodes: string[] = [];
  const noFe0fCodes: string[] = [];

  for (const char of emoji) {
    const cp = char.codePointAt(0);
    if (cp !== undefined) {
      const hex = cp.toString(16).toLowerCase();
      allCodes.push(hex);
      if (cp !== 0xfe0f) {
        noFe0fCodes.push(hex);
      }
    }
  }

  const variants = new Set<string>();
  if (noFe0fCodes.length > 0) variants.add(noFe0fCodes.join('_'));
  if (allCodes.length > 0) variants.add(allCodes.join('_'));

  // If ZWJ sequence, also add the base emoji as a fallback
  if (noFe0fCodes.length > 1 && noFe0fCodes.includes('200d')) {
    const firstPart = noFe0fCodes[0];
    if (firstPart) variants.add(firstPart);
  }

  return Array.from(variants);
}

/** In-memory cache for fetched Google Noto Color Emoji PNG buffers */
export const emojiPngCache = new Map<string, Buffer | null>();

async function fetchWithTimeout(url: string, timeoutMs = 3500): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

/** Fetch official Google Noto Color Emoji PNG (128x128) with fallback to Twemoji */
export async function fetchEmojiPng(emoji: string): Promise<Buffer | null> {
  const cleanedEmoji = extractFirstEmoji(emoji);
  if (!cleanedEmoji) return null;

  if (emojiPngCache.has(cleanedEmoji)) {
    return emojiPngCache.get(cleanedEmoji)!;
  }

  const variants = getHexVariants(cleanedEmoji);

  for (const hex of variants) {
    // 1. Google Noto Color Emoji (raw GitHub)
    const primaryUrl = `https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/128/emoji_u${hex}.png`;
    let buf = await fetchWithTimeout(primaryUrl);
    if (buf) {
      emojiPngCache.set(cleanedEmoji, buf);
      return buf;
    }

    // 2. Twemoji PNG (jsDelivr CDN)
    const fallbackUrl = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${hex}.png`;
    buf = await fetchWithTimeout(fallbackUrl);
    if (buf) {
      emojiPngCache.set(cleanedEmoji, buf);
      return buf;
    }
  }

  console.warn(`[bannerGenerator] Failed to fetch emoji for "${emoji}" (cleaned: "${cleanedEmoji}", variants: ${variants.join(', ')})`);
  emojiPngCache.set(cleanedEmoji, null);
  return null;
}

export interface IconOptions {
  theme?: string;
  emoji?: string;
}

/**
 * Generates a 256x256 square PNG image buffer with the theme gradient and centered emoji for push notifications.
 */
export async function generateIconPNG(options: IconOptions): Promise<Buffer> {
  const themeKey = (options.theme?.toLowerCase() as BannerTheme) in THEME_PALETTES
    ? (options.theme?.toLowerCase() as BannerTheme)
    : 'emerald';

  const palette = THEME_PALETTES[themeKey];

  const svgString = `
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.startColor}" />
      <stop offset="100%" stop-color="${palette.endColor}" />
    </linearGradient>
    <radialGradient id="ambientGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${palette.glowColor}" stop-opacity="0.4" />
      <stop offset="100%" stop-color="${palette.glowColor}" stop-opacity="0" />
    </radialGradient>
  </defs>

  <rect width="256" height="256" rx="48" fill="url(#bgGrad)" />
  <circle cx="128" cy="128" r="100" fill="url(#ambientGlow)" />
</svg>
`.trim();

  let instance = sharp(Buffer.from(svgString));

  let emojiPng: Buffer | null = null;
  if (options.emoji) {
    emojiPng = await fetchEmojiPng(options.emoji);
  }

  // If specified emoji wasn't found / invalid, fallback to theme default emoji
  if (!emojiPng) {
    const defaultEmoji = THEME_DEFAULT_EMOJIS[themeKey] || '🥪';
    emojiPng = await fetchEmojiPng(defaultEmoji);
  }

  if (emojiPng) {
    const resizedEmoji = await sharp(emojiPng).resize(160, 160).toBuffer();
    instance = instance.composite([{ input: resizedEmoji, top: 48, left: 48 }]);
  }

  return instance.png({ quality: 90 }).toBuffer();
}
