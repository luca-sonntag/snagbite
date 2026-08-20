import { useState, useEffect, useRef } from 'react';
import { Button, Drawer } from '@heroui/react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Loader2,
  RefreshCw,
  X,
  Plus,
  Trash2,
  ListChecks,
  ChefHat,
  ArrowLeftRight,
  ShoppingCart,
  Timer
} from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { useTimerManager } from '../../hooks/useTimerManager';
import { useShoppingList } from '../../hooks/useShoppingList';
import { apiUrl } from '../../api';
import type { Recipe } from '../../types';

type Chip = { label: string; prompt: string; category: string };

// A single modification the user has staged in the chat "transaction" but not yet applied.
type PendingChange = { id: string; text: string };

// localStorage key helpers — the copilot session (chat + suggested chips) is cached per recipe.
const chatStorageKey = (recipeId: string) => `recipe_copilot_chat_${recipeId}`;
// Staged (collected but not-yet-applied) recipe changes are cached per recipe.
const changesStorageKey = (recipeId: string) => `recipe_copilot_changes_${recipeId}`;
// Chips are language-specific, so they are cached per recipe *and* UI language.
const chipsStorageKey = (recipeId: string, lang: string) => `recipe_copilot_chips_${recipeId}_${lang}`;

interface Message {
  role: 'user' | 'model';
  text: string;
  isRemixReady?: boolean;
  newJobId?: string;
  newRecipe?: Recipe;
}

interface RecipeCopilotProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe;
  onRemixSuccess: (newRecipe: Recipe, newJobId: string) => void;
  onReplaceCurrent: (newRecipe: Recipe) => void;
}

