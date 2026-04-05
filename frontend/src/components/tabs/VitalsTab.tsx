import React, { useState, useCallback } from 'react';
import {
  Heart, Droplets, Activity, Thermometer, Wind,
  Plus, Trash2, AlertTriangle,
} from 'lucide-react';
import {
  AreaChart, Area, ReferenceLine, ReferenceArea,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid,
} from 'recharts';
import { healthStore, NORMAL_RANGES, type VitalMetricId, type VitalReading } from '../../lib/healthStore';

// ── Metric config ───────────────────────────────────────────

const METRICS: { id: VitalMetricId; label: string; icon: React.FC<any>; color: string; isBP?: boolean }[] = [
  { id: 'heartRate',     label: 'Heart Rate',      icon: Heart,       color: '#ef4444' },
  { id: 'bloodPressure', label: 'Blood Pressure',  icon: Activity,    color: '#8b5cf6', isBP: true },
  { id: 'glucose',       label: 'Blood Glucose',   icon: Droplets,    color: '#f59e0b' },
  { id: 'spo2',          label: 'Blood Oxygen',    icon: Wind,        color: '#3b82f6' },
  { id: 'temperature',   label: 'Temperature',     icon: Thermometer, color: '#10b981' },
];

const STATUS_CFG = {
  optimal:    { label: 'Optimal',    color: '#22c55e', bg: '#22c55e15' },
  borderline: { label: 'Borderline', color: '#f59e0b', bg: '#f59e0b15' },
  at_risk:    { label: 'At Risk',    color: '#ef4444', bg: '#ef444415' },
};

// ── Helpers ─────────────────────────────────────────────────

