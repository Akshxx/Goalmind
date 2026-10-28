import { useMemo } from 'react';

// Node definitions with fixed SVG canvas positions
const NODES = [
  { id: 'goal',             x: 340, y: 30,  label: 'Goal Input',   layer: 'input'   },
  { id: 'orchestrator',     x: 340, y: 115, label: 'Orchestrator', layer: 'control' },
  { id: 'competitor',       x: 55,  y: 220, label: 'Competitor',   layer: 'gather'  },
  { id: 'news_trend',       x: 185, y: 220, label: 'News & Trend', layer: 'gather'  },
  { id: 'financial_sizing', x: 340, y: 220, label: 'Financial',    layer: 'gather'  },
  { id: 'regulatory',       x: 490, y: 220, label: 'Regulatory',   layer: 'gather'  },
  { id: 'research',         x: 618, y: 220, label: 'Research',     layer: 'gather'  },
  { id: 'analysis',         x: 220, y: 335, label: 'Analysis',     layer: 'synth'   },
  { id: 'writer',           x: 460, y: 335, label: 'Writer',       layer: 'synth'   },
  { id: 'fact_check',       x: 140, y: 450, label: 'Fact-Check',   layer: 'verify'  },
  { id: 'confidence',       x: 340, y: 450, label: 'Confidence',   layer: 'verify'  },
  { id: 'devil',            x: 540, y: 450, label: "Devil's Adv.", layer: 'verify'  },
  { id: 'output',           x: 340, y: 555, label: 'Report Ready', layer: 'output'  },
];

const EDGES = [
  ['goal','orchestrator'],
  ['orchestrator','competitor'], ['orchestrator','news_trend'],
  ['orchestrator','financial_sizing'], ['orchestrator','regulatory'], ['orchestrator','research'],
  ['competitor','analysis'], ['news_trend','analysis'], ['financial_sizing','analysis'],
  ['regulatory','analysis'], ['research','analysis'], ['analysis','writer'],
  ['writer','fact_check'], ['writer','confidence'], ['writer','devil'],
  ['fact_check','output'], ['confidence','output'], ['devil','output'],
];

// Layer colors using GoalMind brand palette (CSS variables will be used via inline styles)
const LAYER_HUES = {
  input: 'var(--color-primary)',
  control: 'var(--color-success)',
  gather: 'var(--color-surface-elevated)',
  synth: 'var(--color-surface)',
  verify: 'var(--color-warning)',
  output: 'var(--color-primary)',
};

function nodeById(id) { return NODES.find(n => n.id === id); }

function EdgePath({ from, to, active }) {
  const f = nodeById(from);
  const t = nodeById(to);
  if (!f || !t) return null;
  const mx = (f.x + t.x) / 2;
  const my = (f.y + t.y) / 2;
  const d = `M ${f.x} ${f.y} Q ${mx} ${my} ${t.x} ${t.y}`;
  // Use CSS variable for edge color
  const activeColor = 'var(--color-on-surface)';
  const inactiveColor = 'rgba(17, 17, 17, 0.15)';
  return (
    <g>
      {active && (
        <path d={d} stroke={activeColor} strokeWidth="2" fill="none" opacity="0.4" strokeDasharray="6 6">
          <animate attributeName="stroke-dashoffset" from="120" to="0" dur="2s" repeatCount="indefinite"/>
        </path>
      )}
      <path d={d} stroke={active ? activeColor : inactiveColor} strokeWidth={active ? "3" : "1.5"} fill="none" opacity={active ? 1 : 0.4}/>
      {active && (
        <rect x="-4" y="-4" width="8" height="8" fill="var(--color-primary)" stroke="var(--color-on-surface)" strokeWidth="2">
          <animateMotion dur="1.8s" repeatCount="indefinite" path={d}/>
        </rect>
      )}
    </g>
  );
}

