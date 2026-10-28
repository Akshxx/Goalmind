export default function DevilCards({ challenges }) {
  if (!challenges || challenges.length === 0) return null;

  const getSeverityStyle = (severity) => {
    const s = (severity || '').toLowerCase();
    if (s === 'high' || s === 'critical')
      return { bg: 'var(--color-error)', border: 'var(--color-on-surface)', color: 'var(--color-surface)', label: 'High' };
    if (s === 'medium')
      return { bg: 'var(--color-warning)', border: 'var(--color-on-surface)', color: 'var(--color-surface)', label: 'Medium' };
    return { bg: 'var(--color-success)', border: 'var(--color-on-surface)', color: 'var(--color-surface)', label: 'Low' };
  };

  return (
    <div className="w-full animate-fade-up mt-8 md:mt-0">
      <h2 className="text-sm font-black mb-4 flex items-center gap-2 text-[var(--color-on-surface)] uppercase tracking-widest font-mono">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-on-surface)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Devil's Advocate Challenges
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {challenges.map((ch, i) => {
          const sev = getSeverityStyle(ch.severity);
          return (
            <div key={i}
                 className="p-5 border-3 brutalist-shadow-sm transition-transform active:translate-x-1 active:translate-y-1"
                 style={{ background: sev.bg, borderColor: sev.border, animationDelay: `${i * 100}ms` }}>
              <div className="flex items-start justify-between mb-3 border-b-2 border-[var(--color-on-surface)] pb-2">
                <h3 className="text-sm font-black text-[var(--color-surface)] uppercase tracking-tight">{ch.title || `Challenge ${i + 1}`}</h3>
                <span className="text-[10px] px-2 py-0.5 border-2 font-black uppercase tracking-widest"
                      style={{ color: sev.color, borderColor: sev.color, background: 'var(--color-surface-elevated)' }}>
                  {sev.label}
                </span>
              </div>
              <p className="text-sm font-bold text-[var(--color-surface)] leading-relaxed font-mono">{ch.description || ch.challenge}</p>
              {ch.recommendation && (
                <div className="mt-3 p-2 border-2 border-[var(--color-on-surface)] bg-[var(--color-surface-elevated)] text-xs font-mono font-bold text-[var(--color-surface)]">
                  <span className="uppercase tracking-widest block mb-1">» MITIGATION:</span>
                  {ch.recommendation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}