"""
MediTwin Lite — Curated Interaction & Drug Property Databases
=============================================================
"""
from typing import Dict, List, Optional

# ================================================================
#  MEDICATION & CONDITION LISTS
# ================================================================

MEDICATIONS = sorted([
    "Acetaminophen", "Albuterol", "Amlodipine", "Amiodarone",
    "Amoxicillin", "Apixaban", "Aspirin", "Atenolol", "Atorvastatin",
    "Azithromycin", "Carvedilol", "Celecoxib", "Ciprofloxacin",
    "Clarithromycin", "Clopidogrel", "Cyclosporine",
    "Diazepam", "Digoxin", "Diltiazem", "Duloxetine",
    "Empagliflozin", "Enalapril", "Escitalopram", "Fluconazole",
    "Fluoxetine", "Furosemide", "Gabapentin", "Glipizide",
    "Hydrochlorothiazide", "Ibuprofen", "Insulin", "Ketoconazole",
    "Levothyroxine", "Lisinopril", "Lithium", "Losartan",
    "Metformin", "Methotrexate", "Metoprolol", "Metronidazole",
    "Naproxen", "Omeprazole", "Oxycodone", "Pantoprazole",
    "Potassium Chloride", "Pravastatin", "Prednisone", "Quetiapine",
    "Rivaroxaban", "Rosuvastatin", "Sertraline", "Sildenafil",
    "Simvastatin", "Sitagliptin", "Spironolactone", "Tramadol",
    "Venlafaxine", "Verapamil", "Warfarin",
])

CONDITIONS = [
    "Hypertension", "Type 2 Diabetes", "Chronic Kidney Disease",
    "Liver Disease (Hepatic Impairment)", "Heart Failure",
    "Atrial Fibrillation", "Coronary Artery Disease",
    "COPD", "Asthma", "Depression", "Anxiety",
    "Hypothyroidism", "Hyperthyroidism",
    "Osteoarthritis", "Rheumatoid Arthritis", "Gout",
    "Epilepsy / Seizure Disorder", "Chronic Pain",
    "GERD / Acid Reflux", "Osteoporosis",
]


# ================================================================
#  DRUG PROPERTIES (for pattern detection)
# ================================================================
# Keys:  cyp=CYP enzymes involved, clear=clearance route (r/h/b),
#        cat=categories, qt/cns/sero=risk flags

