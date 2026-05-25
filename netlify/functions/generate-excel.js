// vantage-v51.E-dynamic-deal-structure
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
