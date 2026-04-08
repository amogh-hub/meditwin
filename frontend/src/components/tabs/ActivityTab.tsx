import React, { useState, useCallback } from 'react';
import { Footprints, Dumbbell, Plus, Trash2, Flame, Clock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from 'recharts';
import { healthStore, type WorkoutEntry, type DailySteps, type WorkoutType } from '../../lib/healthStore';

const WORKOUT_TYPES: { id: WorkoutType; label: string; emoji: string; color: string }[] = [
  { id: 'strength', label: 'Strength',    emoji: '🏋️', color: '#ef4444' },
  { id: 'cardio',   label: 'Cardio',      emoji: '🏃', color: '#f59e0b' },
  { id: 'yoga',     label: 'Yoga',        emoji: '🧘', color: '#10b981' },
  { id: 'hiit',     label: 'HIIT',        emoji: '⚡', color: '#8b5cf6' },
  { id: 'sport',    label: 'Sport',       emoji: '⚽', color: '#3b82f6' },
  { id: 'walking',  label: 'Walking',     emoji: '🚶', color: '#22c55e' },
  { id: 'other',    label: 'Other',       emoji: '🏅', color: '#6b7280' },
];

const STEP_GOAL = 10000;
const STEP_COLORS = (s: number) => s >= STEP_GOAL ? '#22c55e' : s >= 7000 ? '#f59e0b' : '#6b7280';

// ── Progress Ring ───────────────────────────────────────────

const StepsRing: React.FC<{ steps: number; goal?: number }> = ({ steps, goal = STEP_GOAL }) => {
  const pct    = Math.min(steps / goal, 1);
  const r      = 44; const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const color  = STEP_COLORS(steps);
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
          {steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : steps}
        </span>
        <span className="text-[9px] text-fg3 uppercase tracking-widest mt-0.5">steps</span>
      </div>
    </div>
  );
};

// ── Add Workout Modal ────────────────────────────────────────

