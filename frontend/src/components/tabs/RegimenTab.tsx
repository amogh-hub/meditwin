import React, { useState } from 'react';
import { optimizeRegimen } from '../../api';
import type { Patient, RegimenRow } from '../../types';
import { Pill, AlertCircle, ArrowRight } from 'lucide-react';

interface RegimenTabProps {
  patient: Patient;
  apiKey: string;
}

export const RegimenTab: React.FC<RegimenTabProps> = ({ patient, apiKey }) => {
  const [loading, setLoading] = useState(false);
  const [regimen, setRegimen] = useState<RegimenRow[] | null>(null);
  const [error, setError]     = useState<string | null>(null);

  const handleOptimize = async () => {
    if (!apiKey) { setError('Please provide a Gemini API Key in the sidebar.'); return; }
    setLoading(true);
    setError(null);
    try {
      setRegimen(await optimizeRegimen(patient, apiKey));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-3xl mx-auto">
      <div className="space-y-1 animate-slide-up">
        <h2 className="text-2xl font-bold font-grotesk tracking-tight text-fg">Regimen Optimizer</h2>
        <p className="text-[13px] text-fg2 leading-relaxed">
          Our cognitive engine analyzes your profile and suggests safer alternatives for problematic combinations.
        </p>
      </div>

      <div className="p-4 rounded-xl border border-risk-md-muted bg-risk-md-muted flex gap-3 animate-slide-up stagger-2">
        <AlertCircle className="w-4 h-4 text-risk-md shrink-0 mt-0.5" />
        <p className="text-[13px] text-fg2 leading-relaxed">
          <strong className="text-fg">Medical Disclaimer:</strong> Do not change or stop medications without
          consulting your doctor first. These suggestions are for discussion with your healthcare provider only.
        </p>
      </div>

      {!regimen ? (
        <div className="space-y-6 animate-slide-up stagger-2">
          {/* Feature preview cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                icon: '🔍',
                title: 'Interaction Scanner',
                desc: 'Identifies every drug–drug conflict in your current regimen using clinical pharmacology data.',
                color: 'bg-risk-hi/8 border-risk-hi/20',
              },
              {
                icon: '💊',
                title: 'Safer Alternatives',
                desc: 'Proposes evidence-based replacements that achieve the same therapeutic goal with fewer risks.',
                color: 'bg-accent/8 border-accent/20',
              },
              {
                icon: '📋',
                title: 'Clinical Rationale',
                desc: 'Each suggestion is backed by a plain-language explanation your doctor can review and approve.',
                color: 'bg-risk-lo/8 border-risk-lo/20',
              },
            ].map((card, i) => (
              <div
                key={i}
                className={`p-5 rounded-2xl border ${card.color} space-y-3 card-hover animate-slide-up`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="text-2xl">{card.icon}</div>
                <div>
                  <div className="text-[13px] font-semibold text-fg mb-1">{card.title}</div>
                  <p className="text-[12px] text-fg2 leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={handleOptimize}
              disabled={loading || patient.medications.length < 2}
              className="px-8 py-3 rounded-xl bg-accent text-white font-semibold text-[14px]
                hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-2
                shadow-lg shadow-accent/20 press-feedback"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Optimizing…
                </>
              ) : (
                <>
                  <span>✨</span>
                  Generate Safer Regimen
                </>
              )}
            </button>
          </div>
          {patient.medications.length < 2 && (
            <p className="text-[12px] text-fg3 text-center">Add at least 2 medications to unlock the optimizer.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setRegimen(null)}
              className="text-[12px] text-fg3 hover:text-fg underline transition-colors"
            >
              Reset & Re-run
            </button>
          </div>

          <div className="grid gap-4">
            {regimen.map((row, i) => (
              <div key={i}
                className="p-5 rounded-xl border border-line bg-card hover:border-line2
                  transition-colors flex flex-col md:flex-row items-start md:items-center gap-5
                  card-hover animate-slide-up"
                style={{ animationDelay: `${i * 60}ms` }}>

                <div className="flex-1 min-w-[160px]">
                  <span className="text-[10px] uppercase tracking-widest text-fg3 block mb-2">Current</span>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-risk-hi-muted">
                      <Pill className="w-4 h-4 text-risk-hi" />
                    </div>
                    <span className="font-semibold text-fg line-through decoration-risk-hi/50">
                      {row.current_drug}
                    </span>
                  </div>
                </div>

                <ArrowRight className="text-fg3 hidden md:block w-5 h-5 shrink-0" />
                <span className="text-fg3 md:hidden text-center w-full text-[12px]">↓</span>

                <div className="flex-1 min-w-[160px]">
                  <span className="text-[10px] uppercase tracking-widest text-fg3 block mb-2">Proposed</span>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-risk-lo-muted">
                      <Pill className="w-4 h-4 text-risk-lo" />
                    </div>
                    <span className="font-semibold text-risk-lo">{row.proposed_replacement}</span>
                  </div>
                </div>

                <div className="flex-1 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-line
                  md:pl-5 text-[13px] text-fg2 leading-relaxed">
                  {row.rationale}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-risk-hi-muted bg-risk-hi-muted text-risk-hi text-[13px]">
          {error}
        </div>
      )}
    </div>
  );
};