DRUG_PROPERTIES: dict[str, dict] = {
    "acetaminophen":       {"cyp": ["CYP2E1", "CYP1A2"], "clear": "h", "cat": ["analgesic"], "qt": False, "cns": False, "sero": False},
    "albuterol":           {"cyp": [], "clear": "r", "cat": ["bronchodilator"], "qt": False, "cns": False, "sero": False},
    "amlodipine":          {"cyp": ["CYP3A4"], "clear": "h", "cat": ["ccb", "antihypertensive"], "qt": False, "cns": False, "sero": False},
    "amiodarone":          {"cyp": ["CYP3A4", "CYP2C9", "CYP2D6"], "clear": "h", "cat": ["antiarrhythmic"], "qt": True, "cns": False, "sero": False},
    "amoxicillin":         {"cyp": [], "clear": "r", "cat": ["antibiotic"], "qt": False, "cns": False, "sero": False},
    "apixaban":            {"cyp": ["CYP3A4"], "clear": "b", "cat": ["anticoagulant", "doac"], "qt": False, "cns": False, "sero": False},
    "aspirin":             {"cyp": ["CYP2C9"], "clear": "h", "cat": ["antiplatelet", "nsaid", "analgesic"], "qt": False, "cns": False, "sero": False},
    "atenolol":            {"cyp": [], "clear": "r", "cat": ["beta_blocker", "antihypertensive"], "qt": False, "cns": False, "sero": False},
    "atorvastatin":        {"cyp": ["CYP3A4"], "clear": "h", "cat": ["statin"], "qt": False, "cns": False, "sero": False},
    "azithromycin":        {"cyp": [], "clear": "h", "cat": ["antibiotic"], "qt": True, "cns": False, "sero": False},
    "carvedilol":          {"cyp": ["CYP2D6", "CYP2C9"], "clear": "h", "cat": ["beta_blocker", "antihypertensive"], "qt": False, "cns": False, "sero": False},
    "celecoxib":           {"cyp": ["CYP2C9"], "clear": "h", "cat": ["nsaid", "analgesic"], "qt": False, "cns": False, "sero": False},
    "ciprofloxacin":       {"cyp": ["CYP1A2"], "clear": "r", "cat": ["antibiotic"], "qt": True, "cns": False, "sero": False},
    "clarithromycin":      {"cyp": ["CYP3A4"], "clear": "b", "cat": ["antibiotic"], "qt": True, "cns": False, "sero": False},
    "clopidogrel":         {"cyp": ["CYP2C19"], "clear": "h", "cat": ["antiplatelet"], "qt": False, "cns": False, "sero": False},
    "cyclosporine":        {"cyp": ["CYP3A4"], "clear": "h", "cat": ["immunosuppressant"], "qt": False, "cns": False, "sero": False},
    "diazepam":            {"cyp": ["CYP3A4", "CYP2C19"], "clear": "h", "cat": ["benzodiazepine", "anxiolytic"], "qt": False, "cns": True, "sero": False},
    "digoxin":             {"cyp": [], "clear": "r", "cat": ["cardiac_glycoside"], "qt": False, "cns": False, "sero": False},
    "diltiazem":           {"cyp": ["CYP3A4"], "clear": "h", "cat": ["ccb", "antihypertensive", "antiarrhythmic"], "qt": False, "cns": False, "sero": False},
    "duloxetine":          {"cyp": ["CYP1A2", "CYP2D6"], "clear": "h", "cat": ["snri", "antidepressant"], "qt": False, "cns": False, "sero": True},
    "empagliflozin":       {"cyp": [], "clear": "r", "cat": ["sglt2_inhibitor", "antidiabetic"], "qt": False, "cns": False, "sero": False},
    "enalapril":           {"cyp": [], "clear": "r", "cat": ["ace_inhibitor", "antihypertensive"], "qt": False, "cns": False, "sero": False},
    "escitalopram":        {"cyp": ["CYP3A4", "CYP2C19"], "clear": "h", "cat": ["ssri", "antidepressant"], "qt": True, "cns": False, "sero": True},
    "fluconazole":         {"cyp": ["CYP2C9", "CYP3A4", "CYP2C19"], "clear": "r", "cat": ["antifungal"], "qt": True, "cns": False, "sero": False},
    "fluoxetine":          {"cyp": ["CYP2D6", "CYP2C9"], "clear": "h", "cat": ["ssri", "antidepressant"], "qt": True, "cns": False, "sero": True},
    "furosemide":          {"cyp": [], "clear": "r", "cat": ["loop_diuretic", "diuretic"], "qt": False, "cns": False, "sero": False},
    "gabapentin":          {"cyp": [], "clear": "r", "cat": ["anticonvulsant", "analgesic"], "qt": False, "cns": True, "sero": False},
    "glipizide":           {"cyp": ["CYP2C9"], "clear": "h", "cat": ["sulfonylurea", "antidiabetic"], "qt": False, "cns": False, "sero": False},
    "hydrochlorothiazide": {"cyp": [], "clear": "r", "cat": ["thiazide_diuretic", "diuretic", "antihypertensive"], "qt": False, "cns": False, "sero": False},
    "ibuprofen":           {"cyp": ["CYP2C9"], "clear": "h", "cat": ["nsaid", "analgesic"], "qt": False, "cns": False, "sero": False},
    "insulin":             {"cyp": [], "clear": "r", "cat": ["antidiabetic"], "qt": False, "cns": False, "sero": False},
    "ketoconazole":        {"cyp": ["CYP3A4"], "clear": "h", "cat": ["antifungal"], "qt": True, "cns": False, "sero": False},
    "levothyroxine":       {"cyp": [], "clear": "h", "cat": ["thyroid_hormone"], "qt": False, "cns": False, "sero": False},
    "lisinopril":          {"cyp": [], "clear": "r", "cat": ["ace_inhibitor", "antihypertensive"], "qt": False, "cns": False, "sero": False},
    "lithium":             {"cyp": [], "clear": "r", "cat": ["mood_stabilizer"], "qt": True, "cns": True, "sero": False},
    "losartan":            {"cyp": ["CYP2C9", "CYP3A4"], "clear": "h", "cat": ["arb", "antihypertensive"], "qt": False, "cns": False, "sero": False},
    "metformin":           {"cyp": [], "clear": "r", "cat": ["biguanide", "antidiabetic"], "qt": False, "cns": False, "sero": False},
    "methotrexate":        {"cyp": [], "clear": "r", "cat": ["immunosuppressant", "antimetabolite"], "qt": False, "cns": False, "sero": False},
    "metoprolol":          {"cyp": ["CYP2D6"], "clear": "h", "cat": ["beta_blocker", "antihypertensive"], "qt": False, "cns": False, "sero": False},
    "metronidazole":       {"cyp": ["CYP2C9"], "clear": "h", "cat": ["antibiotic"], "qt": True, "cns": False, "sero": False},
    "naproxen":            {"cyp": ["CYP2C9"], "clear": "h", "cat": ["nsaid", "analgesic"], "qt": False, "cns": False, "sero": False},
    "omeprazole":          {"cyp": ["CYP2C19", "CYP3A4"], "clear": "h", "cat": ["ppi"], "qt": False, "cns": False, "sero": False},
    "oxycodone":           {"cyp": ["CYP3A4", "CYP2D6"], "clear": "h", "cat": ["opioid", "analgesic"], "qt": False, "cns": True, "sero": False},
    "pantoprazole":        {"cyp": ["CYP2C19"], "clear": "h", "cat": ["ppi"], "qt": False, "cns": False, "sero": False},
    "potassium chloride":  {"cyp": [], "clear": "r", "cat": ["electrolyte"], "qt": False, "cns": False, "sero": False},
    "pravastatin":         {"cyp": [], "clear": "b", "cat": ["statin"], "qt": False, "cns": False, "sero": False},
    "prednisone":          {"cyp": ["CYP3A4"], "clear": "h", "cat": ["corticosteroid"], "qt": False, "cns": False, "sero": False},
    "quetiapine":          {"cyp": ["CYP3A4"], "clear": "h", "cat": ["antipsychotic"], "qt": True, "cns": True, "sero": False},
    "rivaroxaban":         {"cyp": ["CYP3A4"], "clear": "b", "cat": ["anticoagulant", "doac"], "qt": False, "cns": False, "sero": False},
    "rosuvastatin":        {"cyp": [], "clear": "b", "cat": ["statin"], "qt": False, "cns": False, "sero": False},
    "sertraline":          {"cyp": ["CYP2C19", "CYP2D6"], "clear": "h", "cat": ["ssri", "antidepressant"], "qt": True, "cns": False, "sero": True},
    "sildenafil":          {"cyp": ["CYP3A4"], "clear": "h", "cat": ["pde5_inhibitor"], "qt": False, "cns": False, "sero": False},
    "simvastatin":         {"cyp": ["CYP3A4"], "clear": "h", "cat": ["statin"], "qt": False, "cns": False, "sero": False},
    "sitagliptin":         {"cyp": [], "clear": "r", "cat": ["dpp4_inhibitor", "antidiabetic"], "qt": False, "cns": False, "sero": False},
    "spironolactone":      {"cyp": [], "clear": "b", "cat": ["potassium_sparing_diuretic", "diuretic"], "qt": False, "cns": False, "sero": False},
    "tramadol":            {"cyp": ["CYP2D6", "CYP3A4"], "clear": "h", "cat": ["opioid", "analgesic"], "qt": False, "cns": True, "sero": True},
    "venlafaxine":         {"cyp": ["CYP2D6"], "clear": "h", "cat": ["snri", "antidepressant"], "qt": True, "cns": False, "sero": True},
    "verapamil":           {"cyp": ["CYP3A4"], "clear": "h", "cat": ["ccb", "antihypertensive", "antiarrhythmic"], "qt": False, "cns": False, "sero": False},
    "warfarin":            {"cyp": ["CYP2C9", "CYP3A4"], "clear": "h", "cat": ["anticoagulant"], "qt": False, "cns": False, "sero": False},
}


