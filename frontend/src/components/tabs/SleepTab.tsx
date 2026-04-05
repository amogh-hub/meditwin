import React, { useState, useCallback } from 'react';
import { Moon, Plus, Trash2, Star, AlertCircle, Clock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Cell,
} from 'recharts';
import { healthStore, type SleepEntry } from '../../lib/healthStore';

const QUALITY_COLOR = (q: number) =>
  q >= 75 ? '#22c55e' : q >= 50 ? '#f59e0b' : '#ef4444';

const QUALITY_LABEL = (q: number) =>
  q >= 75 ? 'Good' : q >= 50 ? 'Fair' : 'Poor';

// ── Quality Ring ────────────────────────────────────────────

const QualityRing: React.FC<{ score: number }> = ({ score }) => {
  const r = 44; const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = QUALITY_COLOR(score);
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--line-raw)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[24px] font-bold font-grotesk leading-none" style={{ color }}>{score}</span>
        <span className="text-[9px] text-fg3 uppercase tracking-widest mt-0.5">/ 100</span>
      </div>
    </div>
  );
};

// ── Stage Waterfall Chart ───────────────────────────────────

const StageWaterfall: React.FC<{ entry: SleepEntry }> = ({ entry }) => {
  const total = entry.duration || 1;
  const stages = [
    { label: 'Deep',  min: entry.deepMin,  color: '#6366f1', pct: (entry.deepMin / total * 100).toFixed(0) },
    { label: 'REM',   min: entry.remMin,   color: '#8b5cf6', pct: (entry.remMin  / total * 100).toFixed(0) },
    { label: 'Light', min: entry.lightMin, color: '#a78bfa', pct: (entry.lightMin/ total * 100).toFixed(0) },
    { label: 'Awake', min: entry.awakeMin, color: '#e4e4e7', pct: (entry.awakeMin/ total * 100).toFixed(0) },
  ];
  return (
    <div className="space-y-1.5">
      {stages.map(s => (
        <div key={s.label} className="flex items-center gap-3">
          <span className="text-[10px] text-fg3 w-10 text-right">{s.label}</span>
          <div className="flex-1 h-4 bg-card2 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${s.pct}%`, background: s.color }} />
          </div>
          <span className="text-[10px] text-fg2 w-12">{s.min}m ({s.pct}%)</span>
        </div>
      ))}
    </div>
  );
};

// ── Add Sleep Modal ─────────────────────────────────────────

