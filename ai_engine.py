"""
MediTwin Lite — Gemini AI Engine
=================================
All Google Gemini API functions: analysis, chat,
NLP medication parsing, and safer regimen generation.
"""

import os
import json
import re
from typing import Dict, List, Optional

try:
    from google import genai
    from google.genai import types as genai_types
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False


GEMINI_MODEL = "gemini-2.5-flash"

SYSTEM_PROMPT = """You are MediTwin Lite, an expert medication-safety AI assistant.
You analyze drug interactions in the context of a patient's complete medical profile.

Guidelines:
• Be accurate, concise, and empathetic.
• Always note that your analysis is for *informational purposes* and does NOT replace
  a physician or pharmacist.
• When suggesting alternatives, recommend the patient *discuss* them with their
  prescriber — never instruct them to change medications on their own.
• If you don't have enough information to assess a risk, say so clearly.
• Adjust your language to the selected mode (Patient = plain English, Doctor = clinical)."""


def get_gemini_client() -> Optional["genai.Client"]:
    """Return an authenticated Gemini client, or None if no API key is available."""
    if not GOOGLE_AVAILABLE:
        return None
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)


def gemini_generate(client: "genai.Client", prompt: str, system: str = SYSTEM_PROMPT) -> str:
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=genai_types.GenerateContentConfig(
            system_instruction=system,
            max_output_tokens=8192,
            temperature=0.3,
        ),
    )
    return response.text


def gemini_chat(
    client: "genai.Client",
    history: List[dict],
    new_message: str,
    system: str = SYSTEM_PROMPT,
) -> str:
    gemini_history = [
        genai_types.Content(
            role="model" if msg["role"] == "assistant" else "user",
            parts=[genai_types.Part(text=msg["content"])],
        )
        for msg in history
    ]
    chat = client.chats.create(
        model=GEMINI_MODEL,
        config=genai_types.GenerateContentConfig(
            system_instruction=system,
            max_output_tokens=8192,
            temperature=0.3,
        ),
        history=gemini_history,
    )
    return chat.send_message(new_message).text


def gemini_full_analysis(
    patient: dict,
    interactions: List[dict],
    contraindications: List[dict],
    fda_data: dict,
    mode: str,
    lang: str = "en",
) -> str:
    client = get_gemini_client()
    if client is None:
        return _fallback_analysis(patient, interactions, contraindications, mode)

    ix_lines = [
        f"- {ix['drug_a']} ↔ {ix['drug_b']} | Severity: {ix['severity']} | "
        f"Mechanism: {ix.get('mechanism', 'N/A')}"
        for ix in interactions
    ]
    ci_lines = [
        f"- {ci['drug']} contraindicated with {ci['condition']}: {ci['description']}"
        for ci in contraindications
    ]
    lang_note = (
        "Use plain, accessible language a patient can understand. Avoid jargon."
        if mode == "Patient"
        else "Use precise clinical terminology, CYP450 pathways, and cite evidence levels."
    )
    lang_instruction = (
        "\n\nIMPORTANT: Respond in Hindi (Devanagari script). Keep drug names in English."
        if lang == "hi" else ""
    )

    prompt = f"""You are a senior clinical pharmacologist. Analyze this patient's medication profile.

**Patient:**
- Age: {patient['age']}, Gender: {patient['gender']}
- Conditions: {', '.join(patient['conditions']) or 'None reported'}
- Current medications: {', '.join(patient['medications'])}

**Flagged interactions:**
{chr(10).join(ix_lines) if ix_lines else 'No known interactions flagged.'}

**Drug-Condition Contraindications:**
{chr(10).join(ci_lines) if ci_lines else 'No contraindications identified.'}

**Mode:** {mode} — {lang_note}

Structure your response using EXACTLY these section headers (preserve the === markers):

=== PATIENT SUMMARY ===
2-3 sentences summarising the overall risk profile and medication burden.

=== INTERACTION ANALYSIS ===
For EACH flagged interaction use this exact sub-format:
## DrugA ↔ DrugB (SEVERITY)
**What is happening:** one sentence.
**Why it matters for this patient:** specific risk for their age/conditions.
**Safer alternatives:** concrete alternatives to discuss with prescriber.
**Monitoring:** specific labs, vital signs, and suggested frequency.

=== CONTRAINDICATION ANALYSIS ===
For each contraindication explain the mechanism and recommended action.

=== MONITORING PLAN ===
Bulleted list of all labs, vital signs, and clinical markers to track proactively.

=== SAFETY RECOMMENDATION ===
Overall verdict and the single most important action to take.{lang_instruction}"""

    try:
        return gemini_generate(client, prompt)
    except Exception as e:
        return f"\u26a0\ufe0f AI analysis unavailable: {e}\n\n" + _fallback_analysis(
            patient, interactions, contraindications, mode
        )


