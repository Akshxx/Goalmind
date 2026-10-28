import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 120000,
});

export async function runAgent(goal) {
  const res = await api.post('/run-agent', { goal });
  return res.data; // { job_id }
}

export async function getResult(jobId) {
  const res = await api.get(`/result/${jobId}`);
  return res.data;
}

export async function getClarity(goal) {
  const res = await api.get('/clarity', { params: { goal } });
  return res.data;
}

export async function getEnhancedPrompt(goal) {
  const res = await api.post('/enhance-prompt', { goal });
  return res.data; // { suggestions: [ { question, enhanced_prompt } ] }
}

export function streamEvents(jobId, onEvent) {
  const url = `${API_URL}/stream/${jobId}`;
  const source = new EventSource(url);

  const eventTypes = [
    'task_decomposed', 'agent_started', 'tool_called',
    'agent_done', 'feedback', 'devil', 'complete', 'error',
    'decompose', 'agent_start',
  ];

  eventTypes.forEach(type => {
    source.addEventListener(type, (e) => {
      // Ignore native EventSource connection errors which have no data
      if (type === 'error' && !e.data) return;

      try {
        const data = JSON.parse(e.data);
        onEvent({ type: data.type || type, data: data.data || data });
      } catch {
        onEvent({ type, data: { raw: e.data } });
      }
    });
  });

  source.onerror = () => {
    source.close();
  };

  return source;
}

export default api;
