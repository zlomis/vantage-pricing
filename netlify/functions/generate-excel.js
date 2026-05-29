// vantage-v52.C-cc-styling-row105-fix-mho-merge
// vantage-v52.B-cohort-prob-aware-cc-formulas
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
      let qtyFormula = '';
      if (lname.includes('screening')) {
        qty = screen; section = 'screening';
        qtyFormula = 'Assumptions!$B$24';
      } else if (lname.includes('travel') || lname.includes('childcare')) {
        qty = subj * (sc + tr + fu); section = 'treatment';
        qtyFormula = 'Assumptions!$B$25*' + (sc + tr + fu);
      } else {
        qty = subj;
        qtyFormula = 'Assumptions!$B$25';
      }
      const total = qty * unit * prob;
      lineItems[section].push({
        category: proc.category, procedure: proc.procedure,
        qty, qtyFormula, unitUsd: unit, probability: prob, totalUsd: total,
        confidence: proc.confidence,
      });
      continue;
    }

    // PI flat fees and recruiter comp are site-level
    if (proc.category === 'Site Personnel & Visits' &&
        (m.name.includes('flat fee') || m.name.includes('Recruiter'))) {
      const isPIFlat = m.name.includes('flat fee');
      const qty = isPIFlat ? sites : subj;
      const qtyFormula = isPIFlat ? 'Assumptions!$B$21' : 'Assumptions!$B$25';
      const total = qty * unit * prob;
      lineItems.site.push({
        category: proc.category, procedure: proc.procedure,
        qty, qtyFormula, unitUsd: unit, probability: prob, totalUsd: total,
        confidence: proc.confidence,
      });
      continue;
    }

    // Standard per-visit / per-patient procedures
    if (sc > 0) {
      // v52.B: cached qty matches the formula evaluation (prob applied via cohort sub-expression)
      const qty = (prob < 1.0) ? Math.round(screen * prob) * sc : screen * sc;
      // v52.B: include probability factor for partial-cohort procedures so qty * unit gives the right total
      const cohortRef = (prob < 1.0)
        ? 'ROUND(Assumptions!$B$24*' + prob + ',0)'
        : 'Assumptions!$B$24';
      const qtyFormula = cohortRef + '*' + sc;
      const total = qty * unit * prob;
      lineItems.screening.push({
        category: proc.category, procedure: proc.procedure,
        qty, qtyFormula, unitUsd: unit, probability: prob, totalUsd: total,
        confidence: proc.confidence, perPatientUnits: sc,
      });
    }
    if (tr > 0) {
      // v52.B: cached qty matches the formula evaluation
      const qty = (prob < 1.0) ? Math.round(subj * prob) * tr : subj * tr;
      // v52.B: include probability factor for partial-cohort procedures
      const cohortRef = (prob < 1.0)
        ? 'ROUND(Assumptions!$B$25*' + prob + ',0)'
        : 'Assumptions!$B$25';
      const qtyFormula = cohortRef + '*' + tr;
      const total = qty * unit * prob;
      lineItems.treatment.push({
        category: proc.category, procedure: proc.procedure,
        qty, qtyFormula, unitUsd: unit, probability: prob, totalUsd: total,
        confidence: proc.confidence, perPatientUnits: tr,
      });
    }
    if (fu > 0) {
      // v52.B: cached qty matches the formula evaluation
      const qty = (prob < 1.0) ? Math.round(subj * prob) * fu : subj * fu;
      // v52.B: include probability factor for partial-cohort procedures
      const cohortRef = (prob < 1.0)
        ? 'ROUND(Assumptions!$B$25*' + prob + ',0)'
        : 'Assumptions!$B$25';
      const qtyFormula = cohortRef + '*' + fu;
      const total = qty * unit * prob;
      lineItems.followup.push({
        category: proc.category, procedure: proc.procedure,
        qty, qtyFormula, unitUsd: unit, probability: prob, totalUsd: total,
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
      qty: sites, qtyFormula: 'Assumptions!$B$21',
      unitUsd: piFlatFeeUsd, probability: 1.0,
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
    xml2 = patchCachedIn(xml2, 'B24', A.subj_screen);  // v52.A: preserve =ROUND(B25*1.3,0) formula setNum('B25', A.subj_enroll);

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
        // v52.C: B105/C105 are empty in baseline_v3; D105 now holds the VMP IF formula directly
        // (matches the canonical subtotal-row convention used by D13, D41, etc.)
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
      function writeRow(rowIdx, name, qty, unitUsd, qtyFormula) {
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

        // ── C: qty — v52.A writes as FORMULA cell when qtyFormula is provided,
        //    so toggling Assumptions!B22 (or B21 for site rows) rescales the
        //    whole CC tab + downstream Sponsor Output / P&L automatically.
        //    Falls back to literal numeric for padding/zero rows.
        const cRe = new RegExp('<c r="C' + rowIdx + '"([^/>]*?)(?:/>|>(?:[^<]|<(?!/c>))*?</c>)', 's');
        xml7 = xml7.replace(cRe, (m, attrs) => {
          const cleaned = String(attrs).replace(/\s*t="[^"]*"/g, '').trimEnd();
          const attrStr = cleaned ? ' ' + cleaned.trim() : '';
          if (qtyFormula && qtyFormula.length > 0) {
            return '<c r="C' + rowIdx + '"' + attrStr + ' t="n"><f aca="false">' + qtyFormula + '</f><v>' + qty + '</v></c>';
          }
          return '<c r="C' + rowIdx + '"' + attrStr + ' t="n"><v>' + qty + '</v></c>';
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
          // v52.A: pass qtyFormula so C-col becomes a live formula referencing Assumptions cells
          writeRow(startRow + i, label, it.qty, it.unitUsd, it.qtyFormula || '');
        }
        for (let i = used.length; i < slotCount; i++) {
          // Zero-out the row so any cached residual doesn't show, then hide.
          // qtyFormula '' → falls back to literal numeric for padding rows.
          writeRow(startRow + i, '', 0, 0, '');
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