const WorkoutModal: React.FC<{ onAdd: (w: Omit<WorkoutEntry, 'id'>) => void; onClose: () => void }> = ({ onAdd, onClose }) => {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10),
    type: 'cardio' as WorkoutType, duration: 30, calories: 200, avgHR: '', steps: '', note: '' });
  const up = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));
  const submit = () => { onAdd({ ...form, avgHR: +form.avgHR || undefined, steps: +form.steps || undefined }); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-6 space-y-4 shadow-2xl">
        <h3 className="text-[15px] font-semibold text-fg flex items-center gap-2">
          <Dumbbell className="w-4.5 h-4.5 text-accent" /> Log Workout
        </h3>
        <div>
          <label className="text-[10px] uppercase tracking-widest font-semibold text-fg3 mb-2 block">Type</label>
          <div className="flex flex-wrap gap-2">
            {WORKOUT_TYPES.map(t => (
              <button key={t.id} onClick={() => up('type', t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium border transition-all ${
                  form.type === t.id ? 'border-transparent text-white' : 'border-line text-fg2 hover:bg-card2'
                }`}
                style={form.type === t.id ? { background: t.color } : undefined}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest font-semibold text-fg3 mb-1.5 block">Date</label>
            <input type="date" value={form.date} onChange={e => up('date', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-line bg-bg text-[13px] text-fg focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-semibold text-fg3 mb-1.5 block">Duration (min)</label>
            <input type="number" value={form.duration} onChange={e => up('duration', +e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-line bg-bg text-[13px] text-fg focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-semibold text-fg3 mb-1.5 block">Calories</label>
            <input type="number" value={form.calories} onChange={e => up('calories', +e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-line bg-bg text-[13px] text-fg focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-semibold text-fg3 mb-1.5 block">Avg HR (bpm)</label>
            <input type="number" value={form.avgHR} onChange={e => up('avgHR', e.target.value)} placeholder="Optional"
              className="w-full px-3 py-2.5 rounded-xl border border-line bg-bg text-[13px] text-fg focus:outline-none focus:border-accent" />
          </div>
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

// ── Add Steps Modal ──────────────────────────────────────────

const StepsModal: React.FC<{ onAdd: (s: Omit<DailySteps, 'id'>) => void; onClose: () => void }> = ({ onAdd, onClose }) => {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [steps, setSteps] = useState('');
  const [cal, setCal] = useState('');
  const submit = () => { onAdd({ date, steps: +steps, activeCalories: +cal || 0 }); onClose(); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-xs rounded-2xl border border-line bg-card p-6 space-y-4 shadow-2xl">
        <h3 className="text-[15px] font-semibold text-fg flex items-center gap-2"><Footprints className="w-4.5 h-4.5 text-green-500" /> Log Steps</h3>
        <div>
          <label className="text-[10px] uppercase tracking-widest font-semibold text-fg3 mb-1.5 block">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-line bg-bg text-[13px] text-fg focus:outline-none focus:border-accent" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest font-semibold text-fg3 mb-1.5 block">Steps</label>
          <input type="number" value={steps} onChange={e => setSteps(e.target.value)} placeholder="8500"
            className="w-full px-3 py-2.5 rounded-xl border border-line bg-bg text-[14px] text-fg focus:outline-none focus:border-accent" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest font-semibold text-fg3 mb-1.5 block">Active Calories</label>
          <input type="number" value={cal} onChange={e => setCal(e.target.value)} placeholder="320 (optional)"
            className="w-full px-3 py-2.5 rounded-xl border border-line bg-bg text-[13px] text-fg focus:outline-none focus:border-accent" />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-line text-fg2 text-[13px] font-medium hover:bg-card2">Cancel</button>
          <button onClick={submit} className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-[13px] font-semibold hover:opacity-90">Save</button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────

export const ActivityTab: React.FC = () => {
  const [modal, setModal]     = useState<'workout' | 'steps' | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [stepsData, setStepsData] = useState<DailySteps[]>([]);

  const reload = useCallback(() => {
    setWorkouts(healthStore.getWorkouts().sort((a, b) => b.date.localeCompare(a.date)));
    setStepsData(healthStore.getDailySteps().sort((a, b) => b.date.localeCompare(a.date)));
  }, []);

  React.useEffect(() => { reload(); }, [reload]);

  const todaySteps = stepsData.find(s => s.date === new Date().toISOString().slice(0, 10));
  const totalCalories = workouts.reduce((s, w) => s + w.calories, 0);

  const weekSteps = healthStore.getLast7Days().map(date => {
    const found = stepsData.find(s => s.date === date);
    return { day: new Date(date).toLocaleDateString([], { weekday: 'short' }), steps: found?.steps ?? null };
  });

  const hasData = workouts.length > 0 || stepsData.length > 0;

  if (!hasData) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 gap-5">
          <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Footprints className="w-8 h-8 text-green-600" />
          </div>
          <div className="text-center space-y-1.5">
            <h3 className="text-[17px] font-semibold font-grotesk text-fg">No activity logged yet</h3>
            <p className="text-[13px] text-fg2 max-w-xs leading-relaxed">Track your steps and workouts to monitor activity trends and recovery patterns.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setModal('steps')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white font-semibold text-[13px] hover:opacity-90 shadow-lg shadow-green-500/25">
              <Footprints className="w-4 h-4" /> Log Steps
            </button>
            <button onClick={() => setModal('workout')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-semibold text-[13px] hover:opacity-90">
              <Dumbbell className="w-4 h-4" /> Log Workout
            </button>
          </div>
        </div>
        {modal === 'workout' && <WorkoutModal onAdd={w => { healthStore.addWorkout(w); reload(); }} onClose={() => setModal(null)} />}
        {modal === 'steps'   && <StepsModal   onAdd={s => { healthStore.addDailySteps(s); reload(); }} onClose={() => setModal(null)} />}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-grotesk text-fg tracking-tight">Activity</h2>
        <div className="flex gap-2">
          <button onClick={() => setModal('steps')} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-line bg-card text-[12px] font-medium text-fg2 hover:bg-card2 transition-colors">
            <Footprints className="w-3.5 h-3.5" /> Log Steps
          </button>
          <button onClick={() => setModal('workout')} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-white text-[12px] font-medium hover:opacity-90">
            <Plus className="w-3.5 h-3.5" /> Log Workout
          </button>
        </div>
      </div>

      {/* Today's steps + stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-line bg-card p-5 flex flex-col items-center gap-3">
          <StepsRing steps={todaySteps?.steps ?? 0} />
          <div className="text-center">
            <div className="text-[12px] font-semibold text-fg3 uppercase tracking-[0.1em]">Today's Goal</div>
            <div className="text-[11px] text-fg3">{STEP_GOAL.toLocaleString()} steps</div>
          </div>
        </div>
        {[
          { label: 'Workouts Logged', value: workouts.length, icon: Dumbbell, color: '#6366f1' },
          { label: 'Total Calories Burned', value: totalCalories.toLocaleString(), icon: Flame, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-line bg-card p-5 flex flex-col justify-between">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.color + '18' }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <div>
              <div className="text-[34px] font-bold font-grotesk text-fg leading-tight">{s.value}</div>
              <div className="text-[11px] text-fg3 uppercase tracking-[0.1em] mt-0.5">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Weekly steps chart */}
      <div className="rounded-2xl border border-line bg-card p-5">
        <h3 className="text-[14px] font-semibold text-fg mb-4">7-Day Step Count</h3>
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekSteps} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="var(--line-raw)" strokeOpacity={0.4} strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--fg3-raw)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--fg3-raw)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: 'var(--card-raw)', border: '1px solid var(--line-raw)', borderRadius: 10, fontSize: 12 }}
                formatter={((v: unknown) => v != null ? [(Number(v)).toLocaleString(), 'Steps'] : ['No data', '']) as any} />
              <Bar dataKey="steps" radius={[6, 6, 0, 0]}>
                {weekSteps.map((d, i) => (
                  <Cell key={i} fill={d.steps === null ? 'var(--card2-raw)' : STEP_COLORS(d.steps)} fillOpacity={d.steps === null ? 0.3 : 0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Workout log */}
      <div className="rounded-2xl border border-line bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <span className="text-[13px] font-semibold text-fg">Workout Log</span>
        </div>
        {workouts.length === 0 ? (
          <div className="p-8 text-center text-fg3 text-[13px]">No workouts yet — log your first session</div>
        ) : (
          <div className="divide-y divide-line">
            {workouts.slice(0, 20).map(w => {
              const cfg = WORKOUT_TYPES.find(t => t.id === w.type) ?? WORKOUT_TYPES[6];
              return (
                <div key={w.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-card2 transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: cfg.color + '18' }}>
                    {cfg.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-fg">{cfg.label}</div>
                    {w.note && <div className="text-[11px] text-fg3 truncate">{w.note}</div>}
                  </div>
                  <div className="flex items-center gap-4 text-fg3 text-[11.5px]">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{w.duration}m</span>
                    <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" />{w.calories} kcal</span>
                    {w.avgHR && <span className="flex items-center gap-1">♥ {w.avgHR} bpm</span>}
                    <span>{new Date(w.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <button onClick={() => { healthStore.deleteWorkout(w.id); reload(); }} className="text-fg3 hover:text-risk-hi transition-colors ml-2">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal === 'workout' && <WorkoutModal onAdd={w => { healthStore.addWorkout(w); reload(); }} onClose={() => setModal(null)} />}
      {modal === 'steps'   && <StepsModal   onAdd={s => { healthStore.addDailySteps(s); reload(); }} onClose={() => setModal(null)} />}
    </div>
  );
};
