import React, { useEffect, useState, useCallback } from 'react';
import {
  Sparkles, Moon, Footprints, Apple, Droplets, Heart,
  TrendingUp, TrendingDown, Minus,
  Zap, Activity, ArrowRight, Info,
  Calendar, Waves,
} from 'lucide-react';
import { healthStore } from '../../lib/healthStore';

// ── Types ────────────────────────────────────────────────────

interface Insight {
  id: string;
  category: 'sleep' | 'nutrition' | 'activity' | 'vitals' | 'lifestyle';
  icon: React.FC<any>;
  iconColor: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'positive';
}

interface DetectedPattern {
  id: string;
  category: 'sleep' | 'nutrition' | 'activity' | 'vitals' | 'lifestyle';
  icon: React.FC<any>;
  iconColor: string;
  title: string;
  finding: string;
  impact: string;
  impactDirection: 'negative' | 'positive' | 'neutral';
  confidence: 'high' | 'medium' | 'low';
  dataPoints: number;
}

interface Correlation {
  id: string;
  metricA: string;
  metricB: string;
  iconA: React.FC<any>;
  iconB: React.FC<any>;
  colorA: string;
  colorB: string;
  r: number;
  direction: 'positive' | 'negative' | 'none';
  strength: 'strong' | 'moderate' | 'weak' | 'none';
  finding: string;
  dataPoints: number;
}

// ── Constants ────────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SEVERITY_CFG = {
  info:     { color: '#3b82f6', bg: '#3b82f608', border: '#3b82f618' },
  warning:  { color: '#f59e0b', bg: '#f59e0b08', border: '#f59e0b20' },
  positive: { color: '#22c55e', bg: '#22c55e08', border: '#22c55e20' },
};

// ── Math helpers ─────────────────────────────────────────────

function pearsonR(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 4) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = Math.sqrt(
    xs.reduce((s, x) => s + (x - mx) ** 2, 0) *
    ys.reduce((s, y) => s + (y - my) ** 2, 0)
  );
  return den === 0 ? 0 : Math.max(-1, Math.min(1, num / den));
}

function corrStrength(r: number): 'strong' | 'moderate' | 'weak' | 'none' {
  const a = Math.abs(r);
  if (a >= 0.55) return 'strong';
  if (a >= 0.30) return 'moderate';
  if (a >= 0.15) return 'weak';
  return 'none';
}

function pctChange(base: number, compare: number): number {
  if (base === 0) return 0;
  return Math.round(((compare - base) / base) * 100);
}

function dateStr(ts: number) { return new Date(ts).toISOString().slice(0, 10); }

// ── Compute insights ─────────────────────────────────────────

