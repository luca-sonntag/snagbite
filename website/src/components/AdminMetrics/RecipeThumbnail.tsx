import { useState, useMemo } from 'react';
import { apiUrl } from '../../api';

interface RecipeThumbnailProps {
  imageUrl: string | null;
  title: string;
  emoji: string | null;
}

export function RecipeThumbnail({ imageUrl, title, emoji }: RecipeThumbnailProps) {
  const [failed, setFailed] = useState(false);

  const resolvedUrl = useMemo(() => {
    if (!imageUrl || imageUrl.startsWith('local:') || imageUrl.startsWith('photo:')) {
      return null;
    }
    if (imageUrl.startsWith('/')) {
      return apiUrl(imageUrl);
    }
    return imageUrl;
  }, [imageUrl]);

  if (!resolvedUrl || failed) {
    return <span className="text-base select-none">{emoji || '🍽️'}</span>;
  }

  return (
    <img
      src={resolvedUrl}
      alt={title}
      className="w-full h-full object-cover"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
