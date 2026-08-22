import { Router, Request, Response } from 'express';
import { config } from './config.js';
import { getActiveAppBundle } from './db.js';

/**
 * Public router for OTA (over-the-air) web-bundle update checks, used by the
 * Capacitor app's @capgo/capacitor-updater integration (frontend
 * src/utils/otaUpdater.ts). Mounted BEFORE the auth-gated apiRouter in
 * index.ts because the app checks for updates before a session may exist.
 * Bundles themselves are served from the public Supabase `app-bundles` bucket.
 */
export const appUpdatesRouter = Router();

const OTA_CHANNELS = ['production', 'alpha', 'internal'] as const;
type OtaChannel = (typeof OTA_CHANNELS)[number];

/**
 * Endpoint to check whether a newer web bundle is available for a device.
 * POST /api/app-updates/check
 * Body: { channel, versionCode, currentBundleVersion, appVersion?, deviceId? }
 */
appUpdatesRouter.post('/check', async (req: Request, res: Response): Promise<void> => {
  try {
    const { channel, versionCode, currentBundleVersion } = req.body ?? {};

    // Strict channel equality — alpha bundles must never leak to production.
    if (typeof channel !== 'string' || !OTA_CHANNELS.includes(channel as OtaChannel)) {
      res.status(400).json({
        success: false,
        error: `Missing or invalid field: "channel" must be one of ${OTA_CHANNELS.join(', ')}.`,
      });
      return;
    }

    if (typeof versionCode !== 'number' || !Number.isInteger(versionCode) || versionCode <= 0) {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid field: "versionCode" must be a positive integer.',
      });
      return;
    }

    // 'builtin' on stock installs, otherwise the active OTA bundle version.
    if (typeof currentBundleVersion !== 'string' || currentBundleVersion.length === 0 || currentBundleVersion.length > 100) {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid field: "currentBundleVersion" must be a non-empty string.',
      });
      return;
    }

    const bundle = await getActiveAppBundle(channel, versionCode);

    if (!bundle || bundle.version === currentBundleVersion) {
      res.status(200).json({ success: true, update: false });
      return;
    }

    res.status(200).json({
      success: true,
      update: true,
      version: bundle.version,
      url: `${config.SUPABASE_URL}/storage/v1/object/public/app-bundles/${bundle.storage_path}`,
      checksum: bundle.checksum,
      minVersionCode: bundle.min_version_code,
    });
  } catch (error: any) {
    console.error('Error checking for app updates:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while checking for app updates.',
    });
  }
});
