import React, { useState, useEffect, useRef } from 'react';
import { Button, Drawer } from '@heroui/react';
import { Bug, Lightbulb, MessageSquare, ImagePlus, X } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { useFeedback } from '../hooks/useFeedback';
import { collectFeedbackContext, compressScreenshot } from '../utils/feedbackContext';
import { useAdOverlay } from '../context/OverlayStackContext';

interface FeedbackDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type FeedbackType = 'bug' | 'idea';

const MAX_SCREENSHOTS = 6;

export const FeedbackDrawer: React.FC<FeedbackDrawerProps> = ({ isOpen, onClose }) => {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const dialog = useDialog();
  const { submitFeedback } = useFeedback();

  useAdOverlay(isOpen);

  const [type, setType] = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset the form each time the drawer is opened.
  useEffect(() => {
    if (isOpen) {
      setType('bug');
      setMessage('');
      setScreenshots([]);
      setIsSaving(false);
      setError(null);
    }
  }, [isOpen]);

  const handlePickScreenshot = () => fileInputRef.current?.click();

  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    // Allow re-selecting the same file(s) later.
    e.target.value = '';
    if (files.length === 0) return;

    const remainingSlots = MAX_SCREENSHOTS - screenshots.length;
    if (remainingSlots <= 0) {
      setError(t('feedback.screenshotLimit') || `You can attach up to ${MAX_SCREENSHOTS} images.`);
      return;
    }

    try {
      const compressed = await Promise.all(
        files.slice(0, remainingSlots).map((file) => compressScreenshot(file)),
      );
      setScreenshots((prev) => [...prev, ...compressed]);
      setError(files.length > remainingSlots
        ? (t('feedback.screenshotLimit') || `You can attach up to ${MAX_SCREENSHOTS} images.`)
        : null);
    } catch (err) {
      console.error('Failed to process screenshot:', err);
      setError(t('feedback.screenshotError') || 'Could not process the screenshot.');
    }
  };

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!message.trim() || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const context = collectFeedbackContext(user, language);
      const result = await submitFeedback({
        type,
        message: message.trim(),
        context,
        screenshots: screenshots.length > 0 ? screenshots : undefined,
      });

      if (result.success) {
        // Close the drawer first so the success dialog (rendered above it) is
        // interactive — the drawer's focus trap would otherwise block it.
        onClose();
        await dialog.alert({
          title: t('feedback.successTitle') || 'Thank you!',
          message: t('feedback.success') || 'Thanks for your feedback!',
          status: 'success',
        });
      } else {
        setError(result.error || t('feedback.error') || 'Could not send feedback.');
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      setError(t('feedback.error') || 'Could not send feedback.');
    } finally {
      setIsSaving(false);
    }
  };

  const typeOptions: { value: FeedbackType; label: string; icon: React.ReactNode }[] = [
    { value: 'bug', label: t('feedback.typeBug') || 'Bug', icon: <Bug className="w-4 h-4" /> },
    { value: 'idea', label: t('feedback.typeIdea') || 'Idea', icon: <Lightbulb className="w-4 h-4" /> },
  ];

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Drawer>
        <Drawer.Backdrop isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} className="!z-[100]">
          <Drawer.Content placement="bottom" className="!z-[100]">
            <Drawer.Dialog className="relative !bg-white dark:!bg-gray-900 max-h-[85vh] flex flex-col pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))]">
              <Drawer.Handle />

              {/* Header */}
              <Drawer.Header className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border-none flex items-center justify-center">
                    <MessageSquare className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <Drawer.Heading className="text-base font-bold">
                    {t('feedback.title') || 'Report a bug / Feedback'}
                  </Drawer.Heading>
                </div>
              </Drawer.Header>

              {/* Body */}
              <Drawer.Body className="overflow-y-auto py-4 flex-1 flex flex-col gap-4">
                {/* Type toggle */}
                <div className="grid grid-cols-2 gap-2">
                  {typeOptions.map((opt) => {
                    const active = type === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setType(opt.value)}
                        className={`flex items-center justify-center gap-2 h-11 rounded-2xl border-none text-sm font-semibold transition-all active:scale-95 cursor-pointer ${
                          active
                            ? 'bg-emerald-600 text-white shadow-none'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {/* Message */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">
                    {t('feedback.messageLabel') || 'Your message'}
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    maxLength={4000}
                    placeholder={t('feedback.placeholder') || 'Describe the issue or your idea...'}
                    className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:outline-none resize-none shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                  />
                </div>

                {/* Screenshots */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">
                    {t('feedback.screenshotLabel') || 'Screenshots (optional)'}
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleScreenshotChange}
                    className="hidden"
                  />

                  {screenshots.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {screenshots.map((src, index) => (
                        <div key={index} className="relative aspect-square">
                          <img
                            src={src}
                            alt={`Screenshot ${index + 1}`}
                            className="w-full h-full object-cover rounded-2xl border-none shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                          />
                          <button
                            type="button"
                            onClick={() => removeScreenshot(index)}
                            aria-label={t('feedback.removeScreenshot') || 'Remove screenshot'}
                            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gray-900 dark:bg-gray-700 text-white flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer border-none"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {screenshots.length < MAX_SCREENSHOTS && (
                    <button
                      type="button"
                      onClick={handlePickScreenshot}
                      className="flex items-center justify-center gap-2 h-12 rounded-2xl border-none bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-[0.99] cursor-pointer"
                    >
                      <ImagePlus className="w-4 h-4" />
                      {screenshots.length === 0
                        ? (t('feedback.attachScreenshot') || 'Attach screenshots')
                        : (t('feedback.addMoreScreenshots') || 'Add more')}
                    </button>
                  )}
                </div>

                {/* Diagnostic note */}
                <p className="text-[11px] text-gray-400 dark:text-gray-500 px-1 leading-relaxed">
                  {t('feedback.diagnosticNote') ||
                    'Basic device info and recent app logs are attached to help us debug.'}
                </p>

                {error && (
                  <p className="text-sm text-rose-600 dark:text-rose-400 px-1">{error}</p>
                )}
              </Drawer.Body>

              {/* Footer */}
              <Drawer.Footer className="pt-3 flex gap-2">
                <Button
                  onPress={onClose}
                  className="flex-1 text-sm h-11 border-none bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-semibold active:scale-95 transition-all"
                >
                  {t('feedback.cancel') || t('dialog.cancelDefault') || 'Cancel'}
                </Button>
                <Button
                  onPress={handleSubmit}
                  isDisabled={isSaving || !message.trim()}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm h-11 font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-none active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSaving
                    ? (t('feedback.submitting') || 'Sending...')
                    : (t('feedback.submit') || 'Submit')}
                </Button>
              </Drawer.Footer>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
};
