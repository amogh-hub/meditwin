import React, { useState, useRef } from 'react';
import { FileText, Upload, Loader2, ChevronDown, ChevronUp, Trash2, AlertTriangle, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { healthStore, type LabReport, type LabValue } from '../../lib/healthStore';

const BASE = 'http://localhost:8000/api';

const STATUS_CFG = {
  normal:   { icon: CheckCircle2, color: '#22c55e', label: 'Normal'   },
  low:      { icon: AlertTriangle, color: '#3b82f6', label: 'Low'     },
  high:     { icon: AlertCircle,  color: '#f59e0b', label: 'High'     },
  critical: { icon: XCircle,      color: '#ef4444', label: 'Critical' },
};

const URGENCY_CFG = {
  monitor:      { label: 'Monitor',       color: '#22c55e', bg: '#22c55e12' },
  consult_soon: { label: 'Consult Soon',  color: '#f59e0b', bg: '#f59e0b12' },
  urgent:       { label: 'Urgent',        color: '#ef4444', bg: '#ef444412' },
};

// ── Value Row ───────────────────────────────────────────────

const ValueRow: React.FC<{ v: LabValue }> = ({ v }) => {
  const cfg  = STATUS_CFG[v.status];
  const Icon = cfg.icon;
  const [open, setOpen] = useState(v.status !== 'normal');

  return (
    <div className={`rounded-xl border transition-all ${v.status !== 'normal' ? 'border-current/20' : 'border-line'}`}
      style={v.status !== 'normal' ? { borderColor: cfg.color + '30', background: cfg.color + '06' } : undefined}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <Icon className="w-4 h-4 shrink-0" style={{ color: cfg.color }} />
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-medium text-fg">{v.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold text-fg">{v.value} {v.unit}</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
            style={{ background: cfg.color + '22', color: cfg.color }}>{cfg.label}</span>
          <span className="text-[10.5px] text-fg3 shrink-0 hidden sm:block">Ref: {v.range}</span>
          {open ? <ChevronUp className="w-3.5 h-3.5 text-fg3 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-fg3 shrink-0" />}
        </div>
      </button>
      {open && v.context && (
        <div className="px-4 pb-3 text-[12.5px] text-fg2 leading-relaxed border-t border-line/50 pt-2.5">
          {v.context}
        </div>
      )}
    </div>
  );
};

// ── Report Card ─────────────────────────────────────────────

const ReportCard: React.FC<{ report: LabReport; onDelete: () => void }> = ({ report, onDelete }) => {
  const [expanded, setExpanded] = useState(true);
  const urgency = URGENCY_CFG[report.urgency];
  const abnormal = report.values.filter(v => v.status !== 'normal').length;

  return (
    <div className="rounded-2xl border border-line bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-line flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <FileText className="w-4.5 h-4.5 text-accent" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold text-fg truncate">{report.fileName}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-fg3">{new Date(report.timestamp).toLocaleDateString()}</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: urgency.bg, color: urgency.color }}>{urgency.label}</span>
              {abnormal > 0 && (
                <span className="text-[10px] text-risk-hi font-semibold">{abnormal} abnormal</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setExpanded(e => !e)} className="text-fg3 hover:text-fg transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onDelete} className="text-fg3 hover:text-risk-hi transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-5 space-y-5">
          {/* Summary */}
          <div className="p-4 rounded-xl bg-bg border border-line">
            <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-fg3 mb-2">AI Summary</div>
            <p className="text-[13px] text-fg leading-relaxed">{report.summary}</p>
          </div>

          {/* Values */}
          {report.values.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-[0.12em] font-semibold text-fg3">Extracted Values</div>
              {report.values.map((v, i) => <ValueRow key={i} v={v} />)}
            </div>
          )}

          {/* Actions */}
          {report.actions.length > 0 && (
            <div className="p-4 rounded-xl border"
              style={{ background: urgency.bg, borderColor: urgency.color + '30' }}>
              <div className="text-[11px] uppercase tracking-[0.12em] font-semibold mb-2.5" style={{ color: urgency.color }}>
                Recommended Actions
              </div>
              <ul className="space-y-1.5">
                {report.actions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px] text-fg leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: urgency.color }} />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────

export const LabReportsTab: React.FC<{ apiKey: string }> = ({ apiKey }) => {
  const [reports, setReports]   = useState<LabReport[]>(() => healthStore.getLabs().sort((a, b) => b.timestamp - a.timestamp));
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = () => setReports(healthStore.getLabs().sort((a, b) => b.timestamp - a.timestamp));

  const processFile = async (file: File) => {
    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
      setError('Please upload a PDF file.'); return;
    }
    if (!apiKey) { setError('Gemini API key required to analyze lab reports.'); return; }

    setLoading(true); setError(null);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((res, rej) => {
        reader.onload = e => res((e.target?.result as string).split(',')[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });

      const resp = await fetch(`${BASE}/lab_analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({ pdf_base64: base64, file_name: file.name }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => null);
        throw new Error(errorData?.detail || `Server error: ${resp.statusText}`);
      }
      
      const data = await resp.json();

      if (data.error) throw new Error(data.error);

      healthStore.addLab({ ...data, fileName: file.name, timestamp: Date.now() });
      reload();
    } catch (e: any) {
      setError(e.message || 'Failed to analyze report.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="max-w-3xl mx-auto pb-12 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-grotesk text-fg tracking-tight">Lab Reports</h2>
        {reports.length > 0 && (
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-[12.5px] font-semibold hover:opacity-90">
            <Upload className="w-3.5 h-3.5" /> Upload PDF
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFilePick} />

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !loading && fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          dragging ? 'border-accent bg-accent/8 scale-[1.01]' : 'border-line hover:border-accent/50 hover:bg-card2/50'
        }`}
      >
        {loading ? (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
            <p className="text-[14px] text-fg2">Analyzing report with AI…</p>
            <p className="text-[12px] text-fg3">Extracting values, flagging abnormals, generating summary</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-fg">Drop a PDF or click to upload</p>
              <p className="text-[12px] text-fg3 mt-1">Blood panel · Lipid profile · CBC · HbA1c · Thyroid · Kidney · Liver markers</p>
            </div>
            {!apiKey && (
              <p className="text-[11.5px] text-risk-md font-medium">⚠️ Gemini API key required</p>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-risk-hi-muted border border-risk-hi-muted">
          <AlertTriangle className="w-4 h-4 text-risk-hi shrink-0" />
          <p className="text-[13px] text-fg">{error}</p>
        </div>
      )}

      {reports.length === 0 && !loading && (
        <div className="rounded-2xl border border-line bg-card overflow-hidden animate-slide-up">
          {/* Hero */}
          <div className="px-8 py-10 text-center border-b border-line">
            <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
              <FileText className="w-10 h-10 text-accent" />
            </div>
            <h3 className="text-[20px] font-bold font-grotesk text-fg mb-2">AI-Powered Lab Analysis</h3>
            <p className="text-[13px] text-fg2 max-w-md mx-auto leading-relaxed">
              Upload any blood panel, lipid profile, or lab report PDF and our AI instantly extracts
              values, flags abnormals, and gives you personalized clinical insights.
            </p>
          </div>

          {/* Feature preview grid */}
          <div className="grid grid-cols-3 gap-px bg-line">
            {[
              {
                icon: '🔬',
                title: 'Smart Extraction',
                desc: 'Automatically pulls all values from CBC, HbA1c, lipids, thyroid, kidney, and liver panels',
              },
              {
                icon: '🚨',
                title: 'Anomaly Flagging',
                desc: 'Highlights abnormal values in red/amber with clinical reference ranges',
              },
              {
                icon: '💡',
                title: 'Recommended Actions',
                desc: 'AI-generated next steps — when to consult, what to monitor, follow-up tests',
              },
            ].map((f, i) => (
              <div key={i} className={`p-5 bg-card animate-fade-in stagger-${i + 2}`}>
                <div className="text-2xl mb-3">{f.icon}</div>
                <div className="text-[13px] font-semibold text-fg mb-1">{f.title}</div>
                <div className="text-[11.5px] text-fg2 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>

          {/* Supported formats */}
          <div className="px-8 py-5 border-t border-line flex items-center justify-between">
            <p className="text-[11px] text-fg3">
              Supports: Blood panel · Lipid profile · CBC · HbA1c · Thyroid · Kidney · Liver markers
            </p>
            {!apiKey && (
              <span className="text-[11px] text-risk-md font-medium">⚠️ Gemini API key required</span>
            )}
          </div>
        </div>
      )}

      {reports.map(r => (
        <ReportCard key={r.id} report={r} onDelete={() => { healthStore.deleteLab(r.id); reload(); }} />
      ))}
    </div>
  );
};