def gemini_ask(
    question: str,
    patient: dict,
    interactions: List[dict],
    history: List[dict],
    lang: str = "en",
) -> str:
    client = get_gemini_client()
    if client is None:
        return "⚠️ Google API key not configured. Add your key in the sidebar settings."

    lang_note = " Respond in Hindi (Devanagari script), keeping drug names in English." if lang == "hi" else ""

    ix_summary = ""
    if interactions:
        ix_lines = [
            f"  - {ix['drug_a']} ↔ {ix['drug_b']} ({ix['severity']}): {ix['description']}"
            for ix in interactions
        ]
        ix_summary = "\nDetected interactions:\n" + "\n".join(ix_lines)

    context_prefix = (
        f"[CONTEXT] Patient: {patient['age']}yo {patient['gender']}, "
        f"Conditions: {', '.join(patient['conditions']) or 'None'}, "
        f"Medications: {', '.join(patient['medications'])}.{ix_summary}{lang_note}"
    )

    full_history: List[dict] = list(history)
    if not full_history or not full_history[0]["content"].startswith("[CONTEXT]"):
        full_history.insert(0, {"role": "user", "content": context_prefix})
        full_history.insert(1, {"role": "assistant", "content": "Understood. I have the full patient context including their medications, conditions, and any detected drug interactions. How can I help?"})

    try:
        return gemini_chat(client, full_history, question)
    except Exception as e:
        return f"⚠️ Error: {e}"



def gemini_parse_medications(text: str, available_meds: List[str]) -> dict:
    """Parse natural language medication descriptions into structured drug names."""
    client = get_gemini_client()
    if client is None:
        return {"success": False, "error": "Google API key not configured.", "medications": []}

    prompt = f"""You are a medication name resolver. Map each description to the EXACT drug names from this list:
{json.dumps(available_meds)}

Return ONLY a JSON object (no markdown, no code blocks):
{{"medications": ["DrugName1"], "mappings": [{{"input": "blood thinner", "resolved": "Warfarin", "confidence": "high"}}]}}

Rules:
- Only map to drugs in the provided list
- If unsure, set confidence to "low"
- Common: "blood thinner"→Warfarin, "water pill"→Furosemide, "Tylenol"→Acetaminophen,
  "Advil"→Ibuprofen, "Lipitor"→Atorvastatin, "Coumadin"→Warfarin, "Glucophage"→Metformin

User input: "{text}"
"""
    try:
        response = gemini_generate(client, prompt, system="Return only valid JSON. No explanations.")
        cleaned = re.sub(r"^```json\s*|^```\s*|\s*```$", "", response.strip())
        result = json.loads(cleaned)
        result["success"] = True
        return result
    except Exception as e:
        return {"success": False, "error": str(e), "medications": []}


def gemini_parse_voice(text: str, current_tab: str) -> dict:
    """Parse unstructured voice transcripts into structured health data events using Gemini."""
    client = get_gemini_client()
    if client is None:
        return {"error": "Google API key not configured.", "success": False}

    prompt = f"""You are a medical data extraction engine. The user told you the following via voice while looking at the '{current_tab}' tab of their health app.

Extract EVERY piece of health, demographic, and lifestyle data explicitly stated into a structured JSON array. Each element in the array must be an object representing one intent.

Supported Categories and exact formats required (choose best match, guess reasonably based on context if incomplete):
1. `profile`: {{"category": "profile",  "data": {{"name": "...", "age": 25, "gender": "Male|Female", "weightKg": 70, "heightCm": 180, "bloodType": "..."}}}}
2. `vitals`: {{"category": "vitals", "data": {{"metric": "bloodPressure"|"heartRate"|"glucose"|"spo2"|"temperature", "value": 120, "systolicVal": 120, "diastolicVal": 80}}}}
3. `sleep`: {{"category": "sleep", "data": {{"duration": 480}}}} (duration in minutes)
4. `activity`: {{"category": "activity", "data": {{"type": "steps"|"workout", "steps": 5000, "workoutType": "cardio"|"yoga"|"strength"|"walking"|"other", "duration": 30}}}} (duration in mins)
5. `nutrition`: {{"category": "nutrition", "data": {{"meal": "breakfast"|"lunch"|"dinner"|"snack", "calories": 500}}}}
6. `lifestyle`: {{"category": "lifestyle", "data": {{"type": "water"|"screenTime", "amount": 2000}}}} (water in ml, screenTime in mins)

Return ONLY a valid JSON array of these objects. No markdown formatting, backticks, or extra text.

Transcript: "{text}"
"""
    try:
        response = gemini_generate(client, prompt, system="Return ONLY a JSON array without markdown block wrappers.")
        cleaned = re.sub(r"^```[a-z]*\s*|\s*```$", "", response.strip(), flags=re.MULTILINE|re.IGNORECASE)
        result = json.loads(cleaned)
        return {"success": True, "parsed": result}
    except Exception as e:
        return {"success": False, "error": str(e)}

