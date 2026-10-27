import { hapticLight } from './haptics';

/**
 * Returns the public canonical base URL for invitations.
 * In a Capacitor app on Android/iOS, window.location.origin is 'https://localhost',
 * so we must fall back to 'https://snagbite.app'.
 */
export function getInviteBaseUrl(): string {
  const envUrl = import.meta.env.VITE_WEBSITE_URL;
  if (envUrl) {
    return String(envUrl).replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost')) {
    return window.location.origin;
  }
  return 'https://snagbite.app';
}

/**
 * Generates the full invite link for a given friend code.
 */
export function getInviteUrl(friendCode: string): string {
  return `${getInviteBaseUrl()}/invite/${encodeURIComponent(friendCode)}`;
}

export interface ShareInviteOptions {
  friendCode: string;
  /**
   * Invite message text. Can either be a template containing '{code}'
   * or a pre-formatted message without the link.
   */
  inviteText: string;
  dialogTitle?: string;
  onCopied?: () => void;
}

/**
 * Shared invitation logic for sharing a friend code / invite link.
 * Used identically across FriendsProfileCard (upper share button),
 * FriendsListSection ("Einladung teilen"), FriendsFeedView, and ShareWithFriendsModal.
 */
export async function shareInviteCode({
  friendCode,
  inviteText,
  dialogTitle,
  onCopied,
}: ShareInviteOptions): Promise<'shared' | 'copied' | 'failed'> {
  hapticLight();

  const url = getInviteUrl(friendCode);
  const text = inviteText.includes('{code}')
    ? inviteText.replace('{code}', friendCode) + '\n' + url
    : (inviteText.includes('http') ? inviteText : `${inviteText}\n${url}`);

  // 1. Try Native Capacitor Share
  try {
    const { Share } = await import('@capacitor/share');
    const canShare = await Share.canShare();
    if (canShare.value) {
      await Share.share({
        title: 'Snagbite',
        text,
        dialogTitle,
      });
      return 'shared';
    }
  } catch {
    /* ignore and fallback */
  }

  // 2. Try Web Share API (mobile browsers)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'Snagbite', text });
      return 'shared';
    } catch {
      /* ignore and fallback to clipboard */
    }
  }

  // 3. Fallback: Copy to clipboard
  try {
    const { Clipboard } = await import('@capacitor/clipboard');
    await Clipboard.write({ string: text });
    onCopied?.();
    return 'copied';
  } catch {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        onCopied?.();
        return 'copied';
      }
    } catch {
      /* ignore */
    }
  }

  return 'failed';
}
