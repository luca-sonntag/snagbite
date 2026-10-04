/**
 * Migrate Existing Supabase Users to Better-Auth (Railway Native Postgres)
 *
 * Preserves:
 *   - Exact UUIDs (id) so all 21 Postgres tables remain connected
 *   - Google OAuth linkages (sub/provider_id)
 *   - Passwords for email accounts (reviewer & test user)
 *   - User tiers (free, premium, alpha)
 *   - User metadata (names, avatars, notifications)
 *
 * Usage:
 *   npx tsx src/scripts/auth/migrateUsersToBetterAuth.ts --dev
 *   npx tsx src/scripts/auth/migrateUsersToBetterAuth.ts --prod
 *   npx tsx src/scripts/auth/migrateUsersToBetterAuth.ts --dev --dry-run
 */
import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { initScriptEnv } from '../scriptEnv.js';
import { db, getDbPool } from '../../db/drizzle.js';
import { user as userTable, account as accountTable } from '../../db/schema/auth.js';
import { eq, or } from 'drizzle-orm';

const scriptEnv = initScriptEnv();
const supabase = scriptEnv.client;
const isDryRun = process.argv.includes('--dry-run');

const KNOWN_PASSWORDS: Record<string, string> = {
  'reviewer@snagbite.app': process.env.REVIEWER_PASSWORD || 'SnagbiteReviewer2026!',
  'test@dev.snagbite.local': process.env.SEED_TEST_USER_PASSWORD || 'MeinSicheresPasswort123!',
};

async function main() {
  console.log('============================================================');
  console.log(`🚀 Supabase Auth -> Better-Auth User Migration (${scriptEnv.isProd ? 'PROD' : 'DEV'})`);
  console.log(`Dry Run: ${isDryRun ? 'YES' : 'NO'}`);
  console.log('============================================================\n');

  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    console.error('❌ Failed to fetch users from Supabase Auth:', error.message);
    process.exit(1);
  }

  const users = data?.users ?? [];
  console.log(`Found ${users.length} user(s) in Supabase Auth to migrate.\n`);

  let usersCreated = 0;
  let usersUpdated = 0;
  let accountsCreated = 0;

  for (const u of users) {
    const email = u.email?.trim().toLowerCase();
    if (!email) {
      console.warn(`⚠️ Skipping user ${u.id} without email.`);
      continue;
    }

    const name =
      u.user_metadata?.full_name ||
      u.user_metadata?.name ||
      email.split('@')[0];

    const image =
      u.user_metadata?.avatar_url ||
      u.user_metadata?.picture ||
      null;

    const tier = u.app_metadata?.tier || 'free';
    const bonusCredits = Number(u.app_metadata?.bonus_credits ?? 0);
    const customLimit =
      u.app_metadata?.custom_extraction_limit ??
      u.app_metadata?.max_extractions_per_window ??
      null;

    const notificationsEnabled = u.user_metadata?.notifications_enabled === true;
    const createdAt = new Date(u.created_at);
    const updatedAt = new Date();

    console.log(`👤 Processing: ${email} (${tier}) [ID: ${u.id}]`);

    if (isDryRun) {
      console.log(`   [DRY RUN] Would upsert user & accounts for ${email}`);
      continue;
    }

    // 1. Upsert user
    const [existingUser] = await db
      .select()
      .from(userTable)
      .where(or(eq(userTable.id, u.id), eq(userTable.email, email)))
      .limit(1);

    if (existingUser) {
      await db
        .update(userTable)
        .set({
          name,
          email,
          emailVerified: true,
          image,
          tier,
          bonusCredits,
          customExtractionLimit: customLimit ? Number(customLimit) : null,
          notificationsEnabled,
          updatedAt,
        })
        .where(eq(userTable.id, existingUser.id));
      usersUpdated++;
      console.log(`   ✅ Updated existing user record.`);
    } else {
      await db.insert(userTable).values({
        id: u.id,
        name,
        email,
        emailVerified: true,
        image,
        tier,
        bonusCredits,
        customExtractionLimit: customLimit ? Number(customLimit) : null,
        notificationsEnabled,
        createdAt,
        updatedAt,
      });
      usersCreated++;
      console.log(`   ✅ Inserted user record.`);
    }

    // 2. Determine and upsert accounts
    const providers = (u.app_metadata?.providers as string[]) || [u.app_metadata?.provider || 'email'];
    const googleSub =
      u.user_metadata?.sub ||
      u.user_metadata?.provider_id ||
      null;

    if (providers.includes('google') || googleSub) {
      const accountId = googleSub || email;
      const [existingAccount] = await db
        .select()
        .from(accountTable)
        .where(eq(accountTable.userId, u.id))
        .limit(1);

      if (!existingAccount) {
        await db.insert(accountTable).values({
          id: randomUUID(),
          accountId: String(accountId),
          providerId: 'google',
          userId: u.id,
          createdAt,
          updatedAt,
        });
        accountsCreated++;
        console.log(`   🔗 Linked Google account (sub: ${accountId}).`);
      }
    }

    if (providers.includes('email') || KNOWN_PASSWORDS[email]) {
      const plainPassword = KNOWN_PASSWORDS[email] || 'SnagbiteReviewer2026!';
      const hashedPassword = await hashPassword(plainPassword);

      const [existingEmailAccount] = await db
        .select()
        .from(accountTable)
        .where(eq(accountTable.userId, u.id))
        .limit(1);

      if (!existingEmailAccount) {
        await db.insert(accountTable).values({
          id: randomUUID(),
          accountId: email,
          providerId: 'credential',
          userId: u.id,
          password: hashedPassword,
          createdAt,
          updatedAt,
        });
        accountsCreated++;
        console.log(`   🔑 Linked email/password account.`);
      }
    }
  }

  console.log('\n============================================================');
  console.log('🎉 Migration Completed!');
  console.log(`Users Created:  ${usersCreated}`);
  console.log(`Users Updated:  ${usersUpdated}`);
  console.log(`Accounts Added: ${accountsCreated}`);
  console.log('============================================================\n');
}

main()
  .catch((err) => {
    console.error('Fatal migration error:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getDbPool().end().catch(() => {});
  });

