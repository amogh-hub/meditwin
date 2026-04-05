import React, { useState, useEffect } from 'react';
import type { Analysis, Patient, FDAData, Interaction } from '../../types';
import { fetchFDAData } from '../../api';
import {
  ChevronDown, ChevronUp, User, AlertTriangle,
  FlaskConical, ClipboardList, ShieldCheck, Activity,
} from 'lucide-react';

interface DeepDiveTabProps {
  patient: Patient;
  analysis: Analysis;
  mode: string;
}

/* ── Section config ─────────────────────────────────────── */
const SECTIONS: { key: string; label: string; icon: React.FC<any>; accent: string }[] = [
  { key: 'PATIENT SUMMARY',          label: 'Patient Summary',           icon: User,          accent: 'text-accent border-accent-muted bg-accent-muted'      },
  { key: 'INTERACTION ANALYSIS',     label: 'Interaction Analysis',      icon: AlertTriangle,  accent: 'text-risk-hi border-risk-hi-muted bg-risk-hi-muted'   },
  { key: 'CONTRAINDICATION ANALYSIS',label: 'Contraindication Analysis', icon: FlaskConical,   accent: 'text-risk-md border-risk-md-muted bg-risk-md-muted'   },
  { key: 'MONITORING PLAN',          label: 'Monitoring Plan',           icon: ClipboardList,  accent: 'text-risk-lo border-risk-lo-muted bg-risk-lo-muted'   },
  { key: 'SAFETY RECOMMENDATION',    label: 'Safety Recommendation',     icon: ShieldCheck,    accent: 'text-accent border-accent-muted bg-accent-muted'      },
];

/* ── Inline markdown renderer ───────────────────────────── */
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.*?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(<span key={i++}>{text.slice(last, match.index)}</span>);
    parts.push(<strong key={i++} className="font-semibold text-fg">{match[1]}</strong>);
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(<span key={i++}>{text.slice(last)}</span>);
  return parts;
}

