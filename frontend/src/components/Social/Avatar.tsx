import { useState } from 'react';

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
}

/** Round avatar: uses the image when available, else colored initials. */
export default function Avatar({ name, avatarUrl, size = 40, className = '' }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const dim = { width: size, height: size };

  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={dim}
        onError={() => setFailed(true)}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  const hue = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div
      style={{ ...dim, backgroundColor: `hsl(${hue} 55% 45%)`, fontSize: size * 0.4 }}
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${className}`}
    >
      {initialsOf(name)}
    </div>
  );
}
