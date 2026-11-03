import { useMemo } from 'react';

const DAY_MS = 86400000;

function toDay(iso: string): number {
  return Math.floor(new Date(iso).getTime() / DAY_MS);
}

function fromDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function DateRangeSlider({
  minDate,
  maxDate,
  value,
  onChange,
  markDate,
  markLabel,
}: {
  minDate: string;
  maxDate: string;
  value: [string, string];
  onChange: (range: [string, string]) => void;
  markDate?: string;
  markLabel?: string;
}) {
  const minDay = toDay(minDate);
  const maxDay = toDay(maxDate);
  const span = Math.max(1, maxDay - minDay);
  const [startDay, endDay] = [toDay(value[0]), toDay(value[1])];

  const markPct = useMemo(() => {
    if (!markDate) return null;
    const d = toDay(markDate);
    if (d < minDay || d > maxDay) return null;
    return ((d - minDay) / span) * 100;
  }, [markDate, minDay, maxDay, span]);

  const startPct = ((startDay - minDay) / span) * 100;
  const endPct = ((endDay - minDay) / span) * 100;

  function setStart(day: number) {
    const clamped = Math.min(day, endDay);
    onChange([fromDay(clamped), fromDay(endDay)]);
  }
  function setEnd(day: number) {
    const clamped = Math.max(day, startDay);
    onChange([fromDay(startDay), fromDay(clamped)]);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
        <span>{formatDate(value[0])}</span>
        <span>{formatDate(value[1])}</span>
      </div>
      <div className="range-slider-track">
        <div className="range-slider-rail" />
        <div
          className="range-slider-fill"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />
        {markPct !== null && (
          <div className="range-slider-mark" style={{ left: `${markPct}%` }} title={markLabel} />
        )}
        <input
          type="range"
          min={minDay}
          max={maxDay}
          value={startDay}
          onChange={(e) => setStart(Number(e.target.value))}
          className="range-slider-input"
          aria-label="Range start"
        />
        <input
          type="range"
          min={minDay}
          max={maxDay}
          value={endDay}
          onChange={(e) => setEnd(Number(e.target.value))}
          className="range-slider-input"
          aria-label="Range end"
        />
      </div>
      {markPct !== null && markLabel && (
        <div
          style={{
            position: 'relative',
            height: '1.1rem',
            fontSize: '0.72rem',
            color: 'var(--color-primary)',
          }}
        >
          <span style={{ position: 'absolute', left: `${markPct}%`, transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
            {markLabel}
          </span>
        </div>
      )}
    </div>
  );
}
