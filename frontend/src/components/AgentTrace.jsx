import { useRef, useEffect } from 'react';

const AGENT_COLORS = {
  research: 'var(--color-cyan)',
  analysis: 'var(--color-success)',
  writer: 'var(--color-primary)',
  competitor: 'var(--color-primary)',
  news_trend: 'var(--color-success)',
  financial_sizing: 'var(--color-primary)',
  regulatory: 'var(--color-primary)',
  fact_check: 'var(--color-error)',
  confidence: 'var(--color-success)',
  devil: 'var(--color-warning)',
  orchestrator: 'var(--color-success)',
  output: 'var(--color-primary)',
};

const EVENT_CONFIG = {
  task_decomposed: { icon: '>', color: 'var(--color-primary)', label: 'PLAN' },
  agent_started:   { icon: '>', color: 'var(--color-warning)', label: 'RUN ' },
  tool_called:     { icon: '>', color: 'var(--color-success)', label: 'TOOL' },
  agent_done:      { icon: '>', color: 'var(--color-success)', label: 'DONE' },
  feedback:        { icon: '>', color: 'var(--color-primary)', label: 'EVAL' },
  devil:           { icon: '>', color: 'var(--color-warning)', label: 'DEBG' },
  complete:        { icon: '>', color: 'var(--color-primary)', label: 'COMP' },
  error:           { icon: '!', color: 'var(--color-error)', label: 'FAIL' },
};

function formatMsg(ev) {
  try {
    const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : (ev.data || {});
    if (ev.type === 'task_decomposed') {
      if (data.status === 'done') return `SPAWNING ${data.specialist_agents?.length || 0} SPECIALISTS`;
      return 'DECOMPOSING GOAL INTO SUBTASKS...';
    }
    if (ev.type === 'agent_started') return `${data.agent} ACTIVATED`;
    if (ev.type === 'tool_called')   return `${data.agent} -> ${data.tool}`;
    if (ev.type === 'agent_done')    return `${data.agent} COMPLETED ANALYSIS`;
    if (ev.type === 'feedback')      return data.status === 'done'
      ? `CONFIDENCE: ${Math.round((data.confidence?.overall || 0) * 100)}%`
      : 'SCORING PIPELINE QUALITY...';
    if (ev.type === 'devil')         return data.status === 'done'
      ? 'ADVERSARIAL CHALLENGES IDENTIFIED'
      : "RUNNING DEVIL'S ADVOCATE...";
    if (ev.type === 'complete')      return 'PIPELINE EXECUTION COMPLETE';
    if (ev.type === 'error')         return `ERROR: ${data.error || 'UNKNOWN'}`;
    return String(ev.type).toUpperCase();
  } catch { return String(ev.type).toUpperCase(); }
}

function getAgent(ev) {
  try {
    const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : (ev.data || {});
    return data.agent || null;
  } catch { return null; }
}

export default function AgentTrace({ events }) {
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [events]);

  if (!events || events.length === 0) return null;

  const last = events[events.length - 1];
  const isComplete = last?.type === 'complete';
  const currentAgent = !isComplete ? getAgent(last) : null;

  return (
    <div className="w-full h-full flex flex-col bg-[var(--color-on-surface)] overflow-hidden">
      
      {/* Log entries */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-[var(--color-dark-border)] scrollbar-track-transparent">
        {events.map((ev, i) => {
          const cfg = EVENT_CONFIG[ev.type] || { icon: '>', color: 'var(--color-surface)', label: 'LOG ' };
          const agent = getAgent(ev);
          const agentColor = agent ? (AGENT_COLORS[agent] || 'var(--color-surface)') : cfg.color;
          const isLast = i === events.length - 1;
          
          return (
            <div key={i} className={`flex items-start py-1 transition-all ${isLast && !isComplete ? 'pl-2 border-l-2 border-[var(--color-primary)]' : 'pl-2 border-l-2 border-transparent'}`}>
              <span className="text-[10px] text-zinc-500 font-mono w-20 shrink-0 pt-0.5">
                {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }) : `${String(Math.floor(i / 60)).padStart(2,'0')}:${String(i % 60).padStart(2,'0')}`}
              </span>
              
              <span className="text-[9px] font-mono font-bold tracking-wider rounded-sm px-1.5 py-0.5 w-10 text-center shrink-0 mr-3"
                style={{ color: 'var(--color-on-surface)', background: cfg.color }}>
                {cfg.label}
              </span>
              
              <div className="flex-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span style={{ color: cfg.color, fontSize: 10, fontFamily: 'monospace' }}>{cfg.icon}</span>
                
                {agent && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 border"
                    style={{ color: agentColor, borderColor: agentColor, background: `${agentColor}15` }}>
                    {agent.toUpperCase()}
                  </span>
                )}
                
                <span className={`text-[11px] font-mono leading-tight ${isLast ? 'text-[var(--color-surface)] font-bold' : 'text-[var(--color-on-dark-muted)]'}`}>
                  {formatMsg(ev)}
                </span>
                
                {isLast && !isComplete && (
                  <span className="text-[var(--color-primary)] animate-pulse">█</span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Status bar */}
      <div className="border-t-2 border-dashed border-[var(--color-dark-border)] p-2 px-4 flex items-center justify-between text-[var(--color-primary)] font-mono text-[10px] font-bold uppercase tracking-widest bg-[var(--color-on-surface)] shrink-0">
        <span className="text-[var(--color-on-dark-muted)]">
          [{events.length}] EVENTS
        </span>
        {currentAgent && (
          <span style={{ color: AGENT_COLORS[currentAgent] || 'var(--color-primary)' }}>
            {currentAgent} PROCESSING...
          </span>
        )}
        {isComplete && (
          <span className="text-[var(--color-success)]">
            ✓ HALT. SUCCESS.
          </span>
        )}
      </div>
    </div>
  );
}