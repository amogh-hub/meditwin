import React, { useState, useCallback } from 'react';
import { Monitor, Droplets, Plus, AlertTriangle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, PieChart, Pie,
} from 'recharts';
import { healthStore, type LifestyleEntry } from '../../lib/healthStore';

const WATER_TARGET  = 2000; // ml
const SCREEN_LIMIT  = 120;  // minutes recommended max recreational

const WATER_COLOR = (ml: number) =>
  ml >= WATER_TARGET ? '#3b82f6' : ml >= WATER_TARGET * 0.6 ? '#f59e0b' : '#ef4444';

// ── Water Ring ──────────────────────────────────────────────

const WaterRing: React.FC<{ ml: number; target?: number }> = ({ ml, target = WATER_TARGET }) => {
  const pct    = Math.min(ml / target, 1);
  const r      = 44; const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const color  = WATER_COLOR(ml);
  return (
    <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--line-raw)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[22px] font-bold font-grotesk leading-none" style={{ color }}>
          {ml >= 1000 ? `${(ml / 1000).toFixed(1)}L` : `${ml}ml`}
        </span>
        <span className="text-[9px] text-fg3 uppercase tracking-widest mt-0.5">/ {target / 1000}L</span>
      </div>
    </div>
  );
};

// ── Add Lifestyle Modal ─────────────────────────────────────

