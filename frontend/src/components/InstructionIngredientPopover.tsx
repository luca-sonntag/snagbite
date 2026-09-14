import React from 'react';
import { Popover } from '@heroui/react';
import IngredientIcon from './IngredientIcon';

export interface InstructionIngredientPopoverProps {
  displayText: string;
  matchedIngredient?: {
    name: string;
    baseName?: string;
    canonicalId?: string | null;
    category?: string;
    amount: number;
    unit?: string;
    modifier?: string;
    notes?: string;
    synonyms?: string[];
  };
  fallbackText?: string;
  formatAmount: (amount: number, unit?: string) => string;
  variant?: 'list' | 'focused';
}

export const InstructionIngredientPopover: React.FC<InstructionIngredientPopoverProps> = ({
  displayText,
  matchedIngredient,
  fallbackText,
  formatAmount,
  variant = 'list',
}) => {
  const rawScaled = matchedIngredient
    ? formatAmount(matchedIngredient.amount, matchedIngredient.unit)?.trim() ?? ''
    : '';
  const unit = matchedIngredient?.unit?.trim() ?? '';
  const alreadyHasUnit =
    Boolean(unit) &&
    (rawScaled.endsWith(` ${unit}`) || rawScaled.toLowerCase().endsWith(unit.toLowerCase()));
  const displayAmount =
    alreadyHasUnit || !unit ? rawScaled : `${rawScaled} ${unit}`.trim();

  const isFocused = variant === 'focused';

  return (
    <span onClick={(e) => e.stopPropagation()} className="inline">
      <Popover>
        <Popover.Trigger>
          <span
            className={
              isFocused
                ? 'font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-500/12 dark:bg-emerald-500/20 px-2 py-0.5 rounded-lg hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30 cursor-pointer transition-all active:scale-95 outline-none inline-flex items-center'
                : 'font-medium text-gray-900 dark:text-gray-100 underline decoration-gray-300 dark:decoration-gray-700 underline-offset-4 hover:text-emerald-600 dark:hover:text-emerald-400 hover:decoration-emerald-500/50 cursor-pointer transition-colors outline-none'
            }
          >
            {displayText}
          </span>
        </Popover.Trigger>
        <Popover.Content
          isNonModal
          placement="top"
          className="z-[100] bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-none rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.1)] px-4 py-2.5"
        >
          <Popover.Dialog className="outline-none border-none p-0 m-0">
            {matchedIngredient ? (
              <div className="flex items-center gap-2.5 min-w-[160px] max-w-[280px]">
                <IngredientIcon
                  baseName={matchedIngredient.baseName}
                  canonicalId={matchedIngredient.canonicalId}
                  category={matchedIngredient.category}
                  name={matchedIngredient.name}
                  synonyms={matchedIngredient.synonyms}
                  size="sm"
                />
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">
                      {matchedIngredient.name}
                    </span>
                    {displayAmount && (
                      <span className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/50 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 rounded-lg shrink-0 whitespace-nowrap">
                        {displayAmount}
                      </span>
                    )}
                  </div>
                  {(matchedIngredient.modifier || matchedIngredient.notes) && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 italic mt-0.5 leading-tight truncate">
                      {[matchedIngredient.modifier, matchedIngredient.notes].filter(Boolean).join(' • ')}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {fallbackText}
              </span>
            )}
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </span>
  );
};

export default InstructionIngredientPopover;