export default function RecipeCopilot({ isOpen, onClose, recipe, onRemixSuccess, onReplaceCurrent }: RecipeCopilotProps) {
  const { t, language } = useI18n();
  const { getAccessToken } = useAuth();
  const { addTimer } = useTimerManager();
  const { addCustomItem } = useShoppingList();

  // Recipe.id is optional on the type but always present at runtime (the backend
  // normalizes it). Derive a guaranteed string for the per-recipe cache keys.
  const recipeId = recipe.id ?? '';

  const [message, setMessage] = useState('');
  // Lazily hydrate the chat from the per-recipe cache so a reopened session resumes where it left off.
  const [history, setHistory] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(chatStorageKey(recipeId));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isPending, setIsPending] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showChips, setShowChips] = useState(true);
  const [chips, setChips] = useState<Chip[]>([]);
  const [chipsLoading, setChipsLoading] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  // The chat "transaction": modifications collected across turns but not yet applied.
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>(() => {
    try {
      const saved = localStorage.getItem(changesStorageKey(recipeId));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  // When true, the transaction card reveals the "replace current" / "as new recipe" choice.
  const [choosingApply, setChoosingApply] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLInputElement>(null);
  // Tracks which recipe the in-memory `history` belongs to, so we never persist a stale
  // conversation into another recipe's cache key when the `recipe` prop swaps (e.g. after a remix).
  const loadedRecipeIdRef = useRef(recipe.id);

  const chatKey = chatStorageKey(recipeId);
  const changesKey = changesStorageKey(recipeId);
  const chipsKey = chipsStorageKey(recipeId, language);

  // Persist the chat to the per-recipe cache on every change.
  useEffect(() => {
    if (loadedRecipeIdRef.current !== recipe.id) return; // guard against writing before a reload
    try {
      if (history.length > 0) {
        localStorage.setItem(chatKey, JSON.stringify(history));
      } else {
        localStorage.removeItem(chatKey);
      }
    } catch {
      // Ignore quota / serialization errors — caching is best-effort.
    }
  }, [history, chatKey, recipe.id]);

  // Persist the staged changes (the transaction) to the per-recipe cache on every change.
  useEffect(() => {
    if (loadedRecipeIdRef.current !== recipe.id) return; // guard against writing before a reload
    try {
      if (pendingChanges.length > 0) {
        localStorage.setItem(changesKey, JSON.stringify(pendingChanges));
      } else {
        localStorage.removeItem(changesKey);
      }
    } catch {
      // Ignore quota / serialization errors — caching is best-effort.
    }
  }, [pendingChanges, changesKey, recipe.id]);

  // Load suggested chips, preferring the per-recipe/language cache. Pass `force` to bypass it
  // and regenerate fresh chips (used by the clear/reset action).
  const loadChips = async (force = false) => {
    setChipsLoading(true);
    try {
      if (!force) {
        const cached = localStorage.getItem(chipsKey);
        if (cached) {
          setChips(JSON.parse(cached));
          return;
        }
      }
      const token = await getAccessToken();
      const res = await fetch(apiUrl(`/api/jobs/${recipe.id}/chat/chips?lang=${language}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const fetched: Chip[] = data.chips || [];
        setChips(fetched);
        try {
          localStorage.setItem(chipsKey, JSON.stringify(fetched));
        } catch {
          // Ignore cache write failures.
        }
      }
    } catch {
      // Silently fail — chips are optional.
    } finally {
      setChipsLoading(false);
    }
  };

  // Reset the session: clear the cached chat + chips for this recipe and regenerate fresh suggestions.
  // The confirmation is rendered *inside* the drawer (see below) because the drawer's focus trap
  // makes the global useDialog() overlay unclickable when opened on top of it.
  const performClearSession = () => {
    setConfirmingClear(false);
    setHistory([]);
    setPendingChanges([]);
    setChoosingApply(false);
    setMessage('');
    setError(null);
    try {
      localStorage.removeItem(chatKey);
      localStorage.removeItem(changesKey);
      localStorage.removeItem(chipsKey);
    } catch {
      // Ignore.
    }
    setShowChips(true);
    loadChips(true);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto scroll when history changes
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, history]);

  // On open: hydrate the cached chat for the current recipe, load (cached or fresh) chips, and focus.
  useEffect(() => {
    if (!isOpen) return;

    // Reload the persisted chat for the current recipe (it may have changed while closed, e.g. remix).
    let stored: Message[] = [];
    try {
      const saved = localStorage.getItem(chatKey);
      stored = saved ? JSON.parse(saved) : [];
    } catch {
      stored = [];
    }
    setHistory(stored);

    // Reload the persisted staged changes for the current recipe.
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
    // Hide the suggestion chips when resuming an existing conversation; the Sparkles button re-shows them.
    setShowChips(stored.length === 0);

    loadChips();

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isPending) return;

    setError(null);
    setIsPending(true);
    setMessage('');
    setShowChips(false);

    // Dismiss mobile keyboard after sending
    (document.activeElement as HTMLElement)?.blur();

    // Add user message to history
    const userMsg: Message = { role: 'user', text: textToSend };
    setHistory(prev => [...prev, userMsg]);

    try {
      const token = await getAccessToken();
      const cleanHistory = history.map(h => ({ role: h.role, text: h.text }));

      const res = await fetch(apiUrl(`/api/jobs/${recipe.id}/chat`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: textToSend,
          history: cleanHistory,
          // Give the model the modifications already staged in the transaction so it can
          // build on them consistently across turns (avoid duplicates, flag conflicts).
          stagedChanges: pendingChanges.map(c => c.text)
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        if (errorData.code === 'PREMIUM_REQUIRED') {
          throw new Error(t('copilot.errorForbidden'));
        }
        throw new Error(errorData.error || t('copilot.errorGeneral'));
      }

      const data = await res.json();

      // Handle tool calls in frontend
      if (data.toolCalled === 'add_missing_ingredients_to_shopping_list' && data.toolArgs?.ingredients) {
        const items: string[] = data.toolArgs.ingredients;
        items.forEach(name => {
          // Look up ingredient details in current recipe for smart defaults
          let foundIng: any = null;
          for (const group of recipe.ingredients) {
            const match = group.items.find(i =>
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
      } else if (data.toolCalled === 'set_cooking_timer' && data.toolArgs?.duration_minutes) {
        const mins = data.toolArgs.duration_minutes;
        const label = data.toolArgs.label || t('copilot.timerNoLabel');
        addTimer(mins * 60, label, recipe.id);
      }

      // A modification request is not applied immediately anymore — instead it is staged in the
      // transaction card, where the user collects changes across turns and applies them together.
      if (data.pendingRemix && data.modificationRequest) {
        setPendingChanges(prev => [
          ...prev,
          { id: crypto.randomUUID(), text: data.modificationRequest },
        ]);
      }

      // Add AI reply to history
      const modelMsg: Message = {
        role: 'model',
        text: data.chatMessage,
        isRemixReady: data.recipeWasModified && !data.pendingRemix,
        newJobId: data.newJobId,
        newRecipe: data.updatedRecipeJson
      };

      setHistory(prev => [...prev, modelMsg]);
    } catch (err: any) {
      console.error('Error sending message to Copilot:', err);
      setError(err.message || t('copilot.errorGeneral'));
      // Remove the last user message on failure to allow retry
      setHistory(prev => prev.slice(0, -1));
      setMessage(textToSend);
    } finally {
      setIsPending(false);
      setPendingAction(null);
    }
  };

  const handleLoadNewRecipe = (newRecipe: Recipe, newJobId: string) => {
    onRemixSuccess(newRecipe, newJobId);
    setTimeout(() => onClose(), 50);
  };

  // Remove a single staged change from the transaction.
  const removeChange = (id: string) => {
    setPendingChanges(prev => {
      const next = prev.filter(c => c.id !== id);
      if (next.length === 0) setChoosingApply(false);
      return next;
    });
  };

  // Discard the whole transaction.
  const discardAllChanges = () => {
    setPendingChanges([]);
    setChoosingApply(false);
  };

  // Apply all staged changes at once: combine them into a single, numbered remix request and
  // run the existing confirm/remix flow. On success the transaction is cleared.
  const handleApplyChanges = async (replaceCurrent: boolean) => {
    if (pendingChanges.length === 0 || isPending) return;
    const modificationRequest = pendingChanges
      .map((c, i) => `${i + 1}. ${c.text}`)
      .join('\n');

    setIsPending(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch(apiUrl(`/api/jobs/${recipe.id}/chat/confirm`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ modificationRequest, replaceCurrent }),
      });

      if (!res.ok) throw new Error('Failed to confirm remix.');
      const data = await res.json();

      const successMsg: Message = {
        role: 'model',
        text: t('copilot.remixCreated', { title: data.updatedRecipeJson?.title || '' }),
        isRemixReady: !replaceCurrent,
        newJobId: data.newJobId,
        newRecipe: data.updatedRecipeJson,
      };
      setHistory(prev => [...prev, successMsg]);

      // The transaction is done — clear the staged changes.
      setPendingChanges([]);
      setChoosingApply(false);

      // If replacing current recipe, immediately load it
      if (replaceCurrent && data.updatedRecipeJson) {
        onReplaceCurrent(data.updatedRecipeJson);
        setTimeout(() => onClose(), 50);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to confirm remix.');
    } finally {
      setIsPending(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'remix':
        return <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
      case 'help':
        return <ChefHat className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
      case 'substitute':
        return <ArrowLeftRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'shopping':
        return <ShoppingCart className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
      case 'timer':
        return <Timer className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
    }
  };

  return (
    <Drawer isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Drawer.Backdrop className="!z-[100]">
        <Drawer.Content placement="bottom" className="!z-[100] h-[100dvh] w-full rounded-none md:max-w-2xl md:mx-auto md:h-[85vh] md:rounded-t-3xl">
          <Drawer.Dialog className="relative !bg-white dark:!bg-gray-900 flex flex-col h-full overflow-hidden">

            {/* Header: Clean 3-Column Bar */}
            <div className="h-14 px-4 flex items-center justify-between flex-shrink-0 select-none bg-white dark:bg-gray-900 border-none relative z-10">
              {/* Left: Clear button or empty placeholder */}
              <div className="w-9 flex justify-start">
                {history.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setConfirmingClear(true)}
                    disabled={isPending}
                    className="w-9 h-9 rounded-xl bg-gray-100/80 hover:bg-red-500/10 dark:bg-gray-800/80 dark:hover:bg-red-500/20 text-gray-400 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 active:scale-95 transition-all outline-none border-none cursor-pointer flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label={t('copilot.clearAria')}
                    title={t('copilot.clearAria')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : <div className="w-9" />}
              </div>

              {/* Center: Title & Live Indicator */}
              <div className="flex items-center gap-2 max-w-[65%]">
                <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5 leading-none truncate">
                  {t('copilot.title')}
                  <span className="flex h-2 w-2 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </span>
              </div>

              {/* Right: Close button */}
              <div className="w-9 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl bg-gray-100/80 hover:bg-gray-200 dark:bg-gray-800/80 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white active:scale-95 transition-all outline-none border-none cursor-pointer flex items-center justify-center"
                  aria-label={t('dialog.closeAria')}
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Body (Messages) */}
            <Drawer.Body className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col gap-4 scrollbar-none bg-[#f9fafb] dark:bg-[var(--color-gray-950)]">

              {/* Welcome message if history is empty */}
              {history.length === 0 && (
                <div className="my-auto flex flex-col items-center text-center max-w-sm mx-auto gap-3 py-8">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    {t('copilot.title')}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Ich helfe dir, dieses Rezept anzupassen, Zutaten auszutauschen oder einen Timer zu starten. Frag mich einfach!
                  </p>
                </div>
              )}

              {/* Chat bubbles */}
              {history.map((msg, idx) => {
                const isAI = msg.role === 'model';
                return (
                  <div
                    key={idx}
                    className={`flex gap-2.5 max-w-[88%] ${isAI ? 'self-start items-end' : 'self-end flex-row-reverse items-end'}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs mb-1 ${
                      isAI
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-gray-200/80 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                    }`}>
                      {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>

                    <div className="flex flex-col gap-2 min-w-0">
                      <div className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                        isAI
                          ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-xs shadow-[0_2px_8px_rgba(0,0,0,0.03)] border-none'
                          : 'bg-emerald-600 text-white rounded-br-xs shadow-none'
                      }`}>
                        {msg.text}
                      </div>

                      {/* Remix system card if recipe was modified */}
                      {isAI && msg.isRemixReady && msg.newRecipe && msg.newJobId && (
                        <div className="p-4 border-none bg-emerald-500/10 dark:bg-emerald-500/15 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col gap-3 rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 animate-spin-slow" />
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                              {t('copilot.remixReady')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-300 leading-normal">
                            Eine neue Version des Rezepts wurde generiert: <span className="font-semibold italic">„{msg.newRecipe.title}“</span>.
                          </p>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl h-10 flex items-center justify-center gap-1.5 border-none shadow-none active:scale-95 transition-all text-xs"
                            onPress={() => handleLoadNewRecipe(msg.newRecipe!, msg.newJobId!)}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            {t('copilot.remixLoadBtn')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Loader/Pending reply */}
              {isPending && (
                <div className="flex gap-2.5 max-w-[88%] self-start items-end animate-pulse">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mb-1">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs px-3.5 py-3 rounded-2xl rounded-bl-xs border-none shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex items-center gap-2">
                      <Loader2 className="w-4.5 h-4.5 animate-spin text-emerald-600 dark:text-emerald-400" />
                      <span>{pendingAction || t('copilot.loading')}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border-none text-red-600 dark:text-red-400 text-xs text-center font-medium self-center max-w-[90%] shadow-xs">
                  {error}
                </div>
              )}

              <div ref={messagesEndRef} />
            </Drawer.Body>

            {/* Footer: Transaction Card, Quick Chips & Message Input */}
            <div className="pt-2 pb-[calc(1rem_+_var(--safe-area-inset-bottom))] px-4 sm:px-6 flex flex-col gap-2.5 bg-white dark:bg-gray-900 flex-shrink-0">

              {/* Transaction Card — collected (staged) changes, applied together */}
              {pendingChanges.length > 0 && (
                <div className="p-3.5 sm:p-4 border-none bg-emerald-500/10 dark:bg-emerald-500/15 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col gap-3 rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                      <ListChecks className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      {t('copilot.changesTitle', { count: pendingChanges.length })}
                    </span>
                  </div>

                  {/* Collected changes list */}
                  <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto scrollbar-none">
                    {pendingChanges.map((change, idx) => (
                      <div
                        key={change.id}
                        className="flex items-start gap-2 p-2.5 rounded-xl bg-white dark:bg-gray-800 border-none shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
                      >
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0 w-4 text-center">
                          {idx + 1}.
                        </span>
                        <span className="text-xs text-gray-700 dark:text-gray-200 leading-snug flex-1 min-w-0 break-words font-medium">
                          {change.text}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeChange(change.id)}
                          disabled={isPending}
                          className="flex-shrink-0 p-1 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all outline-none border-none cursor-pointer disabled:opacity-40"
                          aria-label={t('copilot.changesDeleteAria')}
                          title={t('copilot.changesDeleteAria')}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  {choosingApply ? (
                    <div className="flex flex-col gap-2 pt-1">
                      <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-normal font-medium">
                        {t('copilot.changesApplyPrompt')}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl h-10 flex items-center justify-center gap-1.5 border-none shadow-none active:scale-95 transition-all text-xs flex-1"
                          onPress={() => handleApplyChanges(true)}
                          isDisabled={isPending}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          {t('copilot.remixReplaceBtn')}
                        </Button>
                        <Button
                          size="sm"
                          className="bg-white dark:bg-gray-800 border-none text-emerald-700 dark:text-emerald-300 font-bold rounded-xl h-10 flex items-center justify-center gap-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] active:scale-95 transition-all text-xs flex-1 hover:bg-gray-50 dark:hover:bg-gray-700"
                          onPress={() => handleApplyChanges(false)}
                          isDisabled={isPending}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {t('copilot.remixNewBtn')}
                        </Button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setChoosingApply(false)}
                        disabled={isPending}
                        className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium self-center outline-none border-none cursor-pointer bg-transparent py-1"
                      >
                        {t('dialog.cancelDefault')}
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl h-10 flex items-center justify-center gap-2 border-none shadow-none active:scale-95 transition-all text-xs flex-1"
                        onPress={() => setChoosingApply(true)}
                        isDisabled={isPending}
                      >
                        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        {t('copilot.changesApply')}
                      </Button>
                      <Button
                        size="sm"
                        className="bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 font-semibold rounded-xl h-10 px-3.5 flex items-center justify-center gap-1.5 border-none shadow-[0_1px_3px_rgba(0,0,0,0.02)] active:scale-95 transition-all text-xs"
                        onPress={discardAllChanges}
                        isDisabled={isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t('copilot.changesDiscardAll')}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Chips Scroll Container */}
              {showChips && (
                <div className="flex flex-col gap-1.5">
                  {chipsLoading ? (
                    <div className="flex items-center justify-center py-1">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    </div>
                  ) : chips.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 px-0.5 touch-pan-x -mx-1">
                      {chips.map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSend(chip.prompt)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-full border-none bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-300 active:scale-95 transition-all whitespace-nowrap flex-shrink-0 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-50"
                        >
                          {getCategoryIcon(chip.category)}
                          <span>{chip.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Message Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(message);
                }}
                className="flex items-center gap-2 w-full"
              >
                {!showChips && (
                  <button
                    type="button"
                    onClick={() => setShowChips(true)}
                    className="flex-shrink-0 h-12 w-11 rounded-2xl bg-gray-100 dark:bg-gray-800 border-none hover:bg-emerald-500/10 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                    aria-label={t('copilot.showSuggestionsAria')}
                  >
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </button>
                )}
                <div className="relative flex-1 flex items-center bg-gray-100 dark:bg-gray-800 border-none rounded-2xl focus-within:ring-2 focus-within:ring-emerald-500/30 pr-1.5 h-12 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                  <input
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('copilot.placeholder')}
                    disabled={isPending}
                    aria-label={t('copilot.placeholder')}
                    className="w-full h-full bg-transparent pl-4 pr-11 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none border-none"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                    <Button
                      type="submit"
                      isDisabled={isPending || !message.trim()}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-9 w-9 min-w-9 shadow-none flex items-center justify-center active:scale-90 transition-all p-0 border-none disabled:opacity-40"
                      aria-label={t('copilot.sendAria')}
                    >
                      <Send className="w-4 h-4 fill-white ml-0.5" />
                    </Button>
                  </div>
                </div>
              </form>
            </div>

            {/* Clear/Reset confirmation */}
            {confirmingClear && (
              <div className="absolute inset-0 z-[60] flex items-center justify-center p-5 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
                <div className="w-full max-w-xs rounded-2xl border-none p-5 shadow-2xl bg-white dark:bg-gray-900 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
                  <div className="flex gap-3 items-start">
                    <div className="p-2.5 rounded-xl border-none flex-shrink-0 flex items-center justify-center bg-amber-500/10">
                      <Trash2 className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                        {t('copilot.clearConfirmTitle')}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                        {t('copilot.clearConfirmBody')}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2.5">
                    <Button
                      variant="tertiary"
                      onPress={() => setConfirmingClear(false)}
                      className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-medium"
                    >
                      {t('dialog.cancelDefault')}
                    </Button>
                    <Button
                      onPress={performClearSession}
                      className="bg-amber-500 hover:bg-amber-400 text-white font-medium shadow-md transition-all"
                    >
                      {t('copilot.clearConfirmBtn')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
