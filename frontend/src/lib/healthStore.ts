/**
 * MediTwin Lite — Health Data Store
 * All metrics persisted to localStorage. Manual entry only.
 */

// ── Types ──────────────────────────────────────────────────

export type VitalMetricId = 'heartRate' | 'bloodPressure' | 'glucose' | 'spo2' | 'temperature';
export type WorkoutType   = 'strength' | 'cardio' | 'yoga' | 'hiit' | 'sport' | 'walking' | 'other';
export type MealType      = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface VitalReading {
  id: string;
  timestamp: number;       // Unix ms
  metric: VitalMetricId;
  value: number;           // For BP we split into systolicVal + diastolicVal
  systolicVal?: number;    // BP only
  diastolicVal?: number;   // BP only
  state?: 'resting' | 'active';
  note?: string;
}

export interface SleepEntry {
  id: string;
  date: string;            // YYYY-MM-DD
  bedtime: string;         // HH:MM
  wakeTime: string;        // HH:MM
  duration: number;        // minutes total
  deepMin: number;
  remMin: number;
  lightMin: number;
  awakeMin: number;
  quality: number;         // 0–100 (computed)
  note?: string;
}

export interface WorkoutEntry {
  id: string;
  date: string;
  type: WorkoutType;
  duration: number;        // minutes
  calories: number;
  avgHR?: number;
  steps?: number;
  note?: string;
}

export interface DailySteps {
  id: string;
  date: string;
  steps: number;
  activeCalories: number;
}

export interface NutritionEntry {
  id: string;
  date: string;
  meal: MealType;
  time: string;            // HH:MM
  calories: number;
  protein: number;         // grams
  carbs: number;
  fat: number;
  sugar?: number;
  fiber?: number;
  sodium?: number;
  note?: string;
}

export interface LifestyleEntry {
  id: string;
  date: string;
  screenTime: number;          // minutes
  socialMin?: number;
  productiveMin?: number;
  entertainmentMin?: number;
  waterIntake: number;         // ml
  note?: string;
}

export interface LabReport {
  id: string;
  timestamp: number;
  fileName: string;
  summary: string;
  values: LabValue[];
  actions: string[];
  urgency: 'monitor' | 'consult_soon' | 'urgent';
}

export interface LabValue {
  name: string;
  value: string;
  unit: string;
  range: string;
  status: 'normal' | 'low' | 'high' | 'critical';
  context: string;
}

export interface HealthProfile {
  name: string;
  age: number;
  dateOfBirth: string;
  gender: string;
  heightCm: number;
  weightKg: number;
  bloodType: string;
  goalType: 'weight_loss' | 'maintenance' | 'athletic' | 'longevity' | '';
  emergencyContact: string;
  physician: string;
  notes: string;
}

// ── Normal Ranges ──────────────────────────────────────────

export const NORMAL_RANGES: Record<VitalMetricId, {
  min: number; max: number;
  unit: string; label: string;
  spikeAbove?: number; spikeBelow?: number;
  optimalMin?: number; optimalMax?: number;
}> = {
  heartRate:     { min: 60,  max: 100, unit: 'bpm',   label: 'Heart Rate',       spikeAbove: 110, spikeBelow: 45, optimalMin: 60, optimalMax: 80  },
  bloodPressure: { min: 90,  max: 120, unit: 'mmHg',  label: 'Blood Pressure',   spikeAbove: 160, spikeBelow: 80, optimalMin: 90, optimalMax: 120 },
  glucose:       { min: 70,  max: 140, unit: 'mg/dL', label: 'Blood Glucose',    spikeAbove: 180, spikeBelow: 65, optimalMin: 70, optimalMax: 100 },
  spo2:          { min: 95,  max: 100, unit: '%',     label: 'Blood Oxygen',     spikeBelow: 92,  optimalMin: 97, optimalMax: 100               },
  temperature:   { min: 36.1,max: 37.2,unit: '°C',   label: 'Body Temperature', spikeAbove: 38.5,optimalMin:36.1,optimalMax:37.2               },
};

