import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import {
  type PantryItem,
  type CreatePantryItemDto,
  getDefaultShelfLifeDays,
  calculateExpiresAtDate,
  getDaysRemaining,
} from '../../types';
import { useI18n } from '../../context/I18nContext';
import { categoryOrder, translateCategory } from '../../i18n';

interface PantryAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dto: CreatePantryItemDto) => Promise<void>;
  initialItem?: PantryItem | null;
}

const COMMON_UNITS = ['g', 'ml', 'kg', 'l', 'Stück', 'Dose', 'Pkg.', 'EL', 'TL'];

export const PantryAddModal: React.FC<PantryAddModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
}) => {
  const { t, language } = useI18n();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState<string>('1');
  const [unit, setUnit] = useState('Stück');
  const [category, setCategory] = useState<string>('OTHER');
  const [shelfLifeDays, setShelfLifeDays] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialItem) {
      setName(initialItem.name || '');
      setAmount(initialItem.amount !== undefined ? String(initialItem.amount) : '1');
      setUnit(initialItem.unit || 'Stück');
      setCategory(initialItem.category || 'OTHER');
      setNotes(initialItem.notes || '');

      if (initialItem.expiresAt) {
        const remaining = getDaysRemaining(initialItem.expiresAt);
        setShelfLifeDays(remaining !== null ? String(Math.max(0, remaining)) : '');
      } else {
        setShelfLifeDays(String(getDefaultShelfLifeDays(initialItem.category, initialItem.name)));
      }
    } else {
      setName('');
      setAmount('1');
      setUnit('Stück');
      setCategory('OTHER');
      setShelfLifeDays(String(getDefaultShelfLifeDays('OTHER')));
      setNotes('');
    }
  }, [initialItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const numAmount = parseFloat(amount.replace(',', '.')) || 0;
      const numDays = shelfLifeDays ? parseInt(shelfLifeDays, 10) : undefined;

      let expiresAt: string | undefined;
      if (numDays !== undefined && !isNaN(numDays)) {
        expiresAt = calculateExpiresAtDate(numDays);
      }

      await onSave({
        name: name.trim(),
        amount: numAmount,
        unit: unit.trim() || 'Stück',
        category,
        expiresAt,
        shelfLifeDays: numDays,
        notes: notes.trim() || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-5 sm:p-6 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] border-none shadow-[0_-4px_30px_rgba(0,0,0,0.12)] relative animate-in slide-in-from-bottom duration-250 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header without border */}
        <div className="flex items-center justify-between pb-3 mb-2">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            {initialItem ? t('pantry.editItem') : t('pantry.addItem')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('pantry.cancel')}
            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all border-none outline-none flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              {t('shopping.placeholderName')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('pantry.namePlaceholder')}
              required
              className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 text-sm font-medium transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                {t('shopping.placeholderAmount')}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1"
                required
                className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 text-sm font-medium transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                {t('shopping.placeholderUnit')}
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="g, ml, Stk."
                required
                className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 text-sm font-medium transition-all"
              />
            </div>
          </div>

          {/* Quick unit chips */}
          <div className="flex gap-1.5 flex-wrap">
            {COMMON_UNITS.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all border-none outline-none cursor-pointer active:scale-95 ${
                  unit === u
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                {t('pantry.categoryPlaceholder')}
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const newCat = e.target.value;
                  setCategory(newCat);
                  setShelfLifeDays(String(getDefaultShelfLifeDays(newCat, name)));
                }}
                aria-label={t('pantry.categoryPlaceholder')}
                className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 text-sm font-medium transition-all cursor-pointer"
              >
                {categoryOrder.map((cat) => (
                  <option key={cat} value={cat}>
                    {translateCategory(cat, language)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                {t('pantry.shelfLifeDays')}
              </label>
              <input
                type="number"
                min="0"
                value={shelfLifeDays}
                onChange={(e) => setShelfLifeDays(e.target.value)}
                placeholder="7"
                className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 text-sm font-medium transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              {t('pantry.notesPlaceholder')}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="z.B. geöffnet im Kühlschrank"
              className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 text-sm font-medium transition-all"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-sm transition-all active:scale-95 border-none outline-none cursor-pointer flex items-center justify-center"
            >
              {t('pantry.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all active:scale-95 border-none outline-none shadow-[0_2px_6px_rgba(16,185,129,0.25)] disabled:opacity-50 cursor-pointer flex items-center justify-center"
            >
              {saving ? '...' : t('pantry.saveItem')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
