// vantage-v50.7.1-archetype-normalize
// v50.7.1 (2026-05-10) hotfix: SoA manifest field name normalization.
//   - Sonnet returns `indication_archetype` per the prompt schema.
//   - vantageCalcCC and Cover B15 patch code read `manifest.archetype`.
//   - Pre-fix: library mode worked (procedures correct) but archetype metadata
//     was always undefined → Cover B15 always said "Legacy", cancer veto never
//     fired, piTier fell through to indication-string classifier.
//   - Post-fix: normalize manifest.archetype from manifest.indication_archetype
//     at the entry of vantageCalcCC. All downstream code now sees the archetype.
//
// vantage-v50.7-banner-archetype-gantt
// v50.7 (2026-05-07): five UX/calibration fixes from OT01P201 + Stelara calibration runs.
//
//  Fixes:
//   1. COVER B15 dynamic archetype label. Was hardcoded "Healthy Volunteer Phase 1 default"
//      regardless of what archetype Library v1 selected. Now writes:
//        - "Library v1 — Oncology Chemo Combo" (when library mode active)
//        - "Legacy — Healthy Volunteer Phase 1 default" (legacy fallback)
//      Patched via setSharedStr in the Cover sheet block.
//
//   2. SITES SCREENED auto-derive from KZ Sites: was Math.round(sites * 1.5) which
//      overstated for small trials (3 KZ sites → 5 screened, but manual baselines use 4).
//      Now: kz_sites + 1 (one feasibility-fail buffer). Matches all manual baselines.
//      Updated in computeDerivedDefaults (index.html), generate-excel.js, generate-word.js.
//      Also added re-derivation in field-change handler so changing kz_sites updates it live.
//
//   3. P&L MILESTONE GANTT — fix FSI/25% Enrolled column collision.
//      Pre-fix: FSI formula B13+2 collided with 25%=B13+ROUND(B14*0.25) for short-enrollment
//      trials. On Stelara (startup=4, enroll=6) both rendered at Month 6.
//      Post-fix: FSI=B13+1 (FSI at start of enrollment, not +2). Matches Word log convention.
//      Patched in generate-excel.js by replacing all 54 occurrences of "Assumptions!B13+2"
//      with "Assumptions!B13+1" in sheet8.xml; also clears cached ◆ markers for row 35.
//
//   4. BANNER REFIRE on financial-lever changes (index.html). Pre-fix: Review banner showed
//      stale calcOnly preview from upload time; user edits to markup/contingency/sites/subj
//      didn't propagate, so banner ≠ downloaded file. Now: debounced refireCalcOnly() fires
//      500ms after any change in REFIRE_TRIGGER_FIELDS (~17 fields), updates banner.
//
//   5. INDICATION CHANGE → CLIENT-SIDE RECLASSIFY + RE-EXTRACT button (index.html). Pre-fix:
//      changing the indication on Review screen did nothing — archetype stayed locked to
//      Sonnet's first guess (problematic for Plenty's dual-trial PDF where Sonnet picks
//      Pembro and user wants Stelara). Now: clientClassifyIndication() runs on indication
//      change, updates manifest.indication_archetype, and the Library status banner shows
//      a "Re-extract procedures" button if the user wants to actually rerun the SoA call.
//
// vantage-v50.5-calibration-fixes
// v50.5 (2026-04-29): OT01P201 calibration debug pass.
//
//  Fixes:
//   1. ARCHETYPE CLASSIFIER (dominant): Library was returning healthy_volunteer_phase1
//      for an oncology Phase 2b/3 pancreatic trial. Caused per-pt = $3,012 vs manual $35,226.
//      Root cause: SoA prompt only had a healthy-vol worked example, so Sonnet 4 anchored on it
//      even when the protocol described mFOLFIRINOX + RECIST + tumor biopsy.
//      Fix: (a) added oncology worked example to extractSoA_prompt.md;
//           (b) added hard cancer veto in prompt rule #4 (forbids healthy_volunteer_phase1 if
//               indication contains cancer/tumor/oncology terms);
//           (c) added cancer/tumor/etc. fallback keywords + isCancer veto in classifyIndication;
//           (d) server-side veto here in vantageCalcCC: re-classify if SoA returns healthy-vol
//               for a cancer indication.
//
//   2. WORD ≠ EXCEL MGMT FEE (structural): Word log showed $741,750, Excel showed $528,950.
//      Root cause: generate-excel.js had a server-side derivation block that overwrote
//      A.imv_1day, A.sae, etc. based on current sites/subj. generate-word.js did not, so it
//      used stale client-side values from before the user override.
//      Fix: replicated the same derivation block in generate-word.js (lines ~67-145).
//      Also fixed Word milestone schedule to compute % on Mgmt Fee (matches Excel + manual model)
//      instead of Total Proposal.
//
//   3. COVER + VANTAGE OUTPUT IDENTITY (cached values): Cover B8-B12 and VO C4-C7 are
//      formulas referencing Assumptions B5-B8/B11-B12. fullCalcOnLoad="1" recalcs them in
//      Excel desktop, but web/mobile previewers show cached "[Study Name]" placeholders.
//      Fix: added patchCachedStrIn() helper that updates cached <v> while preserving <f>...</f>
//      formula. Patches Cover B8-B12 + VO C4-C7 + VO C25 (patient count display).
//
//   4. ASSUMPTIONS FORMULA CELLS (cached values): B18 (Total Duration), B22 (sites
//      feasibility cached at 33 from default 100/3), B24, B51 (Mgmt Fee cached at $522,187
//      from baseline default), B52, B54, B67 — all formulas pointing at cells we override.
//      Fix: patchCachedIn() patches all of them after setNum overrides.
//
//   5. TIMELINE EXTRACTION PROMPT: synopsis prompt now disambiguates Treatment vs Follow-Up
//      (was extracting treat_mo=1, followup_mo=12 for OT01P201 instead of 6+6).
//
//   Version bumped from v50.3 to v50.5. v50.4 was design-polish only (UI changes in
//   index.html), no backend logic changed.
//
// v50.3 (2026-04-29):
//  - Added calcOnly fast-path: POST { assumptions, soa_manifest, calcOnly: true }
//    runs MS+CC math and returns totals as JSON without generating xlsx.
//    index.html uses this on the Review screen so banner numbers match the
//    downloaded file (was: hardcoded $1175/pt healthy-vol approximation).
//  - No behavior change for legacy/full generate calls.
//
// v50.2 hotfix (2026-04-29):
//  - Fix E118/E120/F118/F120 formulas in baseline_v3 to NOT multiply by patient
//    counts (the per-row qty values written by writeRow already include patient
//    counts baked in, so the formula was double-multiplying on Excel recalc)
//  - Fix Vantage Output (sheet3) C24/C27, Sponsor Output (sheet4) C30, and
//    Assumptions (sheet2) B52 cross-references that pointed at v2 cell coords
//    (F66/F67/E65) — re-pointed to v3 grand-total cells (F122/F123/E122)
//  - Escape unescaped & in 'SITE & PI' section header label (XML correctness)
//  - Cached values and formula-recalc results now agree everywhere
//
// v50.1 hotfix (2026-04-29): writeRow B/C/D-col regexes were producing
// duplicate t="..." attributes, corrupting sheet7.xml. Excel's auto-repair
// stripped the broken cells, leaving an apparently-empty Clinical Costs tab.
// Fix: rewrite cell tag entirely on each B/C/D write, stripping any pre-existing
// t="..." before adding the new one. Also handle self-closing B-col cells
// (<c r="B5" s="142"/>) which the original regex didn't match.
//
// v50 changes (additive over v49):
//  - 298-procedure Clinical Cost Library v1 (library_v1.js + library_v1_data.json)
//    drives library-mode CC calculation when an SoA manifest is present
//  - vantageCalcCC() refactored to accept optional manifest argument; falls back to
//    static $136/$1234 healthy-vol defaults when manifest is absent (BACKWARD COMPAT)
//  - Dynamic Clinical Costs tab rendering via writeCCSection() + hideUnusedCCRows()
//    in library mode, using TEMPLATE_V3_B64 (baseline_v3.xlsx) with expanded sections:
//      Screening rows 5-35, Treatment 39-69, Follow-up 73-103, Site 107-117
//      Contingency E118, Procedures Total E120, Grand Total E122, Per-Pt E123, All-Pts E124
//  - Conditional template selection: cc.mode === 'library' → V3, else legacy V2
//  - Request body shape backward-compatible:
//      Legacy:   POST body = A (assumptions)            → manifest=null, V2 template
//      v50:      POST body = {assumptions: A, soa_manifest: M}  → V3 template, line items
//    With manifest=null, output is BYTE-IDENTICAL to v49.
//
// v49 inherited:
//  - Embedded baseline_v2.xlsx (8 sheets: Cover, Assumptions, Vantage Output, Sponsor Output,
//    Internal Overview, Management Services, Clinical Costs, Profit & Loss)
//  - All structural fixes are in the baseline: Cover B8-B12 formulas, B22 patients-per-site
//    formula, MS row structure (premium D105, total D107), Internal Overview redesign with
//    P&L bridge, long-trial P&L extensions, healthy-vol defaults, Vantage Output zebra fix
//  - Cell patches: B9 deal_structure, B58 contingency, B68/B77 salary multipliers,
//    B101/B102 Tigermed targets, B103 vendor mgmt premium rate
//  - Cover B14 date_prepared (shared string), Sponsor Output C14 / Vantage Output C8 date
//  - Clinical Costs D63 PI fee per site (population-driven default)
//  - fullCalcOnLoad="1" so Excel recalculates on open (no stale cached-value drift)
//  - Sheet mapping (8 sheets):
//      sheet1 = Cover               sheet2 = Assumptions
//      sheet3 = Vantage Output      sheet4 = Sponsor Output
//      sheet5 = Internal Overview   sheet6 = Management Services
//      sheet7 = Clinical Costs      sheet8 = Profit & Loss
const JSZip = require('jszip');
const lib = require('./library_v1');

