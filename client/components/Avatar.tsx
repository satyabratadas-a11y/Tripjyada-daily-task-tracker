import { cloudinaryThumb } from '@/lib/cloudinaryUrl';
import { API_URL } from '@/lib/api';

function initialsFor(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return initials || '?';
}

export default function Avatar({
  name,
  avatarUrl,
  size = 32,
  className = '',
}: {
  name: string;
  avatarUrl?: string;
  size?: number;
  className?: string;
}) {
  if (avatarUrl) {
    // Database avatars are served by the API. Prefix relative paths only when production uses a
    // separate API origin; blob previews and Google/legacy hosted URLs remain untouched.
    const resolvedUrl = avatarUrl.startsWith('/api/')
      ? `${API_URL.replace(/\/$/, '')}${avatarUrl}`
      : cloudinaryThumb(avatarUrl, size);

    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={resolvedUrl}
        alt={name}
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand font-semibold text-white ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4) }}
    >
      {initialsFor(name)}
    </div>
  );
}
