import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { supabase } from '../supabase';
import { apiUrl } from '../api';

const REVENUECAT_ANDROID_API_KEY = import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY as string | undefined;

let isRCInitialized = false;
/** Promise-based lock to prevent concurrent configure() calls (race condition). */
let initPromise: Promise<void> | null = null;
/** Interval handle for the 60s polling refresh. */
let pollInterval: ReturnType<typeof setInterval> | null = null;
/** Whether the App-resume listener has been registered. */
let resumeListenerRegistered = false;

export async function initBilling(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (isRCInitialized) return;

  // If another caller is already initializing, wait for it instead of racing
  if (initPromise) {
    await initPromise;
    return;
  }

  if (!REVENUECAT_ANDROID_API_KEY) {
    console.warn('RevenueCat API Key is missing. Billing will not work.');
    return;
  }

  initPromise = (async () => {
    try {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      await Purchases.configure({
        apiKey: REVENUECAT_ANDROID_API_KEY,
        appUserID: userId,
      });
      isRCInitialized = true;
      console.log('[RevenueCat] Configured successfully for user:', userId);

      // Register App-resume listener to refresh on foreground
      registerResumeListener();

      // Start 60-second polling to catch entitlement expiry
      startPolling();

      // Register a listener that fires whenever the subscription status changes
      // (expiry, renewal, refund, cross-device restore, etc.)
      try {
        await Purchases.addCustomerInfoUpdateListener(async (info) => {
          console.log('[RevenueCat] CustomerInfo updated (listener):', JSON.stringify(info, null, 2));
          const isPremium = info.entitlements.active['premium'] !== undefined;
          await syncBillingStatus(isPremium);
        });
        console.log('[RevenueCat] CustomerInfoUpdateListener registered.');
      } catch (listenerErr) {
        console.warn('[RevenueCat] Failed to register CustomerInfoUpdateListener:', listenerErr);
      }

      // Initial status sync on app launch to verify actual entitlements
      try {
        const { customerInfo } = await Purchases.getCustomerInfo();
        console.log('[RevenueCat] Initial customerInfo:', JSON.stringify(customerInfo, null, 2));
        const isPremium = customerInfo.entitlements.active['premium'] !== undefined;
        await syncBillingStatus(isPremium);
      } catch (syncErr) {
        console.warn('[RevenueCat] Initial billing status sync failed:', syncErr);
      }
    } catch (err) {
      console.error('[RevenueCat] Failed to configure:', err);
      throw err; // propagate so waiters know it failed
    } finally {
      initPromise = null; // release lock regardless of outcome
    }
  })();

  await initPromise;
}

/**
 * Poll RevenueCat every 60 seconds to catch entitlement expiry.
 * The CustomerInfoUpdateListener only fires on server-side events
 * (refund, renewal, cancellation) — not on pure time-based expiry.
 */
function startPolling(): void {
  if (pollInterval) return; // already running
  console.log('[RevenueCat] Starting 60s entitlement poll...');
  pollInterval = setInterval(async () => {
    if (!isRCInitialized) return;
    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      const isPremium = customerInfo.entitlements.active['premium'] !== undefined;
      // Only log & sync if there's a change (avoid noise)
      await syncBillingStatus(isPremium);
    } catch (err) {
      // Silently ignore — will retry next interval
    }
  }, 60_000);
}

export function stopPolling(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    console.log('[RevenueCat] Polling stopped.');
  }
}

/**
 * Refresh customerInfo from RevenueCat and sync with backend.
 * Called on App-resume.
 */
async function refreshCustomerInfo(): Promise<void> {
  if (!isRCInitialized) return;
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    console.log('[RevenueCat] Refreshed customerInfo (resume):', JSON.stringify(customerInfo, null, 2));
    const isPremium = customerInfo.entitlements.active['premium'] !== undefined;
    await syncBillingStatus(isPremium);
  } catch (err) {
    console.warn('[RevenueCat] Resume refresh failed:', err);
  }
}

/**
 * Register the App-resume listener once. When the user returns to the app,
 * we refresh customerInfo to catch any entitlement changes that happened
 * while the app was backgrounded.
 */
function registerResumeListener(): void {
  if (resumeListenerRegistered) return;
  resumeListenerRegistered = true;

  App.addListener('resume', () => {
    console.log('[RevenueCat] App resumed — refreshing customerInfo...');
    refreshCustomerInfo();
  });
}

async function syncBillingStatus(isPremium: boolean): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const response = await fetch(apiUrl('/api/billing/sync'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ tier: isPremium ? 'premium' : 'free' }),
    });

    if (response.ok) {
      // Refresh local session to obtain the updated JWT containing the app_metadata.tier
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.warn('Failed to refresh local Supabase session:', error.message);
      } else {
        console.log('[RevenueCat] Billing status synced successfully with backend. Tier:', isPremium ? 'premium' : 'free');
      }
    } else {
      console.error('[RevenueCat] Failed to sync billing status with backend:', await response.text());
    }
  } catch (err) {
    console.error('[RevenueCat] Error syncing billing status:', err);
  }
}

