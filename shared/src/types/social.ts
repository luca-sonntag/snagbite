export interface Profile {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  friendCode: string;
}

export interface FriendSummary {
  friendshipId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  xp?: number;
  currentStreak: number;
  totalCooks?: number;
}

export interface FriendRequest {
  friendshipId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

export type LeaderboardWindow = 'monthly' | 'all';
export type LeaderboardScope = 'friends' | 'global';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  value: number;
  isMe: boolean;
  friendshipStatus?: 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'self';
  friendshipId?: string;
}

export type FeedReactionEmoji = '🔥' | '❤️' | '😋';

export interface FeedReactionSummary {
  emoji: FeedReactionEmoji;
  count: number;
  reactedByMe: boolean;
}

export interface FeedReactor {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  emoji: FeedReactionEmoji;
}

export interface FriendFeedItem {
  cookEventId: string;
  cookedAt: string;
  photoUrl: string;
  xpAwarded: number;
  coinsAwarded: number;
  verified: boolean;
  viaCookingMode: boolean;
  timerElapsed: boolean;
  user: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    level: number;
    isMe: boolean;
  };
  recipe: import('./recipes.js').Recipe;
  isRecipeSaved: boolean;
  reactions: FeedReactionSummary[];
  recentReactors?: FeedReactor[];
}

export interface SharedRecipeItem {
  shareId: string;
  createdAt: string;
  status: 'unread' | 'seen' | 'saved';
  message: string | null;
  sender: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
  };
  recipe: import('./recipes.js').Recipe;
  isRecipeSaved: boolean;
}
