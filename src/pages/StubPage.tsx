export default function StubPage({ title, stage }: { title: string; stage: string }) {
  return (
    <div className="card">
      <h1>{title}</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>
        This screen is built in <strong>{stage}</strong>. The data model, storage, and backup
        system underneath it are already in place.
      </p>
    </div>
  );
}
