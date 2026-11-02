import { useEffect, useRef } from 'react';

/** A small contentEditable-based rich text field (bold, italic, lists) that stores HTML.
 * Kept deliberately simple to avoid pulling in a heavy editor dependency. */
export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = '140px',
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isFocused = useRef(false);

  // Keep the DOM in sync with external value changes (e.g. loading a different record),
  // but don't fight the user's cursor while they're actively typing.
  useEffect(() => {
    if (ref.current && !isFocused.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  function exec(command: string) {
    ref.current?.focus();
    document.execCommand(command);
    onChange(ref.current?.innerHTML ?? '');
  }

  const isEmpty = !value || value === '<br>';

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.4rem' }}>
        <ToolbarButton label="B" title="Bold" onClick={() => exec('bold')} style={{ fontWeight: 700 }} />
        <ToolbarButton label="I" title="Italic" onClick={() => exec('italic')} style={{ fontStyle: 'italic' }} />
        <ToolbarButton label="• List" title="Bullet list" onClick={() => exec('insertUnorderedList')} />
        <ToolbarButton label="1. List" title="Numbered list" onClick={() => exec('insertOrderedList')} />
      </div>
      <div style={{ position: 'relative' }}>
        {isEmpty && placeholder && (
          <span
            style={{
              position: 'absolute',
              top: '0.6rem',
              left: '0.75rem',
              color: 'var(--color-text-muted)',
              pointerEvents: 'none',
            }}
          >
            {placeholder}
          </span>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => (isFocused.current = true)}
          onBlur={() => {
            isFocused.current = false;
          }}
          onInput={() => onChange(ref.current?.innerHTML ?? '')}
          style={{
            minHeight,
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.6rem 0.75rem',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            outline: 'none',
            lineHeight: 1.5,
          }}
        />
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  title,
  onClick,
  style,
}: {
  label: string;
  title: string;
  onClick: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      title={title}
      // Keep focus in the editable area so execCommand applies to the right selection.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="btn ghost"
      style={{ padding: '0.2em 0.6em', fontSize: '0.85rem', ...style }}
    >
      {label}
    </button>
  );
}
