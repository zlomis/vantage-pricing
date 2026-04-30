// Vantage Clinical Cost Library v1.0
// =========================================================================
// 298 procedures across 30 categories.
// Every line item: KZ retail (Almaty private clinic, Apr 2026) × trial-grade
// premium ÷ FX rate (480 KZT/USD) = trial unit cost in USD.
//
// This is the SOURCE OF TRUTH for procedure-level costs. Both generate-excel.js
// (vantageCalcCC) and generate-word.js (vantageCalcCC_word) consume from here.
// Library updates flow through both deliverables automatically.
//
// Sources: Invitro Almaty, INVIVO, SEMA Hospital, Medical Park, HAK Medical,
// Emirmed, Sapalab, 103.kz aggregator, MOH tariff regulations,
// National Bank of Kazakhstan FX, internal corpus (INCLINE-102 / Plenty / LST-422).
// =========================================================================

'use strict';

const FX_KZT_USD = 480;

// ─── Trial-grade premium multipliers by category ────────────────────────
// Calibrated from corpus convergence:
//   - Hematology 3.5×    (Invitro CBC $3.73 × 3.5 = $13, matches corpus $13)
//   - Cardiac Diag 1.8×  (ECG $8.75 × 1.8 = $15.75, matches corpus $15)
//   - Imaging MRI 2.8×   (MRI brain $53 × 2.8 = $148, matches INCLINE-102 $148)
//   - Imaging CT 2.5×    (CT chest $47 × 2.5 = $117, matches INCLINE-102 $111)
//   - PK/PD 4.0×         (PK $5.20 × 4.0 = $20.83, matches corpus $22)
//   - Drug Admin 2.0×    (SC $17.70 × 2.0 = $35.42, matches Plenty Ustek $40)
const PREMIUMS = {
  "Site Personnel & Visits": 2.0,
  "Hematology": 3.5,
  "Coagulation": 3.5,
  "Chemistry & Metabolic": 3.5,
  "Endocrine & Hormones": 3.5,
  "Cardiac Biomarkers": 3.0,
  "Inflammatory & Autoimmune": 3.5,
  "Serology & Viral Markers": 3.0,
  "Urinalysis": 3.5,
  "Cardiac Diagnostics": 1.8,
  "Pulmonary Function": 2.0,
  "Neurological Diagnostics": 2.0,
  "Ophthalmologic": 2.0,
  "ENT / Audiology": 2.5,
  "Dermatologic Procedures": 2.5,
  "Imaging — X-ray & Ultrasound": 2.5,
  "Imaging — CT": 2.5,
  "Imaging — MRI": 2.8,
  "Imaging — Nuclear / PET": 2.0,
  "PK / PD / Bioanalytical": 4.0,
  "Tumor Tissue & Pathology": 3.0,
  "Genomics & Molecular": 3.5,
  "Microbiology & Cultures": 3.0,
  "Specialty Procedures": 2.5,
  "Drug Administration": 2.0,
  "Subject Compensation": 1.0,
  "Patient-Reported Outcomes": 2.0,
  "Cell & Gene Therapy": 3.0,
  "Vaccine Trial": 3.0,
  "Other / Miscellaneous": 2.5
};

// ─── 298-procedure library ──────────────────────────────────────────────
// Generated from Vantage_Clinical_Cost_Library_v1.xlsx
const PROCEDURES = require('./library_v1_data.json').procedures;

// ─── Indication archetype triggers ───────────────────────────────────────
// Maps an indication string + phase + population to:
//   - PI specialty tier (drives PI fee defaults from existing engine)
//   - Categories that fire (drives which library procedures populate)
//   - Specialty procedures to add
//   - Subject compensation flag