// vantageCalcMS — Management Services line-item replica of baseline_v2.xlsx MS sheet.
// MUST mirror MS!D13, D41, D49, D66, D79, D92, D98, D103, D105, D107 exactly.
// Used here to: (1) patch cached subtotal values for non-recalc viewers, (2) return
// mgmtFee in API response so index.html preview matches Excel without needing recalc.
function vantageCalcMS(A) {
  const isLocalCRO = (A.deal_structure || 'Local CRO') === 'Local CRO';
  const su  = Number(A.startup_mo)||0;
  const en  = Number(A.enroll_mo)||0;
  const tr  = Number(A.treat_mo)||0;
  const fo  = Number(A.followup_mo)||0;
  const cl  = Number(A.closeout_mo)||0;
  const tot = su+en+tr+fo+cl;
  const sut = su+en+tr;
  const s   = Number(A.kz_sites)||3;
  const subj= Number(A.subj_enroll)||0;
  const s_f = (subj && s) ? Math.round(subj/s) : 0;     // patients per site (baseline B22)
  const s_s = Number(A.sites_screen)||Math.round(s*1.5);
  const ec  = Number(A.ec_init)||1;
  const eca = Number(A.ec_annual)||Math.max(1,Math.ceil(tot/12));
  const i1  = Number(A.imv_1day)||0;
  const i2  = Number(A.imv_2day)||0;
  const rmv = Number(A.rmv)||0;
  const sae = Number(A.sae)||0;
  const sus = Number(A.susar)||0;
  const sig = Number(A.sig_issues)||0;
  const tcs = Number(A.tc_sponsor)||0;
  const tci = Number(A.tc_internal)||0;
  const sp  = Number(A.site_pay)||0;

  // Section subtotals — line-by-line mirror of MS sheet
  const sub_D13  = 1100 + 3000 + 800*s + 2500 + 5000 + 850 + 100 + 500 + 2000;
  const sub_D41  = 500*s_s + 650*s_s + 1500 + 250*s_f + 2000*s + 2500*s + 250*s + 500*s + 1000*s
                  + 500 + 250*s + 2500*s + 1000*s + 0
                  + 4000*ec + 5000 + 5000 + 500*ec + 2500*eca + 5000 + 500 + 500 + 3500 + 3000 + 1000*s;
  const sub_D49  = 1500 + 3500 + 200*sut + 3500 + 200*sut;
  const sub_D66  = 3250*s + 1500*i1 + 1250*i2 + 750*rmv + 500*en*s + 250*sig + 150*sig
                  + 500 + 500 + 300*sae + 150*sus + 250*sus + 150*en*s + 3000*s;
  const sub_D79  = 500*sut + 250*sut + 250*sut*2 + 7000 + 200*sp + 250*sut*s + 5000 + 500 + 3000 + 2500;
  const sub_D92  = 5000*2 + 1500 + 500 + 8500 + 1000 + 2000 + 400*tcs + 250*tci + 9000*s + 400*Math.ceil(tot/2);
  const sub_D98  = 300 + 2500 + 250*s*3;
  const sub_D103 = 1000 + 13000;

  const subtotalsSum = sub_D13 + sub_D41 + sub_D49 + sub_D66 + sub_D79 + sub_D92 + sub_D98 + sub_D103;
  const premium = isLocalCRO ? subtotalsSum * (Number(A.vendor_mgmt_premium_rate)||0) : 0;
  const mgmtFee = subtotalsSum + premium;

  return { sub_D13, sub_D41, sub_D49, sub_D66, sub_D79, sub_D92, sub_D98, sub_D103, premium, mgmtFee };
}