export async function getSubscriptionOfferings(): Promise<any[]> {
  // Browser / dev mock — RevenueCat only runs on native
  if (!Capacitor.isNativePlatform()) {
    return [
      { identifier: '$rc_monthly', packageType: 'MONTHLY', product: { identifier: 'snagbite_premium_monthly', priceString: '2,99 €', price: 2.99, introPrice: null } },
      { identifier: '$rc_annual',  packageType: 'ANNUAL',  product: { identifier: 'snagbite_premium_annual',  priceString: '17,99 €', price: 17.99, pricePerMonthString: '1,50 €', introPrice: { price: 0, periodNumberOfUnits: 3 } } },
    ];
  }

  // Ensure initialized
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  await initBilling(user.id);

  if (!isRCInitialized) return [];

  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages || [];
  } catch (err) {
    console.error('[RevenueCat] Failed to get offerings:', err);
    return [];
  }
}

export async function buyPremium(packageId?: string): Promise<boolean> {
  // Get current user to ensure we are logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be logged in to purchase Premium.');
  }

  await initBilling(user.id);

  if (!isRCInitialized) {
    throw new Error('Billing service is not initialized (missing API key).');
  }

  try {
    // Get offerings
    const offerings = await Purchases.getOfferings();
    if (!offerings.current || offerings.current.availablePackages.length === 0) {
      throw new Error('No active products or subscription packages found.');
    }

    // Find the requested package or fall back to the first available package
    let packageToBuy = offerings.current.availablePackages[0];
    if (packageId) {
      const found = offerings.current.availablePackages.find(p => p.identifier === packageId);
      if (found) {
        packageToBuy = found;
      } else {
        console.warn(`[RevenueCat] Requested package '${packageId}' not found. Falling back to default package.`);
      }
    }

    console.log('[RevenueCat] Starting purchase for package:', packageToBuy.identifier, 'product:', packageToBuy.product?.identifier);

    const { customerInfo } = await Purchases.purchasePackage({
      aPackage: packageToBuy,
    });

    console.log('[RevenueCat] Purchase completed. Full customerInfo:', JSON.stringify(customerInfo, null, 2));
    console.log('[RevenueCat] Active entitlements:', JSON.stringify(customerInfo.entitlements.active));

    // Check if the user has active entitlements.
    let isPremium = customerInfo.entitlements.active['premium'] !== undefined;

    // If entitlement not immediately active, try a restore/refresh (important for test purchases)
    if (!isPremium) {
      console.log('[RevenueCat] Premium entitlement not immediately active. Trying restorePurchases...');
      try {
        const { customerInfo: restoredInfo } = await Purchases.restorePurchases();
        console.log('[RevenueCat] Restored customerInfo:', JSON.stringify(restoredInfo, null, 2));
        isPremium = restoredInfo.entitlements.active['premium'] !== undefined;
      } catch (restoreErr) {
        console.warn('[RevenueCat] restorePurchases failed:', restoreErr);
      }
    }

    // If still not active, try one more getCustomerInfo refresh
    if (!isPremium) {
      console.log('[RevenueCat] Still not active after restore. Trying getCustomerInfo refresh...');
      try {
        const { customerInfo: refreshedInfo } = await Purchases.getCustomerInfo();
        console.log('[RevenueCat] Refreshed customerInfo:', JSON.stringify(refreshedInfo, null, 2));
        isPremium = refreshedInfo.entitlements.active['premium'] !== undefined;
      } catch (refreshErr) {
        console.warn('[RevenueCat] getCustomerInfo refresh failed:', refreshErr);
      }
    }

    if (isPremium) {
      console.log('[RevenueCat] Premium entitlement confirmed. Syncing with backend...');
      await syncBillingStatus(true);
      return true;
    }

    await syncBillingStatus(false);
    const activeEntitlements = Object.keys(customerInfo.entitlements.active);
    const activeList = activeEntitlements.length > 0 ? activeEntitlements.join(', ') : 'none';
    throw new Error(`Purchase was successful, but the 'premium' entitlement is not active (Active: [${activeList}]). Please verify that you have configured an entitlement with ID 'premium' in the RevenueCat dashboard and linked it to this product.`);
  } catch (err: any) {
    // If the user cancelled, return false silently
    if (err.userCancelled) {
      console.log('[RevenueCat] User cancelled the purchase.');
      return false;
    }
    console.error('[RevenueCat] Purchase error:', err);
    throw new Error(err.message || 'Purchase failed.');
  }
}

