export interface CopilotSuggestion {
  label: string;
  type: 'prompt' | 'timer';
  payload: string;
}

const SUGGESTION_REGEX = /\[(?:suggest:\s*)?([^\]]+)\](?:\s*\((?:(prompt|timer):\s*)?([^)]+)\))?/gi;

export function parseSuggestions(rawText: string): { cleanText: string; suggestions: CopilotSuggestion[] } {
  if (!rawText) return { cleanText: '', suggestions: [] };
  const suggestions: CopilotSuggestion[] = [];
  const cleanText = rawText
    .replace(SUGGESTION_REGEX, (_, rawLabel, rawType, rawPayload) => {
      const trimmedLabel = String(rawLabel || '').trim();
      const typeStr = (rawType || '').toLowerCase();
      const isTimer = typeStr === 'timer' || trimmedLabel.toLowerCase().includes('timer');
      const trimmedPayload = String(rawPayload || trimmedLabel).trim();

      if (trimmedLabel) {
        suggestions.push({
          label: trimmedLabel,
          type: isTimer ? 'timer' : 'prompt',
          payload: trimmedPayload || trimmedLabel,
        });
      }
      return '';
    })
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();

  return { cleanText, suggestions };
}
