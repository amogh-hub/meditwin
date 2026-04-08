import { useState, useEffect } from 'react';
import {
  Shield, Activity, Database,
  HeartPulse, Bot, History, KeyRound, Sun, Moon,
  ChevronLeft, ChevronRight, CheckCircle2, User, Pill,
  Stethoscope, Sparkles, CalendarDays,
  Heart, BedDouble, Footprints, Apple, Droplets,
  FileText, LayoutGrid, Settings, ChevronDown, Trash2
} from 'lucide-react';
import { analyzePatient, fetchMeta, fetchRiskTimeline } from './api';
import type { Patient, Analysis, TimelinePoint } from './types';
import { MultiSelect } from './components/MultiSelect';
import { VoiceAssistant } from './components/VoiceAssistant';

// Health Tracking tabs
import { ProfileTab }    from './components/tabs/ProfileTab';
import { VitalsTab }     from './components/tabs/VitalsTab';
import { SleepTab }      from './components/tabs/SleepTab';
import { ActivityTab }   from './components/tabs/ActivityTab';
import { NutritionTab }  from './components/tabs/NutritionTab';
import { LifestyleTab }  from './components/tabs/LifestyleTab';
import { LabReportsTab } from './components/tabs/LabReportsTab';
import { InsightsTab }   from './components/tabs/InsightsTab';

// Medication Analysis tabs
import { WelcomeTab }   from './components/tabs/WelcomeTab';
import { DashboardTab } from './components/tabs/DashboardTab';
import { DeepDiveTab }  from './components/tabs/DeepDiveTab';
import { RegimenTab }   from './components/tabs/RegimenTab';
import { ChatTab }      from './components/tabs/ChatTab';
import { TrendsTab }    from './components/tabs/TrendsTab';
import { ScheduleTab }  from './components/tabs/ScheduleTab';

// ── Tab config ─────────────────────────────────────────────────────

const HEALTH_TABS = [
  { id: 'profile',    label: 'Profile',       icon: User        },
  { id: 'vitals',     label: 'Vitals',        icon: Heart       },
  { id: 'sleep',      label: 'Sleep',         icon: BedDouble   },
  { id: 'activity',   label: 'Activity',      icon: Footprints  },
  { id: 'nutrition',  label: 'Nutrition',     icon: Apple       },
  { id: 'lifestyle',  label: 'Lifestyle',     icon: Droplets    },
  { id: 'lab',        label: 'Lab Reports',   icon: FileText    },
  { id: 'insights',   label: 'Insights',      icon: Sparkles    },
] as const;

const ANALYSIS_TABS = [
  { id: 'welcome',   label: 'Overview',      icon: Activity     },
  { id: 'dashboard', label: 'Risk Dashboard', icon: Shield       },
  { id: 'deepdive',  label: 'Deep Dive',      icon: Database     },
  { id: 'regimen',   label: 'Safer Regimen',  icon: HeartPulse   },
  { id: 'schedule',  label: 'Schedule',       icon: CalendarDays },
  { id: 'chat',      label: 'Ask AI',         icon: Bot          },
  { id: 'trends',    label: 'Trends',         icon: History      },
] as const;

type HealthTabId   = typeof HEALTH_TABS[number]['id'];
type AnalysisTabId = typeof ANALYSIS_TABS[number]['id'];
type Section = 'health' | 'analysis';

/* ── Small field label ──────────────────────────────────── */
const FieldLabel: React.FC<{ children: React.ReactNode; badge?: string }> = ({ children, badge }) => (
  <div className="flex items-center justify-between mb-2">
    <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-fg3">{children}</span>
    {badge && (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent text-white leading-none">
        {badge}
      </span>
    )}
  </div>
);