# ================================================================
#  CONTRAINDICATIONS DATABASE  (drug ↔ condition)
# ================================================================

CONTRAINDICATIONS_DB: list[dict] = [
    # ── Renal contraindications ──
    {"drug": "Metformin", "condition_keyword": "kidney", "severity": "contraindicated",
     "description": "Metformin is contraindicated in severe CKD (eGFR <30) — risk of fatal lactic acidosis due to impaired clearance.",
     "alternative": "Consider SGLT2 inhibitor (empagliflozin) or DPP-4 inhibitor (sitagliptin with dose adjustment).",
     "evidence": "black_box"},
    {"drug": "Methotrexate", "condition_keyword": "kidney", "severity": "contraindicated",
     "description": "Methotrexate is contraindicated in significant CKD — reduced clearance causes severe toxicity (pancytopenia, mucositis).",
     "alternative": "Discuss alternative DMARDs with rheumatologist.",
     "evidence": "black_box"},
    {"drug": "Lithium", "condition_keyword": "kidney", "severity": "high_risk",
     "description": "Lithium requires renal clearance; CKD significantly increases toxicity risk (tremor, seizures, renal failure).",
     "alternative": "Valproate or lamotrigine may be safer mood stabilizers in renal impairment.",
     "evidence": "clinical_study"},
    {"drug": "Digoxin", "condition_keyword": "kidney", "severity": "high_risk",
     "description": "Digoxin is 70% renally cleared. CKD causes accumulation → life-threatening toxicity (arrhythmias, visual disturbances).",
     "alternative": "Reduce dose by 50% and monitor levels closely (target 0.5–0.9 ng/mL).",
     "evidence": "clinical_study"},
    {"drug": "Gabapentin", "condition_keyword": "kidney", "severity": "dose_adjustment",
     "description": "Gabapentin is entirely renally cleared. CKD requires significant dose reduction to prevent CNS toxicity.",
     "alternative": "Reduce dose per eGFR; pregabalin also requires adjustment.",
     "evidence": "fda_label"},
    {"drug": "Spironolactone", "condition_keyword": "kidney", "severity": "high_risk",
     "description": "Spironolactone in CKD causes life-threatening hyperkalemia.",
     "alternative": "Consider loop diuretic (furosemide) instead; avoid if eGFR <30.",
     "evidence": "clinical_study"},
    # ── NSAID contraindications ──
    {"drug": "Ibuprofen", "condition_keyword": "kidney", "severity": "contraindicated",
     "description": "NSAIDs reduce renal blood flow and accelerate CKD progression. Can cause acute kidney injury.",
     "alternative": "Acetaminophen for pain; topical NSAIDs for localized use.",
     "evidence": "clinical_study"},
    {"drug": "Naproxen", "condition_keyword": "kidney", "severity": "contraindicated",
     "description": "NSAIDs reduce renal blood flow and accelerate CKD progression. Naproxen's long half-life prolongs risk.",
     "alternative": "Acetaminophen for pain; topical diclofenac for localized inflammation.",
     "evidence": "clinical_study"},
    {"drug": "Celecoxib", "condition_keyword": "kidney", "severity": "high_risk",
     "description": "COX-2 inhibitors still carry significant renal risk in CKD, despite lower GI risk than traditional NSAIDs.",
     "alternative": "Acetaminophen; consider duloxetine for chronic pain.",
     "evidence": "clinical_study"},
    {"drug": "Ibuprofen", "condition_keyword": "heart failure", "severity": "contraindicated",
     "description": "NSAIDs cause fluid retention, increase afterload, and worsen heart failure. Associated with hospitalization.",
     "alternative": "Acetaminophen for pain; discuss with cardiologist for anti-inflammatory needs.",
     "evidence": "black_box"},
    {"drug": "Naproxen", "condition_keyword": "heart failure", "severity": "contraindicated",
     "description": "NSAIDs cause fluid retention and increased cardiovascular risk in heart failure patients.",
     "alternative": "Acetaminophen; topical NSAIDs have lower systemic exposure.",
     "evidence": "black_box"},
    {"drug": "Celecoxib", "condition_keyword": "heart failure", "severity": "contraindicated",
     "description": "COX-2 inhibitors significantly worsen heart failure through fluid retention and sodium reabsorption.",
     "alternative": "Acetaminophen; non-pharmacological pain management.",
     "evidence": "black_box"},
    # ── Hepatic contraindications ──
    {"drug": "Metformin", "condition_keyword": "liver", "severity": "contraindicated",
     "description": "Metformin is contraindicated in severe liver disease — impaired lactate metabolism increases lactic acidosis risk.",
     "alternative": "Insulin or SGLT2 inhibitors depending on liver function status.",
     "evidence": "clinical_study"},
    {"drug": "Simvastatin", "condition_keyword": "liver", "severity": "contraindicated",
     "description": "Statins are contraindicated in active liver disease or unexplained persistent transaminase elevations.",
     "alternative": "Pravastatin may be used cautiously; monitor LFTs closely.",
     "evidence": "fda_label"},
    {"drug": "Atorvastatin", "condition_keyword": "liver", "severity": "contraindicated",
     "description": "Atorvastatin contraindicated in active liver disease. Hepatotoxicity risk increases with impaired metabolism.",
     "alternative": "Pravastatin (not hepatically metabolized) or rosuvastatin at low dose.",
     "evidence": "fda_label"},
    {"drug": "Methotrexate", "condition_keyword": "liver", "severity": "contraindicated",
     "description": "Methotrexate is directly hepatotoxic. Liver disease markedly increases risk of fibrosis/cirrhosis.",
     "alternative": "Discuss with rheumatologist for alternative DMARDs.",
     "evidence": "black_box"},
    # ── Cardiac contraindications ──
    {"drug": "Verapamil", "condition_keyword": "heart failure", "severity": "contraindicated",
     "description": "Verapamil's negative inotropic effect can precipitate acute decompensation in heart failure with reduced EF.",
     "alternative": "Amlodipine is safe in HFrEF; for rate control, use beta-blockers.",
     "evidence": "clinical_study"},
    {"drug": "Diltiazem", "condition_keyword": "heart failure", "severity": "contraindicated",
     "description": "Non-dihydropyridine CCBs depress cardiac contractility and are contraindicated in systolic heart failure.",
     "alternative": "Amlodipine is safe; beta-blockers (carvedilol, metoprolol) preferred for rate control.",
     "evidence": "clinical_study"},
    {"drug": "Metformin", "condition_keyword": "heart failure", "severity": "dose_adjustment",
     "description": "Metformin was historically contraindicated in HF but newer evidence supports cautious use. Avoid in decompensated HF.",
     "alternative": "SGLT2 inhibitors (empagliflozin) actually improve HF outcomes and are preferred.",
     "evidence": "clinical_study"},
    # ── Asthma contraindication ──
    {"drug": "Metoprolol", "condition_keyword": "asthma", "severity": "high_risk",
     "description": "Beta-blockers can trigger severe bronchospasm in asthma. Even cardioselective agents carry risk.",
     "alternative": "Use calcium channel blockers for rate control; if beta-blocker essential, use bisoprolol at lowest dose.",
     "evidence": "clinical_study"},
    {"drug": "Atenolol", "condition_keyword": "asthma", "severity": "high_risk",
     "description": "Beta-blockers antagonize beta-2 receptors in airways, precipitating bronchospasm in asthma.",
     "alternative": "Amlodipine or diltiazem for BP; verapamil for rate control.",
     "evidence": "clinical_study"},
    {"drug": "Carvedilol", "condition_keyword": "asthma", "severity": "contraindicated",
     "description": "Carvedilol is non-selective — blocks both beta-1 and beta-2 receptors. High bronchospasm risk in asthma.",
     "alternative": "If beta-blocker needed for HF, use highly selective bisoprolol with close monitoring.",
     "evidence": "fda_label"},
]


