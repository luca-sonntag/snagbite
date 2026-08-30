import React from 'react';
import type { Recipe } from '../../../types';

export interface Chip {
  label: string;
  prompt: string;
  category: string;
}

export interface PendingChange {
  id: string;
  text: string;
}

export interface CopilotMessage {
  role: 'user' | 'model';
  text: string;
  isRemixReady?: boolean;
  newJobId?: string;
  newRecipe?: Recipe;
}

export interface RecipeCopilotProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe;
  onRemixSuccess: (newRecipe: Recipe, newJobId: string) => void;
  onReplaceCurrent: (newRecipe: Recipe) => void;
}

export interface CopilotTransactionCardProps {
  pendingChanges: PendingChange[];
  choosingApply: boolean;
  setChoosingApply: (choosing: boolean) => void;
  isPending: boolean;
  onRemoveChange: (id: string) => void;
  onDiscardAll: () => void;
  onApplyChanges: (replaceCurrent: boolean) => void;
}

export interface CopilotInputBarProps {
  message: string;
  setMessage: (msg: string) => void;
  isPending: boolean;
  textareaRef: React.RefObject<HTMLInputElement | null>;
  onSend: (text: string) => void;
}

export interface CopilotChatListProps {
  history: CopilotMessage[];
  isPending: boolean;
  pendingAction: string | null;
  error: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onLoadNewRecipe: (recipe: Recipe, jobId: string) => void;
  onSend: (text: string) => void;
  recipeId?: string;
  initialChips?: Chip[];
  chipsLoading?: boolean;
}

export interface CopilotHeaderProps {
  historyLength: number;
  isPending: boolean;
  onClear: () => void;
  onClose: () => void;
}

export interface UseRecipeCopilotProps {
  isOpen: boolean;
  recipe: Recipe;
  onClose: () => void;
  onRemixSuccess: (newRecipe: Recipe, newJobId: string) => void;
  onReplaceCurrent: (newRecipe: Recipe) => void;
}

