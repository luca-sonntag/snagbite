import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { PantryItem, CreatePantryItemDto } from '../../types';
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const exp = new Date(initialItem.expiresAt);
        exp.setHours(0, 0, 0, 0);
        const diff = Math.max(0, Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
        setShelfLifeDays(String(diff));
      } else {
        setShelfLifeDays('');
      }
    } else {
      setName('');
      setAmount('1');
      setUnit('Stück');
      setCategory('OTHER');
      setShelfLifeDays('7');
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
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + numDays);
        expiresAt = expDate.toISOString();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-content1 rounded-3xl w-full max-w-md p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-divider mb-4">
          <h3 className="text-lg font-bold text-foreground">
            {initialItem ? t('pantry.editItem') : t('pantry.addItem')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('pantry.cancel')}
            className="p-2 rounded-full text-default-400 hover:text-foreground hover:bg-default-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-default-600 mb-1">
              {t('shopping.placeholderName')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('pantry.namePlaceholder')}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-default-100 border-none text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-default-600 mb-1">
                {t('shopping.placeholderAmount')}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-default-100 border-none text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-default-600 mb-1">
                {t('shopping.placeholderUnit')}
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="g, ml, Stk."
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-default-100 border-none text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary text-sm"
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
                className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                  unit === u ? 'bg-primary text-primary-foreground font-semibold' : 'bg-default-100 text-default-600 hover:bg-default-200'
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-default-600 mb-1">
                {t('pantry.categoryPlaceholder')}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label={t('pantry.categoryPlaceholder')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-default-100 border-none text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary text-sm"
              >
                {categoryOrder.map((cat) => (
                  <option key={cat} value={cat}>
                    {translateCategory(cat, language)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-default-600 mb-1">
                {t('pantry.shelfLifeDays')}
              </label>
              <input
                type="number"
                min="0"
                value={shelfLifeDays}
                onChange={(e) => setShelfLifeDays(e.target.value)}
                placeholder="7"
                className="w-full px-3.5 py-2.5 rounded-xl bg-default-100 border-none text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-default-600 mb-1">
              {t('pantry.notesPlaceholder')}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="z.B. geöffnet im Kühlschrank"
              className="w-full px-3.5 py-2.5 rounded-xl bg-default-100 border-none text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary text-sm"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-default-100 hover:bg-default-200 text-foreground font-semibold text-sm transition-colors min-h-[44px]"
            >
              {t('pantry.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {saving ? '...' : t('pantry.saveItem')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
