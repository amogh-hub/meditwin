// ─────────────────────────────────────────────────────────
//  MediTwin Lite — Shared TypeScript Interfaces
// ─────────────────────────────────────────────────────────

export interface Patient {
  age: number;
  gender: string;
  conditions: string[];
  medications: string[];
}

export interface Interaction {
  drug_a: string;
  drug_b: string;
  severity: 'severe' | 'moderate' | 'low';
  description: string;
  mechanism: string;
  alternative: string;
  monitoring: string;
  evidence_level: string;
  source?: string;
}

export interface Contraindication {
  drug: string;
  condition: string;
  severity: string;
  description: string;
  alternative: string;
  evidence: string;
}

export interface Pattern {
  icon: string;
  title: string;
  description: string;
  severity: string;
}

export interface RiskData {
  total: number;
  level: 'Low' | 'Medium' | 'High';
  factors: { factor: string; points: number }[];
}

export interface StackRisk {
  count: number;
  drugs: string[];
  level: 'none' | 'low' | 'moderate' | 'high';
  label: string;
  description: string;
}

export interface StackRisks {
  qt: StackRisk;
  sero: StackRisk;
  cns: StackRisk;
}

export interface DuplicateTherapy {
  category: string;
  drugs: string[];
  severity: 'high' | 'moderate';
  description: string;
}

export interface Analysis {
  risk: RiskData;
  interactions: Interaction[];
  contraindications: Contraindication[];
  patterns: Pattern[];
  ai_analysis: string;
  stack_risks?: StackRisks;
  duplicate_therapy?: DuplicateTherapy[];
}

export interface ScheduleMedication {
  name: string;
  dose_note: string;
  food_instruction: string;
  special_note: string;
}

export interface ScheduleSlot {
  time_slot: string;
  medications: ScheduleMedication[];
}

export interface MedSchedule {
  success: boolean;
  schedule: ScheduleSlot[];
  general_tips: string[];
  time_slots_used: string[];
  error?: string;
}

export interface FDAData {
  adverse_event_count: number;
  top_reactions: { term: string; count: number }[];
  label_text_a?: string;
  label_text_b?: string;
}

export interface RegimenRow {
  current_drug: string;
  proposed_replacement: string;
  rationale: string;
}

export interface RiskEntry {
  label: string;
  score: number;
  level: string;
  med_count: number;
}

export interface TimelinePoint {
  medication: string;
  score: number;
  level: string;
}

export interface ParseMedsResult {
  success: boolean;
  medications: string[];
  mappings: { input: string; resolved: string; confidence: string }[];
  error?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
