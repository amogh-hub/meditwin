import React, { useState } from 'react';
import { User, Save, CheckCircle2, Edit3, Stethoscope, Target } from 'lucide-react';
import { healthStore, type HealthProfile } from '../../lib/healthStore';
import type { Patient } from '../../types';

interface ProfileTabProps {
  patient: Patient;
}

const GOALS = [
  { id: 'weight_loss', label: 'Weight Loss',  emoji: '⚖️' },
  { id: 'maintenance', label: 'Maintenance',  emoji: '🎯' },
  { id: 'athletic',    label: 'Athletic',      emoji: '🏅' },
  { id: 'longevity',  label: 'Longevity',      emoji: '🌱' },
];

const BLOOD_TYPES = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'];

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] uppercase tracking-[0.14em] font-semibold text-fg3">{label}</label>
    {children}
  </div>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`w-full px-3.5 py-2.5 rounded-xl border border-line bg-bg text-[13px] text-fg
      placeholder-fg3 focus:outline-none focus:border-accent transition-colors ${props.className ?? ''}`}
  />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select
    {...props}
    className={`w-full px-3.5 py-2.5 rounded-xl border border-line bg-bg text-[13px] text-fg
      focus:outline-none focus:border-accent transition-colors ${props.className ?? ''}`}
  />
);

