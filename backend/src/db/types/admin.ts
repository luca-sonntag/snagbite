export interface FeedbackInput {
  type: 'bug' | 'idea';
  message: string;
  context?: unknown;
  screenshotsBase64?: string[];
}

export interface FeedbackRow {
  id: string;
  user_id: string;
  type: string;
  message: string;
  context: unknown;
  screenshot_urls: string[] | null;
  created_at: string;
}

export interface AppBundleRow {
  id: string;
  channel: 'production' | 'alpha' | 'internal';
  version: string;
  storage_path: string;
  checksum: string;
  min_version_code: number;
  max_version_code: number | null;
  active: boolean;
  notes: string | null;
  created_at: string;
}

export interface FailedJobDetails {
  id: string;
  url: string;
  error: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationLogEntry {
  userId: string;
  category: string;
  type: string;
  recipeId?: string | null;
  title?: string | null;
}

export interface NotificationLogRow {
  sentAt: string;
  category: string;
  type: string;
  recipeId: string | null;
}

export interface NotificationUser {
  id: string;
  metadata: Record<string, unknown>;
}