# ================================================================
#  CURATED INTERACTION DATABASE  (with evidence levels)
# ================================================================

INTERACTIONS_DB: dict[tuple[str, str], dict] = {}

def _add(a, b, severity, desc, mechanism, alternative, monitoring, evidence="clinical_study"):
    key = tuple(sorted([a.lower(), b.lower()]))
    INTERACTIONS_DB[key] = dict(
        drug_a=a, drug_b=b, severity=severity,
        description=desc, mechanism=mechanism,
        alternative=alternative, monitoring=monitoring,
        evidence_level=evidence,
    )

# ── Warfarin interactions ────────────────────────────────────
_add("Warfarin", "Aspirin", "severe",
     "Greatly increases risk of serious bleeding events.",
     "Both impair hemostasis: warfarin inhibits vitamin-K–dependent clotting factors; aspirin irreversibly inhibits platelet COX-1.",
     "If antiplatelet needed: discuss clopidogrel with your doctor; if pain relief: acetaminophen.",
     "Monitor INR weekly; watch for signs of bleeding (bruising, dark stools, blood in urine).",
     "black_box")
_add("Warfarin", "Ibuprofen", "severe",
     "NSAIDs increase bleeding risk and can elevate INR unpredictably.",
     "Ibuprofen inhibits COX-1/COX-2, reducing platelet aggregation and damaging GI mucosa while warfarin suppresses clotting factors.",
     "Use acetaminophen for pain; if anti-inflammatory needed, consider short-course celecoxib under close monitoring.",
     "Monitor INR; watch for GI bleeding symptoms.",
     "black_box")
_add("Warfarin", "Naproxen", "severe",
     "Naproxen plus warfarin significantly raises bleeding risk.",
     "Same COX inhibition mechanism as ibuprofen; longer half-life means prolonged risk.",
     "Acetaminophen for pain; topical NSAIDs for localized inflammation.",
     "INR monitoring; stool guaiac testing.",
     "black_box")
