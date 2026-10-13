/**
 * ExtractionLoadingCard
 * 
 * Clean, single unified skeleton placeholder card displayed below RecipeHeader
 * during active recipe extraction (isExtracting === true).
 * Prevents visual clutter by replacing multi-section tabbed skeletons with
 * a single calm, cohesive loading card.
 */
export default function ExtractionLoadingCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-none p-5 sm:p-6 flex flex-col gap-5 animate-pulse">
      {/* Header bar placeholder */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 bg-gray-200/90 dark:bg-gray-800/90 rounded-xl" />
        <div className="h-5 w-16 bg-gray-100 dark:bg-gray-800 rounded-lg" />
      </div>

      {/* Text / intro lines */}
      <div className="flex flex-col gap-2.5">
        <div className="h-3.5 w-full bg-gray-200/80 dark:bg-gray-800/70 rounded-md" />
        <div className="h-3.5 w-4/5 bg-gray-200/80 dark:bg-gray-800/70 rounded-md" />
        <div className="h-3.5 w-3/5 bg-gray-200/80 dark:bg-gray-800/70 rounded-md" />
      </div>

      {/* Content items placeholder */}
      <div className="border-t border-gray-100/70 dark:border-gray-800/60 pt-4 flex flex-col gap-3">
        {[
          'w-36',
          'w-48',
          'w-32',
          'w-40',
        ].map((width, idx) => (
          <div key={`extract-item-skel-${idx}`} className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-700 shrink-0" />
            <div className="h-3.5 w-14 bg-gray-200 dark:bg-gray-800 rounded-md shrink-0" />
            <div className={`h-3.5 ${width} bg-gray-200 dark:bg-gray-800 rounded-md`} />
          </div>
        ))}
      </div>
    </div>
  );
}