def gemini_safer_regimen(
    patient: dict,
    interactions: List[dict],
    contraindications: List[dict],
    lang: str = "en",
) -> str:
    """Generate a holistic safer medication regimen recommendation."""
    client = get_gemini_client()
    if client is None:
        return '{"error": "Google API key not configured."}'

    ix_list = "\n".join(
        f"- {ix['drug_a']} ↔ {ix['drug_b']}: {ix['severity']} — {ix['description']}"
        for ix in interactions
    )
    ci_list = "\n".join(
        f"- {ci['drug']} contraindicated with {ci['condition']}: {ci['description']}"
        for ci in contraindications
    )
    lang_note = (
        "\n\nRespond with rationales in Hindi (Devanagari), keeping drug names in English."
        if lang == "hi" else ""
    )

    prompt = f"""You are a clinical pharmacology expert. Propose a re-optimized medication regimen.

**Patient:**
- Age: {patient['age']}, Gender: {patient['gender']}
- Conditions: {', '.join(patient['conditions'])}
- Current medications: {', '.join(patient['medications'])}

**Current Drug Interactions:**
{ix_list or 'None identified'}

**Drug-Condition Contraindications:**
{ci_list or 'None identified'}

Return ONLY a raw JSON array (no markdown). Each object must have exactly:
{{
  "current_drug": "Problematic drug name",
  "proposed_replacement": "Safer alternative (or 'Discontinue' or 'Dose Adjustment')",
  "rationale": "Brief 1-2 sentence reason"
}}{lang_note}"""

    try:
        response = gemini_generate(client, prompt, system="Return ONLY raw, valid JSON array.")
        return response.strip().replace("```json", "").replace("```", "").strip()
    except Exception as e:
        return f'{{"error": "{e}"}}'


def gemini_schedule(patient: dict) -> dict:
    """
    Generate a structured daily medication schedule.
    Returns JSON with time slots and per-medication instructions.
    """
    client = get_gemini_client()
    if client is None:
        return {"error": "Google API key not configured."}

    prompt = f"""You are a clinical pharmacist. Create an optimised daily medication schedule for this patient.

**Patient:**
- Age: {patient['age']}, Gender: {patient['gender']}
- Conditions: {', '.join(patient['conditions']) or 'None reported'}
- Current medications: {', '.join(patient['medications'])}

Return ONLY a valid JSON object with this EXACT schema (no markdown, no explanation):
{{
  "schedule": [
    {{
      "time_slot": "Morning (6–9 AM)",
      "medications": [
        {{
          "name": "DrugName",
          "dose_note": "e.g. 500mg",
          "food_instruction": "With food" | "Empty stomach" | "With or without food",
          "special_note": "e.g. Take 30 min before breakfast" | ""
        }}
      ]
    }}
  ],
  "general_tips": ["tip1", "tip2"],
  "time_slots_used": ["Morning", "Noon", "Evening", "Night"]
}}

Time slots to use: Morning (6–9 AM), Noon (12–2 PM), Evening (5–7 PM), Night (9–11 PM).
Only include time slots where at least one medication is scheduled.
Base timing on clinical pharmacology (e.g. statins at night, levothyroxine empty stomach AM, etc.)."""

    try:
        response = gemini_generate(client, prompt, system="Return only valid JSON. No markdown or explanation.")
        cleaned = re.sub(r"^```json\s*|^```\s*|\s*```$", "", response.strip(), flags=re.MULTILINE)
        result = json.loads(cleaned)
        result["success"] = True
        return result
    except Exception as e:
        return {"error": str(e), "success": False}


def _fallback_analysis(
    patient: dict,
    interactions: List[dict],
    contraindications: List[dict],
    mode: str,
) -> str:
    lines = [
        "## Medication Safety Analysis (Offline Mode)\n",
        f"**Patient:** {patient['age']}yo {patient['gender']}",
        f"**Conditions:** {', '.join(patient['conditions']) or 'None reported'}",
        f"**Medications:** {', '.join(patient['medications'])}\n",
    ]

    if contraindications:
        lines.append("### 🚫 Drug-Condition Contraindications\n")
        for ci in contraindications:
            lines.append(f"**{ci['drug']}** — {ci['condition']}: {ci['description']}")
            lines.append(f"*Alternative:* {ci['alternative']}\n")

    if not interactions:
        lines.append(
            "✅ **No known drug interactions identified.** "
            "This does not guarantee absence of risk — always consult your pharmacist."
        )
    else:
        for ix in interactions:
            emoji = "🔴" if ix["severity"] == "severe" else "🟡"
            lines.append(f"### {emoji} {ix['drug_a']} ↔ {ix['drug_b']} ({ix['severity'].upper()})")
            lines.append(f"**Description:** {ix['description']}")
            lines.append(f"**Mechanism:** {ix['mechanism']}")
            lines.append(f"**Suggested alternative:** {ix['alternative']}")
            lines.append(f"**Monitoring:** {ix['monitoring']}\n")

    lines.append(
        "---\n*Offline analysis. Provide a Google AI Studio API key for personalized AI analysis.*"
    )
    return "\n".join(lines)


