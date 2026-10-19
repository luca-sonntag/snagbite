/**
 * Provision/verify a test user in the DEV PostgreSQL database for Better-Auth
 * so the frontend preview can auto-sign-in without manual registration.
 *
 * SAFETY: run this ONLY against the DEV database — never production.
 *
 * Required env (e.g. in backend/.env or the shell):
 *   DATABASE_URL
 *   SEED_TEST_USER_EMAIL    — test user email (default test@dev.snagbite.local)
 *   SEED_TEST_USER_PASSWORD — test user password (default snagbite-dev-test-2026)
 *
 * Usage:
 *   cd backend && npm run seed:dev
 */
import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { db } from '../../db/drizzle.js';
import { user as userTable, account as accountTable } from '../../db/schema/auth.js';
import { eq, or } from 'drizzle-orm';
import { initScriptEnv } from '../scriptEnv.js';

initScriptEnv({ target: 'dev' });

const TEST_USER_EMAIL = (process.env.SEED_TEST_USER_EMAIL || 'test@dev.snagbite.local').trim().toLowerCase();
const TEST_USER_PASSWORD = process.env.SEED_TEST_USER_PASSWORD || 'snagbite-dev-test-2026';

async function getOrCreateTestUser(): Promise<string> {
  const hashedPassword = await hashPassword(TEST_USER_PASSWORD);

  const [existingUser] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, TEST_USER_EMAIL))
    .limit(1);

  if (existingUser) {
    console.log(`Test user ${TEST_USER_EMAIL} exists, updating credentials...`);
    const [existingAccount] = await db
      .select()
      .from(accountTable)
      .where(
        or(
          eq(accountTable.userId, existingUser.id),
          eq(accountTable.accountId, TEST_USER_EMAIL)
        )
      )
      .limit(1);

    if (existingAccount) {
      await db
        .update(accountTable)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(accountTable.id, existingAccount.id));
    } else {
      await db.insert(accountTable).values({
        id: randomUUID(),
        accountId: TEST_USER_EMAIL,
        providerId: 'credential',
        userId: existingUser.id,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await db
      .update(userTable)
      .set({
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, existingUser.id));

    return existingUser.id;
  }

  const userId = randomUUID();
  console.log(`Creating test user ${TEST_USER_EMAIL} with id ${userId}...`);

  await db.insert(userTable).values({
    id: userId,
    name: 'Dev Test User',
    email: TEST_USER_EMAIL,
    emailVerified: true,
    tier: 'alpha',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(accountTable).values({
    id: randomUUID(),
    accountId: TEST_USER_EMAIL,
    providerId: 'credential',
    userId,
    password: hashedPassword,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return userId;
}

async function main() {
  const userId = await getOrCreateTestUser();

  console.log('\n✅ Dev test user setup complete.');
  console.log(`   User:     ${TEST_USER_EMAIL}`);
  console.log(`   User ID:  ${userId}`);
  console.log('   Set VITE_TEST_USER_EMAIL / VITE_TEST_USER_PASSWORD in the frontend preview to auto-login as this user.');
}

main().catch(err => {
  console.error('Seed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
