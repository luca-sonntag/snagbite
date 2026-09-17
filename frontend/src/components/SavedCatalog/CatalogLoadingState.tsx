/**
 * Level 1 Magazine Skeleton shown while saved recipes are loading.
 * Replicates the full Magazine layout (Greeting, Story Bubbles, 16:10 Hero Card,
 * Bento Grid, and Poster Shelf) with smooth pulsing and shimmer animations.
 */
export default function CatalogLoadingState() {
  return (
    <div className="flex flex-col gap-6 pb-6 select-none animate-fade-in" aria-busy="true" aria-label="Loading magazine">
      {/* 1. Greeting Header Skeleton */}
      <div className="flex items-start justify-between gap-4 pt-1">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="h-3 w-32 rounded-full bg-black/5 dark:bg-white/10 animate-pulse" />
          <div className="h-7 sm:h-8 w-3/4 max-w-xs rounded-xl bg-black/5 dark:bg-white/10 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 animate-pulse" />
          <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 animate-pulse" />
        </div>
      </div>

      {/* 2. Collection Story Hub Skeleton */}
      <section className="space-y-2">
        <div className="h-2.5 w-28 rounded-md bg-black/5 dark:bg-white/10 animate-pulse px-0.5" />
        <div className="flex items-start gap-3 overflow-hidden -mx-4 px-4 md:-mx-6 md:px-6 py-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] sm:w-[72px]">
              <div className="w-16 h-16 rounded-2xl bg-black/5 dark:bg-white/10 animate-pulse ring-1 ring-black/5 dark:ring-white/10 shadow-xs" />
              <div className="h-2.5 w-12 rounded bg-black/5 dark:bg-white/10 animate-pulse" />
            </div>
          ))}
        </div>
      </section>

      {/* 3. Cover Story Part 1: Hero Carousel Skeleton with Peek */}
      <section className="flex flex-col gap-2">
        <div className="flex gap-3 overflow-hidden -mx-4 px-4 sm:mx-0 sm:px-0">
          {/* Main Hero Card */}
          <div className="w-[86%] sm:w-[89%] md:w-[92%] shrink-0 aspect-[4/3] sm:aspect-[16/10] rounded-3xl bg-gray-900 shadow-[0_8px_30px_rgba(0,0,0,0.12)] relative overflow-hidden flex flex-col justify-between p-3.5 sm:p-4 animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer-sweep pointer-events-none" />
            {/* Top Badge */}
            <div className="flex items-center justify-between">
              <div className="h-5.5 w-36 rounded-full bg-amber-500/25 backdrop-blur-xs" />
              <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-xs" />
            </div>
            {/* Bottom Meta & Title */}
            <div className="space-y-2 mt-auto">
              <div className="flex items-center gap-2">
                <div className="h-4 w-16 rounded bg-emerald-500/30" />
                <div className="h-4 w-20 rounded bg-white/15" />
              </div>
              <div className="h-5 sm:h-6 w-3/4 rounded-lg bg-white/20" />
              <div className="flex items-center justify-between pt-1">
                <div className="h-3 w-20 rounded bg-white/10" />
                <div className="h-6.5 w-22 rounded-xl bg-white/25" />
              </div>
            </div>
          </div>

          {/* Peek of Next Slide */}
          <div className="w-[14%] shrink-0 aspect-[4/3] sm:aspect-[16/10] rounded-3xl bg-gray-900/60 overflow-hidden animate-pulse" />
        </div>

        {/* Pagination Dots */}
        <div className="flex items-center justify-center gap-1.5 pt-0.5">
          <div className="w-5 h-1.5 rounded-full bg-amber-500/40" />
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
        </div>
      </section>

      {/* 4. Cover Story Part 2: Bento Grid Skeleton */}
      <section className="space-y-3">
        <div className="space-y-1 px-0.5">
          <div className="h-4.5 w-44 rounded-md bg-black/5 dark:bg-white/10 animate-pulse" />
          <div className="h-3 w-32 rounded-md bg-black/5 dark:bg-white/10 animate-pulse" />
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 items-stretch">
          {/* Left: 3:4 Portrait Card */}
          <div className="w-full h-full min-h-[220px] sm:min-h-[250px] rounded-2xl bg-gray-900 shadow-sm relative overflow-hidden flex flex-col justify-end p-3 animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer-sweep pointer-events-none" />
            <div className="space-y-1.5 relative z-10">
              <div className="h-3.5 w-24 rounded bg-white/20" />
              <div className="h-4 w-36 rounded-lg bg-white/25" />
            </div>
          </div>

          {/* Right: 2 Stacked Compact Cards */}
          <div className="flex flex-col gap-2.5 sm:gap-3 justify-between h-full">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 min-h-[105px] rounded-2xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden flex animate-pulse"
              >
                <div className="w-22 sm:w-26 bg-black/5 dark:bg-white/10 shrink-0 self-stretch" />
                <div className="flex-1 p-2.5 sm:p-3 flex flex-col justify-between min-w-0">
                  <div className="h-4 w-4/5 rounded bg-black/5 dark:bg-white/10" />
                  <div className="flex items-center justify-between gap-2 mt-auto pt-2">
                    <div className="h-3 w-12 rounded bg-black/5 dark:bg-white/10" />
                    <div className="h-4 w-4 rounded-full bg-black/5 dark:bg-white/10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Library Poster Shelf Skeleton */}
      <section className="space-y-3 pt-2">
        <div className="h-4 w-36 rounded-md bg-black/5 dark:bg-white/10 animate-pulse px-0.5" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="w-full rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm ring-1 ring-black/5 dark:ring-white/10 flex flex-col animate-pulse"
            >
              <div className="w-full aspect-[4/3] bg-black/5 dark:bg-white/10" />
              <div className="p-2.5 sm:p-3 space-y-2 flex-1 flex flex-col justify-between">
                <div className="h-4 w-3/4 rounded bg-black/5 dark:bg-white/10" />
                <div className="h-3 w-1/2 rounded bg-black/5 dark:bg-white/10 mt-auto" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
