export interface ProfileRow {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  friend_code: string;
}

export interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
  responded_at: string | null;
}

export interface RawUserStatsRow {
  user_id: string;
  xp: number | string;
  level: number;
  coins: number | string;
  current_streak: number;
  longest_streak: number;
  last_cook_date: string | null;
  total_cooks: number;
}