function fmt(ts: number) {
  const d = new Date(ts);
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function today() { return new Date().toISOString().slice(0, 10); }

function avg(arr: number[]) { return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0; }

// ── Empty State ─────────────────────────────────────────────

const EmptyState: React.FC<{ metric: typeof METRICS[0]; onAdd: () => void }> = ({ metric, onAdd }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-5 animate-slide-up">
    <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
      style={{ background: metric.color + '18' }}>
      <metric.icon className="w-8 h-8" style={{ color: metric.color }} />
    </div>
    <div className="text-center space-y-1.5">
      <h3 className="text-[17px] font-semibold font-grotesk text-fg">No {metric.label} data yet</h3>
      <p className="text-[13px] text-fg2 max-w-xs leading-relaxed">
        Log your first reading to start tracking trends and get WHO/AHA benchmark comparisons.
      </p>
    </div>
    <button
      onClick={onAdd}
      className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-[13px]
        hover:opacity-90 active:scale-[0.97] transition-all shadow-lg press-feedback"
      style={{ background: metric.color, boxShadow: `0 8px 24px ${metric.color}30` }}
    >
      <Plus className="w-4 h-4" /> Log First Reading
    </button>
  </div>
);

// ── Add Reading Modal ───────────────────────────────────────

const AddModal: React.FC<{
  metric: typeof METRICS[0];
  onAdd: (r: Omit<VitalReading, 'id'>) => void;
  onClose: () => void;
}> = ({ metric, onAdd, onClose }) => {
  const [val, setVal]     = useState('');
  const [sys, setSys]     = useState('');  // BP systolic
  const [dia, setDia]     = useState('');  // BP diastolic
  const [state, setState] = useState<'resting' | 'active'>('resting');
  const [note, setNote]   = useState('');
  const range = NORMAL_RANGES[metric.id];

  const handleSubmit = () => {
    if (metric.isBP) {
      if (!sys || !dia) return;
      onAdd({ metric: metric.id, timestamp: Date.now(), value: +sys, systolicVal: +sys, diastolicVal: +dia, state, note });
    } else {
      if (!val) return;
      onAdd({ metric: metric.id, timestamp: Date.now(), value: +val, state, note });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-6 space-y-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: metric.color + '18' }}>
            <metric.icon className="w-4.5 h-4.5" style={{ color: metric.color }} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-fg">Log {metric.label}</h3>
            <p className="text-[11px] text-fg3">Normal range: {range.min}–{range.max} {range.unit}</p>
          </div>
        </div>

        {metric.isBP ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest font-semibold text-fg3 mb-1.5 block">Systolic</label>
              <input type="number" value={sys} onChange={e => setSys(e.target.value)} placeholder="120"
                className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-bg text-[14px] text-fg
                  focus:outline-none focus:border-accent transition-colors" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-semibold text-fg3 mb-1.5 block">Diastolic</label>
              <input type="number" value={dia} onChange={e => setDia(e.target.value)} placeholder="80"
                className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-bg text-[14px] text-fg
                  focus:outline-none focus:border-accent transition-colors" />
            </div>
          </div>
        ) : (
          <div>
            <label className="text-[10px] uppercase tracking-widest font-semibold text-fg3 mb-1.5 block">
              Value ({range.unit})
            </label>
            <input type="number" value={val} onChange={e => setVal(e.target.value)}
              placeholder={`${range.optimalMin ?? range.min}`} step={metric.id === 'temperature' ? '0.1' : '1'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-bg text-[15px] text-fg
                focus:outline-none focus:border-accent transition-colors" />
          </div>
        )}

        {(metric.id === 'heartRate') && (
          <div>
            <label className="text-[10px] uppercase tracking-widest font-semibold text-fg3 mb-1.5 block">State</label>
            <div className="grid grid-cols-2 gap-2">
              {(['resting', 'active'] as const).map(s => (
                <button key={s} onClick={() => setState(s)}
                  className={`py-2 rounded-xl text-[12px] font-medium border transition-all capitalize ${
                    state === s ? 'border-accent bg-accent/10 text-accent' : 'border-line text-fg2 hover:bg-card2'
                  }`}>{s}</button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-[10px] uppercase tracking-widest font-semibold text-fg3 mb-1.5 block">Note (optional)</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. After exercise"
            className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-bg text-[13px] text-fg
              focus:outline-none focus:border-accent transition-colors" />
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-line text-fg2 text-[13px] font-medium hover:bg-card2 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit}
            className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-semibold transition-opacity hover:opacity-90"
            style={{ background: metric.color }}>
            Save Reading
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Daily Summary Card ──────────────────────────────────────

const DailySummary: React.FC<{ readings: VitalReading[]; metric: typeof METRICS[0] }> = ({ readings, metric }) => {
  const todayReadings = readings.filter(r => new Date(r.timestamp).toISOString().slice(0, 10) === today());
  if (todayReadings.length === 0) return null;
  const vals  = todayReadings.map(r => r.value);
  const minV  = Math.min(...vals);
  const maxV  = Math.max(...vals);
  const avgV  = avg(vals);
  const range = NORMAL_RANGES[metric.id];
  const status = healthStore.getVitalStatus(metric.id, avgV);
  const cfg   = STATUS_CFG[status];
  const singleReading = todayReadings.length === 1;

  return (
    <div className="rounded-2xl border border-line bg-card p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-fg3">Today's Summary</span>
        <div className="flex items-center gap-2">
          {singleReading && <span className="text-[10px] text-fg3">Based on 1 reading</span>}
          <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Min',  val: minV.toFixed(metric.id === 'temperature' ? 1 : 0) },
          { label: 'Avg',  val: avgV.toFixed(metric.id === 'temperature' ? 1 : 0) },
          { label: 'Max',  val: maxV.toFixed(metric.id === 'temperature' ? 1 : 0) },
        ].map((s, i) => (
          <div key={s.label} className={`text-center animate-count-up stagger-${i + 1}`}>
            <div className="text-[22px] font-bold font-grotesk text-fg">{s.val}</div>
            <div className="text-[10px] text-fg3 uppercase tracking-[0.1em]">{s.label} {range.unit}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Spike Detection ─────────────────────────────────────────

const SpikeCard: React.FC<{ reading: VitalReading; metric: typeof METRICS[0] }> = ({ reading, metric }) => {
  const range     = NORMAL_RANGES[metric.id];
  const isHigh    = range.spikeAbove !== undefined && reading.value > range.spikeAbove;
  const severity  = isHigh ? 'High' : 'Low';
  const color     = severity === 'High' ? '#ef4444' : '#3b82f6';
  const cause     = metric.id === 'heartRate' && isHigh ? 'Possible: stress, caffeine, or arrhythmia'
    : metric.id === 'glucose' && isHigh ? 'Possible: post-meal spike or inadequate insulin'
    : metric.id === 'bloodPressure' && isHigh ? 'Possible: white-coat effect, sodium intake, or stress'
    : metric.id === 'temperature' && isHigh ? 'Possible: infection, inflammation, or fever'
    : metric.id === 'spo2' && !isHigh ? 'Possible: poor circulation, respiratory issue'
    : 'Consult your physician';

  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl border"
      style={{ background: color + '08', borderColor: color + '30' }}>
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[12.5px] font-semibold text-fg">
            {severity} {metric.label}: {metric.id === 'bloodPressure'
              ? `${reading.systolicVal}/${reading.diastolicVal} mmHg`
              : `${reading.value} ${NORMAL_RANGES[metric.id].unit}`}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: color + '22', color }}>{severity}</span>
        </div>
        <div className="text-[11px] text-fg3">{fmt(reading.timestamp)}</div>
        <div className="text-[11.5px] text-fg2 mt-0.5 italic">{cause}</div>
      </div>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────

export const VitalsTab: React.FC = () => {
  const [activeMetric, setActiveMetric] = useState<VitalMetricId>('heartRate');
  const [showModal, setShowModal]       = useState(false);
  const [readings, setReadings]         = useState<VitalReading[]>([]);
  const [spikes, setSpikes]             = useState<VitalReading[]>([]);

  const metric = METRICS.find(m => m.id === activeMetric)!;

  const reload = useCallback(() => {
    setReadings(healthStore.getVitals(activeMetric));
    setSpikes(healthStore.getSpikes(activeMetric));
  }, [activeMetric]);

  React.useEffect(() => { reload(); }, [reload]);

  const handleAdd = (r: Omit<VitalReading, 'id'>) => {
    healthStore.addVital(r);
    reload();
  };

  const handleDelete = (id: string) => {
    healthStore.deleteVital(id);
    reload();
  };

  const range      = NORMAL_RANGES[activeMetric];
  const chartData  = [...readings]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(r => ({
      time:  new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date:  new Date(r.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      value: r.value,
      sys:   r.systolicVal,
      dia:   r.diastolicVal,
      state: r.state,
    }));

  // 7-day bar data
  const weekData = healthStore.getLast7Days().map(date => {
    const dayReadings = readings.filter(r => new Date(r.timestamp).toISOString().slice(0, 10) === date);
    const vals = dayReadings.map(r => r.value);
    return {
      date: new Date(date).toLocaleDateString([], { weekday: 'short' }),
      avg:  vals.length ? +avg(vals).toFixed(1) : null,
    };
  });

  const hasData = readings.length > 0;

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">

      {/* ── Metric selector ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {METRICS.map((m, i) => {
          const count = healthStore.getVitals(m.id).length;
          return (
            <button
              key={m.id}
              onClick={() => setActiveMetric(m.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[12.5px] font-medium transition-all
                press-feedback animate-fade-in stagger-${i + 1} ${
                activeMetric === m.id
                  ? 'border-transparent text-white shadow-md'
                  : 'border-line bg-card text-fg2 hover:bg-card2'
              }`}
              style={activeMetric === m.id ? { background: m.color } : undefined}
            >
              <m.icon className="w-3.5 h-3.5" />
              {m.label}
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeMetric === m.id ? 'bg-white/25 text-white' : 'bg-card2 text-fg3'
                }`}>{count}</span>
              )}
            </button>
          );
        })}
        <button
          onClick={() => setShowModal(true)}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-white text-[12.5px] font-semibold
            hover:opacity-90 transition-opacity shadow-md"
          style={{ background: metric.color }}
        >
          <Plus className="w-3.5 h-3.5" /> Log Reading
        </button>
      </div>

      {/* ── Content ── */}
      {!hasData ? (
        <EmptyState metric={metric} onAdd={() => setShowModal(true)} />
      ) : (
        <>
          {/* Daily summary */}
          <DailySummary readings={readings} metric={metric} />

          {/* Line/Area chart */}
          <div className="rounded-2xl border border-line bg-card p-5 animate-slide-up stagger-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-semibold text-fg">{metric.label} Over Time</h3>
                <p className="text-[11px] text-fg3 mt-0.5">
                  Normal range: {range.min}–{range.max} {range.unit} · WHO/AHA benchmark overlaid
                </p>
              </div>
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                {metric.isBP ? (
                  <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`lg-sys-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={metric.color} stopOpacity={0.18} />
                        <stop offset="95%" stopColor={metric.color} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id={`lg-dia-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={metric.color} stopOpacity={0.10} />
                        <stop offset="95%" stopColor={metric.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--line-raw)" strokeOpacity={0.5} strokeDasharray="3 3" />
                    {/* Filled normal range band */}
                    <ReferenceArea y1={range.min} y2={range.max} fill={metric.color} fillOpacity={0.07}
                      stroke={metric.color} strokeOpacity={0.2} strokeWidth={1} />
                    <ReferenceLine y={range.min} stroke={metric.color} strokeDasharray="4 4" strokeOpacity={0.4}
                      label={{ value: `Min ${range.min}`, fontSize: 9, fill: metric.color, position: 'insideTopLeft' }} />
                    <ReferenceLine y={range.max} stroke={metric.color} strokeDasharray="4 4" strokeOpacity={0.4}
                      label={{ value: `Max ${range.max}`, fontSize: 9, fill: metric.color, position: 'insideTopLeft' }} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--fg3-raw)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--fg3-raw)' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--card-raw)', border: '1px solid var(--line-raw)', borderRadius: 10, fontSize: 12 }}
                      formatter={(v: any) => [`${v} ${range.unit}`, metric.label]}
                    />
                    <Area type="monotone" dataKey="sys" stroke={metric.color} strokeWidth={2.5}
                      fill={`url(#lg-sys-${activeMetric})`}
                      dot={{ r: 4, fill: metric.color, stroke: 'var(--card-raw)', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: metric.color }} name="Systolic" />
                    <Area type="monotone" dataKey="dia" stroke={metric.color} strokeWidth={2} strokeDasharray="4 2"
                      fill={`url(#lg-dia-${activeMetric})`}
                      dot={{ r: 3, fill: metric.color }}
                      activeDot={{ r: 5, fill: metric.color }} name="Diastolic" />
                  </AreaChart>
                ) : (
                  <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`lg-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={metric.color} stopOpacity={0.22} />
                        <stop offset="95%" stopColor={metric.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--line-raw)" strokeOpacity={0.5} strokeDasharray="3 3" />
                    {/* Filled normal range band */}
                    <ReferenceArea y1={range.min} y2={range.max} fill={metric.color} fillOpacity={0.07}
                      stroke={metric.color} strokeOpacity={0.2} strokeWidth={1} />
                    {range.spikeAbove && (
                      <ReferenceLine y={range.spikeAbove} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.7}
                        label={{ value: 'Alert', fontSize: 9, fill: '#ef4444', position: 'insideTopRight' }} />
                    )}
                    <ReferenceLine y={range.min} stroke={metric.color} strokeDasharray="4 4" strokeOpacity={0.4}
                      label={{ value: `Min ${range.min}`, fontSize: 9, fill: metric.color, position: 'insideTopLeft' }} />
                    <ReferenceLine y={range.max} stroke={metric.color} strokeDasharray="4 4" strokeOpacity={0.4}
                      label={{ value: `Max ${range.max}`, fontSize: 9, fill: metric.color, position: 'insideTopLeft' }} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--fg3-raw)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--fg3-raw)' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--card-raw)', border: '1px solid var(--line-raw)', borderRadius: 10, fontSize: 12 }}
                      formatter={(v: any) => [`${v} ${range.unit}`, metric.label]}
                    />
                    <Area type="monotone" dataKey="value" stroke={metric.color} strokeWidth={2.5}
                      fill={`url(#lg-${activeMetric})`}
                      dot={{ r: 4, fill: metric.color, stroke: 'var(--card-raw)', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: metric.color }} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Spike alerts */}
          {spikes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-risk-hi" />
                <h3 className="text-[14px] font-semibold text-fg">Anomaly Detection</h3>
                <span className="text-[10.5px] text-fg3">({spikes.length} flagged)</span>
              </div>
              <div className="space-y-2">
                {spikes.slice(-5).reverse().map(s => (
                  <SpikeCard key={s.id} reading={s} metric={metric} />
                ))}
              </div>
            </div>
          )}

          {/* 7-day bar chart */}
          <div className="rounded-2xl border border-line bg-card p-5">
            <h3 className="text-[14px] font-semibold text-fg mb-4">7-Day Average Trend</h3>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="var(--line-raw)" strokeOpacity={0.4} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--fg3-raw)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--fg3-raw)' }} tickLine={false} axisLine={false} />
                  <ReferenceLine y={range.min} stroke={metric.color} strokeDasharray="3 3" strokeOpacity={0.5} />
                  <ReferenceLine y={range.max} stroke={metric.color} strokeDasharray="3 3" strokeOpacity={0.5} />
                  <Tooltip
                    contentStyle={{ background: 'var(--card-raw)', border: '1px solid var(--line-raw)', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: any) => v !== null ? [`${v} ${range.unit}`, 'Average'] : ['No data', '']}
                  />
                  <Bar dataKey="avg" fill={metric.color} fillOpacity={0.8} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Reading log */}
          <div className="rounded-2xl border border-line bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <span className="text-[13px] font-semibold text-fg">Reading History</span>
              <span className="text-[11px] text-fg3">{readings.length} entries</span>
            </div>
            <div className="divide-y divide-line max-h-64 overflow-y-auto">
              {[...readings].reverse().map(r => {
                const status = healthStore.getVitalStatus(activeMetric, r.value);
                const cfg    = STATUS_CFG[status];
                return (
                  <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-card2 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                      <div>
                        <div className="text-[13px] font-semibold text-fg">
                          {activeMetric === 'bloodPressure'
                            ? `${r.systolicVal}/${r.diastolicVal} ${range.unit}`
                            : `${r.value} ${range.unit}`}
                          {r.state && <span className="ml-2 text-[10px] text-fg3 font-normal">({r.state})</span>}
                        </div>
                        {r.note && <div className="text-[11px] text-fg3 italic">{r.note}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-fg3">{fmt(r.timestamp)}</span>
                      <button onClick={() => handleDelete(r.id)} className="text-fg3 hover:text-risk-hi transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {showModal && (
        <AddModal metric={metric} onAdd={handleAdd} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
};
