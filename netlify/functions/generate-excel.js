// vantage-v52.F-century-gothic-restore-tstr-meta-cells
// vantage-v52.D-row-cascade-numbering-em-dash-sweep
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
    setNum('B25', A.subj_enroll);  // v52.E: patch Subjects Enrolled (was hardcoded 100 in template)
    xml2 = patchCachedIn(xml2, 'B24', A.subj_screen);  // v52.A: preserve =ROUND(B25*1.3,0) formula

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
        // v52.D: enforce no em dashes, middle dots, × in the displayed label.
        // Library procedure names use em dashes for matching; clean before writing to cell.
        if (name && typeof name === 'string') {
          name = name.replace(/ — /g, ': ').replace(/—/g, ':').replace(/·/g, '.').replace(/×/g, 'x');
        }
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

      // v52.D: Helper to unhide a row (inverse of hideRow). Defensive against baseline state
      // where a populated row was previously hidden.
      function unhideRow(rowIdx) {
        const rowRe = new RegExp('<row r="' + rowIdx + '"([^>]*)>');
        xml7 = xml7.replace(rowRe, (m, attrs) => {
          const cleaned = String(attrs).replace(/\s*hidden="[^"]*"/g, '');
          return '<row r="' + rowIdx + '"' + cleaned + '>';
        });
      }

      // v52.D: Helper to write a sequential procedure number into column A of a CC data row.
      function writeColAIndex(rowIdx, idx) {
        // Match cell A{rowIdx} regardless of style index, with or without existing content.
        const cellRe = new RegExp('<c r="A' + rowIdx + '"([^>]*)>(?:<f[^>]*/?>(?:[^<]*</f>)?)?(?:<v>[^<]*</v>)?(?:<is>.*?</is>)?</c>', 's');
        if (cellRe.test(xml7)) {
          xml7 = xml7.replace(cellRe, '<c r="A' + rowIdx + '"$1><v>' + idx + '</v></c>');
        } else {
          // If cell doesn't exist, inject it at the start of the row
          const rowOpenRe = new RegExp('(<row r="' + rowIdx + '"[^>]*>)');
          xml7 = xml7.replace(rowOpenRe, '$1<c r="A' + rowIdx + '"><v>' + idx + '</v></c>');
        }
      }

      // Pad arrays to fixed slot count, hide unused rows, number used rows in column A.
      function writeSection(items, startRow, slotCount) {
        const used = items.slice(0, slotCount);
        for (let i = 0; i < used.length; i++) {
          const it = used[i];
          // Library mode line items use `procedure` for display name; fall back to `name` if present.
          const label = it.procedure || it.name || '';
          // v52.A: pass qtyFormula so C-col becomes a live formula referencing Assumptions cells
          writeRow(startRow + i, label, it.qty, it.unitUsd, it.qtyFormula || '');
          // v52.D: defensive unhide in case template has the row hidden; then number col A.
          unhideRow(startRow + i);
          writeColAIndex(startRow + i, i + 1);
        }
        for (let i = used.length; i < slotCount; i++) {
          // Zero-out the row so any cached residual doesn't show, then hide.
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
      // v52.D: multiplier rows R37/R71/R105 are decorative-only (no formula references them
      // anywhere in the model). Hidden in template + no longer written by engine. Rollup at
      // R118 references Assumptions B24/B25 directly.
      const totals = [
        ['E36', cc.sectionSubtotals.screening],          ['F36', cc.sectionSubtotals.screening * markup],
        ['E70', cc.sectionSubtotals.treatment],          ['F70', cc.sectionSubtotals.treatment * markup],
        ['E104', cc.sectionSubtotals.followup],          ['F104', cc.sectionSubtotals.followup * markup],
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
