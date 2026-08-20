import React, { useState, useRef } from 'react';
import { Button, Drawer } from '@heroui/react';
import { Plus, X, Check } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { uiTranslations } from '../../i18n';
import { useAdOverlay } from '../../context/OverlayStackContext';

interface CustomItemFormProps {
  isOpen: boolean;
  addCustomItem: (name: string, amount: number, unit: string) => void;
  onClose: () => void;
}

export default function CustomItemForm({ isOpen, addCustomItem, onClose }: CustomItemFormProps) {
  const { t, language } = useI18n();
  useAdOverlay(isOpen);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Manual item state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('');
  const [lastAddedName, setLastAddedName] = useState<string | null>(null);

  // Quick unit suggestions
  const suggestions = uiTranslations[language].shopping.suggestionsList;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const numAmount = parseFloat(amount.replace(',', '.'));
    addCustomItem(trimmedName, isNaN(numAmount) ? 0 : numAmount, unit.trim());

    // Show temporary confirmation badge for multi-add feedback
    setLastAddedName(trimmedName);
    setTimeout(() => {
      setLastAddedName((prev) => (prev === trimmedName ? null : prev));
    }, 2500);

    // Reset state & keep focus for immediate continuous entry
    setName('');
    setAmount('');
    setUnit('');

    requestAnimationFrame(() => {
      nameInputRef.current?.focus();
    });
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Drawer>
        <Drawer.Backdrop isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} className="!z-[100]">
          <Drawer.Content placement="bottom" className="!z-[100]">
            <Drawer.Dialog className="relative !bg-white dark:!bg-gray-900 max-h-[85vh] flex flex-col p-5 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] rounded-t-3xl border-none shadow-[0_-4px_30px_rgba(0,0,0,0.12)]">
              <Drawer.Handle />

              <Drawer.Header className="pb-3 mb-1">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border-none flex items-center justify-center flex-shrink-0">
                      <Plus className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <Drawer.Heading className="text-base font-bold text-gray-900 dark:text-white truncate">
                        {t('shopping.addTitle')}
                      </Drawer.Heading>
                      {lastAddedName && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none animate-fade-in truncate">
                          <Check className="w-3 h-3 stroke-[3px]" />
                          <span className="truncate">"{lastAddedName}"</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white border-none flex items-center justify-center active:scale-95 transition-all cursor-pointer flex-shrink-0"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </Drawer.Header>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-1">
                {/* Optimized 5-3-4 Grid layout so placeholders remain 100% visible */}
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <input
                      ref={nameInputRef}
                      type="text"
                      autoFocus
                      placeholder={t('shopping.placeholderName')}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-xl px-3.5 py-2.5 text-sm sm:text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none transition-all"
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={t('shopping.placeholderAmount')}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-xl px-2.5 py-2.5 text-sm sm:text-base text-center text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none transition-all tabular-nums"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder={t('shopping.placeholderUnit')}
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-xl px-3.5 py-2.5 text-sm sm:text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Quick unit suggestion chips (horizontal scrollable) */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 mt-0.5 scroll-smooth">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 shrink-0 mr-1">
                    {t('shopping.suggestions')}
                  </span>
                  {suggestions.map((sug) => {
                    const isActive = unit.trim().toLowerCase() === sug.trim().toLowerCase();
                    return (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setUnit(isActive ? '' : sug)}
                        className={`text-xs px-3 py-1.5 rounded-xl border-none transition-all cursor-pointer select-none active:scale-95 shrink-0 whitespace-nowrap font-medium ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        {sug}
                      </button>
                    );
                  })}
                </div>

                <Button
                  type="submit"
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold border-none shadow-none active:scale-95 transition-all flex items-center justify-center gap-2 h-12 text-base cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                  <span>{t('shopping.btnAdd')}</span>
                </Button>
              </form>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
}
