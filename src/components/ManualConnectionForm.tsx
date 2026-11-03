import { useState } from 'react';

export default function ManualConnectionForm({
  collaboratorAName,
  collaboratorBName,
  initialLabel = '',
  initialNote = '',
  initialEvidence = '',
  onSave,
  onCancel,
  onDelete,
}: {
  collaboratorAName: string;
  collaboratorBName: string;
  initialLabel?: string;
  initialNote?: string;
  initialEvidence?: string;
  onSave: (fields: { label: string; note: string; evidenceText: string }) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [label, setLabel] = useState(initialLabel);
  const [note, setNote] = useState(initialNote);
  const [evidenceText, setEvidenceText] = useState(initialEvidence);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20, 16, 17, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onCancel}
    >
      <div
        className="card"
        style={{ width: '420px', maxWidth: '90vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: '0.2rem' }}>Connection</h2>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 0, marginBottom: '1rem' }}>
          {collaboratorAName} &mdash; {collaboratorBName}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Label</label>
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. mentored by, shared sound system…"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          <div>
            <label style={labelStyle}>Evidence (optional)</label>
            <input
              value={evidenceText}
              onChange={(e) => setEvidenceText(e.target.value)}
              placeholder="e.g. interview, March 2022"
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', justifyContent: 'space-between' }}>
          <div>
            {onDelete && (
              <button type="button" className="btn danger" onClick={onDelete}>
                Delete
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn ghost" onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className="btn" onClick={() => onSave({ label, note, evidenceText })}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: '0.85rem',
  display: 'block',
  marginBottom: '0.3rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '0.5rem 0.75rem',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
};