const INDICATION_TRIGGERS = [
  {
    archetype: "healthy_volunteer_phase1",
    label: "Healthy volunteer (Phase 1 biosimilar)",
    keywords: ["healthy volunteers", "healthy volunteer", "biosimilarity", "biosimilar pharmacokinetic"],
    phaseFilter: ["1", "1b"],
    piTier: "generalist",
    standardCategories: [
      "Site Personnel & Visits",
      "Hematology", "Coagulation", "Chemistry & Metabolic", "Urinalysis",
      "Serology & Viral Markers",
      "Cardiac Diagnostics",
      "PK / PD / Bioanalytical",
      "Drug Administration",
      "Subject Compensation",
      "Other / Miscellaneous"
    ],
    indicationCategories: ["Endocrine & Hormones"],  // pregnancy test
    specialtyProcedures: [
      "Urine drug screen (panel)",
      "Alcohol breath test"
    ],
    subjectCompensation: "full",  // $50 screening + $450 campaign
    notes: "Plenty Ustek archetype. Per-pt $1,200-1,400."
  },
  {
    archetype: "oncology_solid_tumor_io",
    label: "Oncology — solid tumor (IO / immune)",
    keywords: ["solid tumor", "checkpoint inhibitor", "anti-PD-1", "anti-PD-L1", "immunotherapy", "pembrolizumab", "nivolumab", "atezolizumab"],
    phaseFilter: null,
    piTier: "oncology",
    standardCategories: [
      "Site Personnel & Visits",
      "Hematology", "Coagulation", "Chemistry & Metabolic", "Urinalysis",
      "Serology & Viral Markers", "Endocrine & Hormones",
      "Cardiac Diagnostics", "Cardiac Biomarkers",
      "PK / PD / Bioanalytical",
      "Drug Administration",
      "Other / Miscellaneous"
    ],
    indicationCategories: [
      "Imaging — CT", "Imaging — MRI",
      "Tumor Tissue & Pathology"
    ],
    specialtyProcedures: [
      "ECOG performance status",
      "Pregnancy test — urine (β-hCG qualitative)"
    ],
    subjectCompensation: "none",
    notes: "Plenty Pembro / INCLINE-102. Per-pt $1,800-12,000."
  },
  {
    archetype: "oncology_chemo_combo",
    label: "Oncology — chemotherapy combo",
    keywords: [
      // Specific chemo regimens
      "FOLFIRINOX", "mFOLFIRINOX", "FOLFOX", "FOLFIRI", "CHOP", "R-CHOP", "DAC",
      "carboplatin", "cisplatin", "doxorubicin", "gemcitabine", "paclitaxel",
      // Common solid-tumor indications (catches generic "X cancer" without IO/chemo named)
      "pancreatic cancer", "pancreatic carcinoma", "pancreatic adenocarcinoma",
      "breast cancer", "breast carcinoma",
      "lung cancer", "non-small cell lung", "NSCLC", "small cell lung", "SCLC",
      "colorectal cancer", "colorectal carcinoma", "colon cancer", "rectal cancer",
      "gastric cancer", "stomach cancer", "esophageal cancer",
      "ovarian cancer", "endometrial cancer", "cervical cancer",
      "prostate cancer", "bladder cancer", "renal cell carcinoma",
      "hepatocellular carcinoma", "HCC", "cholangiocarcinoma",
      "head and neck cancer", "head & neck cancer",
      "metastatic", "advanced solid tumor", "unresectable",
      // Generic cancer fallback (lowest priority — comes after IO and hematologic checks above)
      "cancer", "carcinoma", "malignant", "malignancy", "oncology", "tumor", "tumour"
    ],
    phaseFilter: null,
    piTier: "oncology",
    standardCategories: [
      "Site Personnel & Visits",
      "Hematology", "Coagulation", "Chemistry & Metabolic", "Urinalysis",
      "Serology & Viral Markers", "Endocrine & Hormones",
      "Cardiac Diagnostics", "Cardiac Biomarkers",
      "PK / PD / Bioanalytical",
      "Drug Administration",
      "Other / Miscellaneous"
    ],
    indicationCategories: [
      "Imaging — CT", "Imaging — MRI",
      "Tumor Tissue & Pathology"
    ],
    specialtyProcedures: [
      "ECOG performance status",
      "Pregnancy test — urine (β-hCG qualitative)"
    ],
    subjectCompensation: "none",
    notes: "OT-01-P201 archetype. Per-pt $15,000-25,000 cycle-based. Default oncology archetype when no IO/heme matches."
  },
  {
    archetype: "hematologic_malignancy",
    label: "Hematologic malignancy",
    keywords: ["lymphoma", "leukemia", "leukaemia", "myeloma", "MDS", "AML", "CML", "CLL", "ALL", "DLBCL"],
    phaseFilter: null,
    piTier: "hematology",
    standardCategories: [
      "Site Personnel & Visits",
      "Hematology", "Coagulation", "Chemistry & Metabolic", "Urinalysis",
      "Serology & Viral Markers", "Endocrine & Hormones",
      "Cardiac Diagnostics", "Cardiac Biomarkers",
      "PK / PD / Bioanalytical",
      "Drug Administration",
      "Other / Miscellaneous"
    ],
    indicationCategories: [
      "Specialty Procedures",
      "Imaging — CT", "Imaging — Nuclear / PET",
      "Tumor Tissue & Pathology"
    ],
    specialtyProcedures: [
      "Bone marrow aspiration",
      "Bone marrow biopsy (core, w/ aspiration)",
      "Flow cytometry analysis (central lab, per sample)"
    ],
    subjectCompensation: "none",
    notes: "Inferred — high-cost archetype."
  },
  {
    archetype: "renal_nephrology",
    label: "Renal / nephrology (e.g., ADPKD)",
    keywords: ["kidney", "renal", "nephrology", "eGFR", "ADPKD", "CKD", "polycystic", "TKV"],
    phaseFilter: null,
    piTier: "nephrology",
    standardCategories: [
      "Site Personnel & Visits",
      "Hematology", "Chemistry & Metabolic", "Urinalysis",
      "Serology & Viral Markers", "Endocrine & Hormones",
      "Cardiac Diagnostics",
      "PK / PD / Bioanalytical",
      "Drug Administration",
      "Subject Compensation",
      "Other / Miscellaneous"
    ],
    indicationCategories: [
      "Imaging — MRI",
      "Imaging — X-ray & Ultrasound"
    ],
    specialtyProcedures: [
      "MRI — kidney with volumetric reading (TKV)",
      "DEXA scan (bone density)",
      "Audiometry — basic screening",
      "PKD1/PKD2 genotyping",
      "Urine MCP-1",
      "ADPKD-Impact Scale",
      "ADPKD-Pain and Discomfort Scale"
    ],
    subjectCompensation: "patient",
    notes: "LST-422 archetype. Per-pt $7,000-9,000."
  },
  {
    archetype: "cardiology",
    label: "Cardiology",
    keywords: ["cardiac", "heart", "cardiovascular", "heart failure", "arrhythmia", "atrial fibrillation", "myocardial infarction"],
    phaseFilter: null,
    piTier: "cardiology",
    standardCategories: [
      "Site Personnel & Visits",
      "Hematology", "Coagulation", "Chemistry & Metabolic", "Urinalysis",
      "Serology & Viral Markers",
      "Cardiac Diagnostics", "Cardiac Biomarkers",
      "PK / PD / Bioanalytical",
      "Drug Administration",
      "Subject Compensation",
      "Other / Miscellaneous"
    ],
    indicationCategories: [
      "Imaging — MRI", "Imaging — CT",
      "Imaging — X-ray & Ultrasound"
    ],
    specialtyProcedures: [
      "24-hour Holter monitoring",
      "Echocardiography (transthoracic)",
      "Stress ECG / treadmill test",
      "24-hour ambulatory blood pressure (ABPM)"
    ],
    subjectCompensation: "patient",
    notes: "Inferred placeholder."
  },
  {
    archetype: "pulmonology",
    label: "Pulmonology / respiratory",
    keywords: ["asthma", "COPD", "pulmonary", "lung", "respiratory", "bronchitis", "emphysema", "interstitial lung"],
    phaseFilter: null,
    piTier: "pulmonology",
    standardCategories: [
      "Site Personnel & Visits",
      "Hematology", "Chemistry & Metabolic", "Urinalysis",
      "Serology & Viral Markers",
      "Cardiac Diagnostics",
      "Pulmonary Function",
      "PK / PD / Bioanalytical",
      "Drug Administration",
      "Subject Compensation",
      "Other / Miscellaneous"
    ],
    indicationCategories: [
      "Imaging — X-ray & Ultrasound", "Imaging — CT"
    ],
    specialtyProcedures: [
      "Spirometry with bronchodilator reversibility",
      "Diffusion capacity (DLCO)",
      "6-minute walk test"
    ],
    subjectCompensation: "patient",
    notes: "Inferred."
  },
  {
    archetype: "neurology_cns",
    label: "Neurology / CNS",
    keywords: ["CNS", "neuro", "Alzheimer", "Parkinson", "multiple sclerosis", "epilepsy", "dementia", "neuropathy", "ALS"],
    phaseFilter: null,
    piTier: "neurology",
    standardCategories: [
      "Site Personnel & Visits",
      "Hematology", "Chemistry & Metabolic", "Urinalysis",
      "Serology & Viral Markers",
      "Cardiac Diagnostics",
      "Neurological Diagnostics",
      "PK / PD / Bioanalytical",
      "Drug Administration",
      "Subject Compensation",
      "Other / Miscellaneous"
    ],
    indicationCategories: [
      "Imaging — MRI",
      "Specialty Procedures"
    ],
    specialtyProcedures: [
      "MMSE", "MoCA",
      "Lumbar puncture (CSF collection)",
      "CSF basic analysis"
    ],
    subjectCompensation: "patient",
    notes: "Inferred."
  },
  {
    archetype: "autoimmune",
    label: "Immunology / autoimmune (RA, lupus, IBD)",
    keywords: ["autoimmune", "rheumatoid", "lupus", "SLE", "IBD", "Crohn", "ulcerative colitis", "psoriasis", "ankylosing spondylitis", "biologic"],
    phaseFilter: null,
    piTier: "rheumatology",
    standardCategories: [
      "Site Personnel & Visits",
      "Hematology", "Chemistry & Metabolic", "Urinalysis",
      "Serology & Viral Markers",
      "Inflammatory & Autoimmune",
      "Cardiac Diagnostics",
      "PK / PD / Bioanalytical",
      "Drug Administration",
      "Subject Compensation",
      "Patient-Reported Outcomes",
      "Other / Miscellaneous"
    ],
    indicationCategories: [
      "Imaging — X-ray & Ultrasound",
      "Imaging — MRI"
    ],
    specialtyProcedures: [
      "QuantiFERON-TB Gold (IGRA)"
    ],
    subjectCompensation: "patient",
    notes: "Inferred."
  },
  {
    archetype: "hepatology",
    label: "Hepatology / liver",
    keywords: ["hepatitis", "cirrhosis", "NASH", "NAFLD", "liver", "fibrosis"],
    phaseFilter: null,
    piTier: "endocrinology",
    standardCategories: [
      "Site Personnel & Visits",
      "Hematology", "Coagulation", "Chemistry & Metabolic", "Urinalysis",
      "Serology & Viral Markers",
      "Cardiac Diagnostics",
      "PK / PD / Bioanalytical",
      "Drug Administration",
      "Subject Compensation",
      "Other / Miscellaneous"
    ],
    indicationCategories: [
      "Specialty Procedures",
      "Imaging — X-ray & Ultrasound"
    ],
    specialtyProcedures: [
      "FibroScan (transient elastography)",
      "HBV viral load (DNA quantitative PCR)",
      "HCV viral load (RNA quantitative PCR)"
    ],
    subjectCompensation: "patient",
    notes: "Inferred."
  },
  {
    archetype: "infectious_disease",
    label: "Infectious disease",
    keywords: ["sepsis", "pneumonia", "UTI", "HIV", "TB", "tuberculosis", "COVID", "antimicrobial", "antibiotic", "antiviral"],
    phaseFilter: null,
    piTier: "specialty",  // Infectious disease specialist
    standardCategories: [
      "Site Personnel & Visits",
      "Hematology", "Chemistry & Metabolic", "Urinalysis",
      "Serology & Viral Markers",
      "Inflammatory & Autoimmune",
      "Cardiac Diagnostics",
      "Microbiology & Cultures",
      "Drug Administration",
      "Subject Compensation",
      "Other / Miscellaneous"
    ],
    indicationCategories: [
      "Imaging — X-ray & Ultrasound", "Imaging — CT"
    ],
    specialtyProcedures: [],
    subjectCompensation: "patient",
    notes: "Inferred."
  },
  {
    archetype: "vaccine",
    label: "Vaccine trial",
    keywords: ["vaccine", "vaccination", "immunization", "prophylaxis"],
    phaseFilter: null,
    piTier: "generalist",
    standardCategories: [
      "Site Personnel & Visits",
      "Hematology", "Chemistry & Metabolic",
      "Cardiac Diagnostics",
      "Vaccine Trial",
      "Drug Administration",
      "Subject Compensation",
      "Other / Miscellaneous"
    ],
    indicationCategories: [],
    specialtyProcedures: [],
    subjectCompensation: "full",
    notes: "Inferred."
  },
  {
    archetype: "cell_gene_therapy",
    label: "Cell / gene therapy",
    keywords: ["CAR-T", "CAR T", "gene therapy", "AAV", "lentiviral", "autologous", "allogeneic"],
    phaseFilter: null,
    piTier: "specialty",
    standardCategories: [
      "Site Personnel & Visits",
      "Hematology", "Coagulation", "Chemistry & Metabolic", "Urinalysis",
      "Serology & Viral Markers",
      "Cardiac Diagnostics",
      "PK / PD / Bioanalytical",
      "Cell & Gene Therapy",
      "Drug Administration",
      "Subject Compensation",
      "Other / Miscellaneous"
    ],
    indicationCategories: [
      "Specialty Procedures"
    ],
    specialtyProcedures: [
      "Apheresis (single session)",
      "Leukapheresis (cell harvest)"
    ],
    subjectCompensation: "patient",
    notes: "Inferred — high-cost."
  },
  {
    archetype: "ophthalmology",
    label: "Ophthalmology",
    keywords: ["retinopathy", "glaucoma", "AMD", "macular", "uveitis", "cataract", "ophthalmic"],
    phaseFilter: null,
    piTier: "ophthalmology",
    standardCategories: [
      "Site Personnel & Visits",
      "Hematology", "Chemistry & Metabolic",
      "Cardiac Diagnostics",
      "Ophthalmologic",
      "Drug Administration",
      "Subject Compensation",
      "Other / Miscellaneous"
    ],
    indicationCategories: [],
    specialtyProcedures: [
      "Optical coherence tomography (OCT)",
      "Visual acuity (BCVA / ETDRS)",
      "Intraocular pressure (IOP, tonometry)",
      "Comprehensive ophthalmologic exam"
    ],
    subjectCompensation: "patient",
    notes: "Inferred."
  },
  {
    archetype: "dermatology",
    label: "Dermatology",
    keywords: ["dermatology", "atopic dermatitis", "vitiligo", "psoriatic"],
    phaseFilter: null,
    piTier: "dermatology",
    standardCategories: [
      "Site Personnel & Visits",
      "Hematology", "Chemistry & Metabolic", "Urinalysis",
      "Serology & Viral Markers",
      "Inflammatory & Autoimmune",
      "Cardiac Diagnostics",
      "Dermatologic Procedures",
      "Drug Administration",
      "Subject Compensation",
      "Patient-Reported Outcomes",
      "Other / Miscellaneous"
    ],
    indicationCategories: [],
    specialtyProcedures: [
      "Skin biopsy — punch (4mm)",
      "Standardized clinical photography",
      "PASI / EASI scoring (rater time)"
    ],
    subjectCompensation: "patient",
    notes: "Inferred."
  }
];

