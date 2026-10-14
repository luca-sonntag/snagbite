import { apiUrl } from '../api';
import { authClient } from '../auth';

export interface MetadataUpdateResult {
  metadata?: Record<string, unknown>;
  notificationsEnabled?: boolean;
  error?: string;
}

/**
 * Persist user metadata & UI flags to backend via PATCH /api/users/me/metadata.
 */
export async function patchUserMetadata(
  token: string,
  metadata: Record<string, unknown>
): Promise<MetadataUpdateResult> {
  try {
    const res = await fetch(apiUrl('/api/users/me/metadata'), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(metadata),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { error: errData.error || errData.message || 'Update failed' };
    }

    const data = await res.json().catch(() => ({}));

    // Best-effort Better-Auth sync for name / avatar if supplied
    if (metadata.name !== undefined || metadata.image !== undefined) {
      try {
        await (authClient.updateUser as (args: Record<string, unknown>) => Promise<unknown>)({
          ...(metadata.name !== undefined ? { name: metadata.name } : {}),
          ...(metadata.image !== undefined ? { image: metadata.image } : {}),
        });
      } catch {}
    }

    return {
      metadata: data.metadata,
      notificationsEnabled: data.notificationsEnabled,
    };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Update failed' };
  }
}

/**
 * Permanently delete the current user account via DELETE /api/users/me.
 */
export async function deleteUserAccount(token: string): Promise<{ error?: string }> {
  try {
    const response = await fetch(apiUrl('/api/users/me'), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { error: data.error || 'Failed to delete account' };
    }

    return {};
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
