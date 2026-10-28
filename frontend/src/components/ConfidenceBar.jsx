import { useState, useEffect } from 'react';

export default function ConfidenceBar({ scores }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  if (!scores || Object.keys(scores).length === 0) return null;

  const getColor = (v) => {
    if (v >= 0.8) return 'var(--color-success)';      // Emerald
    if (v >= 0.6) return 'var(--color-primary)';      // Electric Indigo
    if (v >= 0.4) return 'var(--color-warning)';      // Amber
    return 'var(--color-error)';                      // Red
  };

  const displayKeys = ['research_score', 'analysis_score', 'writer_score'];

  return (
    <div className="w-full animate-fade-up">
      <h2 className="text-sm font-black mb-4 flex items-center gap-2 text-[var(--color-on-surface)] uppercase tracking-widest font-mono">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-on-surface)" strokeWidth="3">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        Confidence Scores
      </h2>
      <div className="bg-[var(--color-surface-elevated)] border-3 border-[var(--color-on-surface)] brutalist-shadow-sm p-6 space-y-5">
        {displayKeys.map((key) => {
          const value = scores[key];
          if (value === undefined) return null;
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold uppercase text-[var(--color-on-surface)]">{key.replace('_', ' ')}</span>
                <span className="text-xs font-mono font-black px-1 border-2 border-[var(--color-on-surface)]" style={{ background: getColor(value), color: 'var(--color-surface)' }}>
                  {(value * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full h-4 bg-[var(--color-surface)] border-2 border-[var(--color-on-surface)] overflow-hidden relative">
                <div
                  className="h-full border-r-2 border-[var(--color-on-surface)] transition-all duration-1000 ease-out terminal-grid"
                  style={{
                    width: visible ? `${value * 100}%` : '0%',
                    background: getColor(value),
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}