import { EVENT_COLORS, EVENT_LABELS } from '../utils/eventHelpers';

interface BadgeProps {
  type: number;
  small?: boolean;
}

export function Badge({ type, small }: BadgeProps) {
  const c = EVENT_COLORS[type] ?? { bg: 'bg-gray-100', text: 'text-gray-600' };
  const label = EVENT_LABELS[type] ?? 'UNKNOWN';
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full whitespace-nowrap ${c.bg} ${c.text} ${
        small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      }`}
    >
      {label}
    </span>
  );
}
