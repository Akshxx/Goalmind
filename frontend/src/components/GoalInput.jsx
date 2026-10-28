import { useState, useRef, useEffect } from 'react';

const TEMPLATES = [
  { label: '🚀 AI Tutoring Startup', goal: 'Analyze my startup idea for an AI tutoring app that uses personalized learning paths and adaptive assessments for K-12 students' },
  { label: '📱 Fintech Launch', goal: 'Plan a product launch for a fintech mobile app that offers instant micro-loans and financial literacy tools for young professionals' },
  { label: '🍕 Food Delivery Tier-2', goal: 'Evaluate this business proposal: food delivery platform for tier-2 and tier-3 cities in India with focus on local cuisine and affordable pricing' },
];

export default function GoalInput({ onSubmit, disabled, clarityScore }) {
  const [goal, setGoal] = useState('');
  const textareaRef = useRef(null);

  const isReady = clarityScore?.ready ?? false;
  const canSubmit = goal.trim().length >= 5 && isReady && !disabled;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [goal]);

  const handleSubmit = () => {
    if (canSubmit) onSubmit(goal);
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-slide-up">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-3 tracking-tight">
          <span className="text-glow-cyan" style={{ color: '#00f5d4' }}>Goal</span>
          <span className="text-glow-purple" style={{ color: '#7b2ff7' }}>Mind</span>
        </h1>
        <p className="text-text-secondary text-lg font-light">
          Agentic AI that <span style={{ color: '#00f5d4' }}>thinks</span>,{' '}
          <span style={{ color: '#7b2ff7' }}>plans</span> &{' '}
          <span style={{ color: '#f72585' }}>delivers</span>
        </p>
      </div>

      {/* Template Chips */}
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {TEMPLATES.map((t, i) => (
          <button
            key={i}
            onClick={() => setGoal(t.goal)}
            disabled={disabled}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer
                       border border-border hover:border-neon-cyan/40
                       bg-surface/50 hover:bg-surface text-text-secondary hover:text-neon-cyan
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="glass-card p-1 transition-all duration-500"
           style={{ borderColor: goal.length > 0 ? (isReady ? 'rgba(0,245,212,0.3)' : 'rgba(249,200,14,0.3)') : undefined }}>
        <textarea
          ref={textareaRef}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && canSubmit) { e.preventDefault(); handleSubmit(); } }}
          placeholder="Describe your goal in detail — e.g., 'Analyze my startup idea for an AI-powered fitness app targeting Gen Z...'"
          disabled={disabled}
          rows={3}
          className="w-full p-5 bg-transparent text-text-primary text-base leading-relaxed
                     resize-none outline-none placeholder:text-text-muted font-light
                     disabled:opacity-50"
          style={{ minHeight: '100px' }}
        />
        <div className="flex items-center justify-between px-4 pb-3">
          <span className="text-xs text-text-muted font-mono">
            {goal.length > 0 ? `${goal.trim().split(/\s+/).length} words` : 'Type or pick a template'}
          </span>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-8 py-3 rounded-xl font-semibold text-sm tracking-wide transition-all duration-300 cursor-pointer
                       disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: canSubmit
                ? 'linear-gradient(135deg, #00f5d4, #7b2ff7)'
                : 'rgba(85,85,119,0.3)',
              color: canSubmit ? '#0a0a0f' : '#555577',
              boxShadow: canSubmit ? '0 0 30px rgba(0,245,212,0.3), 0 0 60px rgba(123,47,247,0.15)' : 'none',
            }}
          >
            {disabled ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-void border-t-transparent rounded-full animate-spin" />
                Running...
              </span>
            ) : (
              '⚡ Run GoalMind'
            )}
          </button>
        </div>
      </div>

      {/* Clarity Gate Warning */}
      {goal.trim().length >= 5 && clarityScore && !isReady && (
        <div className="mt-3 text-center animate-fade-in">
          <p className="text-neon-yellow text-sm font-medium">
            ⚠️ Goal too vague (score: {clarityScore.score}/100) — add more context to unlock
          </p>
        </div>
      )}
    </div>
  );
}
