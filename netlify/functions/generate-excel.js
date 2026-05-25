// vantage-v51.G-soa-functions-include
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
    setNum('B21', A.kz_sites);   xml2 = patchCachedIn(xml2, 'B23', A.sites_screen);
    setNum('B24', A.subj_screen); setNum('B25', A.subj_enroll);

    // Regulatory — v51.D: B30 now formula =B21 in baseline; use patchCachedIn to preserve
    setNum('B28', A.ec_init);    setNum('B29', A.ec_annual);
    xml2 = patchCachedIn(xml2, 'B30', A.ctra);

    // Monitoring — v51.D: B33-B42 now all formula-driven in baselines, preserve formulas
    // so user edits to B13-B17 (timeline), B21 (sites), or B25 (subj) auto-propagate.
    // B34 (Phase 1/3 imv_2day) stays literal since baseline value is 0.
    xml2 = patchCachedIn(xml2, 'B33', A.imv_1day);
    xml2 = patchCachedIn(xml2, 'B34', A.imv_2day);
    xml2 = patchCachedIn(xml2, 'B35', A.rmv);
    xml2 = patchCachedIn(xml2, 'B36', A.siv);
    xml2 = patchCachedIn(xml2, 'B37', A.cov);
    xml2 = patchCachedIn(xml2, 'B38', A.co_mon);
    xml2 = patchCachedIn(xml2, 'B39', A.tmf_qc);
    xml2 = patchCachedIn(xml2, 'B40', A.sae);
    xml2 = patchCachedIn(xml2, 'B41', A.susar);
    xml2 = patchCachedIn(xml2, 'B42', A.sig_issues);

    // PM & Safety — v51.B: B45-B48 also formulas in baseline_v3
    xml2 = patchCachedIn(xml2, 'B45', A.tc_sponsor);
    xml2 = patchCachedIn(xml2, 'B46', A.tc_internal);
    xml2 = patchCachedIn(xml2, 'B47', A.site_pay);
    xml2 = patchCachedIn(xml2, 'B48', A.periodic_saf);

    // Financial — markup, contingency, upfront, KZ ops
    xml2 = patchCachedIn(xml2, 'B53', A.markup);
    setNum('B55', A.clin_upfront);
    setNum('B57', A.kz_ops_mo);
    xml2 = patchCachedIn(xml2, 'B58', A.clin_contingency);

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
    xml2 = patchCachedIn(xml2, 'B103', A.vendor_mgmt_premium_rate);

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
