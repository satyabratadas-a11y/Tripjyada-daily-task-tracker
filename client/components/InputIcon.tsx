export default function InputIcon({
  icon,
  variant = 'default',
}: {
  icon: string;
  variant?: 'default' | 'glass';
}) {
  return (
    <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center">
      <i className={`${icon} text-sm ${variant === 'glass' ? 'text-white/40' : 'text-gray-400'}`} />
    </span>
  );
}
