import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Patient, ChatMessage, Analysis } from '../../types';
import { chatWithAI } from '../../api';
import { Bot, User, Send, Loader2 } from 'lucide-react';

interface ChatTabProps {
  patient: Patient;
  apiKey: string;
  analysis?: Analysis | null;
}

export const ChatTab: React.FC<ChatTabProps> = ({ patient, apiKey, analysis }) => {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const endRef                = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSend = async (text: string) => {
    const q = text.trim();
    if (!q || !apiKey) return;
    setInput('');
    const newHistory: ChatMessage[] = [...history, { role: 'user', content: q }];
    setHistory(newHistory);
    setLoading(true);
    try {
      const resp = await chatWithAI(patient, newHistory, q, apiKey);
      setHistory([...newHistory, { role: 'assistant', content: resp }]);
    } catch (err: any) {
      setHistory([...newHistory, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  /* Build contextual suggestions from actual patient data */
  const suggestions = useMemo(() => {
    const base: string[] = [];
    if (analysis) {
      const { interactions, contraindications, patterns } = analysis;

      /* Suggest about most severe interaction */
      const severe = interactions.find(i => i.severity === 'severe');
      if (severe)
        base.push(`Explain the ${severe.drug_a} ↔ ${severe.drug_b} interaction in simple terms.`);

      /* QT prolongation */
      const qtPattern = patterns.find(p => p.title.includes('QT'));
      if (qtPattern)
        base.push('What is QT prolongation and why is it dangerous for me?');

      /* Serotonin */
      const seroPattern = patterns.find(p => p.title.includes('Serotonin'));
      if (seroPattern)
        base.push('What are the signs of serotonin syndrome I should watch out for?');

      /* Warfarin-specific */
      if (patient.medications.some(m => m.toLowerCase() === 'warfarin'))
        base.push('What foods and supplements interact with Warfarin?');

      /* Contraindication */
      if (contraindications.length > 0)
        base.push(`Why is ${contraindications[0].drug} risky for my ${contraindications[0].condition.toLowerCase()} condition?`);
    }

    /* Fallback generics */
    const fallbacks = [
      'What pain medication is safest for me?',
      'Explain my highest-risk interaction in simple terms.',
      'What blood tests should I ask my doctor about?',
      'Are there lifestyle changes that could reduce my medication burden?',
    ];

    const combined = [...base, ...fallbacks];
    return combined.slice(0, 4);
  }, [analysis, patient.medications]);

  return (
    <div className="flex flex-col border border-line rounded-xl bg-card overflow-hidden"
      style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>

      {/* Header */}
      <div className="px-5 py-4 border-b border-line flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-accent-muted flex items-center justify-center">
          <Bot className="w-4 h-4 text-accent" />
        </div>
        <div>
          <h3 className="text-[14px] font-semibold text-fg">Clinical AI Assistant</h3>
          <p className="text-[11px] text-fg3">Gemini — context-aware reasoning</p>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-hide">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-8 py-12 animate-fade-in">
            <div className="text-center max-w-sm animate-slide-up">
              <div className="w-12 h-12 rounded-xl bg-accent-muted flex items-center justify-center mx-auto mb-4">
                <Bot className="w-6 h-6 text-accent" />
              </div>
              <h4 className="text-[15px] font-semibold text-fg mb-1.5">Ask about your regimen</h4>
              <p className="text-[13px] text-fg2 leading-relaxed">
                Ask about specific drug interactions, safer alternatives, or lifestyle modifications.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-xl">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  disabled={!apiKey}
                  className={`px-4 py-2 rounded-xl border border-line bg-bg hover:bg-card2
                    text-fg2 hover:text-fg text-[12px] transition-colors disabled:opacity-40
                    card-hover press-feedback animate-fade-in stagger-${Math.min(i + 2, 8)}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          history.map((msg, i) => {
            const isUser = msg.role === 'user';
            return (
              <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-3 max-w-[82%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1
                    ${isUser ? 'bg-card2' : 'bg-accent-muted'}`}>
                    {isUser
                      ? <User className="w-3.5 h-3.5 text-fg2" />
                      : <Bot  className="w-3.5 h-3.5 text-accent" />}
                  </div>
                  <div className={`px-4 py-3 rounded-xl text-[13px] leading-relaxed
                    ${isUser
                      ? 'bg-accent text-white rounded-tr-sm'
                      : 'bg-card2 text-fg border border-line rounded-tl-sm'}`}>
                    {isUser ? msg.content : (
                      <div dangerouslySetInnerHTML={{
                        __html: msg.content
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n/g, '<br/>'),
                      }} />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-accent-muted flex items-center justify-center shrink-0">
                <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
              </div>
              <div className="px-4 py-3 rounded-xl bg-card2 border border-line flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-fg3 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-fg3 animate-bounce [animation-delay:0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-fg3 animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-4 border-t border-line bg-bg shrink-0">
        {!apiKey && (
          <p className="text-[11px] text-risk-md text-center mb-2">
            Gemini API key required — add it in the sidebar
          </p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            placeholder="Ask anything…"
            disabled={!apiKey || loading}
            className="flex-1 border border-line bg-card rounded-lg px-4 py-2.5 text-[13px]
              text-fg placeholder-fg3 focus:outline-none focus:border-accent transition-colors
              disabled:opacity-40"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || !apiKey || loading}
            className="px-4 py-2.5 rounded-xl bg-accent text-white disabled:opacity-40
              hover:opacity-90 transition-opacity press-feedback"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
