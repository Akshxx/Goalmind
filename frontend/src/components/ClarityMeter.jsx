import { useEffect, useState } from 'react';

export default function ClarityMeter({ score, label, tip, ready }) {
  const [animatedWidth, setAnimatedWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedWidth(score || 0), 100);
    return () => clearTimeout(timer);
  }, [score]);

  if (score === null || score === undefined) return null;

  const getBarColor = () => {
    if (score >= 85) return 'var(--color-success)';      // Emerald
    if (score >= 70) return 'var(--color-primary)';      // Electric Indigo
    if (score >= 40) return 'var(--color-warning)';      // Amber
    return 'var(--color-error)';                         // Red
  };

  const getLabelBg = () => {
    if (score >= 85) return 'var(--color-success)';
    if (score >= 70) return 'var(--color-primary)';
    if (score >= 40) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  const getLabelText = () => {
    if (score >= 70) return 'var(--color-surface)';
    return 'var(--color-surface)';
  };

  return (
    <div className="w-full mt-4 animate-fade-in relative">
      <div className="bg-[var(--color-surface-elevated)] border-3 border-[var(--color-on-surface)] brutalist-shadow-sm p-4 px-5">
        <div className="flex items-center justify-between mb-3 border-b-2 border-dashed border-[var(--color-on-surface)] pb-2">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-[var(--color-on-surface)] font-bold uppercase tracking-widest">CLARITY_SCORE</span>
            <span className="text-[10px] font-bold px-2 py-0.5 border-2 border-[var(--color-on-surface)] uppercase"
                  style={{ background: getLabelBg(), color: getLabelText() }}>
              [{label}]
            </span>
          </div>
          <span className="text-2xl font-black font-headline tracking-tighter" style={{ color: 'var(--color-on-surface)' }}>
            {score}<span className="text-xs font-mono font-bold ml-1">/100</span>
          </span>
        </div>

        <div className="w-full h-3 border-2 border-[var(--color-on-surface)] bg-[var(--color-surface)] relative overflow-hidden">
          <div
            className="h-full border-r-2 border-[var(--color-on-surface)] transition-all duration-700 ease-out terminal-grid"
            style={{ width: `${animatedWidth}%`, background: getBarColor() }}
          />
        </div>

        {tip && (
          <div className="mt-3 text-xs leading-relaxed font-mono bg-[var(--color-primary)] border-2 border-[var(--color-on-surface)] p-2 font-medium" style={{ color: 'var(--color-surface)' }}>
            <strong className="uppercase mr-2">TIP:</strong>{tip}
          </div>
        )}

        {ready && (
          <div className="mt-3 flex items-center gap-2 font-mono font-bold text-xs uppercase text-[var(--color-on-surface)]">
            <span className="inline-block w-3 h-3 border-2 border-[var(--color-on-surface)]" style={{ background: 'var(--color-success)' }} />
            PROMPT_READY
          </div>
        )}
      </div>
    </div>
  );
}