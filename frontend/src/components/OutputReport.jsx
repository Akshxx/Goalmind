import html2pdf from 'html2pdf.js';

/* ── helpers ─────────────────────────────────────── */
function parseActionSteps(text) {
  if (!text) return [];
  const byNewline = text.split(/\n+/).filter(l => l.trim().match(/^\d+\./));
  if (byNewline.length >= 2) return byNewline.map(l => l.trim());
  const steps = text.split(/(?=\d+\.\s)/).filter(s => s.trim());
  return steps.map(s => s.trim());
}

function SectionContent({ sectionKey, content }) {
  if (sectionKey === 'action_plan') {
    const steps = parseActionSteps(content);
    if (steps.length >= 2) {
      return (
        <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {steps.map((step, i) => {
            const num = step.match(/^(\d+)\./)?.[1] || String(i + 1);
            const body = step.replace(/^\d+\.\s*/, '');
            return (
              <li key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', pageBreakInside: 'avoid' }}>
                <span style={{
                  minWidth: 32, height: 32, flexShrink: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: 'var(--color-primary)', border: '2px solid var(--color-on-surface)',
                  fontWeight: 900, fontFamily: 'monospace', fontSize: 14, color: 'var(--color-surface)',
                }}>
                  {num}
                </span>
                <span style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--color-on-surface)', fontWeight: 500, paddingTop: 4 }}>
                  {body}
                </span>
              </li>
            );
          })}
        </ol>
      );
    }
  }
  return (
    <p style={{ margin: 0, fontSize: 15, lineHeight: 1.85, color: 'var(--color-on-surface)', whiteSpace: 'pre-wrap', fontWeight: 400 }}>
      {content}
    </p>
  );
}

/* ── main component ──────────────────────────────── */
export default function OutputReport({ report, citations }) {
  if (!report) return null;

  const sections = [
    { key: 'overview',                  title: 'Executive Overview' },
    { key: 'research_findings',         title: 'Research Findings' },
    { key: 'key_insights',              title: 'Key Insights' },
    { key: 'opportunity_analysis',      title: 'Opportunity Analysis' },
    { key: 'risk_challenges',           title: 'Risks & Challenges' },
    { key: 'strategic_recommendations', title: 'Strategic Recommendations' },
    { key: 'action_plan',               title: 'Action Plan' },
  ];

  const downloadPDF = () => {
    const element = document.getElementById('report-pdf-content');

    // Temporarily clean box-shadow so jsPDF renders cleaner
    const prevShadow = element.style.boxShadow;
    element.style.boxShadow = 'none';
    element.classList.remove('brutalist-shadow');

    const opt = {
      margin:      [18, 18, 18, 18],
      filename:    'GoalMind_Strategic_Report.pdf',
      image:       { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
        compress: true,
      },
      pagebreak: {
        mode: ['avoid-all', 'css', 'legacy'],
        before: '.pdf-page-before',
        avoid:  '.pdf-no-break',
      },
    };

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(() => {
        element.style.boxShadow = prevShadow;
        element.classList.add('brutalist-shadow');
      });
  };

  /* ── render ─────────────────────────────── */
  return (
    <div className="w-full animate-fade-up">

      {/* Section header + PDF button */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-black flex items-center gap-2 text-[var(--color-on-surface)] uppercase tracking-widest font-mono">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-on-surface)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>
          </svg>
          Comprehensive Report
        </h2>
        <button
          onClick={downloadPDF}
          className="text-xs px-4 py-2 font-black flex items-center gap-2 text-[var(--color-surface)] bg-[var(--color-primary)] border-3 border-[var(--color-on-surface)] uppercase tracking-widest cursor-pointer brutalist-shadow-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Print PDF
        </button>
      </div>

      {/* ── PDF-renderable report card ─────────────────────────── */}
      <div
        id="report-pdf-content"
        className="bg-[var(--color-surface-elevated)] border-3 border-[var(--color-on-surface)] brutalist-shadow mb-10"
        style={{ padding: '48px 56px', maxWidth: '860px', margin: '0 auto 40px auto' }}
      >
        {/* Report cover header */}
        <div className="pdf-no-break" style={{ textAlign: 'center', marginBottom: 48, paddingBottom: 36, borderBottom: '4px solid var(--color-on-surface)' }}>
          <h1 style={{
            fontSize: 36, fontWeight: 900, fontFamily: "'Space Grotesk', sans-serif",
            textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 1.1,
            color: 'var(--color-on-surface)', margin: '0 0 16px 0',
          }}>
            Strategic Intelligence Report
          </h1>
          <div style={{
            display: 'inline-block', background: 'var(--color-on-surface)', color: 'var(--color-surface)',
            fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase', padding: '5px 14px',
          }}>
            Generated by GoalMind Engine
          </div>
        </div>

        {/* Main report sections — each marked pdf-no-break so html2pdf won't split them */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 44 }}>
          {sections.map(({ key, title }) => {
            const content = report[key];
            if (!content) return null;
            return (
              <div key={key} className="pdf-no-break" style={{ pageBreakInside: 'avoid' }}>
                {/* Section title row */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  borderBottom: '3px solid var(--color-on-surface)', paddingBottom: 10, marginBottom: 18,
                }}>
                  {key === 'action_plan' && (
                    <span style={{
                      background: 'var(--color-primary)', border: '2px solid var(--color-on-surface)',
                      fontFamily: 'monospace', fontWeight: 900,
                      fontSize: 9, letterSpacing: '0.1em', padding: '2px 8px',
                      textTransform: 'uppercase', flexShrink: 0,
                    }}>
                      NEXT STEPS
                    </span>
                  )}
                  <h3 style={{
                    margin: 0, fontSize: 20, fontWeight: 900,
                    fontFamily: "'Space Grotesk', sans-serif",
                    textTransform: 'uppercase', letterSpacing: '-0.02em', color: 'var(--color-on-surface)',
                  }}>
                    {title}
                  </h3>
                </div>
                <SectionContent sectionKey={key} content={content} />
              </div>
            );
          })}

          {/* Citations */}
          {citations && citations.length > 0 && (
            <div className="pdf-no-break" style={{ paddingTop: 32, borderTop: '4px solid var(--color-on-surface)', pageBreakInside: 'avoid' }}>
              <h3 style={{
                margin: '0 0 20px 0', fontSize: 18, fontWeight: 900,
                fontFamily: "'Space Grotesk', sans-serif",
                textTransform: 'uppercase', color: 'var(--color-on-surface)', letterSpacing: '-0.02em',
              }}>
                Web References & Citations
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 680, margin: '0 auto' }}>
                {citations.map((cit, idx) => (
                  <a
                    key={idx} href={cit.url} target="_blank" rel="noopener noreferrer"
                    className="pdf-no-break"
                    style={{
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                      padding: '10px 12px', border: '2px solid var(--color-on-surface)',
                      background: 'var(--color-surface)', textDecoration: 'none', pageBreakInside: 'avoid',
                    }}
                  >
                    <span style={{
                      minWidth: 22, height: 22, flexShrink: 0, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      background: 'var(--color-surface-elevated)', border: '2px solid var(--color-on-surface)',
                      fontFamily: 'monospace', fontWeight: 900, fontSize: 10, color: 'var(--color-on-surface)',
                    }}>
                      {idx + 1}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-on-surface)', lineHeight: 1.3, marginBottom: 3 }}>
                        {cit.title || cit.url}
                      </span>
                      {cit.url && (
                        <span style={{
                          display: 'block', fontSize: 10, color: 'var(--color-on-surface-muted)',
                          fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {cit.url}
                        </span>
                      )}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}