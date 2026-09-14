import { CopilotMessageItem } from '../../RecipeDetails/RecipeCopilot/CopilotMessageItem';
import type { CopilotMessage } from '../../RecipeDetails/RecipeCopilot/types';
import { useI18n } from '../../../context/I18nContext';

export default function RecipeCopilotPreview() {
  const { t, language } = useI18n();
  const isEn = language.startsWith('en');

  const chipLabel = t('copilot.chipRecalculateNutrition');

  const sampleMessages: CopilotMessage[] = [
    {
      role: 'user',
      text: isEn ? 'Make this recipe vegan & dairy-free' : 'Mach das Rezept bitte vegan & laktosefrei',
    },
    {
      role: 'model',
      text: isEn
        ? `Done! I replaced heavy cream with oat cuisine and butter with olive oil. [suggest:${chipLabel}](prompt:${chipLabel})`
        : `Gerne! Ich habe Sahne durch Hafer-Cuisine ersetzt und Butter durch Olivenöl getauscht. [suggest:${chipLabel}](prompt:${chipLabel})`,
    },
  ];

  return (
    <div className="w-full flex flex-col gap-2.5 py-0.5 select-none">
      {sampleMessages.map((msg, idx) => (
        <CopilotMessageItem
          key={idx}
          msg={msg}
          idx={idx}
          isLatest={idx === sampleMessages.length - 1}
          isPending={false}
          onSend={() => {}}
          onLoadNewRecipe={() => {}}
        />
      ))}
    </div>
  );
}
