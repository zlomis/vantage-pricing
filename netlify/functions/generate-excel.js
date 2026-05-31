// vantage-v52.E-calibri-sweep-b25-patch-section-headers
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