// vantageCalcCC v2 — manifest-aware Clinical Costs calculation.
// Two modes (selected automatically):
//
//   1. LEGACY MODE (no manifest): falls back to static $136 screening / $1,234
//      treatment per-patient defaults, byte-identical to v49 output. Used when
//      no SoA manifest is available (manual baseline trials).
//
//   2. LIBRARY MODE (manifest present): consumes manifest + library_v1.js to
//      build a per-procedure line-item array PLUS the legacy aggregate fields
//      (e16, e36, e58, e60, e63, e65, f65, f67) so existing template-cell-patching
//      code keeps working. Selects baseline_v3.xlsx with expanded CC sections.
function vantageCalcCC(A, manifest) {
  // v50.7.1 hotfix: SoA prompt returns `indication_archetype` but downstream code
  // reads `manifest.archetype`. Normalize on entry so cancer veto, piTier lookup,
  // and the Cover B15 archetype label all work correctly.
  if (manifest && manifest.indication_archetype && !manifest.archetype) {
    manifest.archetype = manifest.indication_archetype;
  }
  const subj      = Number(A.subj_enroll) || 0;
  const screen    = Math.round(subj * 1.3);
  const sites     = Number(A.kz_sites) || 3;
  const conting   = Number(A.clin_contingency) || 0;
  const markup    = Number(A.markup) || 2.0;
  const piFeeFlat = (A.pi_fee !== undefined && A.pi_fee !== null && A.pi_fee !== '')
                    ? Number(A.pi_fee) : null;

  // ─── LEGACY MODE — no manifest ─────────────────────────────────────────
  if (!manifest || !manifest.procedures || manifest.procedures.length === 0) {
    const PER_PATIENT_SCREENING = 136;   // $136 per screened patient (E14 cached default)
    const PER_PATIENT_TREATMENT = 1234;  // $1,234 per enrolled patient (E34 cached default)
    const e16 = PER_PATIENT_SCREENING * screen;
    const e36 = PER_PATIENT_TREATMENT * subj;
    const e56 = 0;                              // Cohort B not used in V2 baseline
    const e58 = (e16 + e36 + e56) * conting;
    const e60 = e16 + e36 + e56 + e58;
    const piFee = piFeeFlat != null ? piFeeFlat : 2000;
    const e63 = sites * piFee;
    const e65 = e60 + e63;
    const f65 = e65 * markup;
    const f67 = f65;
    const perPatientWithMarkup = subj > 0 ? f65 / subj : 0;
    return {
      mode: 'legacy',
      e16, e36, e58, e60, e63, e65, f65, f67,
      perPatientWithMarkup,
      clinRev: f65,
      lineItems: null
    };
  }

  // ─── LIBRARY-DRIVEN MODE ───────────────────────────────────────────────
  // Hard cancer veto: if the indication is oncology, force-correct an
  // archetype that the SoA extractor mis-classified as healthy_volunteer_phase1.
  // (Defensive — also enforced in classifyIndication and prompt-side rule #4.)
  const indStr = String(A.indication || '');
  const isCancer = /\b(cancer|tumor|tumour|carcinoma|malignant|malignanc|oncology|oncologic|leukemia|leukaemia|lymphoma|myeloma|sarcoma|glioma|melanoma|metastatic|adenocarcinoma|nsclc|sclc|hcc)\b/i.test(indStr);
  if (isCancer && manifest.archetype === 'healthy_volunteer_phase1') {
    console.warn('[vantageCalcCC] Cancer veto: SoA returned healthy_volunteer_phase1 for indication "' + indStr + '" — re-classifying.');
    const corrected = lib.classifyIndication(indStr, A.phase, A.population);
    manifest.archetype = corrected ? corrected.archetype : 'oncology_chemo_combo';
  }

  // Determine PI tier (used for PI flat-fee per site default)
  let piTier = 'generalist';
  if (manifest.archetype) {
    const trigger = lib.INDICATION_TRIGGERS.find(t => t.archetype === manifest.archetype);
    if (trigger) piTier = trigger.piTier;
  } else {
    const trigger = lib.classifyIndication(A.indication, A.phase, A.population);
    if (trigger) piTier = trigger.piTier;
  }
  const piFlatFeeUsd = piFeeFlat != null ? piFeeFlat : lib.getPIFlatFee(piTier);

  // Line items by section
  const lineItems = { screening: [], treatment: [], followup: [], site: [] };

  for (const m of manifest.procedures) {
    const proc = lib.lookupProcedure(m.name);
    if (!proc) {
      console.warn('[vantageCalcCC] Unknown procedure: "' + m.name + '"');
      continue;
    }
    const unit = proc.trialUnitUsd;
    const prob = (m.probability != null ? m.probability : 1.0);
    const sc = Number(m.screening || 0);
    const tr = Number(m.treatment || 0);
    const fu = Number(m.followup || 0);

    // Subject compensation: applied per-patient (or per screened) as block, not per-visit
    if (proc.category === 'Subject Compensation') {
      const lname = (m.name || '').toLowerCase();
      let qty = 0;
      let section = 'treatment';
      if (lname.includes('screening')) {
        qty = screen; section = 'screening';
      } else if (lname.includes('travel') || lname.includes('childcare')) {
        qty = subj * (sc + tr + fu); section = 'treatment';
      } else {
        qty = subj;
      }
      const total = qty * unit * prob;
      lineItems[section].push({
        category: proc.category, procedure: proc.procedure,
        qty, unitUsd: unit, probability: prob, totalUsd: total,
        confidence: proc.confidence,
      });
      continue;
    }

    // PI flat fees and recruiter comp are site-level
    if (proc.category === 'Site Personnel & Visits' &&
        (m.name.includes('flat fee') || m.name.includes('Recruiter'))) {
      const qty = m.name.includes('flat fee') ? sites : subj;
      const total = qty * unit * prob;
      lineItems.site.push({
        category: proc.category, procedure: proc.procedure,
        qty, unitUsd: unit, probability: prob, totalUsd: total,
        confidence: proc.confidence,
      });
      continue;
    }

    // Standard per-visit / per-patient procedures
    if (sc > 0) {
      const qty = screen * sc;
      const total = qty * unit * prob;
      lineItems.screening.push({
        category: proc.category, procedure: proc.procedure,
        qty, unitUsd: unit, probability: prob, totalUsd: total,
        confidence: proc.confidence, perPatientUnits: sc,
      });
    }
    if (tr > 0) {
      const qty = subj * tr;
      const total = qty * unit * prob;
      lineItems.treatment.push({
        category: proc.category, procedure: proc.procedure,
        qty, unitUsd: unit, probability: prob, totalUsd: total,
        confidence: proc.confidence, perPatientUnits: tr,
      });
    }
    if (fu > 0) {
      const qty = subj * fu;
      const total = qty * unit * prob;
      lineItems.followup.push({
        category: proc.category, procedure: proc.procedure,
        qty, unitUsd: unit, probability: prob, totalUsd: total,
        confidence: proc.confidence, perPatientUnits: fu,
      });
    }
  }

  // PI flat fee — added to site section if not already from manifest
  const hasPIFlat = lineItems.site.some(li => li.procedure.includes('flat fee'));
  if (!hasPIFlat) {
    lineItems.site.push({
      category: 'Site Personnel & Visits',
      procedure: 'Principal Investigator flat fee — per site (' + piTier + ')',
      qty: sites, unitUsd: piFlatFeeUsd, probability: 1.0,
      totalUsd: sites * piFlatFeeUsd, confidence: 'HIGH',
    });
  }

  // Section subtotals
  const sumSection = (arr) => arr.reduce((s, li) => s + li.totalUsd, 0);
  const screeningSubtotal = sumSection(lineItems.screening);
  const treatmentSubtotal = sumSection(lineItems.treatment);
  const followupSubtotal  = sumSection(lineItems.followup);
  const siteSubtotal      = sumSection(lineItems.site);

  // Procedures subtotal (excluding site fees) — contingency applies here only
  const proceduresBase = screeningSubtotal + treatmentSubtotal + followupSubtotal;
  const contingencyUsd = proceduresBase * conting;
  const proceduresWithContingency = proceduresBase + contingencyUsd;
  const grandTotalPreMarkup = proceduresWithContingency + siteSubtotal;
  const grandTotalWithMarkup = grandTotalPreMarkup * markup;
  const perPatientWithMarkup = subj > 0 ? grandTotalWithMarkup / subj : 0;
  const perPatientPreMarkup = subj > 0 ? grandTotalPreMarkup / subj : 0;

  // Legacy aliases for backward compat with downstream patches
  const e16 = screeningSubtotal;
  const e36 = treatmentSubtotal + followupSubtotal;
  const e56 = 0;
  const e58 = contingencyUsd;
  const e60 = e16 + e36 + e56 + e58;
  const e63 = siteSubtotal;
  const e65 = e60 + e63;
  const f65 = e65 * markup;
  const f67 = f65;

  return {
    mode: 'library',
    archetype: manifest.archetype,
    piTier,
    piFlatFeeUsd,
    lineItems,
    sectionSubtotals: {
      screening: screeningSubtotal,
      treatment: treatmentSubtotal,
      followup: followupSubtotal,
      site: siteSubtotal,
    },
    proceduresBase,
    contingencyUsd,
    proceduresWithContingency,
    grandTotalPreMarkup,
    grandTotalWithMarkup,
    perPatientPreMarkup,
    perPatientWithMarkup,
    // Aliases for sheet7 writer / preview consumers (more readable than the raw field names)
    contingencyAmount: contingencyUsd,
    proceduresTotal: proceduresWithContingency,
    grandTotal: grandTotalPreMarkup,
    perPatientBlended: perPatientPreMarkup,
    totalAllPatients: grandTotalPreMarkup,
    e16, e36, e58, e60, e63, e65, f65, f67,
    clinRev: f65,
  };
}

// Embedded baseline templates (base64 zip blobs)
// V2: existing 8-sheet baseline with hardcoded healthy-vol Phase 1 Clinical Costs (rows 5-12 screening, 19-30 treatment).
//     Used in legacy mode (no soa_manifest) — preserves byte-identical v49 output.
// V3: same workbook with EXPANDED Clinical Costs sheet:
//     Screening rows 5-35, Treatment 39-69, Follow-up 73-103, Site 107-117
//     Section subtotals at rows 36, 70, 104; Contingency E118; Procedures Total E120;
//     Grand Total E122; Per-Patient E123; All-Patients E124. Used in library mode.
const TEMPLATE_V2_B64 = "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";
const TEMPLATE_V3_B64 = "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";

