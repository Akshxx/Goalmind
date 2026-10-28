export default function CitationList({ citations }) {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="w-full animate-fade-up mt-8 md:mt-0">
      <h2 className="text-sm font-black mb-4 flex items-center gap-2 text-[var(--color-on-surface)] uppercase tracking-widest font-mono">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-on-surface)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        Sources & Citations
      </h2>
      <div className="bg-[var(--color-surface-elevated)] border-3 border-[var(--color-on-surface)] brutalist-shadow-sm p-5">
        <div className="space-y-3">
          {citations.map((c, i) => (
            <a key={i}
               href={c.url || c}
               target="_blank"
               rel="noopener noreferrer"
               className="flex items-start gap-3 px-3 py-2 border-2 border-[var(--color-on-surface)] bg-[var(--color-surface)] text-sm font-mono font-bold
                          transition-all hover:bg-[var(--color-primary)] hover:text-[var(--color-surface)] hover:translate-x-1 group"
               style={{ color: 'var(--color-on-surface)' }}>
              <span className="text-[10px] font-black bg-[var(--color-surface-elevated)] border-2 border-[var(--color-on-surface)] px-1 py-0.5 min-w-[24px] text-center flex-shrink-0"
                    style={{ color: 'var(--color-on-surface)' }}>
                {i + 1}
              </span>
              <span className="truncate group-hover:underline underline-offset-4 mt-0.5">
                {c.title || c.url || c}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                   className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-auto mt-0.5">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}