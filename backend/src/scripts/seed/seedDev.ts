/**
 * Provision/verify a test user in a DEV Supabase project so the frontend preview
 * can auto-sign-in without manual registration.
 *
 * SAFETY: run this ONLY against a dev/self-hosted Supabase — never production.
 * It creates its own service-role client from env (it does not import the app
 * config, so Gemini/Apify keys are not required).
 *
 * Required env (e.g. in backend/.env or the shell):
 *   SUPABASE_URL, SUPABASE_SECRET_KEY   — dev project + service-role key
 *   SEED_TEST_USER_EMAIL                — test user email (default test@dev.snagbite.local)
 *   SEED_TEST_USER_PASSWORD             — test user password (required)
 *
 * Usage:
 *   cd backend && SEED_TEST_USER_PASSWORD=... npm run seed:dev
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const TEST_USER_EMAIL = process.env.SEED_TEST_USER_EMAIL || 'test@dev.snagbite.local';
const TEST_USER_PASSWORD = process.env.SEED_TEST_USER_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY. Point them at your DEV project.');
  process.exit(1);
}
if (!TEST_USER_PASSWORD) {
  console.error('Missing SEED_TEST_USER_PASSWORD. Set a password for the seeded test user.');
  process.exit(1);
}

// Refuse to run against anything that looks like the production host, as a guard.
if (/\bprod\b|production/i.test(SUPABASE_URL)) {
  console.error(`Refusing to seed: SUPABASE_URL "${SUPABASE_URL}" looks like production.`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function getOrCreateTestUser(): Promise<string> {
  const { data: created, error } = await supabase.auth.admin.createUser({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
    email_confirm: true,
  });

  if (!error && created.user) {
    console.log(`Created test user ${TEST_USER_EMAIL}`);
    return created.user.id;
  }

  // Already exists → find its id via the admin list and update password/confirm email.
  console.log(`Test user ${TEST_USER_EMAIL} already exists, updating password…`);
  let page = 1;
  // Paginate defensively in case the dev project has many users.
  for (; page <= 20; page++) {
    const { data, error: listErr } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (listErr) throw new Error(`Failed to list users: ${listErr.message}`);
    const match = data.users.find(u => u.email?.toLowerCase() === TEST_USER_EMAIL.toLowerCase());
    if (match) {
      const { error: updateErr } = await supabase.auth.admin.updateUserById(match.id, {
        password: TEST_USER_PASSWORD,
        email_confirm: true,
      });
      if (updateErr) throw new Error(`Failed to update user password: ${updateErr.message}`);
      return match.id;
    }
    if (data.users.length < 200) break;
  }
  throw new Error(`Could not create or find test user ${TEST_USER_EMAIL} (createUser error: ${error?.message})`);
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

