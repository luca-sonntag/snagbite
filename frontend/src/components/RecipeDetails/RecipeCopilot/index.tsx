import React, { useEffect } from 'react';
import { Button } from '@heroui/react';
import { Trash2 } from 'lucide-react';
import { useI18n } from '../../../context/I18nContext';
import { useRecipeCopilot } from './useRecipeCopilot';
import CopilotHeader from './CopilotHeader';
import CopilotChatList from './CopilotChatList';
import CopilotTransactionCard from './CopilotTransactionCard';
import CopilotInputBar from './CopilotInputBar';
import type { RecipeCopilotProps } from './types';

export const RecipeCopilot: React.FC<RecipeCopilotProps> = ({
  isOpen,
  onClose,
  recipe,
  onRemixSuccess,
  onReplaceCurrent,
}) => {
  const { t } = useI18n();

  const {
    message,
    setMessage,
    history,
    isPending,
    pendingAction,
    error,
    chips,
    chipsLoading,
    confirmingClear,
    setConfirmingClear,
    pendingChanges,
    choosingApply,
    setChoosingApply,
    messagesEndRef,
    textareaRef,
    handleSend,
    handleLoadNewRecipe,
    removeChange,
    discardAllChanges,
    handleApplyChanges,
    performClearSession,
  } = useRecipeCopilot({
    isOpen,
    recipe,
    onClose,
    onRemixSuccess,
    onReplaceCurrent,
  });

  // Lock body scroll & listen to Escape key when open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmingClear) {
          setConfirmingClear(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, confirmingClear, onClose, setConfirmingClear]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('copilot.title')}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex flex-col justify-between overflow-hidden backdrop-blur-md bg-black/10 dark:bg-black/35 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl mx-auto h-[100dvh] flex flex-col justify-between relative"
      >
        {/* Top Header: Floating Buttons without middle title */}
        <CopilotHeader
          historyLength={history.length}
          isPending={isPending}
          onClear={() => setConfirmingClear(true)}
          onClose={onClose}
        />

        {/* Chat message list */}
        <CopilotChatList
          history={history}
          isPending={isPending}
          pendingAction={pendingAction}
          error={error}
          messagesEndRef={messagesEndRef}
          onLoadNewRecipe={handleLoadNewRecipe}
          onSend={handleSend}
          recipeId={recipe.id}
          initialChips={chips}
          chipsLoading={chipsLoading}
        />

        {/* Footer: Transaction Card, Quick Chips & Message Input */}
        <footer className="pt-2 pb-[calc(1rem_+_var(--safe-area-inset-bottom))] px-4 sm:px-6 flex flex-col gap-2.5 flex-shrink-0 z-10">
          <CopilotTransactionCard
            pendingChanges={pendingChanges}
            choosingApply={choosingApply}
            setChoosingApply={setChoosingApply}
            isPending={isPending}
            onRemoveChange={removeChange}
            onDiscardAll={discardAllChanges}
            onApplyChanges={handleApplyChanges}
          />

          <CopilotInputBar
            message={message}
            setMessage={setMessage}
            isPending={isPending}
            textareaRef={textareaRef}
            onSend={handleSend}
          />
        </footer>

        {/* Clear/Reset confirmation dialog */}
        {confirmingClear && (
          <div
            onClick={() => setConfirmingClear(false)}
            className="fixed inset-0 z-[110] flex items-center justify-center p-5 bg-black/30 backdrop-blur-sm animate-in fade-in duration-150"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs rounded-3xl border border-white/40 dark:border-white/10 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.2)] bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl flex flex-col gap-4 animate-in zoom-in-95 duration-200"
            >
              <div className="flex gap-3 items-start">
                <div className="p-2.5 rounded-2xl border-none flex-shrink-0 flex items-center justify-center bg-amber-500/15 text-amber-500">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-1.5 min-w-0">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                    {t('copilot.clearConfirmTitle')}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                    {t('copilot.clearConfirmBody')}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2.5">
                <Button
                  variant="tertiary"
                  onPress={() => setConfirmingClear(false)}
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white font-semibold rounded-2xl border-none"
                >
                  {t('dialog.cancelDefault')}
                </Button>
                <Button
                  onPress={performClearSession}
                  className="bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-2xl shadow-md transition-all border-none"
                >
                  {t('copilot.clearConfirmBtn')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipeCopilot;
