import { db } from './drizzle.js';
import { appBundles } from './schema/system.js';
import { eq, and, desc, lte, lt, or, gte, isNull } from 'drizzle-orm';
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

export async function createAppBundle(data: {
  channel: 'production' | 'alpha' | 'internal';
  version: string;
  storagePath: string;
  checksum: string;
  minVersionCode: number;
  maxVersionCode?: number | null;
  active?: boolean;
  notes?: string;
}): Promise<AppBundleRow> {
  if (data.active) {
    await db
      .update(appBundles)
      .set({ active: false })
      .where(and(
        eq(appBundles.channel, data.channel),
        eq(appBundles.active, true)
      ));
  }

  const [row] = await db
    .insert(appBundles)
    .values({
      channel: data.channel,
      version: data.version,
      storagePath: data.storagePath,
      checksum: data.checksum,
      minVersionCode: data.minVersionCode,
      maxVersionCode: data.maxVersionCode ?? null,
      active: data.active ?? false,
      notes: data.notes ?? null,
    })
    .returning();

  return toAppBundleRow(row);
}

export async function capOpenEndedAppBundles(newVersionCode: number): Promise<number> {
  const cappedMaxCode = newVersionCode - 1;
  const result = await db
    .update(appBundles)
    .set({ maxVersionCode: cappedMaxCode })
    .where(and(
      lt(appBundles.minVersionCode, newVersionCode),
      isNull(appBundles.maxVersionCode)
    ))
    .returning({ id: appBundles.id });

  return result.length;
}
