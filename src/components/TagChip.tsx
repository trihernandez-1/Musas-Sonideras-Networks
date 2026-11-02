import type { Tag } from '../types/models';
import { contrastText, hashColor } from '../utils/colors';

export default function TagChip({
  tag,
  onRemove,
  size = 'md',
}: {
  tag: Tag;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}) {
  const bg = tag.color ?? hashColor(tag.id);
  const fg = contrastText(bg);
  return (
    <span
      className="chip"
      style={{
        background: bg,
        color: fg,
        fontSize: size === 'sm' ? '0.75rem' : '0.85rem',
        padding: size === 'sm' ? '0.1em 0.6em' : undefined,
      }}
    >
      {tag.label}
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Remove tag ${tag.label}`}
          style={{
            background: 'transparent',
            border: 'none',
            color: fg,
            cursor: 'pointer',
            fontWeight: 700,
            padding: 0,
            lineHeight: 1,
            opacity: 0.8,
          }}
        >
          ×
        </button>
      )}
    </span>
  );
}
