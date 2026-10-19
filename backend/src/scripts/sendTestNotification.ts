import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';
import { sendToToken, type FcmMessage } from '../push/fcm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '..', '..');

const isProd = process.argv.includes('--prod');
const envFile = isProd ? '.env.production' : '.env.development';
const envPath = path.resolve(backendDir, envFile);
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
}
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(backendDir, '.env'), override: true });
}

const connectionString =
  process.env.DATABASE_URL?.includes('.railway.internal') && process.env.DATABASE_PUBLIC_URL
    ? process.env.DATABASE_PUBLIC_URL
    : process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL or DATABASE_PUBLIC_URL is not set.');
  process.exit(1);
}

const targetEmail = process.argv.find((a) => a.startsWith('--email='))?.split('=')[1] || 'snagbite.app@gmail.com';
const typeArg = process.argv.find((a) => a.startsWith('--type='))?.split('=')[1] || 'all';

async function main() {
  console.log(`\n🔍 Checking user & push tokens in [${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}] DB...`);
  console.log(`   Target Email: ${targetEmail}`);

  const pool = new pg.Pool({ connectionString });
  try {
    const userRes = await pool.query<{ id: string; name: string; email: string }>(
      `SELECT id, name, email FROM "user" WHERE LOWER(email) = LOWER($1)`,
      [targetEmail]
    );

    if (userRes.rows.length === 0) {
      console.log(`❌ No user found with email "${targetEmail}" in this database.`);
      return;
    }

    const targetUser = userRes.rows[0];
    console.log(`✅ Found user: ${targetUser.name || 'Unnamed'} (ID: ${targetUser.id})`);

    const tokenRes = await pool.query<{ token: string; disabled: boolean; platform: string; last_seen_at: Date }>(
      `SELECT token, disabled, platform, last_seen_at FROM push_tokens WHERE user_id = $1`,
      [targetUser.id]
    );

    console.log(`   Total tokens registered: ${tokenRes.rows.length}`);
    const activeTokens = tokenRes.rows.filter((t) => !t.disabled);
    console.log(`   Active tokens: ${activeTokens.length}`);

    if (activeTokens.length === 0) {
      console.log(`⚠️ User has no active push tokens.`);
      if (tokenRes.rows.length > 0) {
        console.log(`   (Found ${tokenRes.rows.length} disabled tokens. The user may have logged out or disabled notifications).`);
      } else {
        console.log(`   (Make sure the app is opened on the device and push notifications are permitted).`);
      }
      return;
    }

    for (const t of activeTokens) {
      console.log(`   📱 Device Token (${t.platform}, last seen: ${t.last_seen_at}): ${t.token.slice(0, 25)}...`);
    }

    const testMessages: { name: string; msg: FcmMessage }[] = [
      {
        name: 'Friend Request',
        msg: {
          title: '👋 Neue Freundschaftsanfrage',
          body: 'Alex möchte mit dir auf Snagbite befreundet sein.',
          data: { type: 'friend_request', route: 'progress', section: 'friends' },
        },
      },
      {
        name: 'Recipe Shared',
        msg: {
          title: '🍽️ Alex hat ein Rezept mit dir geteilt',
          body: '„Cremige Pasta mit getrockneten Tomaten“ – Das müssen wir unbedingt kochen!',
          data: { type: 'recipe_shared', route: 'progress', section: 'friends' },
        },
      },
      {
        name: 'Friend Cooked Dish',
        msg: {
          title: '👨‍🍳 Alex hat gerade gekocht!',
          body: 'Alex hat „Knusprige Smash Burger“ gekocht. Schau dir das Foto im Feed an!',
          data: { type: 'friend_cooked', route: 'progress', section: 'feed' },
        },
      },
    ];

    const messagesToSend = typeArg === 'all'
      ? testMessages
      : testMessages.filter((m) => m.name.toLowerCase().includes(typeArg.toLowerCase()));

    console.log(`\n🚀 Sending ${messagesToSend.length} test notification(s) via FCM...`);

    for (const t of activeTokens) {
      for (const { name, msg } of messagesToSend) {
        console.log(`   Sending "${name}"...`);
        const result = await sendToToken(t.token, msg);
        if (result.ok) {
          console.log(`   ✅ "${name}" successfully delivered to ${t.token.slice(0, 15)}...!`);
        } else {
          console.log(`   ❌ Failed to deliver "${name}":`, result.error);
          if (result.unregistered) {
            console.log(`   ⚠️ Token is marked unregistered by FCM.`);
          }
        }
      }
    }

    console.log(`\n🎉 Test notifications run complete.\n`);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
