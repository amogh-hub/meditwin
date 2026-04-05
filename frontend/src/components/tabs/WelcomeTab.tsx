import React, { useState } from 'react';
import { Bot, Pill, Sparkles, ArrowRight, Stethoscope, CheckCircle2, Shield } from 'lucide-react';
import { parseMedications } from '../../api';

interface WelcomeTabProps {
  apiKey: string;
  onSetMeds: (meds: string[]) => void;
  availableMeds: string[];
}

export const WelcomeTab: React.FC<WelcomeTabProps> = ({ apiKey, onSetMeds }) => {
  const [nlpInput, setNlpInput]   = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsed, setParsed]       = useState<string[] | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const handleParse = async () => {
    if (!nlpInput.trim() || !apiKey) return;
    setIsParsing(true);
    setError(null);
    setParsed(null);
    try {
      const res = await parseMedications(nlpInput, apiKey);
      if (res.success && res.medications.length > 0) {
        setParsed(res.medications);
        onSetMeds(res.medications);
        setNlpInput('');
      } else {
        setError(res.error || 'No matching medications found.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="w-full max-w-[560px] flex flex-col items-center text-center gap-8">

        {/* ── Hero ─────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-4 animate-slide-up">
          {/* Headline */}
          <div className="space-y-2">
            <h1 className="text-[40px] font-bold font-grotesk tracking-tight text-fg leading-[1.05]">
              MediTwin{' '}
              <span style={{
                background: 'linear-gradient(135deg, #1B4DCC 0%, #5D9BFF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Lite
              </span>
            </h1>
            <p className="text-[15px] text-fg2 leading-relaxed">
              AI-powered medication safety — spot drug interactions,<br />
              contraindications, and risks before they happen.
            </p>
          </div>
        </div>

        {/* ── 3 steps horizontal ──────────────────────────── */}
        <div className="w-full grid grid-cols-3 gap-3">
          {[
            { icon: Stethoscope, n: '1', label: 'Patient profile', sub: 'Age, sex & conditions' },
            { icon: Pill,        n: '2', label: 'Medications',     sub: 'Search or describe below' },
            { icon: Sparkles,    n: '3', label: 'Run analysis',    sub: 'Get your risk report' },
          ].map(({ icon: Icon, n, label, sub }, i) => (
            <div key={n} className={`flex flex-col items-center gap-2 p-4 rounded-2xl
              bg-card border border-line hover:border-accent/30 transition-colors card-hover
              animate-slide-up stagger-${i + 2}`}>
              <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-accent" />
              </div>
              <div>
                <div className="text-[12.5px] font-semibold text-fg">{label}</div>
                <div className="text-[11px] text-fg3 mt-0.5">{sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Smart Pill Entry / API Key notice ────────────────── */}
        {apiKey ? (
          <div className="w-full rounded-2xl border border-line bg-card overflow-hidden
            shadow-sm shadow-black/5 text-left animate-slide-up stagger-5">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-line">
              <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Pill className="w-3 h-3 text-accent" />
              </div>
              <div>
                <div className="text-[12.5px] font-semibold text-fg">Smart Pill Entry</div>
                <div className="text-[10.5px] text-fg3">Describe your medications in plain language</div>
              </div>
            </div>
            <div className="px-4 py-3.5 space-y-3">
              <textarea
                value={nlpInput}
                onChange={(e) => setNlpInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleParse(); }}
                placeholder='e.g. "I take aspirin, metformin, and a blood thinner every morning"'
                rows={2}
                className="w-full bg-bg border border-line rounded-xl px-3.5 py-2.5 text-[13px] text-fg
                  placeholder-fg3 focus:outline-none focus:border-accent resize-none transition-colors"
              />
              {error && (
                <p className="text-[11px] text-risk-hi flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-risk-hi shrink-0" />{error}
                </p>
              )}
              {parsed && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  {parsed.map((m) => (
                    <span key={m} className="flex items-center gap-1 px-2 py-0.5 rounded-full
                      bg-accent/10 text-accent text-[11px] font-medium border border-accent/20">
                      <CheckCircle2 className="w-2.5 h-2.5" />{m}
                    </span>
                  ))}
                  <span className="text-[10.5px] text-fg3 ml-1">← added to sidebar</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-fg3">⌘ Return to extract</span>
                <button
                  onClick={handleParse}
                  disabled={isParsing || !nlpInput.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white
                    text-[12px] font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity
                    shadow-md shadow-accent/20 press-feedback"
                >
                  {isParsing
                    ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Parsing…</>
                    : <>Extract <ArrowRight className="w-3 h-3" /></>
                  }
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full rounded-2xl border border-line bg-card p-4 flex items-start gap-3 text-left">
            <div className="w-8 h-8 rounded-xl bg-card2 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-4 h-4 text-fg3" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-fg">Smart Pill Entry needs an API key</p>
              <p className="text-[12px] text-fg2 mt-1 leading-relaxed">
                Add your Gemini key in the sidebar to enable AI-powered medication parsing and analysis.
              </p>
            </div>
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────── */}
        <div className="flex items-center gap-2 text-[11px] text-fg3 animate-fade-in stagger-6">
          <Shield className="w-3 h-3 shrink-0" />
          No patient data stored on our servers · For informational use only
        </div>

      </div>
    </div>
  );
};
