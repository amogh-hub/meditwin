"""
MediTwin Lite — FastAPI Backend
================================
Serves the React frontend with medication safety analysis,
live FDA data, Gemini AI reasoning, risk scoring, and PDF export.

Run:
    uvicorn main:app --reload
"""

import io
import json
import os
from datetime import datetime
from itertools import combinations
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from ai_engine import (
    gemini_ask,
    gemini_full_analysis,
    gemini_lab_analyze,
    gemini_parse_medications,
    gemini_safer_regimen,
    gemini_schedule,
    get_gemini_client,
)
from interactions import (
    CONDITIONS,
    MEDICATIONS,
    check_contraindications,
    compute_stack_risks,
    detect_duplicate_therapy,
    detect_patterns,
    lookup_interaction,
)

# ── App & CORS ────────────────────────────────────────────────────

app = FastAPI(title="MediTwin Lite API", version="1.0.0")

_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Constants ─────────────────────────────────────────────────────

OPENFDA_EVENT = "https://api.fda.gov/drug/event.json"
OPENFDA_LABEL = "https://api.fda.gov/drug/label.json"

# ── Helpers ───────────────────────────────────────────────────────


def _set_api_key(request: Request) -> None:
    """Inject the per-request API key into the environment so ai_engine can pick it up."""
    key = request.headers.get("X-API-Key", "")
    if key:
        os.environ["GOOGLE_API_KEY"] = key


def _compute_risk(
    age: int,
    conditions: List[str],
    medications: List[str],
    interactions: List[dict],
    contraindications: List[dict],
) -> Dict[str, Any]:
    """Score-based risk model. Returns total, level, and per-factor breakdown."""
    factors: List[dict] = []

    if age >= 75:
        factors.append({"factor": "Age ≥ 75", "points": 3})
    elif age >= 60:
        factors.append({"factor": "Age ≥ 60", "points": 2})

    cond_lower = [c.lower() for c in conditions]
    if any("kidney" in c for c in cond_lower):
        factors.append({"factor": "Chronic Kidney Disease", "points": 3})
    if any("liver" in c or "hepatic" in c for c in cond_lower):
        factors.append({"factor": "Liver Disease", "points": 3})
    if any("heart failure" in c for c in cond_lower):
        factors.append({"factor": "Heart Failure", "points": 2})
    if any("diabetes" in c for c in cond_lower):
        factors.append({"factor": "Diabetes", "points": 1})
    if len(medications) >= 5:
        factors.append({"factor": f"Polypharmacy ({len(medications)} meds)", "points": 2})

    for ix in interactions:
        sev = ix.get("severity", "moderate").lower()
        pts = 6 if sev == "severe" else 4
        label = "Severe" if sev == "severe" else "Moderate"
        factors.append({"factor": f"{label} interaction: {ix['drug_a']} ↔ {ix['drug_b']}", "points": pts})

    for ci in contraindications:
        sev = ci.get("severity", "high_risk")
        pts = 5 if sev == "contraindicated" else 3
        factors.append({"factor": f"{ci['drug']} contraindicated ({ci['condition']})", "points": pts})

    total = sum(f["points"] for f in factors)
    level = "High" if total > 14 else "Medium" if total > 6 else "Low"
    return {"total": total, "level": level, "factors": factors}


# ── Pydantic Models ───────────────────────────────────────────────


class PatientPayload(BaseModel):
    age: int
    gender: str
    conditions: List[str]
    medications: List[str]
    mode: str = "Doctor"


class ChatPayload(BaseModel):
    patient: PatientPayload
    history: List[dict]
    question: str


class ParseMedsPayload(BaseModel):
    text: str


class PdfPayload(BaseModel):
    patient: dict
    risk: dict
    interactions: List[dict]
    contraindications: List[dict]
    ai_analysis: str


class LabAnalyzePayload(BaseModel):
    pdf_base64: str
    file_name: str = "lab_report.pdf"