function computeInsights(): Insight[] {
  const out: Insight[] = [];
  const sleepEntries  = healthStore.getSleep();
  const workouts      = healthStore.getWorkouts();
  const stepsData     = healthStore.getDailySteps();
  const nutrition     = healthStore.getNutrition();
  const lifestyle     = healthStore.getLifestyle();
  const vitals        = healthStore.getVitals();
  const labReports    = healthStore.getLabs();

  if (sleepEntries.length >= 3) {
    const avgDur  = sleepEntries.reduce((s, e) => s + e.duration, 0) / sleepEntries.length;
    const avgQ    = sleepEntries.reduce((s, e) => s + e.quality,  0) / sleepEntries.length;
    const avgHrs  = avgDur / 60;
    if (avgHrs < 6) {
      out.push({ id: 'sleep-short', category: 'sleep', icon: Moon, iconColor: '#8b5cf6',
        title: 'Sleep Duration Below Optimal',
        description: `Your ${sleepEntries.length}-night average is ${avgHrs.toFixed(1)}h — ${((7 - avgHrs) / 7 * 100).toFixed(0)}% below the WHO-recommended minimum. Chronic short sleep is strongly associated with elevated cardiovascular risk and insulin resistance.`,
        severity: avgHrs < 5 ? 'warning' : 'info' });
    } else if (avgQ >= 75) {
      out.push({ id: 'sleep-good', category: 'sleep', icon: Moon, iconColor: '#22c55e',
        title: 'Sleep Quality Is Strong',
        description: `Your average sleep quality score of ${avgQ.toFixed(0)}/100 indicates healthy stage distribution — optimal for cellular repair and memory consolidation.`,
        severity: 'positive' });
    }
    const debtMin = sleepEntries.slice(0, 7).reduce((s, e) => s + Math.max(0, 420 - e.duration), 0);
    if (debtMin > 120) {
      out.push({ id: 'sleep-debt', category: 'sleep', icon: Moon, iconColor: '#f59e0b',
        title: `${Math.round(debtMin / 60)}h Sleep Debt This Week`,
        description: `You've accumulated approximately ${(debtMin / 60).toFixed(1)}h of sleep debt over the past 7 nights. Sleep debt cannot be fully recovered in a single night — aim for consistent 7–8h windows.`,
        severity: 'warning' });
    }
  }

  if (stepsData.length >= 3) {
    const avg = stepsData.reduce((s, e) => s + e.steps, 0) / stepsData.length;
    if (avg < 4000) {
      out.push({ id: 'activity-low', category: 'activity', icon: Footprints, iconColor: '#ef4444',
        title: 'Consistently Low Step Count',
        description: `Your average of ${Math.round(avg).toLocaleString()} steps/day is below 4,000 — the threshold where sedentary health risks begin to compound. AHA recommends 7,000–10,000 steps.`,
        severity: 'warning' });
    } else if (avg >= 10000) {
      out.push({ id: 'activity-high', category: 'activity', icon: Footprints, iconColor: '#22c55e',
        title: 'Hitting Your Step Goal',
        description: `Averaging ${Math.round(avg).toLocaleString()} steps/day — meeting or exceeding the 10,000-step target, correlated with 30–35% lower cardiovascular risk.`,
        severity: 'positive' });
    }
  }

  if (workouts.length >= 2) {
    const hiit = workouts.filter(w => w.type === 'hiit');
    const kcal = workouts.reduce((s, w) => s + w.calories, 0);
    out.push({ id: 'workout-log', category: 'activity', icon: Footprints, iconColor: '#6366f1',
      title: `${workouts.length} Workouts Logged`,
      description: `You've burned ~${kcal.toLocaleString()} kcal across ${workouts.length} sessions.${hiit.length > 0 ? ` ${hiit.length} HIIT sessions noted — avoid scheduling these within 3h of bedtime as they can reduce deep sleep by 15–20 minutes.` : ''}`,
      severity: hiit.length > 2 ? 'info' : 'positive' });
  }

  if (nutrition.length >= 3) {
    const dates = [...new Set(nutrition.map(e => e.date))];
    const days  = dates.map(d => healthStore.getDayNutrition(d));
    const avgSugar = days.reduce((s, d) => s + d.sugar, 0) / days.length;
    const avgProt  = days.reduce((s, d) => s + d.protein, 0) / days.length;
    if (avgSugar > 50) {
      out.push({ id: 'nutrition-sugar', category: 'nutrition', icon: Apple, iconColor: '#f43f5e',
        title: 'High Average Sugar Intake',
        description: `Average sugar of ${avgSugar.toFixed(0)}g/day exceeds the WHO limit of 50g. Elevated sugar is linked to insulin resistance, poor sleep quality, and inflammation.`,
        severity: 'warning' });
    }
    if (avgProt < 50) {
      out.push({ id: 'nutrition-protein', category: 'nutrition', icon: Apple, iconColor: '#f59e0b',
        title: 'Protein Intake May Be Low',
        description: `Average daily protein of ${avgProt.toFixed(0)}g may be insufficient. RDA is 0.8g/kg; active individuals need 1.2–2.0g/kg for muscle maintenance and satiety.`,
        severity: 'info' });
    }
  }

  if (vitals.filter(v => v.metric === 'heartRate').length >= 3) {
    const spikes = healthStore.getSpikes('heartRate');
    if (spikes.length > 0) {
      out.push({ id: 'vitals-hr-spikes', category: 'vitals', icon: Heart, iconColor: '#ef4444',
        title: `${spikes.length} Elevated Heart Rate Event${spikes.length > 1 ? 's' : ''} Detected`,
        description: `${spikes.length} reading${spikes.length > 1 ? 's' : ''} exceeded 110 bpm at rest. Triggers: dehydration, caffeine, high stress, or medication effects.`,
        severity: spikes.length > 3 ? 'warning' : 'info' });
    }
  }

  if (lifestyle.length >= 3) {
    const avgWater  = lifestyle.reduce((s, e) => s + e.waterIntake, 0) / lifestyle.length;
    const avgScreen = lifestyle.reduce((s, e) => s + e.screenTime, 0) / lifestyle.length;
    if (avgWater < 1500) {
      out.push({ id: 'lifestyle-dehydration', category: 'lifestyle', icon: Droplets, iconColor: '#3b82f6',
        title: 'Chronic Under-Hydration Pattern',
        description: `Average intake of ${(avgWater / 1000).toFixed(1)}L/day is below the WHO guideline of 2L. Chronic mild dehydration increases resting HR by 4–8 bpm and impairs cognitive performance.`,
        severity: 'warning' });
    }
    if (avgScreen > 300) {
      out.push({ id: 'lifestyle-screen', category: 'lifestyle', icon: Droplets, iconColor: '#8b5cf6',
        title: 'High Average Screen Time',
        description: `Averaging ${Math.round(avgScreen / 60)}h ${avgScreen % 60}m of screen time/day. Evening blue light suppresses melatonin by up to 50%, delaying sleep onset by 30–60 minutes.`,
        severity: 'info' });
    }
  }

  if (labReports.length > 0) {
    const latest   = labReports[labReports.length - 1];
    const abnormal = latest.values.filter(v => v.status !== 'normal');
    if (abnormal.length > 0) {
      out.push({ id: 'lab-abnormal', category: 'vitals', icon: Heart, iconColor: '#ef4444',
        title: `${abnormal.length} Abnormal Lab Value${abnormal.length > 1 ? 's' : ''} in Latest Report`,
        description: `${latest.fileName} flagged: ${abnormal.slice(0, 3).map(v => v.name).join(', ')}${abnormal.length > 3 ? ` and ${abnormal.length - 3} more` : ''}. Review the Lab Reports tab for context.`,
        severity: latest.urgency === 'urgent' ? 'warning' : 'info' });
    }
  }

  return out;
}

