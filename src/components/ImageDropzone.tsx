import { useEffect, useRef, useState } from 'react';

/** Drag-drop, paste, or pick one or more screenshots. Keeps them as plain File objects
 * until the caller is ready to persist them (e.g. on form submit). */
export default function ImageDropzone({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  // Read through refs (always current, updated every render) rather than the `files`/
  // `onChange` closures directly: the paste listener below is registered once and lives
  // across renders, so without this, two paste events arriving before React re-renders in
  // between would both compute their new array from the same stale `files` snapshot and the
  // second would silently overwrite the first's screenshot instead of appending to it.
  const filesRef = useRef(files);
  filesRef.current = files;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const images: File[] = [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) images.push(file);
        }
      }
      if (images.length > 0) {
        onChangeRef.current([...filesRef.current, ...images]);
      }
    }
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const images = Array.from(list).filter((f) => f.type.startsWith('image/'));
    onChangeRef.current([...filesRef.current, ...images]);
  }

  function removeAt(index: number) {
    onChangeRef.current(filesRef.current.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        style={{
          border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? 'var(--color-surface)' : 'transparent',
        }}
      >
        <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
          Drop screenshots here, <strong>paste</strong> (Cmd/Ctrl+V), or click to choose files
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {previews.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
          {previews.map((src, i) => (
            <div key={src} style={{ position: 'relative' }}>
              <img
                src={src}
                alt={`Screenshot ${i + 1}`}
                style={{
                  width: '110px',
                  height: '140px',
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                }}
              />
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label="Remove screenshot"
                className="btn danger"
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  width: '26px',
                  height: '26px',
                  padding: 0,
                  borderRadius: '50%',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