const AddModal: React.FC<{ onAdd: (e: Omit<LifestyleEntry, 'id'>) => void; onClose: () => void }> = ({ onAdd, onClose }) => {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    screenTime: '', social: '', productive: '', entertainment: '',
    waterIntake: '', note: '',
  });
  const up = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const submit = () => {
    if (!form.screenTime && !form.waterIntake) return;
    onAdd({
      date: form.date,
      screenTime:       +form.screenTime    || 0,
      socialMin:        +form.social        || undefined,
      productiveMin:    +form.productive    || undefined,
      entertainmentMin: +form.entertainment || undefined,
      waterIntake:      +form.waterIntake   || 0,
      note:             form.note || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-6 space-y-4 shadow-2xl">
        <h3 className="text-[15px] font-semibold text-fg">Log Lifestyle</h3>
        <div>
          <label className="text-[10px] uppercase tracking-widest font-semibold text-fg3 mb-1.5 block">Date</label>
          <input type="date" value={form.date} onChange={e => up('date', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-line bg-bg text-[13px] text-fg focus:outline-none focus:border-accent" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest font-semibold text-fg3 mb-2 block">Screen Time (minutes)</label>
          <input type="number" value={form.screenTime} onChange={e => up('screenTime', e.target.value)} placeholder="Total screen time"
            className="w-full px-3 py-2.5 rounded-xl border border-line bg-bg text-[13px] text-fg focus:outline-none focus:border-accent mb-2" />
          <div className="grid grid-cols-3 gap-2">
            {[['social','Social'],['productive','Work'],['entertainment','Entertainment']].map(([k,label]) => (
              <div key={k}>
                <label className="text-[10px] text-fg3 mb-1 block">{label} (min)</label>
                <input type="number" value={(form as any)[k]} onChange={e => up(k, e.target.value)} placeholder="0"
                  className="w-full px-2.5 py-2 rounded-xl border border-line bg-bg text-[12px] text-fg focus:outline-none focus:border-accent" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest font-semibold text-fg3 mb-1.5 block">Water Intake (ml)</label>
          <input type="number" value={form.waterIntake} onChange={e => up('waterIntake', e.target.value)} placeholder="e.g. 1500"
            className="w-full px-3 py-2.5 rounded-xl border border-line bg-bg text-[13px] text-fg focus:outline-none focus:border-accent" />
        </div>
        <input value={form.note} onChange={e => up('note', e.target.value)} placeholder="Note (optional)"
          className="w-full px-3 py-2.5 rounded-xl border border-line bg-bg text-[13px] text-fg focus:outline-none focus:border-accent" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-line text-fg2 text-[13px] font-medium hover:bg-card2">Cancel</button>
          <button onClick={submit} className="flex-1 py-2.5 rounded-xl bg-accent text-white text-[13px] font-semibold hover:opacity-90">Save</button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────

export const LifestyleTab: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [entries, setEntries]     = useState<LifestyleEntry[]>([]);

  const reload = useCallback(() => {
    setEntries(healthStore.getLifestyle().sort((a, b) => b.date.localeCompare(a.date)));
  }, []);
  React.useEffect(() => { reload(); }, [reload]);

  const todayStr   = new Date().toISOString().slice(0, 10);
  const todayEntry = entries.find(e => e.date === todayStr);

  const weekWater = healthStore.getLast7Days().map(date => {
    const e = entries.find(en => en.date === date);
    return { day: new Date(date).toLocaleDateString([], { weekday: 'short' }), water: e?.waterIntake ?? null };
  });

  const weekScreen = healthStore.getLast7Days().map(date => {
    const e = entries.find(en => en.date === date);
    return { day: new Date(date).toLocaleDateString([], { weekday: 'short' }), screen: e?.screenTime ?? null };
  });

  const screenPieData = todayEntry && (todayEntry.socialMin || todayEntry.productiveMin || todayEntry.entertainmentMin)
    ? [
        { name: 'Social',        value: todayEntry.socialMin        ?? 0, color: '#f43f5e' },
        { name: 'Productive',    value: todayEntry.productiveMin    ?? 0, color: '#22c55e' },
        { name: 'Entertainment', value: todayEntry.entertainmentMin ?? 0, color: '#8b5cf6' },
      ].filter(d => d.value > 0)
    : null;

  const dehydrated = todayEntry && todayEntry.waterIntake < WATER_TARGET * 0.5;

  if (entries.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 gap-5">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Droplets className="w-8 h-8 text-blue-500" />
          </div>
          <div className="text-center space-y-1.5">
            <h3 className="text-[17px] font-semibold font-grotesk text-fg">No lifestyle data yet</h3>
            <p className="text-[13px] text-fg2 max-w-xs leading-relaxed">Track your screen time and water intake to understand their impact on your health.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold text-[13px] hover:opacity-90 shadow-lg shadow-blue-500/25">
            <Plus className="w-4 h-4" /> Log Today
          </button>
        </div>
        {showModal && <AddModal onAdd={e => { healthStore.addLifestyle(e); reload(); }} onClose={() => setShowModal(false)} />}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-grotesk text-fg tracking-tight">Lifestyle</h2>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-[12.5px] font-semibold hover:opacity-90">
          <Plus className="w-3.5 h-3.5" /> Log Day
        </button>
      </div>

      {/* Dehydration alert */}
      {dehydrated && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-risk-hi-muted border border-risk-hi-muted">
          <AlertTriangle className="w-4.5 h-4.5 text-risk-hi shrink-0" />
          <p className="text-[13px] text-fg">
            <strong className="text-risk-hi">Dehydration risk:</strong> Today's intake ({todayEntry.waterIntake}ml) is below 50% of the recommended {WATER_TARGET}ml.
          </p>
        </div>
      )}

      {/* Today's snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Water */}
        <div className="rounded-2xl border border-line bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Droplets className="w-4 h-4 text-blue-500" />
            <h3 className="text-[13px] font-semibold text-fg">Today's Hydration</h3>
          </div>
          <WaterRing ml={todayEntry?.waterIntake ?? 0} />
          <p className="text-center text-[11px] text-fg3 mt-3">Target: {WATER_TARGET / 1000}L / day</p>
        </div>

        {/* Screen time + pie */}
        <div className="rounded-2xl border border-line bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Monitor className="w-4 h-4 text-purple-500" />
            <h3 className="text-[13px] font-semibold text-fg">Today's Screen Time</h3>
          </div>
          {todayEntry ? (
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-[32px] font-bold font-grotesk text-fg leading-tight">
                  {todayEntry.screenTime >= 60
                    ? `${Math.floor(todayEntry.screenTime / 60)}h ${todayEntry.screenTime % 60}m`
                    : `${todayEntry.screenTime}m`}
                </div>
                <div className={`text-[11px] font-semibold mt-1 ${todayEntry.screenTime > SCREEN_LIMIT * 3 ? 'text-risk-hi' : 'text-fg3'}`}>
                  {todayEntry.screenTime > SCREEN_LIMIT * 3 ? 'High usage' : 'Moderate usage'}
                </div>
              </div>
              {screenPieData && (
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={screenPieData} cx="50%" cy="50%" innerRadius={26} outerRadius={44} dataKey="value" strokeWidth={0}>
                          {screenPieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5">
                    {screenPieData.map(d => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        <span className="text-[11px] text-fg2">{d.name}</span>
                        <span className="text-[11px] font-semibold text-fg">{d.value}m</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center text-fg3 text-[13px]">No entry today</div>
          )}
        </div>
      </div>

      {/* Weekly water */}
      <div className="rounded-2xl border border-line bg-card p-5">
        <h3 className="text-[14px] font-semibold text-fg mb-4">7-Day Water Intake</h3>
        <div className="h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekWater} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="var(--line-raw)" strokeOpacity={0.4} strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--fg3-raw)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--fg3-raw)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: 'var(--card-raw)', border: '1px solid var(--line-raw)', borderRadius: 10, fontSize: 12 }}
                formatter={((v: unknown) => v != null ? [`${(Number(v) / 1000).toFixed(1)}L`, 'Water'] : ['No data', '']) as any} />
              <Bar dataKey="water" radius={[6, 6, 0, 0]}>
                {weekWater.map((d, i) => (
                  <Cell key={i} fill={d.water === null ? 'var(--card2-raw)' : WATER_COLOR(d.water)} fillOpacity={d.water === null ? 0.3 : 0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly screen */}
      <div className="rounded-2xl border border-line bg-card p-5">
        <h3 className="text-[14px] font-semibold text-fg mb-4">7-Day Screen Time</h3>
        <div className="h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekScreen} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="var(--line-raw)" strokeOpacity={0.4} strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--fg3-raw)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--fg3-raw)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: 'var(--card-raw)', border: '1px solid var(--line-raw)', borderRadius: 10, fontSize: 12 }}
                formatter={((v: unknown) => v != null ? [`${Math.floor(Number(v)/60)}h ${Number(v)%60}m`, 'Screen Time'] : ['No data', '']) as any} />
              <Bar dataKey="screen" radius={[6, 6, 0, 0]}>
                {weekScreen.map((d, i) => (
                  <Cell key={i} fill={
                    d.screen === null ? 'var(--card2-raw)'
                    : d.screen > SCREEN_LIMIT * 4 ? '#ef4444'
                    : d.screen > SCREEN_LIMIT * 2 ? '#f59e0b'
                    : '#8b5cf6'
                  } fillOpacity={d.screen === null ? 0.3 : 0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {showModal && <AddModal onAdd={e => { healthStore.addLifestyle(e); reload(); }} onClose={() => setShowModal(false)} />}
    </div>
  );
};