// ── Storage Keys ───────────────────────────────────────────

const KEYS = {
  vitals:    'mt_vitals',
  sleep:     'mt_sleep',
  workouts:  'mt_workouts',
  steps:     'mt_steps',
  nutrition: 'mt_nutrition',
  lifestyle: 'mt_lifestyle',
  labs:      'mt_labs',
  profile:   'mt_profile',
};

function load<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}
function loadObj<T>(key: string, def: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? def; }
  catch { return def; }
}
function save(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data));
}
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

// ── Health Store ───────────────────────────────────────────

export const healthStore = {

  /* ── Profile ─────────────────────────────── */
  getProfile: (): HealthProfile =>
    loadObj<HealthProfile>(KEYS.profile, {
      name: '', age: 0, dateOfBirth: '', gender: '', heightCm: 0, weightKg: 0,
      bloodType: '', goalType: '', emergencyContact: '', physician: '', notes: '',
    }),
  saveProfile: (p: HealthProfile) => localStorage.setItem(KEYS.profile, JSON.stringify(p)),

  /* ── Vitals ──────────────────────────────── */
  getVitals: (metric?: VitalMetricId): VitalReading[] => {
    const all = load<VitalReading>(KEYS.vitals);
    return metric ? all.filter(r => r.metric === metric) : all;
  },
  addVital: (r: Omit<VitalReading, 'id'>): VitalReading => {
    const all = load<VitalReading>(KEYS.vitals);
    const entry = { ...r, id: uid() };
    save(KEYS.vitals, [...all, entry]);
    return entry;
  },
  deleteVital: (id: string) => {
    save(KEYS.vitals, load<VitalReading>(KEYS.vitals).filter(r => r.id !== id));
  },
  getSpikes: (metric: VitalMetricId): VitalReading[] => {
    const range = NORMAL_RANGES[metric];
    return load<VitalReading>(KEYS.vitals)
      .filter(r => r.metric === metric)
      .filter(r => {
        const v = r.value;
        if (range.spikeAbove !== undefined && v > range.spikeAbove) return true;
        if (range.spikeBelow !== undefined && v < range.spikeBelow) return true;
        return false;
      });
  },
  getVitalStatus: (metric: VitalMetricId, value: number): 'optimal' | 'borderline' | 'at_risk' => {
    const r = NORMAL_RANGES[metric];
    if (metric === 'spo2') {
      if (value >= (r.optimalMin ?? 97)) return 'optimal';
      if (value >= r.min) return 'borderline';
      return 'at_risk';
    }
    if (metric === 'bloodPressure') {
      if (value <= (r.optimalMax ?? 120)) return 'optimal';
      if (value <= r.max) return 'borderline';
      return 'at_risk';
    }
    if (value >= (r.optimalMin ?? r.min) && value <= (r.optimalMax ?? r.max)) return 'optimal';
    if (value >= r.min && value <= r.max) return 'borderline';
    return 'at_risk';
  },

  /* ── Sleep ───────────────────────────────── */
  getSleep: (): SleepEntry[] => load<SleepEntry>(KEYS.sleep),
  addSleep: (e: Omit<SleepEntry, 'id' | 'quality'>): SleepEntry => {
    const all = load<SleepEntry>(KEYS.sleep);
    // Quality score: duration (40%) + stage distribution (40%) + 20% awake penalty
    const durationScore = Math.min(e.duration / 480, 1) * 40;
    const deepRatio     = e.deepMin / Math.max(e.duration, 1);
    const remRatio      = e.remMin  / Math.max(e.duration, 1);
    const stageScore    = (Math.min(deepRatio / 0.2, 1) * 20) + (Math.min(remRatio / 0.25, 1) * 20);
    const awakePenalty  = Math.min(e.awakeMin / e.duration * 100, 20);
    const quality       = Math.round(durationScore + stageScore - awakePenalty);
    const entry = { ...e, id: uid(), quality: Math.max(0, Math.min(100, quality)) };
    save(KEYS.sleep, [...all, entry]);
    return entry;
  },
  deleteSleep: (id: string) => {
    save(KEYS.sleep, load<SleepEntry>(KEYS.sleep).filter(e => e.id !== id));
  },

  /* ── Activity ────────────────────────────── */
  getWorkouts: (): WorkoutEntry[] => load<WorkoutEntry>(KEYS.workouts),
  addWorkout: (w: Omit<WorkoutEntry, 'id'>): WorkoutEntry => {
    const all = load<WorkoutEntry>(KEYS.workouts);
    const entry = { ...w, id: uid() };
    save(KEYS.workouts, [...all, entry]);
    return entry;
  },
  deleteWorkout: (id: string) => {
    save(KEYS.workouts, load<WorkoutEntry>(KEYS.workouts).filter(e => e.id !== id));
  },
  getDailySteps: (): DailySteps[] => load<DailySteps>(KEYS.steps),
  addDailySteps: (s: Omit<DailySteps, 'id'>): DailySteps => {
    const all = load<DailySteps>(KEYS.steps);
    const existing = all.findIndex(e => e.date === s.date);
    const entry = { ...s, id: uid() };
    if (existing >= 0) { all[existing] = entry; save(KEYS.steps, all); }
    else save(KEYS.steps, [...all, entry]);
    return entry;
  },

  /* ── Nutrition ───────────────────────────── */
  getNutrition: (): NutritionEntry[] => load<NutritionEntry>(KEYS.nutrition),
  addNutrition: (n: Omit<NutritionEntry, 'id'>): NutritionEntry => {
    const all = load<NutritionEntry>(KEYS.nutrition);
    const entry = { ...n, id: uid() };
    save(KEYS.nutrition, [...all, entry]);
    return entry;
  },
  deleteNutrition: (id: string) => {
    save(KEYS.nutrition, load<NutritionEntry>(KEYS.nutrition).filter(e => e.id !== id));
  },
  getDayNutrition: (date: string) => {
    const entries = load<NutritionEntry>(KEYS.nutrition).filter(e => e.date === date);
    return {
      calories: entries.reduce((s, e) => s + e.calories, 0),
      protein:  entries.reduce((s, e) => s + e.protein, 0),
      carbs:    entries.reduce((s, e) => s + e.carbs, 0),
      fat:      entries.reduce((s, e) => s + e.fat, 0),
      sugar:    entries.reduce((s, e) => s + (e.sugar ?? 0), 0),
      fiber:    entries.reduce((s, e) => s + (e.fiber ?? 0), 0),
      entries,
    };
  },

  /* ── Lifestyle ───────────────────────────── */
  getLifestyle: (): LifestyleEntry[] => load<LifestyleEntry>(KEYS.lifestyle),
  addLifestyle: (l: Omit<LifestyleEntry, 'id'>): LifestyleEntry => {
    const all = load<LifestyleEntry>(KEYS.lifestyle);
    const existing = all.findIndex(e => e.date === l.date);
    const entry = { ...l, id: uid() };
    if (existing >= 0) { all[existing] = entry; save(KEYS.lifestyle, all); }
    else save(KEYS.lifestyle, [...all, entry]);
    return entry;
  },

  /* ── Lab Reports ─────────────────────────── */
  getLabs: (): LabReport[] => load<LabReport>(KEYS.labs),
  addLab: (r: Omit<LabReport, 'id'>): LabReport => {
    const all = load<LabReport>(KEYS.labs);
    const entry = { ...r, id: uid() };
    save(KEYS.labs, [...all, entry]);
    return entry;
  },
  deleteLab: (id: string) => {
    save(KEYS.labs, load<LabReport>(KEYS.labs).filter(e => e.id !== id));
  },

  /* ── Helpers ─────────────────────────────── */
  getLast7Days: () => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  },
};
