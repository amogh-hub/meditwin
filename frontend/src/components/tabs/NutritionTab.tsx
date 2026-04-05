import React, { useState, useCallback } from 'react';
import { Apple, Plus, Trash2, Zap } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { healthStore, type NutritionEntry, type MealType } from '../../lib/healthStore';

const MEAL_CFG: Record<MealType, { label: string; emoji: string; color: string }> = {
  breakfast: { label: 'Breakfast', emoji: '🌅', color: '#f59e0b' },
  lunch:     { label: 'Lunch',     emoji: '☀️',  color: '#10b981' },
  dinner:    { label: 'Dinner',    emoji: '🌙', color: '#6366f1' },
  snack:     { label: 'Snack',     emoji: '🍎', color: '#f43f5e' },
};

const MACRO_COLORS = { protein: '#ef4444', carbs: '#f59e0b', fat: '#8b5cf6' };
const TARGETS = { calories: 2000, protein: 130, carbs: 250, fat: 65, fiber: 30, sugar: 50 };

// ── Macro Ring ──────────────────────────────────────────────

const MacroRings: React.FC<{ protein: number; carbs: number; fat: number }> = ({ protein, carbs, fat }) => {
  const total = protein * 4 + carbs * 4 + fat * 9;
  const hasData = total > 0;
  const data = [
    { name: 'Protein', value: protein * 4, grams: protein, color: MACRO_COLORS.protein },
    { name: 'Carbs',   value: carbs * 4,   grams: carbs,   color: MACRO_COLORS.carbs   },
    { name: 'Fat',     value: fat * 9,     grams: fat,     color: MACRO_COLORS.fat     },
  ];

  if (!hasData) {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="w-24 h-24 rounded-full border-4 border-dashed border-line flex items-center justify-center">
          <span className="text-3xl">🥗</span>
        </div>
        <p className="text-[12px] text-fg3 text-center">Log a meal to see your macro breakdown</p>
        <div className="flex gap-4">
          {Object.entries(MACRO_COLORS).map(([k, color]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
              <span className="text-[11px] text-fg3 capitalize">{k}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <div className="w-32 h-32 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={38} outerRadius={56}
              startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="text-[12px] text-fg2 w-16">{d.name}</span>
            <span className="text-[13px] font-semibold text-fg">{d.grams}g</span>
            <span className="text-[10.5px] text-fg3">/ {(TARGETS as any)[d.name.toLowerCase()]}g</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Add Meal Modal ──────────────────────────────────────────

const AddModal: React.FC<{ onAdd: (e: Omit<NutritionEntry, 'id'>) => void; onClose: () => void }> = ({ onAdd, onClose }) => {
  const now = new Date();
  const [form, setForm] = useState({
    date: now.toISOString().slice(0, 10),
    time: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
    meal: 'breakfast' as MealType,
    calories: '', protein: '', carbs: '', fat: '',
    sugar: '', fiber: '', sodium: '', note: '',
  });
  const up = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.calories) return;
    onAdd({
      date: form.date, time: form.time, meal: form.meal,
      calories: +form.calories, protein: +form.protein || 0,
      carbs: +form.carbs || 0, fat: +form.fat || 0,
      sugar: +form.sugar || undefined, fiber: +form.fiber || undefined,
      sodium: +form.sodium || undefined, note: form.note || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
        <h3 className="text-[15px] font-semibold text-fg flex items-center gap-2"><Apple className="w-4.5 h-4.5 text-green-500" /> Log Meal</h3>
        <div className="grid grid-cols-4 gap-2">
          {(Object.entries(MEAL_CFG) as [MealType, typeof MEAL_CFG[MealType]][]).map(([id, cfg]) => (
            <button key={id} onClick={() => up('meal', id)}
              className={`py-2.5 rounded-xl border text-center transition-all ${form.meal === id ? 'border-accent bg-accent/10' : 'border-line hover:bg-card2'}`}>
              <div className="text-base">{cfg.emoji}</div>
              <div className={`text-[10px] font-medium mt-0.5 ${form.meal === id ? 'text-accent' : 'text-fg3'}`}>{cfg.label}</div>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[['date','Date','date'],['time','Time','time']].map(([k,label,type]) => (
            <div key={k}>
              <label className="text-[10px] uppercase tracking-widest font-semibold text-fg3 mb-1.5 block">{label}</label>
              <input type={type} value={(form as any)[k]} onChange={e => up(k, e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-line bg-bg text-[13px] text-fg focus:outline-none focus:border-accent" />
            </div>
          ))}
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest font-semibold text-fg3 mb-2 block">Macros</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['calories','Calories (kcal)'],['protein','Protein (g)'],
              ['carbs','Carbs (g)'],['fat','Fat (g)'],
              ['sugar','Sugar (g)'],['fiber','Fiber (g)'],
            ].map(([k, label]) => (
              <div key={k}>
                <label className="text-[10px] text-fg3 mb-1 block">{label}</label>
                <input type="number" value={(form as any)[k]} onChange={e => up(k, e.target.value)}
                  placeholder="0" className="w-full px-3 py-2 rounded-xl border border-line bg-bg text-[13px] text-fg focus:outline-none focus:border-accent" />
              </div>
            ))}
          </div>
        </div>
        <input value={form.note} onChange={e => up('note', e.target.value)} placeholder="Note (e.g. meal name)"
          className="w-full px-3 py-2.5 rounded-xl border border-line bg-bg text-[13px] text-fg focus:outline-none focus:border-accent" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-line text-fg2 text-[13px] font-medium hover:bg-card2">Cancel</button>
          <button onClick={submit} className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-[13px] font-semibold hover:opacity-90">Save</button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────

export const NutritionTab: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [entries, setEntries]     = useState<NutritionEntry[]>([]);

  const reload = useCallback(() => {
    setEntries(healthStore.getNutrition().sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)));
  }, []);
  React.useEffect(() => { reload(); }, [reload]);

  const todayStr  = new Date().toISOString().slice(0, 10);
  const todayData = healthStore.getDayNutrition(todayStr);

  const weekData = healthStore.getLast7Days().map(date => {
    const d = healthStore.getDayNutrition(date);
    return { day: new Date(date).toLocaleDateString([], { weekday: 'short' }), calories: d.calories || null };
  });

  if (entries.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold font-grotesk text-fg tracking-tight">Nutrition & Macros</h2>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white text-[12.5px] font-semibold hover:opacity-90 press-feedback transition-all">
            <Plus className="w-3.5 h-3.5" /> Log Meal
          </button>
        </div>

        {/* Rich empty state */}
        <div className="rounded-2xl border border-line bg-card overflow-hidden animate-slide-up">
          {/* Hero section */}
          <div className="px-8 py-10 text-center border-b border-line">
            <div className="w-20 h-20 rounded-2xl bg-green-500/10 flex items-center justify-center text-4xl mx-auto mb-5">🥗</div>
            <h3 className="text-[20px] font-bold font-grotesk text-fg mb-2">Track Your Nutrition</h3>
            <p className="text-[13px] text-fg2 max-w-sm mx-auto leading-relaxed">
              Log your meals to unlock macro tracking, calorie trends, and AI-powered nutritional insights.
            </p>
          </div>

          {/* Feature preview cards */}
          <div className="grid grid-cols-3 gap-px bg-line">
            {[
              { emoji: '🍩', title: 'Macro Breakdown', desc: 'Protein, carbs & fat breakdown for every meal' },
              { emoji: '📊', title: '7-Day Trends', desc: 'Calorie intake trends across the week' },
              { emoji: '🎯', title: 'Smart Targets', desc: 'Personalized targets based on your health goal' },
            ].map((f, i) => (
              <div key={i} className={`p-5 bg-card animate-fade-in stagger-${i + 2}`}>
                <div className="text-2xl mb-3">{f.emoji}</div>
                <div className="text-[13px] font-semibold text-fg mb-1">{f.title}</div>
                <div className="text-[11.5px] text-fg2 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="px-8 py-6 flex justify-center">
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-green-600 text-white font-semibold text-[13px]
                hover:opacity-90 shadow-lg shadow-green-500/25 press-feedback transition-all">
              <Plus className="w-4 h-4" /> Log Your First Meal
            </button>
          </div>
        </div>

        {showModal && <AddModal onAdd={e => { healthStore.addNutrition(e); reload(); }} onClose={() => setShowModal(false)} />}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-grotesk text-fg tracking-tight">Nutrition & Macros</h2>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white text-[12.5px] font-semibold hover:opacity-90">
          <Plus className="w-3.5 h-3.5" /> Log Meal
        </button>
      </div>

      {/* Today's summary */}
      <div className="rounded-2xl border border-line bg-card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[14px] font-semibold text-fg">Today's Macros</h3>
            <p className="text-[11px] text-fg3 mt-0.5">
              {todayData.calories} / {TARGETS.calories} kcal
              <span className="ml-2 font-semibold" style={{ color: todayData.calories > TARGETS.calories ? '#ef4444' : '#22c55e' }}>
                ({todayData.calories > TARGETS.calories ? `+${todayData.calories - TARGETS.calories}` : `-${TARGETS.calories - todayData.calories}`} kcal)
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-fg3">
            <Zap className="w-3.5 h-3.5" />
            <span>{todayData.entries.length} meals today</span>
          </div>
        </div>
        <MacroRings protein={todayData.protein} carbs={todayData.carbs} fat={todayData.fat} />
        {(todayData.sugar > 0 || todayData.fiber > 0) && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            {[
              { label: 'Sugar',  val: todayData.sugar,  target: TARGETS.sugar,  color: '#f43f5e', unit: 'g' },
              { label: 'Fiber',  val: todayData.fiber,  target: TARGETS.fiber,  color: '#10b981', unit: 'g' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl bg-bg border border-line">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-fg3 uppercase tracking-[0.1em]">{s.label}</span>
                  <span className="text-[12px] font-semibold text-fg">{s.val.toFixed(0)}g</span>
                </div>
                <div className="h-1.5 rounded-full bg-card2 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(s.val / s.target * 100, 100)}%`, background: s.color }} />
                </div>
                <div className="text-[10px] text-fg3 mt-1">Target: {s.target}g</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly calories */}
      <div className="rounded-2xl border border-line bg-card p-5">
        <h3 className="text-[14px] font-semibold text-fg mb-4">7-Day Calorie Trend</h3>
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="var(--line-raw)" strokeOpacity={0.4} strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--fg3-raw)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--fg3-raw)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: 'var(--card-raw)', border: '1px solid var(--line-raw)', borderRadius: 10, fontSize: 12 }}
                formatter={(v: any) => v !== null ? [`${v} kcal`, 'Calories'] : ['No data', '']} />
              <Bar dataKey="calories" fill="#10b981" fillOpacity={0.8} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Log */}
      <div className="rounded-2xl border border-line bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <span className="text-[13px] font-semibold text-fg">Meal Log</span>
          <span className="text-[11px] text-fg3">{entries.length} entries</span>
        </div>
        <div className="divide-y divide-line max-h-72 overflow-y-auto">
          {entries.map(e => {
            const cfg = MEAL_CFG[e.meal];
            return (
              <div key={e.id} className="flex items-center gap-3 px-5 py-3 hover:bg-card2 transition-colors">
                <span className="text-lg shrink-0">{cfg.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-fg">{cfg.label} · {e.note || 'Meal'}</div>
                  <div className="text-[11px] text-fg3">
                    P {e.protein}g · C {e.carbs}g · F {e.fat}g · {e.date} {e.time}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[13px] font-semibold text-fg">{e.calories} kcal</span>
                  <button onClick={() => { healthStore.deleteNutrition(e.id); reload(); }} className="text-fg3 hover:text-risk-hi transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && <AddModal onAdd={e => { healthStore.addNutrition(e); reload(); }} onClose={() => setShowModal(false)} />}
    </div>
  );
};
