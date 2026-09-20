import { isNative } from '../native';

/** Light impact — use for stepper buttons, toggles, small confirmations */
export async function hapticLight(): Promise<void> {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch { /* haptics unavailable */ }
}

/** Medium impact — use for confirmations, successful actions */
export async function hapticMedium(): Promise<void> {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch { /* haptics unavailable */ }
}

/** Heavy impact — use for destructive actions, major state changes */
export async function hapticHeavy(): Promise<void> {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch { /* haptics unavailable */ }
}

/** Selection tick — use for picker scrolling, segment changes */
export async function hapticSelection(): Promise<void> {
  if (!isNative()) return;
  try {
    const { Haptics } = await import('@capacitor/haptics');
    await Haptics.selectionStart();
    await Haptics.selectionChanged();
    await Haptics.selectionEnd();
  } catch { /* haptics unavailable */ }
}

/** Notification-style feedback for success/warning/error */
export async function hapticNotification(type: 'success' | 'warning' | 'error'): Promise<void> {
  if (!isNative()) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    const map = { success: NotificationType.Success, warning: NotificationType.Warning, error: NotificationType.Error };
    await Haptics.notification({ type: map[type] });
  } catch { /* haptics unavailable */ }
}