export const ProfileTab: React.FC<ProfileTabProps> = ({ patient }) => {
  const [profile, setProfile] = useState<HealthProfile>(healthStore.getProfile());
  const [saved, setSaved] = useState(false);

  const bmi = profile.heightCm > 0 && profile.weightKg > 0
    ? (profile.weightKg / Math.pow(profile.heightCm / 100, 2)).toFixed(1)
    : null;

  const bmiCategory = bmi
    ? +bmi < 18.5 ? { label: 'Underweight', color: '#3b82f6' }
    : +bmi < 25   ? { label: 'Normal',       color: '#22c55e' }
    : +bmi < 30   ? { label: 'Overweight',   color: '#f59e0b' }
    :               { label: 'Obese',         color: '#ef4444' }
    : null;

  const handleSave = () => {
    healthStore.saveProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const updateField = (key: keyof HealthProfile, val: string | number) =>
    setProfile(p => ({ ...p, [key]: val }));

  return (
    <div className="max-w-3xl mx-auto pb-16 space-y-6">

      {/* ── Hero card ── */}
      <div className="rounded-2xl border border-line bg-card overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-accent/20 via-accent/10 to-transparent" />
        <div className="px-6 pb-6">
          <div className="-mt-8 flex items-end gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl border-4 border-card bg-accent/10
              flex items-center justify-center text-2xl shadow-sm shrink-0">
              <User className="w-7 h-7 text-accent" />
            </div>
            <div className="pb-1">
              <h2 className="text-[20px] font-bold font-grotesk text-fg tracking-tight leading-tight">
                {profile.name || 'Your Health Profile'}
              </h2>
              {bmi && bmiCategory && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[12px] text-fg3">BMI {bmi}</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: bmiCategory.color + '22', color: bmiCategory.color }}>
                    {bmiCategory.label}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            {[
            { label: 'Age',         value: (profile.age || patient.age) ? `${profile.age || patient.age} yrs` : '—' },
              { label: 'Gender',      value: patient.gender || '—' },
              { label: 'Height',      value: profile.heightCm ? `${profile.heightCm} cm` : '—' },
              { label: 'Weight',      value: profile.weightKg ? `${profile.weightKg} kg` : '—' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl bg-bg border border-line text-center">
                <div className="text-[15px] font-bold font-grotesk text-fg">{s.value}</div>
                <div className="text-[10px] text-fg3 uppercase tracking-[0.1em] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Personal info ── */}
      <div className="rounded-2xl border border-line bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Edit3 className="w-4 h-4 text-accent" />
          <h3 className="text-[14px] font-semibold text-fg">Personal Information</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name">
            <Input value={profile.name} onChange={e => updateField('name', e.target.value)} placeholder="Your name" />
          </Field>
          <Field label="Age">
            <Input
              type="number"
              value={profile.age || ''}
              onChange={e => updateField('age', +e.target.value)}
              placeholder="e.g. 45"
              min={1}
              max={120}
            />
          </Field>
          <Field label="Date of Birth">
            <Input type="date" value={profile.dateOfBirth} onChange={e => updateField('dateOfBirth', e.target.value)} />
          </Field>
          <Field label="Gender">
            <Select value={profile.gender} onChange={e => updateField('gender', e.target.value)}>
              <option value="">Select</option>
              <option>Male</option><option>Female</option><option>Other</option>
            </Select>
          </Field>
          <Field label="Blood Type">
            <Select value={profile.bloodType} onChange={e => updateField('bloodType', e.target.value)}>
              <option value="">Unknown</option>
              {BLOOD_TYPES.map(b => <option key={b}>{b}</option>)}
            </Select>
          </Field>
          <Field label="Height (cm)">
            <Input type="number" value={profile.heightCm || ''} onChange={e => updateField('heightCm', +e.target.value)} placeholder="170" />
          </Field>
          <Field label="Weight (kg)">
            <Input type="number" value={profile.weightKg || ''} onChange={e => updateField('weightKg', +e.target.value)} placeholder="70" />
          </Field>
        </div>
      </div>

      {/* ── Health goal ── */}
      <div className="rounded-2xl border border-line bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-accent" />
          <h3 className="text-[14px] font-semibold text-fg">Health Goal</h3>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {GOALS.map(g => (
            <button
              key={g.id}
              onClick={() => updateField('goalType', g.id)}
              className={`p-4 rounded-xl border text-center transition-all ${
                profile.goalType === g.id
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-line bg-bg text-fg2 hover:bg-card2'
              }`}
            >
              <div className="text-2xl mb-1.5">{g.emoji}</div>
              <div className="text-[12px] font-semibold">{g.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Medical context ── */}
      <div className="rounded-2xl border border-line bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Stethoscope className="w-4 h-4 text-accent" />
          <h3 className="text-[14px] font-semibold text-fg">Medical Context</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Conditions">
            <div className="min-h-[42px] px-3.5 py-2.5 rounded-xl border border-line bg-bg">
              {patient.conditions.length === 0
                ? <span className="text-[13px] text-fg3">Set in sidebar</span>
                : <div className="flex flex-wrap gap-1">
                    {patient.conditions.map(c => (
                      <span key={c} className="text-[11px] bg-accent/10 text-accent px-2 py-0.5 rounded-full">{c}</span>
                    ))}
                  </div>
              }
            </div>
          </Field>
          <Field label="Active Medications">
            <div className="min-h-[42px] px-3.5 py-2.5 rounded-xl border border-line bg-bg">
              {patient.medications.length === 0
                ? <span className="text-[13px] text-fg3">Set in sidebar</span>
                : <div className="flex flex-wrap gap-1">
                    {patient.medications.map(m => (
                      <span key={m} className="text-[11px] bg-card2 text-fg2 px-2 py-0.5 rounded-full border border-line">{m}</span>
                    ))}
                  </div>
              }
            </div>
          </Field>
          <Field label="Primary Physician">
            <Input value={profile.physician} onChange={e => updateField('physician', e.target.value)} placeholder="Dr. Name" />
          </Field>
          <Field label="Emergency Contact">
            <Input value={profile.emergencyContact} onChange={e => updateField('emergencyContact', e.target.value)} placeholder="Name · Phone" />
          </Field>
        </div>
        <Field label="Notes">
          <textarea
            value={profile.notes}
            onChange={e => updateField('notes', e.target.value)}
            placeholder="Allergies, chronic conditions details, or anything your care team should know…"
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-bg text-[13px] text-fg
              placeholder-fg3 focus:outline-none focus:border-accent transition-colors resize-none"
          />
        </Field>
      </div>

      {/* ── Save ── */}
      <button
        onClick={handleSave}
        className="w-full py-3.5 rounded-xl bg-accent text-white font-semibold text-[14px]
          hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
      >
        {saved
          ? <><CheckCircle2 className="w-4 h-4" /> Saved</>
          : <><Save className="w-4 h-4" /> Save Profile</>
        }
      </button>
    </div>
  );
};
