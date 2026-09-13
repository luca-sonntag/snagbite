export interface HealthScoreColorSet {
  badgeBg: string;
  badgeText: string;
  ringStroke: string;
  pillBg: string;
  iconColor: string;
  strokeClass: string;
  solidBg: string;
  solidText: string;
  onMediaBg: string;
  onMediaText: string;
}

export function getHealthScoreColor(score: number): HealthScoreColorSet {
  if (score >= 85) {
    return {
      badgeBg: 'bg-emerald-500/15 dark:bg-emerald-500/20',
      badgeText: 'text-emerald-900 dark:text-emerald-200',
      ringStroke: '#10b981',
      pillBg: 'bg-emerald-600',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      strokeClass: 'stroke-emerald-500',
      solidBg: 'bg-emerald-600',
      solidText: 'text-white',
      onMediaBg: 'bg-emerald-950/75 dark:bg-black/75',
      onMediaText: 'text-emerald-300',
    };
  }
  if (score >= 70) {
    return {
      badgeBg: 'bg-teal-500/15 dark:bg-teal-500/20',
      badgeText: 'text-teal-900 dark:text-teal-200',
      ringStroke: '#14b8a6',
      pillBg: 'bg-teal-600',
      iconColor: 'text-teal-600 dark:text-teal-400',
      strokeClass: 'stroke-teal-500',
      solidBg: 'bg-teal-600',
      solidText: 'text-white',
      onMediaBg: 'bg-teal-950/75 dark:bg-black/75',
      onMediaText: 'text-teal-300',
    };
  }
  if (score >= 50) {
    return {
      badgeBg: 'bg-amber-500/15 dark:bg-amber-500/20',
      badgeText: 'text-amber-950 dark:text-amber-200',
      ringStroke: '#f59e0b',
      pillBg: 'bg-amber-500',
      iconColor: 'text-amber-600 dark:text-amber-400',
      strokeClass: 'stroke-amber-500',
      solidBg: 'bg-amber-500',
      solidText: 'text-slate-950 font-black',
      onMediaBg: 'bg-amber-950/75 dark:bg-black/75',
      onMediaText: 'text-amber-300',
    };
  }
  if (score >= 35) {
    return {
      badgeBg: 'bg-orange-500/15 dark:bg-orange-500/20',
      badgeText: 'text-orange-950 dark:text-orange-200',
      ringStroke: '#f97316',
      pillBg: 'bg-orange-500',
      iconColor: 'text-orange-600 dark:text-orange-400',
      strokeClass: 'stroke-orange-500',
      solidBg: 'bg-orange-500',
      solidText: 'text-white',
      onMediaBg: 'bg-orange-950/75 dark:bg-black/75',
      onMediaText: 'text-orange-300',
    };
  }
  return {
    badgeBg: 'bg-rose-500/15 dark:bg-rose-500/20',
    badgeText: 'text-rose-950 dark:text-rose-200',
    ringStroke: '#f43f5e',
    pillBg: 'bg-rose-600',
    iconColor: 'text-rose-600 dark:text-rose-400',
    strokeClass: 'stroke-rose-500',
    solidBg: 'bg-rose-600',
    solidText: 'text-white',
    onMediaBg: 'bg-rose-950/75 dark:bg-black/75',
    onMediaText: 'text-rose-300',
  };
}

export function getHealthScoreLetter(score: number): 'A' | 'B' | 'C' | 'D' | 'E' {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'E';
}
