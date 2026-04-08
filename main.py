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
    gemini_parse_voice,
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

from fastapi.responses import JSONResponse
import traceback
import sys

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Global Exception: {exc}", file=sys.stderr)
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "trace": traceback.format_exc()},
        headers={"Access-Control-Allow-Origin": request.headers.get("origin", "*")}
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

class VoiceParsePayload(BaseModel):
    text: str
    current_tab: str

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

@app.post("/api/voice_parse")
def voice_parse(payload: VoiceParsePayload, request: Request):
    _set_api_key(request)
    return gemini_parse_voice(payload.text, payload.current_tab)


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
    """Generate a premium Apple-style PDF medication safety report."""
    _set_api_key(request)

    try:
        from reportlab.lib import colors as rl_colors
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import (
            BaseDocTemplate, Frame, PageTemplate,
            HRFlowable, Paragraph, Spacer, Table, TableStyle, KeepTogether,
        )
        from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
    except ImportError:
        raise HTTPException(status_code=500, detail="reportlab not installed.")

    # ── Design tokens (mirrors Scandinavian palette) ──────────────────
    C_CARD       = rl_colors.white
    C_CARD2      = rl_colors.HexColor("#ECEAE6")
    C_LINE       = rl_colors.HexColor("#E0DDD6")
    C_FG         = rl_colors.HexColor("#1C1B18")
    C_FG2        = rl_colors.HexColor("#6B6860")
    C_FG3        = rl_colors.HexColor("#9C9994")
    C_ACCENT     = rl_colors.HexColor("#1B4DCC")
    C_RISK_HI    = rl_colors.HexColor("#DC2626")
    C_RISK_MD    = rl_colors.HexColor("#C2850A")
    C_RISK_LO    = rl_colors.HexColor("#15803D")
    C_RISK_HI_BG = rl_colors.HexColor("#FEE2E2")
    C_RISK_MD_BG = rl_colors.HexColor("#FEF3C7")
    C_RISK_LO_BG = rl_colors.HexColor("#DCFCE7")

    W = letter[0] - 1.4 * inch

    def ps(name, font="Helvetica", size=10, color=None, leading=None,
           align=TA_LEFT, sb=0, sa=4, bold=False):
        return ParagraphStyle(
            name, fontName="Helvetica-Bold" if bold else font,
            fontSize=size, textColor=color or C_FG,
            leading=leading or size * 1.5,
            alignment=align, spaceBefore=sb, spaceAfter=sa,
        )

    s_hero   = ps("hero",  size=22, bold=True, color=rl_colors.white, sa=2)
    s_hsub   = ps("hsub",  size=10, color=rl_colors.HexColor("#C7D7F8"), sa=0)
    s_hdate  = ps("hdate", size=8,  color=rl_colors.HexColor("#C7D7F8"), align=TA_RIGHT)
    s_sec    = ps("sec",   size=8,  bold=True, color=C_FG3, sb=16, sa=8)
    s_ctitle = ps("ctitle",size=11, bold=True, color=C_FG, sa=3)
    s_label  = ps("lbl",   size=8,  bold=True, color=C_FG3, sa=1)
    s_value  = ps("val",   size=10, color=C_FG, sa=4)
    s_body   = ps("body",  size=9,  color=C_FG2, leading=14, sa=3)
    s_bhi    = ps("bhi",   size=8,  bold=True, color=C_RISK_HI, align=TA_CENTER)
    s_bmd    = ps("bmd",   size=8,  bold=True, color=C_RISK_MD, align=TA_CENTER)
    s_blo    = ps("blo",   size=8,  bold=True, color=C_RISK_LO, align=TA_CENTER)
    s_disc   = ps("disc",  size=8,  color=C_FG3, leading=12)
    s_ac_num = ps("acn",   size=9,  bold=True, color=C_ACCENT, align=TA_CENTER)
    s_hdlbl  = ps("hdlbl", size=8,  bold=True, color=C_FG3, align=TA_CENTER)

    def sec_label(text):
        return [
            HRFlowable(width="100%", thickness=0.5, color=C_LINE, spaceBefore=18, spaceAfter=8),
            Paragraph(f"●  {text.upper()}", s_sec),
        ]

    def info_table(rows):
        data = [[Paragraph(k, s_label), Paragraph(v or "—", s_value)] for k, v in rows]
        t = Table(data, colWidths=[1.4*inch, W - 1.4*inch])
        t.setStyle(TableStyle([
            ("ROWBACKGROUNDS", (0,0), (-1,-1), [C_CARD, C_CARD2]),
            ("TOPPADDING",    (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7),
            ("LEFTPADDING",   (0,0), (-1,-1), 12),("RIGHTPADDING",  (0,0), (-1,-1), 12),
            ("LINEBELOW",     (0,0), (-1,-2), 0.4, C_LINE),
            ("BOX",           (0,0), (-1,-1), 0.6, C_LINE),
            ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ]))
        return t

    def risk_badge(level, score):
        cm = {"High": C_RISK_HI, "Medium": C_RISK_MD, "Low": C_RISK_LO}
        bm = {"High": C_RISK_HI_BG, "Medium": C_RISK_MD_BG, "Low": C_RISK_LO_BG}
        sm = {"High": s_bhi, "Medium": s_bmd, "Low": s_blo}
        rc, rbg, rs = cm.get(level, C_FG3), bm.get(level, C_CARD2), sm.get(level, s_body)
        t = Table([[Paragraph(f"{level.upper()}  ·  Score: {score}", rs)]], colWidths=[1.7*inch])
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), rbg), ("BOX", (0,0),(-1,-1), 0.8, rc),
            ("TOPPADDING",    (0,0),(-1,-1), 5), ("BOTTOMPADDING", (0,0),(-1,-1), 5),
            ("LEFTPADDING",   (0,0),(-1,-1), 10),("RIGHTPADDING",  (0,0),(-1,-1), 10),
        ]))
        return t

    def banner():
        t = Table(
            [[Paragraph("MediTwin Lite", s_hero),
              Paragraph(datetime.now().strftime("%b %d, %Y  ·  %I:%M %p"), s_hdate)],
             [Paragraph("Medication Safety Report", s_hsub), ""]],
            colWidths=[W * 0.65, W * 0.35],
        )
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), C_ACCENT),
            ("TOPPADDING",    (0,0),(-1,-1), 18), ("BOTTOMPADDING", (0,0),(-1,-1), 18),
            ("LEFTPADDING",   (0,0),(-1,-1), 20), ("RIGHTPADDING",  (0,0),(-1,-1), 16),
            ("VALIGN",        (0,0),(-1,-1), "MIDDLE"), ("SPAN", (1,0),(1,1)),
        ]))
        return t

    def ix_card(ix):
        sev = ix.get("severity","moderate").lower()
        sc  = {"severe": C_RISK_HI, "moderate": C_RISK_MD, "low": C_RISK_LO}.get(sev, C_FG3)
        sbg = {"severe": C_RISK_HI_BG, "moderate": C_RISK_MD_BG, "low": C_RISK_LO_BG}.get(sev, C_CARD2)
        ss  = {"severe": s_bhi, "moderate": s_bmd, "low": s_blo}.get(sev, s_body)

        badge = Table([[Paragraph(sev.upper(), ss)]], colWidths=[0.75*inch])
        badge.setStyle(TableStyle([
            ("BACKGROUND", (0,0),(-1,-1), sbg), ("BOX",(0,0),(-1,-1), 0.6, sc),
            ("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),
            ("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),
        ]))

        head = Table([[
            Paragraph(f"<b>{ix.get('drug_a','')} ↔ {ix.get('drug_b','')}</b>", s_ctitle),
            badge
        ]], colWidths=[W - 0.4*inch - 0.9*inch, 0.9*inch])
        head.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,-1),C_CARD),("VALIGN",(0,0),(-1,-1),"MIDDLE"),
            ("TOPPADDING",(0,0),(-1,-1),10),("BOTTOMPADDING",(0,0),(-1,-1),6),
            ("LEFTPADDING",(0,0),(-1,-1),12),("RIGHTPADDING",(0,0),(-1,-1),12),
            ("LINEBELOW",(0,0),(-1,-1),0.4,C_LINE),
        ]))

        body_rows = [head]
        for lbl, val in [("Description", ix.get("description","")),
                         ("Mechanism",   ix.get("mechanism","")),
                         ("Alternative", ix.get("alternative","")),
                         ("Monitoring",  ix.get("monitoring",""))]:
            if val:
                r = Table([[Paragraph(lbl.upper(), s_label), Paragraph(val, s_body)]],
                          colWidths=[0.95*inch, W - 0.4*inch - 1.1*inch])
                r.setStyle(TableStyle([
                    ("BACKGROUND",(0,0),(-1,-1),C_CARD),
                    ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4),
                    ("LEFTPADDING",(0,0),(-1,-1),12),("RIGHTPADDING",(0,0),(-1,-1),12),
                ]))
                body_rows.append(r)

        outer = Table([[body_rows]], colWidths=[W])
        outer.setStyle(TableStyle([
            ("BOX",(0,0),(-1,-1),0.6,C_LINE),("BACKGROUND",(0,0),(-1,-1),C_CARD),
            ("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0),
            ("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),
        ]))
        return KeepTogether([outer, Spacer(1, 8)])

    buf = io.BytesIO()

    def on_page(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(C_LINE)
        canvas.setLineWidth(0.4)
        canvas.line(0.7*inch, 0.55*inch, letter[0]-0.7*inch, 0.55*inch)
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(C_FG3)
        canvas.drawString(0.7*inch, 0.38*inch,
            "MediTwin Lite  ·  Informational use only. Not a substitute for professional medical advice.")
        canvas.drawRightString(letter[0]-0.7*inch, 0.38*inch, f"Page {doc.page}")
        canvas.restoreState()

    doc = BaseDocTemplate(buf, pagesize=letter,
        topMargin=0.65*inch, bottomMargin=0.82*inch,
        leftMargin=0.7*inch, rightMargin=0.7*inch)
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    doc.addPageTemplates([PageTemplate(id="main", frames=frame, onPage=on_page)])

    p     = payload.patient
    risk  = payload.risk
    level = risk.get("level", "Low")

    story = [banner(), Spacer(1, 14)]

    story += sec_label("Patient Profile")
    story.append(info_table([
        ("Age",         str(p.get("age",""))),
        ("Sex",         p.get("gender","")),
        ("Conditions",  ", ".join(p.get("conditions",[])) or "None reported"),
        ("Medications", ", ".join(p.get("medications",[])) or "None"),
    ]))

    story += sec_label("Risk Assessment")
    story.append(risk_badge(level, risk.get("total", 0)))
    story.append(Spacer(1, 10))

    factors = risk.get("factors", [])
    if factors:
        frows = [[Paragraph("<b>Risk Factor</b>", s_label),
                  Paragraph("<b>Pts</b>", s_hdlbl)]]
        for f in factors:
            frows.append([Paragraph(f["factor"], s_body),
                          Paragraph(f"+{f['points']}", s_ac_num)])
        ft = Table(frows, colWidths=[W - 0.75*inch, 0.75*inch])
        ft.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,0), C_CARD2),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [C_CARD, C_CARD2]),
            ("TOPPADDING",    (0,0),(-1,-1), 6), ("BOTTOMPADDING", (0,0),(-1,-1), 6),
            ("LEFTPADDING",   (0,0),(-1,-1), 12),("RIGHTPADDING",  (0,0),(-1,-1), 12),
            ("LINEBELOW",     (0,0),(-1,-2), 0.4, C_LINE),
            ("BOX",           (0,0),(-1,-1), 0.6, C_LINE),
            ("ALIGN",         (1,0),(1,-1), "CENTER"),
            ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ]))
        story.append(ft)

    if payload.contraindications:
        story += sec_label("Drug–Condition Contraindications")
        for ci in payload.contraindications:
            sev_txt = ci.get("severity","").replace("_"," ").upper()
            rt = Table([[
                Paragraph(f"<b>{ci.get('drug','')}</b>", s_ctitle),
                Paragraph(ci.get("condition",""), s_body),
                Paragraph(sev_txt, s_bhi),
            ]], colWidths=[1.4*inch, W - 2.4*inch, 1.0*inch])
            rt.setStyle(TableStyle([
                ("BACKGROUND",(0,0),(-1,-1),C_CARD),("BOX",(0,0),(-1,-1),0.6,C_LINE),
                ("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8),
                ("LEFTPADDING",(0,0),(-1,-1),12),("RIGHTPADDING",(0,0),(-1,-1),12),
                ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
            ]))
            story.append(rt)
            if ci.get("description"):
                story.append(Paragraph(ci["description"], s_body))
            if ci.get("alternative"):
                story.append(Paragraph(f"Alternative: {ci['alternative']}", s_body))
            story.append(Spacer(1, 6))

    if payload.interactions:
        story += sec_label("Flagged Drug Interactions")
        for ix in payload.interactions:
            story.append(ix_card(ix))

    if payload.ai_analysis:
        story += sec_label("AI Clinical Analysis")
        story.append(HRFlowable(width="100%", thickness=1, color=C_LINE, spaceAfter=8, spaceBefore=4))
        for line in payload.ai_analysis.split("\n"):
            line = line.strip()
            if not line:
                story.append(Spacer(1, 4))
            elif line.startswith("#"):
                story.append(Paragraph(line.lstrip("#").strip(), s_ctitle))
            else:
                clean = line.replace("**","").replace("*","").replace("__","")
                story.append(Paragraph(clean, s_body))
        story.append(Spacer(1, 8))
        story.append(HRFlowable(width="100%", thickness=1, color=C_LINE, spaceAfter=8))

    story += [
        Spacer(1, 20),
        HRFlowable(width="100%", thickness=0.4, color=C_LINE),
        Spacer(1, 6),
        Paragraph(
            "<b>Medical Disclaimer:</b> This report is generated for informational purposes only "
            "and does not constitute medical advice, diagnosis, or treatment. Always consult a "
            "qualified healthcare professional before making any changes to your medication regimen.",
            s_disc,
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
    # Ensure any DataURL prefix from browser FileReader is stripped
    raw_b64 = payload.pdf_base64
    if "," in raw_b64:
        raw_b64 = raw_b64.split(",", 1)[1]

    _set_api_key(request)
    if not get_gemini_client():
        raise HTTPException(status_code=400, detail="Google API Key required to analyze lab reports.")

    result = gemini_lab_analyze(raw_b64, payload.file_name)

    if "error" in result and not result.get("values"):
        raise HTTPException(status_code=502, detail=result["error"])

    # Ensure required keys exist with safe defaults
    return {
        "summary":  result.get("summary", "Lab report analyzed."),
        "values":   result.get("values",  []),
        "actions":  result.get("actions", []),
        "urgency":  result.get("urgency", "monitor"),
    }