_add("Warfarin", "Fluconazole", "severe",
     "Fluconazole can dramatically increase warfarin levels, leading to dangerous bleeding.",
     "Fluconazole strongly inhibits CYP2C9, the primary enzyme metabolizing S-warfarin.",
     "Consider topical antifungals; if systemic needed, use reduced warfarin dose with daily INR.",
     "Check INR within 3 days of starting fluconazole; monitor daily until stable.",
     "clinical_study")
_add("Warfarin", "Metronidazole", "severe",
     "Metronidazole increases warfarin's anticoagulant effect.",
     "Inhibits CYP2C9, slowing warfarin metabolism and raising plasma levels.",
     "Alternative antibiotics depending on infection type; adjust warfarin dose if unavoidable.",
     "INR 2–3 days after starting; watch for bleeding.",
     "clinical_study")
_add("Warfarin", "Amiodarone", "severe",
     "Amiodarone increases warfarin effect for weeks to months.",
     "Inhibits CYP2C9 and CYP3A4; extremely long half-life (40–55 days) prolongs interaction.",
     "Reduce warfarin dose by ~30–50% when starting amiodarone; close INR monitoring.",
     "Weekly INR for first 6–8 weeks; then biweekly until stable.",
     "black_box")

# ── ACE-inhibitor / ARB + NSAID ─────────────────────────────
for ace in ["Lisinopril", "Enalapril", "Losartan"]:
    for nsaid in ["Ibuprofen", "Naproxen"]:
        _add(ace, nsaid, "moderate",
             f"{nsaid} can reduce {ace}'s blood-pressure–lowering effect and stress the kidneys.",
             f"NSAIDs reduce renal prostaglandin synthesis, decreasing GFR and counteracting the vasodilatory effect of {ace}.",
             "Use acetaminophen for pain; if NSAID required, use lowest dose for shortest duration.",
             "Monitor blood pressure; check serum creatinine and potassium within 1–2 weeks.",
             "clinical_study")

# ── ACE / ARB + Potassium / Spironolactone ──────────────────
for ace in ["Lisinopril", "Enalapril", "Losartan"]:
    _add(ace, "Potassium Chloride", "moderate",
         f"Combining potassium supplements with {ace} risks dangerously high potassium levels.",
         f"{ace} reduces aldosterone secretion, retaining potassium; exogenous potassium adds further load.",
         "Avoid potassium supplements unless lab-confirmed hypokalemia; use with close monitoring.",
         "Check serum potassium within 1 week; repeat monthly.",
         "clinical_study")
    _add(ace, "Spironolactone", "moderate",
         f"Both {ace} and spironolactone raise potassium — combined risk of hyperkalemia.",
         "Dual RAAS blockade plus potassium-sparing effect of spironolactone.",
         "If both needed (e.g., heart failure), start low and monitor closely.",
         "Serum potassium and creatinine within 3 days, then weekly for a month.",
         "clinical_study")

# ── Statin interactions ──────────────────────────────────────
_add("Simvastatin", "Amlodipine", "moderate",
     "Amlodipine increases simvastatin levels, raising the risk of muscle damage.",
     "Amlodipine inhibits CYP3A4, reducing simvastatin metabolism — simvastatin dose should not exceed 20 mg.",
     "Switch to atorvastatin or rosuvastatin (not CYP3A4-dependent at usual doses).",
     "Watch for muscle pain/weakness; check CK if symptoms arise.",
     "fda_label")
_add("Simvastatin", "Diltiazem", "severe",
     "Diltiazem markedly raises simvastatin levels — high rhabdomyolysis risk.",
     "Strong CYP3A4 inhibition by diltiazem.",
     "Limit simvastatin to 10 mg/day, or switch to pravastatin/rosuvastatin.",
     "Muscle symptom awareness; CK monitoring.",
     "fda_label")
_add("Simvastatin", "Amiodarone", "severe",
     "Amiodarone increases simvastatin levels — rhabdomyolysis risk.",
     "CYP3A4 inhibition by amiodarone.",
     "Simvastatin max 20 mg/day with amiodarone; prefer pravastatin or rosuvastatin.",
     "Report any unexplained muscle pain immediately.",
     "fda_label")
_add("Atorvastatin", "Clarithromycin", "severe",
     "Clarithromycin dramatically increases statin exposure — rhabdomyolysis risk.",
     "Clarithromycin is a potent CYP3A4 inhibitor.",
     "Temporarily hold atorvastatin during clarithromycin course, or use azithromycin instead.",
     "Monitor for muscle symptoms during antibiotic course.",
     "clinical_study")

# ── Beta-blocker + Calcium-channel blocker ───────────────────
_add("Metoprolol", "Verapamil", "severe",
     "Both slow the heart — risk of severe bradycardia and heart block.",
     "Additive negative chronotropic and dromotropic effects on the AV node.",
     "If rate control needed, choose one agent; amlodipine is safer with beta-blockers.",
     "Continuous ECG monitoring when initiating; watch heart rate and blood pressure.",
     "clinical_study")
_add("Metoprolol", "Diltiazem", "severe",
     "Similar additive heart-slowing risk as with verapamil.",
     "Both depress AV node conduction.",
     "Use amlodipine instead of diltiazem if calcium-channel blocker needed.",
     "ECG and heart-rate monitoring.",
     "clinical_study")

