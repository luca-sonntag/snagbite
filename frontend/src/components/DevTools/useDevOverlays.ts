import { useState, useEffect, useCallback } from 'react';
import type {
  ActiveDevOverlay,
  DevAlertOptions,
  DevConfirmOptions,
  DevToastOptions,
  DevOtaOptions,
} from './types';
import { subscribeDevOverlay, emitDevOverlay } from './devController';
import { useDialog } from '../../context/DialogContext';
import { useToast } from '../../context/ToastContext';
import { triggerPreAdNotice } from '../../utils/ads';
import { OTA_READY_EVENT } from '../../utils/otaUpdater';

export function useDevOverlays() {
  const [activeOverlay, setActiveOverlay] = useState<ActiveDevOverlay | null>(null);
  const dialog = useDialog();
  const toast = useToast();

  const closeDevOverlay = useCallback(() => {
    setActiveOverlay(null);
    emitDevOverlay(null);
  }, []);

  useEffect(() => {
    return subscribeDevOverlay((nextOverlay) => {
      if (!nextOverlay) {
        setActiveOverlay(null);
        return;
      }

      // Handle standalone context-based or event-based overlays directly
      if (nextOverlay.name === 'alert') {
        const opts = (nextOverlay.options as DevAlertOptions) ?? {};
        void dialog.alert({
          title: opts.title ?? 'Dev Alert',
          message: opts.message ?? 'Dies ist ein DevTools-Testdialog.',
          status: opts.status ?? 'info',
          confirmLabel: opts.confirmLabel,
        });
        setActiveOverlay(null);
        return;
      }

      if (nextOverlay.name === 'confirm') {
        const opts = (nextOverlay.options as DevConfirmOptions) ?? {};
        void dialog.confirm({
          title: opts.title ?? 'Dev Bestätigung',
          message: opts.message ?? 'Möchtest du diese Test-Aktion ausführen?',
          status: opts.status ?? 'warning',
          confirmLabel: opts.confirmLabel,
          cancelLabel: opts.cancelLabel,
        }).then((res) => {
          console.log('[DevTools] Confirm result:', res);
        });
        setActiveOverlay(null);
        return;
      }

      if (nextOverlay.name === 'toast') {
        const opts = (nextOverlay.options as DevToastOptions) ?? {};
        const type = opts.type ?? 'info';
        const msg = opts.message ?? 'DevTools Test Toast';
        if (type === 'danger' || type === 'error') {
          toast.danger(msg);
        } else if (type === 'warning') {
          toast.warning(msg);
        } else if (type === 'success') {
          toast.success(msg);
        } else {
          toast.info(msg);
        }
        setActiveOverlay(null);
        return;
      }

      if (nextOverlay.name === 'adNotice') {
        triggerPreAdNotice(() => {
          console.log('[DevTools] Pre-ad transparency notice confirmed');
        });
        setActiveOverlay(null);
        return;
      }

      if (nextOverlay.name === 'ota') {
        const opts = (nextOverlay.options as DevOtaOptions) ?? {};
        const version = opts.version ?? '2.5.0-dev';
        const bundleId = opts.bundleId ?? `dev-bundle-${Date.now()}`;
        window.dispatchEvent(
          new CustomEvent(OTA_READY_EVENT, {
            detail: { bundleId, version },
          })
        );
        setActiveOverlay(null);
        return;
      }

      // Renderable component overlays
      setActiveOverlay(nextOverlay);
    });
  }, [dialog, toast]);

  return { activeOverlay, closeDevOverlay };
}
