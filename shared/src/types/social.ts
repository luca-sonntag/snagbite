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
