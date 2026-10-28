const COLORS = {
  strength: { bg: 'var(--color-success)', border: 'var(--color-on-surface)', text: 'var(--color-surface)', label: 'Strengths' },
  weakness: { bg: 'var(--color-warning)', border: 'var(--color-on-surface)', text: 'var(--color-surface)', label: 'Weaknesses' },
  opportunity: { bg: 'var(--color-cyan)', border: 'var(--color-on-surface)', text: 'var(--color-surface)', label: 'Opportunities' },
  threat: { bg: 'var(--color-error)', border: 'var(--color-on-surface)', text: 'var(--color-surface)', label: 'Threats' },
};

export default function SWOTTable({ swot }) {
  if (!swot) return null;

  const quadrants = [
    { key: 'strengths', type: 'strength', items: swot.strengths },
    { key: 'weaknesses', type: 'weakness', items: swot.weaknesses },
    { key: 'opportunities', type: 'opportunity', items: swot.opportunities },
    { key: 'threats', type: 'threat', items: swot.threats },
  ];

  return (
    <div className="w-full animate-fade-up mt-8 md:mt-0">
      <h2 className="text-sm font-black mb-4 flex items-center gap-2 text-[var(--color-on-surface)] uppercase tracking-widest font-mono">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-on-surface)" strokeWidth="3"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        SWOT Analysis
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quadrants.map(({ key, type, items }) => {
          const c = COLORS[type];
          if (!items || items.length === 0) return null;
          return (
            <div key={key} className="p-5 border-3 brutalist-shadow-sm"
                 style={{ background: c.bg, borderColor: c.border }}>
              <h3 className="text-xs font-black uppercase tracking-widest mb-3 border-b-2 border-[var(--color-on-surface)] pb-2"
                  style={{ color: c.text }}>
                {c.label}
              </h3>
              <ul className="space-y-2">
                {items.map((item, i) => (
                  <li key={i} className="text-sm font-mono flex items-start gap-2 leading-relaxed font-semibold" style={{ color: c.text }}>
                    <span className="mt-1.5 flex-shrink-0 text-lg leading-none font-bold">»</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}