// ─── Helper functions ───────────────────────────────────────────────────

// Build a lookup index by procedure name (case-insensitive)
const PROC_INDEX = {};
PROCEDURES.forEach(p => {
  PROC_INDEX[p.procedure.toLowerCase()] = p;
});

// Build a lookup index by category
const CATEGORY_INDEX = {};
PROCEDURES.forEach(p => {
  if (!CATEGORY_INDEX[p.category]) CATEGORY_INDEX[p.category] = [];
  CATEGORY_INDEX[p.category].push(p);
});

function lookupProcedure(name) {
  if (!name) return null;
  return PROC_INDEX[name.toLowerCase()] || null;
}

function lookupCategory(cat) {
  return CATEGORY_INDEX[cat] || [];
}

function classifyIndication(indicationStr, phase, population) {
  if (!indicationStr) indicationStr = '';
  const lower = indicationStr.toLowerCase();
  const phaseStr = String(phase || '').toLowerCase();
  const popLower = String(population || '').toLowerCase();

  // ─── HARD CANCER VETO ───────────────────────────────────────────────
  // If the indication contains any cancer terminology, healthy_volunteer_phase1
  // is forbidden, regardless of how PK/ADA-heavy the SoA is. This prevents the
  // Plenty Ustek baseline from being applied to oncology trials.
  const isCancer = /\b(cancer|tumor|tumour|carcinoma|malignant|malignanc|oncology|oncologic|leukemia|leukaemia|lymphoma|myeloma|sarcoma|glioma|melanoma|metastatic|adenocarcinoma|nsclc|sclc|hcc)\b/i.test(indicationStr);

  // Healthy volunteer takes precedence (Phase 1 specifically) — but ONLY if no cancer veto
  if (!isCancer) {
    if (popLower.includes('healthy')) {
      return INDICATION_TRIGGERS.find(t => t.archetype === 'healthy_volunteer_phase1');
    }
    if (lower.includes('healthy volunteer') || lower.includes('biosimilarity')) {
      return INDICATION_TRIGGERS.find(t => t.archetype === 'healthy_volunteer_phase1');
    }
  }

  // Try keyword match in priority order (specific → general)
  for (const trigger of INDICATION_TRIGGERS) {
    if (trigger.archetype === 'healthy_volunteer_phase1') continue;  // already handled
    for (const kw of trigger.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        // Phase filter check
        if (trigger.phaseFilter && !trigger.phaseFilter.some(p => phaseStr.includes(p))) continue;
        return trigger;
      }
    }
  }

  // Final fallback for cancer indications that didn't match a more specific archetype:
  // pick oncology_chemo_combo as the safest oncology default.
  if (isCancer) {
    return INDICATION_TRIGGERS.find(t => t.archetype === 'oncology_chemo_combo');
  }

  // Fallback — return null and let caller decide
  return null;
}

