/**
 * DAG Node state animator — manages visual transitions for pipeline nodes.
 * Uses Stripe-inspired color palette.
 */

const STATE_COLORS = {
  idle: '#425466',
  skipped: '#333a45',
  running: '#ffbb33',
  done: '#00d4aa',
  failed: '#ff4d5a',
};

const STATE_GLOW = {
  idle: 'none',
  skipped: 'none',
  running: '0 0 12px rgba(255,187,51,0.2), 0 0 24px rgba(255,187,51,0.05)',
  done: '0 0 12px rgba(0,212,170,0.15)',
  failed: '0 0 12px rgba(255,77,90,0.2)',
};

export function getNodeColor(state) {
  return STATE_COLORS[state] || STATE_COLORS.idle;
}

export function getNodeGlow(state) {
  return STATE_GLOW[state] || STATE_GLOW.idle;
}

/**
 * Create a timed sequence to animate nodes for visual feedback.
 * @param {function} callback - (nodeId, state) => void
 * @returns {function} cleanup function
 */
export function startDAGAnimation(callback) {
  const sequence = [
    { node: 'goal', state: 'done', delay: 0 },
    { node: 'orchestrator', state: 'running', delay: 500 },
    { node: 'orchestrator', state: 'done', delay: 2000 },
    { node: 'research', state: 'running', delay: 2500 },
    { node: 'analysis', state: 'running', delay: 8000 },
    { node: 'research', state: 'done', delay: 12000 },
    { node: 'writer', state: 'running', delay: 14000 },
    { node: 'analysis', state: 'done', delay: 18000 },
    { node: 'writer', state: 'done', delay: 25000 },
    { node: 'devil', state: 'running', delay: 26000 },
    { node: 'devil', state: 'done', delay: 35000 },
    { node: 'output', state: 'running', delay: 36000 },
    { node: 'output', state: 'done', delay: 40000 },
  ];

  const timers = sequence.map(step =>
    setTimeout(() => callback(step.node, step.state), step.delay)
  );

  return () => timers.forEach(clearTimeout);
}
