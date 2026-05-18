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