// ── Compute patterns ─────────────────────────────────────────

function computePatterns(): DetectedPattern[] {
  const out: DetectedPattern[] = [];

  const sleepEntries = healthStore.getSleep();
  const lifestyle    = healthStore.getLifestyle();
  const vitals       = healthStore.getVitals();
  const stepsData    = healthStore.getDailySteps();
  const nutrition    = healthStore.getNutrition();
  const workouts     = healthStore.getWorkouts();

  const sleepFor = (date: string) => sleepEntries.find(s => s.date === date);

  // 1. High screen time → worse sleep duration
  if (lifestyle.length >= 4 && sleepEntries.length >= 4) {
    const pairs = lifestyle
      .map(l => ({ screen: l.screenTime, sleep: sleepFor(l.date) }))
      .filter((p): p is { screen: number; sleep: NonNullable<ReturnType<typeof sleepFor>> } => !!p.sleep);
    if (pairs.length >= 4) {
      const sorted = [...pairs].sort((a, b) => a.screen - b.screen);
      const median = sorted[Math.floor(sorted.length / 2)].screen;
      const low  = pairs.filter(p => p.screen <= median);
      const high = pairs.filter(p => p.screen > median);
      if (low.length >= 2 && high.length >= 2) {
        const avgLow  = low.reduce((s, p)  => s + p.sleep.duration, 0) / low.length;
        const avgHigh = high.reduce((s, p) => s + p.sleep.duration, 0) / high.length;
        const pct = pctChange(avgLow, avgHigh);
        if (Math.abs(pct) >= 8) {
          out.push({
            id: 'screen-sleep', category: 'sleep', icon: Moon, iconColor: '#8b5cf6',
            title: 'Screen Time Affects Your Sleep',
            finding: `You sleep ${Math.abs(pct)}% ${pct < 0 ? 'less' : 'more'} on high screen-time days (>${Math.round(median / 60)}h of screen use)`,
            impact: `${Math.abs(Math.round((avgLow - avgHigh) / 60 * 10) / 10)}h difference`,
            impactDirection: pct < 0 ? 'negative' : 'positive',
            confidence: Math.abs(pct) > 20 ? 'high' : 'medium',
            dataPoints: pairs.length,
          });
        }
      }
    }
  }

  // 2. Day-of-week BP pattern
  const bpReadings = vitals.filter(v => v.metric === 'bloodPressure' && v.systolicVal);
  if (bpReadings.length >= 7) {
    const byDay: Record<number, number[]> = {};
    bpReadings.forEach(v => {
      const day = new Date(v.timestamp).getDay();
      byDay[day] = byDay[day] || [];
      byDay[day].push(v.systolicVal!);
    });
    const dayAvgs = Object.entries(byDay)
      .filter(([, vals]) => vals.length >= 2)
      .map(([day, vals]) => ({ day: Number(day), avg: vals.reduce((a, b) => a + b, 0) / vals.length }));
    if (dayAvgs.length >= 3) {
      const highest = dayAvgs.reduce((a, b) => a.avg > b.avg ? a : b);
      const lowest  = dayAvgs.reduce((a, b) => a.avg < b.avg ? a : b);
      const diff    = highest.avg - lowest.avg;
      if (diff >= 8) {
        out.push({
          id: 'bp-dow', category: 'vitals', icon: Activity, iconColor: '#ef4444',
          title: 'Blood Pressure Spikes on a Specific Day',
          finding: `Your BP is consistently highest on ${DAYS[highest.day]}s (avg ${highest.avg.toFixed(0)} mmHg) vs lowest on ${DAYS[lowest.day]}s (${lowest.avg.toFixed(0)} mmHg)`,
          impact: `+${diff.toFixed(0)} mmHg vs best day`,
          impactDirection: 'negative',
          confidence: diff > 15 ? 'high' : 'medium',
          dataPoints: bpReadings.length,
        });
      }
    }
  }

  // 3. High sugar → poor sleep quality
  if (nutrition.length >= 6 && sleepEntries.length >= 4) {
    const nutDates = [...new Set(nutrition.map(e => e.date))];
    const pairs = nutDates
      .map(d => ({ sugar: healthStore.getDayNutrition(d).sugar, sleep: sleepFor(d) }))
      .filter((p): p is { sugar: number; sleep: NonNullable<ReturnType<typeof sleepFor>> } => !!p.sleep && p.sugar > 0);
    if (pairs.length >= 4) {
      const sorted = [...pairs].sort((a, b) => a.sugar - b.sugar);
      const median = sorted[Math.floor(sorted.length / 2)].sugar;
      const low  = pairs.filter(p => p.sugar <= median);
      const high = pairs.filter(p => p.sugar > median);
      if (low.length >= 2 && high.length >= 2) {
        const avgLow  = low.reduce((s, p)  => s + p.sleep.quality, 0) / low.length;
        const avgHigh = high.reduce((s, p) => s + p.sleep.quality, 0) / high.length;
        const diff = avgLow - avgHigh;
        if (diff >= 6) {
          out.push({
            id: 'sugar-sleep', category: 'nutrition', icon: Apple, iconColor: '#f43f5e',
            title: 'High Sugar → Poorer Sleep Quality',
            finding: `On nights after high-sugar days (>${Math.round(median)}g), your sleep quality score drops by ${diff.toFixed(0)} points on average`,
            impact: `−${diff.toFixed(0)} pts sleep quality`,
            impactDirection: 'negative',
            confidence: diff > 12 ? 'high' : 'medium',
            dataPoints: pairs.length,
          });
        }
      }
    }
  }

  // 4. HIIT workouts → less deep sleep that night
  if (workouts.length >= 3 && sleepEntries.length >= 3) {
    const hiitDates    = workouts.filter(w => w.type === 'hiit').map(w => w.date);
    const nonHiitDates = workouts.filter(w => w.type !== 'hiit').map(w => w.date);
    if (hiitDates.length >= 2) {
      const hiitSleep    = sleepEntries.filter(s => hiitDates.includes(s.date));
      const nonHiitSleep = sleepEntries.filter(s => nonHiitDates.includes(s.date));
      if (hiitSleep.length >= 2 && nonHiitSleep.length >= 2) {
        const avgDeepHiit    = hiitSleep.reduce((s, e)    => s + e.deepMin, 0) / hiitSleep.length;
        const avgDeepNonHiit = nonHiitSleep.reduce((s, e) => s + e.deepMin, 0) / nonHiitSleep.length;
        const diff = avgDeepNonHiit - avgDeepHiit;
        if (diff >= 5) {
          out.push({
            id: 'hiit-deep', category: 'activity', icon: Zap, iconColor: '#f59e0b',
            title: 'HIIT Reduces Your Deep Sleep',
            finding: `On nights after HIIT sessions, you get ${Math.round(diff)} fewer minutes of deep sleep compared to other workout types`,
            impact: `−${Math.round(diff)}min deep sleep`,
            impactDirection: 'negative',
            confidence: diff > 15 ? 'high' : 'medium',
            dataPoints: hiitSleep.length + nonHiitSleep.length,
          });
        }
      }
    }
  }

  // 5. Low water → elevated HR
  if (lifestyle.length >= 4) {
    const hrByDate: Record<string, number[]> = {};
    vitals.filter(v => v.metric === 'heartRate').forEach(v => {
      const d = dateStr(v.timestamp);
      hrByDate[d] = hrByDate[d] || [];
      hrByDate[d].push(v.value);
    });
    const pairs = lifestyle.map(l => {
      const hrs = hrByDate[l.date];
      if (!hrs) return null;
      return { water: l.waterIntake, hr: hrs.reduce((a, b) => a + b, 0) / hrs.length };
    }).filter((p): p is { water: number; hr: number } => p !== null);
    if (pairs.length >= 4) {
      const sorted = [...pairs].sort((a, b) => a.water - b.water);
      const median = sorted[Math.floor(sorted.length / 2)].water;
      const low  = pairs.filter(p => p.water <= median);
      const high = pairs.filter(p => p.water > median);
      if (low.length >= 2 && high.length >= 2) {
        const avgHrLow  = low.reduce((s, p)  => s + p.hr, 0) / low.length;
        const avgHrHigh = high.reduce((s, p) => s + p.hr, 0) / high.length;
        const diff = avgHrLow - avgHrHigh;
        if (diff >= 4) {
          out.push({
            id: 'water-hr', category: 'lifestyle', icon: Droplets, iconColor: '#3b82f6',
            title: 'Low Hydration → Higher Heart Rate',
            finding: `On days you drink less than ${(Math.ceil(median / 100) * 100)}ml, your resting HR is ${diff.toFixed(0)} bpm higher on average`,
            impact: `+${diff.toFixed(0)} bpm HR`,
            impactDirection: 'negative',
            confidence: diff > 6 ? 'high' : 'medium',
            dataPoints: pairs.length,
          });
        }
      }
    }
  }

  // 6. Active days → better sleep quality
  if (stepsData.length >= 5 && sleepEntries.length >= 4) {
    const pairs = stepsData.map(s => ({
      steps: s.steps, sleep: sleepFor(s.date),
    })).filter((p): p is { steps: number; sleep: NonNullable<ReturnType<typeof sleepFor>> } => !!p.sleep);
    if (pairs.length >= 4) {
      const sorted = [...pairs].sort((a, b) => a.steps - b.steps);
      const median = sorted[Math.floor(sorted.length / 2)].steps;
      const active   = pairs.filter(p => p.steps > median);
      const inactive = pairs.filter(p => p.steps <= median);
      if (active.length >= 2 && inactive.length >= 2) {
        const avgActive   = active.reduce((s, p)   => s + p.sleep.quality, 0) / active.length;
        const avgInactive = inactive.reduce((s, p) => s + p.sleep.quality, 0) / inactive.length;
        const diff = avgActive - avgInactive;
        if (Math.abs(diff) >= 6) {
          out.push({
            id: 'steps-sleep', category: 'activity', icon: Footprints, iconColor: '#22c55e',
            title: 'More Steps, Better Sleep',
            finding: `On days you walk more than ${Math.round(median / 1000)}k steps, your sleep quality score is ${Math.abs(diff).toFixed(0)} points ${diff > 0 ? 'higher' : 'lower'}`,
            impact: `${diff > 0 ? '+' : ''}${Math.abs(diff).toFixed(0)} pts sleep quality`,
            impactDirection: diff > 0 ? 'positive' : 'negative',
            confidence: Math.abs(diff) > 12 ? 'high' : 'medium',
            dataPoints: pairs.length,
          });
        }
      }
    }
  }

  // 7. Workout consistency → resting HR trend downward over time
  if (workouts.length >= 5) {
    const hrReadings = vitals.filter(v => v.metric === 'heartRate' && v.state === 'resting');
    if (hrReadings.length >= 4) {
      const sortedHR   = [...hrReadings].sort((a, b) => a.timestamp - b.timestamp);
      const half       = Math.floor(sortedHR.length / 2);
      const avgFirst   = sortedHR.slice(0, half).reduce((s, v)  => s + v.value, 0) / half;
      const avgSecond  = sortedHR.slice(half).reduce((s, v) => s + v.value, 0) / (sortedHR.length - half);
      const diff = avgFirst - avgSecond;
      if (diff >= 4) {
        out.push({
          id: 'exercise-rhr', category: 'activity', icon: Heart, iconColor: '#22c55e',
          title: 'Workouts Are Lowering Your Resting HR',
          finding: `Your resting heart rate has dropped by ${diff.toFixed(0)} bpm since you started tracking — a sign of improving cardiovascular fitness`,
          impact: `−${diff.toFixed(0)} bpm resting HR`,
          impactDirection: 'positive',
          confidence: 'medium',
          dataPoints: hrReadings.length,
        });
      }
    }
  }

  return out;
}

