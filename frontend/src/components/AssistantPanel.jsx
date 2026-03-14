import { useEffect, useState } from 'react';
import { api } from '../services/api';

const STARTER_QUESTIONS = [
  'What is a candlestick chart?',
  'How does demo trading work?',
  'What does the Momentum Agent do?',
  'How should I use the dashboard?',
];

export default function AssistantPanel() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'I can help explain charts, demo trading, signals, and how each AI agent works.',
    },
  ]);

  useEffect(() => {
    const openHandler = () => setOpen(true);
    window.addEventListener('agentic:assistant-open', openHandler);
    return () => window.removeEventListener('agentic:assistant-open', openHandler);
  }, []);

  const sendMessage = async (nextMessage) => {
    const content = nextMessage.trim();
    if (!content || loading) return;

    setMessages((prev) => [...prev, { role: 'user', content }]);
    setMessage('');
    setLoading(true);
    try {
      const response = await api.askAssistant(content);
      setMessages((prev) => [...prev, { role: 'assistant', content: response.reply }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: error?.message || 'Assistant is unavailable right now. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-5 right-5 z-[70] rounded-full border border-cyan-500/40 bg-cyan-500/15 px-4 py-3 text-sm font-medium text-cyan-300 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl transition hover:bg-cyan-500/20"
      >
        AI Assistant
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-[70] flex h-[34rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[24px] border border-zinc-800/80 bg-zinc-950/95 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="border-b border-zinc-800/80 px-4 py-4">
            <div className="text-[10px] uppercase tracking-[0.35em] text-cyan-400">Platform Guide</div>
            <div className="mt-2 text-lg text-zinc-100">Ask the trading assistant</div>
            <div className="mt-1 text-sm text-zinc-500">Learn the platform, agents, and core trading concepts.</div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((entry, index) => (
              <div key={`${entry.role}-${index}`} className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                entry.role === 'assistant'
                  ? 'mr-8 border border-zinc-800 bg-zinc-900/70 text-zinc-300'
                  : 'ml-8 border border-cyan-500/20 bg-cyan-500/10 text-cyan-200'
              }`}>
                {entry.content}
              </div>
            ))}

            {!loading && (
              <div className="grid grid-cols-1 gap-2">
                {STARTER_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    onClick={() => sendMessage(question)}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-left text-xs text-zinc-400 transition hover:border-cyan-500/30 hover:text-cyan-300"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-zinc-800/80 p-4">
            <div className="flex gap-2">
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    sendMessage(message);
                  }
                }}
                placeholder="Ask about charts, signals, or demo trading..."
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-cyan-500"
              />
              <button onClick={() => sendMessage(message)} disabled={loading} className="btn-primary px-4">
                {loading ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