function NodeCard({ node, state }) {
  const isRunning = state === 'running';
  const isDone    = state === 'done';
  const isSkipped = state === 'skipped';
  const isFailed  = state === 'failed';
  
  const bgColor = isSkipped ? 'var(--color-border)' : LAYER_HUES[node.layer];
  const strokeColor = isSkipped ? 'rgba(17,17,17,0.3)' : 'var(--color-on-surface)';
  const textColor = isSkipped ? 'rgba(17,17,17,0.5)' : 'var(--color-on-surface)';
  
  const W = 72, H = 50;

  return (
    <g transform={`translate(${node.x - W / 2}, ${node.y - H / 2})`} style={{ opacity: isSkipped ? 0.6 : 1 }}>
      {/* Shadow block */}
      {!isSkipped && (
        <rect x="3" y="3" width={W} height={H} fill="var(--color-on-surface)" />
      )}
      
      {/* Main card */}
      <rect x="0" y="0" width={W} height={H}
        fill={isDone ? bgColor : isRunning ? 'var(--color-primary)' : 'var(--color-surface-elevated)'}
        stroke={strokeColor}
        strokeWidth="2"
      />
      
      {/* Status indicator square instead of circle */}
      <rect x={W - 12} y="6" width="6" height="6"
        fill={isFailed ? 'var(--color-error)' : isDone ? 'var(--color-on-surface)' : isRunning ? 'var(--color-warning)' : 'transparent'}
        stroke={isSkipped ? 'transparent' : 'var(--color-on-surface)'}
        strokeWidth="1"
        opacity={isSkipped ? 0 : 1}>
        {isRunning && <animate attributeName="fill" values="var(--color-warning);var(--color-surface);var(--color-warning)" dur="1s" repeatCount="indefinite"/>}
      </rect>

      <text x={W / 2} y="28" textAnchor="middle" fontSize="9" fontWeight="800" letterSpacing="0"
        fill={textColor} fontFamily="Inter, sans-serif" style={{ textTransform: 'uppercase' }}>
        {node.label}
      </text>
      
      <text x={W / 2} y="40" textAnchor="middle" fontSize="7" letterSpacing="0.5"
        fill={textColor} fontFamily="'Space Grotesk', monospace"
        style={{ textTransform: 'uppercase', fontWeight: 700 }}>
        [{isSkipped ? 'skip' : state || 'idle'}]
      </text>
    </g>
  );
}

export default function DAGVisualizer({ nodeStates = {} }) {
  const activeEdges = useMemo(() => {
    return new Set(
      EDGES.filter(([from, to]) =>
        (nodeStates[from] === 'done' || nodeStates[from] === 'running') &&
        nodeStates[to] !== undefined
      ).map(([f, t]) => `${f}-${t}`)
    );
  }, [nodeStates]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Subtle dotted background grid pattern for brutalist terminal vibe */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
        <defs>
          <pattern id="dag-dot-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="rgba(17,17,17,0.15)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dag-dot-grid)"/>
      </svg>

      <svg viewBox="-10 0 700 620" style={{ width: '100%', height: '100%', display: 'block', position: 'relative', zIndex: 1 }}>
        <g>
          {EDGES.map(([from, to]) => (
            <EdgePath key={`${from}-${to}`} from={from} to={to} active={activeEdges.has(`${from}-${to}`)} />
          ))}
        </g>
        <g>
          {NODES.map(node => (
            <NodeCard key={node.id} node={node} state={nodeStates[node.id] || 'idle'} />
          ))}
        </g>
      </svg>

      {/* Layer legend */}
      <div style={{
        position: 'absolute', bottom: 12, right: 12,
        display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end',
        background: 'var(--color-surface-elevated)',
        border: '2px solid var(--color-on-surface)',
        padding: '6px 10px',
        zIndex: 2,
        boxShadow: '2px 2px 0px 0px var(--color-on-surface)'
      }}>
        {Object.entries(LAYER_HUES).map(([layer, color]) => (
          <div key={layer} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, background: color, border: '1px solid var(--color-on-surface)' }}/>
            <span style={{ fontSize: 9, color: 'var(--color-on-surface)', fontFamily: '"Space Grotesk", monospace', fontWeight: 700, textTransform: 'uppercase' }}>
              {layer}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}