// ── Compute correlations ─────────────────────────────────────

function computeCorrelations(): Correlation[] {
  const all: Correlation[] = [];

  const sleepEntries = healthStore.getSleep();
  const vitals       = healthStore.getVitals();
  const stepsData    = healthStore.getDailySteps();
  const lifestyle    = healthStore.getLifestyle();
  const nutrition    = healthStore.getNutrition();
  const workouts     = healthStore.getWorkouts();

  const sleepFor = (date: string) => sleepEntries.find(s => s.date === date);
  const nutFor   = (date: string) => healthStore.getDayNutrition(date);

  const makeCorr = (
    id: string,
    metricA: string, metricB: string,
    iconA: React.FC<any>, iconB: React.FC<any>,
    colorA: string, colorB: string,
    xs: number[], ys: number[],
    posDesc: string, negDesc: string,
  ): Correlation | null => {
    if (xs.length < 4) return null;
    const r        = pearsonR(xs, ys);
    const strength = corrStrength(r);
    if (strength === 'none') return null;
    const direction = r > 0 ? 'positive' : 'negative';
    return { id, metricA, metricB, iconA, iconB, colorA, colorB, r, direction, strength,
      finding: direction === 'positive' ? posDesc : negDesc,
      dataPoints: xs.length };
  };

  // 1. Sleep duration → next-day resting HR
  {
    const hrByDate: Record<string, number[]> = {};
    vitals.filter(v => v.metric === 'heartRate').forEach(v => {
      const d = dateStr(v.timestamp); hrByDate[d] = hrByDate[d] || []; hrByDate[d].push(v.value);
    });
    const xs: number[] = [], ys: number[] = [];
    sleepEntries.forEach(s => {
      const nd = new Date(s.date); nd.setDate(nd.getDate() + 1);
      const hrs = hrByDate[nd.toISOString().slice(0, 10)];
      if (hrs) { xs.push(s.duration / 60); ys.push(hrs.reduce((a, b) => a + b, 0) / hrs.length); }
    });
    const c = makeCorr('sleep-hr', 'Sleep Duration', 'Heart Rate', Moon, Heart, '#8b5cf6', '#ef4444', xs, ys,
      'Longer sleep is associated with higher next-day HR (check if active days have later sleep)',
      'Longer sleep → lower next-day resting HR. Better rest = stronger heart recovery.');
    if (c) all.push(c);
  }

  // 2. Daily sugar → sleep quality
  {
    const xs: number[] = [], ys: number[] = [];
    [...new Set(nutrition.map(e => e.date))].forEach(d => {
      const s = sleepFor(d);
      if (s) { xs.push(nutFor(d).sugar); ys.push(s.quality); }
    });
    const c = makeCorr('sugar-sleep', 'Sugar Intake', 'Sleep Quality', Apple, Moon, '#f43f5e', '#8b5cf6', xs, ys,
      'Higher sugar days link to better sleep — possibly reflecting high-energy active days',
      'High sugar → poor sleep. Cutting added sugars can meaningfully improve your sleep score.');
    if (c) all.push(c);
  }

  // 3. Step count → sleep duration
  {
    const xs: number[] = [], ys: number[] = [];
    stepsData.forEach(s => {
      const sl = sleepFor(s.date);
      if (sl) { xs.push(s.steps); ys.push(sl.duration / 60); }
    });
    const c = makeCorr('steps-sleep', 'Step Count', 'Sleep Duration', Footprints, Moon, '#22c55e', '#8b5cf6', xs, ys,
      'More steps → longer sleep. Physical activity helps consolidate and lengthen sleep.',
      'More steps curiously link to shorter sleep — possibly due to late-evening workouts.');
    if (c) all.push(c);
  }

  // 4. Workout calories → next-day HR
  {
    const wkByDate: Record<string, number> = {};
    workouts.forEach(w => { wkByDate[w.date] = (wkByDate[w.date] || 0) + w.calories; });
    const hrByDate: Record<string, number[]> = {};
    vitals.filter(v => v.metric === 'heartRate').forEach(v => {
      const d = dateStr(v.timestamp); hrByDate[d] = hrByDate[d] || []; hrByDate[d].push(v.value);
    });
    const xs: number[] = [], ys: number[] = [];
    Object.entries(wkByDate).forEach(([date, cal]) => {
      const nd = new Date(date); nd.setDate(nd.getDate() + 1);
      const hrs = hrByDate[nd.toISOString().slice(0, 10)];
      if (hrs) { xs.push(cal); ys.push(hrs.reduce((a, b) => a + b, 0) / hrs.length); }
    });
    const c = makeCorr('exercise-hr', 'Exercise Intensity', 'Heart Rate', Zap, Heart, '#f59e0b', '#ef4444', xs, ys,
      'Harder workouts track with modestly higher next-day HR — normal recovery response.',
      'Higher calorie workouts → lower next-day HR. Cardiovascular fitness is adapting well.');
    if (c) all.push(c);
  }

  // 5. Screen time → sleep duration
  {
    const xs: number[] = [], ys: number[] = [];
    lifestyle.forEach(l => {
      const s = sleepFor(l.date);
      if (s) { xs.push(l.screenTime / 60); ys.push(s.duration / 60); }
    });
    const c = makeCorr('screen-sleep', 'Screen Time', 'Sleep Duration', Waves, Moon, '#6366f1', '#8b5cf6', xs, ys,
      'More screen time correlates with longer sleep (late-night use may delay wake time)',
      'More screen time → shorter sleep. Blue light suppresses melatonin and delays sleep onset.');
    if (c) all.push(c);
  }

  // 6. Water intake → resting HR
  {
    const hrByDate: Record<string, number[]> = {};
    vitals.filter(v => v.metric === 'heartRate').forEach(v => {
      const d = dateStr(v.timestamp); hrByDate[d] = hrByDate[d] || []; hrByDate[d].push(v.value);
    });
    const xs: number[] = [], ys: number[] = [];
    lifestyle.forEach(l => {
      const hrs = hrByDate[l.date];
      if (hrs) { xs.push(l.waterIntake / 1000); ys.push(hrs.reduce((a, b) => a + b, 0) / hrs.length); }
    });
    const c = makeCorr('water-hr', 'Water Intake', 'Heart Rate', Droplets, Heart, '#3b82f6', '#ef4444', xs, ys,
      'More water curiously tracks with higher HR — consider timing of readings.',
      'Better hydration → lower resting HR. Every litre counts for cardiovascular function.');
    if (c) all.push(c);
  }

  // 7. Daily calories → sleep quality
  {
    const xs: number[] = [], ys: number[] = [];
    [...new Set(nutrition.map(e => e.date))].forEach(d => {
      const s = sleepFor(d);
      if (s) { xs.push(nutFor(d).calories); ys.push(s.quality); }
    });
    const c = makeCorr('cal-sleep', 'Caloric Intake', 'Sleep Quality', Apple, Moon, '#f59e0b', '#8b5cf6', xs, ys,
      'Higher calorie days slightly associate with better sleep — possibly reflecting active days.',
      'Higher caloric intake slightly reduces sleep quality — heavy meals close to bedtime disrupt sleep cycles.');
    if (c) all.push(c);
  }

  return all.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
}

