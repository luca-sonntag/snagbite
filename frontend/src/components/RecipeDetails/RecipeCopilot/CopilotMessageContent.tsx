import React from 'react';

interface CopilotMessageContentProps {
  text: string;
  isAI: boolean;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-gray-950 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export const CopilotMessageContent: React.FC<CopilotMessageContentProps> = ({ text, isAI }) => {
  if (!isAI) {
    return <span>{text}</span>;
  }

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      const pText = paragraphLines.join(' ').trim();
      if (pText) {
        elements.push(
          <p key={`p-${elements.length}`} className="leading-relaxed">
            {renderInline(pText)}
          </p>
        );
      }
      paragraphLines = [];
    }
  };

  const flushList = () => {
    if (currentList) {
      const items = currentList.items;
      if (currentList.type === 'ul') {
        elements.push(
          <ul
            key={`ul-${elements.length}`}
            className="space-y-1.5 my-1 pl-4 list-disc marker:text-emerald-500/80 dark:marker:text-emerald-400/80"
          >
            {items.map((item, i) => (
              <li key={i} className="leading-relaxed pl-0.5">
                {renderInline(item)}
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol
            key={`ol-${elements.length}`}
            className="space-y-1.5 my-1 pl-4 list-decimal marker:text-emerald-600 dark:marker:text-emerald-400 font-medium"
          >
            {items.map((item, i) => (
              <li key={i} className="leading-relaxed pl-0.5 font-normal">
                {renderInline(item)}
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const bulletMatch = line.match(/^[*•-]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      if (currentList && currentList.type !== 'ul') {
        flushList();
      }
      if (!currentList) {
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    const numberedMatch = line.match(/^(\d+)[.)]\s+(.+)$/);
    if (numberedMatch) {
      flushParagraph();
      if (currentList && currentList.type !== 'ol') {
        flushList();
      }
      if (!currentList) {
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(numberedMatch[2]);
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();

  return <div className="space-y-2">{elements}</div>;
};

export default CopilotMessageContent;
