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
const TEMPLATE_V2_B64 = "UEsDBBQAAAAIAE2WuVzigiFYDQEAAIYGAAAaAAAAeGwvX3JlbHMvd29ya2Jvb2sueG1sLnJlbHO91UFvgyAUB/B7PwXhPlHbWreIvSxLet26D0DwKaYKBGi3fvuxdVlt0pAdDCfynvB/v3iAavs5DugExvZKUpwlKUYguWp62VH8vn95KPG2XlSvMDDnt1jRa4v8GWkpFs7pJ0IsFzAymygN0n9plRmZ86XpiGb8wDogeZoWxEwzcH2TiXYNxWbXZBjtzxr+k63atufwrPhxBOnujCDOnwUfyEwHjuKf8tLMEh+GyX1DPqfBuvMA9oq41KHxyznHfyhzsALAXQV/LY/7XoL/YhUZk4cw68iYZQhTRMasQphNZMw6hCkjY4oQ5jEyZhPCZGlkTRnUzHrZWsEMNG/O+Jdjet9N27+aRUVu3pP6C1BLAwQUAAAACABNlrlcI1qNz+4CAADPBgAADwAAAHhsL3dvcmtib29rLnhtbKWUW2/aMBiG7/crPAvtDpJwCIcSKpYWtVM7qtK1l5WTOMSrY0e2A3TT/vu+JEADndC0XUB8fPx+x/H5JuVoRZVmUnjYadkYURHKiImlh789zJoDjLQhIiJcCurhV6rx+eTDeC3VSyDlC4L7Qns4MSYbWZYOE5oS3ZIZFbATS5USA1O1tHSmKIl0QqlJudW2bddKCRO4IozU3zBkHLOQXsgwT6kwFURRTgyo1wnLNJ6MY8bpY2UQIln2laQg2yc8xNZkL/tOoYCEL3k2g9MejgnXFAxN5HoefKehAYsI5xhFxFBnaHd3Rw4Q0sBJeAYWi4VHRtf6bb+YlsQrqdgPKQzhi1BJzj1sVL59DYQaFv5pZ1E46oEEere4eWIikmsPQ4hea+N1OXxikUkggG5n0N2tXVG2TIyHB86wjZEhwX3hKA/3bLgWM6VN+UhJIWDJisJ7xQwMsmoWlTHbfZGoHCohaQqlsHQdwcNlmhjYWTHNAg6C1YjBhrqOOgWwfnmqdZ5mZdBqiPYJRPcY8UjAoUuK5rnJclOjdE5QeseURQYSpHpP6Z6guMeUa2GoEoSjOfhkBT6rgXonQP1j0C0RYFOR2mhRkEJa9497AjU4RvmciSKxkC+1qVP6JyjDYwrkeMwM+kTS7AzdSF0HDU6AnCqHdokT0ZgJGhWleDhDcS7KEtqXYMKiiL5NuSyKoxaVStfzhou0daeYMM9TaCsYrQLQGtIoV/tynnwimdRn76JTLX9sTBvOqPGl0euMrZqk/9HX+Rd9hzn4Js4dNfxGp38kzjr0JbweQi9jYCKEwpe5gHJ2ivpWNL6VUVFsUJrb/b3s7fyCckOg4Fu2bcOpOOe8aJRzcSNJWdMQRLoxN9qU322n5hLG77o1Z4GiVX8uWzVGuWIe/tl3264/cNvN9tTpNB3nstf83On2mrPL2Qwak3/hD2e/oG2X1BH8/MokbcB7y3saL16h0jcevtyElE9LTRYcq/5Ladau5U5+A1BLAwQUAAAACABNlrlcO6HfCvQCAAACDQAAEwAAAHhsL3RoZW1lL3RoZW1lMS54bWzNV8Fy2yAQvfcrGO4Jkiw5sid2Dkk9PXSmM036AQghiQYhDdCk/vsisCUUOa7TOp36gGF5vF0e7GJf3/ysOXiiUrFGrGB4GUBABWlyJsoV/PawuUghUBqLHPNG0BXcUgVv1h+u8VJXtKbALBdqiVew0rpdIqSIMWN12bRUmLmikTXWZihLlEv8bGhrjqIgmKMaMwF36+Up65uiYITeNeRHTYV2JJJyrE3oqmKtgkDg2sT4xQLBQxcgXO9D/chpt051BsLlPbHx+yssNn8Muy8ly+yWS/CE+QoG9gPR+hr1AK6nuMJ+drgdIH+MJriwiBdXec8XOb4pjlJKaNjzWQAmxOxi6jsu0jDbc3og151ykyAJ4jHe459N8Issy5LFCD8b8PEEnwbzGEcjfDzgk2n8mZmZj/DJgJ9Ptb5azOMx3oIqzsTjwRPsT6aHFA3/dBCeGni6P/ABhbyb49YL/do9qvH3Rm4MwB6uuaQC6G1LC0wM7hbXmWQYgpZpUm1wzfjWBAkBqbBUVJsr0jnHS4q9Vc5E1AsTeuGsZuKYZ86M6/N5HpwhXxArT+0PGOf3esvpZ2UDUw1n+cYY7cDCevnbynShZexn3MhfVEo89NWOtlSgbVS3oyO8piIwoZ0t8VJ77KxUPuGsA55KOrs6jTR0heVE1jA5xoo8Fcx1Bbir4OE8ci6AIpjTvD9ezTj9SokG3J6+tq20bda1zstI4r+QW1U4pzu9w9OkSX+vjMe6mJ1PcJ82PoPiwZ8pjqY5w8V4BJ5NiEmUmOzFrSmJJtlNt26NUyVKCDAvzaNOtNtXK5W+w6pyW7OptH9axMAXJXEX/PkIZ2l4HkL0UgBaFEbPVyzD0Mw5koOz5wejQ5Fl5eY/LYDxiQUwfkupivelapxOi3fJ0ujoDvwsbbGuQNeYO8ck4e6p7tLsodnnpnsQuvy8cDWoS9Kd0SRqmHreOqp/X00HmdMTz+6Ngs7eSdDkgJ7JGeRE0/xCo58faPIfYG9Z/wJQSwMEFAAAAAgATZa5XACU+jM1DAAAny8BAA0AAAB4bC9zdHlsZXMueG1s7Z1tk6LGFoC/319BscmtpCqz8qKAdx1Tjiup++VWKrupStWd+4FRVCoIXmSSMb8+NPgC2mcEUfq0NtauQr/y9DmnTzdNT+/Ht4Uv/eFGKy8MHmX1oyJLbjAOJ14we5R//Wo/WLK0ip1g4vhh4D7Ka3cl/9j/R28Vr333y9x1YynJIVg9yvM4Xv6r1VqN5+7CWX0Ml26QhEzDaOHEyWk0a62WketMViTRwm9pimK0Fo4XyP1e8LqwF/FKGoevQZxUQ99dk7Kvf0+Sq0ZblrL8huEkqctPbuBGji+3qJE7xcjr5Hh+WCyeHyYTIIVRTPHhhw8flE/P36Xfz99/en4A0pnFdAoQzSpGe/4mK+Cf/38N40/ffZN9nyyse1DYR0V5fqPHNZWDuN8C8dSjPL9N7pt8vVMTUztOBcTUS9959vP7Tw/ZDyC/NjU/IHKnAnYgiwPBWBApWq9J5NZGcvu9aRjsBVi35OxKv7f6S/rD8ZNcVBJ/HPphJMWJiiT5pFcCZ+FmMYaO771EHrk4dRaev84ua2m6uROtEl3LskpLzrI/KEQpZjmIvEw/8hkqyJK/ZAFx9OqSsG1uurYHFs1eHmV7cxxQc4P4NVpLP4Xx3BufA8+jl68aDZUP3H9Gs1C+kh6XLr/xAqEbVhECN5Rhu6nydbYC3z0qvtMlH3b4r3P7J+T92gVeJeejrmSR9CQO1fae1zpaU9b43daxrmj+rIbEv2l1K5THxIxYCvlcTEIreFRXs1XthroKUMEZt97VnK5jre8o5NNQwx7f/nVcIOD2j23Qdegf3P1rdrpKBv0+mz65pk9AHzlVMiaXcH5r9K8Iy6/e0lWAN6VppRX9uu7MsWY3ervXLz79IvMgnu/vJ/I0ObvS7y2dOHajwE5OpM3vr+tl0mcHYeBm+aTxTsSeRc5a1TrlE6xC35uQWsyG9Nt/KQaoA3WgjdL8c3nWLm3rHLwcBmzN+wVLszu2aQ8opY2ebD0T8UuWttObF6gaFy6N2m77gAuWNrJGI9tsiuQ+08PSdtW4YGl7QT8oTU+Oi5McKORDKe2pPTA/GxcuzUoPSmnW+/qWfiVG7CWMJm60N2NdeXtNmnjOLAwc/9flozx1/JUr7y59Dv8Mthf7Pd+dxkk5kTebk+84XJLqhHEcLpIf2zSkJlnO55UgpQ9iEoM/Tx+kFEz8MD3SmyVRN3UpmSKNm1a7ZIIk5vb+SqbIIl+JRYt2u63jG2pRK91QC+37hbItlEtRroVyCUq2UC7FVVsIi7QybWuKRGJuQKpW3Y2IvteEdDvSfMvgqk1lOWFd8QasNetbbPFpeqi9O4sOHUPZ1DbIT4JDprdZd6eMUbp22RQHkG0z3YSvXd6IXK3amx/JcG3s+v4Xkt9v092YTVOSbN+mx+vHgvSELI1Kxnqbn1lOmxNnufTXdkgySafRsgtPaZTCpYHvzYKFexDx5yiM3XGcrqdLL/d7zjaiNA8j768kazJ7NtssXyPL72JvTC5ltytLsfsW/xLGTpZLUqc/I2f5Nbm4axkvmKQFJ2GreeQFv38NbW8XnGBa7qoh+eH4d3eyreTcmyRJczFbb9MDUsqek3oup009D0HlL+dJbWWLn8poojJAZc7WLVEZURlRGVEZUZlzKtPWMfWUbRVVbdqoaqNhqk2XcWVaefc9c+YLfrx+riP/Nj2ue75GNSvPm1ffEDZgKHQT1Np7aloJanWHj+8zGycX3CiPbHsFE7LOHpkukJVCZuyRtfPIVBbIyGRPPWDq1YGZgDHjBVhWzpV5dQSvc+XLAsy+xgmvxhWyy7mANQ5MVYSIVSSmAr0kE8eCAyOmaoAnxqlSXt8P472bbF4n9T2xDnNiZzn7Ra28voyp0JQLL0LWiBkzbkrGmjFkpmBWR85yxt8QyGBklkBWFVlXaGZVZqYimFVmpgrVrGHNhJiVFDPtppg1PgCAkJWfx7jkgzjEcqbflJw13gUIZnc/A3T3fgbGNQXcz8s23WOamOwYF9OyKufE0Dwq4eXZUjN2P0+sjUnE+HD8O4BzwcbxR6qWhdElLmJ8SFluMZlYslh9MQZ7888HM2jNIqfrV9gNLXkB1oghK7FmUfA67cOeafgZuxdMR+IIkKXv12NnpgB+P4Asz+eO3yOBpjC40c0mrFlhwh8XMd5U0xSqeYZqlqEmVFPFRQytahamy4Q5q/MSDvtBOVZ3Nq+Y9YHdnYxBg0xujH8zxOjLZBEQ40LIoLcJhSE7bcjEsLzkVIZVWy/FdBlXwFgOL8u8fymGl9lJtxq2O3UxoAEmAmR47X/uvRKtonbeLbOcamr13yi/E4NW0E5o5Y+QtFLMxJRZSe18Z4tboZ0gNR3TOIAXaG0hamdQq7867/5EDVxpzMuylgNije711hHASjxrQgXsAq7GnYkYZkNGfw4gmNVcaiBM2WlTxh4Yb6aMPTHMaknfxkYwK6mZuPxYLlQTFzLEclbYL0lAq27QxHzGOdSEqJXtB+hv6bDvO9F2AwAx9gMnvMTKLNUQyLjYwB6xKSvMZxuYbBna4bmGlRgXiplHxt788yZk7ImhFbK8i4HK+uMlpgmn7Iaf/iJcc4yqu0S7m40piNWw/YIY11qJ1SNDC4yLzhKVe4F04ze0TzE54IXrr8nxsYGZBr1lws8Olo0zAx+R6EIxb3Lr4iIvrcmlGOx54X1NosQ6PEEMNPwWJmR8GTGTf16NGjH2vPCqJN2ICWKVjRh7ZFiNWAnPoi1ErKqz3xEiVm0BGZtld3wLmSGE7CSwwnM3UwCrBswSwE6aMQSrh7kzYwVmXSFkdP+1C9h9lcn6AS4eVIJCJhyyisBUMUqqSEy4YxXtGJMnInybMfEQqdqGDmJ2rCoxMdlTdc5aEKs828NkXIkXGWD5EWwdiNT0Q0KGgBgXUqYr0NCSl+VjjaxPNEshY+KTcS5m/Lj+eKb7VSaOBtYeABCzovfPy6wPU2smOs2aYsaGGR/WDHrPUhWzZafdWY29lHGhmahe5sUqY3lLltvVH8Hjy0NiGHe+QIYM834hhqBWrwsQ1M7S0FzHieBPlRy7Z2igGQJaPf0U0M5QTx2Y1mCymEW4HLckZng9jqPhExpmeP0NvMwA5bTYM0OsnHihoe0EAHuGABle3QTsmWDW2Ojpqk/q0DDDOw7gQ85yw4CukLNyclaf2V3LGfvhJmI5w+ueYZ53xOuhYaaG10fDTA2tl4YZGl43DTM1tKKGdqiO1rUVxG5JMfGOBjBTQzsewAwNEDUEu7Vgpkbf+1lsmgojMw2B7EKvCWiCWSlmCvRmBbAxUN543VkvQKemCGqlHY42hA3DaADLOykFbwMVMbwL3wFk7DtOvMhKvV4n9BIQsg4mYniFDEDG3jnDi6yMbwbsFSG8jMMOgP3GN2itGdadgrC+Kwa4GOyBoTVlJlqlRIsMmDNj7/pzoJX5v8zEHhheEQOQibFSKa3U6r8YcF2XLA6XaPdtVNnrZX1/jOHsovD7z6EmoJX7c4a3oJwNbBSByi/jYuveW9BMLMwANwMlM6YT2WSzdu7NWQOzZag6AD6emeN6KodmaN4au77/23TV75EfX+K1766kcfhKyjDk3FUpcBbuo/yfMFoQm7JD9vLq+bEXZGet4wTDcLFwtvHJRoa5BDqYQPqv8r9dIqOQyKAmeo0iNxivd2nMQpr2e2kKZVmFdCYt3c9uRJprl6RbSNJJ0e5h9nuTt+kOqSmn5/0eEcWksZw4afbATk9eZsPQDyMpmr08yrZtDAZW205zK0RrZUlbaTYl87LVoaZrl8nLsAfW5+Fl8hopRnJcJq+n9sD8fKm89FFnoF6Ivd3tKsqJvMj/RAdJwuSbaPmbOxluTpOcClkq6UGyPAzJDnoIlEZRyD96CAmDyoFqAKUh1+khFng/imKBISSMmlt6QOXQ05Dr9JBhetBzg9LsVeQwpNvV9Uzgj7h1bNMe0EJGT7ZO52YYikLPba9Yx3dqKMM2dKdQy0Hc4NaGJeR9OQDa9F0JgdoUlkToTkfWaGSbtJC9SaDdabdLb22onCyMWs7OjB2nGQ7p5RCZopej65D0kvIBDd51FrRaQ1pPZJEW0umSDy1koJAPvX0gLdl3irQ09BroOhRCtBEOodego5APLUQdqANtlBr6A/vd2tr11or4BF/mrhv3/wZQSwMEFAAAAAgATZa5XAy/4GzUBQAANRoAABgAAAB4bC93b3Jrc2hlZXRzL3NoZWV0MS54bWy9WV1zmzgUfd9fwfLQt9pI/k5td/LRbDuTNum63c7szj4oIGxNAFFJtpP8+l5JgDEEtt2x3Ycarq7uPedcgcTN9O1jHDkbKiTjycxFHc91aOLzgCXLmfv1y/XrsetIRZKARDyhM/eJSvft/LfplosHuaJUORAgkTN3pVR61u1Kf0VjIjs8pQmMhFzERMGtWHZlKigJzKQ46mLPG3ZjwhLXRjgTPxODhyHz6RX31zFNlA0iaEQUwJcrlso82mPwU/ECQbZANcdTgnhlR4p4qF+LFzNfcMlD1fF5nEGrs5x0J3s8HwX+f5HQAKhumK4UzoPF/s+wjIl4WKevIXYKSt2ziKknQ9idT038O+GELFJUfOQBFDkkkaQwpsj9JY+4cMTyfuZeX3vmn9udT1OypAuqvqZmpvrC78CQT4TxbhZ2Pg0YVEpjdgQNZ+45OrvAfe1iPP5idCtL145c8e01QF9HRObxjPEPwYIbltB96598Cwjfg06whGeuEuts4G8KguYGwZYrwHhDQ1XMBm4LGlFf0aA873atIsiyeIrveVQECGhI1pHSGIwguX0DkGduoqWOICRPdYpLGkVAdOI6vvb9APGHfdd55jxe+CQCmRCIuLv/ZKZXrVrQG/LE10aXbFQ/dfecP2iTjuvpAhoWWuCU6Cc0Q+E6BKwbatG8A81LBjvXkd9NTd7ZgnSLKpSv8+pcm/UE5c60AB2+sUCtZu64MxyPBoVIUJL3VAsOmPsdDAPPUIvclKnPrcw3dEMjmGDQlG0Q3bLr7iWfT0FSaf7X4kYklbp8WVB/LRWPM1S2QCsWBDR5Ma3JGZNHgAm/LDG/Uj2ZAoHUNgyedPBQq3PYlDhLiV9I2R910ODwKXtZyt5LKU39rbb27UcUmU8F3zrC+NmktgxFHl1PPOro2lcQWPe85hZkDVWNGjDW6c51HYw0MFeCdTP3pt2NBph5XOQeGjWALJDiEyPFOxwWGG4A1jsxsF4VWK8BWP/EwPpVYP0GYIM2YP0DoxoYEL3SikOVFZd7VGEOTwlzuANhUQ0bUI1aUKFJ53BF3cs6bsk67B1Yi7Gh3i+VDFdKZj0G1kMJ8AlhCyRFoHMp13FqTo6/Xwym3VAH+Weh1sGT84nE1Ok6d4IrDhD+LULvEZ6cSmZLeVKj3KtQnvwK5WFBOYV7LhpIIu+0LHW+Cs1+9fXv/QrPUcbzbkUkdVADy9ZNrn+ETQ7VaA6qNNGv0Bzn5fyQBMw3X0Swgq+YpJr2OXxLNBW4bdc8RoFxjfmwyhz/B/NX39dcvflsf16ROH2zpwVCxmaHnUYvnEn2GTnYw6MGedr27mPI06vJM6rK0yvLY1zGDeDb9vdjgO/XwE+q4K3LsLzZeg3o2w8BR3goBzX4qHoSyHzK4iPcgL/tdHC8fRidbPvPVBsZRUZlRao7U+FTPaqgtlNDDx0erD0WjMtga/vLuF7iQUOJ284Ax4A/qcOvvT0ndfgNLzfcurl73sHxY6+Of1zBj706/kkD/lNv2xjV8OPq1ylGNfy44diBW79Yj4Ef1/FXD84Y1/H3GvC3bY4Dz7R/Dou/V8dffXxxfXvEDY8vbtsfB6MDv5+7pd5KTMXS9OIk+K8T/bZwS9Zdt9T0Zqr2wdnF8CU7Gp3pV61+ye4SzKepYIm6teceZ0WJbu/vGqnLWmu1sCxoQXPFBXvmiSLRJU0UFaWW1IYKBUfO2kDWKP5IxJJB4sj0Xz2zqIVV0N4onpou0z1XoK65XJmWrnYYIDRGyMO9IcZeH0oScq5eHto1ptepk5KUigV7puY7TZY6r6ZhnTXQUHZbtCxdR4e4FSZ7wLfJlxVNboEhFFowIGhO1jM35UIJwhSgjoj/cJ4E31ZMFT1wJxCk1G32oQ6XPNZ/tJC6YZzsCXqVMii/hpYrubP4PGW6Mkizs6pcGwGcgIUhqJ2oaybkLlVhvg2Cd5vd2p1PeRDYTjmsjtI1XNqI1lxcl5PBbfEXn/kPUEsDBBQAAAAIAE2WuVz/IREx+w0AAHJjAAAYAAAAeGwvd29ya3NoZWV0cy9zaGVldDIueG1svV1tc9u4Ef7eX6HqQyfny0kESLzQtdw5KefezSSXm3PS6/QbI1EWJ5KokrSd5NcXJEGKXCwotbXgGdsSuAL2wYK7DxYgdPO3L7vt6CnO8iTdz8Zk4o1H8X6ZrpL9w2z88cPdD3I8yotov4q26T6ejb/G+fhvt3+6eU6zz/kmjouRqmCfz8abojhcT6f5chPvonySHuK9urJOs11UqLfZwzQ/ZHG0qj60206p5/HpLkr247qG6+ycOtL1OlnGb9Ll4y7eF3UlWbyNCqV+vkkOeVPbl9VZ9a2y6FlBbfTpqPimvtLWRwKjvl2yzNI8XReTZbrTqpkow2nYw/klo/9bTYQpqE9JaSnaVLZbnoNyF2WfHw8/qLoPqqc+Jduk+FoBHt/eVPX/lo3WybaIs3fpShl5HW3zWF0rok+LdJtmo+zh02x8d+dVP+Pp7c0heojv4+Ljofpk8SH9TRU0H1TXp7ra25tVoixV6jzK4vVs/CO5XhBPljKVyD+S+DnvvB7lm/T5Tun+uI3ypsKq8O9Zsnqb7ON+6e/ps1LxZ9VRagzPxkX2qC/8K1Y92hRkycNGKfk2XhftpxW4+3gbL4t41avx/WOxVc3cf919SrdtDat4HT1ui1KJqkua8iel82y8Lzt7q+pMD2Ubi3i7LaGOR8tS9hfVAA/Go29purtfRlvVUUR14/H9r9XHYWnZpW+jr+lj1TH6annffUrTz2VRWa83Lo2xj0df7g/KrGXB6Kt+6UOFpBiPomWRPKm6y5v5U1oU6a4UqG7yorRgln6L95V5qs4pDXeohHVVTQ1HjMf3tUKj/N/a1Fg13Ta7Nc2JF9jrqq6246oE333dDKC7asyrIamtpSz1R7IqNrOxnHApWGtGNWp+jssxoXo1mFB14ZsaLk2RHgxpPRDexk/xVn2gUqdbpmqv+3/aa/z2Rhk9r/6W5t9Gh7wzwpaPuYKvtaqH0CZZreI92mzV5i76otRU/5N99T8vvlZDSA2GuhpGy6552faobo8i7VH+8u35uj0faS+oXM607tbaOUdFdHuTpc+jrBKsW60t0DZUmpIGRvu1bGPrWkVDJwOYwlu2VY535RNCdWfNxrkqfbql/Gb6VKqnReaNyFQXLDoFU6VzqzgdUlxMyvH6orrTSg/idZUXQPlWptW+W9JTPxhQn7CXVz+oFSFd9SVQv5Vp1e+W9NRnA+rLC/Q+qxWhXfVDoL6W8TsyvteXWWiZwADEHQ8nbgLyAR6O4CEAD7fhEY7xCBNPAPAIBA8FeIQNjxzA44vJS8ORiHmgfSSCB2BeSBuecAiP98JoQgQNA2hCBA1wzouwQdOROfrAHr7SUTp1cGWD0MP50MMdhY7xxbP5ODIUGwl/8TFHCGIm6OQaIVYJ7Ssh6BQama6dAs9ip6E4qundy6KkiKcgEKUW4h2U1IPxdtGI9YBSC1B/yCP6FwDqI0ChD2mEuuaEPqSR6aEMLCgHecUlzBkgKKFvaYS6KKFvaWR6KLkF5RD9uIgtEf4RQPbXCA3emgxBKS0ohzjJJfwPwkkCw/9wEyQM4sTKSsggLbmE4RBewjyISZxhOGEajhGL4YbIyiUMh7AVRiFILSRakOtRtIzaupQr+l7dqOqXqV+uftX4XlddYTgkifSFj/cFdc0DKMIDGKSi1OQB1MoDqGMeQBEewKBLpQgPAMFlQREewCwulQ7ygAuARGgAM+bTFILsj9nf33/89c2rOWVT1R+vve/0gIVMfUGpzSHRIVZwCdgIKWCQpVKDFIBblZLvicYK703qW6EOUoMLQEWYAYPhhBrMwGLhKzLxjxYmxsSeBlbcQ2ThErgRrsBhyKEYV/AMUNZ0BR0KpBdxq8J0qxzS9qPQ0a0Kq1t1HCUpEiU5jJKN0BAVoEj447bwNzTPvwRIZKrPjegXngESmetzhoP0B2P8y4P0PQQkTCQ3QgNOtAkXAHrzyR50S5rDHwybF7gPfYrchzCAHIXa+7BX1IfgOAT6SAjkMC74p0Pg1auarvLvvi/fKd565U2YtillEwbNikyjhSUr4juOlT4SKwX0rj4yi4YRw7eGQd9xGPSRMCigu/WNMPj/mxmZYQuLd/Ydz7B9ZIYtoHf2jRn22Y6LI9BtPnuQQFwAOjIRF4bPNibiZ0O3Lhz4jmmGj9AMASc2vkEzzgZqXVHwHVMNH6EawohEBtXoA3334z9fkdea5RM55YrjNyQfppX80AY9cExAAoSACBjCghME5Di18SbkqjO5MeY2gWcFPrh8f4FlvqBOKbAOcAnnNoGRmrAD99gRN/TkAbHCdpysCJBkhYThOTiRrCiHut8MdRXJVBTrDHZ4nwfWlEXgfOsAsndAwkgeIJsHrLsHAsdcJEC4iIRLMcEpLkLkFW1ck4Tmss7UA9c7CwJu3qKQYwSnOEbAWqwMrtQE1vR+4JhUBAipkDBTGpwmFVfVXfnxtyoEddNMhktCVgGkJaMaOCYeAUI8JCQewQni0YnHujsIHQjJgZWNMNd5f4bk/SWkI0eh1kv1ivoQXAdXhgRXY5OTDorSYsC/RIc0/+u7aB89xOUu79F9nD0lyzivL/z5DfGadR1GKZHCmEAxZNUgtMyTmeNAzJBAHMJA3AgNd9FCNZkso+1okeZF0zs/8XZmSQSnxu4xZL+BtWscp1UYklYJYZRuhEJL1/xy92oezsYfkoc428Wr8WsyCdhrarv9GZJSCS1zbeY4pcKQlEoI42AjZBsqaixdzculzXqtxWc0MMYEsm8htEy62eC+hUt4FIT4hHDWrYWo180rTWBCmDEEpyUrygY5zwWW+RmSWAkN518LUWIxNvlhzprb35uEED+SXAlDC37HPIghPMhYTZprKUq7WzeYsejEEI5DPMtWBza4L/Ol9zEyaQRI4hk+rhai/rk+zlPjUf1h37W2N0IisuJDPJujG8zDXIL5hCbzIZ7h6kKT+oQ26sMdJ1Q4klAhHmTyWqo3gNX4hQOYW9Ml3PFODo7s5CAe9L9a6iQsazqEO2ZhHGFhFa3sw6LnwbImOrhjBsURBkU8GEW0VN+LIrCs+zC4YyLEESJEPDiv0FInrWVdX+KOczocoTaEwJinpXqwCALL/lyI4yUijjAZQuAUR0udHITWTA13zFA4xlAIDN2NlI2O339890pFgWuFv52SYIMUYzDEEq65UwbDEQYD91fOucFgSlIC03AcIyXEMvPgrkkJx0gJMUKfSUq4lZQIx6REYKSEwDCnpfqzJ2Aq4WGmsmz7Fo5JisBICoHxQUvR4GgpYSUkwjEhERghgdmbuZairO80oa2sfEQ45iMC4yMUhgIt1UNlTuqElY4Ix3REYHSEwkigpXqokLgtrHREOKYjAqMjFK4xaamTsKx0RDimIwKjI9R4spObsHwElv1p1SE68uJBWAgzCFM42dRCvSAMc2ICIxrUsh4kHK8HCYlEYOOR9aPU0a9LawR2vMVEIFtMiPHYupaivEeXjLU7Yd0+Ih0TC4kRC+Nxdi0FYQFU0prskI55hMR4BNzLMtdSp1BZqYV0TC0kRi3gY/hzLXUKlZVaSMfUQmLUAj6MP9dSp1BZqYUcohaXWO6QGLcwn9sPzoJlpRbSMbWQGLWAJw3MtdQpVFZmIR0zC4kxC+NUAi0FUMHM8EJamYV0nOiQWKIDHqQw11InYdmPw3BMJiSyuYT4kExoKQgLbpaS1l0j0jHBkBjBME6NkCjBMK1lJRihY4IRYgTDOEoiRAkGXE9bhFaGETpmGKHmDqILCy7IzxupwSSiCK8V/nafF4SMbIEhgWUJNHR3gka/XcecIdRsIOx1CuQMR6l2PtEr6kNwnHsI65juez0IkB+EKD+AE8RFU5k5TQodE4SQYbAgQQhRgmCgYlZUjglCyDFUxrFFKEEQBixuhTX8JO1LgxIYKEgPQpQeGJiEFdMgO7jAKTChxGBBehCi9AButGnqQg5k8hzH0arBvH7Ks4PLPFWqFescK9UtAzBcHyzlYVNz82gXLdZL48EcXlsXcriL53huXjVo4DKPd/GQxL+Jyzo5J95QpPWDC+DyzQQlM87I0lL/xUan4V1OTYV92sNs52l5Q8H7Ir0SIL1iHKilpXxbr5T07/Qmaf/1SZmAnCETnpbh/LSMOKOekJ4hI0/LqGHQPpQUSCMxvmh6GAwT24Fk3hAZusgwYcgwMU4k01LWYTJndGgnePN50Am288q8QZJxiWPZPE0Ojuu187aMdcNUVw4o7ZpFVC0aSktEaWkoPe0cbbyLs4fqGOxctfW4r7Qdd4o7h6mXFcByer2gWHlwvQiwcuKVp7KjNakrFL8irsujUZArvmrex9svFUA1YKodhrbDwutymydyhasrHL0i5HW5BoRcCf3rcjaH9kHVCfU5x8f+v705ZMm+eH+ovmJgtImj8rsR8na8PBjH0rcl93E7gjZplnxL90W0XSiHFWedE7Of4qwon+KAF/Qp+++i7CFRDW+rs+u9KuOc1YOzflOkh1l5BnZ9sHr1clMdh18KMEIkUcTA55R65aNf6zQt8EvHU/0fD6NDdIiz++RbXB3zmncOra9O+9fnexP9tj1LfTwqq3ifVa2v0uf9h028f68QqnsoSxTA6osaZuNDmhVZlBRK6220/PzjfvXHJinaLxAYrbKoc1L/Utlhke5KV5+XZ+3vex365pCUtN079uSxZJkektIy1U1S98pd1QGjVbJeq97eF3dJlh+baovfr1Y/PR3dwu1NulrV3zKgRkfntXpZ11gXt6+7jam37ddl3P4HUEsDBBQAAAAIAE2WuVzBazoaWQcAAEYkAAAYAAAAeGwvd29ya3NoZWV0cy9zaGVldDMueG1svVptb9s2EP6+X6Hpw7ABmy1R75ntIXGWtUC7FHO7ARv2gbHoWKgkahTtJP31O5KSrHe0qZV+aOTj6e6e547kSdTil8ck1o6E5RFNl7o5M3SNpFsaRun9Uv/w/uYnX9dyjtMQxzQlS/2J5Povq28WD5R9zPeEcA0MpPlS33OeXczn+XZPEpzPaEZSGNlRlmAOP9n9PM8YwaG8KYnnyDDceYKjVFcWLtjn2KC7XbQl13R7SEjKlRFGYswh/HwfZXlp7TH8LHshww8AtYynFuK1GqnsmXbHXhJtGc3pjs+2NClC66IM5kED5yNDz7NkOgD1GIlModJYsv0clAlmHw/ZT2A7A6buojjiTxKwvlpI+++YtotiTthbGkKSdzjOCYxxfLemMWUau79b6jc3hvynz1eLDN+TDeEfMnknf0/fgaC8EcbnhdnVIowgUyJmjZHdUr80L9YWEipS48+IPOS1ay3f04cbCP0Q47y0J4W/sSh8E6WkKf2DPkCEr4AnKOGlztmhGPibAKGlgEX3e4jxDdnx6m7AtiEx2XISNizeHngMbjZPyR2NKwsh2eFDzEUQkpFSfoSYl3oquI7BJs2EjzWJY4FU17ZC9zU4cG1d+0RpstniGHgKjNrP3+XdLaHg8w1+ogdJC8xM4F0Tk+6O0o9CJKwaIn8ShOA3w2KCFjHoGgbpkahY1mZQF6h7tfw/mRIxWKVMmK5fl8m5keUE2S6YABb+ikK+X+r+zPU9p6IIMvKKCL4hZnuGYOATpKIUFURTRfIbciQx3CCjqcvAukI3bzhfLYDQXP4vqI1xlteytz3knCZFVCo9+ygMSdrrVvpM8COECX+jVP7N+ZNID1w9KDOWYOa87lDhDvW4c9zz+7MKf1YfPGdmezL5ili18mGOVwtGHzQmdZVjlYPKl0imZc1E4ltRKPUy4SrQTmQdeIBauBOTBiad5cJkWuo5iI8rYzE/iggLlatKZV5I1nXJHAKvokcj0SP7zKEjFYVXC910vFbwlVIVfF3SCN4aCT44J/MNr/aIV987e8KvbAXfr7GGmpytC5VAqXAGSjtYzXBl6jLPD0kme4Bvr5zFfCes/LPhh/BJ+x0nRJtr7xjlFIL4t7LdQO2MoC6WsbOidrqorRZq54tQuxXqDH5TNoDTHcPpnxmk2wVpt0C6XwTSK0C+2+OcaGY/RG90zp+/gL0uSqeF0vsilH6ZytdpGG1lawsFfB3lRKC+hKZwILn+SybX78IOWrCVim1IlVTl3zUtvz/6YCx6azbRcmcaL0japfAmKDEbe4Tf3uAqrdMOV4hQ48agn0lzbNM2nQk27WIDbkTndvbtSusEqy5qYhjbuifBoPZh26qiuypFdgOW2aryUsupyrw5t7/DGc1/fotT6OjFQ6u2IewIz3e5Gvj22rSKCW96tmMMpHSsGZiEDkuhcmt0FKJGg+O2N+tSy38uHbZZ0OG58Ig6QMdYlzIJHXa3Ouy+6mjv4qXWs6vDDsrqQMEgHaPtyxR0ON3qcPqqo73fl1rPrg63bHRMwzSQM8DHaJszBR9utzzcvvJodwal1rPLwyvLw7aMwfIYa4kmocPrlofXVx5umw7vK8sjQOXi4TuDdIz2SVPQ4Xerw++rDq9Nh/+V1RGUvaRjDO4so33XFGwE3eII+orDb7MRfGVxmEa109qDkwWNNoQT8IGMTnWUomZ1tNvrUit4Ph/OqfMwXDQbWE7RWD+JzAkoUW2hY9Txe+1+8qR1epdSiMznU1I+YzoImb43SMloezrZ0wp66TYQWT2dvWe2M2HV2vgiE3VRE8No73b+dy2XyO4sOKWoseB47Va21BpfcNYQBjymx9qa5rwspJuqT7EtB83sgSp64b7tCqn2y2mms92zllrWAO7G2wpUrSGDK+pYNzbdi0w02vVMUWde36plt+eK1121vM9ZtQbqzKvVmT2UgbGOZ8IMvNgrnSIBqkFwGtum57QTUGmdElCIhvqszYe330OWfoT95YeC7sDxbDS4PVhjTcR0hFujL37Qmem2is3WbdDdaumvTloV3Q1RE8DYtioOhc7K2rx23JUQdi/PRnPQP6RcvE2tSU+H1/KlXFuOLtaoT26KG/rvMC9EA9M3Yl2I3bNvxLsQy0ffSHAh6rpnxBLn7dLP/ARxtchYlPJbtYZre4LF9x6nk/X7zll7JdmQiug9ZdEnmnIcr6GVIqx2VnkkjIu1qj1QfDnwFrP7CBzH8kDekPOBqRyqH5xm8ujxjnLIr7zcyzN+oeCYpm/Cw7/lImSILXxHKe8fOn2pcMi0DGeEbaJPRL5rztVJvDxXl18wFCerZvGzOsTWNWHilknvIX1I3+9JegsIodRYBADlG/qlnlHGGY44RB3j7cfLNPxrH/HqowgtZLj2+cEW8rCmiWhCc/EBQdog9DqLxCJinJg8SbY0i0RmZFIVKzeSAC2MdjtgO+U3EctPrirxbRj+ejzNntWChqH6dAKqo3YNl8qiElfXdWfws/oEaPU/UEsDBBQAAAAIAE2WuVyXdhOWUggAAEktAAAYAAAAeGwvd29ya3NoZWV0cy9zaGVldDQueG1svVpbc9u2En4/v4LlQyc5SSUC4E2upI4lV6eZSepMnLYz58x5oEXI4oQkWBCy4/z6AgRI8YoqjagXW1wsF/t9uwAWIOY/fU5i4xHTPCLpwgQTyzRwuiVhlD4szN8+bn7wTSNnQRoGMUnxwnzGufnT8l/zJ0I/5XuMmcENpPnC3DOWXU2n+XaPkyCfkAynvGVHaBIw/kgfpnlGcRAWLyXxFFqWO02CKDWlhSt6ig2y20VbfEO2hwSnTBqhOA4Ydz/fR1leWvscnmQvpMETh1r6U3PxRrZU9oDdsZdEW0pysmOTLUmUa12Us+msgfMzhf/MEnA41MdIRAqWxpLtKSiTgH46ZD9w2xln6j6KI/ZcADaX88L+e2rsophh+o6EPMi7IM4xb2PB/ZrEhBr04X5hbjb8DWttm9PlPAse8B1mv2XFm+wjec8FC5PRAxbNU2V1OQ8jHijhskHxbmFeg6s18oVKofF7hJ/y2m8j35OnDff8EAd56Uch/A+NwrdRipvSD+SJO/gLp4lnsOq+aPgv5nyWAho97LmLb/GOVW9zaHc4xluGw4bF2wOLeTd3z8k9iSsLId4Fh5gJJwpCSvkj93lhpoLqmNskmehjjeNYIOVDaSuU3/AeXNs0vhCS3G2DmPMELKv2/GvxflsqGH0bPJNDwYxqFcPunpBPQiTsWiKCBQ5BcRaIIarcMI2ASx+xdGcDvbpAvmvkfxZREY1V1ITp+u8yPpsioXi8FRmciD+ikO0Xpj9xfc+pWOJB+QULyrnP9gTyhi88GqVIcU0kz2/xI475C4U3dRm3LtFNG50v55zSvPgryI2DLK8FcHvIGUmUVzJC+ygMcdrbbdFnEnzmbvL/UVr8z9lzESBOtTSDBDPn7Q6q7mBPd457/v6Q6g/1wXMmtgy+JFbOfQELlnNKngxa6MqOZQyqvor4+kcXpENStQy2lHW86kDjiEVX1yIAnAOeqvzlnIsfl8Dz5tNH4Z9SWlVKUyVZ1yVT7nblO7yg71A64VdurZRk1kDjN9GspZJrFUopV9rxYRpUxq/z/JBkxfL23QpYYD7dCTtWZaWBF10QL+rgRX14Zy286KvwQj1e+4J47Q5euwevb7XwSiUXDOBdw+n3QUbyH38PUsZnfIMvQNmBSdl3a/g3AXcuSIDTIcDpIwC0CHD0BLzZ/Pzhw+2HF2ukJ8J7bb3Uc+HquHAmYoVqTZffxocrgcEGetjvm6fxDaHz++YVviG35lsrMVeVSjWN1iUN732N99A+s+u+9KKxBvio5XylVDlflzScn2mcn52T+UavRfU31K2LzsvZSvQm0Ps10mBrHJY6arQyqp97HTXY/nfHDuGz8WuQYGNqvKeEEe7G//vTHGiLBVkMnhc46AJHbeDgq4C7FfCMPxM6BPXU2uI8OGEXp93GCb8Kp6dwvt8HOTbAAEpdRQHts09cK4C6QJ02UPRVQP0yoG/SMNoWRwU8k2+iHAvg13yTPRTiU8uL8yC3u8jbxZPSsY/VE08DFyB/AIC2PECTseY+7Up8Zt6ugVyHbVBfMBy/vWmotI67BiVqLODObIBK3Qo+RnUB1Grc8M5tL+JHrSOsuqiJQbeOj4JBLso2OpaMpchuwGrXjEpLrJMDReOLxhCfLb7/80DYjx+jB0wTHMqn17J4fBekvJ4U54XGHaaP0Rbnqqq8Aejfa/sktRfgVWtrgl6W9Sh0gecMpI2u+hiF8pnk161RrkSNisrtlAdSy7VHptwGJ1HO1XSUA2Aja2AfAHWl1xicQ6uT5qWomebtykRpjZ7m9uw0zmd6zmfIGaJcW/eNQTnopHkpaqZ5u0hSWqOnueueRDlX01LuAAd5k4HJBWpL0DFYh91Eh32J3q7YlNboie6dluiePtFd2xmcW7QnbGNQjrqJjvoS3W1Tji6T6DN4EuVcTT+fe97g5KItw8fg3O6mud2X5l6bc/syaT7zT+Pc13LuOUNVC9TuG8Zg3OlmudOX5Z3Tc+cyWc55O61StP6mVATW4NSi2zW54+zUoG5XA8EIgZabE8dqnO61FunVUava1ZSi4WPkkwK9hqfE0CvD5UAI/OH1V7ufGm17DS+9p4Cznq2oB9pBm3W2og1R80OVtkY//0HhNbI6M0wpan5tbO+LlNa3zjDlZw6ZZGvudbQNYmNNclYm3kbUjM5r6+Vr7YcQu0xOGzlwYvenJrpwQb5C6htsM0faG55Sa2iBbDAJyyNoMDRlIl0BPN7ZPtIWgWMkL+qbNVtF9uqoVQ3AUvStsybSp6RXT0l7KFi6Mm7EYF3sDFTFSn0UbVSKvtuOVaV1jJUSOd+6wr2qwqVf5F6dFtOZ49lwcA1EuqplxKhqj2PhuWOqig+3Mbl1YlppHWNaFzUB6GoHdO5yb1q71pNg+lDcAcu5/iEVYTJr0uM9veKovC33rtZen9y/Wvt9csBfAL1vQO9qBftbZleidOhpQehKTHN9Lc6VGFR9LdwD9Vn4CH05z2iUsls5mIw9DsSN1+PlwofOdcNKcoerAOwJjb4QPnziNR9jmAri1cVATJlY4I9yaUZdnXwX0IeI9xsXVxItMQlRGdniNyOZ+nVPGA+7etgX9xyLBwB8ACyIXAgtUcDsCGH9TcfLmofMyIIM07voi7wCltcuIxaXONXVMqAeq1t8piFM3NKi95A8pR/3OL3lGHkO0ohDLD6qLcyMUEaDiHG/42D76ToN/9hHrLpQaoQ0qF3B3PJArEkipqdcXKJMG4zeZJEoE60jl0fJlmSRCE2RoZKVTUGAEUa7Hec7ZZuI5seuKvFtGP78eBxWyzkJQ3l9lKdH7Tf/KS1KcfW73hl/rG5BL/8CUEsDBBQAAAAIAE2WuVwlTgDbshUAAHOVAAAYAAAAeGwvd29ya3NoZWV0cy9zaGVldDUueG1svd3rd9pGwsfx989fwfrs6Umb2mZGF8BNsqfoiq49cdrds++IkWNOMHgBJ23/+kdCEhd9JeE2Nm9a58MwGmlGA/NDgjf/+v1+1vmSLFfTxfztmbjonnWS+c1iMp1/env26wf7vH/WWa3H88l4tpgnb8/+SFZn/3r3f2++LpafV3dJsu6kFcxXb8/u1uuHq8vL1c1dcj9eXSweknn6yO1ieT9ep/9cfrpcPSyT8WTzpPvZpex29cv78XR+ltdwtXxKHYvb2+lNYi5uHu+T+TqvZJnMxuu0+au76cOqrO33yZPqmyzHX9NdLduz10Qzf2Rbn1BR3/30ZrlYLW7XFzeL+6Jp3MvB5eBgP39fyr9Xk9DSXf0yzXpKlpXd3zxlL+/Hy8+PD+dp3Q/pkfo4nU3Xf2x2+Ozdm039vyw7t9PZOlmGi0naybfj2SpJH1uPPxqL2WLZWX76+PbMttNndA317PLdm4fxp+Q6Wf/6sHnm+sPilxTenq2Xj0n28GVR67s3k2naUVmTO8vk9u3Zz+Iq7nWzIpsSv02Tr6u9vzuru8VXO23542y8KtuxQWc5nQTTeXKo7xdf0wa66WFKR3Cx+c0D/03S41nCcvrpLm1ikNyut89Od+06mSU362RyUGP8uJ6lm7n+4/7jYratYZLcjh9n66wRmwNS+pe0zW/P5tmhnqV1Lh6ybRjJbJbt6VnnJis7Sjegq2edPxeL++ub8Sw9TKLb3ft3tHl6VbMDGoz/WDxuDkzxaHbWfVwsPmeU1dvNOnCzG9kRfhhnZ2jRirPOONUvSd6aoejuQ/7czup/m07JHtx2Wlb1/t9l99ib8ZR2d3Es0uPw7+lkfff2rH+h9wZ6v6dtj1PaLW6SHfS02cpF6n+m3VFKcbAX+YEOki/JLC2/ac++pfXn+3d5sPl3b9KDutr8Nzu8s/HDaq8Hbx5X68V90a68i+6mk0kyr93sZpv349/TVqb/n843/1+t/8i6SE9b/TWvR5cX/c2gf95tKsU2Zd02Re/5N6gVG1TrNihfYA97xQb12g3K599gv9hgv26DL7CDg2J7g7rtKf3n32B2FucDtftNo6awp21TV9LhX2y29gRJJ4DNvl7mp2b+8jlej9+9WS6+dpab0yrffH4W77af/inFRTZzVJqSFy+njPwIoXnYyXTfs81lU286devpuEufvEr5yzvR7725/JK1sSg03Ba6LMSAmBALYkMciFtIbysjiAfxIQEkhESQeF8u0y7Z9ots6RehPX+/yLwh/YN+6Vf6ZVto2y8QE2JBbIgDcSX6BeJBfEgACSERJJZN/aK09Yt6IZ+7X5Rq04YQA2JCLIgNcSAuZATxID4kgISQCBIrTZ2gnnjSUvOGDA5OjkHl5NgW2vYLxIRYEBviQFwV/VLXxEH3sIkeKvJRUQAJIREkVpu6Sms7X/rP3E/aphXpImb/IIhKPxWFxKbQPC10m777Hm+r+m78sFj99Nt4vk7f5XfSNcfD4zq3fxgyres2q1WTMn3VutAOqzaKquWuwyFWIcquw1HGgbgaOrx2X2Wlw5+0r+F4nu5qtmjvXCfLL+n6dlXssCmUYodFT9Uqo8lHmwJICIkgsdY0dvRTjh09P1TqwfFUKmOnKKT9nbHTKw6lqmhSrRxLo6h47/0NxCpkbwpHGQfi6hg5tXuqVkbOk/a0ZeSo5anS02W3OnLQpgASQiJIrDeNnN4pR06vbuqtTA3DvFCv33A8h9rroV4csYHWUyUnl6KGvVcTiJVLv7sbIijjQNwehkivbnLRK0Ok942TizooJxc5wBBBmwJICIkgca9piPRPOUT6eBcHMSAmxMqlL3b9izIOxIWM+nVTQGUV5vW/cQrQywEtuqIrK8PZR6MCSAiJIHG/qYMHp+zgwcEcsF5mR+vdyH7182r1eP+wicD/MRy8/e5/j4v1Tx+mn5LlfTLJ//Vj/r9OZxSdu/Gv11bH+o9l/PphFEcdI77+cN15Vb6iTKbL5Gb9feV5v1mRGb/v/PLz9fX5B/d9/Kvjlk98GE8nnfWiM1vcjGcd431cPPf7Tc/sZqdt87ejEWJCLIgNcSDuAKNxUDfbVN5ee4NvnG16g+3rbxezDdoUQEJIBIkHTYMxC4VONxo3EdTuiP6d4VgOOf+/nfC6YyxW64OHg3JAHT5aHVdlQ5p67aA9oqsWXaSofVGdMIyyrr131ySLZJMcklvQQRDU5TQpu5X1hFeW+tvzZPauPX+r1NcwMtmsgBSSIlJ8QIfDsy0GfP7hKQ6O6zcOTyPd6nQzGpsHaU0ZDFXR3o2VoaoVfSZF9ga3OlQF3s6TLJJNckiuqMksBedQ2VWqQ1V84yQ66JcL4C6Wg2xVQApJESkWjbmoaA1Gn32kym9+Xf+wWKfjbjQ/dxePq6Rj/Z7cPGbPqyn0WzKfLJadX8ar1fmHu+Xi8dNdw1iVR1YTovs6HdBlX+npggKzqcRygmQV1N+fTVHKIbmC8W1Z6nA21apDVH7jbCq628xC5Qs92xWQQlJEikVjSCxaU+JnH6TMiEkGySRZBe2vMFjKIbmkUUGVOam6iixL/f2MajsXi57a1WV14eyzaQEpJEWkWDRm0qItlBaDi2f/IK0m8ZVdfJLGVJpkkiySTXJIrmA2Xd/UfnUgqO2T2hMGQq81nvXZtIAUkiJSLBoTb3HSyFvU5MCyW/1sQhwJgg9ezrTeD4evb0J9Lb5/fUA9+cNhkX7lceXI42rl39rr6quq6H/3af3TWyF/PCyp/9j9vlwnSKU6wxuCITzJItkkh+QKJvEkj+STAlJIikixaIzMRVtm/iKf5yOVHZIMkkmySDbJIbmkUUkHc46ofiC2K7XrJ4bTpJAUkWLRGFCLkybUoiailqL6wdiu1K7fQCbJItkkh+QKJs+iJnqWovq5ljiSPR/MGHp3u2jh+0HmzKSQFJFi0Zg1i5OGzaJfl6dVP5AoSzUdwmGv/eOI8vn78yzIItkkh+QKhtaiJrWWAmvcI7H14dAQLUODCTUpJEWkWDSm1OKkMbUYfHPyEiSr1dWx9Wxe6Onr2bxZfaWhz86HoszIzutXswMGLiCLZJMckiuYWYua0FoKrGaPpNaHg1G2DEYm1KSQFJFi0ZhSy5Om1LJbdwgr68NhUaqvNo+Ncv13Xvd+UCLqNUkWySY5JFcyNi5LHc5T1U/XylJPm6fKTENyaLAFASkkRaT4gA6HxkkTYlkElQdHEFcj5oX6TUcwW3SkU8vroSzfACjaQOkjIDDKivZmD5JFskkOyZWMa2VdXCuqH3nJI3Ht4RBRm2cPtiAghaSIFMvGaFaeNJqVCOSGJINkkiySTXJILmkk62LO6icEnjwScx527Tbgqunamiteay55rbnmteai18ZAU5400JRKzXJFVpcru1K73gaZJItkkxySK5lxyrqMU1aXK/JIxnnY23rLXM8okxSSIlIsG6NMeeIoU6p1B7F67V1ZqukgXv8avsqjwF+Wi9vpuvPd+P7hp06wWJUJodG/Ghr9bXiUnU14t6Dy3QLIItkkh+RKhqOyLhyV1cvx5JFw9HAElUs3WfdawBCUFJIiUiwbQ1B50hBUanVzbnXFW5Z62pzbcgyNsqb9Nwwgi2STHJIrmTEW1D94RySrn6WUpZ42SsrPcrsXenWMMKskhaSIFMvGrFKe9PpeyaCSZJBMkkWySQ7JJY0K6h+e/1gt5KUG3af0bK8cu6Lar8w2SSEpIsWyMduUbdnmS2TQsi7elFguMN4kmSSLZJMckisZb5I8kk8KSCEpIsWyMZWUJ00lZU0qKWX1gyp5LJXc3oLRtJZjLEmySDbJIbmSsSTJI/mkgBSSIlIsG9NEedI0UR6miXmXKt1qlx4N96S6DXBq35Mx3CNZJJvkkFzJcI/kkXxSQApJESmWjZmc0pbJvcRsqhTB1EGnVhdfRaFB83nafz2U20tua0/Voo792IVkkWySQ3IVJnMkj+STAlJIikix0hioKScN1JS6wEmR1V7NSw1kQ6+ObOv9+/j9q7T7L4eiv/sgvnvR1YTW6yuiN1C7GuZ1o9z+3rRMskg2ySG5CiM2kkfySQEpJEWkWGlMxpTWZOwl7hpmOEYySCbJItkkh+SSRiSP5JMCUkiKSLHSmGkpbZmWIp495VDyvGWgHJyC1ZRjV2rXTSCTZJFskkNylZqbvGvu8q65zbvmPu+aG71r7vSuudW7MYxSWsOolzh3kHMMSQbJJFkkm+SQXNKI5JF8UkAKSREpVhrjHaUt3nmRNyVazRJPUasnz7bUrp9AJski2SSH5CqMakgeyScFpJAUkWKlMWJR2iIW9dnfZBQhxeF6oBrDlaW0g1J69Q1DbalKLGLWlqq++bDKUvpBXZV8wK7fYqUup7ZU9XZuV2HOQ/JIPikghaSIFCuNCY3SevXZ8wf8St1FXSrWFH/loi7RVX8QbbeL/cXatG1tdXf0mMdqG/6zd57uwHm62fPhP7dXJNSHFFZRW+M1Deamlu2yuHb5ZB9rUvjzf151f0yruqxcVvv9NtnWe90L0etrPaHKvl4d6U+q/1Xe1t4PaU3fN21J9NOVwYUqupsNab3q2cKcjOSRfFJACkkRKVYaczKlNSd7gbOl7jo3FWu1v3KdW3a2dC/625vWBtqgq1/wnPlrdWr7dYq+Ouhhfj5SYX7a9NPTpr9/2qiqKlUV7bOK6hqjJHNTzfa8EUptNfaxVpVnTr9pPKfL3HQ89xSZD2dRPXOeVP+rvLXtZ45U+wN5MdDz7ahK9cxhHEnySD4pIIWkiBQrjXGk0hpHvsCZU3dRXvWgDZW/clFefuZsPwxUFb3me3/+Yo3aXo1CS9eAavW0OVJfftoM0tNmsH/aaHIgqvdXWUVdLa81g/1zRgrWYR9rT3nCDBpPmF5voFzI4pWm+gLgPK3+V3lT208YpTvQ1AutfFUbVE8Yhr0kj+STAlJIikix0hj2qq0XYL7AYldFZDkkGSSTZJFskkNySSOSR/JJASkkRaRYbUxq1bakVlGffRZTRU1QpFbXurtSu24CmSSLZJMckqsyZCV5JJ8UkEJSRIrVxpBVPXXIqjJkJRkkk2SRbJJDckkjkkfySQEpJEWkWG0MWdW2kPVFvqqx7trB6v0CQxUX9xkkk2SRbJJDclWmrCSP5JMCUkiKSLHamLKqJ/9KzTxbHBx8zKhWL/4vS/UPSlXePhi7Uruuq62+EvlYT6reZvUOyVVrvpOTiS3JJwWkkBSRYrUxsVVbE1v1BTo4DyUH7V+Lpz7pGyqbLugcWuVb34ab1Mrq9z52fFK7rGPtOnJ3nM0NOyRXZXpM8kg+KSCFpIgUH9DhmGm9mfglxkyeWG5+T2HvhMQ37T7pyymbB02/7QrgsvK9qxLqm1X9AhzrWLN217nUbdjmhh2SqzJZJnkknxSQQlJEitXGZFltvfbvJYZMj6ez1KrRsvqk76psHjGi2xIOG2Xt+7NMXbO6sjpijqXKoi2Utrldh+SqTFdJHsknBaSQFJFitTFdVdvS1RcZMf3as7mar6pP+vrLliHT+ulEWfv+LFPbruo0YR1r13A7Vus2bHPDDslVmSuSPJJPCkghKSLFamOuqLblii8yZgZ1s0w1WFSf9B2VLUNGeX20iHq8iHa8iH68SO94ke3raM1tt+Wx2J8Taw+iWh3fx7LP3Ydr3KzNzTokV2UKSPJIPikghaSIFKuNKaB26hRQYwpIMkgmySLZJIfkkkYkj+STAlJIikix1pgCaqf+pRyt5h5orbp+Kgo1Xod7dP10fvTN8tESonu8iDheRDleRD1e5PgOCf14kd7xIv3Wa5s13lJe15/V66qtY/05VLqtFwVwuw7J1ZjkkjySTwpIISkixVpjkqudOsnVmOSSDJJJskg2ySG5pBHJI/mkgBSSIlKsNSa5Wuvlsr1n/xREq7tcVqsGhBquZzVIJski2SSH5GoMckkeyScFpJAUkWKtMcjVTn25rMbLZUkGySRZJJvkkFzSiOSRfFJACkkRKdYaw1et9W7ol+gUxHxDkkEySRbJJjkklzQieSSfFJBCUkSKtcZ0U2u9/fglOoV3IJMMkkmySDbJIbmkEckj+aSAFJIiUqw15oda65WpL9EpyKqGJINkkiySTXJILmlE8kg+KSCFpIgUa40RndZ6AeRLdAp/L4dkkEySRbJJDskljUgeyScFpJAUkWKtMQPTWq+te4lOQYQxJBkkk2SRbJJDckkjkkfySQEpJEWkWGtMbvRTJzc6kxuSQTJJFskmOSSXNCJ5JJ8UkEJSRIr1xuRGb73T9iU6BYvdIckgmSSLZJMckksakTySTwpIISkixXrjGl8/9Rpf5xqfZJBMkkWySQ7JJY1IHsknBaSQFJFivXGNr5/61411/nQFySCZJItkkxySSxqRPJJPCkghKSLFeuOKXj/1il7nip5kkEySRbJJDskljUgeyScFpJAUkWK9cUWvn3pFr3NFTzJIJski2SSH5JJGJI/kkwJSSIpIsd64otdPvaLXuaInGSSTZJFskkNySSOSR/JJASkkRaRYb1zR66de0etc0ZMMkkmySDbJIbmkEckj+aSAFJIiUqw3ruj1U6/oda7oSQbJJFkkm+SQXNKI5JF8UkAKSREp1htX9PqpV/Q6V/Qkg2SSLJJNckguaUTySD4pIIWkiBTrjSv63qlX9D2u6EkGySRZJJvkkFzSiOSRfFJACkkRKe5xRX+5ukuStTlej9+9uU+WnxIjmc1W6cF8nK83v7y1x51lcpv95MWVs/kxu6rLK0fWuXrlqDU+Uq+8Ov95cOUM6lykFYnamoR+lf3wUN1zelfZz+TUtVa5yr6Ruu6R9Dmy9jlK+hyl9jmKdpV9mUnd3qeHS609Xmpam1pbm5Y+om0eudz1ybs3D8vpfB3nd2h27pLxZDr/tNqeJJ+W00mQnhE1cp1sT5u7xXL652K+Hs+MZL5Oltnpkj/yJVmus1903XleTdqKh/GnJBwvP03T7c6S27Sy7kX6Rn6Zn4+bv9eLh+Kvj4t1erIW/8hamSyzf2hC9IXoSkWXsptdvHq7WKzrHyq2mLb68aHzMH5IltfTP5N0NKajN21gUlzSeTtdf1j8ezpZ320e2vyznCPSh7Mq4uVm65PF1/mHu2Qep/uYzhzLabqL4+wwvj2bjeeTtNKH9AB8nI1vPv88n/z7brpOtgdxshzf7uaom7QnjMV99mt56XGeL+YHh9R8mGZfL9jdHcyd3CweplnfbIZCfljszRHoTKa3t+kBn6/t6XK129SW48nE+rKbDd+9WUwm7qaCdHzs/Z3+mdeY8/bv/Y1tZuHhMhl/3p3jZ5378fxxPNuwUeK7Nx+XnzvTSX4bYFqiHCf349+zX0VTsu8MuJ/Os2NdzCZ5venfXxfLz5t55d3/A1BLAwQUAAAACABNlrlcQBzXfEAUAAAVlQAAGAAAAHhsL3dvcmtzaGVldHMvc2hlZXQ2LnhtbL1dbXPbuBH+3l+h6kOn56Yx8UICdG13zpLS60yuublcejP9pliUrYkkqhTtvPz6LikSJBcLikplfLiLtVotgAdLcB8sXq7//mWzHj0n2X6Vbm/G7HUwHiXb+3Sx2j7cjD/89uavejza5/PtYr5Ot8nN+GuyH//99g/Xn9Ps0/4xSfIRGNjub8aPeb67urzc3z8mm/n+dbpLtvDNMs028xw+Zg+X+12WzBfljzbrSx4E0eVmvtqODxausiE20uVydZ9M0/unTbLND0ayZD3Pofr7x9VuX1v7shhkb5HNP0NT6/q0qjg9fGPsMWnZ26zus3SfLvPX9+mmqprdyvgy7rTzS8a/zxILoanPq6KneG1scz+klZt59ulp91ewvQOkPq7Wq/xr2eDx7XVp/5dstFyt8yT7OV1AJy/n630C3+Xzj5N0nWaj7OHjzfjNG/hFMJHjy9vr3fwheZ/kH3blL/Pf0l9AUP8Qvr+szN5eL1bQU0WdR1myvBn/yK5mjJU2SpV/r5LP+9bfo/1j+vkN1P1pPd/XBkvhP7LV4u1qm3Slv6afoYo/AVDgwzfjPHuqvvhPAojWgmz18AiVfJssc/NraNz7ZJ3c58miY/HdU76GYt5/3XxM18bCIlnOn9Z5UYkSklr+DHW+GW8LsNdgM90VZUyS9bpo6nh0X+j+EwqI5Hj0LU037+/nawCKBUHr87/Kn2NpAenb+df0qQSm+rZ47j6m6adCVNgNxkVnbJPRl/c76NZCMPpa/clxhcJ4PJrf56tnsF08zB/TPE83hUL5kOdFD2bpt2Rbdk8JTtFxu1K5MlVbaNrYfD5UaLT/b9XVlJl2mW1LUxaEblvlt8avisa3/64d6E3p8+CSVW9BT/2+WuSPN2P9OtIqNN0IXvNTUvgEoCpfc/jiG7hLLaqcIT04wtvkOVnDD8rqtGVg/YD/Zafw22vo9H35/6L71/PdvuVh9097aH5Vq4MLPa4Wi2RLFluWuZl/gWrCv6tt+e8+/1q6EDjDwUxUPk7nLU9U5XGiPBadvzxZlSep8vT5ywur8kKiPMFLVzt04+FlMM/nt9dZ+nmUlYqHUg89bgoqXIeHr0OrBgft2rsOlbRqZTUNWlyUVjxh++Lhh3/h13uQP9/yUF1fPhd1rLTuGq3LSjSxRVNbNOuILqGJpp28p50sfK3O3VBe1YR3GqpRQ2mtuKs1IbWioKs1pbVYV2tGa3Gj1QFN9IEWn905RFU30ambQJg1WsY5bNHUFs06ok47pWfnkFVNZKehEjW01gpLrW2pxeC9ibyjVovaasg3bFNLeDvNTb3u5MUEil/SRczqnysLudAzcmFVE91BLkTI1VpxCxIRWMhVaizoQc42hZALLyZhhZxdxKwuwh6QIs/IRaTPRQi5iPA5bQEXWS7XBeXH/f5psytpzB/vOKvhQdDaZSFoo4tJVP2WSwvayDhlu0GKHsmUZ7QV6ad4+FeEn/LQglsN8FPbFAJTXUxUDaZVxEw5/VR7Rk6TfopeiXea8NPQfsL1gLHRNoWQ0xcTXSFnFzHTzrEx9oxcTPmcQvW9iwmf0yEGLh7gcrYlBFx8MYkr4KwSZrHT44pCvQJXFGj7nGI4Kg2oF7Llc0atz+kIWwg8FlyAqfqdbLmdMWD7HeuL6V8EP0Z6Hsf4McL17NGuVuv1PcIWxo8Bfqx5bjF+zO1/vrkC46T/4cDXqLX9j9uDntHrdcBKiXEngBwA5PUrwx74TDGEB/YSh5dAkKQOCkfUjOAOtYy1yIORSQc47z/8/OepvAIUf6ifUCWtIc6YCW2E+iiHPD/triL4arLjAEYtUy0wbNnUyHSLZ9ey2G5ZLyU4P2lkVYjNg07XY0rQUmtaa8umhGzWlXVb2xfGc/kCnk7G8QrH8YwK5Imx9rRIXjgieaI0PJhALM/qYJ4RwzEZzStHNM98h/OMjOcVjucZFdBHVnDF7ID+u1A/GvMzCPpZHfWz2B6g3GE/8x33MzLwVzjwZ1TkbzvUhA0J/QljGEEI/pnu8Vt3+M98x/+MJAAaEwBGMQBuO6lNAfqctA4UhOWlR2kCA57ADFGwajJjDVVot4vRYwP3zR44yR40jn45xR6I6I3b9OF7JleI4hDsHAgGrwlGZMd3PKCGZC0csPsmHZwkHRqHfJwiHcQcC7dZx3fBfpSXcOAl5ufKHlG4m5hw70kMkphoHFtxkphYIwq3ecl3QWyXhiEG5mIGJGWNJ9xNXHgfcXmJcI4L0otxOGfU+qlzrfb/OrFdGkZYAMLC/Vo0FSGc2HeyhZPZFo1zjpxMtxDjs51v+S6Mj6ZkuASMpTu1wN1ZGe47LcPJvIy20p1UYoZw4yGJGcIWBjAEAEPnDJAphfBR38kZTrI6jYNfTrE6YqA9T36GKA0jDKyOR+6BNnJ7qG8Gx0kGF+PgmA9MyfDTKJwT4qMUjgOF46onXGgo3JAozTer4ySri/HUOidZHTH42qzuu2A/yvs48D6uewZfN+/jvnkfJ3lfbBEQivdRGFO5H2uxyVFWx4HV8ZrVWfCRlC52eK3wTekESelizC0ERemkjag4jdKZ6QaEOVEcwlwApRM1pbMrMhMkpYtDB+y+KZ0gKV2Mg2HhyCNZsA9JJBHGMKhA2EQrkWSB6iZswjdhEyRhi3GsKyjCRiE4JJNEGMMIAh8TvAdBNyETvjNJgiRkMY5kxTBCJk4jZM4n/yghE0DIhHDGukKQ463rwfdN0QRJ0WIc/gqKohHBmTiNosUu1I9SNAEUTdQUjVhVIyQx3oqWWhd236xNUKxNBDg4Ew7WZsE+hLYRxjCoQNtE2DNauHmb8M3bBMXbRIBDLzEsGyds3kYAeJSVCWBlInKPBW5WJnyzMkGxMhFYS34pVkbgN2ShHGEL4weUSyg3fhTjcj/UvhmXoBiXCKzYlWJcgsB0SB6NMIYxBT4lDJ8iQHXzKdHHp7h6AQQpPiUCPOstKD5FrDIWFJ+yEDzKpwTwKRG7GamIncOi9M2fJMWfRIADeUnxJ4KRytP4k4v112bcS54k8CcZuDGWJH9yTbZI3/xJ1lymfxVUS80shall7VVQRta7CopFV4BsvQxKRdxGrbZjL4OSfQTp/MugZEU0eLNl6M7IeAsNWzatZe1lUEaP2FLiee+MrCJ83n3kMPNrqTWttWVTQjbryrqt9b6DhmIMIsA0TZJJHfstJ23GQGyiOb6LpthGI91pMelO2Ujfwb+kg3/MuSQV/BNxghwS/BPGMIIQ/MvQHSdId/AvfQf/kgz+GU4pSDJpYwN4UtKGib90P0v0ucaQWX1wlD9I4A/SbLwhxnNqrZ5gjvU40jenkCSnYJiTSYpTUI49hFQQxjCoQCqk6nFs91I86ZtCSJJCMMzKJEUhCMc+KWfzfzi2PhreAQmRusex9UmO7TvPI2uOcCS8a9SaV3xNDtrhXS3rX+QuIbzTZpU7j23Uajt2eBf2EY/zh3dhYId3RtYK7wjZtJa1wzujZ4d3YW9sf/7wLmRUeMdw37fUmtbasikhm3Vl3db6zmOEVB5DMGufL5XHEPaCiPA8K8+I4vBmYH4BhVU/j+0VESEnR5iIHmFC38mPkEp+CIZJREglP4ioOjwp+2HSF8WxExj5owmQUADyZqU8sYo4pFIggmkH9L4JTShJ6HE4btQ60BMeL0+CXtJ5+ilRHMYdKE/o+PnM1KKDOXdMlYbeDxMIiVHG2rZotNqDjPVoT4zaoDHGJDgoZ7cLxKAXhw6YQChmPMTAh9Q4wx2RTOibOYUR5ezcQj4inJ0YZqJTfJ3JC3q0Zxr3g1087gdgSmHNlGLi9IeI9H/HfGHomymFinrLciuoUMQDQAw56pQHQHLXS9YuDaMOVCpsLYnDoCvS9x257tA3uQo16ft4btyooXcsBl2f4vtu0O3SMOjAncKaO9lbXU092CDQfVOnMCY93QpsYsLTiQEntjydODjGtoUhjQHS2JlnNAYG+XHkO8cTBaQf4xlYo9Y/htdqvbMshC18YkxwMYkCJ6SmlEFeGvWejabPzvEiRjopDgGNWof02Iiyk4bjJuuFQbeLw6AzAJ2534LGQseRhSMKjPq45kugzik/FngRjFHrH49rtYHjsVlWiEG3S8OgA9OM3HucTD06ni4c57xFvrc9RYJydbx39M6o9UceRm2YqztBt0vDoAPJjMy2J5tjGgtqEOq+OWZEckyB472I5Jg26idRzOFhN1E87gbgnJFZdqfsAYemnY6wO/JNOyOKdgqBJ7ciincS60uik4in+zS2OrPmnD6PgHVGYc84T5JO4ZjcirwfgFfTuf7p85aamUKtZe3pcyPrnT4P+RUga6bPAxZYXN0YsufPoz5GeP7586hiTpyoSS9NOv98d6SJ+W5mHfTYUms6y5ZNCdmsK+u21jc/icglZwLzE6N2JJg+6eiG78+4EdXBQwZQnMhQHCIgp/YBCeGYlFW+OY4i17EJHJEbtf4wxai9cCKUqA4+CxJokgrMC9SKY4wFNahbfK9zU9Q+ISHxwgtlb+0hu+XYyQ9/PrFffrgwp6Zx3DVHdxspIFOKuZ8YU9vOEyMdM7vKd+JOkYk7iWd2FZW4U3Zso4ZsQCKMYVCBLClDluzIRbk3ICnfOThF5uAkpkaKysHZiy/USSk4s0AFZ1qnRHEYY+BGyiTgCIzJ/JuUDsf1zY0UuaBQ4oBD2WsAyTHl2A6k08cURxSPw3iigrijgD2pmj0RiVJjoTvv6GBPyjd7UuS6RYnnz43akU1LtV7/4cpH1y0q4EaqZ9OSKcZe3qV8EyFFrluUONhU1LpF4nDqIZuWCFsYwAgAdG9aUpF7hPZ+tje5wFBah3uTCwwJDxx0vPfx872LA75Vz/jrXmCofOfAFLnAUFpxNbnAkHDBIXuU1NHlgUoDgmZ5IOGD7j1KyjdhVMPWArbUDD+uZe3JDCPrncyI4iuAsZ7MkJSTudcC6l7ydri36LwHyTfkzawGrGW8OQd3ohtaZvAwenZXa88r/zS58g+/te80sfKPkE0J2Uy7V/5p3wRCkwQixOkYTREI6gIAikBgVkYYw1cAAIHQ3MziEbcAuBmE9s0gNMkgQszB9MBVfNqmEMQlCkf5gQZ+oHuOjNPC+X7SvsmAJslAiDmYpsgAAeCQzUWELQwgxO1aOiMkLd0e6DtG12SMHuK3k6ZidE0AOCRGJ4xhACFG13WMbhcz002M3nqnunZ3at9huybD9hAzVE2F7cSmWj0kbieMYVAhbtdRa2TEoLoDd+07cNdk4B5i6qipwJ04qVcPCdwJYxhBCNy1uZqHQLDnbh7vl/OQgbt1f5+mAnfrBqeJtuP2vskps2QWZ4yJ4jDGxR0+5nQdZm/90U1s326YY8Zb+w73NZkfwhcF3mkqP2TPTumT8kNmKyB+UKZEcRj3GHA35+sQJ5JpMgHUutuwe6OS7wRQTCaA8KWKd0at7e92hnwSB6c4vDNVTxSHb14KLiZx0FohgXE3Johrq3ync2IynRPheDWm0jn2oBIfS+f8+u7Dv6YffkEzsPqSv2pOMcCA1wRJOwFnADgzA5SNN5m2iRyxReybdcU1femfTmipGZJZy9rTCUbWO52g+RUgazAnIjJjx55OiPtY1fmXRsT12QdETXrZyfknBGJJLo3A7+CWWtNXtmxKyGZdWbe1vrlETK6Wsi5LNWr9q2KNWl/US9jCjztQibh17Sf229A9uvqmDTG518ZaSWPUjhx8XOv13wx4dOdMDLQhjtxzraYYO+iNfdOGmNwmY12dGg/bJhOftE2Gs4t6ziTGINe8wDmhHQOziA2zsDN9MblTxnWFauybbMR62EtJEy8lTbyU9JCXUhzCS0n9YKZZbNC0+53URwte4J0UO99JQMT9vpTKAom3knVDVkuvuYeNEE4p4QwJUZt792u8xF1sAbljg2g0tWWDmJNpFPvvDj26JQNUittDmXtepjFC3FwV9O7BeIEj98oSibeUdftXQG7DILKqRrP/GtFayx3Zg0oBpZn8J7JeTVnUZbbe78IMBl6G2dJrPYrUdZi1kLve54eT4AJ2VSD6Qw/fb+xTg5bnSzGDKswVzV2Pd5RwQgmnjZC1B6iOJmpfb+ysz968KgoVvDMk289UrSccvfvPN12yHN/86b9Paf63t+n9fD2a/Pru8PHVwQvEq6lk8F/8ahpFr6YK/o05/KdfFY6EFjKBpKHdTMkg4ng//KSpoOx9lI81o2hp8SiHvcXNGkOUi/aF7y/holUcLNoXtxph++ZWI9RtF7U1Z42QctG+4JqzlxitDkFoJwS1Li2vtZiI2022hVMjlK75n0Fe+pdp4ych50wrwk/qkqhRvz9YPhuIqFR/R+WiG8f7ws0XLbh/svKlSvU3P4cK7g8mXqpUbzNch3Iv949Jkk/n+fz2epNkD8kkWa/3oP+0BWt63JKOsmRZjCJXs/IhtOTh1ewQaeBvpLgqDjQlvgnBWEhai/RVsWuI+EbDbzT5m1heFdNpVN2C4KokNMXg0TTz9nqXrbb5u8MbcvSYzBer7cPeQPuQrRZvAUdC8j4xYD+m2epbus3n60myzZOsAXn0nGT56t7+Aqqxmz8kP8+zhxUUvE6WYC0ofTk79OPhQ57uoNfHo49pDn1c/llUMskKhZAxDaMBFxHnQXGm4TJNc/qrqjyo9NNutJvvkuz96lsCLBpGVaheUrHY5Sr/Lf19tcgfy6LKj7VjwefCxLusLH2Rft7+9phs30ELwd2yFTRwXqB4M96lWZ7NVznUej2///TjdvH74ypPDCaLbL5s3Poe+mGSbjbwe0B5m247gE53q+JKoqBBspHcp7tV0TOlKxxQeVMCMFqslktAe5u/WWX7pigjfrdYzJ6bJ+j2Ol0sfioNgHe0/oY/DxYPYvN3uzD4+DnNPpVP0e3/AFBLAwQUAAAACABNlrlcWQtNMTYPAACLZgAAGAAAAHhsL3dvcmtzaGVldHMvc2hlZXQ3LnhtbL1dbXPbNhL+fr9Cpw+dxL1aJF74otq+iUXyejPppdOk7c19Yyza5kQSVYq2k/z6W76BJLAQpJscPqSVl4td4NkFyQcLkld//7zdzJ6z8pAXu+u5e+nMZ9nurljnu4fr+W8fkh+C+exQpbt1uil22fX8S3aY//3mL1cvRfnp8Jhl1QwM7A7X88eq2i8Xi8PdY7ZND5fFPtvBkfui3KYV/Fk+LA77MkvXTaPtZkEcx1ts03w3by0sy1NsFPf3+V0WFXdP22xXtUbKbJNW0P3DY74/9NY+r0+yty7TFxhq359RF6P2iLDnMsXeNr8ri0NxX13eFduua+oow0U4GefnkvxvllwOQ33O60iR3tj27pRRbtPy09P+B7C9B6Q+5pu8+tIMeH5z1dj/pZzd55sqK38u1hDk+3RzyOBYlX5cFZuinJUPH6/nSeK9eROwZL64udqnD9n7rPpt37SsPhS/gKBvCMcXndmbq3UOkar7PCuz++v5G3eZeH6t0mj8nmcvh9Hv2eGxeEmg60+b9NDba4T/KPP123yXTaW/Fi/Qw58AJ0jh63lVPnUH/pMBoL2gzB8eoY9vs/tKtIaxvc822V2VrScW3z1VG3Dz/sv2Y7ERFtbZffq0qepONIj08mfo8/V8V2O9AZvFvvaxyjYbGCml89ldrfxP8OCx+exrUWzf36UbAMp1nNHf/2ray9Ia0rfpl+KpQaY7Ws+7j0XxqRbVdp06hM04aoj3aT1Hu27MZylIn7O2O4nHx4K27ezwZxOV+qCIWm16/LuPT9JkFAS8AwOA+CNfV4/X8+DSC3wuUIKg/JTVkEOf2SWBA18hGr2ow7pocX6bPWcbaND0ZiwD6+3oFhPnN1cA6aH5bw3uJt0fRgG8ezpUxbbrVRuhx3y9znao28bnNv0M3YT/57vm/4fqSxMggLo1w2pkvq070rkjiDuPXELifHOXtHNJEZcu+fb+eOePYf68b+/P6/x5iD/SjG/RJk57ck+r9OaqLF5mZaPYem1zTDhq8pcr/lvdPpvbLip9UgYG4619vakzrJ4WEHpofQD58w313avFc93DTuu212oToRatehEToqgXcSGKVVEyES1gzGLg5NjA24n7TcdO0LETaexEHTtRx07UsauihGjHTi2PnXY98SZjp9LYcS021Vr1Wv5Ei0+1ol4rGGkRHk61YkyL+t5UK5G0qhL07uFqkophfvfnU1H9+Hu6q+CqNfsVANk9ZbNXrfi7dLv/8UP87w+v3hwOT9t9c7f211tO/9Yedy4dp/31ulFtf39+3f7/anFf90qxTaDV59eip5PwMsvhZR1A4QRGXwrvoCVSWxVFqihWRclENBk7tzx23vaEO6Jztxyd6YGUx31Dt9HaNVrSmTDqdchIhzhSEqtK0+Rc8YuId2kkN05MjWN+IWVtZ4k5eO55lvH3ugEMJ8zbXsQm+Etzf9Vr8SP49zreWEc6ZceqkoS/dxF5HWpy48TUOPY0+BOG4+9bxt9X89/H8j+QMm/ln5D/PpL/rnTZiFUlCX//IvJ7/KXGialx7Ovw93D8A8v4B2r+B1j+BxK2q+CE/A+w/JdOZLGqJOEfXERBj7/UODE1jgMN/lSDf2gZ/1DN/xDNf2nmr8IT8j/E8l+61YlVJQn/8CIKe/ylxompcRzq8Nec/13HcgBqh/IMELLpFJAm/0qojeeAcynfSwq18TSQbhJjREkKg+tcgKkePikOxubgQBMJzURwjzK7/0cgXHUquCjjC+R7etH02GQQSuPZIE8GREkOgwthcDvs5OlgbA4ONGFwdRPCNtF0CTIhCDohuBwHcsJFQSiNpwOX70oRLTkQBAJB+kDIN6bG9uBBGwldKGzzXpciU4KKKTEsb1CR/8P6BhWpOCxwUGN2UwC1B0LB1NQcHGgw1SFqm2q6HfPjE/ofSGfj25HaALIqixBZLGSBBqX3v/38KuZLAOu1uK2U1wxOMpLwZTIYIaPFoCnItjmti5BalyNpq3LY6SAnuVQzlg4tRz6lcCTXVVkylU1Bsk083Z66TVY9AnnVY6Q24KbKIkQW9zLP0c5XdrFye3Lv+p7MshKjiWRignLq6aa6bWbp+krG3QrZeG24l40Xh3vZeHXYRxLK1yeUbSbndlzIcycJFcgJNagNEKiyCJHFiCyZyqYQ2CZTboiEPBQhH8MiL+cINaa/SY+E0vj+RllQc42MygVK5QpOpSyqGQ2AC+2yjmb6Edu8inSMxBvFYiQbxSKUl3aEGj0SC6E0DpiyuIZoSbEgQKtIT6vkekpibA8edLeRTLPERmwzK+Kq04K42LQI5VUe4iLTQr6jJy4yLZg8LRAtORRArYirLhB3oTC1Bw+aUAS6SWG9iIdwK4Jyq1Be7yEYt6JyJDBupax4IlpyJIBbkZ5b0VCOhJFbER23GpUxppGwTa0IQq3IQK3GkZCXfcjAto5EQuVKyNonoiVHAggZ6dHjTI6EkZERHSNzHV0obHMywpBJwdBJIS/8CLVjCw5CaTIp5JUfREsOBYNQMN1KqLE9eDhzLZTYJm4EIW6Eo5NCXvohKpdDIoEVJOWVUERJDgSHQHBl+bKLg7EkSXQ1SVdDoIltbkiQqiRBy5KhJ8cBrUsSORBYZZIoN0/G0iTxIBKeKGkppydjeZLo6pOc6E5PtnkkQUqUBK1Rhr4cDKxIyeRYYFVKNRbGMiXxIRZ9oVKmfYmxPXjQTQtfUyIgtikuQaqVBC1XhvJ2CYLVK5VpgRUsiXLRNlYsSQCh6GuWXDlDGYuWRFe1dLWnKNtUmyCFS4JXLpWLNla6VOgdVrtUrtlGpk2AaZNQvc52kTASbaIj2rplLmqbZ1Okfilk0zkhr3kItWN3T0JpPCeYUq9B1KRQUCDatCfaioHEaABcaGIR6go21DbTpgjTpsh+VIpsSKXIjlRqLEdS4MzU1RRsjM3BwXkFG2qbMVOEMdOBMQ+IDvR4QJSIxZsB0UGmQxS4LyU6RE3NwcGZiFrfTKsWEG+FbJyjFMlRiuSokcNS4LBUV1Q0NgcHZyJqm8DSjvp5fHS6ZY400tuR2gCyKosQWSxkurNjU1R0wyWgJaqKhMo35CeZScBMMpghzNPcilPb/JSqRcRbIRunLhepe0phURTA5JBFwtA4FKosmcqmINkmjxQrLDJHfkqCIoVFRBYhspgaC4uUXUAURokoQ5sYbSQTG3UWai/ztikhRSghVcuNKzrwvwFPtYwYI7KE6kuL1DbvolhpkTnywycUKS0isgiRxYgsofrSIrXNdyjCd6hablxRjNwopxWM3Ch31EZyQ4Hc0FB3XTVyG6rjNpppxmxTG4ZQGzZQm+ExEHQfpoQ5w3iMjDmiJGHOgMUwR4O5sTk4OBNz2wyGIbswmcpqVgzbcqlgjm25VDA3chwGHIfpOI6xOTg4E3PbHIchHIchHIeRU/IcKwEqmBsrgAxYENOxIGNzcHAm5rZZEEPqfwzZWsmwYp+COVbsUzA38iQGPInpeJKxOTg4E3Prz/khhT7GkDzHqnoK5lhVT8HcWNRjDDBnOsyNNT2mq+npMLdNmRhCmRhCmZhKmRDMB5pzBHNj/Y5xwJzrMDfW75iufqfD3DYDY0j5TsjGeY7V6hTMe550JDAxoiRj7gHmng5zU3NwcCbmtikZQ3Z7MmS3J/NPyXP/lDw3VuSYD5j7OsyNBTmmK8jpMLdNC1nPz8aYq7KVkNFjmAen5LmqJGMeAOaBDnNTc3BwJua2eShDtriyEMlzbD+rgjm2n1XB3MhDGfBQpuOhxubg4DzMuW0eypGtrIhsJWTH8lwoHctzREl+KB94KNfxUGNzcHAm5rZ5KEcqaRyppHFsg6qCObZBVcHcyEM58FCu46HG5uDgTMxt81BOkDxXZSshO5rnaqUMwdxYjePAQ7mOhxqbg4MzMbfNQzlSjeNINY7TU/KcnpLnqpKMOfBQBKgOc1NzcHAm5rZ5KO+rYOOHAJkjv09opDaEQZVFiCzuZccfAqThEtB6rUP6pGcAwUaC2ZhCbP21NirFvEVkK34K7eQD7RwARqpwU9kUANsckPeUKpjkGJNzbFAbMFFlESKLubEKx9kFIKxLL2MBTtN8CqxtoscRoscRoseRx/o48lgfR2pvXF9747ZJFg/EeMeJxOVEChAIAgSCAIEgEMPFM+FV7HrfxxT+ce+1dHLvuZbvcOWRHaNhcK19esp1dI/tcNuki6sE6xaRrXiIAB4igKuyZCqbvhPLNuHxev4w3UIgPyU/UhMQILIIkcW9zNc/myxSDv71WUZcuBOV08xoKwFbCdiCcx78620xQrWPS3q2+Y6ncptbRLbykJ2DHrJzEJElU9l0vLa5htfduvvTLQXy4+8jtQECVRYhshiRJVPZFALbt/6eept/O5KNYZF3s3sqGzi2wannrPJDah7GF4gj79WJET35HXVAGbxhb7Sy28doAXxon8pxdBt/PNvMwWNIyFTZSsjGs5Qhs1SVJVPZdLy2b+M9jl4IQnmWcuRCoMoiRBb3Mv2FwHO+j0VuEddHLgAmG3CJ+D4RNhjl+hO/9RdQ9rfhk82jriNDPKgNEKuyCJHFQqZ/SyRf4Fsia7gvlZdOmuwlWns19Jea5+I921TC87FrkCvvlBypDdCrsgiRxUKmvQP2+NHMNrVPPH4sqxejN3Zvs/KheX39ASB52jWgzkfi7hsDbJk0Zy1Z7rJl/b4j7Ii3jNrXkitHgmX9ghDkCAVrFLVGwRpFrVGwRlFrHKxx1BoHaxy15jnL+s4UO0KWSbveqRzhy6idWcoR8OPhfvxl1C4NLYYI3Fzty3xXvWsnyOwxS+uPhhxEYj8oH2wQkveZSPXHosy/Frsq3ayyXZWVo1fBP2dlld+pBxbt5yd+TsuHHBxvmq86OJf1BwjKdha1f1TF/rp+ufvHooIZ1vx8bD4UUStw1w1c1yHUI8SpC5n3RVHhhxbicxdP+9k+3Wfl+/xr1rxn8zD6mkPzGYzuxfVu96f4DMJ8Vpt4Vzbe18XL7sNjtnsHI4TJXuYwwOYLJtfzfVFWZZpX0OtNevfpzW79x2NeiS9rzNZlOvqGxR3EYVVs60+hAMq7YjcBNNrn9cNczoDkILkr9nkdmWaet6gkDQCzdX5/D2jvqiQvD4MrIX63XsfPw/nr5qpYr9vvb0B2jH7Dz9ZiKxa/x87gT/EdmZv/AlBLAwQUAAAACABNlrlc32QHkKYaAAApgwAAFAAAAHhsL3NoYXJlZFN0cmluZ3MueG1stT3ZkttGku/7FbWakIMKNdmH3ZIsqT0BkmiJo+Zhgmyv7NjYAIkiiWlcxtES/TRP8wEbG+EPmj/xl2xmHQB4tJyF1jgUlprNSmRV5X3h7V8/hwG752nmx9HVk/PO2RPGo2Xs+dH66sl8dt1+9YRluRt5bhBH/OrJlmdP/vrDf7zNspzB0ii7erLJ8+T16Wm23PDQzTpxwiP4zSpOQzeHH9P1aZak3PWyDed5GJxenJ29OA1dP3rClnER5VdPLr+FxxaR/2vBe/KT7y4vnvzwNvN/eCse8zpL3CU8HeBkPL3nT364tUYz653NejeD0aBn3bDZdGDdOG9P8x/enuK6L6ydpb4bsEnqL2GX7Bs3TN6waz9yoyV+Pow9HpDgOHnhbdkpQIrzeBkTFyVxlMUp6buTjZtx0jcHkecv3RwukfR1O8t9uB3uMSd305yGTMoTN4Uliy3p+7dulLtrznqBHwFuARPHnpHW9gE3ph9IWvHLzpL/pmEoyZ703S7cBGyEs/uLzhlrs/fcDfLNlt3GARAs5ykTl8XOmcdXbhHQznQ47ts3rDcezezRjEa8VpYVYYI3TTtKKwiAgZFQ/SgpgCFZNyg4u2Lc83N3EfAO+8iDIP4EH91xJGe3yOM2XNiyCJBEOiZkzcZFDk8hLekF3I1OWCZXtlFEbNmKc4aSxCsQs1EMWOc8jYB8Qje9KxIGz3CrI2DZJv4UddhULM5j+Bnun4byQEMeg/y79/kns1WhGwF5hzzKGS5+zVJ+zyM4WkAOcN2egFiNPEA3AXzb+SaNi/UGJF6WZ6yVuL6H6AYxckZvOn52wkBwpsDCIJJg+dqHo1mBMPSAtLzU/ZSdMM/P8tRfFOLayi8lQZExt4LEfi1iYIWMR5mf+/d+DuciFuBRIfSsSJI4lZ/tPIG5OTs/O3t6+ury6enLs6dwETxyUz8GohlEy6DweAa7XMYgKANfSBsW4bP45yQAeY7A8w2HrwTil9nGT3CTIB9Xfq4E7U2cCXDqFAvgmT/+8X/MixGUvD72yc83mi4y2mUOq9tw8DaXnMYe1wXwhxZVdeKTSLjwW5CrfB2nPmwe9CAcL3wbThZ+9FIf7hgEIqtxJQ3fUir2kCBoApin7QQOFveYpPES0ISzkgQFN6c3Ifmkw2zg7zqyiDvo2FytAGJDKEJx0VA+uEbaxcRRvgm2mjtONAf4gqCQZCrKrXMKMARivCxCFENwznAP2YYlMVJ1LFheEiJsDWjsgJlZf4dbhoJbOmyeIdGnEliNhfFZoUJ1VdoCoE6AUwBJ2gk9YJQIAndm8/5HZjnOfDiZDcYjmrRnUlovQUJnIKClCGfbuBDiu8N2ZXclGIWY3JPjCMtd3sF30TaDD+uMh+BAwAB358GWtlum9jTog/IazD4a2EwjN+SmhtMvR5fSNP0vSj3Rvq00uaHhBUgByXFcaoEuo+H14HIapn2wQsCES4tlDrKAtORGcxvNVPbXPA3B6LsCtbFoZ/pRUjqWv80ApmTltb/ssPIZsCxJfbiwvYW3UjPWhDZYbqFfhMxdIq+bEeBsMLSB42wD41+YvUzIJtY6v/qbG7FOp8POL676fPmMBIh31h32HezQgi3SSLj+7I/cpTkB13GRtj1/Dfy5hTUnTDz44uziBZHh4GnteaLs05YQchlti44vDIkAhAJQ6AmIwzXKkjjdIjWEfobmMxgmfoQSBegAJDLYHTTzz47SOAjE5Z+iME8LPxc/GaFoCXphWi+mNThg7HgxzaibAcfJRaBk/dgzw+HGBWdYY+BH7I9//i8L6p/lJfhlHCYBz2mseh2jbBd31wCrXhBnvA32eKPV4E4Jm/IOFLY2VaQbIXXiCWzKF1ZwBooXVCbo2Dx1o2zFaWQ9i3NY3i9SKf3MLn1Xs7FVGocsQfoGM2cR39OOF8THYGY7yqBx5t2/2b2Zw1ofrJ+tD++dmTWiYfPB/c2922CQhCHDZGCLgImCiBlboG1pkYBARUBkHs3YNSgOfwFWeS5sUQ5/aE+Xy51lynlEXVIs/g4SoekqyffEVYxN7XfzG2s2nn40vxk73/jLDEzsMPRzcNLVzYAILqUXCc444jWBJ+zH6tKbYWJFUQGITAUz0W4asUCrHbUA+7SRHIe78TOlNs08D6mNpvC5my43zFrDbaKQgiv6zJcFlX41WjU2QOolXm9pKg/HowHc8mD0jt0OgDFp9rEw+/0QNbkPegltkFsfHp8J2/ac9V1asKrrtz9xfgfGPzhVwkkWtF3FB0sR/hXQukC0aHc+5SE62AdwSIt/+oo7EqaAEmzIAwZozLYJ0htgciXlGuhIEwEpHl1pM4Mn9+J2s5OTrDGUuu0aOe1H4FYUrj1QUyC/TIA5qH6LjFkextk5s+/REjDhfKfIEpCdoBfmEf+s/rkPdspdYaaZQfbXkb+C6wGMBuA9ciGiikg5JTQgjE2mY1SebGiNwP8dgj+otap1bRM9wxnamXEE9gOPlkAkwlHQYcVWjuYCTeqXoQBxV3AolYwbp2s38n+TJAwuJGoktvdgOk1O3K2UlxOMxpBVLpBSChgCP/zrdwNFL604f8kcd8WBEk2umbHrwcga9QYgaE1DEDquVHPWrkGBtYTRdSTshtFGAzMuKdAY2A9FNIihCRDSqpS47f2ajFa5rtzRUIaeh0WQ+2C+EyW3jAZf7eMBly7hNURGA25hfKeRvWz2YP08PN55AicLd/0Unp4D7a5Rn9BwmGAgDQNTq8qh0BFzMFyRBlz0jxTLKtjNUXVEzhExBX8gZbz0NmnoguJ1fREal8lLhqCBZfeAyZghjQlrBtIgaotEJzjSYxn1x1yGDpUinZg4v1rBo6cPZIqhzBqG0i8yZyghPgEuCMUte0qzoooVSFHmJkngc5HfkBHFMlwNoMvLV3FglSThwuREArl3QfmCIKbdE2Mz2xqCnrmxpgNw5loqiHvC5k6fyO8bNwV8y6W0VT+7oE/MllgBeMuGa/q+B9a+6XP45wZLXEHuZuuczTYyxk8KaU3tjhu4IrliKtCyIqRHwAodABOP22pZ7uOOh+cicyi/9j8hEYcSbwx+ckwCgY+XsRVIL6DnPZ4UTMhilCAonDKe4yPPO2eSSTLMURDpfTyxp9YM/ST7vyb2yKkRPSuiAOwQkZTzqHIOOBb5cgKIRnAawkWVfu7UJbpxVsXwmDDTYn2Jfr6wVTkyi0CyGVIY9CfafhlIGZAepiTJl5soDuL1FsOzyzvT5al7zwNl81rLJZxh7KnAlgwyn4vLJ8YT+drVwHoYMPTljswhqShDDYhVYKKntQK5nKFOA1Y4v2DGccUYw4oP8RPmz1DQy+8BQxnBJ/GVBv4AY30T5G+QuTBSI2Ik4E5swL7H9GHehptx2xjbZJ/i9A7DJ4G/3uTEwCWreznXti2eOxzc2M5sPLLZxPoofuP03tv9+Q0tKXF++VTZV0AxjWyg8zMJ4dpPQXUfhJtAJafxvUtLU+zCUoE7sFmMFl/AlsDWy3TYj5uE/TSQy7OvAOTl18AE6yKOQmEtEf6vTolot1we36FOEHiG8RkN7/uvBe+VhId5gAWyGPKLESaV5yLSBtJdNUuAsAsJ6jAco1MNIlcf+L+Rw8nKQQwLuDP+KwpHvFnand3Ck5RUF7JmExeBV4NCFR+lrJgNhqjHZ++ntvN+fNMHTV4z3PfCdODKoDjTyhXE2nrNU6JQrSXbQiyZyOMIQGzg95s48DTDfi1Ql8SzIIB6ScRqtp9iw1t6LH5GQL8nE0B3fn1tT50TNpnaw8F8qFNQs8E7ezq0+2xmTd/ZxAh4mYOfuekatF8VBTkWm2mRvaKH4e4lEBrAfjj9jyYnawkRpjbhoCwT0T8iqR86oQCDq4JXYaIusjhd6Oo8WS2nnc66EXHG/BWY0lUZn7BFRVGbBE5zqqtiCMBDONYtVSIqqiN4O1F7RzQjMCPjhL8RcYbU93QZ2jJHISNwJfqN6hFoSdxlDz1HbDflSQCrd560X00I1lOEyXXu31MrQqt974YVarsvYwH/tn0fPIG1upcXz/6d+9bxUsUXGBwGqxOg4jPL2LRwcTDeTE1VS2g0qz/E2JIBPzKmK9dqpq1jT28HPZsmhXQsvcbSUqb142WBP9Jr00VoXfvsEsi0rDsh1mMs4lSWqWgHssLLMOrq72TfGp4FadmQcwy3ZVoZpLKiluj23qOEW4tTFr0NsVeYoyAttTLV9khZ3lpISQw6M1eynBzTE98/knnQysY0uywKMQ1JulZuW4qR3bpbEpxRES7wFFaVy6DAUnexexoPqF8qrPEMDkKz+2Q6nowd64a2ERCI2WvGsKNgxbHUBo5BK9aMoZfgicvecJZtozjJfFQ88T2Ic68jOmzwAGXXjXJQUM/qKmQ0bX3+iVr7NxjN7OkIbxUuGM3owWgyx/qdAvEQgnu3PBIUjjZqmptATWnxGKzH3KQjgiPXMigiEFuHuUkI9QBAiY0JENW7sXLFpe42b4ggbRoXSBz3vluvkf/P7vesVVWPFgusV64MBlEz+sywkH7PGsUtSdULT+gWHhy6Ebs1FzpftJKN2FSyJzgE3XkfHAKaPP5CDXrJMuNblIT2T2b59L2OF2VEqbL+I80upAYWchnYrT2a28yZD4fWlFZRwNDU1Qu7H1nPmtnvxsTFx7ynMvW63CAXC+dCtanQ+OW8U1YdCH41t46+kA9uitRFhz3e5pJEr3Ahrfi2w8BQa2qhfdepOMzQPgNr1x71x1M2sRynPXs/Hc/fvWe9sYPK47AxiwTzsnaxZhs5cA9Jq1502GPsxQd8M9Lal9i99YC5CTRtQC3KdJygyJhJkUFa/arDmliqDP570Fo19JOqJJyimyiO2plIhRjlQB2spaFVD/xcLxV4zqpM13OG2Sv8S2ahnjOZQHoukz3GafSPzLq5GYOwHIxHxjlJEM7vBiOw/fkqTvf6C43S8eQkPDGlloHp2pTgagd/w11aqFk9URnt47K3k97vJ1L/JvgBdNnmBibcvesHqsNTd3c+B2Wdg5AQ+dgUZQW13D7gn82qCIhkcz2ej/r2lPWn1k/AQ8siTWWwNVr5a90ZANupWY4mZQkGjFgmHdGmWWFFviyt9jQWIkiEyUY8ZRVbbFDsoNvIaZFM3XO+UyqxZa3aebDui5fEM1Hq/fGVD2UGuA5KNLzUcr5UV78/cMBC7c5nVvfGVuKjEdEbcOW1kkp95AsiLx42kzZeSKymQn/7NRvxtWx/PQrJl/2DWHUJXreH/q4X80z2Uss+b0nOC01LZac3LtActxf2BN/N+ztmyLovXrGWIo9norCs+/IlMKq65mcsLCkg22PUE3TpOLoOD8VW4fvd87PvTuF/l+SGv549sqYDsFvGwwn8wxmPBMtWBs2PArZTdb8TvWHZ6W5ssjU0t0xop6Mu+5u/nJ+9wbpLfWt4lTQ2G7qfmVO1/QtIWqggE0jQi5S7d2004am1Q1joAjqVew9AxOy5+jrRQVJp9ipcL1oK03vJA6sgpno1ry73AMHmAjhQn9je+XIfkXUcewyIHvZM3Mw3bhJnb/bPXnzIrsqKgv2xD6IiTDBp6zeexkeUdodJIPXz11D10zN2LsHrfLErawHcaHsIscO6Mag3/hlXZ8y6BWsOjFxdVYbYABOnMfyuphuR7xRruwEyt1CUK7ABuBovIGpzMPQDcuQUJUdNXFA5fmr3xqPe4GYg7FEd1tkdRHB0AAAtyCuA3LBb6gKZWzGLm5QjCchPqWoihT+6EoU44gYzYv3yjooDGY5zcUSvJBzVIs7zODQshjc2msG3MTe0QSml+8YyzopQvs4Jy8HVwd5T9HROWICOzgkD3yhOQOO46O9QazmOGubmjpymILs7mPUtml2HzIYEkalmWhkyx8EGJbfi6AtEqMP0A0QhSMYyTRoujvSoSY+lSK5W9PLszZGhGJoOhL0QIow9QpHrsX1iXy49q1CRe5WVL9lxw0Tk0XFHIvUDN/YplrJJBbuI/P/YFJDRl+c4HUXmqMmpU7HmRzllxSRSZvgYkXtpmomdctkmvRNtZH0uNFstVzvlBlOQVCOtiMNcuyEOBEpVZxUtnlHvhlDjA3pyfEDDpHHbSfgSm9kOAV7Dj4/b8AQ7XH8W7VqG7Yt/2m8rdRrOhKCNHDEAeEG8TB1K2qUQg+PR3SxqpJpsSsz9TBMgGVApTHg54kUIw/IHCw0e2XYHqmwnUU8UCYJkJ4Eb6dCp/GSGFSNwywbIOsWiLdiZmCxT5LkTbcfNVbF2Jlp6qKIEfMNYUKKAorq2mYtkv/I9OCNfNq3CoaLLhjnQikhERMPGwvwJCBfx3d3jJDNepnqLqQ3jCzQ/a0HkGJzHHvg0/rIIihCspNxV86qkPdBLudoMcaaXqgllN0BMaANXG9x9KMbGJilvi+belckARXGF9aELgoYMTmxVW+uaDmwAHahmssg+ZGoAuUn3dUVjaKQ4YhRo6rFTUDCf/RCuS+ZWhcFPppoKaNmje+NG6wJVvez7pUKqyQvErwQ342ESCENHSY96Irih5CjpqjYqQWC7S1WnGJsHc6Cgd1DP3DsQviAehPCEP7vYSf9GDODDqAluVMh+GmyUa/vp6GoHRkaFA2c3TzB6JGVmk2sSKytdrVVOmceK40BsmH4vR7CDmw8CwSn4v1Z9vNCY3D2j55uw0I8KU77pcaTE4LAVo+EMErtXn7lEPBdp7au22+qkUe4dWBFrvCIDCVjNQwHYj4V2cEpg8JpJ5C9PWKEmRuGUXbkuNWivl8NgseBlE6co0fcTpCOcR5gW66aXf/AA4+M5gNDoeGqGSi+OUw8EoqAulLGavIzrHsEYEAbBzuQJKVjHK9iklFc8WqLX25f9XygC1dQFoolbSWgpE0QbiZQYRvxcKy49ZV0/hs0G21zQfu1XM3watXhTGDerLe7rsHSV2Ll9iJ1KdpYaEUd9YJM9qkM5uKIp5GkMqi3aGxVCjkODtLjE3IC2R2ghk4cO+ivt8kH4zffatDzl6KQd2srBLZUbjo8nMhyaNBjeZuy87VG//qWnGsxEEo+9ID92OiSfSvt9XIhJOntDlwzs+n/9roqdDQZDVLTF2cFAnj0DFrz9OCgM/JQKnC/AEaPHYqosGFNAgAqNOQipwPT5chadENcjjpP6gFctz/OVXmxghFuik1UOhEKHVvrPopNDaJ+6MUKHqroTnWOjmoQ1WnfRtQ6l3YBlG9kSGpNy5NM+TnrO0yPRmjvW9HGIEWZRCRwPLDNp6O84TXTJaNrScGR4GL3IoY1VDvf0UV9HtcXurFyDGLGBCHkHfkoqK/HWIodX2nV4A0bPnieeq900HRSjKum2ShnSfEJtMM6wmVeOjD+Ys4bs3eTKlfLXRqKo2gFQYj9GmjjRQ74SoyFfX6AEg1Clmn5Wi5UbWAPC/S2SJNg26wMq70dlr5UiKn1K2iXLoLu6R2Xpu2VkDntJytDurR+rFwfgMGx+7xvMoFPVsPqS6aWwis65G5qtK7FutqoMY5utVwPspNqzQJrCXzu+jToHI/I6/bNJeR/85V0bfDEj6H8Cs8xNNgIu9V66N7tvZ2YgTdAeGzqYGQCg7vL4sEGzOgIsIMobDCsUs5xlWqPRIauBgyZLy2GFmVyrDA00j78zdNh3S8zBNeOBSY4GLFCUNQ/BG4SiMIcszx6CowQtTjLPGsncMjwPR/StmYO5M2CjFpcDzV/THNdYv6SacjEUZXkhrDeK0tVGiktlyFqyq6/PAx8sPywAyE6OjOuYqXEdJ8wCFvGp1WD03NqRUZDYv1mKW5Fud1RrGrHyqFdkeRyisK2/K0XAFm/LWOCbOdQLVra7r1eRL+zowGODIoSjF+/eyarqDlnxsfvGFll1Yfwimb+YnY9RfrFBXQO9pMHR84hpAmVQG2B8T7fip71G697zENSpmAeWuBHxfXC9DQ+RoUzW2L131Fj+Gt9KswUNgJUjODfop3GvO9HF6MSyJx8vCQdLoY2lhHNoGOhQrbtYTsijTI052ztlky6YkhJe0xaJ3kgx49NwYTnORb3zr3y/ghrO3UI/IeBtD8QcW/hx5oc+KsDJB2It2EA5i6wFIPAsnrNLtpKPKRJixR2Q7OOhOD3moZR3d6Q8QJIT0HCD8YKa3djlBdYqYVA7enb4wng98Ijxmn1+USfpudSyvg9YvpaA7koqD7LlAb1XLc7E7pm+dQiKZmug6xivgcKXqGFaI2sBTLvc5jG4sJzaCnOUW19oEnvO1Mkksg/OhG978QYtDsuUbR/kQxog9dgu1mrmUvwty1YnMStQvKikwU66pjupoXLqPqOiX43VVbOKWk8PlD/rXr4yrdDVsykyNAJFFJqGEc5vH4x6gwnsajC6tZ3Z4B2+cUP2NhLZzY+WfrJXYcNW4M+LqQB4WGhFifo5MZE5w5GLuhSdWNO/11mvKnZr+37OJgPiNXQDUTgvzUQ15kMWZeKb6Tp0QBIp3CAGM/TbTdjEZMaHI6t5aFIh59RuVdX7TnT26K3bD42Er0ajVVEzvHQjefmFDveiHD9eTR8XbY16VnejUd/YgzbFtxfQyb0vx1rTezlFfKk26RibKPCjkONwGKIo/9Ks3pZLn8Fr/FqjveoOxXdVV1M1vFvwef0tjsS08OGsha/+kGOTk2kxt7IQ3v6MKpQYdSmraokEsjuAmGjQ/unY4a8ycdiYYI7Pt9edhOpBBzPqHzXT2EjbU9m2h28JncTylaOs1StfRkpvkNt7V+5rNkMLRXdSyLgABgNEY1X15tHElzOLBMO2F1uZWRGkX705tcboJ9jVs6kGVYl4u3NsKksmX6yqZXj5fmXVbjLb8CN9I7m70O0bWdWtgoOURR9KfTSM6mLDZSe63wSRPWhSFybPTvuJ6EPL47AtOlVVl4mY2/ylVpN6mFUjTHxptXo3Is0LeeB9hWaup0H6nYqY6RSMD/bHagatw1p//P5PdsUOdLeeMEts3NRTf3cLcWhrvzy72moyuxrHTxu9aa4+crrRwpdNn7g3P5q1RGeoBtVonHT5sr1eOf7ZjAL3xkk/Ht7+OOmbrzNOWkS7c2pN7sPzpHWAml0fzpM+zbL8h/8HUEsDBBQAAAAIAE2WuVyFmjSa7gAAAM4CAAALAAAAX3JlbHMvLnJlbHOtksFOwzAMhu97iir3Nd1ACKGmu0xIuyE0HsAkbhu1iaPEg/L2RBMSDI2yw45xfn/+YqXeTG4s3jAmS16JVVmJAr0mY32nxMv+cXkvNs2ifsYROEdSb0Mqco9PSvTM4UHKpHt0kEoK6PNNS9EB52PsZAA9QIdyXVV3Mv5kiOaEWeyMEnFnVqLYfwS8hE1tazVuSR8cej4z4lcikyF2yEpMo3ynOLwSDWWGCnneZX25y9/vlA4ZDDBITRGXIebuyBbTt44h/ZTL6ZiYE7q55nJwYvQGzbwShDBndHtNI31ITO6fFR0zX0qLWp78y+YTUEsDBBQAAAAIAE2WuVytn0PKcQEAAO8CAAARAAAAZG9jUHJvcHMvY29yZS54bWyFUstuwjAQvPcrIt8T58FLEQSprTiBVAlQK26us4Db2LFs8/r72oG4UJB6290Zz+7sejg+8irYg9KsFiOURDEKQNC6ZGIzQsvFJBygQBsiSlLVAkboBBqNi6chlTmtFbypWoIyDHRghYTOqRyhrTEyx1jTLXCiI8sQFlzXihNjU7XBktBvsgGcxnEPczCkJIZgJxhKr4gukiX1knKnqkagpBgq4CCMxkmU4F+uAcX1wwcNcsXkzJwkPKS2oGcfNfPEw+EQHbKGaudP8MdsOm+shky4VVFAxfAySE4VEANlYAXyc7sWec9eXhcTVKRx2gvjLEziRRrnWT/vdFZD/Oe9EzzHtSpWhG6Dac2ZdjxfdpQSNFVMGnvNogFvCjaviNjs7OoLEOFy3lB8yR21ItrM7PnXDMrn002re9S75JfavzY7Ydp3Nrv9vDu4stkKNDMo2DP3H4u4aepTN7/efX4BNWdzPrGxYaaCc7kN7/5o8QNQSwMEFAAAAAgATZa5XF6WAY/7AAAAnAEAABAAAABkb2NQcm9wcy9hcHAueG1snZDBbsIwDIbve4oq4tomRB1DKA3aNO2EtB06tFuVJS5kapOocVF5+wXQgPN8sn9bn+1frKe+yw4wROtdReYFIxk47Y11u4p81m/5kmQRlTOq8w4qcoRI1vJBfAw+wIAWYpYILlZkjxhWlEa9h17FIrVd6rR+6BWmcthR37ZWw6vXYw8OKWdsQWFCcAZMHq5AciGuDvhfqPH6dF/c1seQeFLU0IdOIUhBb2ntUXW17UGyJF8L8RxCZ7XC5Ijc2O8B3s8rKC8LXjwVfLaxbpyar+WiWZTZ3USTfvgBjbTkbPYy2s7kXNB73Im9vZgt548FS3Ee+NMEvfkqfwFQSwMEFAAAAAgATZa5XOHWAICXAAAA8QAAABMAAABkb2NQcm9wcy9jdXN0b20ueG1snc6xCsIwFIXh3acI2dtUB5HStIs4O1T3kN62AXNvyE2LfXsjgu6Ohx8+TtM9/UOsENkRarkvKykALQ0OJy1v/aU4ScHJ4GAehKDlBiy7dtdcIwWIyQGLLCBrOacUaqXYzuANlzljLiNFb1KecVI0js7CmeziAZM6VNVR2YUT+SJ8Ofnx6jX9Sw5k3+/43m8he22jfmfbF1BLAwQUAAAACABNlrlcOg8385IBAAD9CQAAEwAAAFtDb250ZW50X1R5cGVzXS54bWzNll1PgzAUhu/3Kwi3BrpNnYuB7cKPS13ivDa1HKAO2qbt5vbvPYAuc+5DwqLc0NDT932f0xDaYLzMM2cB2nApQrfnd10HBJMRF0noPk/vvaE7HnWC6UqBcXCtMKGbWquuCTEshZwaXyoQWImlzqnFV50QRdmMJkD63e6AMCksCOvZwsMdBbcQ03lmnbslTle5KHedm2pdERW6VKmMM2qxTIoq2anTkJkDwoWItui8TzIfleUak3JlzvYnKJFsBfC86KyY3614U7BbUhZQ84jbrXkEzoRq+0BzXECWGXkpmiHvUs9epZz5iOSfuL09wZuR9dJkHHMGkWTzHCW+URpoZFIAi/Dl6OeUiyP5Fj8jqJ69xgylzZFAY1cZmFO3W5r+YqtLgSHl0Lzf7xBr/5oc/ZZwnLeE46IlHJct4Ri0hOOqJRzDf+IwKdUQPVmNx/PJf2Cb3oc4qoPqLw4nJJ1oqQxeITTUb/crr1B7Co1AW374H71OROvG+wvFpSCCqG42mxsr88bxlc3P8E5Ayuvc6ANQSwMEFAAAAAgATZa5XJzfXo4JXwAAJ+UEABgAAAB4bC93b3Jrc2hlZXRzL3NoZWV0OC54bWzdvdt6HDeyNXg/T6HRxf7cu0SJeaqDt+3/i+T5WDyf7thS2ebXkqgmKbu7H2BeYd5vnmQAsqrISgQSCwGgytwXTktQZqwFVAYiELkS+dP/+deXz2/+GN3d39x+/flt9n757ZvR14+3n26+/vbz29OT9aX+2zf3D9dfP11/vv06+vntv0f3b//PL//XT3/e3v3j/vfR6OGNMvD1/ue3vz88fPvxw4f7j7+Pvlzfv7/9Nvqq/uXX27sv1w/qr3e/fbj/dje6/vR40ZfPH/Ll5e6HL9c3X98+WfjxDrFx++uvNx9Hq7cfv38ZfX14MnI3+nz9oOjf/37z7X5i7V+fIHuf7q7/VF2d8HlBcfXpX6b2stKw9+Xm493t/e2vD+8/3n4ZUzN7OfgwmOnnv+5ymaWsUl3940b/UvnE2JePSC+/XN/94/u3JWX7mxqpv998vnn492OH3/7y06P9g7s3v958fhjd7d1+Uj/yr9ef70fq3x6u/75y+/n27s3db3//+e36epeoX66//fDLT9+ufxsdjx5Ovz1e+XBye6AaJheqf/8wNvvLT59u1C+lOb+5G/3681vKfqzXylKf83jK2c3oz/sXf35z//vtn+uK+/fP1/cTg4+NG3c3n3Zvvo5mW49u/1QUN9VAqXv457cPd9/H/3A1UiM6abi7+e13RXJ39OvD9GrVuePR59HHh9GnGYvD7w+fFczxv7/8/fbz1MKn0a/X3z8/aBKPQzJp/0Nx/vntVz3Yn5XN228aY2X0+bPu6ts3H/W5WwqgW75985/b2y/HH68/q4EaLL/46/7j1Y1GPaC71/++/f44LMo1l9W/aq/7++3tP3STtrr8Vv8UX0dv/nX8Tf2oP79VN8a/x3/MmnS2FYXrjw83fyjb2pX/fvvwcPvlSA/No48/6B/w7vY/o6+Pv87j2Ojf7dvj2WNbExPPXXz++xOjN/f/HP/SFjNjxBk7222GtllLT/QZTmWLqdJuiaG10rebUv82vc/1z/Hyz5Mbev3RB5WLjO8edeec33x6+P3nt/333X6vmt5W6i7eHGl89bOV73P1D/9Rt++kaXxz3j7dmLujP0af1QWPZF62KetPd8SHGfBfflI34f3jUd+On6+/3b+44z9+v1d9H7N6uqV/v/n0afSVhX3E/HL9r8e768vN18f/3z/8W9/S6k9/PpnJl/XQxMXLx3g5g1f24+MVgzFgwQBmjzfkh6dxfYoW1w/Xv/x0d/vnm7vHE59gn36CKdLjz9s3CDydO/mxnzgapIyeqQ5rLO2BapLKeoqnuvpetf/xS5nlP334QzMcn1XzZxWzZ61Mziofz/qqzvpV3f/XU8hVOln7ge7vv3/59hhw/+86y9/N/j17l/3tpw+/PtrvFv3+LMKqC2HtEWJlxkqZDWatrMFW8hdWyt6slXXYSvHCSq/Row3YSvlspVpuWNmErVQvrBSNcdmCrXRfWOk2rGzDVnrPVrrLy7NWdmAr/RdWimzWyi5sZfDCSrdhZQ+/65ZfmBk0nGgfN/Pi7u3lDTND3MyL27dXNZz1ADfz4v7t9ctZM4e4mRc3cL85dRzhZl7cwf2yweYYN/PiFu73GmZOcDMv7uHBcjVr5hQ38+ImHhQNM2e4mRd38aDbnTVzjs96L+7iwaAx7V3gZp7v4t5y3jBziZvJX5ipGhPfFW6meGGmGVeIcDvPt3Eva0YWqnE71Qs7VWP2I2cofbbTfWGnGV0ID5j5853cy5eb/fIImf0XdpoRhvCgmQ9e2Ok1xwcPm8XzzdwrmlGG8MBZvLibi2acITx0Fi9u56LbmNsJD57Fi/u5aIYawsNn8eJ+LvPGtEx4AC1e3M9lM9gQGEIV3ovMrVc2ow2BMVThvbRTZY0plcAgqvBm7JTNfoFRVOHN2GkGHALDqMJ7aae73LQDxlGFN2OnGXIIDKQKb8ZOt2kHjKQKb8bOoBG7CAylCu+lnV4z6hAYSxXejJ2qaQcMpgpvxo4Rd8BoqvBe2ulnTTtgOFV4M3bK5vwMxlOFN2On35hXazCeKryXdgbNdU0NxlOFN2OnGXdqMJ4qvBk7zbVNDcbTemYF2l9uxp16Gk+rFwvq4kWY+3B3++e0IJC3FQSqyAWB/IlZNrPSb8wz9fSkD5O1v9GyarSsGS3rRsuG0bJptGwZLdtGy47Rsmu07Bkt+0bL0Gg5MFoOjZYjo+XYaDkxWk6NljOj5dxouTBaLo2WK6OFyGwyf1Uyf1Yyf1cyf1gyf1kyf1oyf1syf1wyf10yf14yf18yf2Ca/MK97nPbkGk7YNoOmbYjpu2YaTth2k6ZtjOm7Zxpu2DaLpm2K7OtJqatZtpWmLZVpm3y8/d6j2XNlzNX0TJz5b33vdiTVzFm0p+ZvRpZSf10VjVzTiPjWJlYGlgm+pmyZZX99w9b6z9kP2ez5cze4N3y3zqP/zJb5iw6jTP7y9YzGyXSfmY982h4ur/aKLCW/z3z90Gprm4YzIMMVqbBIshg1zRYWg02TDWuq9DrWGJVg1jPJNaNCtA3AXowQMN04+/dpeYN149luWHXfst72m38vdfswUC7zCTJ6vWLvP8+yxuuvipx49zqxjnsxuaZNjc2zwx0Y5nBFjeWGWxxY9Mg5sbO60LdOA5Aixu7AaRuHGzZ4sbBdr3cuLFOWpO4b2F13wJ2X/NMm/uaZwa6r8xgi/vKDLa4r2kQc1/ndaHuGwegxX3dAFL3DbZscd9guyHuuy5x39LqviXsvuaZNvc1zwx0X5nBFveVGWxxX9Mg5r7O60LdNw5Ai/u6AaTuG2zZ4r7BdkPcd0PivpXVfSvYfc0zbe5rnhnovjKDLe4rM9jivqZBzH2d14W6bxyAFvd1A0jdN9iyxX2D7Xq5b5XnWf99r7EE3pR4cdfqxV3Yi80zbV5snhnoxTKDLV4sM9jixaZBzIud14V6cRyAFi92A0i9ONiyxYuD7Xp5cbZclkXvfcOLtyRe3LN6cQ/2YvNMmxebZwZ6scxgixfLDLZ4sWkQ82LndaFeHAegxYvdAFIvDrZs8eJguxFi8bbEi/tWL+7DXmyeafNi88xAL5YZbPFimcEWLzYNYl7svC7Ui+MAtHixG0DqxcGWLV4cbDdkQbwjcd+B1X0HsPuaZ9rc1zwz0H1lBlvcV2awxX1Ng5j7Oq8Ldd84AC3u6waQum+wZYv7BtuNEIR3RdKOZbu2YxkXd5inWtUd5qmh8g6ZxTZ9h8xim8DDtIg5s/vCYIlHHIQ2jYcbQerP4aZtKo9gwxE8ek/k0S1qLQ+5lodeK75gK75iK75kS6zZSi/aSq/aSijbSqbbmq9wi/fofZFH24VbGa7cYk61enR07ZbQYptHR1dvMRZBj06u34qE0ObR6RRc4aZtHj1fDVeZ9ZruPBS5s13IleFKLuZUqztH13IJLba5c3Q1F2MRdOfkeq5ICG3unE7RFW7a5s7z1XQV3aoqTGX1gcil7eKuDFd3MadaXTq6vktosc2loyu8GIugSyfXeEVCaHPpdCqvcNM2l16ozutQ5Mp2oVeGK72YU62uHF3rJbTY5srR1V6MRdCVk+u9IiG0uXI6xVe4aZsrz1fz1XDlI5Er29VeGS73Yk61unJ0wZfQYpsrR5d8MRZBV04u+oqE0ObK6WRf4aZtrjxf4VfDlY9FrmyXfGW45os51erK0VVfQottrhxd98VYBF05ufIrEkKbK6fTfoWbtrnyfNVfDVc+EbmyXfeV4cIv5lSrK0eXfgkttrlydPEXYxF05eTyr0gIba6cTgAWbtrmyguVgJ2KXNmuActwERhzqtWVo8vAhBbbXDm6EIyxCLpycilYJIQ2V04nBgs3bXPl+crBGq58JtobxK4Dy3EdGHOqdXuQ6DowocW2DUKi68AYi5gruy8M3iMkuQ4MQJC6crhpiyuHGw5x5XORK9sFYDkuAGNOtbpydAGY0GKbK0cXgDEWQVdOLgCLhNDmyukEYOGmba48XwFYw5UvRK7csmWXx55dHpt2xd+1K/62XfH37RJv3JV+5670W3cl3Lsr2eZdC92961LkynbVV46rvphTra4cXfUltNjmytFVX4xF0JWTq74iIbS5cjrVV7hpmysvdCevK5Er29VeOa72Yk61unJ0tZfQYpsrR1d7MRZBV06u9oqE0ObK6dRe4aZtrrxQtReRyJftcq8cl3sxp1p9ObrcS2ixzZejy70Yi6AvJ5d7RUJo8+V0cq9w0zZfXqjci2qRL9v1Xjmu92JOtfpydL2X0GKbL0fXezEWQV9OrveKhNDmy+n0XuGmbb68UL0XiT45kdsFXzku+GJOtfpydMGX0GKbL0cXfDEWQV9OLviKhNDmy+kEX+Gmbb68UMEXyb47YVd85bjiiznV6svRFV9Ci22+HF3xxVgEfTm54isSQpsvp1N8hZu2+fJCFV8k+ghFbpd85bjkiznV6svRJV9Ci22+HF3yxVgEfTm55CsSQpsvp5N8hZu2+fJCJV8k+iJFYdd8FbjmiznV+k2Z6JovocW2r8pE13wxFjFfdl8Y6suRENq+LJNO8xVu2uLL4YaDfFn0eYrCLvoqcNEXc6rVl6OLvoQW23w5uuiLsQj6cnLRVySENl9OJ/oKN23z5YWKvkj0kYrCrvoqcNUXc6rVl6OrvoQW23w5uuqLsQj6cnLVVySENl9Op/oKN23z5YWqvkj0qYqi5auNHp9t9PhuY/wPN8b/cmP8TzeKv92Y/uON6b/emPDzjcm+37hQ2ReJPlhR2HVfBa77Yk61+nJ03ZfQYpsvR9d9MRZBX06u+4qE0ObL6XRf4aZtvrxY3Zfo6xWFXfdV4Lov5lSrL0fXfQkttvlydN0XYxH05eS6r0gIbb6cTvcVbtrmy4vVfYm+YVHYdV8FrvtiTrX6cnTdl9Bimy9H130xFkFfTq77ioTQ5svpdF/hpm2+vFjdl+jrFYVd91Xgui/mVKsvR9d9CS22+XJ03RdjEfTl5LqvSAhtvpxO9xVu2ubLi9V9ib5bUdh1XwWu+2JOtfpydN2X0GKbL0fXfTEWQV9OrvuKhNDmy+l0X+Gmbb68WN2X6KMVhV33VeC6L+ZUqy9H130JLbb5cnTdF2MR9OXkuq9ICG2+nE73FW7a5suL1X2JvlZR2nVfJa77Yk61+TJzaqAvCy22+LLQYosvMxYxX3ZfGOrLkRBafBlAkPpyuGmLL4cbDvJl0ecqSrvuq8R1X8ypVl+OrvsSWmzz5ei6L8Yi6MvJdV+RENp8OZ3uK9y0zZcXq/sSfa+itOu+Slz3xZxq9eXoui+hxTZfjq77YiyCvpxc9xUJoc2X0+m+wk3bfHmxui/RBytKu+6rxHVfzKlWX46u+xJabPPl6LovxiLoy8l1X5EQ2nw5ne4r3LTNlxer+xJ9saK0675KXPfFnGr15ei6L6HFNl+OrvtiLIK+nFz3FQmhzZfT6b7CTdt8ebG6L9EnK0q77qvEdV/MqVZfjq77Elps8+Xoui/GIujLyXVfkRDafDmd7ivctM2XF6v7En2zorTrvkpc98WcavXl6LovocU2X46u+2Isgr6cXPcVCaHNl9PpvsJN23x5sbov0UcrSrvuq8R1X8ypVl+OrvsSWmzz5ei6L8Yi6MvJdV+RENp8OZ3uK9y0zZcXq/sSfbWitOu+Slz3xZxq9eXoui+hxTZfjq77YiyCvpxc9xUJoc2X0+m+wk3bfHmxui/RZytKu+6rxHVfzKlWX46u+xJabPPl6LovxiLoy8l1X5EQ2nw5ne4r3LTNlxer+xJ9t6Ky674qXPfFnGrzZebUQF8WWmzxZaHFFl9mLGK+7L4w1JcjIbT4MoAg9eVw0xZfDjcc4su16LsVlV33VeG6L+ZUqy9H130JLbb5cnTdF2MR9OXkuq9ICG2+nE73FW7a5ssL1X3Vou9WVHbdV4XrvphTrb4cXfcltNjmy9F1X4xF0JeT674iIbT5cjrdV7hpmy8vVPdVi75bUdl1XxWu+2JOtfpydN2X0GKbL0fXfTEWQV9OrvuKhNDmy+l0X+Gmbb68UN1XLfpuRWXXfVW47os51erL0XVfQottvhxd98VYBH05ue4rEkKbL6fTfYWbtvnyQnVf9eS7Ff1liy8fn+79sFL8qJx+YqLK86zfe19NLX24u/3zl5/UQVss3775+P3+4fbL+u3dl+uHiZ03v6s/5r33vUr98ebTp9HX6b88nb45uvlNn/Nw91213X5/+HzzdbQ7+mP0+ee3itvH28+fr7/djz5NiY2Ld+V4Luo/8r9/qxmWWdXo5tNZ1cw5vdlzVkrHrKZ+LKNOUDVcs6reqdNI3cTZf/328D/MvJb912em3fMn/5uDRffDHl380OCKmH2+UcqiysvZEVoFRshYfdlHKLeMUP5KRqjhSmvA6Bj5rH10CsvoFK9zdNaB0TEyBPvolJbRKV/n6GwAo2Nobe2jU1lGp3olo9Ot8n53doQ2gREyFIz2EepaRqj7ekdoCxghQxdmH6GeZYR6r3eEtoERMtQ29hHqW0ao/3pHaAcYIUPDYB+hgWWEBq93hHaRLNF4NNySJi7b8sTl1ztIe8gg+eTS1mT6tWTTjXi/jwyQRyqd2XLp7JUm00NkgDyy6cyWTmevNJ8+QAbII6HObBl19kpT6kNkgDxy6syWVGevJatuDNARMkAeKXVmy6mz15JUNwboGBkgj4w6s6XU2WvJqRsDdIIMkEdCndky6uy1pNSNATpFBsgjn85sCXX2WjLqxgCdIRVFj2w6t2XT+WvJphsDdI4MkEcmndsy6fyVZtIXyAD5FKWtVelXmklfIgPkkUnntkw6f6WZ9BUyQB6ZdG7LpPNXmkkTISPkkUrntlQ6f6WpNNXICHnk0rktl85faS5NyNPV3COZzm3JdP5Kk2mCnq56ZNO5LZvOX2k2TcgT1twjnc5t6XT+StNpQp6yFh75dGHLp4tXmk8T8qTV/Px7ywjZEurilSbUhDxpNT+q3TJCtoy6eKUZNSFPWs1PFbeMkFXr8UpTakKetJofgG0ZIVtOXbzWnBp50mp+VrNlhGw5dfFac2rkSav5scKWEbLl1MVrzamRx6zmJ+BaRsiWUxdJcupuOw8HmpCUm4Qab+uHu5AB90jRC1uKXiRJ0e0D3ocGXEQqaMCRx8Dmx5RaBtyW8RdJMn77gA+gAReRChpw5LGy+cWbFp2mbQFRJllAWAf8iYdrwGWkggYceUxtfpakZcBt65EyyXrEPuAZNOAiUkEDjjz2Nr8d0TLgtuVNmWR5Yx/wHBpwEamgAUceo5sb/LcMuG21VCZZLdkHvIAGXEQqaMCRx/LmLuwtA24V2ydZfNkHvIQGXEQqaMCRx/zmVtktA25by5VJ1nL2Aa+gAReRChpwRDZg7mfcMuC2pWGZZGloH/AuNOAiUkEDjsgQzE1nWwbcttIs57vSLKGVpoxU0IAjsgZzZ9CWAbetNMv5rjRLaKUpIxU04IhMwty+sWXAbSvNcr4rzRJaacpIBQ04Irsw99hreefNttKs5rvSrKCVpoxUyIDXiIrD3AitZcBtK81qvivNClppykgFDTgiCjF3q2oZcNtKs5rvSrOCVpoyUkEDjmhMzC2FWgbcttKs5rvSrKCVpoxU0IAjkhVz35eWAbetNKv5rjQraKUpIxU04BMFTPtuHeWP6peZ2cfh2c7MXh1Vy14dWRV/r45qzD57+2HSo+em5605skFj+46VyVm5pdsrRWelHHc4y7N+lb/P8oaRVZeR1aKzWvIDv+a6dq3orFmuXXddu1501i3Xbriu3Sg6G9OOZ71quVS/WuPNeZeNzaKzObXRHfTy4n3DxJbLxFbR2XLQ2HbZ2C462xMb3KvJrut3is6Og8Ouy8Zu0dl12Nhz2dgrOnsTG49b5Rgm9l0m9ovO/sREmfWa1w9d1w+LznByfdGtqsL0hgOXjYOic2C5Kw9d1x4WnUPLtUeua4+KzpHl2mPXtcdF59hy7Ynr2pOic2K59tR17WnRObVce+a69qzonFmuPXdde150zi3XXriuvSg6F5ZrL13XXhadS8u1V65rr4rOleVaItfFRCq+ku3y2nl5rS6vbZc7owypMEMrtsud8YVUgCFbhCFniCEVY8gWZMgZZUiFGbLFGXIGGlKRhjZslztjDKkgQ5u2y53xhVSAoS3b5c7QQiq20LbtcmdkIRVaaMd2uTOokIoqtGu73BlPSAUU2rNd7owlpIIJ7dsud4YSUrGEhrbLnVGEVBghWxwhZyAhFUnIFkrIGUtIBROyRRNyhhNS8YRsAYWcEYVUSCFbTCFnUCEVVcgWVsgZV0gFFrJFFnKGFlKxhWzBhZzRhVR4IVt8IWeAIRVhyBZiyBljSAUZskWZ2hllahVlaluUqZ1RplZRprZFmdoZZWoVZWpblKmdUaZWUaa2RZl6GmWKtgVkpRaQ1WQBOah6ZW7d7rHbuoSMtn6cwezNB/PpZus9DdjL9WmZ9RvDOj1psq5dMVpWjZY1o2XdaNkwWjaNli2jZdto2TFado2WPaNl32gZGi0HRsuh0XJktBwbLSdGy6nRcma0nBstF0bLpdFyZbQQmU3mr0rmz0rm70rmD0vmL0vmT0vmb0vmj0vmr0vmz0vm70vmD0yTX7hfPrcNmbYDpu2QaTti2o6ZthOm7ZRpO2Pazpm2C6btkmm7MttqYtpqpm2FaVtl2tZm2mZmrv6cC279cX12dnPcQWP2ejprZnPcvBE4ViaW2nay4Mqhs9XObm+22tntv7Nd6FvcbQLZDPfbGfV6L+uvWbW83BiJVWAk2EcfyEhEeZDDjQRnOHQk1oCRYJ9JICMR5QkLNxKc4dCRWAdGgn1YgIxElEcf3EhwhkNHYgMYCVYvhoxEFPUbNxKcYa+RyM2R2ARGghVyISMRRZbGjQRnOHQktoCRYBVWyEhE0YtxI8EZDh2JbWAkWOkTMhJRhFzcSHCGQ0diBxgJVpOEjEQUhRU3Epzh0JHYRTIrVi0EpVZRxE9sbsVZDh2MPWQw5HlmukQzONNkBmMfGQxxqhlnZ1h2MIKTTWYwhshgiLPNOLvAsoMRnG8yg3GADAaU3ikgO8whAgPlTs8wzcfBCASUlFghjhEIKNpbIU4QCCiMWiFOEQgoPlkhzpCVLTTrWyHOEQhoLrVCXCAQ0AxlhbhEICC/t0JcIRCeHm48bUcwwtybagQjzL8JqU2xu4J5YEBVnzAPJ6Sewu5M5YGBVCrYvZ08MJAaALs7kgcGsrpm9xfywEDWrewOPR4YyIqQ3ePGAwNZa7G7xHhgIKsYdp8VDwxkccBuCuKBgeTc7D4YHhhIKstu/eCBgWSI7G4HHhhIesi+4O+BgeSH7DvtHhhIgsi+xu2BgWSI7JvLHhhIisi+rOuBgeSI7PupHhhIksi+kumBgWSJ7FuIHhhImsi+eOeBgeSJ7LtmOEaN5Ins61UeGEieyL5R5IGB5InsSzQeGEieyL434oExyRPbXwLp/6jITEwU2fLL1f3MM+nBnD/YOoCeSQ+YZ9JZ45n0wDHWPzy+FvK3RnFlmR/WVae1x/dDQGtrTmuPb4yA1tad1h7fIQGtbTitPb5VAlrbdFp7fL8EtLbltPb4qglobdtp7fGlE9DajtPa4ysooLVdp7XHl1FAa3tOa4+vpYDW9p3WHt9QAa0NndYe31cBrR04rT2+uQJaO3Rae3yXBbR25LT2+HYLaO3Yae3xfRfQ2onT2uMbMKC1U6e1x3diQGtnTmuPb8mA1s6d1h7fmwGtXTitPb5JA1q7dFp7fLcGtHbltPb4tg1ojchpbvz+DWqwdht8eiMHNegO+eN3dFCD7qg/fmsHNegO/OP3eFCD7tg/frMHNegO/+N3fVCD7gxg/PYPatCdBIzfB0INuvOA8RtCqEF3KjB+Zwg16M4Gxm8RoQbdCcH4vSLUoDsnGL9phBp0pwXjd49Qg+7MYPw2EmrQnRyM309CDbrzg/EbS6hBd4owfocJNejOEsZvNaEG3YnC+D0n1KA7Vxi/+YQadKcL43ehUIPujGH8dhRq0J00jN+XQg2684bxG1SgwdqdOYzfqUINujOH8VtWqEF35jB+7wo16M4cxm9ioQYnmUN7WWfwo0I2K0MzFZ1subWkE7meo9Eeec8Ua4yCzvS07tNpD3e6g7oeNjM8g5//65/fbx/+5+Tmt9Hdl9Gnp7+9e/rfzvV/rv/x+/3D9dc3K4rdzcfrz29O7m7UceX2/uH+zQ9n118frn8bvfl0czf6+PBm9K/Rx+/a8N/8zOze6qaVo+GzhR/ffLu+v196+P3u9vtvv4/tPf0OzwWpaR97LSINZnub2ZblyrYvDbvTVfYuxX5bJgvhBwyWspZPGKwiI5YHjBi7VVX2LsWGWfMZsTVkxIqAEWP3msrepdjxaj4jto6MWBkwYuxmUdm7FFtWzWfENpARqwJGjN1XOHuXYnfjRCOWZ71u3iiEI6PWDRg1dnPg7F2KLYoTjVoxyHrZ+8bGTlvIuPUCxo3d4zd7l2Kn4XmO2zYybv2AcWO36s3epdgweJ7jtoOM2yBg3Ngdd7N3Kfb9nee47ULZ7XJIestunavy2xQ7+M5z6PagoQtaGdiWBq93bbAPDVrI4iCzrA7ivBqzkEEbQoMWsj7ILAuEOK/QLGTQDqBBcy4Rqtw6ZpYlAvuOTvC2tk0aKYbsEBoy5xqhZcgsawT2faNXMWRH0JA5FwgtQ2ZZILDvT72KITuGhsy5NmgZMsvagH0f7FUM2Qk0ZM5lQcuQWZYF7Pttr2LITqEhc64IWobMsiJg39d7FUN2BtVtnWsB+5DllqUA+/7hqxiyc2jInGuAliGzLAHY9ylfxZBdQEPmXAG0DJnt8UCSD2rMY8guoSFz5v8tQ2ZJ/9n3XV/FkF1BQxaQ/eeW7J99f/dVDBkRNGYB6X9uSf/Z95Ffx5jV0JgF5P+5Jf9n369+HWMGPVHPAxYAuWUBwL4v/jrGDHumHrACyC0rAPb999cxZtBT9TxgCZBblgDs+/yvY8yg5+pFwBqgsKwB2P0JXseYQU/Wi4BFQGFZBLD7LbyOMYOeqxcBq4DCsgpg9494HWMGPVMvApYBhU0m9GqXAQQ9Ty8C1gGFZR3A7u/xOsYMepZeBKwDCss6gN2v5HWMGfQcvQhYBxSWdQC7/8rrGDPoAXoRsA4oLOsAdj+Z4DErDBr2rkOPwYuAdL6wpPPsNjdz7Tr0MLsIyMoLS1bO7r4z165Dj6TLgOS6tCTX7KZAc+069Gi5DMiRS0uOzO5VNNeuQ4+Iy4BUt7SkuuwWSnPtOvSotwzIWEtLxsru7DTXrkOPbMuAxLO0KdSTJJ4+XYcevZYB+WNpyR/ZfbDm2nXoEWoZkAaWljSQ3Z5rrl2HHoWWAdlcacnm2F3D5tp16JFmGZDNlZZsjt3MbK5dhx5NlgHZXGnJ5tg91ubadegRYxWQzVWWbI7d+m2eXa+hJ4VVQDZXWbI5dke6uXYdeuBXBWRzlSWbYzfKm2vXoed2VUA2V1myOXb/vrl2HXr8VgVkc5Ulm2O3FZxr15+forW+wp4t/6hHaeZVOtub7Fnbm+xl/M0JNSDyMvvktICX2feuv17/Nvoy+vrw5nh098fNx9G932vsLQbEL7BP+tW33rtrR0fDox9Wig+z90U2e59ky+XzBpZVnmd99Vs13/1GwVZ9wIz3pVGUtQCUdRhlPQBlA0bZ8EEpyn6Wv2/8Opsw1qYPVnfQzRtIWzDSVnCvtmGs7YDfaQdG2Qnu0S6MtRuMtQdj7QVj7cNY+z5Yea9fGa9MoUhDL6Sy6JqT3gEMdhBwAx7CKIcBKEcwylEAyjGMchyAcgKjnASgnMIopwEoZzDKWQDKOYxyHoByAaNcBKBcwiiXAShXMMpVAAoRDEMUglPjOHUIDp6UkldWauomYZyQhJTwjJRCUlLCc1IKSUoJz0rJKy01dWAwjldKamqnYByvhNTUG8E4Icko4dkoeaWjpq4FxvFKRU0tCIzjlYaawgsYxysFNVUOMI5XAmpKCmCckNyT8OSTQrJPwtNPCsk/CU9AKSQDJTwFpZAclPAklEKyUMLTUArJQwlPRCkkEyU8FaWQXJTwZJRCslHC01EKyUdrPB+tQ/LRGs9H65B8tMbz0TokH63xfLQOyUdrdz76VLXPdNU+mynaPBc3Zqv2eUvVPqsSVO3zpx5kL4v2edks2k/P+jCtdxtNq2bTmtm0bjZtmE2bZtOW2bRtNu2YTbtm057ZtG82Dc2mA7Pp0Gw6MpuOzaYTs+nUbDozm87Npguz6dJsujKbiJg25vcm5gcn5hcn5icn5jcn5kcn5lcn5mcn5ncn5ocn5pcn5qen6W/fL58bh1zjAdd4yDUecY3HXOMJ13jKNZ5xjedc4wXXeMk1XjGNNXGNNde4wjWuco1rs42z014x72mveOIy+ym15vOVenza7LfUGjvUrUxttXy4DvjGXy9/UQFvfk9+FQEBPvLXCrKGgABf+WsFWUdAgM/8tYJsICDA9zxbQTYREOCDnq0gWwgI8EXPVpBtBAT4pGcryA4CAnzTsxVkF3JG4KuerSh7EEqoz+9DKKFOP4RQQr3+AEIJdftDCMXT741HdwiGp9sbD+4QDE+vNx7bIRieTm88tEMwPH3eeGSHREZPjzce2CEYnv5uPK5DMDy93XhYh2B4+rrxqA7B8PR080EdAhLm6FRDIGGeTlD2yG6p4gGCZY9hvk5Q9shu2uEBAmWP7C4XHiBQ9shuC+EBAmWP7D4KHiBQ9shuPOABAmWP7Jv6HiBQ9si+2u4BAmWP7LvgHiBQ8si+PO0BAuWO7GvKHiBQ6si+EOwBAmWO7Ku3HiBQ4si+5OoBAmWO7OukHiBQ6si+uOkBAuWO7CuSHiBQ8si+jOgBAmWP7Gt/HiBQ+si+YOcBAuWP7KtsHiBQAsm+NOYBAmWQ7OtZOEgNZZDsi1AeIFAGyb5y5AECZZDsyz0eIFAGyb5G4wEyzSAdL8EU+nFaMa0C9F+UAWaryuW8q8olVlUumapyr1lVLt0DjtyexYuXScyqMgCC3J5tIGsICHJ7toGsIyDI7dkGsoGAIAGpDWQTAUECUhvIFgKCBKQ2kG0EBAlIbSA7CAgSkNpAdiFnRCJSG8oehBLq8/sQSqjTDyGUUK8/gFBC3f4QQvH0e6OqjGB4ur1RVUYwPL3eqCojGJ5Ob1SVEQxPnzeqykhk9PR4o6qMYHj6u1FVRjA8vd2oKiMYnr5uVJURDE9PN6vKCEiYo1MNgYR5OkHZI1RVbgHBsscwXycoe4Sqyi0gUPYIVZVbQKDsEaoqt4BA2SNUVW4BgbJHqKrcAgJlj1BVuQUEyh6hqnILCJQ9QlXlFhAoeYSqyi0gUO4IVZVbQKDUEaoqt4BAmSNUVW4BgRJHqKrcAgJljlBVuQUESh2hqnILCJQ7QlXlFhAoeYSqyi0gUPYIVZVbQKD0Eaoqt4BA+SNUVW4BgRJIqKrcAgJlkFBV2Q5SQxkkVFVuAYEySKiq3AICZZBQVbkFBMogoapyC8g0g3RUlUtdVS4nVnrL1qpyNe+qcoVVlSumqtxvVpUr94BnPzc21Oq9eAUmWzaLyIDNvM2mUTAGDBYeBtcRg6WHwQ3EYOVhcBMx2PUwuIUY7HkY3EYM9j0M7iAGBx4Gd6F7e9nD4h5ksdVdjOIrYtHHWYaQRR9vOYAs+rjLIWTRx1+OIIs+DnMMWfTxmBPIoo/LnEIWfXzmDJq7fXzmHLLo4zMXkEUfn7mELPr4zBVk0cdniCCTPk5DNWTSx2sISihyH7chLJ/w8RuCMorcx3EIyikKH88hKKsofFyHoLyi8PEdgjKLwsd5CMotCi/vgbKLwst7oPyi8PIeKMEovLwHyjAKL++BUozCy3ugHKP08h4oySi9vAfKMkov74HSjNLLe6A8o/TyHijRKL28B8o0Si/vgVKN0st7oFyj9PIeKNkovbwHyjYqH++poWyj8vGeGso2Kh/vqaFso/LxnhrKNiof76mn2Yaj4FTpglPFFlZmC07dtp28ewkKTl2s4NRlCk6N7b5Xpra8Ck5Ve8EJsGneV5X1F1tDDJp3ld3gOmLQvKfsBjcQg+Z8bDe4iRg0Z2O7wS3EoDkX2w1uIwbNmdhucAcxaM7DdoO70L1tTsN2i3uQxVZ3MQpOiEUfZxlCFn285QCy6OMuh5BFH385giz6OMwxZNHHY04giz4ucwpZ9PGZM2ju9vGZc8iij89cQBZ9fOYSsujjM1eQRR+fIYJM+jgN1ZBJH68hKKFgCk4tJrF8wsdvCMoomIJTi0kop2AKTi0moayCKTi1mITyCqbg1GISyiyYglOLSSi3YApOLSah7IIpOLWYhPILpuDUYhJKMJiCU4tJKMNgCk4tJqEUgyk4tZiEcgym4NRiEkoymIJTi0koy2AKTi0moTSDKTi1mITyDKbg1GISSjSYglOLSSjTYApOLSahVIMpOLWYhHINpuDUYhJKNpiCU4tJKNtgCk52kzWUbTAFpxaTULbBFJxaTELZBlNwajEJZRtMwanF5DTbcBScurrg1AUKTr15fzquhxWcembBqWgMxsrUVsvw6m8BPn77svnJv3fQly+bH/rrWX+aVZRNzrKBPkaJs1lD2RQsG+j7kDibdZRNybKBPtnYwiZnXu8FCVUsIeiz2F6ENlFCXZYQ9LFqL0JbKKEeSwj6hLQXoW2UUJ8lBH3Y2YvQDkpowBKCPrfsRWgXng+X+QkR+gyyF6U9mJJljo48Se/DfPhZmn1ZOoDPEObDz9Psa9UBfA5gPvxMzb6AHcDnEObDT9Tsq9oBfI5gPvw8zb7WHcDnGObDT9PsK+ABfE5gPvwszb4uHsDnFObDT9Lsq+UBfM7gJJGfotnX0AP4nMN8+PmZfWU9gM8FzMeSRUeeny9hPvz8zL4KH8DnCubDz8/sa/MBfIhgQvwEzb5iH0KohgnxMzT7On4IIXiVmvNTNPvqfgghfKHKz9Hsa/4hhOC1as5P0uyWACGE4OVqwc/S7PYBIYTg5WrBT9PsVgMhhODlasHP0+y2BCGE4OVqYSl4RJ6oCV6uFvxMzW53EEIIXq4W/EzNbo0QQgherhb8TM1uoxBCCF6sFvxMzW65EEIIXq0W/EzNbs8QQgherhb8TM1u5RBCCF6vlvxMzW77EEIIXrCW/EzNbhERQghesZb8TM1uJxFCCF6ylvxMzW49EUIIXrOWlup07JkaXrSW/EzNbmkRQghetZb8TM1ufxFCCF62lvxMzW6VEUIIXreW/EzNbqsRQgheuJb8TM1uwRFCCF65VvxMzW7XEUCohleuFT9Ts1t7hBCCV64VP1Oz24CEEIJXrhU/U7NbhoQQgleuFT9Ts9uLhBCarlwdT+N7+ml8b/o0vldZH8f32zYcKd/n0R/H97HH8X3mcXzWfBzfx36dveHqD9m7LP/bz8vsQ/h+4xfodVseuntg5mNMdrscHHPNB7MYY7K75+CY6z6Y5RiT3UwHx9zwwazGmOxuWjjmpg9md4zJbq6FY275YPbGmOxeWzjmtg9mf4zJbr2FY+74YA7GmOxOXDjmrtecsDyZFNituXDUPS/U6VQUOBfte6FOJiN+++0W1MJ4SW7oBTyZkfgdufHuHnihTuYkfoduHPXQC3UyK/E7duOoR16ok3mJ38MbRz32Qp3MTPyu3jjqiRfqZG7i9/nGUU+9UCezE7/zN4565pU+TKYnfi9wHPXcC3UyPfG7g+OoF16o01wpMFm69EKdzE38DuI46pUX6mRu4vcUx1GJvGAnkxO/y7gHbO0FO5md+H3HPWC98v18Mj3xO5F7wPql/JP5id+b3APWK+vPJxMUv1u5B6xX4l9MZih+/3IPWK/cv5hMUfyO5h6wXul/MZmj+D3OPWC9VgDFdEkXOEmR1yKgmMxS/D7oHrBe64BiMkvxO6N7wHotBYrJLMXvle4B67UWKCazFL97uges12KgmMxS/H7qHrBeS4FiMkvxO6x7wHqtBcrJLMXvue4B67UYKCezFL8Luwes12qgnMxS/L7sHrBey4FyMkvxO7V7wHqtB8pp7Sl0lvJaEJSTWYrfzd0D1mtFUE5mKX5/dw9YryVBOZml+B3fPWC91gTlZJbi94D3gPVaFJSTWYrfFd4D1mtVUE1mKX6feBy29loVVJNZit853gPWa1VQTWYpfi95D1ivVUE1maX43eU9YL1WBdVkluL3m/eAna4KHA+A+voBUJ8t4c0+/xnMbcP5Gdx8ec4b3WvAx3HL3n6YDOaLtpePmfLGY6bpabllyFf6nZVBZyVbVv9l6r9C/Veq/yr1X1f911P/9cc/RXcwyPqqe43HSk6M1X5nddBZVRirCmNVYawqjFWFsaowVhXG6hQjq3rGh1KdAGv9ztqgs6YA1hTAmgJYUwBrCmBNAawpgLU2gHUnwHq/sz7orCuAdQWwrgDWFcC6AlhXAOsKYP0ZoJ8bb1A6ATb6nY1BZ0MBbCiADQWwoQA2FMCGAthQABtTgH7Z65XvG7/CphNis9/ZHHQ2FcSmgthUEJsKYlNBbCqITQWx+dyHQv3W3ffdxsMfJ8ZWv7M16GwpjC2FsaUwthTGlsLYUhhbCmPrGWM5z/rl+8aD0W0nxna/sz3obCuMbYWxrTC2Fca2wthWGNsKY/v5ju0VvazZjR0nxE6/szPo7CiIHQWxoyB2FMSOgthREDsKYsfRjV0nxm6/szvo7CqMXYWxqzB2FcauwthVGLsKY9eBsefE2Ot39gadPYWxpzD2FMaewthTGHsKY09h7D0P1XKV5c27at8Jsd/v7A86+wpiX0HsK4h9BbGvIPYVxL6C2J9CVN2qaj6OcQIM+53hoDNUAEMFMFQAQwUwVABDBTBUAMNngOXlrjlBHTgxDvqdg0HnQGEcKIwDhXGgMA4UxoHCOFAYB1OM3Jw/Dp0Ah/3O4aBzqAAOFcChAjhUAIcK4FABHCqAwylA83GK0/hRv3M06Bwp40fK+JEyfqSMHynjR8r4kTJ+ZDN+7DR+3O8cDzrHyvixMn6sjB8r48fK+LEyfqyMH9uMnziNn/Q7J4POiTJ+ooyfKOMnyviJMn6ijJ8o4yc246dO46f9zumgc6qMnyrjp8r4qTJ+qoyfKuOnyvipzfiZ0/hZv3M26Jwp42fK+JkyfqaMnynjZ8r4mTJ+ZjN+7jR+3u+cDzrnyvi5Mn6ujJ8r4+fK+Lkyfq6Mn9uMXziNX/Q7F4POhTJ+oYxfKOMXyviFMn6hjF8o4xc245dO45f9zuWgc6mMXyrjl8r4pTJ+qYxfKuOXyvilzfiV0/hVv3M16Fwp41fK+JUyfqWMXynjV8r4lTJ+ZTNO5LRO1O8QDdR/CkAdMn0o9KHUh0ofuvrQ0wcbTu3GqRVOrXBqjVNrnEddVa1xao1Ta5xa49RWHHdiRyqzI5Xakc7tSCd3pLM7/QlUfaj0oasPPX2w4biTO1LZHan0jnR+RzrBI53h6a+g6kOlD1196OmDDced45FK8khleaTTPNJ5HulET38IVR8qfejqQ08fbDjuVI9Urkcq2SOd7ZFO90jne/pbqPpQ6UNXH3r6YMNxZ3ykUj5SOR/ppI901kc67dOfQ9WHSh+6+tDTBxuOO+0jlfeRSvxIZ36kUz/SuZ/+Iqo+VPrQ1YeePthw3KkfqdyPVPJHOvsjnf6Rzv/0R1H1odKHrj709MGG407/SOV/pBJA0hkg6RSQdA6ov4uqD5U+dPWhpw82HHcOSCoJJJUFkk4DSeeBpBNB/WlUfaj0oasPPX2w4bjzQFKJIKlMkHQqSDoXJJ0M6q+j6kOlD1196OmDDcedC5JKBkllg6TTQdL5IOmEUH8gVR8qfejqQ08fbDjuhJBURkgqJSSdE5JOCklnhfobqfpQ6UNXH3r6YMNx54WkEkNSmSHp1JB0bkg6OdSfSdWHSh+6+tDTBxuOOzcklRySyg5Jp4ek80PSCaL+Uqo+VPrQ1YeePthw3CkiqRyRVJJIOksknSaSzhP1x1L1odKHrj709MGG484WSaWLpPJF0gkj6YyRdMqov5eqD5U+dPWhpw82HHfiSCpzJJU6ks4dSSePpLNH/clUfaj0oasPPX2w4bhzSFJJJKksknQaSTqPJJ1I6q+m6kOlD1196OmDDcedTpLKJ0kllKQzStIpJemcUn84VR8qfejqQ08fbDjuzJJUakkqtySdXJLOLkmnl/rbqfpQ6UNXH3r6YMNxJ5mkskxSaSbpPJN0okk609SfT9WHSh+6+tDTBxuOO98klXCSyjhJp5ykc07SSaf+gqo+VPrQ1YeePthw3KknqdyTVPJJOvsknX6Szj/1R1T1odKHrj709MGG485CSaWhpPJQ0oko6UyUdCqqv6OqD5U+dPWhpw8WnNqdj9YqH61VPlrrfLTW+Wit81H9KVV9qPShqw89fbDhuPPRWuWjtcpHa52P1jofrXU+qr+mqg+VPnT1oacPNhx3PlqrfLRW+Wit89Fa56O1zkf1B1X1odKHrj709MGG485Ha5WP1iofrXU+Wut8tNb5qP6GqT5U+tDVh54+2HCe89HChqPy0Vrlo7XOR2udj9Y6H9WfVdWHSh+6+tDThwnOYLm/XD7XJ2brytm868rZ9H2G57ryuK0/eFFXzgaNksrK5LSBrZS/Uk1qV3nWr/L3WfM1iVWnidWK/3HWnFeuWa5cd165brlyw3nlxrTD+pWV0qhCbTotbE4tdAe9vGjW4racBrYcFLadFrYnFrpV3jfKpq6rdxz4u04Luw4Le04LexMLVZ4zDyv2nQb2JwbKrNe8eui8eji5uuhWVWHe9QdOCweWO/DQeeWh5coj55VHliuPnVceW648cV55Yrny1HnlqeXKM+eVZ5Yrz51XnluuvHBeeWG58tJ55aXlyivnlVeWK4mclxLZrq3d19a2a93xglZs17oDBdkiBblDBdliBbmDBdmiBbnDBW3YrnUHCtq0XeuOEbRlu9YdHWjbdq07NtCO7Vp3VKBd27XueEB7tmvdoYD2bde6AwENbde6QwDZYgC5gwDZogC5wwDZ4gC5AwHZIgG5QwHZYgG5gwHZogG5wwHZ4gG5AwLZIgK5QwLZYgK5gwLZogK5wwLZ4kLtjgu1LS7U7rhQ2+JC7Y4LtS0u1O64UNviQv0cFzLr8m5y7aDqlXnvRTY+u2jLWxdtsVdsObNiy5kVW1kUzRVb7lqx5dmSWsZP0udsUBTvC1Ps4zaTd9RPs7Q6NVV0c87UmtOUAuuoX2ppbWoqX644U+tOUwqsowL60vqzqYKztOG0pLA6KrwvbTz3r1ruFu+7zVR/02lKgXVUtF/anJrq9nqD5fdV09SW05QC66jgv7Q1NdUvsix7n5lrQJcpBdZRucDS9rOpbDmv3ldNUztOUwqso1KDpZ2pqUG3KLvv82YHd52mFFhHZQpLu1NTqnvdbvd931wjumwptI7KHJb2nm0tF0WPWa7tO20ptI7KJJb2n0erXw36pqmh05QC66jEYmk4NaXWwH1Dk3PgNKSgOirLWDqYGioHhWno0GlIQXVUyrF02G7oyGlIQXVU/rF01G7o2GlIQXVUMrJ03G7oxGlIQXVUZrJ00m7o1GlIQXVUmrJ02m7ozGlIQXVUzrJ01m7o3GlIQXVUArN03m7owmlIQXVUNrN00W7o0mlIQXVUarN02W7oymlIQXVUnrN01W6IyGlJYXX0cnhJS0NabdVOWxquo9fHS1r/0WrMHYY1XkcvmJdoxWHMHYw1XkevoJdo1WHMHY41XkcvqZdozWHMHZA1XkevsZdo3WHMHZM1Xkcvupdow2HMHZU1Xkevwpdo02HMHZc1Xkcvy5doy2HMHZk1Xkev05do22HMHZs1Xkcv3Jdox2HMHZ01Xkev5Jdo12HMHZ41Xkcv7Zdoz2HMHZ81Xkev9Zdo32HMHaE1Xkcv/pdo6DDmjtIar6OrAUvkCNTkjtQar6PLA0vkCNbkjtYar6PrBUvkCNjkjtgar6MLCEvkCNrkjtoar6MrCkvkCNzkjtwar6NLDEvkCN7kjt4ar6NrDkvkCODkjuAar6OLEEvkCOLkjuIar6OrEkvkCOTkjuQar6PLFEvkCObkjuYar6PrFkvkCOi1O6BrvI4uZCzVjoheuyO6xuvoysZS7YjotTuia7yOLnUs1Y6IXrsjusbr6NrHUu2I6PU0otufYSs8i4nZIkfZUuQoB+8jlzlqjfc4CvlMSaNsljSeT5tUQ1aZtjWmbZ1p22DaNpm2LaZtm2nbYdp2mbY9pm2faRvOts3+QlVbGSpPoB2oxlyKFz9R0W/cgtOzymkvVpi2VaZtjWlbZ9o2mLZNpm2Ladtm2naYtl2mbY9p22fahkzbAdN2yLQdMW3HTNsJ03bKtJ0xbedM2wXTdsm0XTFtRFwjdycQdysQdy8QdzMQdzcQdzsQdz8Qd0MQd0cQd0sQd08Qd1MQd1cQd1sQd18Qd2MQd2cQd2sQd28Qd3MQd3cQd3sQd38Qd4MQd4fU3B1Sc3dIzd0h9fQO6fXMebA773lw/InZQfWiIj9p686EL0NDNTmt93Taw51Zi335TdaM/wrr39791z+/3z78z/HD9d3D0um3p7+NG5+Ok3epJ6c0a/owkXxMhN09OZjIGk6kGBNhd00OJrKOEynHRNjdkoOJbOBEqjERdj97DyLNhxgwge6YALt/vZjAFk6gNybA7lcvJrCNE+iPCbD704sJ7OAEBmMC7H70YgK7HhPV8mSmYnegF1PY86AwnSxDZ8vmoyCcwmSa5L+AKqYw9KAwmSD5j56KKRx4UJhMjfx3TsUUDj0oTCZF/tOmYgpHHhQm0yL/NVMxhWMPCpOJkf+AqZjCiQeFydTIf7NUTOHUg8JkcuQ/UyqmcOaRPU1mR/7LpGIK5x4UJrMj/zFSMYULDwrTJDLu7HjpQWEyO/KfHBVTuPKgMJkd+a+MiikQeXCYTI/8h0XlHGoPDpP5kf+WqJyDx/Iqn0yQ/OdD5Rx8VlaTGZL/Yqicg8eiKp9MkfxHQuUcPNZTxWSO5L8LKufgsZQqJpMk/ylQOQeP1VQxmSX5r3/KOXgsqIrpKjvuNEkea6piMk/y3/iUc/BYVhWTeZL/rKecg8fKqpjMk/yXPOUcPJZWxWSe5D/eKefgsbYqJvMk/71OOQePxVUxmSf5T3TKOXisrsrJPMl/lVPOwWN5VU7mSf5DnHIOHuurcjJP8t/elHPwWGCVk3mS/9ymnIPHCqucFiIjz5MeS6xyMk/yH9WUc/BYY5WTeZL/jqacg8ciq5zMk/ynM+UcPFZZ5WSe5L+WKefgscwqJ/Mk/4FMOQePdVY1mSf5b2KKOdQe66xqMk/yn8GUc/BYZ1WTeZL/8qWcg8c6q5rMk/zHLuUcPNZZ1WSe5L9vKeEw+wCy1/IAUr91FPfpY495+jhpm3362Hibf2V6Gvj0sTFQHcvTSPMDoU+jtvb1TnXiy+jrw5sPb45GH+++3zzov8E/8ipOmP3ka8fy1DIZ4TWcMPtJ2I7l6WYywus4YfaTsR3LU9BkhDdwwuzHvzuWp6URCdsuaT5lhTvCfjS8Y3nqOveObOEdYT823rE8vZ17R7bxjrAfKe9YngLPvSM7eEfYj5t3LE+T596RXY+AxX4VvWN7Kj33rux5dMUafOcbffc9KNvCL/80PBnloQdlWwDmn54no3zgQdkWgvmn7ckoH3pQtgVh/ul8MspHHpRt4ZZ/mp+M8rEHZVtg5Z/+J6N84kHZFkJ5tUAyyqcelG3BklcXJKN85rEqskVFXo2QjPK5B2Vb9OPVC8koX3hQti4+5xv9Lj0o26Ifr45IRvnKg7It+vFqimSUiTw428Ifr75Ix7n24GyLf7xaIx1nj3JVbguAvLojHWefipUtAvJqkHScPYpWuS0E8uqRdJw96laFLQbyapN0nD1KV4UtCPLqlHScPapUhS0K8mqWdJw9ClKFtQo73zBIHrWnwhYHebVMOs4eZabCFgd5dU06zh4VpcIWB3k1TjrOz6WjPqjWYTjPOQ7ue3C2xUFe7ZOO89CDsy0O8uqgdJwPcM6lLQ7yaqJ0nA89ONviIK8+Ssf5yIOzLQ7yaqV0nI89ONviIK9uSsf5xIOz9YHknOPgqQdnWxzk1VPpOJ95cLbFQV5tlY7zuQdnWxzk1VnpOF94cLbFQV7NlY7zpQdnWxzk1V/pOF/hnCtbHOTVYsk41+TB2RYHeXVZOs61B2dbHOTVaOk4r3hwtsVBXr2WjvOqB2dbHOTVbik4z6rh+vPejqPPCOImbbOCuF5TENdHV4NBgrjG36vJmJ/cja59FXEw4yBFXDzGazjjIElcPMbrOOMgTVw8xhs44yBRXAjj6TlNGRxMPUgGl4D6Fk49SPiWgPo2Tj1I6paA+g5OPUjcloD6rke4CZOzJSC/50E+TMCWgPy+B/kwKVu8SX3owTlMyxaP84EH5zAxWzzOhx6cw9Rs8TgfeXAOk7PF43zswTlMzxaP84kH5zBBWzzOpx6cwxRt8TifeSxrwiRt8Tife3AO07TF43zhwTlM1BaP86UH5zBVWzzOVx6cw2Rt8TgTeZAO07VFJF17kA4TtkUk7VF3ClS2RSTtU3oKk7ZFJO1RfQrUtkUk7VGAChS3RSTtUYMKVLdFJO1RfQqUt0Uk7VF3CtS3RSTtUXEKFLhFJO1RawpUuEUk7VFlCpS4RST9XF1KrXGLSHrfg3SYyC0i6aEH6TCVW0TSBzjpQJlbRNKHHqTDdG4RSR95kA4TukUkfexBOkzpFpH0iQfpMKlbRNKnHqTDtG4RSZ95kA4Tu0Ukfe5BOkztFpH0hQfpMLlbRNKXHqTD9G4RSV/hpAMFb/FI1+RBOkzxFpF07UE6TPIWkfSKB+kwzVtE0qsepMNEb1FIz6reBvNWvQ0Y1dukbVb11vhC38r0NKHqzTGYUlVc4+/dyY+yrobg9k+fzQFX8R7yHuvuocih4/VwDe8h797uHoq8P14P1/Ee8nOBu4eiqSJeDzfwHvKptLuHokw7Xg838R7yebe7h6K0PF4Pt/Ae8km6u4eiHD5eD7fxHvIZvbuHooQ/Xg938B7y6b+7h6LVQbwe7npEfH6xAIR80WIiXh/3PPooTmsWnNfse/RRmtjIZI4hfZye09Q/4p2V5jgyfWSCzh54dFaa7siElfHu3kOPPkoTHpkQM14fjzz6KE15ZMLNeH089uijNOmRCT3j9fHEo4/StEcmDI3Xx1OPPkoTH5mQNF4fzzwqAdLMRyY8jdfHc48+SjMfmVA1Xh8vPPooLuksuKZz6dFHacIjE8LG6+OVRx+leY5MOBuvj0QenZQmOjKhbcRO1h6dlGY6MmFuxE56lMotQl2gkwtOdcinWi7NdWTC34id9CiYW4TAQCcXnOyQR83cIhx2d1ImLI7YSY+yuUVoDHRywekOeVTOLcJkoJMLznfIo3huETIDnVxwwkMe9XOL8Bno5KIzHo8SukUoDXRy0RmPRxXdIqwGOrnojOe5jC4VYgOdXHTGs+/RSWnGIxN2R+zk0KOT0oxHJgSP2MkDvJMWYbi7kzLheMROHnp0UprxyITmETt55NFJacYjE6ZH7OSxRyelGY9MyB6xkycenRRLdxad8Zx6dFKa8ciE8hE7eebRSWnGIxPWR+zkuUcnpRmPTIgfsZMXHp2UZjwy4X7ETl56dFKa8ciE/hE7eYV30iL8d3dS9mJAvE7W5NFJacYje5EgYidrj05KMx7ZiwcRO7ni0UlpxiN7USFiJ1c9OinNeGQvNkTp5MyLDsVy24sOsd9y0GjNtxymbbNvOQwabzlMT0v0lkNjZC1vPfQnI77y+fZ+tDT87rHXL94D2fRg9oCbLQJ6sIb3QOb7Zg+4qSCgB+t4D2SObfaA8/OAHmzgPZCtU8wecMuWgB5s4j2QLULMHnBrkoAebOE9kK0wzB5wC46AHmzjPZAtH8wecKuJgB7s4D2QrQ3MHnBLhYAe7HpENFnmz4Q0biUQ0Ic9jz5EC8uR4/K+Rx9iBWZWlR/Qh6FHH2KFZlZsH9CHA48+xArOrIbeqw/TcxrieI/OxIrTrFg+4Ac58uhDrEjNiuED+nDs0YdYsZoVuwf04cSjD7GiNStmD+jDqUcfYsVrVqwe0IczjwVcrIDNitED+nDu0YdYAZsVmwf04cKjD9FW0pED9qVHH2IFbFYsHtCHK48+xArYrBg8oA9EHp2IFahZsXdIJ2qPTsSK1KyYO6QTHhU+oTib6UTkUE0+Rb5YsZoVY4d0wqPOJxRXM52IHKzJo9QnFE+bnWDF1CGd8Kj2CcXRTCcih2vyKPgJxc9MJyLHa/Ko+QnFzUwnIgds8ij7CcXLTCdiR2yPyp9QnMx0InbE9ij+CcXHTCdiR+zn6l8qcTHTidgRe9+jE7EiNismDunE0KMTsSI2KxYO6cQB3gmh+NfsBCsGDunEoUcnYkVsVuwb0okjj07EitismDekE8cenYgVsVmxbkgnTjw6Ee2JdeyIferRiVgRmxXbhnTizKMTsSI2K6YN6cS5RydiRWxWLBvSiQuPTsSK2KwYNqQTlx6diBWxWbFrSCeu8E4IxatmJ1gxa0AnavLoRKyIzYpVQzpRe3QiVsRmxaghnVjx6ESsiM2KTUM6serRiVgRmxWTyjoxKw7N2sShxfvo8tBsPHSDF/JQs22FaVtl2taYtnWmbYNp22Tatpi2baZth2nbZdr2mLZ9pm3ItB0wbYdM2xHTdsy0nTBtp0zbGdN2zrRdMG2XTNsV00bcjUDcnUDcrUDcvUDczUDc3UDc7UDc/UDcDUHcHUHcLUHcPUGNm2LWH/M570qvARWXfHn5pTa7XG7MeePTskH5wkfNtlWmbY1pW2faNpi2TaZti2nbZtp2mLZdpm2Padtn2oZM2wHTdsi0HTFtx0zbCdN2yrSdMW3nTNsF03bJtF0xbURcI3cnEHcrEHcvEHczEHc3EHc7EHc/EHdDEHdHEHdLEHdPEHdTEHdXEHdbEHdfEHdjEHdnEHdrEHdvEHdzEHd3EHd7EHd/EHeDEHeH1NwdUnN3SM3dIfX0Dun1zImwmPdEWIwJvnxxZdzW689MjlnzxZViPIdmbflg9nM2Tsz+v//3/2lJ1NS/Nl8rgeznoP3mGx+Q8UJkfB0zXoqMb2DGK5HxTcx4V2R8CzPeExnfxoz3RcZ3MOMDkfFd0I+WRdb3QOuomzYl5ph1mZMOQesyLz0Arcvc9BC0LvPTI9C6zFGPQesyTz0Brctc9RS0LvPVMzAmyXz1HLQu89UL0LrMVy9B6zJfvQKty3yVCDQvc1aqQfMybyUwEctl7kpoHibzVwIzsVzmsATmYoXMYwnMxgqZyxKYjxUynyUwIytkTktgTlYIvRbMygqh14J5WSH0WjAxK4ReC2ZmhdBrwdSsEHotmJuVQq8Fk7NS6LVgdlYKvRZMz0qh14L5WSn0WjBBK4VeC2ZopdBrwRStFHotmKOVQq8Fk7RS6LVgllbJvLYGs7RK5rU1mKVVMq+twSytknltDWZplbfXzpYny3mXJ0umPFmy5cm8WZ4ssfJk8ym1ZPhXMbA8CtgaBlZEAVvHwMooYBsYWCUEM0rMmxheN0rntjCwXhSwbQysHwVsBwMbRAHbBf16OQraHogWZxrZB9HizCNDEC3ORHIAosWZSQ5BNOlU0izHYmhxJpJjEC3OTHICosWZSk5BtDhzyRkYtuPMJecgWpy55AJEizOXXIJoceaSKxAtzlxCBMLFmUyoBuHizCYEJsp5nOmE0FQ5znxCYLKcx5lQCEyXizgzCoEJcxFnSiEwXy7izCkEZsxFnEmFwJy5iDSrgFlzEWlWAfPmItKsAibORaRZBcyci0izCpg6F5FmFTB3LiPNKmDyXEaaVcDsuYw0q4DpcxlpVgHz5zLSrAIm0GWkWQXMoMtIswqYQpeRZhUwhy4jzSpgEl1GmlXALLqKM6vUYBZdxZlVajCLruLMKjWYRVdxZpUazKKr4Flltvxfzbv8XzHl/4op/2dF49WNlfFp3uX/XFT+h8DMW00CtoaBmTeaBGwdAzNvMwnYBgZmhi4J2CYGZgYuDMx41rCF4ZmRS9K5bQzMjFsSsB0MzIxaErBd0K/NoCVB2wPR4kwj+yBanHlkCKLFmUgOQLQ4M8khiBZnKjkC0aRzSbP8j6HFmUlOQLQ4U8kpiBZnLjkDw3acueQcRIszl1yAaHHmkksQLc5ccgWixZlLiEC4OJMJ1SBcnNmEwESZKf+L4NBUOc58QmCyzJT/RXBgusyU/0VwYMLMlP9FcGDKzJT/RXBgxsyU/0VwYM7MlP9FcGDWzJT/RXBg3syU/0VwYOLMlP9FcGDmzJT/RXBg6syU/0VwYO7MlP9FcGDyzJT/RXBg9syU/0VwYPrMlP9FcGD+zJT/RXBgAs2U/0VwYAbNlP9FcGAKzZT/RXBgDs2U/0VwYBLNlP9FcGAWzZT/JXA1mEUz5X8RHJhFM+V/ERyYRTPlfxEcmEUz5X9PuNnyf3fe5f8uU/7vsur/oln+78rK/0fD0/3VHxo71f33zN8H5bvlvwl+tVWMk3lHJuS0hnEyb9uEnNYxTua9nZDTBsbJDKsJOW1inMzYG5UT86ADomXG6IRDtY1xMgN5Qk47GCcz2ifktAtOm2ZOkJDUHkhqrpP5PkhqrrP5ECQ11+n8ACQ11/n8ECQ11wn9CCSVeEZvPm7CSM11Pj8BSc11Qj8FSc11Rj8Dk865zujnIKm5zugXIKm5zuiXIKm5zuhXIKm5zuhEIKu5TulUg6zmOqcTuDxmHvqlZIUukOc6qxO4RGYeIaZkBS6SmSeNKVmBy2TmgWRKVuBCmXlumZIVuE5mHm+mZAWulJmnoClZgWtl5mFpSlbgapl5ppqSFbhcZh69pmQFrpeZJ7QpWYELZuZBbkpW4IqZed6bkhW4ZGYeC6dkBa6ZmafHKVmBi2bmIXNKVuCqmXkWnZIVuGxmHlmnZAWum5kn2ylZgQtn5gF4Slbgypl5Tp6SFbh0Zh6np2QFrp2Zp+4JWdXg2pl5OJ+SFbh2Zp7hp2QFrp2ZR/0pWYFrZ0YRkIbVrHCgN2/hQI8RDvRY4UDZFA700gkHKqlwAOIkcwMhpzWMk8wJhJzWMU4yFxBy2sA4yZIbIadNjJMstRFy2sI4yRIbmJMhZtjGaMkyG+FQ7WCcZHmNkNMuOG3K0hohqT2Q1Fwn832Q1Fxn8yFIaq7T+QFIaq7z+SFIaq4T+hFIaq4z+jFIKvGU3hQOYKTmOqGfgqTmOqOfgUnnXGf0c5DUXGf0C5DUXGf0S5DUXGf0K5DUXGd0IpDVXKd0qkFWc53TCVweC4UDUlboAnmuszqBS2ShcEDKClwkC4UDUlbgMlkoHJCyAhfKQuGAlBW4VBYKB6SswJWyUDggZQWulYXCASkrcLUsFA5IWYHLZaFwQMoKXC8LhQNSVuCCWSgckLICV8xC4YCUFbhkFgoHpKzANbNQOCBlBS6ahcIBKStw1SwUDkhZgctmoXBAygpcNwuFA1JW4MJZKByQsgJXzkLhgJQVuHQWCgekrMC1s1A4IGRVg2tnoXBAygpcOwuFA1JW4NpZKByQsgLXzkLhgD+rWeFAf97CgT4jHOizwoGqKRzopxMOdKXCAYiTzA2EnNYwTjInEHJaxzjJXEDIaQPjJEtuhJw2MU6y1EbIaQvjJEtshJy2MU6ytEbIaQfjJEtqYE6GwGIXnDZlaY1wrPZAUnOdzPdBUnOdzYcgqblO5wcgqbnO54cgqblO6EcgqbnO6McgqblO6ScgqbnO6acgqcSTelM4gCWdc53Rz0FSc53RL0BSc53RL0FSc53Rr0BSc53RiUBWc53SqQZZzXVOJ3B5LBQOSFmhC+S5zuoELpGFwgEpK3CRLBQOSFmBy2ShcEDKClwoC4UDUlbgUlkoHJCyAhfLQuGAlBW4XBYKB6SswNWyUDggZQUul4XCASkrcL0sFA5IWYELZqFwQMoKXDELhQNSVuCSWSgckLIC18xC4YCUFbhoFgoHpKzAVbNQOCBlBS6bhcIBKStw3SwUDkhZgQtnoXBAygpcOQuFA1JW4NJZKByQsgLXzkLhgJBVDa6dhcIBKStw7SwUDkhZgWtnoXBAygpcOwuFA/6sZoUDgzbhQPk+jy4cGDDCgQErHOg2hQMDmXCgMYAifQAEbd7t4dBrGLR5S4dDr2PQ5n0bDr2BQZuJRzj0JgZtZhfh0FsYtJlChENvY9BmnhAOvYNBm8lAOPQuOKWYIV+CbTzT3wPhU0xp+yB2ijltCGKnmNQOQOwUs9ohiJ1iWjsCsVPMa8cgdoqJ7QTETjGznYLYKaa2MzBliTO1NR8iY9gp5rULEDvFvHYJYqeY165A7BTzGhEInmJioxoETzGzEbgoYR7XRgBHlyUp5jYCFybMw9cI4ODShHnGGgEcXJwwj1IjgIPLE+aJaQRwcIHCPBiNAA4uUZjnnxHAwUUK85gzAji4TGGeZkYABxcpzEPLCODgKoV5NhkBHFymMI8gI4CD6xTmSWMEcHChwjxQjAAOrlSY54YRwMGlCvN4MAI4uFZhngJGAAcXK8zDvgjg4GqFeaYXARxcrjCP7iKAg+sV5gldBHBwwcI8iIsADq5YmOdt4eA1uGJhHqtFAAdXLMzTswjg4IqFeUgWARxcsTDPwoLAZx55lctzfuSlAZuPvMZt+XI+88ir13jkNT0t7JEX+ySxajxJ7AnfncU4Ou/llBzXMI7OWz4lx3WMo9MzUnLcwDg6U4SUHDcxjs5MIiXHLYyjM+FIyXEb4+jMS1Jy3ME4OtOXlBx3wTncmeakJLkHkpxzpDGemO6DPBcabYYgyYWGmwOQ5ELjzSFIcqEB5wgkudCIcwySXGjIOQFJLjTmnIIkFxp0zsCkfKFB5xwkudDlzQVIcqER5xIkudCIcwWSXGjEIQJZLjTkUA2yXGjMIbB84X44npQlWsBYaNQhsIThftyelCVYxHA/l0/KEixjuB/gJ2UJFjLcT/qTsgRLGW5JQFKWYDHDrR1IyhIsZ7hFBklZggUNtxohKUuwouGWLSRlCdYz3PqGpCzBgoZbCJGUJVjRcCsmkrIESxpuaUVSlmBNw63BSMoSLGq4xRpJWYJVDbeqIylLsKzhln8kZQnWNdw6kaQswcKGW1CSlCVY2XArT5KyBEsbbolKUpZgbcOtZUnJsgZrG27RS1KWYG3DrY5JyhKsbbhlNElZgrUNt94mEctZYU42503sNaAhzMlYYU6/KczJkHGN40h9qTAH4hjHjYQc1zCOcZxIyHEd4xjHhYQcNzCOcZI3IcdNjGOc1E3IcQvjGCdxE3LcxjjGSduEHHcwjnGSNiHHXXAOj5OzCUnugSTnHGkYYQ7Gc6HRZgiSXGi4OQBJLjTeHIIkFxpwjkCSC404xyDJhYacE5DkQmPOKUhyoUHnDEzKFxp0zkGSC13eXIAkFxpxLkGSC404VyDJhUYcIpDlQkMO1SDLhcYcAssXkYQ5UpZoAWOhUYfAEkYkYY6UJVjEiCTMkbIEyxiRhDlSlmAhI5IwR8oSLGVEEuZIWYLFjEjCHClLsJwRSZgjZQkWNCIJc6QswYpGJGGOlCVYz4gkzJGyBAsakYQ5UpZgRSOSMEfKEixpRBLmSFmCNY1IwhwpS7CoEUmYI2UJVjUiCXOkLMGyRiRhjpQlWNeIJMyRsgQLG5GEOVKWYGUjkjBHyhIsbUQS5khZgrWNSMIcIcsarG1EEuZIWYK1jUjCHClLsLYRSZgjZQnWNiIJc/xZzgpz8nkLc3JGmDNua3wkYtAU5uRxhDmNAW38vbuUiRQ5EDm3/6Qgt4aRc7tNCnLrGDm3t6Qgt4GRcydoKchtYuTceVkKclsYOXc6loLcNkbOnYWlILeDkXMnXynI7YKTsDvpSsFuD2S3mBixD7KbV5AwlD5DkOBiAsUByG4xkeIQZLeYUHEEsltMrDgG2S0mWJyA7BYTLU5BdosJF2dgWryYcHEOsltMuLgA2S1mTXEJsltMrLgC2S0mVhCB9BYTLKgG6S0mWhBYCAAkLknooaWAxcQLAosBgKglCT2wHACoWZLQAwsCgIwlCT2wJADoV5LQA4sCgHAlCT2wLAAoVpLQAwsDgFQlCT2wNABoVJLQA2sDgDglCT2wOACoUpLQA0sDgBwlCT2wNgDoUJLQA4sDgAAlCT2wOgAoT5LQA8sDgOQkCT2wPgBoTZLQAwsEgMgkCT2wQgCoS5LQA0sEgKwkCT2wRgDoSZLQA4sEgJAkCT2wSgAoSFLQq8EqASAdSUIPrBIAmpEk9MAqASAWSUIPrBIAKpHI9GblIcW8P6hUMPKQgpOHVMtNeUgxF3mISBwCUQt2FJE0BKIW7CQiYQhELdhBRLIQiFpwSiUShUDUgtMpkSQEohacSokEIRC14DRKJAeBqAWnUCIxCDblBudPIikIxm0R8WAf5LaIgDAEuc0nIhgSlQOQ3iKiwiHIbRFh4Qjktoi4cAxyW0RgOAG5LSIynILcFhEazsCUdxGh4RzktojQcAFyW0RouAS5LWKxcAVyW0RcIALJLSIwUA2SW0RkIHBRHy71kAk9MHKLiA0ELuzDZR4ykQdWdVhEdCBwcR8u8ZAJPDByi4gPBC7ww+UdMnEHRm4hEQJc5IdLO2TCDozcQiIEuM4Pl3XIRB0YuYVECHClHy7pkAk6sOLvQiIEuNAPl3PIxBwYuYVECHCpHy7lkAk5MHILiRDgYj9cxiETcWDkFhIhwOV+uIRDJuDAyC0kQoAL/nD5hky8gT2DW0SEqMEVf7h0QybcwMgtIkLU4Io/XLYhE21g5OYcIWYlG2WbZCO6XqNk9BrleJBmvrNTZU29RomMZbCHNP7eE27vAZEN9pgoZNcwssEeFIXsOkY22KOikN3AyAbnYFHIbmJkg3OyKGS3MLLBOVoUstsY2eCcLQrZHYxscA4XhewuGBSCk7oobPdAtn+NGLYPsv1rBLEhyHZRUYxRpmCE/xqR7BBk+9cIZUcg279GLDsG2f41gtkJyPavEc1OQbZ/jXB2Bi4b/hrh7Bxk+9cIZxcg279GOLsE2f41FmVXINu/RiwjAun+NYIZ1SDdv0Y0I7BQE67BiUMXLdX8NeIZgcWacJ1OHLpguSZcuROHLliwCdfyxKELlmzC1T1x6IJFm3C9Txy6YNkmXAEUhy5YuAnXBMWhC5ZuwlVCceiCtZtw3VAcumDxJlxJFIcuWL0J1xbFoQvWbsLVRnHogsWbcP1RHLpg9SZckRSHLli+CdcoxaEL1m/CVUtx6IIFnHAdUxy6YAUnXNkUhy5YwgnXOsWhC9ZwwtVPceiCRZxwPVQcumAVJ1whFYVuDVZxwjVTceiCVZxwFVUcumAVJ1xXFYcuWMUJV1qF0n3SXn24/300eli9frj+5acvo7vfRiujz5/v33y8/f5Vka/evmh9czf6VTln/iPt5Voz1fyHnvqHHvcPmb4k466p8/LHYV5yFxWZuqjI9D99eCamRvn266cb3enrz08ysYebr7+9uf/n41UrefUj7eaa9sdfj75/Hr15+Pe30c9vP6prt+7fvvl2d3N7d/Pwb/XzvH1z+210d/1wq360r7cPa//8fv357Zvrv9/+MaI/1D/8NnrUj410+8uGv98+PNx+efyjuv7jSA+T+vPd9dd/PP7hYfQv1fL2zad//br1SbeoH1/x/P75+peXP4f6Ncat6sd4pKr/wPXN2eWu7nLX3eViTl3O0ne5p7vcc3e5nFOX8/Rd7usu991drubU5SJ9lwe6ywN3l7tz6nKZvMuFmil3i9zd5d6culyl73Khu1y4u9z/XzN9FaXucunu8uB/zfRV6LhcADN2tvy/587WU3YBTNlZ9r/n1tZzdrkM9HleCVj6e7vMdJ8zoM/zysC66fusA1UJBKpsXilY+nyk1JGqBCJVNq8cbA4JybKewxB/nlcSln5BVerwXALhOZtXFhZj3la0vz4Mn8oFb34fXX9SrffTd6l+u7v5tHvzdcS0HI8eJm9X/a46/p/brw/Xn1cU5dHd81tVb1TnHm4+mv+glu/fVK/3ru9+u1HAn0e/6q4+fp357unFrae/PNx+0/2cjoz6oyY5utMnVFnWz7LlvOjm+XKpRv3X29sH/p/GeIr0929vvl2r0T2++c/oMZW6V/RGOsNQA/zrzcPJ7fnNp4ffH6Ee/zp5k0z9XZsY3j2if7r98+vJ76OvQ9VD9XPf3agOXutR/Pntt9u7h7vrmwfF+vP1x3/Q10/nv988jKZj8unuWvd28rqaun9Wbr98Udff67vl68yArn67UXOYpjYZyeeWj7ffbvQv81gMeRqV9ccBePPp5tdf1Wh/fVi/ubt/hpo2Dz99Wvvj+ZW5X366/fRp89GAulFe/Fn98cniU/P0zy/B1F//vL37x2O96Jf/H1BLAQIUAxQAAAAIAE2WuVzigiFYDQEAAIYGAAAaAAAAAAAAAAAAAACAAQAAAAB4bC9fcmVscy93b3JrYm9vay54bWwucmVsc1BLAQIUAxQAAAAIAE2WuVwjWo3P7gIAAM8GAAAPAAAAAAAAAAAAAACAAUUBAAB4bC93b3JrYm9vay54bWxQSwECFAMUAAAACABNlrlcO6HfCvQCAAACDQAAEwAAAAAAAAAAAAAAgAFgBAAAeGwvdGhlbWUvdGhlbWUxLnhtbFBLAQIUAxQAAAAIAE2WuVwAlPozNQwAAJ8vAQANAAAAAAAAAAAAAACAAYUHAAB4bC9zdHlsZXMueG1sUEsBAhQDFAAAAAgATZa5XAy/4GzUBQAANRoAABgAAAAAAAAAAAAAAIAB5RMAAHhsL3dvcmtzaGVldHMvc2hlZXQxLnhtbFBLAQIUAxQAAAAIAE2WuVz/IREx+w0AAHJjAAAYAAAAAAAAAAAAAACAAe8ZAAB4bC93b3Jrc2hlZXRzL3NoZWV0Mi54bWxQSwECFAMUAAAACABNlrlcwWs6GlkHAABGJAAAGAAAAAAAAAAAAAAAgAEgKAAAeGwvd29ya3NoZWV0cy9zaGVldDMueG1sUEsBAhQDFAAAAAgATZa5XJd2E5ZSCAAASS0AABgAAAAAAAAAAAAAAIABry8AAHhsL3dvcmtzaGVldHMvc2hlZXQ0LnhtbFBLAQIUAxQAAAAIAE2WuVwlTgDbshUAAHOVAAAYAAAAAAAAAAAAAACAATc4AAB4bC93b3Jrc2hlZXRzL3NoZWV0NS54bWxQSwECFAMUAAAACABNlrlcQBzXfEAUAAAVlQAAGAAAAAAAAAAAAAAAgAEfTgAAeGwvd29ya3NoZWV0cy9zaGVldDYueG1sUEsBAhQDFAAAAAgATZa5XFkLTTE2DwAAi2YAABgAAAAAAAAAAAAAAIABlWIAAHhsL3dvcmtzaGVldHMvc2hlZXQ3LnhtbFBLAQIUAxQAAAAIAE2WuVzfZAeQphoAACmDAAAUAAAAAAAAAAAAAACAAQFyAAB4bC9zaGFyZWRTdHJpbmdzLnhtbFBLAQIUAxQAAAAIAE2WuVyFmjSa7gAAAM4CAAALAAAAAAAAAAAAAACAAdmMAABfcmVscy8ucmVsc1BLAQIUAxQAAAAIAE2WuVytn0PKcQEAAO8CAAARAAAAAAAAAAAAAACAAfCNAABkb2NQcm9wcy9jb3JlLnhtbFBLAQIUAxQAAAAIAE2WuVxelgGP+wAAAJwBAAAQAAAAAAAAAAAAAACAAZCPAABkb2NQcm9wcy9hcHAueG1sUEsBAhQDFAAAAAgATZa5XOHWAICXAAAA8QAAABMAAAAAAAAAAAAAAIABuZAAAGRvY1Byb3BzL2N1c3RvbS54bWxQSwECFAMUAAAACABNlrlcOg8385IBAAD9CQAAEwAAAAAAAAAAAAAAgAGBkQAAW0NvbnRlbnRfVHlwZXNdLnhtbFBLAQIUAxQAAAAIAE2WuVyc316OCV8AACflBAAYAAAAAAAAAAAAAACAAUSTAAB4bC93b3Jrc2hlZXRzL3NoZWV0OC54bWxQSwUGAAAAABIAEgCrBAAAg/IAAAAA";
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
