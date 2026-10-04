import { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth/betterAuth.js';
import { config } from './config.js';

// Extend Express Request to carry authenticated user details
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      userTier?: string;
    }
  }
}

/**
 * Middleware that verifies the Better-Auth session (Bearer token or cookie).
 * Attaches `req.userId`, `req.userEmail`, and `req.userTier` on success.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.header('Authorization');
  const hasCookie = Boolean(req.headers.cookie);

  if (!header?.startsWith('Bearer ') && !hasCookie) {
    res.status(401).json({ success: false, error: 'Unauthorized: Missing or malformed Authorization header.' });
    return;
  }

  try {
    const sessionData = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!sessionData?.session?.userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired session.' });
      return;
    }

    req.userId = sessionData.session.userId;
    req.userEmail = sessionData.user.email;
    req.userTier = (sessionData.user as { tier?: string }).tier ?? 'free';
    next();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[requireAuth] session validation error:', msg);
    res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired session.' });
  }
}

/**
 * Middleware that verifies if the authenticated user is a configured admin.
 * Assumes requireAuth has already executed and populated req.userId and req.userEmail.
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.userId) {
    res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
    return;
  }

  const email = req.userEmail;
  if (!email) {
    res.status(403).json({ success: false, error: 'Forbidden: Missing email claim in authentication token.' });
    return;
  }

  const adminEmails = config.ADMIN_EMAILS.split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!adminEmails.includes(email.toLowerCase())) {
    res.status(403).json({ success: false, error: 'Forbidden: User is not configured as an admin.' });
    return;
  }

  next();
}