# ── Digoxin interactions ─────────────────────────────────────
_add("Digoxin", "Amiodarone", "severe",
     "Amiodarone increases digoxin levels by ~70% — toxicity risk.",
     "Amiodarone inhibits P-glycoprotein and reduces renal clearance of digoxin.",
     "Reduce digoxin dose by 50% when starting amiodarone.",
     "Check digoxin level within 1 week; target 0.5–0.9 ng/mL.",
     "clinical_study")
_add("Digoxin", "Verapamil", "severe",
     "Verapamil raises digoxin levels and adds AV-node depression.",
     "P-glycoprotein inhibition increases digoxin absorption; additive AV-node effects.",
     "Reduce digoxin dose; consider amlodipine as alternative.",
     "Digoxin levels; ECG for AV block.",
     "clinical_study")

# ── Lithium interactions ─────────────────────────────────────
for nsaid in ["Ibuprofen", "Naproxen"]:
    _add("Lithium", nsaid, "severe",
         f"{nsaid} can raise lithium to toxic levels.",
         "NSAIDs reduce renal prostaglandins → decreased lithium clearance → accumulation.",
         "Use acetaminophen; if NSAID essential, monitor lithium levels closely.",
         "Check lithium level within 5 days; watch for tremor, confusion, nausea.",
         "clinical_study")
_add("Lithium", "Lisinopril", "moderate",
     "ACE inhibitors can increase lithium levels.",
     "Reduced GFR from ACE inhibitor decreases lithium clearance.",
     "Monitor lithium levels; consider ARB with careful monitoring if needed.",
     "Lithium level within 1 week of starting; then monthly.",
     "clinical_study")

# ── Serotonergic interactions ────────────────────────────────
for ssri in ["Sertraline", "Fluoxetine", "Escitalopram", "Venlafaxine", "Duloxetine"]:
    _add(ssri, "Tramadol", "severe",
         f"Combining {ssri} with tramadol risks serotonin syndrome — a potentially fatal condition.",
         "Both increase serotonin: SSRI/SNRI blocks reuptake; tramadol also has serotonergic activity.",
         "Use non-serotonergic pain relief: acetaminophen, gabapentin, or careful low-dose opioid.",
         "Watch for agitation, tremor, hyperthermia, diarrhea — seek emergency care if symptoms appear.",
         "black_box")

# ── Ciprofloxacin interactions ───────────────────────────────
_add("Ciprofloxacin", "Duloxetine", "severe",
     "Ciprofloxacin greatly increases duloxetine levels.",
     "Ciprofloxacin is a potent CYP1A2 inhibitor; duloxetine is a CYP1A2 substrate.",
     "Use alternative antibiotic (amoxicillin, azithromycin) if possible.",
     "Watch for duloxetine side effects: nausea, dizziness, serotonin symptoms.",
     "fda_label")

# ── Methotrexate + NSAID ─────────────────────────────────────
for nsaid in ["Ibuprofen", "Naproxen"]:
    _add("Methotrexate", nsaid, "severe",
         f"{nsaid} can cause methotrexate to accumulate to toxic levels.",
         "NSAIDs reduce renal blood flow, decreasing methotrexate clearance; also displace it from protein binding.",
         "Use acetaminophen; if anti-inflammatory needed, discuss with rheumatologist.",
         "CBC and renal function before and during combined use; watch for mouth sores, cytopenias.",
         "black_box")

# ── Clopidogrel + PPI ───────────────────────────────────────
_add("Clopidogrel", "Omeprazole", "moderate",
     "Omeprazole may reduce the antiplatelet effect of clopidogrel.",
     "Omeprazole inhibits CYP2C19, which converts clopidogrel to its active metabolite.",
     "Use pantoprazole instead (weaker CYP2C19 inhibition); or use H2-blocker like famotidine.",
     "No standard lab monitoring; clinical vigilance for cardiovascular events.",
     "fda_label")

# ── Opioid + Gabapentin ─────────────────────────────────────
_add("Gabapentin", "Oxycodone", "moderate",
     "Combined CNS depression increases the risk of respiratory depression and sedation.",
     "Additive CNS depressant effects.",
     "Use lowest effective doses of both; consider non-opioid pain strategies.",
     "Monitor respiratory rate; educate patient on sedation signs.",
     "fda_label")

# ── Prednisone + NSAID ──────────────────────────────────────
for nsaid in ["Ibuprofen", "Aspirin", "Naproxen"]:
    _add("Prednisone", nsaid, "moderate",
         "Both increase the risk of gastrointestinal ulcers and bleeding.",
         "Corticosteroids impair mucosal healing; NSAIDs inhibit protective prostaglandins.",
         "Add a proton pump inhibitor (omeprazole) for GI protection; use acetaminophen if possible.",
         "Watch for GI symptoms; consider H. pylori testing.",
         "clinical_study")

# ── Levothyroxine interactions ───────────────────────────────
_add("Levothyroxine", "Omeprazole", "moderate",
     "Omeprazole reduces stomach acid, impairing levothyroxine absorption.",
     "Levothyroxine requires acidic pH for dissolution and absorption.",
     "Take levothyroxine 4 hours before omeprazole; may need higher dose.",
     "Check TSH 6–8 weeks after starting PPI; adjust levothyroxine dose.",
     "clinical_study")

# ── Sildenafil + Furosemide ──────────────────────────────────
_add("Sildenafil", "Furosemide", "moderate",
     "Both lower blood pressure — risk of hypotension.",
     "Additive vasodilation and volume depletion.",
     "Use with caution; start sildenafil at lowest dose.",
     "Monitor blood pressure.",
     "case_reports")

