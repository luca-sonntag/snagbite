import type { ReactNode } from 'react';

interface FloatingActionBarProps {
  /**
   * Children are rendered as a single row inside the pill container. Use any
   * combination of buttons, icons or custom nodes.
   */
  children: ReactNode;
  /**
   * Additional classes applied to the outermost fixed wrapper, e.g. to control
   * the vertical position (defaults to `bottom-6`).
   */
  className?: string;
  /**
   * Slides the bar out of view (downwards) without unmounting it, so it can be
   * hidden while the user scrolls through content and brought back afterwards.
   */
  isHidden?: boolean;
}

/**
 * FloatingActionBar – a generic, glassmorphism pill that anchors to the
 * bottom-center of the viewport. Used for both recipe actions and the
 * shopping-list clear buttons.
 *
 * Content composition is up to the caller; the bar just provides the
 * frosted-glass container, the rounded shell and the soft shadow. Children
 * carry their own rounding, sized to nest inside the shell's 6px padding.
 */
export default function FloatingActionBar({ children, className = '', isHidden = false }: FloatingActionBarProps) {
  const hasBottomClass = className.split(' ').some(c => c.startsWith('bottom-') || c.includes(':bottom-'));
  const defaultBottom = hasBottomClass ? '' : 'bottom-[calc(1.5rem_+_var(--safe-area-inset-bottom))]';

  // Only the translate is toggled: `animate-fade-in-up` runs with `forwards`,
  // so an opacity utility here would lose against the animation's held end
  // frame. Sliding the bar fully past the bottom edge hides it just as well —
  // the extra 8rem has to cover the largest `bottom-*` offset callers use
  // (`bottom-28` on the recipe dock), otherwise the pill keeps peeking.
  const hiddenClasses = isHidden
    ? 'translate-y-[calc(100%_+_8rem)] pointer-events-none'
    : 'translate-y-0';

  return (
    <div
      className={`fixed ${defaultBottom} left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-2rem)] animate-fade-in-up transition-transform duration-300 ease-in-out ${hiddenClasses} ${className}`}
    >
      <div className="flex items-center gap-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md p-2 rounded-[2rem] border border-black/[0.06] dark:border-white/10 shadow-[0_8px_28px_rgba(0,0,0,0.12)]">
        {children}
      </div>
    </div>
  );
}