const AddModal: React.FC<{ onAdd: (e: Omit<SleepEntry, 'id' | 'quality'>) => void; onClose: () => void }> = ({ onAdd, onClose }) => {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    bedtime: '22:30', wakeTime: '06:30',
    deepMin: 90, remMin: 105, lightMin: 180, awakeMin: 15, note: '',
  });

  const duration = (() => {
    try {
      const [bh, bm] = form.bedtime.split(':').map(Number);
      const [wh, wm] = form.wakeTime.split(':').map(Number);
      const bed = bh * 60 + bm; const wake = wh * 60 + wm;
      return wake > bed ? wake - bed : (24 * 60 - bed) + wake;
    } catch { return form.deepMin + form.remMin + form.lightMin + form.awakeMin; }
  })();

  const up = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const submit = () => {
    onAdd({ ...form, duration });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-6 space-y-4 shadow-2xl">
        <h3 className="text-[15px] font-semibold text-fg flex items-center gap-2">
          <Moon className="w-4.5 h-4.5 text-violet-500" /> Log Sleep
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['date',     'Date',      'date'],
            ['bedtime',  'Bedtime',   'time'],
            ['wakeTime', 'Wake Time', 'time'],
          ].map(([k, label, type]) => (
            <div key={k} className={k === 'date' ? 'col-span-2' : ''}>
              <label className="text-[10px] uppercase tracking-widest font-semibold text-fg3 mb-1.5 block">{label}</label>
              <input type={type} value={(form as any)[k]} onChange={e => up(k, e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-line bg-bg text-[13px] text-fg focus:outline-none focus:border-accent" />
            </div>
          ))}
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest font-semibold text-fg3 mb-2 block">
            Sleep Stages (minutes)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['deepMin', 'Deep Sleep',  '#6366f1'],
              ['remMin',  'REM',         '#8b5cf6'],
              ['lightMin','Light Sleep', '#a78bfa'],
              ['awakeMin','Awake',       '#9ca3af'],
            ].map(([k, label, color]) => (
              <div key={k}>
                <label className="text-[10px] text-fg3 mb-1 block flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                  {label}
                </label>
                <input type="number" min="0" value={(form as any)[k]} onChange={e => up(k, +e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-line bg-bg text-[13px] text-fg focus:outline-none focus:border-accent" />
              </div>
            ))}
          </div>
          <p className="text-[10.5px] text-fg3 mt-2">Total: {duration} min ({(duration / 60).toFixed(1)}h)</p>
        </div>
        <input value={form.note} onChange={e => up('note', e.target.value)} placeholder="Note (optional)"
          className="w-full px-3 py-2.5 rounded-xl border border-line bg-bg text-[13px] text-fg focus:outline-none focus:border-accent" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-line text-fg2 text-[13px] font-medium hover:bg-card2">Cancel</button>
          <button onClick={submit} className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-[13px] font-semibold hover:opacity-90">Save</button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────

export const SleepTab: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const reload = useCallback(() => {
    const data = healthStore.getSleep().sort((a, b) => b.date.localeCompare(a.date));
    setEntries(data);
    if (data.length && !selected) setSelected(data[0].id);
  }, [selected]);

  React.useEffect(() => { reload(); }, [reload]);

  const handleAdd = (e: Omit<SleepEntry, 'id' | 'quality'>) => {
    healthStore.addSleep(e); reload();
  };

  const handleDelete = (id: string) => {
    healthStore.deleteSleep(id);
    setSelected(null);
    reload();
  };

  const last7 = healthStore.getLast7Days().map(date => {
    const e = entries.find(en => en.date === date);
    return {
      day:      new Date(date).toLocaleDateString([], { weekday: 'short' }),
      duration: e ? +(e.duration / 60).toFixed(1) : null,
      quality:  e?.quality ?? null,
    };
  });

  // Weekly avg
  const avgDuration = entries.length
    ? (entries.slice(0, 7).reduce((s, e) => s + e.duration, 0) / Math.min(entries.length, 7) / 60).toFixed(1)
    : null;

  const selectedEntry = entries.find(e => e.id === selected);

  if (entries.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 gap-5">
          <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Moon className="w-8 h-8 text-violet-500" />
          </div>
          <div className="text-center space-y-1.5">
            <h3 className="text-[17px] font-semibold font-grotesk text-fg">No sleep data yet</h3>
            <p className="text-[13px] text-fg2 max-w-xs leading-relaxed">
              Log your first night's sleep to start tracking stage distribution, quality scores, and weekly trends.
            </p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 text-white font-semibold text-[13px]
              hover:opacity-90 shadow-lg shadow-violet-500/25">
            <Plus className="w-4 h-4" /> Log Last Night
          </button>
        </div>
        {showModal && <AddModal onAdd={handleAdd} onClose={() => setShowModal(false)} />}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-grotesk text-fg tracking-tight">Sleep Tracking</h2>
          {avgDuration && <p className="text-[13px] text-fg3 mt-0.5">7-day avg: {avgDuration}h/night</p>}
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-[12.5px] font-semibold hover:opacity-90">
          <Plus className="w-3.5 h-3.5" /> Log Night
        </button>
      </div>

      {/* 7-day bar + quality */}
      <div className="rounded-2xl border border-line bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-semibold text-fg">Weekly Sleep Duration</h3>
          <span className="text-[10.5px] text-fg3">Optimal: 7–9h · WHO guideline</span>
        </div>
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--line-raw)" strokeOpacity={0.4} strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--fg3-raw)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--fg3-raw)' }} tickLine={false} axisLine={false} domain={[0, 10]} />
              <ReferenceLine y={7}  stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.7} label={{ value: 'Min 7h', fontSize: 9, fill: '#22c55e' }} />
              <ReferenceLine y={9}  stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'Max 9h', fontSize: 9, fill: '#22c55e' }} />
              <Tooltip contentStyle={{ background: 'var(--card-raw)', border: '1px solid var(--line-raw)', borderRadius: 10, fontSize: 12 }}
                formatter={(v: number) => v !== null ? [`${v}h`, 'Duration'] : ['No data', '']} />
              <Bar dataKey="duration" radius={[6, 6, 0, 0]}>
                {last7.map((d, i) => (
                  <Cell key={i} fill={
                    d.duration === null ? 'var(--card2-raw)'
                    : d.duration < 6 ? '#ef4444'
                    : d.duration < 7 ? '#f59e0b'
                    : '#8b5cf6'
                  } fillOpacity={d.duration === null ? 0.3 : 0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Entry detail + list */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* List */}
        <div className="lg:col-span-2 rounded-2xl border border-line bg-card overflow-hidden">
          <div className="px-4 py-3.5 border-b border-line">
            <span className="text-[13px] font-semibold text-fg">All Nights</span>
          </div>
          <div className="divide-y divide-line max-h-[360px] overflow-y-auto">
            {entries.map(e => (
              <button key={e.id} onClick={() => setSelected(e.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                  selected === e.id ? 'bg-violet-50 dark:bg-violet-950/30' : 'hover:bg-card2'
                }`}>
                <div>
                  <div className="text-[12.5px] font-medium text-fg">
                    {new Date(e.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-[11px] text-fg3">{(e.duration / 60).toFixed(1)}h</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: QUALITY_COLOR(e.quality) + '22', color: QUALITY_COLOR(e.quality) }}>
                    {e.quality}
                  </span>
                  <button onClick={ev => { ev.stopPropagation(); handleDelete(e.id); }}
                    className="text-fg3 hover:text-risk-hi transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected entry detail */}
        {selectedEntry && (
          <div className="lg:col-span-3 space-y-4">
            {/* Quality ring */}
            <div className="rounded-2xl border border-line bg-card p-5 flex items-center gap-6">
              <QualityRing score={selectedEntry.quality} />
              <div className="space-y-1">
                <div className="text-[12px] text-fg3 uppercase tracking-[0.12em] font-semibold">Sleep Quality</div>
                <div className="text-[22px] font-bold font-grotesk text-fg leading-tight">
                  {QUALITY_LABEL(selectedEntry.quality)}
                </div>
                <div className="text-[13px] text-fg2">{(selectedEntry.duration / 60).toFixed(1)}h total sleep</div>
                <div className="text-[11px] text-fg3">{selectedEntry.bedtime} → {selectedEntry.wakeTime}</div>
              </div>
            </div>

            {/* Stage breakdown */}
            <div className="rounded-2xl border border-line bg-card p-5">
              <h3 className="text-[13px] font-semibold text-fg mb-4">Stage Breakdown</h3>
              <StageWaterfall entry={selectedEntry} />
              <div className="mt-3 p-3 rounded-xl bg-bg text-[11.5px] text-fg2 leading-relaxed">
                <strong className="text-fg">Optimal:</strong> Deep 20% · REM 25% · Light 50% · Awake &lt;5%
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && <AddModal onAdd={handleAdd} onClose={() => setShowModal(false)} />}
    </div>
  );
};