# ── Routes ────────────────────────────────────────────────────────


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/api/meta")
def meta():
    return {"medications": MEDICATIONS, "conditions": CONDITIONS}


@app.post("/api/analyze")
def analyze(payload: PatientPayload, request: Request):
    _set_api_key(request)
    meds = payload.medications
    conds = payload.conditions

    interactions = [
        ix
        for da, db in combinations(meds, 2)
        if (ix := lookup_interaction(da, db)) is not None
    ]
    contra = check_contraindications(meds, conds)
    patterns = detect_patterns(meds, conds)
    risk = _compute_risk(payload.age, conds, meds, interactions, contra)

    ai_text = ""
    if get_gemini_client():
        ai_text = gemini_full_analysis(
            patient=payload.model_dump(),
            interactions=interactions,
            contraindications=contra,
            fda_data={},
            mode=payload.mode,
            lang="en",
        )

    stack_risks = compute_stack_risks(meds)
    duplicates  = detect_duplicate_therapy(meds)

    return {
        "risk": risk,
        "interactions": interactions,
        "contraindications": contra,
        "patterns": patterns,
        "ai_analysis": ai_text,
        "stack_risks": stack_risks,
        "duplicate_therapy": duplicates,
    }


@app.post("/api/optimize")
def optimize(payload: PatientPayload, request: Request) -> List[Dict[str, Any]]:
    _set_api_key(request)
    meds, conds = payload.medications, payload.conditions

    interactions = [
        ix
        for da, db in combinations(meds, 2)
        if (ix := lookup_interaction(da, db)) is not None
    ]
    contra = check_contraindications(meds, conds)

    if not get_gemini_client():
        raise HTTPException(status_code=400, detail="Google API Key required.")

    raw = gemini_safer_regimen(payload.model_dump(), interactions, contra, lang="en")

    # Strip any residual markdown fences the model may have added
    cleaned = raw.strip()
    for fence in ("```json", "```JSON", "```"):
        cleaned = cleaned.replace(fence, "")
    cleaned = cleaned.strip()

    try:
        parsed = json.loads(cleaned)
        if not isinstance(parsed, list):
            raise ValueError("Expected JSON array")
        # Validate each row has required keys
        rows: List[Dict[str, Any]] = []
        for item in parsed:
            rows.append({
                "current_drug":         str(item.get("current_drug", "Unknown")),
                "proposed_replacement": str(item.get("proposed_replacement", "—")),
                "rationale":            str(item.get("rationale", "—")),
            })
        return rows
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"AI returned malformed data: {exc}. Raw: {cleaned[:200]}",
        )


@app.post("/api/chat")
def chat(payload: ChatPayload, request: Request):
    _set_api_key(request)
    meds = payload.patient.medications
    interactions = [
        ix
        for da, db in combinations(meds, 2)
        if (ix := lookup_interaction(da, db)) is not None
    ]
    response = gemini_ask(
        question=payload.question,
        patient=payload.patient.model_dump(),
        interactions=interactions,
        history=payload.history,
        lang="en",
    )
    return {"response": response}



@app.post("/api/schedule")
def schedule(payload: PatientPayload, request: Request):
    """Generate a structured medication schedule using Gemini."""
    _set_api_key(request)
    if not get_gemini_client():
        raise HTTPException(status_code=400, detail="Google API Key required.")
    result = gemini_schedule(payload.model_dump())
    return result


@app.post("/api/parse_meds")
def parse_meds(payload: ParseMedsPayload, request: Request):
    _set_api_key(request)
    return gemini_parse_medications(payload.text, MEDICATIONS)


