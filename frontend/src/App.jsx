import { useState, useCallback, useRef, useEffect } from 'react';
import ClarityMeter from './components/ClarityMeter';
import DAGVisualizer from './components/DAGVisualizer';
import AgentTrace from './components/AgentTrace';
import OutputReport from './components/OutputReport';
import SWOTTable from './components/SWOTTable';
import ConfidenceBar from './components/ConfidenceBar';
import DevilCards from './components/DevilCards';
import CitationList from './components/CitationList';
import HeroBackground from './components/HeroBackground';
import { runAgent, streamEvents, getResult, getClarity, getEnhancedPrompt } from './utils/api';

const TEMPLATES = [
  {
    label: 'AI Tutoring Startup',
    text: 'Analyze the market opportunity and build a 12-month go-to-market plan for an AI tutoring platform targeting K-12 students in India, focusing on personalized learning paths and adaptive assessments.',
  },
  {
    label: 'Fintech Launch',
    text: 'Research and plan a fintech product offering instant micro-loans to gig economy workers in Southeast Asia using alternative credit scoring based on transaction patterns.',
  },
  {
    label: 'Food Delivery Tier-2',
    text: 'Evaluate the viability and competitive landscape for a hyperlocal food delivery platform targeting tier-2 Indian cities with cloud kitchen partnerships and a 30-minute delivery model.',
  },
];

