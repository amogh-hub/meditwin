// ─────────────────────────────────────────────────────────
//  MediTwin Lite — API Client
//  Single source of truth for all backend calls.
// ─────────────────────────────────────────────────────────

import type {
  Analysis,
  ChatMessage,
  FDAData,
  ParseMedsResult,
  Patient,
  RegimenRow,
  RiskData,
  Contraindication,
  Interaction,
  TimelinePoint,
} from './types';

const BASE = 'http://localhost:8000/api';

function authHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'X-API-Key': apiKey } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Meta ──────────────────────────────────────────────────

export async function fetchMeta(): Promise<{ medications: string[]; conditions: string[] }> {
  const res = await fetch(`${BASE}/meta`);
  return handleResponse(res);
}

// ── Analysis ──────────────────────────────────────────────

export async function analyzePatient(
  patient: Patient,
  mode: string,
  apiKey: string,
): Promise<Analysis> {
  const res = await fetch(`${BASE}/analyze`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ ...patient, mode }),
  });
  return handleResponse(res);
}

// ── Regimen Optimizer ─────────────────────────────────────

export async function optimizeRegimen(
  patient: Patient,
  apiKey: string,
): Promise<RegimenRow[]> {
  const res = await fetch(`${BASE}/optimize`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify(patient),
  });
  // Backend now returns the typed array directly
  return handleResponse<RegimenRow[]>(res);
}

// ── Chat ──────────────────────────────────────────────────

export async function chatWithAI(
  patient: Patient,
  history: ChatMessage[],
  question: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ patient, history, question }),
  });
  const data = await handleResponse<{ response: string }>(res);
  return data.response;
}

// ── NLP Medication Parsing ────────────────────────────────

export async function parseMedications(
  text: string,
  apiKey: string,
): Promise<ParseMedsResult> {
  const res = await fetch(`${BASE}/parse_meds`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ text }),
  });
  return handleResponse(res);
}

// ── FDA Data ──────────────────────────────────────────────

export async function fetchFDAData(drugA: string, drugB: string): Promise<FDAData> {
  const params = new URLSearchParams({ drug_a: drugA, drug_b: drugB });
  const res = await fetch(`${BASE}/fda?${params}`);
  return handleResponse(res);
}

// ── Voice Input Parsing ──────────────────────────────────────

export async function parseVoiceWithLLM(text: string, currentContext: string, apiKey: string): Promise<any> {
  const res = await fetch(`${BASE}/voice_parse`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ text, current_tab: currentContext }),
  });
  return handleResponse(res);
}

// ── Risk Timeline ─────────────────────────────────────────

export async function fetchRiskTimeline(
  medications: string[],
  age: number,
  conditions: string[],
): Promise<TimelinePoint[]> {
  const params = new URLSearchParams({
    medications: medications.join(','),
    age: String(age),
    conditions: conditions.join(','),
  });
  const res = await fetch(`${BASE}/risk_timeline?${params}`);
  const data = await handleResponse<{ timeline: TimelinePoint[] }>(res);
  return data.timeline;
}

// ── PDF Export ────────────────────────────────────────────

export async function downloadPDF(
  patient: Patient,
  risk: RiskData,
  interactions: Interaction[],
  contraindications: Contraindication[],
  ai_analysis: string,
  apiKey: string,
): Promise<void> {
  const res = await fetch(`${BASE}/pdf`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ patient, risk, interactions, contraindications, ai_analysis }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || 'PDF export failed');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MediTwin_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// ── Medication Schedule ───────────────────────────────────

export async function fetchSchedule(
  patient: import('./types').Patient,
  apiKey: string,
): Promise<import('./types').MedSchedule> {
  const res = await fetch(`${BASE}/schedule`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify(patient),
  });
  return handleResponse(res);
}
