import { useEffect, useState } from 'react';
import { Button, Drawer } from '@heroui/react';
import { Folder, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useCollections } from '../../hooks/useCollections';
import type { Job, Collection } from '../../types';
import { useAdOverlay } from '../../context/OverlayStackContext';

interface CollectionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  job?: Job;
  selectedJobs?: Job[];
  /**
   * Optional override for the initial mode:
   * - `'assign'` (default): checkbox list (single-recipe or bulk)
   * - `'manage'`: collection-management overview (no checkboxes, edit/delete actions)
   * - `'create'`: jump straight to the "new collection" form (no checkboxes shown)
   */
  initialMode?: 'assign' | 'create' | 'manage';
  onUpdated?: () => void;
  /** If provided, called instead of the internal updateRecipeCollections — allows the
   * parent to inject an optimistic implementation so the UI responds instantly. */
  onAssign?: (jobId: string, collectionIds: string[]) => Promise<any>;
}

const EMOJIS = ['🥦', '🍕', '🍝', '🥩', '🍰', '🥐', '🥑', '🌮', '🍣', '🍩', '🍳', '🥗', '☕', '🍷'];

export default function CollectionSheet({
  isOpen,
  onClose,
  job,
  selectedJobs = [],
  initialMode = 'assign',
  onUpdated,
  onAssign
}: CollectionSheetProps) {
  const { t, language } = useI18n();
  useAdOverlay(isOpen);
  const {
    collections,
    refreshCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    updateRecipeCollections
  } = useCollections();

  // Mode: 'assign' (checkboxes) | 'manage' (collection overview, no recipes) |
  //       'create' (form) | 'edit' (form)
  const [mode, setMode] = useState<'assign' | 'manage' | 'create' | 'edit'>(initialMode);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');

  // Memberships state for checkboxes (single-recipe mode or shared-intersection for bulk mode)
  const [membershipIds, setMembershipIds] = useState<string[]>([]);
  // Per-recipe initial membership for bulk mode: { jobId: collectionIds[] } so we can
  // preserve existing memberships of selected recipes that aren't shared with all others.
  const [bulkInitialMap, setBulkInitialMap] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  // Inline delete confirmation. We can't use the global `dialog.confirm()` here:
  // that dialog portals to <body>, i.e. OUTSIDE this HeroUI Drawer's modal overlay,
  // so the drawer's focus/pointer containment swallows every click on it (it renders
  // on top but is unclickable, trapping the user). Rendering the confirm INSIDE the
  // drawer keeps it within the drawer's interaction scope, so it stays clickable.
  const [pendingDelete, setPendingDelete] = useState<Collection | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load collections when the sheet opens; init mode/form state only on the
  // false→true transition so user-driven mode changes (e.g. clicking
  // "+ Neue Sammlung" inside the manage overview) aren't reset by parent
  // re-renders that change `refreshCollections`/`initialMode` reference identity.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  useEffect(() => {
    if (isOpen && !prevIsOpen) {
      // sheet just opened — seed everything from the caller
      refreshCollections();
      setMode(initialMode);
      setFormError(null);

      if (job || initialMode === 'create' || initialMode === 'manage') {
        // Single-recipe mode, "create new" mode, or pure management mode:
        // no membership table needed.
        setMembershipIds([]);
        setBulkInitialMap({});
      } else if (initialMode === 'assign') {
        // Bulk mode: pre-check the INTERSECTION of memberships across all selected jobs,
        // so the user can either keep/uncheck them (remove) or add new collections.
        const targetJobs = selectedJobs.length > 0 ? selectedJobs : [];
        if (targetJobs.length === 0) {
          setMembershipIds([]);
          setBulkInitialMap({});
        } else {
          const sets = targetJobs.map(j => new Set(j.collectionIds ?? []));
          const intersection = Array.from(sets[0]).filter(id => sets.every(s => s.has(id)));
          setMembershipIds(intersection);
          const initialMap: Record<string, string[]> = {};
          targetJobs.forEach(j => { initialMap[j.id] = j.collectionIds ?? []; });
          setBulkInitialMap(initialMap);
        }
      }
    } else if (!isOpen && prevIsOpen) {
      // sheet just closed — reset transient form state for the next open
      setMode(initialMode);
      setMembershipIds([]);
      setBulkInitialMap({});
      setFormError(null);
      setName('');
      setSelectedEmoji('');
      setEditingCollection(null);
      setPendingDelete(null);
      setIsDeleting(false);
    }
    setPrevIsOpen(isOpen);
  }, [isOpen, prevIsOpen, job, selectedJobs, initialMode, refreshCollections]);

  // After creating/editing/deleting within the form modes, return to whichever
  // list view the user started from ('manage' if no recipes were involved,
  // 'assign' otherwise) so the modal flow stays consistent.
  const handleBackToList = () => {
    setMode(initialMode === 'assign' && (job || selectedJobs.length > 0) ? 'assign' : 'manage');
  };

  const handleCreateOpen = () => {
    setName('');
    setSelectedEmoji('');
    setFormError(null);
    setMode('create');
  };

  const handleEditOpen = (col: Collection) => {
    setEditingCollection(col);
    setName(col.name);
    setSelectedEmoji(col.emoji || '');
    setFormError(null);
    setMode('edit');
  };

  const handleSaveCollection = async () => {
    if (!name.trim()) {
      setFormError(t('catalog.collectionNameRequired') || 'Name ist erforderlich');
      return;
    }

    if (mode === 'create') {
      const res = await createCollection(name, selectedEmoji || null);
      if (res.success) {
        handleBackToList();
        onUpdated?.();
      } else {
        setFormError(res.error || 'Fehler beim Erstellen');
      }
    } else if (mode === 'edit' && editingCollection) {
      const res = await updateCollection(editingCollection.id, {
        name,
        emoji: selectedEmoji || null
      });
      if (res.success) {
        handleBackToList();
        onUpdated?.();
      } else {
        setFormError(res.error || 'Fehler beim Aktualisieren');
      }
    }
  };

  const handleDeleteCollection = async () => {
    if (!editingCollection) return;
    const res = await deleteCollection(editingCollection.id);
    if (res.success) {
      handleBackToList();
      onUpdated?.();
    } else {
      setFormError(res.error || 'Fehler beim Löschen');
    }
  };

  // Direct delete from the management overview — opens the inline confirmation
  // (rendered inside the drawer, see `pendingDelete` above).
  const handleDirectDelete = (col: Collection) => {
    setFormError(null);
    setPendingDelete(col);
  };

  const handleConfirmDirectDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    const res = await deleteCollection(pendingDelete.id);
    setIsDeleting(false);
    if (res.success) {
      setPendingDelete(null);
      onUpdated?.();
    } else {
      setPendingDelete(null);
      setFormError(res.error || 'Fehler beim Löschen');
    }
  };

  const handleToggleMembership = (colId: string) => {
    setMembershipIds(prev =>
      prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
    );
  };

  const handleConfirmAssignment = async () => {
    if (job) {
      // Single-recipe mode: replace membership with the selected set.
      // Prefer the optimistic injected handler if the parent provided one.
      if (onAssign) {
        onAssign(job.id, membershipIds);
      } else {
        await updateRecipeCollections(job.id, membershipIds);
      }
      onUpdated?.();
      onClose();
      return;
    }

    // Bulk mode: for each selected recipe, compute its new membership:
    //   start from the recipe's INITIAL memberships (preserves non-shared ones),
    //   then add/remove only the collections that are in `membershipIds`.
    // This way, unchecking a partially-shared collection removes it ONLY from the
    // recipes that had it (the others are unaffected); checking a new collection
    // adds it to ALL selected recipes.
    const targetJobs = selectedJobs.length > 0 ? selectedJobs : [];
    const promises = targetJobs.map(async (j) => {
      const initial = bulkInitialMap[j.id] ?? j.collectionIds ?? [];
      const next = Array.from(new Set([
        ...initial.filter(id => membershipIds.includes(id)),
        ...membershipIds.filter(id => !initial.includes(id)),
      ]));
      // Skip no-op calls to reduce backend traffic
      const same =
        next.length === initial.length &&
        next.every(id => initial.includes(id));
      if (same) return;
      if (onAssign) {
        onAssign(j.id, next);
      } else {
        await updateRecipeCollections(j.id, next);
      }
    });
    await Promise.all(promises);

    onUpdated?.();
    onClose();
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Drawer>
        <Drawer.Backdrop isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} className="!z-[100]">
          <Drawer.Content placement="bottom" className="!z-[100]">
            <Drawer.Dialog className="relative !bg-white dark:!bg-gray-900 max-h-[85vh] flex flex-col pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))]">
              <Drawer.Handle />

              {/* Header */}
              <Drawer.Header className="pb-3">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                      <Folder className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <Drawer.Heading className="text-base font-bold">
                    {mode === 'assign'
                      ? (job
                        ? t('catalog.assignCollectionsTitle') || 'Sammlungen zuweisen'
                        : (membershipIds.length > 0
                          ? (t('catalog.manageBulkCollectionsTitle') || 'Sammlungen verwalten')
                          : (t('catalog.bulkAddToCollection') || 'Zu Sammlung hinzufügen')))
                      : mode === 'manage'
                      ? t('catalog.manageCollections') || 'Sammlungen verwalten'
                      : mode === 'create'
                      ? t('catalog.addCollection') || 'Neue Sammlung'
                      : t('catalog.editCollection') || 'Sammlung bearbeiten'}
                  </Drawer.Heading>
                  </div>
                  {(mode === 'create' || mode === 'edit' || mode === 'manage') && (
                    <Button
                      isIconOnly
                      variant="tertiary"
                      className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-gray-500"
                      onPress={onClose}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Drawer.Header>

              {/* Body */}
              <Drawer.Body className="overflow-y-auto py-4 flex-1">
                {formError && (
                  <div className="mb-3 px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/10">
                    {formError}
                  </div>
                )}
                {mode === 'assign' && !job && initialMode !== 'create' && initialMode !== 'manage' && collections.length > 0 && (
                  <div className="mb-3 px-3.5 py-2.5 text-[11px] leading-snug rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/15">
                    {language === 'de'
                      ? '1. Rezept auswählen (lange drücken) · 2. Sammlung wählen · 3. Häkchen setzen oder entfernen.'
                      : '1. Select a recipe (long-press) · 2. Pick a collection · 3. Tick or untick to add or remove.'}
                  </div>
                )}

                {mode === 'assign' ? (
                  <div className="flex flex-col gap-2.5">
                    {collections.length === 0 ? (
                      <div className="text-center py-8 text-xs text-gray-400 dark:text-gray-500">
                        {t('catalog.noCollections') || 'Keine Sammlungen erstellt'}
                      </div>
                    ) : (
                      collections.map(col => {
                        const isChecked = membershipIds.includes(col.id);
                        // In bulk mode, count how many selected recipes currently have this collection
                        // so we can show an indeterminate (partial) state.
                        let partialCount = 0;
                        let totalBulk = 0;
                        if (!job) {
                          totalBulk = selectedJobs.length;
                          if (totalBulk > 0) {
                            partialCount = selectedJobs.filter(j =>
                              (bulkInitialMap[j.id] ?? j.collectionIds ?? []).includes(col.id)
                            ).length;
                          }
                        }
                        const isPartial = !job && partialCount > 0 && partialCount < totalBulk;
                        return (
                          <div
                            key={col.id}
                            onClick={() => handleToggleMembership(col.id)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between select-none active:scale-[0.99] ${
                              isChecked || isPartial
                                ? 'bg-emerald-500/5 border-emerald-500 dark:bg-emerald-500/10'
                                : 'bg-black/5 dark:bg-white/5 border-transparent hover:border-black/10 dark:hover:border-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {col.emoji && <span className="text-xl">{col.emoji}</span>}
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                  {col.name}
                                </span>
                                {isPartial && (
                                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    {language === 'de'
                                      ? `${partialCount} von ${totalBulk} Rezepten`
                                      : `${partialCount} of ${totalBulk} recipes`}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                isIconOnly
                                variant="tertiary"
                                className="w-8 h-8 rounded-xl text-gray-400 hover:text-emerald-500 hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditOpen(col);
                                }}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                                isChecked ? 'bg-emerald-500 border-emerald-500'
                                  : isPartial ? 'bg-emerald-500/70 border-emerald-500'
                                  : 'border-black/20 dark:border-white/20'
                              }`}>
                                {isChecked && <Check className="w-3.5 h-3.5 text-white" />}
                                {isPartial && (
                                  <span className="block w-2.5 h-0.5 bg-white rounded-full" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}

                    <Button
                      variant="outline"
                      className="mt-2 py-3.5 rounded-2xl border border-dashed border-emerald-500/40 bg-transparent hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2 font-bold text-xs shrink-0 shadow-none"
                      onPress={handleCreateOpen}
                    >
                      <Plus className="w-4 h-4" />
                      {t('catalog.addCollection') || 'Neue Sammlung'}
                    </Button>
                  </div>
                ) : mode === 'manage' ? (
                  <div className="flex flex-col gap-2.5">
                    {collections.length === 0 ? (
                      <div className="text-center py-8 text-xs text-gray-400 dark:text-gray-500">
                        {t('catalog.noCollections') || 'Keine Sammlungen erstellt'}
                      </div>
                    ) : (
                      collections.map(col => (
                        <div
                          key={col.id}
                          className="p-3.5 rounded-2xl border border-transparent bg-black/5 dark:bg-white/5 hover:border-black/10 dark:hover:border-white/10 transition-all flex items-center justify-between select-none"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {col.emoji && <span className="text-xl">{col.emoji}</span>}
                            <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                              {col.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              isIconOnly
                              variant="tertiary"
                              className="w-8 h-8 rounded-xl text-gray-400 hover:text-emerald-500 hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
                              onPress={() => handleEditOpen(col)}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              isIconOnly
                              variant="tertiary"
                              className="w-8 h-8 rounded-xl text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 shrink-0"
                              onPress={() => handleDirectDelete(col)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}

                    <Button
                      variant="outline"
                      className="mt-2 py-3.5 rounded-2xl border border-dashed border-emerald-500/40 bg-transparent hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2 font-bold text-xs shrink-0 shadow-none"
                      onPress={handleCreateOpen}
                    >
                      <Plus className="w-4 h-4" />
                      {t('catalog.addCollection') || 'Neue Sammlung'}
                    </Button>
                  </div>
                ) : (
                  /* Create / Edit Form */
                  <div className="flex flex-col gap-4">
                    {/* Collection Name Input */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">
                        {t('catalog.collectionName') || 'Name der Sammlung'}
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('catalog.collectionPlaceholder') || 'z.B. Sonntagsbrunch'}
                        className="w-full bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all shadow-xs"
                      />
                    </div>

                    {/* Emoji Select Grid */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">
                        {t('catalog.collectionEmoji') || 'Symbol / Emoji'}
                      </label>
                      <div className="flex flex-wrap gap-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedEmoji('')}
                          className={`w-11 h-11 text-lg flex items-center justify-center rounded-2xl transition-all active:scale-90 border border-dashed cursor-pointer ${
                            !selectedEmoji
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                              : 'bg-black/5 dark:bg-white/5 border-black/20 dark:border-white/20 hover:border-black/35 dark:hover:border-white/35 text-gray-400 dark:text-gray-500'
                          }`}
                          title={t('dialog.cancelDefault') || 'Keins'}
                        >
                          ∅
                        </button>
                        {EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setSelectedEmoji(emoji)}
                            className={`w-11 h-11 text-xl flex items-center justify-center rounded-2xl transition-all active:scale-90 border cursor-pointer ${
                              selectedEmoji === emoji
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                                : 'bg-black/5 dark:bg-white/5 border-transparent hover:border-black/10 dark:hover:border-white/10'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </Drawer.Body>

              {/* Footer */}
              <Drawer.Footer className="pt-3">
                {mode === 'assign' || mode === 'manage' ? (
                  <div className="flex gap-3 w-full">
                    <Button
                      variant="tertiary"
                      className="flex-1 py-3 rounded-xl text-sm font-semibold"
                      onPress={onClose}
                    >
                      {t('app.dialog.deleteRecipe.cancel') || 'Abbrechen'}
                    </Button>
                    <Button
                      className="flex-[2] py-3 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white shadow-md shadow-emerald-500/25 active:scale-[0.98] transition-all"
                      onPress={mode === 'manage' ? onClose : handleConfirmAssignment}
                      isDisabled={mode === 'assign' && collections.length === 0}
                    >
                      {mode === 'manage'
                        ? (t('catalog.closeButton') || (language === 'de' ? 'Schließen' : 'Close'))
                        : (t('recipe.save') || 'Speichern')}
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-3 w-full">
                    {mode === 'edit' && (
                      <Button
                        variant="tertiary"
                        className="py-3 rounded-xl text-sm font-semibold text-rose-500 hover:bg-rose-500/10"
                        onPress={handleDeleteCollection}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="tertiary"
                      className="flex-1 py-3 rounded-xl text-sm font-semibold"
                      onPress={onClose}
                    >
                      {t('app.dialog.deleteRecipe.cancel') || 'Abbrechen'}
                    </Button>
                    <Button
                      className="flex-[2] py-3 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white shadow-md shadow-emerald-500/25 active:scale-[0.98] transition-all"
                      onPress={handleSaveCollection}
                    >
                      {t('recipe.save') || 'Speichern'}
                    </Button>
                  </div>
                )}
              </Drawer.Footer>

              {/* Inline delete confirmation — rendered INSIDE the drawer so it stays
                  within the drawer's modal interaction scope and is clickable. */}
              {pendingDelete && (
                <div className="absolute inset-0 z-10 flex items-end justify-center rounded-[inherit] bg-black/40 backdrop-blur-[2px] p-4">
                  <div className="w-full rounded-2xl border-none bg-white dark:bg-gray-900 shadow-2xl p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex gap-3.5 items-start">
                      <div className="p-2.5 rounded-xl border-none flex-shrink-0 flex items-center justify-center bg-rose-500/10">
                        <Trash2 className="w-5 h-5 text-rose-500" />
                      </div>
                      <div className="flex flex-col gap-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                          {t('catalog.deleteCollection') || 'Sammlung löschen'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                          {language === 'de'
                            ? `Soll „${pendingDelete.name}" wirklich gelöscht werden?`
                            : `Really delete "${pendingDelete.name}"?`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 w-full">
                      <Button
                        variant="tertiary"
                        className="flex-1 py-3 rounded-xl text-sm font-semibold"
                        onPress={() => setPendingDelete(null)}
                        isDisabled={isDeleting}
                      >
                        {t('app.dialog.deleteRecipe.cancel') || 'Abbrechen'}
                      </Button>
                      <Button
                        className="flex-1 py-3 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-500/25 active:scale-[0.98] transition-all"
                        onPress={handleConfirmDirectDelete}
                        isDisabled={isDeleting}
                      >
                        {t('app.dialog.deleteRecipe.confirm') || 'Löschen'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
}
