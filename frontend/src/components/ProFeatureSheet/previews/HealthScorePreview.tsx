import HealthScoreHeroCard from '../../RecipeDetails/HealthScoreHeroCard';
import { getHealthScoreColor } from '../../RecipeDetails/HealthScoreBadge';
import { useI18n } from '../../../context/I18nContext';

export default function HealthScorePreview() {
  const { language } = useI18n();
  const isEn = language.startsWith('en');
  const score = 84;
  const gradeLabel = isEn ? 'Excellent' : 'Ausgezeichnet';
  const colors = getHealthScoreColor(score);

  return (
    <div className="w-full">
      <HealthScoreHeroCard
        score={score}
        gradeLabel={gradeLabel}
        colors={colors}
        isEn={isEn}
      />
    </div>
  );
}