@app.get("/api/fda")
async def fda_data(
    drug_a: str = Query(..., description="First drug name"),
    drug_b: str = Query(..., description="Second drug name"),
):
    """Fetch live OpenFDA adverse event count, top reactions, and label snippets."""
    result: Dict[str, Any] = {
        "adverse_event_count": 0,
        "top_reactions": [],
        "label_text_a": None,
        "label_text_b": None,
    }
    q = (
        f'patient.drug.openfda.generic_name:"{drug_a}"'
        f'+AND+patient.drug.openfda.generic_name:"{drug_b}"'
    )
    async with httpx.AsyncClient(timeout=8) as client:
        # Adverse event count
        try:
            r = await client.get(OPENFDA_EVENT, params={"search": q, "limit": 1})
            if r.status_code == 200:
                result["adverse_event_count"] = (
                    r.json().get("meta", {}).get("results", {}).get("total", 0)
                )
        except Exception:
            pass

        # Top reactions
        try:
            r = await client.get(
                OPENFDA_EVENT,
                params={"search": q, "count": "patient.reaction.reactionmeddrapt.exact", "limit": 5},
            )
            if r.status_code == 200:
                result["top_reactions"] = r.json().get("results", [])
        except Exception:
            pass

        # Label snippets
        for drug, key in [(drug_a, "label_text_a"), (drug_b, "label_text_b")]:
            try:
                r = await client.get(
                    OPENFDA_LABEL,
                    params={"search": f'openfda.generic_name:"{drug}"', "limit": 1},
                )
                if r.status_code == 200:
                    items = r.json().get("results", [])
                    if items:
                        snippets = items[0].get("drug_interactions", [])
                        if snippets:
                            result[key] = snippets[0][:1500]
            except Exception:
                pass

    return result


@app.get("/api/risk_timeline")
def risk_timeline(
    medications: str = Query(..., description="Comma-separated medication names"),
    age: int = Query(...),
    conditions: str = Query("", description="Comma-separated condition names"),
):
    """Return cumulative risk score as each medication is added sequentially."""
    meds = [m.strip() for m in medications.split(",") if m.strip()]
    conds = [c.strip() for c in conditions.split(",") if c.strip()]

    points = []
    for i in range(1, len(meds) + 1):
        subset = meds[:i]
        ixs = [
            ix
            for da, db in combinations(subset, 2)
            if (ix := lookup_interaction(da, db)) is not None
        ]
        risk = _compute_risk(age, conds, subset, ixs, [])
        points.append({"medication": subset[-1], "score": risk["total"], "level": risk["level"]})

    return {"timeline": points}


