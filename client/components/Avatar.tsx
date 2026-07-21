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
    // Cloudinary-hosted, not a local/allow-listed domain, so next/image is more friction than
    // it's worth here — a plain img avoids next.config remotePatterns for a 32px thumbnail.
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={avatarUrl}
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