// Excel date serial (1900-based, with the 1900-Feb-29 bug)
function excelSerial(y, m, d) {
  d = d || 1;
  const utc = Date.UTC(y, m - 1, d);
  const epoch = Date.UTC(1899, 11, 30); // Excel epoch (accounts for leap-year bug)
  return Math.floor((utc - epoch) / (24 * 60 * 60 * 1000));
}

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {
    // ── Body shape detection (v49 vs v50 backward compat) ─────────────
    // v49 legacy:  body = A (assumptions)
    // v50:         body = { assumptions: A, soa_manifest: M }
    // If body has the `assumptions` key with an object, treat as v50 shape;
    // otherwise treat the full body as the assumptions object.
    const rawBody = JSON.parse(event.body);
    let A, soaManifest;
    if (rawBody && typeof rawBody === 'object' && rawBody.assumptions && typeof rawBody.assumptions === 'object') {
      A = rawBody.assumptions;
      soaManifest = rawBody.soa_manifest || null;
    } else {
      A = rawBody;
      soaManifest = null;
    }

    // ── DEAL STRUCTURE: drives multiple defaults ─────────────────────
    // "Local CRO" (Vantage as prime, vendor pass-through) — default
    // "Tigermed"  (Vantage as sub to Tigermed, no premium, lower markup)
    const dealStructure = (A.deal_structure === 'Tigermed') ? 'Tigermed' : 'Local CRO';
    const isLocalCRO = dealStructure === 'Local CRO';
    A.deal_structure = dealStructure;

    // Apply structure-driven defaults only if the user didn't explicitly set
    if (A.markup === undefined || A.markup === null || A.markup === '') {
      A.markup = isLocalCRO ? 2.0 : 1.45;
    }
    if (A.clin_contingency === undefined || A.clin_contingency === null || A.clin_contingency === '') {
      A.clin_contingency = isLocalCRO ? 0.5 : 0.25;
    }
    if (A.vendor_mgmt_premium_rate === undefined || A.vendor_mgmt_premium_rate === null || A.vendor_mgmt_premium_rate === '') {
      A.vendor_mgmt_premium_rate = isLocalCRO ? 0.5 : 0;
    }
    if (A.clin_upfront === undefined || A.clin_upfront === null || A.clin_upfront === '') {
      A.clin_upfront = 0.10;
    }
    if (A.startup_sal_mult === undefined || A.startup_sal_mult === null || A.startup_sal_mult === '') {
      A.startup_sal_mult = 0.6;
    }
    if (A.closeout_sal_mult === undefined || A.closeout_sal_mult === null || A.closeout_sal_mult === '') {
      A.closeout_sal_mult = 1.0;
    }

    // ── INDICATION-DRIVEN SAE/SUSAR rates ─────────────────────────
    // Auto-detected from indication string. User can override SAE/SUSAR
    // values directly via the Monitoring tab in index.html.
    const ind = String(A.indication || '').toLowerCase();
    const isOnco   = /cancer|tumor|tumour|leukemia|lymphoma|myeloma|sarcoma|glioma|melanoma|oncol/i.test(ind);
    const isCardio = /cardiac|heart|cardiomyopathy|arrhythmia|ami|heart failure/i.test(ind);
    const saeRate   = isOnco ? 0.30 : isCardio ? 0.05 : 0.10;
    const susarRate = isOnco ? 0.10 : 0.05;

    // PI fee: $4,000 oncology / $2,000 healthy vol & other (default if user unset)
    if (A.pi_fee === undefined || A.pi_fee === null || A.pi_fee === '') {
      A.pi_fee = isOnco ? 4000 : 2000;
    }

    // ── SERVER-SIDE DERIVED DEFAULTS (mirrors computeDerivedDefaults in index.html) ──
    if (!A.kz_sites) {
      const is2b = /2b|phase\s*iib/i.test(A.phase || '');
      const is3 = /phase\s*3|phase\s*iii/i.test(A.phase || '') && !is2b;
      const is2 = /phase\s*2|phase\s*ii(?!i)/i.test(A.phase || '') || is2b;
      A.kz_sites = is3 ? 10 : is2 ? 5 : 3;
    }
    const sites    = Number(A.kz_sites);
    const enroll   = Number(A.enroll_mo)   || 6;
    const treat    = Number(A.treat_mo)    || 1;
    const followup = Number(A.followup_mo) || 2;
    const closeout = Number(A.closeout_mo) || 1;
    const startup  = Number(A.startup_mo)  || 4;
    const total    = startup + enroll + treat + followup + closeout;
    const subj     = Number(A.subj_enroll) || 100;

    (function computeDerived() {
      const is2b = /2b|phase\s*iib/i.test(A.phase || '');
      const is3 = /phase\s*3|phase\s*iii/i.test(A.phase || '') && !is2b;
      const is2 = /phase\s*2|phase\s*ii(?!i)/i.test(A.phase || '') || is2b;

      if (is3) {
        A.imv_1day = Math.round(sites * enroll * 0.5 + sites * followup / 6);
        A.imv_2day = 0;
        A.rmv      = Math.round(sites * enroll * 0.5 + sites * followup / 6);
      } else if (is2) {
        A.imv_1day = Math.round((treat * 2 + enroll + followup) * sites);
        A.imv_2day = Math.ceil(treat / 2) * sites;
        A.rmv      = Math.round(sites * (enroll + treat + followup) * 0.5);
      } else {
        A.imv_1day = Math.round(sites * (enroll + followup) + sites * treat * 0.5);
        A.imv_2day = 0;
        A.rmv      = Math.round(sites * (enroll + followup) + sites * treat * 0.5);
      }
      A.siv    = sites;
      A.cov    = sites;
      A.co_mon = sites;
      A.tmf_qc = Math.max(1, Math.round(total / 6));

      A.sae        = Math.round(subj * saeRate * 3);
      A.susar      = Math.ceil(subj * susarRate);
      A.sig_issues = Math.max(3, Math.round(sites * 0.5));

      A.tc_sponsor   = total * 2;
      A.tc_internal  = Math.round(A.tc_sponsor * 2);
      A.site_pay     = sites * Math.ceil(total / 3);
      A.periodic_saf = Math.max(1, Math.ceil(total / 12));

      // sites_feas not patched — baseline B22 is =ROUND(B25/B21,0) formula
      A.sites_screen = Number(A.kz_sites) + 1;  // v50.7: +1 buffer (matches manual baselines)
      A.ctra         = sites;
      A.ec_annual    = Math.max(1, Math.ceil(total / 12));
      // subj_screen always computed: enrolled x 1.3 — never extracted
      A.subj_screen = Math.round(subj * 1.3);
    })();

    // Pre-compute CC to determine which template to load.
    // Library mode (manifest present) → V3 baseline with expanded rows.
    // Legacy mode (manifest=null)     → V2 baseline (byte-identical to v49).
    const ccPre = vantageCalcCC(A, soaManifest);

    // ── v50.3: calcOnly fast-path ─────────────────────────────────────
    // When the client sets { calcOnly: true } on the body, return MS+CC totals
    // immediately without generating the xlsx. Used by the Review screen so the
    // preview banner reflects the manifest-driven Clinical Revenue (matching
    // what the downloaded file will show) instead of the legacy hardcoded calc.
    // Per-row data is intentionally NOT included — that's only on full generate.
    if (rawBody && rawBody.calcOnly === true) {
      const msPre = vantageCalcMS(A);
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calcOnly: true,
          deal_structure: A.deal_structure,
          mgmtFee: msPre.mgmtFee,
          premium: msPre.premium,
          subtotalsSum: msPre.mgmtFee - msPre.premium,
          clinRev: ccPre.f67,                           // grand total × markup
          totRev: msPre.mgmtFee + ccPre.f67,
          ccMode: ccPre.mode,                           // 'library' or 'legacy'
          ccArchetype: ccPre.archetype || null,
          ccProcedureCount: ccPre.lineItems
            ? (ccPre.lineItems.screening.length + ccPre.lineItems.treatment.length
              + ccPre.lineItems.followup.length + ccPre.lineItems.site.length)
            : null,
        }),
      };
    }

    const TEMPLATE_B64 = ccPre.mode === 'library' ? TEMPLATE_V3_B64 : TEMPLATE_V2_B64;
    const buf = Buffer.from(TEMPLATE_B64, 'base64');
    const zip = await JSZip.loadAsync(buf);

    // ── Sheet 2: Assumptions ──────────────────────────────────────────
    let xml2 = await zip.files['xl/worksheets/sheet2.xml'].async('string');
    let ss = await zip.files['xl/sharedStrings.xml'].async('string');

    function esc(v) { return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    // Append a shared string and update a cell to reference it (preserves cell style)
    function setSharedStr(xmlRef, ref, val) {
      if (val === undefined || val === null || val === '') return xmlRef;
      const siMatches = ss.match(/<si>/g);
      const newIdx = siMatches ? siMatches.length : 0;
      ss = ss.replace('</sst>', '<si><t xml:space="preserve">' + esc(val) + '</t></si></sst>');
      const out = xmlRef.replace(
        new RegExp('(<c r="' + ref + '"[^>]*>)(?:<f[^>]*/>' + '|<f[^>]*>[^<]*</f>)?<v>[^<]*</v>'),
        (match, cellOpen) => {
          const tagWithType = cellOpen.includes('t="s"') ? cellOpen : cellOpen.replace('>', ' t="s">');
          return tagWithType + '<v>' + newIdx + '</v>';
        }
      );
      ss = ss.replace(/(<sst[^>]* count=")[^"]*"/, '$1' + (newIdx + 1) + '"');
      ss = ss.replace(/(<sst[^>]* uniqueCount=")[^"]*"/, '$1' + (newIdx + 1) + '"');
      return out;
    }

    // Numeric cell write — preserves cell attributes (style), strips any formula, writes static value
    function setNumIn(xmlRef, ref, val) {
      if (val === undefined || val === null || val === '') return xmlRef;
      const n = Number(val);
      if (isNaN(n)) return xmlRef;
      return xmlRef.replace(
        new RegExp('<c r="' + ref + '"([^>]*)>(?:<f[^>]*>[^<]*</f>)?<v>[^<]*</v></c>'),
        '<c r="' + ref + '"$1><v>' + n + '</v></c>'
      );
    }
    function setNum(ref, val) { xml2 = setNumIn(xml2, ref, val); }

    // v50.5: patchCached updates ONLY the cached <v> value while PRESERVING the formula.
    // This is critical for formula cells whose inputs we override via setNum (e.g.,
    // B18 = SUM(B13:B17) — if B13-B17 are setNum'd to new values but B18's cached
    // value isn't refreshed, web/mobile previewers that don't honor fullCalcOnLoad
    // show the stale baseline value (B18=14 instead of 44 for OT01P201).
    function patchCachedIn(xmlRef, ref, val) {
      if (val === undefined || val === null || val === '') return xmlRef;
      const n = Number(val);
      if (isNaN(n)) return xmlRef;
      // Match cell with formula intact, replace only the <v> content
      return xmlRef.replace(
        new RegExp('(<c r="' + ref + '"[^>]*>(?:<f[^>]*/>|<f[^>]*>[^<]*</f>))<v>[^<]*</v>'),
        '$1<v>' + n + '</v>'
      );
    }
    // patchCachedStrIn: same as patchCachedIn but for string cells (t="str") — treats val as a literal string
    function patchCachedStrIn(xmlRef, ref, val) {
      if (val === undefined || val === null || val === '') return xmlRef;
      const safeVal = String(val).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      return xmlRef.replace(
        new RegExp('(<c r="' + ref + '"[^>]*>(?:<f[^>]*/>|<f[^>]*>[^<]*</f>))<v>[^<]*</v>'),
        '$1<v>' + safeVal + '</v>'
      );
    }

    // ── Assumptions cell writes ──────────────────────────────────────
    // Study Identity (shared strings) — Cover B8-B12 are formulas referencing these
    xml2 = setSharedStr(xml2, 'B5', A.study_name);
    xml2 = setSharedStr(xml2, 'B6', A.sponsor);
    xml2 = setSharedStr(xml2, 'B7', A.phase);
    xml2 = setSharedStr(xml2, 'B8', A.indication);
    // B9: Deal Structure (drives Sponsor Output IF formulas, MS premium auto-zero)
    xml2 = setSharedStr(xml2, 'B9', A.deal_structure);

    // Timeline
    setNum('B11', A.start_mo);   setNum('B12', A.start_yr);
    setNum('B13', A.startup_mo); setNum('B14', A.enroll_mo);
    setNum('B15', A.treat_mo);   setNum('B16', A.followup_mo); setNum('B17', A.closeout_mo);

    // Sites & Subjects — DO NOT setNum('B22', ...) — baseline B22 = =ROUND(B25/B21,0)
    setNum('B21', A.kz_sites);   setNum('B23', A.sites_screen);
    setNum('B24', A.subj_screen); setNum('B25', A.subj_enroll);

    // Regulatory
    setNum('B28', A.ec_init);    setNum('B29', A.ec_annual);   setNum('B30', A.ctra);

    // Monitoring — v51.B: B33/B34/B35 now contain phase-aware formulas in baseline_v3.
    // Use patchCachedIn to update cached value while preserving the formula
    // so user edits to B13-B17 (timeline) or B21 (sites) auto-propagate.
    // B36-B42 remain static values (one-off counts, not formula-driven).
    xml2 = patchCachedIn(xml2, 'B33', A.imv_1day);
    xml2 = patchCachedIn(xml2, 'B34', A.imv_2day);
    xml2 = patchCachedIn(xml2, 'B35', A.rmv);
    setNum('B36', A.siv);        setNum('B37', A.cov);          setNum('B38', A.co_mon);
    setNum('B39', A.tmf_qc);     setNum('B40', A.sae);          setNum('B41', A.susar);
    setNum('B42', A.sig_issues);

    // PM & Safety — v51.B: B45-B48 also formulas in baseline_v3
    xml2 = patchCachedIn(xml2, 'B45', A.tc_sponsor);
    xml2 = patchCachedIn(xml2, 'B46', A.tc_internal);
    xml2 = patchCachedIn(xml2, 'B47', A.site_pay);
    xml2 = patchCachedIn(xml2, 'B48', A.periodic_saf);

    // Financial — markup, contingency, upfront, KZ ops
    setNum('B53', A.markup);
    setNum('B55', A.clin_upfront);
    setNum('B57', A.kz_ops_mo);
    setNum('B58', A.clin_contingency);

    // Team Salaries (B67 is auto =SUM(B60:B66))
    setNum('B60', A.sal_charlie); setNum('B61', A.sal_zach);   setNum('B62', A.sal_almas);
    setNum('B63', A.sal_didar);   setNum('B64', A.sal_alex);
    setNum('B65', A.sal_alexander); setNum('B66', A.sal_shynar);

    // Salary phasing multipliers (startup B68, closeout B77)
    setNum('B68', A.startup_sal_mult);
    setNum('B77', A.closeout_sal_mult);

    // OpEx (B70 referral %, B71 referral name shared str — skip name unless provided)
    setNum('B70', A.referral_pct);
    if (A.referral_name) xml2 = setSharedStr(xml2, 'B71', A.referral_name);
    setNum('B72', A.insurance_mo); setNum('B73', A.tech_mo);
    setNum('B74', A.travel_m1);   setNum('B75', A.legal_m1);     setNum('B76', A.audit_annual);

    // Tigermed targets (B101, B102) and Vendor Mgmt Premium Rate (B103)
    setNum('B101', A.tigermed_target_ms);
    setNum('B102', A.tigermed_target_clinical);
    setNum('B103', A.vendor_mgmt_premium_rate);

    // ── v50.5: Cached-value patches for Assumptions formula cells ─────
    // These cells have formulas that depend on values we just setNum'd.
    // fullCalcOnLoad="1" recomputes them in real Excel, but cached-only viewers
    // (web preview, Google Sheets, Numbers) show stale defaults until we patch them.
    // Recompute the formulas server-side so cached values match what fullCalcOnLoad would produce.
    {
      const _su = Number(A.startup_mo)||0, _en = Number(A.enroll_mo)||0,
            _tr = Number(A.treat_mo)||0, _fo = Number(A.followup_mo)||0,
            _cl = Number(A.closeout_mo)||0;
      const _tot = _su + _en + _tr + _fo + _cl;
      const _sites = Number(A.kz_sites)||0;
      const _subj  = Number(A.subj_enroll)||0;

      // Timeline / sites / subjects formula cells
      xml2 = patchCachedIn(xml2, 'B18', _tot);                                    // Total Duration = SUM(B13:B17)
      xml2 = patchCachedIn(xml2, 'B22', _sites > 0 ? Math.round(_subj/_sites) : 0); // Patients per site
      xml2 = patchCachedIn(xml2, 'B24', Math.round(_subj * 1.3));                 // Subjects Screened

      // Salary total
      const _salTot = (Number(A.sal_charlie)||0)+(Number(A.sal_zach)||0)+(Number(A.sal_almas)||0)+
                      (Number(A.sal_didar)||0)+(Number(A.sal_alex)||0)+(Number(A.sal_alexander)||0)+
                      (Number(A.sal_shynar)||0);
      xml2 = patchCachedIn(xml2, 'B67', _salTot);

      // Monitoring/PM formula cells (B33, B35-B39, B40-B42, B45-B48): these were
      // setNum'd above (which strips the formula), so cached values are correct.
      // No further patch needed.
    }

    // NOTE: sheet2.xml save deferred to after `ms` and `cc` are computed below,
    // so we can patch B51/B52/B54 cached values that depend on MS!D107 and CC!E122.

    // ── Sheet 6: Management Services — patch cached subtotals ──────
    // fullCalcOnLoad="1" makes Excel recalc on open, but viewers like Google Sheets
    // and Numbers preview show cached values. We patch them so the file looks correct
    // everywhere. Math is in vantageCalcMS() — must mirror MS sheet exactly.
    const ms = vantageCalcMS(A);
    const cc = ccPre;

    // ── v50.5: now that ms and cc are available, patch Assumptions B51/B52/B54 ─────
    // B51 = MS!D107 (Vantage Mgmt Fee), B52 = CC!E122 (Clinical Costs at cost),
    // B54 = B52*B53 (Clinical Services Revenue). Cached values were stale baseline defaults.
    xml2 = patchCachedIn(xml2, 'B51', ms.mgmtFee);
    // For library mode, e65 is the procedures-at-cost total (same role as legacy);
    // for legacy mode, cc.e65 is also the procedures-at-cost total.
    xml2 = patchCachedIn(xml2, 'B52', cc.e65);
    xml2 = patchCachedIn(xml2, 'B54', cc.f65);

    // Now save sheet2.xml — all patches applied
    zip.file('xl/worksheets/sheet2.xml', xml2);

    {
      let xml6 = await zip.files['xl/worksheets/sheet6.xml'].async('string');
      // Patch the section subtotal cached values (D13, D41, etc.) — they're SUM formulas
      // We replace their <v> cached values; Excel will recalc them on open via fullCalcOnLoad.
      const subtotals = [
        ['D13', ms.sub_D13], ['D41', ms.sub_D41], ['D49', ms.sub_D49], ['D66', ms.sub_D66],
        ['D79', ms.sub_D79], ['D92', ms.sub_D92], ['D98', ms.sub_D98], ['D103', ms.sub_D103],
        ['D105', ms.premium], ['D107', ms.mgmtFee],
        ['B105', ms.premium], // Premium row: B105 has the IF formula, D105 = B105*C105 (C=1)
      ];
      for (const [ref, val] of subtotals) {
        xml6 = xml6.replace(
          new RegExp('(<c r="' + ref + '"[^>]*>(?:<f[^>]*/>|<f[^>]*>[^<]*</f>)?)<v>[^<]*</v>'),
          '$1<v>' + val + '</v>'
        );
      }
      zip.file('xl/worksheets/sheet6.xml', xml6);
    }

    // ── Sheet 7: Clinical Costs — patch cached values for procedures, contingency, totals ──
    if (cc.mode === 'legacy') {
      // V2 baseline (manifest=null): hardcoded healthy-vol Phase 1 layout.
      // Patch cached values at the legacy cell coords. Byte-identical to v49 output.
      let xml7 = await zip.files['xl/worksheets/sheet7.xml'].async('string');
      const ccPatches = [
        ['E16', cc.e16], ['E36', cc.e36], ['E58', cc.e58], ['E60', cc.e60],
        ['E63', cc.e63], ['E65', cc.e65], ['E66', cc.perPatientWithMarkup / (Number(A.markup)||2.0)],
        ['E67', cc.e65], ['F65', cc.f65], ['F66', cc.perPatientWithMarkup], ['F67', cc.f67],
        ['F58', cc.e58 * (Number(A.markup)||2.0)], ['F60', cc.e60 * (Number(A.markup)||2.0)],
        ['F63', cc.e63 * (Number(A.markup)||2.0)],
        ['F16', cc.e16 * (Number(A.markup)||2.0)], ['F36', cc.e36 * (Number(A.markup)||2.0)],
      ];
      for (const [ref, val] of ccPatches) {
        xml7 = xml7.replace(
          new RegExp('(<c r="' + ref + '"[^>]*>(?:<f[^>]*/>|<f[^>]*>[^<]*</f>)?)<v>[^<]*</v>'),
          '$1<v>' + val + '</v>'
        );
      }
      zip.file('xl/worksheets/sheet7.xml', xml7);
    } else {
      // V3 baseline (manifest present): expanded sections — write line items dynamically.
      //   Screening rows 5-35 (31 slots), subtotal E36, × patients screened E37
      //   Treatment rows 39-69 (31 slots), subtotal E70, × patients enrolled E71
      //   Followup  rows 73-103 (31 slots), subtotal E104, × patients enrolled E105
      //   Site & PI rows 107-117 (11 slots)
      //   Contingency E118, Procedures Total E120, Grand Total E122,
      //   Per-Patient Blended E123, Total All Patients E124
      let xml7 = await zip.files['xl/worksheets/sheet7.xml'].async('string');
      const markup = Number(A.markup) || 2.0;
      const subjScr = Number(A.subj_screen) || Math.round((Number(A.subj_enroll)||0) * 1.3);
      const subjEnr = Number(A.subj_enroll) || 0;

      // Helper: write inline-string label into B-col, qty into C-col, unit USD into D-col.
      // E and F columns hold formulas (E = C*D, F = E*markup) — preserved; we patch their cached <v>.
      // Baseline_v3 sheet7 cell shapes:
      //   B-col: <c r="B5" s="142"/>                            (self-closing, no content)
      //   C-col: <c r="C5" s="151" t="n"><v>0</v></c>            (numeric, no formula)
      //   D-col: <c r="D5" s="152" t="n"><v>0</v></c>            (numeric, no formula)
      //   E-col: <c r="E5" s="152" t="n"><f aca="false">C5*D5</f><v>0</v></c>
      //   F-col: <c r="F5" s="152" t="n"><f aca="false">E5*Assumptions!B53</f><v>0</v></c>
      function writeRow(rowIdx, name, qty, unitUsd) {
        const total = qty * unitUsd;
        const totalMk = total * markup;

        // ── B: replace entire cell tag with inline-string version ──
        // Match the cell in either self-closing or paired form, capture only the attributes,
        // strip any existing t="..." cleanly, then add t="inlineStr" exactly once.
        const bRe = new RegExp('<c r="B' + rowIdx + '"([^/>]*?)(?:/>|>(?:[^<]|<(?!/c>))*?</c>)', 's');
        xml7 = xml7.replace(bRe, (m, attrs) => {
          const cleaned = String(attrs).replace(/\s*t="[^"]*"/g, '').trimEnd();
          if (name === '') {
            // Empty name → leave cell empty (self-closing) so Excel doesn't render an empty <is>
            return '<c r="B' + rowIdx + '"' + (cleaned ? ' ' + cleaned.trim() : '') + '/>';
          }
          return '<c r="B' + rowIdx + '"' + (cleaned ? ' ' + cleaned.trim() : '') + ' t="inlineStr"><is><t xml:space="preserve">' + esc(name) + '</t></is></c>';
        });

        // ── C: numeric value — strip any existing t="...", set t="n" ──
        // Replace the entire cell to guarantee no attribute duplication.
        const cRe = new RegExp('<c r="C' + rowIdx + '"([^/>]*?)(?:/>|>(?:[^<]|<(?!/c>))*?</c>)', 's');
        xml7 = xml7.replace(cRe, (m, attrs) => {
          const cleaned = String(attrs).replace(/\s*t="[^"]*"/g, '').trimEnd();
          return '<c r="C' + rowIdx + '"' + (cleaned ? ' ' + cleaned.trim() : '') + ' t="n"><v>' + qty + '</v></c>';
        });

        // ── D: numeric value ──
        const dRe = new RegExp('<c r="D' + rowIdx + '"([^/>]*?)(?:/>|>(?:[^<]|<(?!/c>))*?</c>)', 's');
        xml7 = xml7.replace(dRe, (m, attrs) => {
          const cleaned = String(attrs).replace(/\s*t="[^"]*"/g, '').trimEnd();
          return '<c r="D' + rowIdx + '"' + (cleaned ? ' ' + cleaned.trim() : '') + ' t="n"><v>' + unitUsd + '</v></c>';
        });

        // ── E: keep formula (C*D), patch cached <v> ──
        xml7 = xml7.replace(
          new RegExp('(<c r="E' + rowIdx + '"[^>]*>(?:<f[^>]*/>|<f[^>]*>[^<]*</f>)?)<v>[^<]*</v>'),
          '$1<v>' + total + '</v>'
        );

        // ── F: keep formula (E*Assumptions!B53), patch cached <v> ──
        xml7 = xml7.replace(
          new RegExp('(<c r="F' + rowIdx + '"[^>]*>(?:<f[^>]*/>|<f[^>]*>[^<]*</f>)?)<v>[^<]*</v>'),
          '$1<v>' + totalMk + '</v>'
        );
      }

      // Helper: hide unused rows by setting hidden="1" on the <row> element.
      // Baseline rows have hidden="false" already — we MUST replace it, not append,
      // otherwise the row tag ends up with duplicate hidden attributes (XML invalid).
      function hideRow(rowIdx) {
        const rowRe = new RegExp('<row r="' + rowIdx + '"([^>]*)>');
        xml7 = xml7.replace(rowRe, (m, attrs) => {
          // Strip any existing hidden="..." cleanly, then add hidden="1"
          const cleaned = String(attrs).replace(/\s*hidden="[^"]*"/g, '');
          return '<row r="' + rowIdx + '"' + cleaned + ' hidden="1">';
        });
      }

      // Pad arrays to fixed slot count, hide unused rows.
      function writeSection(items, startRow, slotCount) {
        const used = items.slice(0, slotCount);
        for (let i = 0; i < used.length; i++) {
          const it = used[i];
          // Library mode line items use `procedure` for display name; fall back to `name` if present.
          const label = it.procedure || it.name || '';
          writeRow(startRow + i, label, it.qty, it.unitUsd);
        }
        for (let i = used.length; i < slotCount; i++) {
          // Zero-out the row so any cached residual doesn't show, then hide.
          writeRow(startRow + i, '', 0, 0);
          hideRow(startRow + i);
        }
      }

      writeSection(cc.lineItems.screening, 5,   31);
      writeSection(cc.lineItems.treatment, 39,  31);
      writeSection(cc.lineItems.followup,  73,  31);
      writeSection(cc.lineItems.site,      107, 11);

      // Section subtotals (E-col) and × patients rows (E-col).
      // E36 = sum screening unit cost; E37 = E36 × subj_screen; etc.
      const totals = [
        ['E36', cc.sectionSubtotals.screening],          ['F36', cc.sectionSubtotals.screening * markup],
        ['E37', cc.sectionSubtotals.screening * subjScr], ['F37', cc.sectionSubtotals.screening * subjScr * markup],
        ['E70', cc.sectionSubtotals.treatment],          ['F70', cc.sectionSubtotals.treatment * markup],
        ['E71', cc.sectionSubtotals.treatment * subjEnr], ['F71', cc.sectionSubtotals.treatment * subjEnr * markup],
        ['E104', cc.sectionSubtotals.followup],          ['F104', cc.sectionSubtotals.followup * markup],
        ['E105', cc.sectionSubtotals.followup * subjEnr], ['F105', cc.sectionSubtotals.followup * subjEnr * markup],
        ['E118', cc.contingencyAmount],                   ['F118', cc.contingencyAmount * markup],
        ['E120', cc.proceduresTotal],                     ['F120', cc.proceduresTotal * markup],
        ['E122', cc.grandTotal],                          ['F122', cc.grandTotal * markup],
        ['E123', cc.perPatientBlended],                   ['F123', cc.perPatientBlended * markup],
        ['E124', cc.totalAllPatients],                    ['F124', cc.totalAllPatients * markup],
      ];
      for (const [ref, val] of totals) {
        xml7 = xml7.replace(
          new RegExp('(<c r="' + ref + '"[^>]*>(?:<f[^>]*/>|<f[^>]*>[^<]*</f>)?)<v>[^<]*</v>'),
          '$1<v>' + val + '</v>'
        );
      }
      zip.file('xl/worksheets/sheet7.xml', xml7);
    }

    // ── v50.7: Sheet 8 (P&L) — fix milestone gantt collision ───────────────────
    // Pre-fix: FSI formula was B13+2, which for short enrollment (≤8mo) collided
    // with the 25% Enrolled milestone (B13+ROUND(B14*0.25)). On Stelara (startup=4,
    // enroll=6) both rendered in column 8 / Month 6 — Charlie noticed this.
    // Post-fix: FSI is B13+1 (FSI happens at the start of enrollment, not 2 months in).
    //   Stelara: FSI=Mo 5, 25%=Mo 6 → no collision
    //   OT01P201: FSI=Mo 5, 25%=Mo 10 → no collision (Mo 5 instead of Mo 6, more accurate)
    // Also matches the Word log convention which already uses startup+1.
    {
      let xml8 = await zip.files['xl/worksheets/sheet8.xml'].async('string');
      // Replace all 54 occurrences of "Assumptions!B13+2" with "Assumptions!B13+1" in
      // the FSI gantt row (B35). This is the FSI row only — other rows use ROUND() and
      // are correct.
      // We use a global replace on the exact formula string. The formulas are XML-encoded
      // (e.g., &quot; for quotes) but B13+2 itself is plain text in <f> tags.
      const before = (xml8.match(/Assumptions!B13\+2/g) || []).length;
      xml8 = xml8.replace(/Assumptions!B13\+2/g, 'Assumptions!B13+1');
      const after = (xml8.match(/Assumptions!B13\+1/g) || []).length;
      // Also patch cached <v> values where applicable: cell with <v>◆</v> means a marker
      // is currently rendered. Excel will recompute these on open via fullCalcOnLoad,
      // so cached values for the FSI row will stay until recalc. To avoid showing stale
      // markers, we clear any cached marker in row 35:
      xml8 = xml8.replace(
        /(<c r="[A-Z]+35"[^>]*>(?:<f[^>]*>[^<]*<\/f>))<v>◆<\/v>/g,
        '$1<v></v>'
      );
      zip.file('xl/worksheets/sheet8.xml', xml8);
    }

    // ── Sheet 3: Vantage Output — patch cached values that depend on MS subtotals ──
    {
      let xml3 = await zip.files['xl/worksheets/sheet3.xml'].async('string');
      const isLocalCRO = (A.deal_structure || 'Local CRO') === 'Local CRO';
      const voPatches = [
        ['C12', ms.sub_D13], ['C13', ms.sub_D41], ['C14', ms.sub_D49], ['C15', ms.sub_D66],
        ['C16', ms.sub_D79], ['C17', ms.sub_D92], ['C18', ms.sub_D98], ['C19', ms.sub_D103],
        ['C20', ms.premium], ['C21', ms.mgmtFee],
        ['C24', cc.perPatientWithMarkup], ['C27', cc.f67],
        ['C29', ms.mgmtFee + cc.f67],
      ];
      for (const [ref, val] of voPatches) {
        xml3 = xml3.replace(
          new RegExp('(<c r="' + ref + '"[^>]*>(?:<f[^>]*/>|<f[^>]*>[^<]*</f>)?)<v>[^<]*</v>'),
          '$1<v>' + val + '</v>'
        );
      }
      zip.file('xl/worksheets/sheet3.xml', xml3);
    }

    // ── Sheet 4: Sponsor Output — patch cached values (deal-structure-aware) ──
    {
      let xml4 = await zip.files['xl/worksheets/sheet4.xml'].async('string');
      const isLocalCRO = (A.deal_structure || 'Local CRO') === 'Local CRO';
      // For Local CRO: SO!C18-C25 = MS subtotals directly; SO!C27 = MS total
      // For Tigermed: SO!C18-C25 = MS subtotals × markup; SO!C27 = tigermed_target_ms
      const tmMS = Number(A.tigermed_target_ms) || ms.mgmtFee;
      const tmCl = Number(A.tigermed_target_clinical) || cc.f67;
      const subtotalMult = isLocalCRO ? 1 : (Number(A.markup) || 1.45);
      const totalMS = isLocalCRO ? ms.mgmtFee : tmMS;
      const totalClin = isLocalCRO ? cc.f67 : tmCl;
      const soPatches = [
        ['C18', ms.sub_D13 * subtotalMult], ['C19', ms.sub_D41 * subtotalMult],
        ['C20', ms.sub_D49 * subtotalMult], ['C21', ms.sub_D66 * subtotalMult],
        ['C22', ms.sub_D79 * subtotalMult], ['C23', ms.sub_D92 * subtotalMult],
        ['C24', ms.sub_D98 * subtotalMult], ['C25', ms.sub_D103 * subtotalMult],
        ['C27', totalMS],
        ['C30', cc.perPatientWithMarkup], ['C33', totalClin],
        ['C35', totalMS + totalClin],
      ];
      for (const [ref, val] of soPatches) {
        xml4 = xml4.replace(
          new RegExp('(<c r="' + ref + '"[^>]*>(?:<f[^>]*/>|<f[^>]*>[^<]*</f>)?)<v>[^<]*</v>'),
          '$1<v>' + val + '</v>'
        );
      }
      zip.file('xl/worksheets/sheet4.xml', xml4);
    }

    // ── Sheet 5: Internal Overview — patch cached headline values ──
    {
      let xml5 = await zip.files['xl/worksheets/sheet5.xml'].async('string');
      const ioPatches = [
        ['B5', ms.mgmtFee], ['B6', cc.f67], ['B7', ms.mgmtFee + cc.f67],
      ];
      for (const [ref, val] of ioPatches) {
        xml5 = xml5.replace(
          new RegExp('(<c r="' + ref + '"[^>]*>(?:<f[^>]*/>|<f[^>]*>[^<]*</f>)?)<v>[^<]*</v>'),
          '$1<v>' + val + '</v>'
        );
      }
      zip.file('xl/worksheets/sheet5.xml', xml5);
    }

    // ── Sheet 1: Cover — Date Prepared (B14 shared string) + cached identity ──────
    {
      let xml1 = await zip.files['xl/worksheets/sheet1.xml'].async('string');
      const datePrep = A.date_prepared || new Date().toISOString().slice(0, 10);
      xml1 = setSharedStr(xml1, 'B14', datePrep);

      // v50.7: Cover B15 — dynamic archetype label.
      // Was hardcoded "Baseline v2.0 - Healthy Volunteer Phase 1 default" in the template.
      // Now reflects what actually ran: Library v1 with the selected archetype, or Legacy mode.
      let archetypeLabel;
      if (cc && cc.archetype) {
        // Library mode ran with an archetype — humanize the snake_case name
        const human = cc.archetype.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        archetypeLabel = `Library v1 — ${human}`;
      } else {
        archetypeLabel = 'Legacy — Healthy Volunteer Phase 1 default';
      }
      xml1 = setSharedStr(xml1, 'B15', archetypeLabel);

      // v50.5: Cover B8-B12 are FORMULAS referencing Assumptions!B5-B8/B11-B12.
      // fullCalcOnLoad recalcs them in Excel desktop, but web/mobile previewers
      // show cached values. We patch the cached <v> directly so the file looks
      // correct in any viewer. Note: these cells are t="str" (formula-string),
      // so we update the cached string in place while preserving <f>...</f>.
      const startQ = (Number(A.start_mo) || 1) <= 3 ? 'Q1' : (Number(A.start_mo) <= 6 ? 'Q2' : (Number(A.start_mo) <= 9 ? 'Q3' : 'Q4'));
      const startStr = startQ + ' ' + (A.start_yr || new Date().getFullYear());
      if (A.study_name)     xml1 = patchCachedStrIn(xml1, 'B8',  A.study_name);
      if (A.sponsor)        xml1 = patchCachedStrIn(xml1, 'B9',  A.sponsor);
      if (A.phase)          xml1 = patchCachedStrIn(xml1, 'B10', A.phase);
      if (A.indication)     xml1 = patchCachedStrIn(xml1, 'B11', A.indication);
      xml1 = patchCachedStrIn(xml1, 'B12', startStr);

      zip.file('xl/worksheets/sheet1.xml', xml1);
    }

    // ── Sheet 3: Vantage Output — Date Prepared (C8) + cached identity (C4-C7, C25) ──
    {
      let xml3 = await zip.files['xl/worksheets/sheet3.xml'].async('string');
      const dp = A.date_prepared ? new Date(A.date_prepared) : new Date();
      const serial = excelSerial(dp.getFullYear(), dp.getMonth() + 1, dp.getDate());
      xml3 = setNumIn(xml3, 'C8', serial);

      // v50.5: C4-C7 are formula cells referencing Assumptions identity (B5-B8); C25 references B25.
      // Same caching issue as Cover B8-B12: web previewers see stale "[Study Name / Protocol]" placeholders.
      if (A.study_name) xml3 = patchCachedStrIn(xml3, 'C4', A.study_name);
      if (A.sponsor)    xml3 = patchCachedStrIn(xml3, 'C5', A.sponsor);
      if (A.phase)      xml3 = patchCachedStrIn(xml3, 'C6', A.phase);
      if (A.indication) xml3 = patchCachedStrIn(xml3, 'C7', A.indication);
      // C25 = enrolled patient count (numeric formula cell)
      if (A.subj_enroll) xml3 = patchCachedIn(xml3, 'C25', Number(A.subj_enroll));

      zip.file('xl/worksheets/sheet3.xml', xml3);
    }

    // ── Sheet 4: Sponsor Output — Date Prepared (C14) as date serial ──
    {
      let xml4 = await zip.files['xl/worksheets/sheet4.xml'].async('string');
      const dp = A.date_prepared ? new Date(A.date_prepared) : new Date();
      const serial = excelSerial(dp.getFullYear(), dp.getMonth() + 1, dp.getDate());
      xml4 = setNumIn(xml4, 'C14', serial);

      // Sponsor Output landscape print area (skip hidden internal rows 1-5)
      // Note: page setup is added at workbook level via pageSetup element
      if (!/<pageSetup\b/.test(xml4)) {
        xml4 = xml4.replace(
          /<\/worksheet>/,
          '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="1"/></worksheet>'
        );
      }
      // Print area: A6:C37 (skipping hidden internal scaling rows)
      if (!/<definedName\b/.test(xml4)) {
        // definedNames go at workbook.xml level — handled below
      }

      zip.file('xl/worksheets/sheet4.xml', xml4);
    }

    // ── Sheet 7: Clinical Costs — PI fee per site (D63) ───────────────
    {
      let xml7 = await zip.files['xl/worksheets/sheet7.xml'].async('string');
      xml7 = setNumIn(xml7, 'D63', A.pi_fee);
      zip.file('xl/worksheets/sheet7.xml', xml7);
    }

    // ── Sheet 8: P&L — date column headers (row 1) ────────────────────
    {
      const startMo = A.start_mo || 1;
      const startYr = A.start_yr || new Date().getFullYear();
      let xml8 = await zip.files['xl/worksheets/sheet8.xml'].async('string');
      const colLetters = ['C','D','E','F','G','H','I','J','K','L','M','N','O',
        'P','Q','R','S','T','U','V','W','X','Y','Z','AA','AB',
        'AC','AD','AE','AF','AG','AH','AI','AJ','AK','AL','AM','AN','AO',
        'AP','AQ','AR','AS','AT','AU','AV','AW','AX','AY','AZ','BA','BB',
        'BC','BD'];
      colLetters.forEach((col, i) => {
        const mo = ((startMo - 1 + i) % 12) + 1;
        const yr = startYr + Math.floor((startMo - 1 + i) / 12);
        const serial = excelSerial(yr, mo);
        xml8 = xml8.replace(
          new RegExp('(<c r="' + col + '1"[^>]*>(?:<f[^>]*>[^<]*</f>)?)<v>\\d*</v>'),
          '$1<v>' + serial + '</v>'
        );
      });
      zip.file('xl/worksheets/sheet8.xml', xml8);
    }

    // ── Workbook: add print area defined name for Sponsor Output, ensure fullCalcOnLoad ──
    let wbXml = await zip.files['xl/workbook.xml'].async('string');

    // Add Sponsor Output print area: A6:C37 (sheet index 3 = Sponsor Output)
    if (!/<definedNames\b/.test(wbXml)) {
      wbXml = wbXml.replace(
        /<\/sheets>/,
        '</sheets><definedNames><definedName name="_xlnm.Print_Area" localSheetId="3">\'Sponsor Output\'!$A$6:$C$37</definedName></definedNames>'
      );
    }

    // Ensure fullCalcOnLoad="1" so Excel recalculates all formulas on open
    if (/<calcPr/.test(wbXml)) {
      wbXml = wbXml.replace(/<calcPr([^/]*?)\s*\/>/,
        (match, attrs) => '<calcPr' + attrs.replace(/\s*fullCalcOnLoad="[^"]*"/g,'') + ' fullCalcOnLoad="1"/>');
    } else {
      wbXml = wbXml.replace(/<\/workbook>/, '<calcPr fullCalcOnLoad="1"/></workbook>');
    }
    zip.file('xl/workbook.xml', wbXml);

    // Delete calcChain so Excel recomputes everything from scratch
    delete zip.files['xl/calcChain.xml'];

    // Save shared strings (after ALL setSharedStr calls across all sheets)
    zip.file('xl/sharedStrings.xml', ss);

    const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: out.toString('base64'),
        deal_structure: A.deal_structure,
        mgmtFee: ms.mgmtFee,
        premium: ms.premium,
        subtotalsSum: ms.mgmtFee - ms.premium,
        clinRev: cc.f67,
        totRev: ms.mgmtFee + cc.f67,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message, stack: err.stack }),
    };
  }
};