/* ── Section body renderer ──────────────────────────────── */
const SectionBody: React.FC<{ content: string; sectionKey: string }> = ({ content, sectionKey }) => {
  const lines = content.split('\n').filter(l => l.trim());

  if (sectionKey === 'INTERACTION ANALYSIS') {
    // Parse ## Drug A ↔ Drug B sub-blocks
    const blocks: { title: string; lines: string[] }[] = [];
    let cur: { title: string; lines: string[] } | null = null;
    lines.forEach(line => {
      if (line.startsWith('## ')) {
        if (cur) blocks.push(cur);
        cur = { title: line.replace('## ', '').trim(), lines: [] };
      } else if (cur) {
        cur.lines.push(line.trim());
      } else {
        blocks.push({ title: '', lines: [line] });
      }
    });
    if (cur) blocks.push(cur);

    return (
      <div className="space-y-4">
        {blocks.map((block, i) => (
          <div key={i} className="p-4 rounded-xl border border-line bg-bg">
            {block.title && (
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-line">
                <Activity className="w-4 h-4 text-risk-hi shrink-0" />
                <h4 className="font-semibold text-fg text-[14px]">{block.title}</h4>
              </div>
            )}
            <div className="space-y-3">
              {/* Pre-process lines: merge continuation lines into the previous label value */}
              {(() => {
                // Build array of {label, value} or {text} entries
                type KV = { type: 'kv'; label: string; value: string } | { type: 'line'; text: string };
                const items: KV[] = [];
                block.lines.forEach(line => {
                  const isBold = line.startsWith('**') && line.includes(':**');
                  if (isBold) {
                    const ci = line.indexOf(':**');
                    items.push({ type: 'kv', label: line.slice(2, ci), value: line.slice(ci + 3).trim() });
                  } else if (items.length > 0 && items[items.length - 1].type === 'kv' &&
                    !line.startsWith('-') && !line.startsWith('•') && !line.startsWith('#') && line.trim() !== '') {
                    // Continuation of previous value
                    (items[items.length - 1] as { type: 'kv'; label: string; value: string }).value +=
                      ' ' + line.trim();
                  } else {
                    items.push({ type: 'line', text: line });
                  }
                });
                return items.map((item, j) => {
                  if (item.type === 'kv') {
                    return (
                      <div key={j} className="text-[13px]">
                        <div className="font-semibold text-fg mb-0.5">{item.label}</div>
                        <div className="text-fg2 leading-relaxed pl-3 border-l-2 border-line">
                          {renderInline(item.value)}
                        </div>
                      </div>
                    );
                  }
                  if (item.text.startsWith('- ') || item.text.startsWith('• ')) {
                    return (
                      <div key={j} className="flex gap-2 text-[13px] text-fg2">
                        <span className="text-fg3 shrink-0 mt-0.5">•</span>
                        <span className="leading-relaxed">{renderInline(item.text.slice(2))}</span>
                      </div>
                    );
                  }
                  if (item.text.trim()) {
                    return <p key={j} className="text-[13px] text-fg2 leading-relaxed">{renderInline(item.text)}</p>;
                  }
                  return null;
                });
              })()}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Generic renderer for other sections
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (line.startsWith('## ') || line.startsWith('### ')) {
          return (
            <h4 key={i} className="text-[14px] font-semibold text-fg mt-4 mb-1 first:mt-0">
              {line.replace(/^#{2,3} /, '')}
            </h4>
          );
        }
        if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-2 text-[13px] text-fg2 py-0.5">
              <span className="text-accent shrink-0 mt-0.5">›</span>
              <span className="leading-relaxed">{renderInline(line.slice(2))}</span>
            </div>
          );
        }
        if (/^\d+\./.test(line)) {
          const numEnd = line.indexOf('.');
          return (
            <div key={i} className="flex gap-2 text-[13px] text-fg2 py-0.5">
              <span className="font-semibold text-accent shrink-0 w-5">{line.slice(0, numEnd + 1)}</span>
              <span className="leading-relaxed">{renderInline(line.slice(numEnd + 1).trim())}</span>
            </div>
          );
        }
        if (line.trim() === '' || line.trim() === '---') return <div key={i} className="h-1" />;
        return (
          <p key={i} className="text-[13px] text-fg2 leading-relaxed">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
};

/* ── Parse AI text into sections ────────────────────────── */
function parseAISections(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  const sectionRegex = /===\s*([^=]+?)\s*===/g;
  const matches: { key: string; start: number; contentStart: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = sectionRegex.exec(text)) !== null) {
    matches.push({
      key:          m[1].trim().toUpperCase(),
      start:        m.index,
      contentStart: m.index + m[0].length,
    });
  }
  matches.forEach((match, i) => {
    const contentEnd = i + 1 < matches.length ? matches[i + 1].start : text.length;
    result[match.key] = text.slice(match.contentStart, contentEnd).trim();
  });
  if (Object.keys(result).length === 0) result['__RAW__'] = text;
  return result;
}

/* ── FDA sub-panel ──────────────────────────────────────── */
const InteractionDetail: React.FC<{ ix: Interaction; mode: string }> = ({ ix, mode }) => {
  const [fdaData, setFdaData] = useState<FDAData | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (expanded && !fdaData && !loading) {
      setLoading(true);
      fetchFDAData(ix.drug_a, ix.drug_b)
        .then(setFdaData).catch(console.error).finally(() => setLoading(false));
    }
  }, [expanded, ix.drug_a, ix.drug_b, fdaData, loading]);

  const severe = ix.severity === 'severe';

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors
      ${severe ? 'border-risk-hi-muted' : 'border-risk-md-muted'}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-card hover:bg-card2 transition-colors text-left"
      >
        <span className="font-semibold text-fg text-[13px] flex items-center gap-2">
          {severe ? '🔴' : '🟡'} {ix.drug_a} ↔ {ix.drug_b}
          <span className={`text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded
            ${severe ? 'text-risk-hi bg-risk-hi-muted' : 'text-risk-md bg-risk-md-muted'}`}>
            {ix.severity}
          </span>
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest font-mono text-fg3 hidden sm:block">
            {ix.evidence_level?.replace('_', ' ')}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-fg3" /> : <ChevronDown className="w-4 h-4 text-fg3" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 py-4 bg-bg border-t border-line grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 space-y-3">
            {mode === 'Patient' ? (
              <>
                {[
                  ["What's happening",  ix.description],
                  ['What to do',        ix.alternative],
                  ['Watch for',         ix.monitoring],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div className="text-[10px] uppercase tracking-widest text-fg3 mb-1">{label}</div>
                    <p className="text-fg2 text-[13px] leading-relaxed">{val}</p>
                  </div>
                ))}
              </>
            ) : (
              <>
                {[
                  ['Mechanism',       ix.mechanism],
                  ['Recommendation',  ix.alternative],
                  ['Monitoring',      ix.monitoring],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div className="text-[10px] uppercase tracking-widest text-fg3 mb-1">{label}</div>
                    <p className="text-fg2 text-[13px] leading-relaxed">{val}</p>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Live FDA panel */}
          <div className="p-4 rounded-xl bg-card border border-line space-y-3">
            <div className="text-[10px] uppercase tracking-widest text-fg3">Live FDA Data</div>
            {loading ? (
              <p className="text-fg3 text-[12px] animate-pulse">Fetching reports…</p>
            ) : fdaData ? (
              <>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-fg3 mb-1">Adverse Events</div>
                  <div className="text-3xl font-bold font-grotesk text-fg">
                    {fdaData.adverse_event_count.toLocaleString()}
                  </div>
                </div>
                {fdaData.top_reactions.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-fg3 mb-2">Top Reactions</div>
                    <ul className="space-y-1">
                      {fdaData.top_reactions.map((rx, i) => (
                        <li key={i} className="flex justify-between text-[12px]">
                          <span className="text-fg2">• {rx.term}</span>
                          <span className="text-fg3">{rx.count.toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-[12px] text-fg3">Failed to load FDA data.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Main tab ───────────────────────────────────────────── */
export const DeepDiveTab: React.FC<DeepDiveTabProps> = ({ analysis, mode }) => {
  const parsed = parseAISections(analysis.ai_analysis || '');

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-line animate-slide-up">
        <h2 className="text-2xl font-bold font-grotesk tracking-tight text-fg">AI Clinical Deep Dive</h2>
        <span className="px-3 py-1 rounded-full text-[11px] font-mono tracking-widest border border-line bg-card2 text-fg2">
          {mode.toUpperCase()} MODE
        </span>
      </div>

      {/* No AI analysis */}
      {!analysis.ai_analysis && (
        <div className="p-5 rounded-xl border border-line bg-card text-fg3 text-[13px] text-center">
          No AI analysis available. Add a Gemini API key in the sidebar and re-run the analysis.
        </div>
      )}

      {/* Structured sections */}
      {analysis.ai_analysis && parsed['__RAW__'] ? (
        /* Fallback: unstructured text — still render nicely */
        <div className="p-6 rounded-xl border border-line bg-card animate-slide-up stagger-2">
          <SectionBody content={parsed['__RAW__']} sectionKey="RAW" />
        </div>
      ) : (
        SECTIONS.map(({ key, label, accent }, idx) => {
          const content = parsed[key];
          if (!content) return null;
          const [colorCls] = accent.split(' ');
          return (
            <section key={key} className={`space-y-3 animate-slide-up stagger-${Math.min(idx + 2, 8)}`}>
              {/* Section header — matches Health tab label style */}
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${colorCls.replace('text-', 'bg-')}`} />
                <span className="text-[11px] uppercase tracking-[0.16em] font-semibold text-fg3">{label}</span>
              </div>

              {/* Section card */}
              <div className="p-5 rounded-xl border border-line bg-card">
                <SectionBody content={content} sectionKey={key} />
              </div>
            </section>
          );
        })
      )}

      {/* Interaction Details & openFDA */}
      {analysis.interactions.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-fg3" />
            <span className="text-[11px] uppercase tracking-[0.16em] font-semibold text-fg3">Live OpenFDA Evidence</span>
          </div>
          <div className="space-y-2">
            {analysis.interactions.map((ix, i) => (
              <InteractionDetail key={i} ix={ix} mode={mode} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