# ── Cyclosporine interactions ────────────────────────────────
_add("Cyclosporine", "Simvastatin", "severe",
     "Cyclosporine dramatically increases statin levels — high rhabdomyolysis risk.",
     "Cyclosporine inhibits CYP3A4 and P-glycoprotein.",
     "Use pravastatin or fluvastatin (lower interaction potential); avoid simvastatin.",
     "Muscle symptoms; CK levels; renal function.",
     "black_box")





# ================================================================
#  LOOKUP & DETECTION FUNCTIONS
# ================================================================

def lookup_interaction(drug_a: str, drug_b: str) -> Optional[dict]:
    key = tuple(sorted([drug_a.lower(), drug_b.lower()]))
    return INTERACTIONS_DB.get(key)


def check_contraindications(medications: List[str], conditions: List[str]) -> List[dict]:
    """Return list of drug-condition contraindications for this patient."""
    results = []
    cond_lower = " ".join(c.lower() for c in conditions)
    for ci in CONTRAINDICATIONS_DB:
        if ci["condition_keyword"] in cond_lower:
            for med in medications:
                if med.lower() == ci["drug"].lower():
                    results.append({
                        "drug": med,
                        "condition": ci["condition_keyword"].title(),
                        "severity": ci["severity"],
                        "description": ci["description"],
                        "alternative": ci["alternative"],
                        "evidence": ci.get("evidence", "clinical_study"),
                    })
    return results


def detect_patterns(medications: List[str], conditions: List[str]) -> List[dict]:
    """Detect metabolic/clearance/pharmacological patterns across the medication list."""
    patterns = []
    meds_lower = [m.lower() for m in medications]
    props = [DRUG_PROPERTIES.get(m, {}) for m in meds_lower]

    # 1. CYP enzyme overload
    cyp_counts: Dict[str, List[str]] = {}
    for med, p in zip(medications, props):
        for cyp in p.get("cyp", []):
            cyp_counts.setdefault(cyp, []).append(med)
    for cyp, drugs in cyp_counts.items():
        if len(drugs) >= 3:
            patterns.append({
                "icon": "🧬", "title": f"{cyp} Overload",
                "description": f"{len(drugs)} of your medications compete for the same liver enzyme ({cyp}): {', '.join(drugs)}. "
                               f"This can cause unpredictable drug levels — some may become toxic while others lose effectiveness.",
                "severity": "high",
            })
        elif len(drugs) == 2:
            patterns.append({
                "icon": "⚗️", "title": f"{cyp} Competition",
                "description": f"{drugs[0]} and {drugs[1]} both use {cyp} for metabolism. Monitor for altered drug levels.",
                "severity": "moderate",
            })

    # 2. Renal risk cluster
    cond_lower = " ".join(c.lower() for c in conditions)
    if "kidney" in cond_lower:
        renal_drugs = [med for med, p in zip(medications, props) if p.get("clear") in ("r", "b")]
        if len(renal_drugs) >= 3:
            patterns.append({
                "icon": "🫘", "title": "Renal Risk Cluster",
                "description": f"{len(renal_drugs)} drugs requiring kidney clearance detected with CKD: {', '.join(renal_drugs)}. "
                               f"Impaired clearance may cause dangerous accumulation.",
                "severity": "high",
            })

    # 3. Bleeding risk cluster
    bleed_cats = {"anticoagulant", "antiplatelet", "nsaid"}
    bleed_drugs = [med for med, p in zip(medications, props) if bleed_cats & set(p.get("cat", []))]
    if len(bleed_drugs) >= 2:
        patterns.append({
            "icon": "🩸", "title": "Bleeding Risk Stack",
            "description": f"{len(bleed_drugs)} bleeding-risk drugs detected: {', '.join(bleed_drugs)}. "
                           f"Combined use dramatically increases hemorrhage risk.",
            "severity": "high",
        })

    # 4. Serotonergic load
    sero_drugs = [med for med, p in zip(medications, props) if p.get("sero")]
    if len(sero_drugs) >= 2:
        patterns.append({
            "icon": "⚡", "title": "Serotonin Syndrome Risk",
            "description": f"{len(sero_drugs)} serotonergic drugs detected: {', '.join(sero_drugs)}. "
                           f"Combined serotonergic activity risks potentially fatal serotonin syndrome (tremor, hyperthermia, agitation).",
            "severity": "high",
        })

    # 5. QT prolongation risk
    qt_drugs = [med for med, p in zip(medications, props) if p.get("qt")]
    if len(qt_drugs) >= 2:
        patterns.append({
            "icon": "💓", "title": "QT Prolongation Stack",
            "description": f"{len(qt_drugs)} QT-prolonging drugs detected: {', '.join(qt_drugs)}. "
                           f"Additive QT prolongation increases risk of fatal cardiac arrhythmia (Torsades de Pointes).",
            "severity": "high",
        })

    # 6. CNS depression stack
    cns_drugs = [med for med, p in zip(medications, props) if p.get("cns")]
    if len(cns_drugs) >= 2:
        patterns.append({
            "icon": "😴", "title": "CNS Depression Stack",
            "description": f"{len(cns_drugs)} CNS depressants detected: {', '.join(cns_drugs)}. "
                           f"Combined sedation increases risk of respiratory depression, falls, and cognitive impairment.",
            "severity": "high",
        })

    # 7. Hepatic overload with liver disease
    if "liver" in cond_lower or "hepatic" in cond_lower:
        hepatic_drugs = [med for med, p in zip(medications, props) if p.get("clear") == "h"]
        if len(hepatic_drugs) >= 3:
            patterns.append({
                "icon": "🫀", "title": "Hepatic Clearance Overload",
                "description": f"{len(hepatic_drugs)} hepatically-cleared drugs with liver disease: {', '.join(hepatic_drugs)}. "
                               f"Impaired liver metabolism may cause drug accumulation and toxicity.",
                "severity": "high",
            })

    return patterns