@app.post("/api/pdf")
def export_pdf(payload: PdfPayload, request: Request):
    """Generate and return a PDF medication safety report."""
    _set_api_key(request)

    try:
        from reportlab.lib import colors as rl_colors

        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import (
            HRFlowable,
            Paragraph,
            SimpleDocTemplate,
            Spacer,
            Table,
            TableStyle,
        )
    except ImportError:
        raise HTTPException(status_code=500, detail="reportlab not installed.")

    styles = getSampleStyleSheet()
    title_s = ParagraphStyle(
        "T", parent=styles["Title"], fontSize=22,
        textColor=rl_colors.HexColor("#1565c0"), spaceAfter=6,
    )
    heading_s = ParagraphStyle(
        "H", parent=styles["Heading2"], fontSize=14,
        textColor=rl_colors.HexColor("#0d47a1"), spaceBefore=14, spaceAfter=6,
    )
    body_s = ParagraphStyle("B", parent=styles["BodyText"], fontSize=10, leading=14, spaceAfter=6)
    small_s = ParagraphStyle(
        "S", parent=styles["BodyText"], fontSize=8,
        textColor=rl_colors.grey, spaceAfter=2,
    )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=letter,
        topMargin=0.6 * inch, bottomMargin=0.6 * inch,
        leftMargin=0.75 * inch, rightMargin=0.75 * inch,
    )

    p = payload.patient
    story = [
        Paragraph("MediTwin Lite — Medication Safety Report", title_s),
        Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}", small_s),
        HRFlowable(width="100%", thickness=1, color=rl_colors.HexColor("#1565c0")),
        Spacer(1, 12),
        Paragraph("Patient Profile", heading_s),
    ]

    info = Table(
        [
            ["Age", str(p.get("age", ""))],
            ["Gender", p.get("gender", "")],
            ["Conditions", ", ".join(p.get("conditions", [])) or "None"],
            ["Medications", ", ".join(p.get("medications", []))],
        ],
        colWidths=[1.5 * inch, 5 * inch],
    )
    info.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), rl_colors.HexColor("#e3f2fd")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, rl_colors.HexColor("#bbdefb")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story += [info, Spacer(1, 12)]

    risk = payload.risk
    rc = {"Low": "#4caf50", "Medium": "#ff9800", "High": "#f44336"}.get(risk.get("level", ""), "#999")
    story.append(Paragraph("Risk Assessment", heading_s))
    story.append(Paragraph(
        f'Overall Risk Score: <b><font color="{rc}">{risk.get("total")} — {risk.get("level")}</font></b>',
        body_s,
    ))
    for f in risk.get("factors", []):
        story.append(Paragraph(f"• {f['factor']}: +{f['points']} points", body_s))
    story.append(Spacer(1, 8))

    if payload.contraindications:
        story.append(Paragraph("Drug-Condition Contraindications", heading_s))
        for ci in payload.contraindications:
            story.append(Paragraph(
                f'<b>{ci["drug"]}</b> — {ci["condition"]} [{ci["severity"].upper().replace("_", " ")}]',
                body_s,
            ))
            story.append(Paragraph(ci["description"], body_s))
            story.append(Paragraph(f'Alternative: {ci["alternative"]}', body_s))
            story.append(Spacer(1, 4))

    if payload.interactions:
        story.append(Paragraph("Flagged Drug Interactions", heading_s))
        for ix in payload.interactions:
            story.append(Paragraph(
                f'<b>{ix["drug_a"]} ↔ {ix["drug_b"]}</b>  [{ix["severity"].upper()}]', body_s,
            ))
            story.append(Paragraph(f'<i>{ix["description"]}</i>', body_s))
            story.append(Paragraph(f'Mechanism: {ix["mechanism"]}', body_s))
            story.append(Paragraph(f'Alternative: {ix["alternative"]}', body_s))
            story.append(Paragraph(f'Monitoring: {ix["monitoring"]}', body_s))
            story.append(Spacer(1, 6))

    if payload.ai_analysis:
        story.append(Paragraph("AI-Powered Analysis", heading_s))
        for line in payload.ai_analysis.split("\n"):
            line = line.strip()
            if not line:
                story.append(Spacer(1, 4))
            elif line.startswith("##"):
                story.append(Paragraph(line.lstrip("#").strip(), heading_s))
            else:
                story.append(Paragraph(line.replace("**", "").replace("*", ""), body_s))

    story += [
        Spacer(1, 20),
        HRFlowable(width="100%", thickness=0.5, color=rl_colors.grey),
        Paragraph(
            "<b>Disclaimer:</b> This report is for informational purposes only and does not "
            "constitute medical advice. Always consult your healthcare provider before making "
            "any changes to your medication regimen.",
            small_s,
        ),
    ]

    doc.build(story)
    return Response(
        content=buf.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=MediTwin_Report.pdf"},
    )


@app.post("/api/lab_analyze")
def lab_analyze(payload: LabAnalyzePayload, request: Request):
    """Parse a base64-encoded lab report PDF with Gemini and return structured values."""
    _set_api_key(request)
    if not get_gemini_client():
        raise HTTPException(status_code=400, detail="Google API Key required to analyze lab reports.")

    result = gemini_lab_analyze(payload.pdf_base64, payload.file_name)

    if "error" in result and not result.get("values"):
        raise HTTPException(status_code=502, detail=result["error"])

    # Ensure required keys exist with safe defaults
    return {
        "summary":  result.get("summary", "Lab report analyzed."),
        "values":   result.get("values",  []),
        "actions":  result.get("actions", []),
        "urgency":  result.get("urgency", "monitor"),
    }