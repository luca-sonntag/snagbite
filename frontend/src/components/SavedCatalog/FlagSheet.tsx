import React, { useState, useEffect, useRef } from 'react';
import { Button, Drawer } from '@heroui/react';
import { Tag, X } from 'lucide-react';
import type { SavedRecipe } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { useAdOverlay } from '../../context/OverlayStackContext';

interface FlagSheetProps {
  isOpen: boolean;
  onClose: () => void;
  job: SavedRecipe | null;
  allExistingFlags: string[];
  onSave: (job: SavedRecipe, flags: string[]) => Promise<void>;
}

export const FlagSheet: React.FC<FlagSheetProps> = ({
  isOpen,
  onClose,
  job,
  allExistingFlags,
  onSave
}) => {
  const { t, language } = useI18n();
  useAdOverlay(isOpen);
  const [tags, setTags] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  // Sync state with job flags when opened
  useEffect(() => {
    if (isOpen && job) {
      setTags(job.flags || []);
      setInputValue('');
    }
  }, [isOpen, job]);

  if (!job) return null;

  const handleAddTag = (tagToAdd: string) => {
    const cleaned = tagToAdd.trim();
    if (!cleaned) return;
    if (!tags.includes(cleaned)) {
      setTags(prev => [...prev, cleaned]);
    }
    setInputValue('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Add any remaining text in input
      let finalTags = [...tags];
      const remaining = inputValue.trim();
      if (remaining && !finalTags.includes(remaining)) {
        finalTags.push(remaining);
      }
      await onSave(job, finalTags);
      onClose();
    } catch (err) {
      console.error('Failed to save flags:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Suggest tags that are not already added
  const suggestions = allExistingFlags.filter(
    flag => !tags.includes(flag)
  );

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Drawer>
        <Drawer.Backdrop isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} className="!z-[100]">
          <Drawer.Content placement="bottom" className="!z-[100]">
            <Drawer.Dialog className="relative !bg-white dark:!bg-gray-900 max-h-[85vh] flex flex-col p-5 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] rounded-t-3xl border-none shadow-[0_-4px_30px_rgba(0,0,0,0.12)]">
              <Drawer.Handle />

              {/* Header */}
              <Drawer.Header className="pb-3 mb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-amber-500/10 dark:bg-amber-500/20 border-none flex items-center justify-center">
                    <Tag className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <Drawer.Heading className="text-base font-bold text-gray-900 dark:text-white">
                    {t('catalog.flagsTitle') || 'Labels / Tags'}
                  </Drawer.Heading>
                </div>
              </Drawer.Header>

              {/* Body */}
              <Drawer.Body className="overflow-y-auto py-2 flex-1 flex flex-col gap-4">
                {/* Unified Tag Input Box */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">
                    {t('catalog.flagsTitle') || 'Labels / Tags'}
                  </label>
                  
                  <div
                    onClick={handleContainerClick}
                    className="flex flex-wrap items-center gap-1.5 p-3 bg-gray-100 dark:bg-gray-800 border-none rounded-2xl focus-within:ring-2 focus-within:ring-emerald-500/30 transition-all cursor-text min-h-[56px]"
                  >
                    {/* Render active tags */}
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold px-2.5 py-1 rounded-xl border-none select-none whitespace-nowrap"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTag(tag);
                          }}
                          className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors p-0.5 rounded-full hover:bg-black/5 cursor-pointer outline-none border-none"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}

                    {/* Inline Input field */}
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          handleAddTag(inputValue);
                        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
                          handleRemoveTag(tags[tags.length - 1]);
                        }
                      }}
                      placeholder={tags.length === 0 ? (t('catalog.flagPlaceholder') || 'z.B. Ausprobieren') : ''}
                      className="flex-1 min-w-[80px] bg-transparent border-0 p-0 text-base text-gray-900 dark:text-white focus:outline-none focus:ring-0 leading-none h-6"
                    />
                  </div>
                </div>

                {/* Suggestions List */}
                {suggestions.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-2">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">
                      {language === 'de' ? 'Häufige Labels' : 'Suggested Labels'}
                    </label>
                    <div className="flex flex-wrap gap-1.5 py-1">
                      {suggestions.slice(0, 12).map(flag => (
                        <button
                          key={flag}
                          type="button"
                          onClick={() => handleAddTag(flag)}
                          className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold px-3 py-1.5 rounded-xl border-none transition-all active:scale-95 cursor-pointer"
                        >
                          + {flag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Drawer.Body>

              {/* Footer */}
              <Drawer.Footer className="pt-3 flex gap-2">
                <Button
                  onPress={onClose}
                  className="flex-1 text-sm h-12 border-none bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-2xl font-bold active:scale-95 transition-all cursor-pointer"
                >
                  {t('dialog.cancelDefault') || 'Abbrechen'}
                </Button>
                <Button
                  onPress={handleSave}
                  isDisabled={isSaving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm h-12 font-bold rounded-2xl flex items-center justify-center gap-1.5 shadow-none border-none active:scale-95 transition-all cursor-pointer"
                >
                  {isSaving ? (language === 'de' ? 'Speichern...' : 'Saving...') : (t('recipe.save') || 'Speichern')}
                </Button>
              </Drawer.Footer>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
};
