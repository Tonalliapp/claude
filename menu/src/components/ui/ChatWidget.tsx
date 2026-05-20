import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { apiFetch } from '@/config/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  response: string;
  context: string;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', content: 'Hola! Soy Yessi, tu asistente. Preguntame sobre el menu, horarios o recomendaciones.' }]);
    }
  }, [open, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-8);
      const data = await apiFetch<ChatResponse>('/ai/chat', {
        method: 'POST',
        body: { context: 'restaurant_client', message: text, history },
      });
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Disculpa, no pude procesar tu mensaje. Intenta de nuevo.' }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full bg-gold text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
        aria-label="Abrir chat con Yessi"
      >
        <MessageCircle size={22} />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-tonalli-black sm:inset-auto sm:bottom-20 sm:right-4 sm:w-80 sm:h-[28rem] sm:rounded-2xl sm:shadow-2xl sm:border sm:border-light-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-light-border bg-tonalli-black-card sm:rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center">
            <MessageCircle size={14} className="text-gold" />
          </div>
          <span className="text-white text-sm font-medium">Yessi</span>
        </div>
        <button onClick={() => setOpen(false)} className="text-silver-muted hover:text-white transition-colors p-1">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gold text-black rounded-br-sm'
                  : 'bg-tonalli-black-card text-silver-light border border-light-border rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-tonalli-black-card border border-light-border rounded-xl px-3 py-2">
              <Loader2 size={16} className="text-gold animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-light-border">
        <form
          onSubmit={e => { e.preventDefault(); send(); }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Escribe tu pregunta..."
            maxLength={500}
            className="flex-1 bg-tonalli-black-card border border-light-border rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-silver-dark focus:outline-none focus:border-gold/30"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-full bg-gold text-black flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gold/90 transition-colors"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