// Get the PI fee per visit for a specialty tier (USD trial unit cost)
function getPIVisitFee(piTier) {
  const tierMap = {
    "generalist": "PI / sub-investigator visit — generalist",
    "oncology": "PI / sub-investigator visit — oncology specialist",
    "cardiology": "PI / sub-investigator visit — cardiology specialist",
    "nephrology": "PI / sub-investigator visit — nephrology specialist",
    "neurology": "PI / sub-investigator visit — neurology specialist",
    "pulmonology": "PI / sub-investigator visit — pulmonology specialist",
    "rheumatology": "PI / sub-investigator visit — rheumatology specialist",
    "endocrinology": "PI / sub-investigator visit — endocrinology specialist",
    "dermatology": "PI / sub-investigator visit — dermatology specialist",
    "ophthalmology": "PI / sub-investigator visit — ophthalmology specialist",
    "hematology": "PI / sub-investigator visit — hematology specialist",
    "specialty": "PI / sub-investigator visit — cardiology specialist",  // mid-tier proxy
  };
  const procName = tierMap[piTier] || tierMap["generalist"];
  const proc = lookupProcedure(procName);
  return proc ? proc.trialUnitUsd : 18.75;
}

// Get the PI flat-fee per site for a specialty tier (USD)
function getPIFlatFee(piTier) {
  const procMap = {
    "generalist": "Principal Investigator flat fee — per site (generalist)",
    "oncology": "Principal Investigator flat fee — per site (oncology)",
    "hematology": "Principal Investigator flat fee — per site (oncology)",
    "cardiology": "Principal Investigator flat fee — per site (specialty)",
    "nephrology": "Principal Investigator flat fee — per site (specialty)",
    "neurology": "Principal Investigator flat fee — per site (specialty)",
    "pulmonology": "Principal Investigator flat fee — per site (specialty)",
    "rheumatology": "Principal Investigator flat fee — per site (specialty)",
    "endocrinology": "Principal Investigator flat fee — per site (specialty)",
    "dermatology": "Principal Investigator flat fee — per site (generalist)",
    "ophthalmology": "Principal Investigator flat fee — per site (specialty)",
    "specialty": "Principal Investigator flat fee — per site (specialty)",
  };
  const procName = procMap[piTier] || procMap["generalist"];
  const proc = lookupProcedure(procName);
  return proc ? proc.trialUnitUsd : 2000;
}

module.exports = {
  FX_KZT_USD,
  PROCEDURES,
  PREMIUMS,
  INDICATION_TRIGGERS,
  lookupProcedure,
  lookupCategory,
  classifyIndication,
  getPIVisitFee,
  getPIFlatFee
};