export default function App() {
  const [section, setSection]             = useState<Section>('health');
  const [healthTab, setHealthTab]         = useState<HealthTabId>('profile');
  const [analysisTab, setAnalysisTab]     = useState<AnalysisTabId>('welcome');
  const [apiKey, setApiKey]               = useState('');
  const [mode, _setMode]                   = useState<'Patient' | 'Doctor'>('Patient');
  const [isDark, setIsDark]               = useState(true);
  const [meta, setMeta]                   = useState<{ medications: string[]; conditions: string[] }>({
    medications: [], conditions: [],
  });
  const [patient, setPatient]             = useState<Patient>({
    age: 0, gender: '', conditions: [], medications: [],
  });
  const [analysis, setAnalysis]           = useState<Analysis | null>(null);
  const [timeline, setTimeline]           = useState<TimelinePoint[]>([]);
  const [isAnalyzing, setIsAnalyzing]     = useState(false);
  const [formError, setFormError]         = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [showSettings, setShowSettings]   = useState(false);
  const [dataVersion, setDataVersion]     = useState(0);

  /* Init */
  useEffect(() => {
    const stored = localStorage.getItem('meditwin-theme');
    const dark = stored !== 'light';
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);

    const storedKey = localStorage.getItem('google_api_key') || '';
    setApiKey(storedKey);

    const storedSidebar = localStorage.getItem('meditwin-sidebar');
    if (storedSidebar === 'closed') setSidebarOpen(false);

    const storedSection = localStorage.getItem('meditwin-section') as Section | null;
    if (storedSection) setSection(storedSection);

    fetchMeta().then(setMeta).catch(console.error);

    const handleDataUpdate = () => setDataVersion(v => v + 1);
    window.addEventListener('meditwin-data-update', handleDataUpdate);
    return () => window.removeEventListener('meditwin-data-update', handleDataUpdate);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('meditwin-theme', next ? 'dark' : 'light');
  };

  const saveApiKey = (val: string) => {
    setApiKey(val);
    localStorage.setItem('google_api_key', val);
  };

  const handleAnalyze = async () => {
    setFormError(null);
    if (!patient.age || patient.age <= 0) {
      setFormError('Please enter your age before running analysis.');
      return;
    }
    if (!patient.gender) {
      setFormError('Please select a sex before running analysis.');
      return;
    }
    if (!patient.medications.length) {
      setFormError('Please add at least one medication.');
      return;
    }
    setIsAnalyzing(true);
    try {
      const result = await analyzePatient(patient, mode, apiKey);
      setAnalysis(result);
      const tl = await fetchRiskTimeline(patient.medications, patient.age, patient.conditions);
      setTimeline(tl);
      switchSection('analysis');
      setAnalysisTab('dashboard');
    } catch (e: any) {
      setFormError(`Analysis failed: ${e.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const switchSection = (s: Section) => {
    setSection(s);
    localStorage.setItem('meditwin-section', s);
  };

  const toggleSidebar = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    localStorage.setItem('meditwin-sidebar', next ? 'open' : 'closed');
  };

  /* ── Input base styles ──────────────────────────────────── */
  const inputCls = `w-full border border-line bg-bg rounded-xl px-3.5 py-2.5 text-[13px]
    text-fg placeholder-fg3 focus:outline-none focus:border-accent transition-colors`;

  const activeTabs = section === 'health' ? HEALTH_TABS : ANALYSIS_TABS;

  return (
    <div className="flex min-h-screen bg-bg text-fg font-sans">

      {/* ═══════════════════════════════════════════════════════
          LEFT SIDEBAR
      ═══════════════════════════════════════════════════════ */}
      <aside
        className={`shrink-0 flex flex-col h-screen sticky top-0 border-r border-line bg-card z-30
          overflow-hidden transition-[width] duration-300 ease-in-out
          ${sidebarOpen ? 'w-[288px]' : 'w-[64px]'}`}
      >

        {/* ── Branding bar ── */}
        <div className={`h-[57px] px-4 border-b border-line flex items-center shrink-0
          ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>

          {/* Logo */}
          <div className={`flex items-center gap-3.5 min-w-0 overflow-hidden transition-all duration-200
            ${sidebarOpen ? 'opacity-100 max-w-full' : 'opacity-0 max-w-0 pointer-events-none'}`}>
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0
              shadow-sm border border-line/50 overflow-hidden">
              <img src="/meditwin-logo.png" alt="MediTwin" className="w-full h-full object-cover scale-[1.9]" />
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <div className="text-[18px] font-extrabold font-grotesk tracking-tighter text-fg leading-none">
                MediTwin
              </div>
              <div className="text-[8.5px] uppercase tracking-[0.25em] text-fg3 font-semibold mt-1">
                Lite Edition
              </div>
            </div>
          </div>

          {/* Collapsed: icon only */}
          {!sidebarOpen && (
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm border border-line/50 overflow-hidden">
              <img src="/meditwin-logo.png" alt="MediTwin" className="w-full h-full object-cover scale-[1.9]" />
            </div>
          )}



          {/* Collapse toggle */}
          {sidebarOpen && (
            <button
              onClick={toggleSidebar}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-fg3
                hover:text-fg hover:bg-card2 transition-colors shrink-0"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collapsed: expand button */}
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="mx-auto mt-4 w-9 h-9 flex items-center justify-center rounded-lg
              text-fg3 hover:text-fg hover:bg-card2 transition-colors"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* ── Section switcher (expanded only) ── */}
        <div className={`px-4 pt-4 pb-2 shrink-0 transition-opacity duration-200
          ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex items-center gap-1 p-0.5 rounded-xl border border-line bg-bg">
            <button
              onClick={() => switchSection('health')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all ${
                section === 'health'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-fg3 hover:text-fg'
              }`}
            >
              <LayoutGrid className="w-3 h-3" />
              Health
            </button>
            <button
              onClick={() => switchSection('analysis')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all ${
                section === 'analysis'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-fg3 hover:text-fg'
              }`}
            >
              <Shield className="w-3 h-3" />
              Meds
            </button>
          </div>
        </div>

        {/* ── Scrollable form content (Medication Analysis section only) ── */}
        {section === 'analysis' && (
          <div className={`flex-1 overflow-y-auto transition-opacity duration-200
            ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

            {/* ─ Patient Profile section ─ */}
            <div className="px-5 pt-4 pb-2">
              <div className="flex items-center gap-2 mb-5">
                <User className="w-3.5 h-3.5 text-fg3" />
                <span className="text-[11px] uppercase tracking-[0.16em] font-semibold text-fg3">
                  Patient Profile
                </span>
              </div>

              {/* Age + Gender row */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div>
                  <FieldLabel>Age</FieldLabel>
                  <input
                    type="number"
                    value={patient.age === 0 ? '' : patient.age}
                    onChange={(e) => { setPatient({ ...patient, age: Number(e.target.value) }); setFormError(null); }}
                    placeholder="e.g. 45"
                    min={1}
                    max={120}
                    className={inputCls}
                  />
                </div>
                <div>
                  <FieldLabel>Sex</FieldLabel>
                  <select
                    value={patient.gender}
                    onChange={(e) => { setPatient({ ...patient, gender: e.target.value }); setFormError(null); }}
                    className={`${inputCls} appearance-none cursor-pointer`}
                  >
                    <option value="" disabled>Select…</option>
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>
              </div>

              {/* Conditions */}
              <div className="mb-5">
                <FieldLabel badge={patient.conditions.length > 0 ? String(patient.conditions.length) : undefined}>
                  <span className="flex items-center gap-1.5">
                    <Stethoscope className="w-3 h-3" />
                    Conditions
                  </span>
                </FieldLabel>
                <MultiSelect
                  options={meta.conditions}
                  selected={patient.conditions}
                  onChange={(conditions) => setPatient({ ...patient, conditions })}
                  placeholder="Search conditions…"
                />
              </div>

              {/* Medications */}
              <div className="mb-6">
                <FieldLabel badge={patient.medications.length > 0 ? String(patient.medications.length) : undefined}>
                  <span className="flex items-center gap-1.5">
                    <Pill className="w-3 h-3" />
                    Medications
                  </span>
                </FieldLabel>
                <MultiSelect
                  options={meta.medications}
                  selected={patient.medications}
                  onChange={(medications) => setPatient({ ...patient, medications })}
                  placeholder="Search medications…"
                />
              </div>

              {/* Analyze CTA */}
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || patient.medications.length === 0}
                className="w-full py-3 rounded-xl bg-accent text-white text-[13px] font-semibold
                  hover:opacity-90 active:scale-[0.98] disabled:opacity-40 transition-all
                  flex items-center justify-center gap-2
                  shadow-lg shadow-accent/20"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Run Analysis
                  </>
                )}
              </button>

              {/* Inline validation error */}
              {formError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-risk-hi/10 border border-risk-hi/25 text-[11.5px] text-risk-hi font-medium mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-risk-hi shrink-0" />
                  {formError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Health section sidebar info ── */}
        {section === 'health' && (
          <div className={`flex-1 overflow-y-auto transition-opacity duration-200
            ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="px-5 pt-4 pb-4">
              <div className="p-4 rounded-xl bg-bg border border-line space-y-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-3.5 h-3.5 text-risk-hi" />
                  <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-fg3">Quick Stats</span>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Vitals logged', key: 'mt_vitals' },
                    { label: 'Sleep entries', key: 'mt_sleep' },
                    { label: 'Workouts',     key: 'mt_workouts' },
                    { label: 'Meals logged', key: 'mt_nutrition' },
                  ].map(({ label, key }) => {
                    const count = (() => { try { return (JSON.parse(localStorage.getItem(key) || '[]') as any[]).length; } catch { return 0; } })();
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-[11.5px] text-fg2">{label}</span>
                        <span className="text-[12px] font-bold font-grotesk text-fg">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 p-4 rounded-xl bg-accent/8 border border-accent/20">
                <p className="text-[11.5px] text-fg2 leading-relaxed">
                  <span className="font-semibold text-accent">Log consistently</span> across Vitals, Sleep, Activity, and Nutrition to unlock AI-powered cross-metric insights.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─ Settings / API Key — pinned to sidebar bottom ─ */}
        <div className={`px-4 pb-4 pt-2 border-t border-line shrink-0 transition-opacity duration-200
          ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

          {/* Settings toggle button */}
          <button
            onClick={() => setShowSettings(s => !s)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl
              hover:bg-card2 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5 text-fg3 group-hover:text-fg transition-colors" />
              <span className="text-[11.5px] font-medium text-fg3 group-hover:text-fg transition-colors">Settings</span>
            </div>
            <div className="flex items-center gap-2">
              {apiKey && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="API key active" />
              )}
              <ChevronDown className={`w-3 h-3 text-fg3 transition-transform duration-200
                ${showSettings ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Expanded settings panel */}
          {showSettings && (
            <div className="mt-2 px-1 animate-slide-down">
              <div className="rounded-xl border border-line bg-bg p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <KeyRound className="w-3 h-3 text-fg3" />
                  <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-fg3">Gemini API Key</span>
                </div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => saveApiKey(e.target.value)}
                  placeholder="AIzaSy…"
                  className={`w-full border rounded-lg px-3 py-2 text-[12px] focus:outline-none
                    transition-colors bg-card text-fg placeholder-fg3
                    ${apiKey
                      ? 'border-emerald-500/40 focus:border-emerald-500'
                      : 'border-line focus:border-accent'}`}
                />
                <div className={`flex items-center gap-1.5 text-[11px] font-medium
                  ${apiKey ? 'text-emerald-500' : 'text-fg3'}`}>
                  {apiKey
                    ? <><CheckCircle2 className="w-3 h-3 shrink-0" /> AI features active</>
                    : <><span className="opacity-50">Enter key to enable AI analysis</span></>
                  }
                </div>
                
                <div className="pt-2 mt-2 border-t border-line/50">
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear all health data? This cannot be undone.')) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-risk-hi/10 text-risk-hi hover:bg-risk-hi/20 transition-colors text-[11.5px] font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All Data
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Collapsed tab-icon rail */}
        {!sidebarOpen && (
          <div className="flex-1 flex flex-col items-center gap-1 pt-2 pb-4">
            {/* Section toggle icons */}
            <button
              onClick={() => switchSection('health')}
              title="Health Tracking"
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors mb-1 ${
                section === 'health' ? 'bg-accent text-white' : 'text-fg3 hover:bg-card2 hover:text-fg'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => switchSection('analysis')}
              title="Medication Analysis"
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors mb-2 ${
                section === 'analysis' ? 'bg-accent text-white' : 'text-fg3 hover:bg-card2 hover:text-fg'
              }`}
            >
              <Shield className="w-4 h-4" />
            </button>
            <div className="w-6 h-px bg-line mb-1" />
            {activeTabs.map((tab) => {
              const locked = section === 'analysis' && !analysis && tab.id !== 'welcome';
              const active = section === 'health'
                ? healthTab === tab.id
                : analysisTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (locked) return;
                    if (section === 'health') setHealthTab(tab.id as HealthTabId);
                    else setAnalysisTab(tab.id as AnalysisTabId);
                  }}
                  title={tab.label}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors
                    ${active
                      ? 'bg-accent text-white'
                      : locked
                      ? 'text-fg3 opacity-40 cursor-not-allowed'
                      : 'text-fg2 hover:bg-card2 hover:text-fg'}`}
                >
                  <tab.icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        )}
      </aside>

      {/* ═══════════════════════════════════════════════════════
          RIGHT PANEL
      ═══════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="sticky top-0 z-40 h-[57px] border-b border-line bg-card px-8
          flex items-center justify-between shrink-0">

          {/* Section label + mode toggle */}
          {section === 'health' && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center">
                <Heart className="w-3.5 h-3.5 text-accent" />
              </div>
              <span className="text-[13px] font-semibold text-fg">Health Tracking</span>
            </div>
          )}

          {section === 'analysis' && (
            <div className="flex items-center gap-4">
              {/* Section label */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5 text-accent" />
                </div>
                <span className="text-[13px] font-semibold text-fg">Medication Analysis</span>
              </div>


            </div>
          )}

          {/* Quick Actions (Mic & Theme) */}
          <div className="flex items-center gap-2 ml-auto">
            <VoiceAssistant currentTab={section === 'health' ? healthTab : 'none'} />
            <button
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-line
                text-fg2 hover:text-fg hover:bg-card2 transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Tab navigation */}
        <div className="sticky top-[57px] z-30 border-b border-line bg-card px-8 flex items-end gap-0 shrink-0 overflow-x-auto">
          {activeTabs.map((tab) => {
            const locked = section === 'analysis' && !analysis && tab.id !== 'welcome';
            const active = section === 'health'
              ? healthTab === tab.id
              : analysisTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (locked) return;
                  if (section === 'health') setHealthTab(tab.id as HealthTabId);
                  else setAnalysisTab(tab.id as AnalysisTabId);
                }}
                disabled={locked}
                className={`flex items-center gap-2 px-4 py-3.5 text-[13px] font-medium
                  border-b-2 transition-colors whitespace-nowrap
                  ${active
                    ? 'border-accent text-accent'
                    : locked
                    ? 'border-transparent text-fg3 cursor-not-allowed'
                    : 'border-transparent text-fg2 hover:text-fg hover:border-line2'
                  }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <main key={dataVersion} className="flex-1 p-8 overflow-y-auto h-full">

          {/* ── Health Tracking tabs ── */}
          {section === 'health' && healthTab === 'profile'   && <div key="profile"   className="tab-panel"><ProfileTab patient={patient} /></div>}
          {section === 'health' && healthTab === 'vitals'    && <div key="vitals"    className="tab-panel"><VitalsTab /></div>}
          {section === 'health' && healthTab === 'sleep'     && <div key="sleep"     className="tab-panel"><SleepTab /></div>}
          {section === 'health' && healthTab === 'activity'  && <div key="activity"  className="tab-panel"><ActivityTab /></div>}
          {section === 'health' && healthTab === 'nutrition' && <div key="nutrition" className="tab-panel"><NutritionTab /></div>}
          {section === 'health' && healthTab === 'lifestyle' && <div key="lifestyle" className="tab-panel"><LifestyleTab /></div>}
          {section === 'health' && healthTab === 'lab'       && <div key="lab"       className="tab-panel"><LabReportsTab apiKey={apiKey} /></div>}
          {section === 'health' && healthTab === 'insights'  && <div key="insights"  className="tab-panel"><InsightsTab /></div>}

          {/* ── Medication Analysis tabs ── */}
          {section === 'analysis' && analysisTab === 'welcome' && (
            <div key="welcome" className="tab-panel h-full">
              <WelcomeTab
                apiKey={apiKey}
                onSetMeds={(meds) => setPatient({ ...patient, medications: meds })}
                availableMeds={meta.medications}
              />
            </div>
          )}
          {section === 'analysis' && analysisTab === 'dashboard' && analysis && (
            <div key="dashboard" className="tab-panel">
              <DashboardTab patient={patient} analysis={analysis} apiKey={apiKey} />
            </div>
          )}
          {section === 'analysis' && analysisTab === 'deepdive' && analysis && (
            <div key="deepdive" className="tab-panel">
              <DeepDiveTab patient={patient} analysis={analysis} mode={mode} />
            </div>
          )}
          {section === 'analysis' && analysisTab === 'regimen' && analysis && (
            <div key="regimen" className="tab-panel">
              <RegimenTab patient={patient} apiKey={apiKey} />
            </div>
          )}
          {section === 'analysis' && analysisTab === 'chat' && analysis && (
            <div key="chat" className="tab-panel h-full">
              <ChatTab patient={patient} apiKey={apiKey} analysis={analysis} />
            </div>
          )}
          {section === 'analysis' && analysisTab === 'schedule' && analysis && (
            <div key="schedule" className="tab-panel">
              <ScheduleTab patient={patient} apiKey={apiKey} />
            </div>
          )}
          {section === 'analysis' && analysisTab === 'trends' && timeline.length > 0 && (
            <div key="trends" className="tab-panel">
              <TrendsTab timeline={timeline} />
            </div>
          )}

          {/* Locked state — analysis tabs without analysis run */}
          {section === 'analysis' && !analysis && analysisTab !== 'welcome' && (
            <div className="flex flex-col items-center justify-center py-24 gap-5">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Shield className="w-8 h-8 text-accent" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-[18px] font-bold font-grotesk text-fg">Run an Analysis First</h3>
                <p className="text-[13px] text-fg2 max-w-xs leading-relaxed">
                  Add medications and conditions in the sidebar, then click <strong>Run Analysis</strong> to unlock this view.
                </p>
              </div>
              <button
                onClick={() => setAnalysisTab('welcome')}
                className="px-5 py-2.5 rounded-xl bg-accent text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
              >
                Go to Overview
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}