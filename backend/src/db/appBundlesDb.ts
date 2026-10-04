import { db } from './drizzle.js';
import { appBundles } from './schema/system.js';
import { eq, and, desc, lte, or, gte, isNull } from 'drizzle-orm';
import type { AppBundleRow } from './types.js';

function toAppBundleRow(r: typeof appBundles.$inferSelect): AppBundleRow {
  return {
    id: r.id,
    channel: r.channel as 'production' | 'alpha' | 'internal',
    version: r.version,
    storage_path: r.storagePath,
    checksum: r.checksum,
    min_version_code: r.minVersionCode,
    max_version_code: r.maxVersionCode,
    active: r.active,
    notes: r.notes,
    created_at: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
  };
}

export async function getActiveAppBundle(
  channel: string,
  versionCode: number
): Promise<AppBundleRow | null> {
  const [row] = await db
    .select()
    .from(appBundles)
    .where(and(
      eq(appBundles.channel, channel),
      eq(appBundles.active, true),
      lte(appBundles.minVersionCode, versionCode),
      or(isNull(appBundles.maxVersionCode), gte(appBundles.maxVersionCode, versionCode))
    ))
    .limit(1);

  return row ? toAppBundleRow(row) : null;
}

export async function listAppBundles(channel?: string): Promise<AppBundleRow[]> {
  const conditions = channel ? [eq(appBundles.channel, channel)] : [];
  const rows = await db
    .select()
    .from(appBundles)
    .where(and(...conditions))
    .orderBy(desc(appBundles.createdAt));

  return rows.map(toAppBundleRow);
}

export async function setAppBundleActive(id: string, active: boolean): Promise<AppBundleRow> {
  const [row] = await db
    .select()
    .from(appBundles)
    .where(eq(appBundles.id, id))
    .limit(1);

  if (!row) throw new Error(`App bundle ${id} not found`);

  if (active) {
    await db
      .update(appBundles)
      .set({ active: false })
      .where(and(
        eq(appBundles.channel, row.channel),
        eq(appBundles.active, true)
      ));
  }

  const [updated] = await db
    .update(appBundles)
    .set({ active })
    .where(eq(appBundles.id, id))
    .returning();

  if (!updated) throw new Error(`Failed to set app bundle ${id} active=${active}`);
  return toAppBundleRow(updated);
}
