import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Clipboard as CapClipboard } from '@capacitor/clipboard';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useI18n } from '../../context/I18nContext';
import { MAX_IMPORT_PHOTOS } from '../../hooks/useRecipeExtraction';
import { isTrialBannerDismissed, TRIAL_BANNER_DISMISS_EVENT } from '../TrialBanner';
import type { UseExtractFormProps } from './types';

export function useExtractForm({
  url,
  setUrl,
  setUrlError,
  validateUrl,
  isPending,
  photos,
  setPhotos,
  blockedByLimit,
  atConcurrencyLimit,
  setIsPremiumModalOpen,
}: UseExtractFormProps) {
  const { t } = useI18n();
  const [canPaste, setCanPaste] = useState(false);
  const [trialDismissed, setTrialDismissed] = useState(isTrialBannerDismissed);
  const [detectedClipboardUrl, setDetectedClipboardUrl] = useState<string | null>(null);
  const [dismissedUrl, setDismissedUrl] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onDismiss = () => setTrialDismissed(true);
    window.addEventListener(TRIAL_BANNER_DISMISS_EVENT, onDismiss);
    return () => window.removeEventListener(TRIAL_BANNER_DISMISS_EVENT, onDismiss);
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setCanPaste(true);
    } else if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.readText === 'function'
    ) {
      setCanPaste(true);
    }
  }, []);

  const checkClipboardForUrl = useCallback(async () => {
    if (isPending) return;
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await CapClipboard.read();
        const text = result.value?.trim() ?? '';
        if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
          if (text !== url && text !== dismissedUrl) {
            setDetectedClipboardUrl(text);
          }
        }
      }
    } catch {
      // Silently ignore clipboard errors during background checks
    }
  }, [isPending, url, dismissedUrl]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    checkClipboardForUrl();

    let listenerHandle: { remove: () => Promise<void> } | null = null;
    App.addListener('appStateChange', (state) => {
      if (state.isActive) {
        checkClipboardForUrl();
      }
    }).then((handle) => {
      listenerHandle = handle;
    }).catch(() => {});

    return () => {
      listenerHandle?.remove().catch(() => {});
    };
  }, [checkClipboardForUrl]);

  const applyClipboardUrl = useCallback((targetUrl?: string) => {
    const toApply = targetUrl ?? detectedClipboardUrl;
    if (!toApply) return;
    setUrl(toApply);
    validateUrl(toApply);
    setDetectedClipboardUrl(null);
  }, [detectedClipboardUrl, setUrl, validateUrl]);

  const dismissClipboardBanner = useCallback(() => {
    if (detectedClipboardUrl) {
      setDismissedUrl(detectedClipboardUrl);
    }
    setDetectedClipboardUrl(null);
  }, [detectedClipboardUrl]);

  const handlePaste = async () => {
    try {
      let text = '';
      if (Capacitor.isNativePlatform()) {
        const result = await CapClipboard.read();
        text = result.value;
      } else {
        text = await navigator.clipboard.readText();
      }
      if (text) {
        setUrl(text);
        validateUrl(text);
        setDetectedClipboardUrl(null);
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
      setUrlError?.(t('form.pasteFailed'));
    }
  };

  const handleDemoClick = (demoUrl: string) => {
    if (isPending || atConcurrencyLimit) return;
    if (blockedByLimit) {
      setIsPremiumModalOpen(true);
      return;
    }
    setUrl(demoUrl);
    validateUrl(demoUrl);

    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        form.requestSubmit();
      }
    }, 50);
  };

  const photoPreviews = useMemo(() => photos.map((photo) => URL.createObjectURL(photo)), [photos]);
  useEffect(() => () => photoPreviews.forEach(URL.revokeObjectURL), [photoPreviews]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (picked.length === 0) return;
    setPhotos([...photos, ...picked].slice(0, MAX_IMPORT_PHOTOS));
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const openPicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (blockedByLimit) {
      setIsPremiumModalOpen(true);
      return;
    }
    ref.current?.click();
  };

  return {
    canPaste,
    trialDismissed,
    cameraInputRef,
    galleryInputRef,
    photoPreviews,
    handlePaste,
    handleDemoClick,
    handlePhotoChange,
    removePhoto,
    openPicker,
    detectedClipboardUrl,
    applyClipboardUrl,
    dismissClipboardBanner,
  };
}
