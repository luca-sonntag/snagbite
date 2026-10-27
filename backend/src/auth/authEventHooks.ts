import { count } from 'drizzle-orm';
import { emitAlert, type SignupMethod } from '../alerts/index.js';
import { db } from '../db/drizzle.js';
import { user as userTable } from '../db/schema/auth.js';

/** The parts of Better-Auth's endpoint context we read (null for server-side calls). */
interface HookEndpointContext {
  path?: string;
  params?: Record<string, string | undefined>;
}

/** Maps the Better-Auth endpoint that created the user to a signup method. */
export function resolveSignupMethod(ctx: HookEndpointContext | null): SignupMethod {
  const path = ctx?.path ?? '';
  if (path === '/sign-up/email') return 'email';
  if (path === '/one-tap/callback') return 'google-one-tap';
  if (path.startsWith('/callback')) return ctx?.params?.id === 'google' ? 'google' : 'oauth';
  return 'unknown';
}

async function countUsers(): Promise<number | null> {
  try {
    const [row] = await db.select({ value: count() }).from(userTable);
    return row?.value ?? null;
  } catch (error: unknown) {
    console.warn('[alerts] user count failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Better-Auth `databaseHooks.user.create.after`. Runs detached so the extra
 * count query never delays the signup response.
 */
export async function onUserCreated(
  user: { email?: string | null },
  ctx: HookEndpointContext | null,
): Promise<void> {
  const method = resolveSignupMethod(ctx);
  void countUsers().then((userNumber) =>
    emitAlert({
      type: 'user.signed_up',
      payload: { userNumber, method, email: user.email ?? null },
    }),
  );
}
