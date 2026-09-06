import { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '../../../context/I18nContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useTimerManager } from '../../../hooks/useTimerManager';
import { useShoppingList } from '../../../hooks/useShoppingList';
import { apiUrl } from '../../../api';
import type { Recipe, Ingredient } from '../../../types';
import type { Chip, PendingChange, CopilotMessage, UseRecipeCopilotProps } from './types';
import { parseSuggestions } from './CopilotChatList';

const chatStorageKey = (recipeId: string) => `recipe_copilot_chat_${recipeId}`;
const changesStorageKey = (recipeId: string) => `recipe_copilot_changes_${recipeId}`;
const chipsStorageKey = (recipeId: string, lang: string) => `recipe_copilot_chips_${recipeId}_${lang}`;


const generateChangeId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

export function useRecipeCopilot({
  isOpen,
  recipe,
  onClose,
  onRemixSuccess,
  initialPrompt,
}: UseRecipeCopilotProps) {
  const { t, language } = useI18n();
  const toast = useToast();
  const { getAccessToken } = useAuth();
  const { addTimer } = useTimerManager();
  const { addCustomItem } = useShoppingList();

  const recipeId = recipe.id ?? '';

  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<CopilotMessage[]>(() => {
    try {
      const saved = localStorage.getItem(chatStorageKey(recipeId));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isPending, setIsPending] = useState(false);
  const [pendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chips, setChips] = useState<Chip[]>(() => {
    try {
      const cached = localStorage.getItem(chipsStorageKey(recipeId, language));
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [chipsLoading, setChipsLoading] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>(() => {
    try {
      const saved = localStorage.getItem(changesStorageKey(recipeId));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [choosingApply, setChoosingApply] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLInputElement>(null);
  const loadedRecipeIdRef = useRef(recipe.id);
  const autoPromptTriggeredRef = useRef(false);
  const handleSendRef = useRef<((text: string, overrideHistory?: CopilotMessage[]) => Promise<void>) | null>(null);

  const chatKey = chatStorageKey(recipeId);
  const changesKey = changesStorageKey(recipeId);
  const chipsKey = chipsStorageKey(recipeId, language);

  useEffect(() => {
    if (loadedRecipeIdRef.current !== recipe.id) return;
    try {
      if (history.length > 0) {
        localStorage.setItem(chatKey, JSON.stringify(history));
      } else {
        localStorage.removeItem(chatKey);
      }
    } catch {
      // Best-effort cache write
    }
  }, [history, chatKey, recipe.id]);

  useEffect(() => {
    if (loadedRecipeIdRef.current !== recipe.id) return;
    try {
      if (pendingChanges.length > 0) {
        localStorage.setItem(changesKey, JSON.stringify(pendingChanges));
      } else {
        localStorage.removeItem(changesKey);
      }
    } catch {
      // Best-effort cache write
    }
  }, [pendingChanges, changesKey, recipe.id]);

  const loadChips = useCallback(
    async (force = false) => {
      try {
        if (!force) {
          const cached = localStorage.getItem(chipsKey);
          if (cached) {
            setChips(JSON.parse(cached));
            return;
          }
        }
        setChipsLoading(true);
        const token = await getAccessToken();
        const res = await fetch(apiUrl(`/api/recipes/${recipe.id}/chat/chips?lang=${language}`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const fetched: Chip[] = data.chips || [];
          setChips(fetched);
          try {
            localStorage.setItem(chipsKey, JSON.stringify(fetched));
          } catch {
            // Ignore
          }
        }
      } catch {
        // Silently fail — chips are optional
      } finally {
        setChipsLoading(false);
      }
    },
    [chipsKey, getAccessToken, language, recipe.id]
  );

  const performClearSession = () => {
    setConfirmingClear(false);
    setHistory([]);
    setPendingChanges([]);
    setChoosingApply(false);
    setMessage('');
    setError(null);
    autoPromptTriggeredRef.current = true;
    try {
      localStorage.removeItem(chatKey);
      localStorage.removeItem(changesKey);
      localStorage.removeItem(chipsKey);
    } catch {
      // Ignore
    }
    loadChips(true);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, history]);

  useEffect(() => {
    if (!isOpen) {
      autoPromptTriggeredRef.current = false;
      return;
    }

    let stored: CopilotMessage[] = [];
    try {
      const saved = localStorage.getItem(chatKey);
      stored = saved ? JSON.parse(saved) : [];
    } catch {
      stored = [];
    }
    setHistory(stored);

    let storedChanges: PendingChange[] = [];
    try {
      const savedChanges = localStorage.getItem(changesKey);
      storedChanges = savedChanges ? JSON.parse(savedChanges) : [];
    } catch {
      storedChanges = [];
    }
    setPendingChanges(storedChanges);
    setChoosingApply(false);
    loadedRecipeIdRef.current = recipe.id;

    setError(null);
    loadChips();

    // Automatically send initial prompt for recipe variations if conversation is empty
    if (!autoPromptTriggeredRef.current && stored.length === 0) {
      autoPromptTriggeredRef.current = true;
      const promptText = initialPrompt || t('copilot.autoVariantPrompt');
      void handleSendRef.current?.(promptText, []);
    }
  }, [isOpen, chatKey, changesKey, recipe.id, loadChips, initialPrompt, t]);

  const handleSend = async (textToSend: string, overrideHistory?: CopilotMessage[]) => {
    if (!textToSend.trim() || isPending) return;

    setError(null);
    setIsPending(true);
    setMessage('');

    (document.activeElement as HTMLElement)?.blur();

    const userMsg: CopilotMessage = { role: 'user', text: textToSend };
    setHistory((prev) => [...(overrideHistory ?? prev), userMsg]);

    try {
      const token = await getAccessToken();
      const currentHistory = overrideHistory ?? history;
      const cleanHistory = currentHistory.map((h) => ({
        role: h.role,
        text: parseSuggestions(h.text).cleanText || h.text,
      }));

      const res = await fetch(apiUrl(`/api/recipes/${recipe.id}/chat`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: textToSend,
          history: cleanHistory,
          stagedChanges: pendingChanges.map((c) => c.text),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        if (errorData.code === 'PREMIUM_REQUIRED') {
          throw new Error(t('copilot.errorForbidden'));
        }
        throw new Error(errorData.error || t('copilot.errorGeneral'));
      }

      const data = await res.json();

      if (data.toolCalled === 'add_missing_ingredients_to_shopping_list' && data.toolArgs?.ingredients) {
        const items: string[] = data.toolArgs.ingredients;
        items.forEach((name) => {
          let foundIng: Ingredient | null = null;
          for (const group of recipe.ingredients) {
            const match = group.items.find(
              (i) =>
                i.name.toLowerCase().includes(name.toLowerCase()) ||
                name.toLowerCase().includes(i.name.toLowerCase()) ||
                (i.baseName && i.baseName.toLowerCase().includes(name.toLowerCase()))
            );
            if (match) {
              foundIng = match;
              break;
            }
          }

          if (foundIng) {
            addCustomItem(
              foundIng.name + (foundIng.modifier ? `, ${foundIng.modifier}` : ''),
              foundIng.amount,
              foundIng.unit,
              foundIng.notes || ''
            );
          } else {
            addCustomItem(name, 0, '');
          }
        });
        toast.success(t('copilot.shoppingListToast', { ingredients: items.join(', ') }));
      } else if (data.toolCalled === 'set_cooking_timer' && data.toolArgs?.duration_minutes) {
        const mins = data.toolArgs.duration_minutes;
        const label = data.toolArgs.label || t('copilot.timerNoLabel');
        addTimer(mins * 60, label, recipe.id);
        toast.info(t('copilot.timerToast', { label, duration: mins }));
      }

      if (data.pendingRemix) {
        if (Array.isArray(data.operations) && data.operations.length > 0) {
          const flattened: PendingChange[] = [];
          for (const op of data.operations) {
            if (op.type === 'ADD_INGREDIENTS' && Array.isArray(op.newIngredients) && op.newIngredients.length > 1) {
              for (const ing of op.newIngredients) {
                flattened.push({
                  id: generateChangeId(),
                  type: 'ADD_INGREDIENTS',
                  groupName: op.groupName,
                  newIngredient: ing,
                  newIngredients: [ing],
                  summary: `${ing.amount ? ing.amount + ' ' : ''}${ing.unit ? ing.unit + ' ' : ''}${ing.name} hinzufügen`,
                  text: `${ing.amount ? ing.amount + ' ' : ''}${ing.unit ? ing.unit + ' ' : ''}${ing.name} hinzufügen`,
                });
              }
              if (op.newSteps && op.newSteps.length > 0) {
                flattened.push({
                  id: generateChangeId(),
                  type: 'ADD_INSTRUCTION_STEP',
                  newSteps: op.newSteps,
                  summary: `Zubereitungsschritt: ${op.newSteps.map((s: any) => s.description).join(' ')}`,
                  text: `Zubereitungsschritt: ${op.newSteps.map((s: any) => s.description).join(' ')}`,
                });
              }
            } else if (op.type === 'ADD_INGREDIENTS' && (op.newIngredient || (Array.isArray(op.newIngredients) && op.newIngredients.length === 1))) {
              const ing = op.newIngredient || op.newIngredients[0];
              flattened.push({
                ...op,
                id: op.id || generateChangeId(),
                newIngredient: ing,
                newIngredients: [ing],
                text: op.summary || `${ing.amount ? ing.amount + ' ' : ''}${ing.unit ? ing.unit + ' ' : ''}${ing.name} hinzufügen`,
              });
            } else if (op.type === 'REPLACE_INGREDIENT' && op.newIngredient) {
              const ing = op.newIngredient;
              flattened.push({
                ...op,
                id: op.id || generateChangeId(),
                text: op.summary || `${op.targetIngredientName} durch ${ing.amount ? ing.amount + ' ' : ''}${ing.unit ? ing.unit + ' ' : ''}${ing.name} ersetzen`,
              });
            } else {
              flattened.push({
                ...op,
                id: op.id || generateChangeId(),
                text: op.summary || 'Rezept anpassen',
              });
            }
          }
          setPendingChanges((prev) => [...prev, ...flattened]);
        } else {
          const incomingChanges: string[] =
            Array.isArray(data.changes) && data.changes.length > 0
              ? data.changes
              : data.modificationRequest
                ? [data.modificationRequest]
                : [];

          if (incomingChanges.length > 0) {
            setPendingChanges((prev) => [
              ...prev,
              ...incomingChanges.map((text: string) => ({ id: generateChangeId(), text })),
            ]);
          }
        }
      }

      const modelMsg: CopilotMessage = {
        role: 'model',
        text: data.chatMessage,
        isRemixReady: data.recipeWasModified && !data.pendingRemix,
        newJobId: data.newJobId,
        newRecipe: data.updatedRecipeJson,
      };

      setHistory((prev) => [...prev, modelMsg]);
    } catch (err: unknown) {
      console.error('Error sending message to Copilot:', err);
      const errMsg = err instanceof Error ? err.message : t('copilot.errorGeneral');
      setError(errMsg);
      setHistory((prev) => prev.slice(0, -1));
      setMessage(textToSend);
    } finally {
      setIsPending(false);
    }
  };
  handleSendRef.current = handleSend;

  const handleLoadNewRecipe = (newRecipe: Recipe, newJobId: string) => {
    onRemixSuccess?.(newRecipe, newJobId);
    toast.success(t('copilot.remixSuccessToast'));
    setTimeout(() => onClose(), 50);
  };

  const removeChange = (id: string) => {
    setPendingChanges((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (next.length === 0) setChoosingApply(false);
      return next;
    });
  };

  const discardAllChanges = () => {
    setPendingChanges([]);
    setChoosingApply(false);
  };

  const handleApplyChanges = async () => {
    if (pendingChanges.length === 0 || isPending) return;
    const modificationRequest = pendingChanges.map((c, i) => `${i + 1}. ${c.text}`).join('\n');

    setIsPending(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch(apiUrl(`/api/recipes/${recipe.id}/chat/confirm`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          operations: pendingChanges,
          modificationRequest,
        }),
      });

      if (!res.ok) throw new Error('Failed to confirm remix.');
      const data = await res.json();

      const successMsg: CopilotMessage = {
        role: 'model',
        text: t('copilot.remixCreated', { title: data.updatedRecipeJson?.title || '' }),
        isRemixReady: true,
        newJobId: data.newJobId,
        newRecipe: data.updatedRecipeJson,
      };
      setHistory((prev) => [...prev, successMsg]);

      setPendingChanges([]);
      setChoosingApply(false);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to confirm remix.';
      setError(errMsg);
    } finally {
      setIsPending(false);
    }
  };

  return {
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
  };
}