# ================================================================
#  STACK RISK CALCULATOR  (structured counts for dashboard meters)
# ================================================================

# Categories that constitute "duplicate therapy"
DUPLICATE_THERAPY_CATEGORIES: Dict[str, str] = {
    "ssri":                  "SSRIs (antidepressants)",
    "snri":                  "SNRIs (antidepressants)",
    "statin":                "Statins (cholesterol)",
    "nsaid":                 "NSAIDs (pain / anti-inflammatory)",
    "loop_diuretic":         "Loop Diuretics",
    "ace_inhibitor":         "ACE Inhibitors (blood pressure)",
    "arb":                   "ARBs (blood pressure)",
    "anticoagulant":         "Anticoagulants (blood thinners)",
    "beta_blocker":          "Beta-Blockers (heart / blood pressure)",
    "ppi":                   "Proton Pump Inhibitors (acid reducers)",
    "antidiabetic":          "Antidiabetic agents",
}

# Treat these category pairs as equivalent (same therapeutic goal)
EQUIVALENT_CATEGORIES = [
    {"ace_inhibitor", "arb"},         # Both lower BP via RAAS
    {"ssri", "snri"},                 # Both are antidepressants
]


def compute_stack_risks(medications: List[str]) -> dict:
    """
    Return structured QTc / Serotonin / CNS stack risk data.
    Each entry includes a count and the list of contributing drugs.
    """
    meds_lower = [m.lower() for m in medications]
    props = {m: DRUG_PROPERTIES.get(m, {}) for m in meds_lower}

    qt_drugs   = [med for med, p in zip(medications, [props[ml] for ml in meds_lower]) if p.get("qt")]
    sero_drugs = [med for med, p in zip(medications, [props[ml] for ml in meds_lower]) if p.get("sero")]
    cns_drugs  = [med for med, p in zip(medications, [props[ml] for ml in meds_lower]) if p.get("cns")]

    def level(count: int) -> str:
        if count == 0: return "none"
        if count == 1: return "low"
        if count == 2: return "moderate"
        return "high"

    return {
        "qt": {
            "count": len(qt_drugs),
            "drugs": qt_drugs,
            "level": level(len(qt_drugs)),
            "label": "QTc Prolongation",
            "description": "Drugs that extend the QT interval. Combining 2+ raises risk of Torsades de Pointes.",
        },
        "sero": {
            "count": len(sero_drugs),
            "drugs": sero_drugs,
            "level": level(len(sero_drugs)),
            "label": "Serotonin Syndrome",
            "description": "Serotonergic agents whose combined activity can trigger serotonin syndrome (tremor, hyperthermia, agitation).",
        },
        "cns": {
            "count": len(cns_drugs),
            "drugs": cns_drugs,
            "level": level(len(cns_drugs)),
            "label": "CNS Depression",
            "description": "CNS depressants that compound sedation, increasing risk of respiratory depression, falls, and cognitive impairment.",
        },
    }


def detect_duplicate_therapy(medications: List[str]) -> List[dict]:
    """
    Detect cases where 2 or more drugs serve the same therapeutic purpose.
    Returns a list of flagged groups.
    """
    meds_lower = [m.lower() for m in medications]

    # Build category → drug list map
    cat_map: Dict[str, List[str]] = {}
    for orig, ml in zip(medications, meds_lower):
        props = DRUG_PROPERTIES.get(ml, {})
        for cat in props.get("cat", []):
            cat_map.setdefault(cat, []).append(orig)

    duplicates = []
    seen_pairs: set = set()

    for cat, drugs in cat_map.items():
        if cat not in DUPLICATE_THERAPY_CATEGORIES:
            continue
        if len(drugs) >= 2:
            key = frozenset(drugs)
            if key not in seen_pairs:
                seen_pairs.add(key)
                duplicates.append({
                    "category": DUPLICATE_THERAPY_CATEGORIES[cat],
                    "drugs": drugs,
                    "severity": "high" if cat in {"anticoagulant", "ssri", "snri"} else "moderate",
                    "description": (
                        f"Two or more drugs in the same class ({DUPLICATE_THERAPY_CATEGORIES[cat]}) are prescribed simultaneously. "
                        f"This is rarely therapeutic and increases side-effect risk without added benefit."
                    ),
                })

    # Check equivalent category pairs (ACE + ARB, SSRI + SNRI)
    for pair in EQUIVALENT_CATEGORIES:
        cats = list(pair)
        drugs_a = cat_map.get(cats[0], [])
        drugs_b = cat_map.get(cats[1], [])
        if drugs_a and drugs_b:
            combined = drugs_a + drugs_b
            key = frozenset(combined)
            if key not in seen_pairs:
                seen_pairs.add(key)
                # Get the label for context
                label_a = DUPLICATE_THERAPY_CATEGORIES.get(cats[0], cats[0])
                label_b = DUPLICATE_THERAPY_CATEGORIES.get(cats[1], cats[1])
                duplicates.append({
                    "category": f"{label_a} + {label_b}",
                    "drugs": combined,
                    "severity": "high",
                    "description": (
                        f"Combining {label_a} and {label_b} targets the same physiological pathway. "
                        f"The combination is generally contraindicated and increases adverse effect risk."
                    ),
                })

    return duplicates