export default function App() {
  const [goal, setGoal] = useState('');
  const [clarity, setClarity] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [nodeStates, setNodeStates] = useState({});
  const [events, setEvents] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const clarityTimer = useRef(null);
  const suggestionsTimer = useRef(null);
  const pollTimer = useRef(null);

  /* ── Clarity debounce ─────────────────────────────────────── */
  useEffect(() => {
    if (!goal || goal.trim().length < 5) { setClarity(null); return; }
    if (clarityTimer.current) clearTimeout(clarityTimer.current);
    clarityTimer.current = setTimeout(async () => {
      try {
        const data = await getClarity(goal);
        setClarity(data);
      } catch { setClarity(null); }
    }, 600);

    if (suggestionsTimer.current) clearTimeout(suggestionsTimer.current);
    suggestionsTimer.current = setTimeout(async () => {
      try {
        const data = await getEnhancedPrompt(goal);
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
        }
      } catch { setSuggestions([]); }
    }, 1200);

    return () => {
      clearTimeout(clarityTimer.current);
      clearTimeout(suggestionsTimer.current);
    };
  }, [goal]);

  /* ── Submit ───────────────────────────────────────────────── */
  const handleSubmit = useCallback(async () => {
    if (!goal.trim() || isRunning) return;
    if (clarity && !clarity.ready) return;

    setIsRunning(true);
    setError(null);
    setResult(null);
    setEvents([]);
    setShowSuggestions(false);
    setNodeStates({ goal: 'done' });

    try {
      const { job_id } = await runAgent(goal);

      streamEvents(job_id, (eventData) => {
        // Use server timestamp if available, fallback to receipt time
        const serverTs = eventData.data?.server_timestamp;
        const timestamp = serverTs ? serverTs : new Date().toISOString();
        setEvents(prev => [...prev, { ...eventData, timestamp }]);
      });

      pollTimer.current = setInterval(async () => {
        try {
          const res = await getResult(job_id);
          if (res && (res.status === 'complete' || res.status === 'failed')) {
            clearInterval(pollTimer.current);
            setResult(res);
            setIsRunning(false);
          }
        } catch {}
      }, 1500);

    } catch (err) {
      setError(err.message || 'Pipeline failed. Check that the backend is running on port 8000.');
      setIsRunning(false);
    }

    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  }, [goal, clarity, isRunning]);

  const wordCount = goal.trim().split(/\s+/).filter(Boolean).length;
  const canRun = !isRunning && goal.trim().length > 0 && (!clarity || clarity.ready);

  /* ── Dynamic States ───────────────────────────────────────── */
  const breakdownEvent = events.find(e => e.type === 'task_decomposed' && e.data?.status === 'done');
  const activeSpecialists = breakdownEvent?.data?.specialist_agents || [];

  const agentStates = {};
  if (isRunning || result) {
    agentStates['goal'] = 'done';
    agentStates['orchestrator'] = breakdownEvent ? 'done' : 'running';

    if (breakdownEvent) {
      ['competitor', 'news_trend', 'financial_sizing', 'regulatory', 'fact_check'].forEach(sp => {
        agentStates[sp] = activeSpecialists.includes(sp) ? 'idle' : 'skipped';
      });
    }

    events.forEach(e => {
      if (e.type === 'agent_started') agentStates[e.data?.agent] = 'running';
      if (e.type === 'agent_done')    agentStates[e.data?.agent] = 'done';
      if (e.type === 'devil' && e.data?.status === 'running') agentStates['devil'] = 'running';
      if (e.type === 'devil' && e.data?.status === 'done')    agentStates['devil'] = 'done';
      if (e.type === 'feedback' && e.data?.status === 'scoring') agentStates['confidence'] = 'running';
      if (e.type === 'feedback' && e.data?.status === 'done')    agentStates['confidence'] = 'done';
      if (e.type === 'complete') agentStates['output'] = 'done';
    });
  }

  return (
    <div className="min-h-screen flex flex-col font-body bg-[var(--color-surface)] text-[var(--color-on-surface)] selection:bg-[var(--color-primary)] selection:text-white">
      
      {/* ── Top Navigation ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 w-full flex flex-row items-center justify-between border-b-4 border-[var(--color-on-surface)] px-6 py-4 bg-[var(--color-surface-elevated)]">
        <div className="text-2xl font-black tracking-tighter uppercase font-headline text-[var(--color-on-surface)]">
          GOALMIND_v1.0
        </div>
        <div className="flex flex-row items-center gap-6">
          <span className="font-mono font-bold tracking-tighter text-xs px-2 py-1 bg-[var(--color-on-surface)] text-[var(--color-surface)] hidden md:block">
            {isRunning ? 'PIPELINE_ACTIVE' : (result ? 'AUDIT_COMPLETE' : 'SYSTEM_IDLE')}
          </span>
          <button onClick={() => window.location.reload()} disabled={isRunning}
            className="bg-[var(--color-primary)] text-[var(--color-surface)] font-mono font-bold px-4 py-2 border-2 border-[var(--color-on-surface)] hover:bg-[var(--color-on-surface)] hover:text-[var(--color-primary)] transition-colors active-press brutalist-shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
            RESET_CYCLE
          </button>
        </div>
      </nav>

      {/* ── Hero / Input Section ── */}
      {!isRunning && !result && (
        <section className="relative w-full min-h-[100vh] flex flex-col items-center justify-center pt-24 pb-12 overflow-hidden border-b-4 border-[var(--color-on-surface)]">
          {/* Mountains 3D BG Component */}
          <HeroBackground />
          <div className="absolute bottom-0 left-0 w-full h-[40%] bg-gradient-to-t from-[var(--color-surface)] to-transparent pointer-events-none z-10"></div>
          
          <div className="relative z-20 w-full max-w-4xl px-6 flex flex-col items-center">
            
            <h1 className="font-headline text-5xl md:text-7xl font-black leading-[0.9] tracking-tighter uppercase text-center mb-6" style={{ textShadow: "2px 2px 0px rgba(79, 70, 229, 0.5)" }}>
              INITIALIZE <br className="hidden md:block"/> <span className="bg-[var(--color-primary)] px-2 border-y-4 border-[var(--color-on-surface)]">YOUR AGENTS</span>
            </h1>

            {/* Form Container */}
            <div className="w-full bg-[var(--color-surface-elevated)] border-3 border-[var(--color-on-surface)] brutalist-shadow p-6 mt-8 flex flex-col gap-4 relative group">
              <div className="absolute -top-3 -left-3 bg-[var(--color-on-surface)] text-[var(--color-surface)] font-mono text-xs font-bold px-2 py-1 uppercase">
                Goal_Input.exe
              </div>
              
              <textarea
                value={goal}
                onChange={(e) => { setGoal(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                disabled={isRunning}
                autoFocus
                className="w-full min-h-[120px] bg-[var(--color-surface)] border-2 border-[var(--color-on-surface)] p-4 font-mono text-sm resize-y outline-none focus:bg-[var(--color-primary)] transition-colors placeholder:text-[var(--color-on-surface-muted)]"
                placeholder="DEFINE YOUR OBJECTIVE: 'Analyze market opportunity for...'"
              />

              <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t-2 border-dashed border-[var(--color-on-surface)] pt-4 mt-2">
                <div className="font-mono text-xs font-bold w-full flex justify-between md:block md:w-auto">
                  <span>WORD_COUNT: {wordCount}</span>
                  {clarity && (
                    <span className={`ml-4 ${clarity.ready ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                      CLARITY: {clarity.score}/100 [{clarity.label}]
                    </span>
                  )}
                </div>
                
                <button
                  onClick={handleSubmit}
                  disabled={!canRun}
                  className="w-full md:w-auto bg-[var(--color-primary)] text-[var(--color-surface)] font-mono font-bold text-sm px-8 py-3 border-2 border-[var(--color-on-surface)] uppercase active-press brutalist-shadow-sm disabled:opacity-50 disabled:grayscale transition-all disabled:cursor-not-allowed"
                >
                  {isRunning ? 'PROCESSING_CYCLES...' : 'DEPLOY_LOGIC_GATE'}
                </button>
              </div>

              {/* Validation / Clarity Tooltip */}
              {clarity && !clarity.ready && (
                 <div className="bg-[var(--color-error)]/10 text-[var(--color-error)] border-2 border-[var(--color-on-surface)] p-3 font-mono text-xs font-bold animate-fade-in mt-2 flex items-center gap-2">
                   <span className="material-symbols-outlined text-[var(--color-error)]">warning</span>
                   {clarity.tip}
                 </div>
              )}
            </div>

            {/* Smart LLM Suggestions Dialog */}
            {showSuggestions && suggestions.length > 0 && !isRunning && (
              <div className="w-full animate-fade-in mt-6 bg-[var(--color-surface-elevated)] border-3 border-[var(--color-on-surface)] brutalist-shadow-sm relative">
                <div className="bg-[var(--color-on-surface)] text-[var(--color-surface)] p-2 flex justify-between items-center font-mono text-xs font-bold uppercase">
                  <span>Smart_Prompts.sys</span>
                  <button onClick={() => setShowSuggestions(false)} className="hover:text-[var(--color-primary)] px-2 text-lg leading-none cursor-pointer">×</button>
                </div>
                <div className="p-4 flex flex-col gap-3 bg-[var(--color-surface)]">
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => { setGoal(s.enhanced_prompt); setShowSuggestions(false); }}
                      className="text-left w-full border-2 border-[var(--color-on-surface)] bg-[var(--color-surface-elevated)] p-3 hover:bg-[var(--color-primary)] hover:text-[var(--color-surface)] transition-colors cursor-pointer group active-press"
                    >
                      <div className="font-bold text-sm mb-1 uppercase group-hover:underline underline-offset-2">{s.question}</div>
                      <div className="font-mono text-[10px] text-[var(--color-on-surface-muted)] leading-tight">
                        <span className="font-bold text-[var(--color-on-surface)]">PREVIEW:</span> {s.enhanced_prompt.length > 90 ? s.enhanced_prompt.slice(0, 90) + '...' : s.enhanced_prompt}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pre-fill Templates */}
            <div className="w-full flex flex-wrap gap-3 mt-8 justify-center">
              {TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => setGoal(t.text)} disabled={isRunning}
                  className="font-mono text-[10px] font-bold uppercase border-2 border-[var(--color-on-surface)] bg-[var(--color-surface-elevated)] text-[var(--color-on-surface)] px-3 py-1 hover:bg-[var(--color-on-surface)] hover:text-[var(--color-surface)] transition-colors cursor-pointer disabled:opacity-50"
                >
                  [{t.label}]
                </button>
              ))}
            </div>

            {error && (
              <div className="mt-8 bg-[var(--color-error)]/10 border-3 border-[var(--color-on-surface)] brutalist-shadow p-4 font-mono text-xs text-[var(--color-error)] w-full animate-fade-in">
                <strong className="text-[var(--color-error)] block uppercase mb-1">Fatal Error</strong>
                {error}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Pipeline View (Active execution) ── */}
      {(isRunning || result) && (
        <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-28 flex flex-col gap-12">
          
          <div className="w-full bg-[var(--color-primary)] border-3 border-[var(--color-on-surface)] py-2 overflow-hidden flex whitespace-nowrap mb-4">
            <div className="animate-marquee font-mono font-bold uppercase text-xs flex gap-12 text-[var(--color-surface)]">
                <span>🚧 SYSTEM UNDER RECURSIVE OPTIMIZATION 🚧</span>
                <span>AGENTIC FLOW ACTIVE</span>
                <span>🚧 PIPELINE EXECUTION IN PROGRESS 🚧</span>
                <span>DO NOT CLOSE TERMINAL</span>
                <span>🚧 SYSTEM UNDER RECURSIVE OPTIMIZATION 🚧</span>
                <span>AGENTIC FLOW ACTIVE</span>
            </div>
          </div>

          <section className="space-y-6">
            <div className="flex items-end justify-between border-b-4 border-[var(--color-on-surface)] pb-4">
              <h2 className="font-headline text-3xl md:text-4xl font-black uppercase tracking-tighter text-[var(--color-on-surface)]">Execution_Path</h2>
              <span className="font-mono text-xs font-bold bg-[var(--color-on-surface)] text-[var(--color-primary)] px-2 py-1 hidden sm:block">SYSTEM_ORCHESTRATOR</span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* DAG Container */}
              <div className="w-full h-[500px] bg-[var(--color-surface-elevated)] border-3 border-[var(--color-on-surface)] brutalist-shadow relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full bg-[var(--color-on-surface)] text-[var(--color-surface)] p-2 font-mono text-xs font-bold flex justify-between z-10">
                  <span>Logic_Tree.dag</span>
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 bg-[var(--color-primary)] border border-[var(--color-on-surface)]"></div>
                    <div className="w-2.5 h-2.5 bg-[var(--color-surface)] border border-[var(--color-on-surface)]"></div>
                  </div>
                </div>
                <div className="w-full h-full pt-8">
                  <DAGVisualizer nodeStates={agentStates} />
                </div>
              </div>

              {/* Logs Container */}
              <div className="w-full h-[500px] bg-[var(--color-on-surface)] border-3 border-[var(--color-on-surface)] brutalist-shadow relative overflow-hidden flex flex-col">
                <div className="w-full bg-[var(--color-surface)] text-[var(--color-on-surface)] border-b-2 border-[var(--color-on-surface)] p-2 font-mono text-xs font-bold flex justify-between z-10 shrink-0">
                  <span>Console_Trace.log</span>
                  <span className="text-[var(--color-success)] animate-pulse">REC</span>
                </div>
                <div className="flex-1 w-full overflow-hidden">
                  <AgentTrace events={events} />
                </div>
              </div>
            </div>
          </section>

          {/* ── Results Output ── */}
          {result && (
            <>
              {result.report && (
                <section className="space-y-6 mt-12 animate-fade-in" style={{ animationDelay: '200ms' }}>
                  <OutputReport report={result.report} citations={result.citations} />
                </section>
              )}

              <section className="flex flex-col items-center mt-12 animate-fade-in" style={{ animationDelay: '400ms' }}>
                {result.confidence && (
                  <div className="w-full max-w-lg">
                    <ConfidenceBar scores={result.confidence} />
                  </div>
                )}
                {result.swot && (
                  <div className="w-full max-w-lg mt-8">
                    <SWOTTable swot={result.swot} />
                  </div>
                )}
              </section>

              <section className="max-w-4xl mx-auto w-full grid grid-cols-1 gap-8 mt-8 animate-fade-in" style={{ animationDelay: '600ms' }}>
                 {result.challenges && <DevilCards challenges={result.challenges} />}
              </section>
            </>
          )}

        </main>
      )}

      {/* ── Footer ── */}
      <footer className="w-full border-t-4 border-[var(--color-on-surface)] p-8 bg-[var(--color-surface-elevated)] mt-auto z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="font-headline font-black text-xl text-[var(--color-on-surface)] uppercase tracking-tighter">
            GOALMIND SYSTEMS
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-on-surface-muted)] max-w-sm">
            © 2026 GOALMIND SYSTEMS. ALL RIGHTS RESERVED. [UNAUTHORIZED ACCESS PROHIBITED]
          </div>
        </div>
      </footer>
    </div>
  );
}