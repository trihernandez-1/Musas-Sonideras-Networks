import type { Tag } from '../types/models';
import { hashColor } from '../utils/colors';

export default function TagChip({
  tag,
  onRemove,
  size = 'md',
}: {
  tag: Tag;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}) {
  const swatch = tag.color ?? hashColor(tag.id);
  return (
    <span
      className="chip"
      style={{
        fontSize: size === 'sm' ? '0.72rem' : '0.8rem',
        padding: size === 'sm' ? '0.12em 0.55em' : undefined,
        letterSpacing: '0.02em',
      }}
    >
      <span
        aria-hidden
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: swatch,
          flexShrink: 0,
        }}
      />
      {tag.label}
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Remove tag ${tag.label}`}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            fontWeight: 600,
            padding: 0,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </span>
  );
}