def gemini_lab_analyze(pdf_base64: str, file_name: str) -> dict:
    """
    Analyze a lab report PDF using Gemini multimodal.
    Returns structured JSON with extracted values, summary, actions, urgency.
    """
    client = get_gemini_client()
    if client is None:
        return {"error": "Gemini API key required to analyze lab reports."}

    prompt = """You are an expert clinical pathologist and patient advocate.

Analyze this lab report PDF and return a JSON object with EXACTLY this structure:
{
  "summary": "A 3-4 sentence plain-English explanation of the overall results written for a non-medical patient. Be warm, clear, and avoid jargon.",
  "urgency": "monitor" | "consult_soon" | "urgent",
  "values": [
    {
      "name": "Test name (e.g. LDL Cholesterol)",
      "value": "Numeric value as string",
      "unit": "Unit (e.g. mg/dL)",
      "range": "Reference range as string (e.g. <130 mg/dL)",
      "status": "normal" | "low" | "high" | "critical",
      "context": "Keep extremely brief (1 sentence, max 12 words) if abnormal, or empty string if normal"
    }
  ],
  "actions": [
    "Specific actionable recommendation (dietary, lifestyle, follow-up test, urgency level)"
  ]
}

Rules:
- Extract a maximum of 12 most clinically significant values from the report.
- PRIORITIZE abnormal, out-of-range, or critical markers first. Do not extract normal markers if the report is large.
- Mark status as 'critical' only if dangerously outside range requiring immediate attention
- urgency: 'monitor' = all normal or minor deviations, 'consult_soon' = multiple abnormals or moderate deviations, 'urgent' = critical values
- actions must be concrete and personalized to the actual values found (not generic)
- Return ONLY valid JSON, no markdown, no code fences"""

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                genai_types.Part.from_bytes(
                    data=__import__("base64").b64decode(pdf_base64),
                    mime_type="application/pdf",
                ),
                prompt,
            ],
            config=genai_types.GenerateContentConfig(
                max_output_tokens=8192,
                temperature=0.2,
                response_mime_type="application/json",
                safety_settings=[
                    genai_types.SafetySetting(
                        category=genai_types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                        threshold=genai_types.HarmBlockThreshold.BLOCK_NONE,
                    ),
                    genai_types.SafetySetting(
                        category=genai_types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                        threshold=genai_types.HarmBlockThreshold.BLOCK_NONE,
                    ),
                    genai_types.SafetySetting(
                        category=genai_types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                        threshold=genai_types.HarmBlockThreshold.BLOCK_NONE,
                    ),
                    genai_types.SafetySetting(
                        category=genai_types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                        threshold=genai_types.HarmBlockThreshold.BLOCK_NONE,
                    ),
                ]
            ),
        )
        raw = response.text.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = re.sub(r"^```[a-z]*\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw)
            
        try:
            return json.loads(raw)
        except json.JSONDecodeError as e:
            # Fallback: Attempt to repair truncated JSON
            last_brace = raw.rfind("}")
            if last_brace != -1:
                repaired = raw[:last_brace+1]
                if '"values":' in repaired and '"actions":' not in repaired:
                    repaired += '\n  ],\n  "actions": ["Note: Full analysis truncated due to report length."]\n}'
                elif '"actions":' in repaired:
                    repaired += '\n  ]\n}'
                else:
                    repaired += '\n}'
                try:
                    repaired_json = json.loads(repaired)
                    import sys
                    print("Successfully repaired truncated JSON response.", file=sys.stderr)
                    return repaired_json
                except Exception:
                    pass
            raise e
            
    except json.JSONDecodeError as e:
        import sys
        reason = "UNKNOWN"
        if 'response' in locals() and hasattr(response, 'candidates') and response.candidates:
            reason = response.candidates[0].finish_reason
        print(f"JSON Parse Error. Finish Reason: {reason}. Raw response was:\n{raw}", file=sys.stderr)
        return {"error": "Could not parse AI response. Please try again.", "summary": "", "values": [], "actions": [], "urgency": "monitor"}
    except Exception as e:
        return {"error": str(e), "summary": "", "values": [], "actions": [], "urgency": "monitor"}