// ── Sub-components ───────────────────────────────────────────

const ConfidenceBadge: React.FC<{ level: 'high' | 'medium' | 'low' }> = ({ level }) => {
  const cfg = {
    high:   { color: '#22c55e', label: 'High confidence' },
    medium: { color: '#f59e0b', label: 'Moderate confidence' },
    low:    { color: '#94a3b8', label: 'Low confidence' },
  }[level];
  return (
    <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full shrink-0"
      style={{ background: cfg.color + '22', color: cfg.color }}>
      {cfg.label}
    </span>
  );
};

const CorrelationBar: React.FC<{ r: number }> = ({ r }) => {
  const abs   = Math.abs(r);
  const pct   = (abs * 100).toFixed(0);
  const color = r > 0 ? '#22c55e' : '#ef4444';
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-2 rounded-full bg-card2 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}80, ${color})` }} />
      </div>
      <span className="text-[11px] font-bold font-grotesk shrink-0 w-10 text-right" style={{ color }}>
        {r > 0 ? '+' : ''}{r.toFixed(2)}
      </span>
    </div>
  );
};

const PatternCard: React.FC<{ pattern: DetectedPattern }> = ({ pattern }) => {
  const ImpactIcon = pattern.impactDirection === 'positive' ? TrendingUp
    : pattern.impactDirection === 'negative' ? TrendingDown : Minus;
  const impactColor = pattern.impactDirection === 'positive' ? '#22c55e'
    : pattern.impactDirection === 'negative' ? '#ef4444' : '#94a3b8';
  const Icon = pattern.icon;
  return (
    <div className="rounded-2xl border border-line bg-card p-5 hover:border-accent/30 transition-all hover:shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: pattern.iconColor + '18' }}>
          <Icon className="w-4.5 h-4.5" style={{ color: pattern.iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h4 className="text-[13.5px] font-semibold text-fg leading-snug">{pattern.title}</h4>
            <ConfidenceBadge level={pattern.confidence} />
          </div>
          <p className="text-[13px] text-fg2 leading-relaxed mb-3 italic">"{pattern.finding}"</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
              style={{ background: impactColor + '15' }}>
              <ImpactIcon className="w-3 h-3" style={{ color: impactColor }} />
              <span className="text-[11.5px] font-bold" style={{ color: impactColor }}>{pattern.impact}</span>
            </div>
            <span className="text-[10px] text-fg3">{pattern.dataPoints} data points</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const CorrelationCard: React.FC<{ corr: Correlation }> = ({ corr }) => {
  const color = corr.direction === 'positive' ? '#22c55e' : '#ef4444';
  const strLabel = { strong: 'Strong', moderate: 'Moderate', weak: 'Weak', none: 'None' }[corr.strength];
  const IconA = corr.iconA;
  const IconB = corr.iconB;
  const DirIcon = corr.direction === 'positive' ? TrendingUp : TrendingDown;
  return (
    <div className="rounded-2xl border border-line bg-card p-5 hover:border-accent/30 transition-all hover:shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: corr.colorA + '20' }}>
            <IconA className="w-3.5 h-3.5" style={{ color: corr.colorA }} />
          </div>
          <span className="text-[12px] font-semibold text-fg">{corr.metricA}</span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-fg3 shrink-0" />
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: corr.colorB + '20' }}>
            <IconB className="w-3.5 h-3.5" style={{ color: corr.colorB }} />
          </div>
          <span className="text-[12px] font-semibold text-fg">{corr.metricB}</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <DirIcon className="w-3 h-3" style={{ color }} />
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: color + '22', color }}>
            {strLabel}
          </span>
        </div>
      </div>
      <div className="mb-3"><CorrelationBar r={corr.r} /></div>
      <p className="text-[12.5px] text-fg2 leading-relaxed">{corr.finding}</p>
      <p className="text-[10px] text-fg3 mt-2">Based on {corr.dataPoints} matched data points</p>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────

type ActiveTab = 'insights' | 'patterns' | 'correlations';

export const InsightsTab: React.FC = () => {
  const [activeTab,    setActiveTab]    = useState<ActiveTab>('insights');
  const [insights,     setInsights]     = useState<Insight[]>(() => computeInsights());
  const [patterns,     setPatterns]     = useState<DetectedPattern[]>(() => computePatterns());
  const [correlations, setCorrelations] = useState<Correlation[]>(() => computeCorrelations());

  const refresh = useCallback(() => {
    setInsights(computeInsights());
    setPatterns(computePatterns());
    setCorrelations(computeCorrelations());
  }, []);

  // Re-run when localStorage changes (other tabs) or window gains focus (user came back to this tab)
  useEffect(() => {
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

  const warnings  = insights.filter(i => i.severity === 'warning').length;
  const hasAnyData = insights.length > 0 || patterns.length > 0 || correlations.length > 0;

  const TABS: { id: ActiveTab; label: string; count: number; icon: React.FC<any> }[] = [
    { id: 'insights',     label: 'Health Insights',    count: insights.length,     icon: Sparkles   },
    { id: 'patterns',     label: 'Pattern Detection',  count: patterns.length,     icon: Calendar   },
    { id: 'correlations', label: 'Correlation Engine', count: correlations.length, icon: TrendingUp },
  ];

  if (!hasAnyData) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 gap-5">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-accent" />
          </div>
          <div className="text-center space-y-1.5">
            <h3 className="text-[17px] font-semibold font-grotesk text-fg">No insights yet</h3>
            <p className="text-[13px] text-fg2 max-w-sm leading-relaxed">
              Log data across 3+ different health modules to unlock AI-powered pattern detection and cross-metric correlation analysis. Then click Refresh.
            </p>
          </div>
          <button onClick={refresh}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-[13px] font-semibold hover:opacity-90 transition-opacity">
            <Sparkles className="w-3.5 h-3.5" /> Refresh Insights
          </button>
          <div className="flex flex-wrap justify-center gap-2">
            {['Vitals', 'Sleep', 'Activity', 'Nutrition', 'Lifestyle'].map(m => (
              <span key={m} className="text-[11.5px] px-3 py-1 rounded-full border border-line text-fg3">{m}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-12 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold font-grotesk text-fg tracking-tight">Insights & Analysis</h2>
          <p className="text-[13px] text-fg3 mt-1">
            {insights.length} insights · {patterns.length} patterns · {correlations.length} correlations
          </p>
        </div>
        <button onClick={refresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-[12px] text-fg2 hover:text-fg hover:border-accent/30 transition-all">
          <Sparkles className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Insights',     value: insights.length,     color: 'var(--accent-raw)'  },
          { label: 'Need Attention', value: warnings,          color: 'var(--risk-md-raw)' },
          { label: 'Patterns',     value: patterns.length,     color: '#8b5cf6'             },
          { label: 'Correlations', value: correlations.length, color: '#3b82f6'             },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-line bg-card p-4 text-center">
            <div className="text-[26px] font-bold font-grotesk leading-tight" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[9.5px] text-fg3 uppercase tracking-[0.1em] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 rounded-xl border border-line bg-bg">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition-all ${
              activeTab === tab.id ? 'bg-accent text-white shadow-sm' : 'text-fg3 hover:text-fg'
            }`}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-[10px] px-1.5 rounded-full font-bold ${
                activeTab === tab.id ? 'bg-white/25 text-white' : 'bg-card2 text-fg3'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Health Insights ── */}
      {activeTab === 'insights' && (
        <div className="space-y-3">
          {insights.length === 0 ? (
            <div className="rounded-2xl border border-line bg-card p-10 text-center">
              <Info className="w-8 h-8 text-fg3 mx-auto mb-3" />
              <p className="text-[13px] text-fg2">Log more health data to generate insights.</p>
            </div>
          ) : insights.map(insight => {
            const cfg  = SEVERITY_CFG[insight.severity];
            const Icon = insight.icon;
            return (
              <div key={insight.id} className="rounded-2xl border p-5 transition-all hover:shadow-sm"
                style={{ background: cfg.bg, borderColor: cfg.border }}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: insight.iconColor + '18' }}>
                    <Icon className="w-4 h-4" style={{ color: insight.iconColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="text-[14px] font-semibold text-fg leading-snug">{insight.title}</h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                          style={{ background: cfg.color + '22', color: cfg.color }}>
                          {insight.severity === 'positive' ? '✓ Good' : insight.severity === 'warning' ? '⚠ Attention' : 'ℹ Info'}
                        </span>
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-card2 text-fg3 capitalize">
                          {insight.category}
                        </span>
                      </div>
                    </div>
                    <p className="text-[12.5px] text-fg2 leading-relaxed">{insight.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pattern Detection ── */}
      {activeTab === 'patterns' && (
        <div className="space-y-4">
          {patterns.length === 0 ? (
            <div className="rounded-2xl border border-line bg-card p-10 text-center space-y-3">
              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6 text-accent" />
              </div>
              <p className="text-[14px] font-semibold text-fg">No patterns detected yet</p>
              <p className="text-[12.5px] text-fg2 max-w-sm mx-auto leading-relaxed">
                Pattern detection needs 5–7+ days of overlapping Sleep, Vitals, Nutrition, and Lifestyle data. Keep logging and hit Refresh!
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 px-1">
                <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5 text-accent" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-fg">{patterns.length} behavioral patterns detected</p>
                  <p className="text-[11.5px] text-fg3">Based on statistical comparison of your logged days</p>
                </div>
              </div>
              {patterns.map(p => <PatternCard key={p.id} pattern={p} />)}
            </>
          )}
        </div>
      )}

      {/* ── Correlation Engine ── */}
      {activeTab === 'correlations' && (
        <div className="space-y-4">
          {correlations.length === 0 ? (
            <div className="rounded-2xl border border-line bg-card p-10 text-center space-y-3">
              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
              <p className="text-[14px] font-semibold text-fg">Gathering correlation data</p>
              <p className="text-[12.5px] text-fg2 max-w-sm mx-auto leading-relaxed">
                The correlation engine needs 4+ matched data points across metric pairs. Log data for a few more days and hit Refresh!
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 px-1 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[11px] text-fg3">Positive (metrics move together)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-1.5 rounded-full bg-red-500" />
                  <span className="text-[11px] text-fg3">Negative (inverse relationship)</span>
                </div>
                <span className="ml-auto text-[11px] text-fg3 flex items-center gap-1">
                  <Info className="w-3 h-3" /> r = Pearson coefficient
                </span>
              </div>
              {correlations.map(c => <CorrelationCard key={c.id} corr={c} />)}
              <div className="rounded-xl border border-line bg-bg p-4">
                <p className="text-[11.5px] text-fg2 leading-relaxed">
                  <span className="font-semibold text-fg">How to read this:</span> Correlation (r) ranges from −1 (perfect inverse) to +1 (perfect positive). Values above ±0.55 = strong relationship. These are statistical associations only — they do not imply causation.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      <p className="text-[11px] text-fg3 text-center leading-relaxed pt-2">
        All analysis is computed locally from your logged data. It does not replace professional medical advice.
      </p>
    </div>
  );
};
