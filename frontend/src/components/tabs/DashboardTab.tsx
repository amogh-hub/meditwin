/**
 * MediTwin Lite — Futuristic Risk Dashboard
 * Features: animated metric counters, holographic gauge, canvas timeline,
 * glassmorphism cards, glow accents, futuristic interaction badges
 */
import React, { useEffect, useState } from 'react';
import { Download, ShieldAlert, BadgeInfo, Zap, Brain } from 'lucide-react';
import { Tooltip, ResponsiveContainer, Area, AreaChart, XAxis, YAxis } from 'recharts';
import type { Analysis, Patient, TimelinePoint, DuplicateTherapy } from '../../types';
import { downloadPDF, fetchRiskTimeline } from '../../api';
import { RiskGauge } from '../RiskGauge';
import { NetworkGraph } from '../NetworkGraph';

interface DashboardTabProps {
  patient: Patient;
  analysis: Analysis;
  apiKey: string;
}

/* ── Animated counter ─────────────────────────────────── */
function useCounter(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

/* ── Single stat card ─────────────────────────────────── */
const StatCard: React.FC<{
  label: string; value: number; color: string; glow: string; icon: React.FC<any>; delay?: number;
}> = ({ label, value, color, icon: Icon, delay = 0 }) => {
  const count = useCounter(value, 900 + delay);
  return (
    <div className="p-5 rounded-2xl border border-line bg-card hover:bg-card2 transition-colors card-hover animate-slide-up"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between mb-4">
        <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-fg3">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-card2">
          <Icon style={{ color }} className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="text-5xl font-bold font-grotesk tracking-tight leading-none" style={{ color }}>
        {count}
      </div>
    </div>
  );
};


/* ── Main component ───────────────────────────────────── */
export const DashboardTab: React.FC<DashboardTabProps> = ({ patient, analysis, apiKey }) => {
  const [timeline, setTimeline]     = useState<TimelinePoint[]>([]);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError]     = useState<string | null>(null);

  useEffect(() => {
    if (patient.medications.length > 0) {
      fetchRiskTimeline(patient.medications, patient.age, patient.conditions)
        .then(setTimeline).catch(console.error);
    }
  }, [patient]);

  const handleDownload = async () => {
    setPdfError(null);
    if (!apiKey) { setPdfError('API Key required for PDF export. Add it in Settings.'); return; }
    setLoadingPdf(true);
    try { await downloadPDF(patient, analysis.risk, analysis.interactions, analysis.contraindications, analysis.ai_analysis, apiKey); }
    catch (err: any) { setPdfError(err.message); }
    finally { setLoadingPdf(false); }
  };

  const { risk, interactions, contraindications, patterns } = analysis;
  const stackRisks   = analysis.stack_risks;
  const duplicates   = analysis.duplicate_therapy ?? [];
  const severeCount  = interactions.filter(i => i.severity === 'severe').length;
  const modCount     = interactions.filter(i => i.severity === 'moderate').length;

  const riskColor = risk.level === 'High' ? '#ef4444' : risk.level === 'Medium' ? '#f59e0b' : '#22c55e';

  const stats = [
    { label: 'Total Risk Score',      value: risk.total,                 color: riskColor,   glow: riskColor,   icon: Zap         },
    { label: 'Severe Interactions',   value: severeCount,                color: '#ef4444',   glow: '#ef4444',   icon: ShieldAlert  },
    { label: 'Moderate Interactions', value: modCount,                   color: '#f59e0b',   glow: '#f59e0b',   icon: BadgeInfo    },
    { label: 'Medications',           value: patient.medications.length, color: '#4a82e8',   glow: '#4a82e8',   icon: Brain        },
  ];

  const chartFill      = 'url(#areaGrad)';

  return (
    <div className="space-y-8 pb-12">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold font-grotesk tracking-tight text-fg">Risk Dashboard</h2>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-risk-hi opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-risk-hi" />
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] font-mono text-risk-hi font-semibold">Live</span>
        </div>

        <button
          onClick={handleDownload}
          disabled={loadingPdf}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium
            transition-all duration-200 disabled:opacity-50 press-feedback"
          style={{
            background: 'linear-gradient(135deg, #1B4DCC 0%, #4a82e8 100%)',
            color: '#fff',
            boxShadow: '0 4px 20px #1B4DCC40',
          }}>
          <Download className="w-4 h-4" />
          {loadingPdf ? 'Generating…' : 'Export PDF'}
        </button>
      </div>

      {/* Inline PDF error */}
      {pdfError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-risk-hi/10 border border-risk-hi/25
          text-[11.5px] text-risk-hi font-medium animate-slide-down">
          <span className="w-1.5 h-1.5 rounded-full bg-risk-hi shrink-0" />
          {pdfError}
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <StatCard key={i} {...s} delay={i * 100} />
        ))}
      </div>

      {/* ── Stack Risk Meters ── */}
      {stackRisks && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <h3 className="text-[14px] font-semibold text-fg tracking-tight">Pharmacological Stack Risks</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(['qt', 'sero', 'cns'] as const).map(key => {
              const sr = stackRisks[key];
              const levelColor = sr.level === 'high' ? '#ef4444' : sr.level === 'moderate' ? '#f59e0b' : sr.level === 'low' ? '#3b82f6' : 'var(--fg3-raw)';
              const bgOpacity  = sr.level === 'none' ? 'opacity-50' : '';
              return (
                <div key={key} className={`p-4 rounded-2xl border border-line bg-card ${bgOpacity}`}
                  style={{ boxShadow: sr.level !== 'none' ? `0 0 20px ${levelColor}15` : undefined }}>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-fg3">{sr.label}</span>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ background: `${levelColor}22`, color: levelColor }}>
                      {sr.count}
                    </div>
                  </div>
                  {/* Level bar */}
                  <div className="h-1.5 rounded-full bg-card2 overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(sr.count / 4 * 100, 100)}%`, background: levelColor }} />
                  </div>
                  <div className="text-[10.5px] font-semibold" style={{ color: levelColor }}>
                    {sr.level === 'none' ? 'No risk detected' : sr.level.charAt(0).toUpperCase() + sr.level.slice(1) + ' risk'}
                  </div>
                  {sr.drugs.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {sr.drugs.map(d => (
                        <span key={d} className="text-[10px] px-1.5 py-0.5 rounded-md bg-card2 text-fg3">{d}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Duplicate Therapy Warnings ── */}
      {duplicates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-risk-hi" style={{ boxShadow: '0 0 8px #ef4444' }} />
            <h3 className="text-[15px] font-semibold text-fg tracking-tight">Duplicate Therapy Detected</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {duplicates.map((d: DuplicateTherapy, i: number) => (
              <div key={i} className="p-4 rounded-2xl border relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, color-mix(in srgb, #f59e0b 6%, var(--card-raw)), var(--card-raw))',
                  borderColor: 'color-mix(in srgb, #f59e0b 25%, var(--line-raw))',
                }}>
                <div className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{ background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)' }} />
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-[13px]" style={{ color: '#f59e0b' }}>⚠️ {d.category}</h4>
                  <span className="text-[9px] uppercase tracking-widest font-mono px-2 py-0.5 rounded"
                    style={{ background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40' }}>
                    {d.severity}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {d.drugs.map(drug => (
                    <span key={drug} className="text-[11px] px-2 py-0.5 rounded-md bg-card2 border border-line text-fg2">{drug}</span>
                  ))}
                </div>
                <p className="text-fg2 text-[12.5px] leading-relaxed">{d.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Gauge card */}
        <div className="rounded-2xl border border-line bg-card overflow-hidden"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 20px rgba(0,0,0,0.04)' }}>
          <div className="px-5 pt-5 pb-2 border-b border-line flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: riskColor }} />
            <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-fg2">Kineti-Risk™ Engine</span>
          </div>
          <div className="p-4">
            <RiskGauge score={risk.total} level={risk.level} />
          </div>
        </div>

        {/* Timeline card */}
        <div className="rounded-2xl border border-line bg-card overflow-hidden"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 20px rgba(0,0,0,0.04)' }}>
          <div className="px-5 pt-5 pb-2 border-b border-line flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-fg2">Stacking Risk Timeline</span>
          </div>
          <div className="p-4 h-[240px]">
            {timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#4a82e8" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#4a82e8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="medication" stroke="var(--fg3-raw)" fontSize={10}
                    tickMargin={8} tick={{ fill: 'var(--fg3-raw)' }} />
                  <YAxis stroke="var(--fg3-raw)" fontSize={10} tick={{ fill: 'var(--fg3-raw)' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card-raw)',
                      border: '1px solid #4a82e840',
                      borderRadius: '10px',
                      color: 'var(--fg-raw)',
                      fontSize: '12px',
                      boxShadow: '0 4px 20px #4a82e820',
                    }}
                  />
                  <Area
                    type="monotone" dataKey="score" stroke="#4a82e8"
                    strokeWidth={2.5} fill={chartFill}
                    dot={{ fill: '#4a82e8', r: 4, strokeWidth: 2, stroke: 'var(--card-raw)' }}
                    activeDot={{ r: 7, fill: '#fff', stroke: '#4a82e8', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-fg3 text-[13px]">
                Add medications to see timeline
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 3D Interaction Network ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent" />
          <h3 className="text-[14px] font-semibold text-fg tracking-tight">Interaction Network</h3>
          <span className="text-[11px] text-fg3 font-medium">· Drag to rearrange</span>
        </div>
        <NetworkGraph interactions={interactions} medications={patient.medications} />
      </div>

      {/* ── Contraindications ── */}
      {contraindications.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-risk-hi" style={{ boxShadow: '0 0 8px #ef4444' }} />
            <h3 className="text-[15px] font-semibold text-fg tracking-tight">Contraindications</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {contraindications.map((ci, i) => (
              <div key={i} className="p-4 rounded-2xl border relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, color-mix(in srgb, #ef4444 6%, var(--card-raw)), var(--card-raw))',
                  borderColor: 'color-mix(in srgb, #ef4444 25%, var(--line-raw))',
                  boxShadow: '0 0 30px #ef444408',
                }}>
                <div className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{ background: 'linear-gradient(90deg, transparent, #ef4444, transparent)' }} />
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-[14px]" style={{ color: '#ef4444' }}>
                    🚫 {ci.drug} — {ci.condition}
                  </h4>
                  <span className="text-[9px] uppercase tracking-widest font-mono px-2 py-0.5 rounded"
                    style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440' }}>
                    {ci.severity.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-fg2 text-[13px] mb-2 leading-relaxed">{ci.description}</p>
                <p className="text-[13px] flex items-center gap-1.5 text-risk-lo">💡 {ci.alternative}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Detected Patterns ── */}
      {patterns.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full" style={{ background: '#4a82e8', boxShadow: '0 0 8px #4a82e8' }} />
            <h3 className="text-[15px] font-semibold text-fg tracking-tight">Detected Patterns</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {patterns.map((p, i) => (
              <div key={i} className="p-4 rounded-2xl border relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, color-mix(in srgb, #4a82e8 6%, var(--card-raw)), var(--card-raw))',
                  borderColor: 'color-mix(in srgb, #4a82e8 25%, var(--line-raw))',
                }}>
                <div className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{ background: 'linear-gradient(90deg, transparent, #4a82e8, transparent)' }} />
                <h4 className="font-semibold text-[14px] mb-1" style={{ color: '#4a82e8' }}>
                  {p.icon} {p.title}
                </h4>
                <p className="text-fg2 text-[13px] leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Flagged Interactions ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full bg-risk-md" style={{ boxShadow: '0 0 8px #f59e0b' }} />
          <h3 className="text-[15px] font-semibold text-fg tracking-tight">Flagged Interactions</h3>
        </div>
        {interactions.length === 0 ? (
          <div className="p-5 rounded-2xl text-[13px] text-risk-lo flex items-center gap-3"
            style={{ background: 'color-mix(in srgb, #22c55e 6%, var(--card-raw))', border: '1px solid color-mix(in srgb, #22c55e 20%, var(--line-raw))' }}>
            <span className="text-xl">✅</span>
            No known drug interactions identified. Always consult your pharmacist.
          </div>
        ) : (
          <div className="grid gap-3">
            {interactions.map((ix, i) => {
              const severe = ix.severity === 'severe';
              const col    = severe ? '#ef4444' : '#f59e0b';
              return (
                <div key={i} className="p-4 rounded-2xl border relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, color-mix(in srgb, ${col} 4%, var(--card-raw)), var(--card-raw))`,
                    borderColor: `color-mix(in srgb, ${col} 25%, var(--line-raw))`,
                  }}>
                  <div className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{ background: `linear-gradient(90deg, transparent, ${col}, transparent)` }} />
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-fg text-[14px]">
                      {severe ? '🔴' : '🟡'} {ix.drug_a} ↔ {ix.drug_b}
                    </h4>
                    <div className="flex gap-2">
                      <span className="text-[9px] uppercase tracking-widest font-mono px-2 py-0.5 rounded"
                        style={{ background: `${col}20`, color: col, border: `1px solid ${col}40` }}>
                        {ix.severity}
                      </span>
                      <span className="text-[9px] uppercase tracking-widest font-mono px-2 py-0.5 rounded"
                        style={{ background: '#4a82e820', color: '#4a82e8', border: '1px solid #4a82e840' }}>
                        {ix.evidence_level.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <p className="text-fg2 text-[13px] leading-relaxed">{ix.description}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
