import React, { useState } from 'react';
import { Clock, Sun, Sunset, Moon, Sunrise, Loader2, Sparkles, Apple, AlertCircle, Lightbulb } from 'lucide-react';
import type { Patient, MedSchedule, ScheduleSlot } from '../../types';
import { fetchSchedule } from '../../api';

interface ScheduleTabProps {
  patient: Patient;
  apiKey: string;
}

const SLOT_CONFIG: Record<string, {
  icon: React.FC<any>;
  color: string;
  bg: string;
  border: string;
  label: string;
}> = {
  'Morning':  { icon: Sunrise, color: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-950/30',   border: 'border-amber-200 dark:border-amber-800/50',  label: '6 – 9 AM'   },
  'Noon':     { icon: Sun,     color: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800/50', label: '12 – 2 PM'  },
  'Evening':  { icon: Sunset,  color: '#6366f1', bg: 'bg-indigo-50 dark:bg-indigo-950/30',  border: 'border-indigo-200 dark:border-indigo-800/50',  label: '5 – 7 PM'   },
  'Night':    { icon: Moon,    color: '#8b5cf6', bg: 'bg-violet-50 dark:bg-violet-950/30',  border: 'border-violet-200 dark:border-violet-800/50',  label: '9 – 11 PM'  },
};

function slotKey(time_slot: string): string {
  const s = time_slot.toLowerCase();
  if (s.startsWith('morning'))  return 'Morning';
  if (s.startsWith('noon'))     return 'Noon';
  if (s.startsWith('evening'))  return 'Evening';
  if (s.startsWith('night'))    return 'Night';
  return 'Morning';
}

const FoodBadge: React.FC<{ instruction: string }> = ({ instruction }) => {
  const isFood   = instruction.toLowerCase().includes('with food');
  const isEmpty  = instruction.toLowerCase().includes('empty');
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium
      ${isFood  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
        isEmpty ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                  'bg-card2 text-fg3'}`}>
      {isFood ? <Apple className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
      {instruction}
    </span>
  );
};

const SlotCard: React.FC<{ slot: ScheduleSlot }> = ({ slot }) => {
  const key    = slotKey(slot.time_slot);
  const cfg    = SLOT_CONFIG[key] ?? SLOT_CONFIG['Morning'];
  const Icon   = cfg.icon;

  return (
    <div className={`rounded-2xl border p-5 ${cfg.bg} ${cfg.border}`}>
      {/* Slot header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: cfg.color + '22' }}>
          <Icon className="w-4 h-4" style={{ color: cfg.color }} />
        </div>
        <div>
          <div className="text-[13px] font-semibold text-fg">{key}</div>
          <div className="text-[10.5px] text-fg3">{cfg.label}</div>
        </div>
        <div className="ml-auto text-[11px] text-fg3 font-medium">
          {slot.medications.length} medication{slot.medications.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Medications */}
      <div className="space-y-2.5">
        {slot.medications.map((med, i) => (
          <div key={i} className="bg-card rounded-xl px-4 py-3 border border-line/60">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span className="text-[13px] font-semibold text-fg">{med.name}</span>
              {med.dose_note && (
                <span className="text-[11px] text-fg3 shrink-0 font-medium">{med.dose_note}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <FoodBadge instruction={med.food_instruction} />
              {med.special_note && (
                <span className="text-[10.5px] text-fg3 italic">{med.special_note}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ScheduleTab: React.FC<ScheduleTabProps> = ({ patient, apiKey }) => {
  const [schedule, setSchedule] = useState<MedSchedule | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const generate = async () => {
    if (!apiKey) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSchedule(patient, apiKey);
      if (result.success) {
        setSchedule(result);
      } else {
        setError(result.error || 'Failed to generate schedule.');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  /* Empty state */
  if (!schedule && !loading) {
    return (
      <div className="space-y-6 pb-12 max-w-3xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="space-y-1 animate-slide-up">
          <h2 className="text-2xl font-bold font-grotesk tracking-tight text-fg">Medication Schedule</h2>
          <p className="text-[13px] text-fg2 leading-relaxed">
            AI-generated daily timing — optimised around your medications, meals, and body clock.
          </p>
        </div>

        {/* Feature preview cards */}
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              time: '🌅 Morning',
              color: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40',
              dotColor: 'bg-amber-400',
              title: 'Optimal Morning Timing',
              desc: 'Know exactly which medications to take at wake-up, before meals, or with coffee — and why.',
            },
            {
              time: '☀️ Noon',
              color: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40',
              dotColor: 'bg-emerald-400',
              title: 'Food & Interaction Guidance',
              desc: 'Each medication shows whether to take it with food, on an empty stomach, or away from dairy.',
            },
            {
              time: '🌆 Evening',
              color: 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/40',
              dotColor: 'bg-indigo-400',
              title: 'Evening Dose Reminders',
              desc: 'Avoid taking sedating medications at the wrong time of day — your schedule spaces them correctly.',
            },
            {
              time: '🌙 Night',
              color: 'bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800/40',
              dotColor: 'bg-violet-400',
              title: 'Clinical Notes Per Dose',
              desc: 'Each slot includes a clinical note explaining why that timing was chosen for your specific regimen.',
            },
          ].map((card, i) => (
            <div
              key={i}
              className={`p-5 rounded-2xl border ${card.color} space-y-3 card-hover animate-slide-up`}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${card.dotColor}`} />
                <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-fg3">{card.time}</span>
              </div>
              <div>
                <div className="text-[13px] font-semibold text-fg mb-1">{card.title}</div>
                <p className="text-[12px] text-fg2 leading-relaxed">{card.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 pt-2 animate-slide-up stagger-6">
          {!apiKey ? (
            <p className="text-[13px] text-fg3 flex items-center justify-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Gemini API key required — add it in the sidebar
            </p>
          ) : (
            <button
              onClick={generate}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-accent text-white
                font-semibold text-[14px] hover:opacity-90 transition-all shadow-lg shadow-accent/20
                press-feedback"
            >
              <Sparkles className="w-4 h-4" />
              Generate My Schedule
            </button>
          )}
        </div>
      </div>
    );
  }

  /* Loading */
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
          <p className="text-[14px] text-fg2">Generating optimised schedule…</p>
        </div>
      </div>
    );
  }

  /* Error */
  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="max-w-sm text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-risk-hi mx-auto" />
          <p className="text-[14px] text-fg">{error}</p>
          <button onClick={generate} className="text-accent text-[13px] underline">Retry</button>
        </div>
      </div>
    );
  }

  /* Schedule */
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-grotesk text-fg tracking-tight">Daily Schedule</h2>
          <p className="text-[13px] text-fg3 mt-0.5">AI-optimised timing for {patient.medications.length} medications</p>
        </div>
        <button
          onClick={generate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-line bg-card
            text-[12px] font-medium text-fg2 hover:text-fg hover:bg-card2 transition-colors
            press-feedback"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Regenerate
        </button>
      </div>

      {/* Slot grid */}
      <div className="grid grid-cols-1 gap-4">
        {schedule!.schedule.map((slot, i) => (
          <div key={i} className={`animate-slide-up`} style={{ animationDelay: `${i * 80}ms` }}>
            <SlotCard slot={slot} />
          </div>
        ))}
      </div>

      {/* General tips */}
      {schedule!.general_tips?.length > 0 && (
        <div className="rounded-2xl border border-line bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-accent" />
            <span className="text-[13px] font-semibold text-fg">General Tips</span>
          </div>
          <ul className="space-y-2">
            {schedule!.general_tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-fg2 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-2" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[11px] text-fg3 text-center leading-relaxed">
        This schedule is AI-generated based on general pharmacology principles.
        Always confirm timing with your pharmacist or physician.
      </p>
    </div>
  );
};
