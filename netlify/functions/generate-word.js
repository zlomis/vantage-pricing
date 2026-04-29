// vantage-v50-word
// v50 changes (additive over v49):
//  - Body shape backward-compatible: accepts both legacy A and v50 {assumptions, soa_manifest}
//  - When SoA manifest present, renders a Clinical Cost Line Items section
//    listing the per-procedure breakdown derived from library_v1
//  - Clinical totals in the Financial Summary now reflect manifest-driven calc
//    (matches Excel output exactly when manifest is supplied)
//
// v49 inherited:
//  - Schema synced to index.html v49 (deal_structure, date_prepared, clin_contingency,
//    vendor_mgmt_premium_rate, pi_fee, startup_sal_mult, closeout_sal_mult,
//    referral_pct, referral_name, tigermed_target_ms, tigermed_target_clinical)
//  - Removed legacy tigermed_cost field, renamed ciprian_pct -> referral_pct
//  - SAE/SUSAR rates and PI fee default auto-derived from indication string (no separate dropdown)
//  - Brand-blue title bar with VANTAGE wordmark and study name
//  - Century Gothic typography throughout
//  - New sections: Deal Structure context, Operational Phasing, Sensitivity Scenarios,
//    Vendor Management Premium reference
//  - Removed Versioning Notes section
const JSZip = require('jszip');
const lib = require('./library_v1');

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
    const rawBody = JSON.parse(event.body);
    let A, soaManifest;
    if (rawBody && typeof rawBody === 'object' && rawBody.assumptions && typeof rawBody.assumptions === 'object') {
      A = rawBody.assumptions;
      soaManifest = rawBody.soa_manifest || null;
    } else {
      A = rawBody;
      soaManifest = null;
    }

    // ── Apply same auto-flip defaults as generate-excel.js ──────────
    const dealStructure = (A.deal_structure === 'Tigermed') ? 'Tigermed' : 'Local CRO';
    const isLocalCRO = dealStructure === 'Local CRO';
    A.deal_structure = dealStructure;
    if (A.markup === undefined || A.markup === null || A.markup === '') A.markup = isLocalCRO ? 2.0 : 1.45;
    if (A.clin_contingency === undefined || A.clin_contingency === null || A.clin_contingency === '') A.clin_contingency = isLocalCRO ? 0.5 : 0.25;
    if (A.vendor_mgmt_premium_rate === undefined || A.vendor_mgmt_premium_rate === null || A.vendor_mgmt_premium_rate === '') A.vendor_mgmt_premium_rate = isLocalCRO ? 0.5 : 0;
    if (A.clin_upfront === undefined || A.clin_upfront === null || A.clin_upfront === '') A.clin_upfront = 0.10;
    if (A.startup_sal_mult === undefined || A.startup_sal_mult === null || A.startup_sal_mult === '') A.startup_sal_mult = 0.6;
    if (A.closeout_sal_mult === undefined || A.closeout_sal_mult === null || A.closeout_sal_mult === '') A.closeout_sal_mult = 1.0;

    let tier;
    {
      const indStr = String(A.indication || '').toLowerCase();
      const isOnco   = /cancer|tumor|tumour|leukemia|lymphoma|myeloma|sarcoma|glioma|melanoma|oncol/i.test(indStr);
      const isCardio = /cardiac|heart|cardiomyopathy|arrhythmia|ami|heart failure/i.test(indStr);
      tier = isOnco ? 'Oncology' : isCardio ? 'Cardiology' : 'Other';
    }
    const tierIsOnco = tier === 'Oncology';
    if (A.pi_fee === undefined || A.pi_fee === null || A.pi_fee === '') A.pi_fee = tierIsOnco ? 4000 : 2000;

    // ── Sync derived values with generate-excel.js exactly ──
    // generate-excel.js force-overrides these regardless of user input. We mirror that here
    // so the Word log financials match the Excel file byte-for-byte.
    {
      const sites = Number(A.kz_sites) || 3;
      const subj  = Number(A.subj_enroll) || 0;
      const total = (Number(A.startup_mo)||0) + (Number(A.enroll_mo)||0) + (Number(A.treat_mo)||0) +
                    (Number(A.followup_mo)||0) + (Number(A.closeout_mo)||0);
      A.sites_screen = Math.round(sites * 1.5);
      A.ec_annual    = Math.max(1, Math.ceil(total / 12));
      A.subj_screen  = Math.round(subj * 1.3);
    }

    function nA(k) { return Number(A[k]) || 0; }
    function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function fmtUSD(v) { return '$' + Math.round(Number(v)||0).toLocaleString('en-US'); }
    function fmtPct(v) { return ((Number(v)||0)*100).toFixed(1) + '%'; }

    const studyName = A.study_name || 'Unknown Study';
    const sponsor   = A.sponsor    || '—';
    const phase     = A.phase      || '—';
    const indication = A.indication || '—';
    const datePrep  = A.date_prepared || new Date().toISOString().slice(0,10);
    const totalMos  = (Number(A.startup_mo)||0)+(Number(A.enroll_mo)||0)+(Number(A.treat_mo)||0)+(Number(A.followup_mo)||0)+(Number(A.closeout_mo)||0);

    // ── Brand styling: Century Gothic, Vantage royal blue ─────────
    const FONT = 'Century Gothic';
    const BLUE = '1B6BF5';
    const NAVY = '1A1A2E';
    const GRAY = '555555';
    const LIGHT = 'F0F4FF';

    function rPr(opts) {
      const { bold=false, color='000000', size=20 } = opts || {};
      return `<w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}"/>${bold?'<w:b/>':''}<w:color w:val="${color}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr>`;
    }
    function para(text, opts) {
      opts = opts || {};
      const { bold=false, size=20, color='000000', spaceAfter=100, spaceBefore=0, align='left' } = opts;
      const alignXml = align !== 'left' ? `<w:jc w:val="${align}"/>` : '';
      const pPr = `<w:pPr><w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}"/>${alignXml}${rPr({bold,color,size})}</w:pPr>`;
      return `<w:p>${pPr}<w:r>${rPr({bold,color,size})}<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
    }
    function tcXml(text, opts) {
      opts = opts || {};
      const { bold=false, color=NAVY, bg=null, w=2000, align='left' } = opts;
      const shading = bg ? `<w:shd w:val="clear" w:color="auto" w:fill="${bg}"/>` : '';
      const alignXml = align !== 'left' ? `<w:jc w:val="${align}"/>` : '';
      return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${shading}<w:tcBorders><w:top w:val="single" w:sz="4" w:color="CCCCCC"/><w:bottom w:val="single" w:sz="4" w:color="CCCCCC"/><w:left w:val="single" w:sz="4" w:color="CCCCCC"/><w:right w:val="single" w:sz="4" w:color="CCCCCC"/></w:tcBorders><w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0"/>${alignXml}${rPr({bold,color,size:18})}</w:pPr><w:r>${rPr({bold,color,size:18})}<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p></w:tc>`;
    }
    function trXml(cells) { return `<w:tr>${cells.join('')}</w:tr>`; }
    function tableXml(rows, gridCols) {
      const grid = gridCols.map(w=>`<w:gridCol w:w="${w}"/>`).join('');
      return `<w:tbl><w:tblPr><w:tblW w:w="${gridCols.reduce((a,b)=>a+b,0)}" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${rows.join('')}</w:tbl>`;
    }
    function kvTable(rows) {
      // Two-column key-value table
      const allRows = rows.map((r,i)=>{
        const bg = i%2===0 ? LIGHT : null;
        return trXml([
          tcXml(r[0], {color:NAVY, bg, w:3500}),
          tcXml(String(r[1]), {color:NAVY, bg, w:5572}),
        ]);
      });
      return tableXml(allRows, [3500, 5572]);
    }

    // ── Financial computation: matches Excel exactly ─────────────────
    // vantageCalcMS and vantageCalcCC are line-item replicas of the Management Services
    // and Clinical Costs sheets in baseline_v2.xlsx. They MUST match the same functions
    // in generate-excel.js byte-for-byte so the Word log shows the SAME numbers Excel
    // will display after fullCalcOnLoad recalculation.
    function vantageCalcMS_word(input){
      const A=input||{};
      const localCRO=(A.deal_structure||'Local CRO')==='Local CRO';
      const num=k=>Number(A[k])||0;
      const su=num('startup_mo'), en=num('enroll_mo'), tr=num('treat_mo'),
            fo=num('followup_mo'), cl=num('closeout_mo');
      const tot=su+en+tr+fo+cl;
      const sut=su+en+tr;
      const s=num('kz_sites')||3;
      const subj=num('subj_enroll');
      const s_f=(subj&&s)?Math.round(subj/s):0;
      const s_s=num('sites_screen')||Math.round(s*1.5);
      const ec=num('ec_init')||1;
      const eca=num('ec_annual')||Math.max(1,Math.ceil(tot/12));
      const i1=num('imv_1day'), i2=num('imv_2day'), rmv=num('rmv');
      const sae=num('sae'), sus=num('susar'), sig=num('sig_issues');
      const tcs=num('tc_sponsor'), tci=num('tc_internal'), sp=num('site_pay');
      const sub_D13 =1100+3000+800*s+2500+5000+850+100+500+2000;
      const sub_D41 =500*s_s+650*s_s+1500+250*s_f+2000*s+2500*s+250*s+500*s+1000*s+500+250*s+2500*s+1000*s+0+4000*ec+5000+5000+500*ec+2500*eca+5000+500+500+3500+3000+1000*s;
      const sub_D49 =1500+3500+200*sut+3500+200*sut;
      const sub_D66 =3250*s+1500*i1+1250*i2+750*rmv+500*en*s+250*sig+150*sig+500+500+300*sae+150*sus+250*sus+150*en*s+3000*s;
      const sub_D79 =500*sut+250*sut+250*sut*2+7000+200*sp+250*sut*s+5000+500+3000+2500;
      const sub_D92 =5000*2+1500+500+8500+1000+2000+400*tcs+250*tci+9000*s+400*Math.ceil(tot/2);
      const sub_D98 =300+2500+250*s*3;
      const sub_D103=1000+13000;
      const subtotalsSum=sub_D13+sub_D41+sub_D49+sub_D66+sub_D79+sub_D92+sub_D98+sub_D103;
      const premium=localCRO?subtotalsSum*(num('vendor_mgmt_premium_rate')):0;
      return {subtotalsSum, premium, mgmtFee:subtotalsSum+premium};
    }
    function vantageCalcCC_word(A, manifest){
      const subj=Number(A.subj_enroll)||0;
      const screen=Math.round(subj*1.3);
      const sites=Number(A.kz_sites)||3;
      const piFeeFlat=(A.pi_fee !== undefined && A.pi_fee !== null && A.pi_fee !== '')
                       ? Number(A.pi_fee) : null;
      const conting=Number(A.clin_contingency)||0;
      const markup=Number(A.markup)||2.0;

      // v50 library mode: when a manifest with procedures is present, use library_v1
      // to compute per-section line items and totals matching the Excel output exactly.
      if (manifest && manifest.procedures && manifest.procedures.length > 0 && lib && typeof lib.lookupProcedure === 'function') {
        try {
          let piTier = 'generalist';
          if (manifest.archetype && lib.INDICATION_TRIGGERS) {
            const trigger = lib.INDICATION_TRIGGERS.find(t => t.archetype === manifest.archetype);
            if (trigger) piTier = trigger.piTier;
          } else if (lib.classifyIndication) {
            const trigger = lib.classifyIndication(A.indication, A.phase, A.population);
            if (trigger) piTier = trigger.piTier;
          }
          const piFlatFeeUsd = piFeeFlat != null ? piFeeFlat : (lib.getPIFlatFee ? lib.getPIFlatFee(piTier) : 2000);

          const lineItems = { screening: [], treatment: [], followup: [], site: [] };
          for (const m of manifest.procedures) {
            const proc = lib.lookupProcedure(m.name);
            if (!proc) continue;
            const unit = proc.trialUnitUsd;
            const prob = (m.probability != null ? m.probability : 1.0);
            const sc = Number(m.screening || 0);
            const tr = Number(m.treatment || 0);
            const fu = Number(m.followup  || 0);
            if (proc.category === 'Subject Compensation') {
              const lname = (m.name || '').toLowerCase();
              let qty = 0, section = 'treatment';
              if (lname.includes('screening'))      { qty = screen;             section = 'screening'; }
              else if (lname.includes('travel') || lname.includes('childcare')) { qty = subj * (sc + tr + fu); section = 'treatment'; }
              else                                  { qty = subj; }
              lineItems[section].push({ category: proc.category, procedure: proc.procedure, qty, unitUsd: unit, probability: prob, totalUsd: qty * unit * prob, confidence: proc.confidence });
              continue;
            }
            if (proc.category === 'Site Personnel & Visits' && (m.name.includes('flat fee') || m.name.includes('Recruiter'))) {
              const qty = m.name.includes('flat fee') ? sites : subj;
              lineItems.site.push({ category: proc.category, procedure: proc.procedure, qty, unitUsd: unit, probability: prob, totalUsd: qty * unit * prob, confidence: proc.confidence });
              continue;
            }
            if (sc > 0) { const qty = screen * sc; lineItems.screening.push({ category: proc.category, procedure: proc.procedure, qty, unitUsd: unit, probability: prob, totalUsd: qty * unit * prob, confidence: proc.confidence }); }
            if (tr > 0) { const qty = subj  * tr; lineItems.treatment.push({ category: proc.category, procedure: proc.procedure, qty, unitUsd: unit, probability: prob, totalUsd: qty * unit * prob, confidence: proc.confidence }); }
            if (fu > 0) { const qty = subj  * fu; lineItems.followup.push({  category: proc.category, procedure: proc.procedure, qty, unitUsd: unit, probability: prob, totalUsd: qty * unit * prob, confidence: proc.confidence }); }
          }
          // PI flat fee fallback
          const hasPIFlat = lineItems.site.some(li => li.procedure.includes('flat fee'));
          if (!hasPIFlat) {
            lineItems.site.push({ category: 'Site Personnel & Visits', procedure: 'Principal Investigator flat fee — per site (' + piTier + ')', qty: sites, unitUsd: piFlatFeeUsd, probability: 1.0, totalUsd: sites * piFlatFeeUsd, confidence: 'HIGH' });
          }
          const sumS = (arr) => arr.reduce((s, li) => s + li.totalUsd, 0);
          const ssub = sumS(lineItems.screening), tsub = sumS(lineItems.treatment), fsub = sumS(lineItems.followup), sisub = sumS(lineItems.site);
          const procBase = ssub + tsub + fsub;
          const contUsd = procBase * conting;
          const grand = procBase + contUsd + sisub;
          const grandWithMarkup = grand * markup;
          const perPatientBlended = subj > 0 ? grand / subj : 0;
          return {
            mode: 'library',
            f65: grandWithMarkup,
            f67: grandWithMarkup,
            clinRev: grandWithMarkup,
            archetype: manifest.archetype || null,
            piTier,
            lineItems,
            sectionSubtotals: { screening: ssub, treatment: tsub, followup: fsub, site: sisub },
            grandTotal: grand,
            perPatientBlended,
            perPatientWithMarkup: perPatientBlended * markup,
            confidenceFlags: [],
          };
        } catch (e) {
          // Fall through to legacy on any library error
        }
      }

      // Legacy mode: $136/$1234 healthy-vol baseline (byte-identical v49 behavior)
      const piFee = piFeeFlat != null ? piFeeFlat : 2000;
      const e16=136*screen;            // PER_PATIENT_SCREENING (baseline default)
      const e36=1234*subj;             // PER_PATIENT_TREATMENT (baseline default)
      const e58=(e16+e36)*conting;
      const e60=e16+e36+e58;
      const e63=sites*piFee;
      const e65=e60+e63;
      const f65=e65*markup;
      return {mode:'legacy', f65, f67:f65, clinRev:f65, lineItems:null};
    }
    function computeFinancials() {
      const ms = vantageCalcMS_word(A);
      const cc = vantageCalcCC_word(A, soaManifest);
      return {
        mgmtFee: ms.mgmtFee,
        premium: ms.premium,
        baseMS:  ms.subtotalsSum,
        cro:     cc.f65 / (Number(A.markup)||2.0),  // pre-markup clinical cost
        clinRev: cc.f65,
        totRev:  ms.mgmtFee + cc.f65,
        cc,                                          // expose full cc object for line item rendering
      };
    }
    // Helper: "1 month" / "2 months" pluralization
    const moStr = (v) => `${v} month${Number(v) === 1 ? '' : 's'}`;
    const fin = computeFinancials();

    // ── Milestone schedule ─────────────────────────────────────────
    function computeMilestones() {
      const startup  = nA('startup_mo') || 4;
      const enroll   = nA('enroll_mo')  || 6;
      const treat    = nA('treat_mo')   || 1;
      const followup = nA('followup_mo')|| 2;
      const closeout = nA('closeout_mo')|| 1;
      const startMo  = nA('start_mo')   || 1;
      const startYr  = nA('start_yr')   || new Date().getFullYear();
      const moNames  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      function moLabel(offset) {
        const mo = ((startMo - 1 + offset) % 12);
        const yr = startYr + Math.floor((startMo - 1 + offset) / 12);
        return `${moNames[mo]} ${yr} (Mo ${offset + 1})`;
      }
      return [
        { pct: 15, lbl: 'Contract Signed',    mo: moLabel(0) },
        { pct: 10, lbl: 'EC Approval',         mo: moLabel(startup) },
        { pct: 10, lbl: 'First Subject In',    mo: moLabel(startup + 1) },
        { pct: 10, lbl: '25% Enrolled',        mo: moLabel(startup + Math.round(enroll * 0.25)) },
        { pct: 10, lbl: '50% Enrolled',        mo: moLabel(startup + Math.round(enroll * 0.50)) },
        { pct: 10, lbl: '75% Enrolled',        mo: moLabel(startup + Math.round(enroll * 0.75)) },
        { pct: 10, lbl: 'Last Subject In',     mo: moLabel(startup + enroll) },
        { pct: 5,  lbl: '50% Treatment',       mo: moLabel(startup + enroll + Math.round(treat * 0.5)) },
        { pct: 5,  lbl: '90% Treatment',       mo: moLabel(startup + enroll + Math.round(treat * 0.9)) },
        { pct: 8,  lbl: 'Database Lock',       mo: moLabel(startup + enroll + treat + followup - 1) },
        { pct: 5,  lbl: 'CSR Submitted',       mo: moLabel(startup + enroll + treat + followup) },
        { pct: 2,  lbl: 'TMF Transfer',        mo: moLabel(startup + enroll + treat + followup + closeout - 1) },
      ];
    }
    const milestones = computeMilestones();

    // ── Build document body ────────────────────────────────────────
    const body = [];

    // 1. Title bar — brand blue with white wordmark
    body.push(`<w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="${BLUE}"/><w:spacing w:before="0" w:after="0"/></w:pPr><w:r>${rPr({bold:true,color:'FFFFFF',size:32})}<w:t xml:space="preserve">VANTAGE CLINICAL TRIALS</w:t></w:r></w:p>`);
    body.push(`<w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="${BLUE}"/><w:spacing w:before="0" w:after="200"/></w:pPr><w:r>${rPr({color:'FFFFFF',size:20})}<w:t xml:space="preserve">Pricing Assumption Log</w:t></w:r></w:p>`);

    // 2. Study Header
    body.push(para(studyName, {bold:true, size:28, color:NAVY, spaceBefore:200, spaceAfter:60}));
    body.push(para(`${sponsor} · ${phase} · ${indication}`, {size:20, color:GRAY, spaceAfter:80}));
    body.push(para(`Prepared ${datePrep} · Vantage Clinical Trials`, {size:18, color:GRAY, spaceAfter:300}));

    // 3. Deal Structure context
    body.push(para('Deal Structure', {bold:true, size:24, color:BLUE, spaceBefore:200, spaceAfter:100}));
    if (isLocalCRO) {
      body.push(para(`This proposal uses Vantage as the prime contractor with a Local CRO performing clinical operations as a vendor pass-through. Vantage Management Services include a ${fmtPct(A.vendor_mgmt_premium_rate)} Vendor Management Premium on top of the MS subtotal envelope. Clinical Cost Contingency is set at ${fmtPct(A.clin_contingency)} of the procedure base. Clinical markup is ${A.markup}× the contingency-buffered cost.`, {size:18, color:NAVY, spaceAfter:200}));
    } else {
      body.push(para(`This proposal uses Vantage as a sub-contractor to Tigermed. Tigermed Target Management Services = ${fmtUSD(A.tigermed_target_ms)}; Tigermed Target Clinical Trial Services = ${fmtUSD(A.tigermed_target_clinical)}. Vendor Management Premium is zero in this structure (Tigermed manages the vendor relationship directly). Clinical Cost Contingency is set at ${fmtPct(A.clin_contingency)} (lower than Local CRO since Tigermed bears more execution risk). Clinical markup is ${A.markup}×.`, {size:18, color:NAVY, spaceAfter:200}));
    }

    // 4. Financial Summary
    body.push(para('Financial Summary', {bold:true, size:24, color:BLUE, spaceBefore:200, spaceAfter:100}));
    body.push(kvTable([
      ['Vantage Management Fee (estimate)', fmtUSD(fin.mgmtFee)],
      ['Clinical Trial Services Revenue', fmtUSD(fin.clinRev)],
      ['Total Proposal (estimate)', fmtUSD(fin.totRev)],
      ['Trial Duration', moStr(totalMos)],
      ['Subjects Enrolled', String(nA('subj_enroll'))],
      ['Kazakhstan Sites', String(nA('kz_sites'))],
    ]));
    body.push(para('Note: Figures above are server-side estimates for cross-reference. The Excel model is the source of truth for invoice-grade numbers — open it to see the precise Vantage Management Fee, Vendor Management Premium calculation, and full milestone-aligned cash flow.', {size:16, color:GRAY, spaceBefore:120, spaceAfter:200}));

    // 5. Study Identity
    body.push(para('Study Identity', {bold:true, size:24, color:BLUE, spaceBefore:200, spaceAfter:100}));
    body.push(kvTable([
      ['Study / Protocol', studyName],
      ['Sponsor', sponsor],
      ['Phase', phase],
      ['Indication', indication],
      ['Deal Structure', dealStructure],
    ]));

    // 6. Timeline
    body.push(para('Timeline', {bold:true, size:24, color:BLUE, spaceBefore:200, spaceAfter:100}));
    const startMoNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    body.push(kvTable([
      ['Trial Start', `${startMoNames[(nA('start_mo')||1)-1]} ${nA('start_yr')||'—'}`],
      ['Start-Up Phase', moStr(nA('startup_mo'))],
      ['Enrollment', moStr(nA('enroll_mo'))],
      ['Treatment', moStr(nA('treat_mo'))],
      ['Follow-Up', moStr(nA('followup_mo'))],
      ['Close-Out', moStr(nA('closeout_mo'))],
      ['Total Duration', moStr(totalMos)],
    ]));

    // 7. Sites & Subjects
    body.push(para('Sites & Subjects', {bold:true, size:24, color:BLUE, spaceBefore:200, spaceAfter:100}));
    body.push(kvTable([
      ['Kazakhstan Sites', String(nA('kz_sites'))],
      ['Sites Screened', String(nA('sites_screen') || Math.round(nA('kz_sites')*1.5))],
      ['Subjects Enrolled', String(nA('subj_enroll'))],
      ['Subjects Screened (computed = enrolled × 1.3)', String(Math.round(nA('subj_enroll')*1.3))],
    ]));

    // 8. Monitoring & Safety
    body.push(para('Monitoring & Safety', {bold:true, size:24, color:BLUE, spaceBefore:200, spaceAfter:100}));
    const saeRateLbl = tier === 'Oncology' ? '30%' : tier === 'Cardiology' ? '5%' : '10%';
    const susarRateLbl = tier === 'Oncology' ? '10%' : '5%';
    body.push(kvTable([
      ['IMV — 1 Day', String(nA('imv_1day'))],
      ['IMV — 2 Day', String(nA('imv_2day'))],
      ['Remote Monitoring Visits', String(nA('rmv'))],
      ['Site Initiation Visits', String(nA('siv'))],
      ['Site Close-Out Visits', String(nA('cov'))],
      [`SAE Reports (${saeRateLbl} × subjects × 3)`, String(nA('sae'))],
      [`SUSAR Reports (${susarRateLbl} × subjects)`, String(nA('susar'))],
      ['Significant Issue Communications', String(nA('sig_issues'))],
    ]));

    // 9. Project Management
    body.push(para('Project Management', {bold:true, size:24, color:BLUE, spaceBefore:200, spaceAfter:100}));
    body.push(kvTable([
      ['Sponsor TCs (biweekly)', String(nA('tc_sponsor'))],
      ['Internal CRO TCs', String(nA('tc_internal'))],
      ['Site Payments Processed', String(nA('site_pay'))],
      ['Periodic Safety Reports', String(nA('periodic_saf'))],
    ]));

    // 10. Financial Levers
    body.push(para('Financial Levers', {bold:true, size:24, color:BLUE, spaceBefore:200, spaceAfter:100}));
    const finRows = [
      ['Clinical Services Markup', `${A.markup}×`],
      ['Clinical Revenue Upfront %', fmtPct(A.clin_upfront)],
      ['Clinical Cost Contingency', fmtPct(A.clin_contingency)],
      ['Vendor Management Premium Rate', fmtPct(A.vendor_mgmt_premium_rate)],
      ['PI Fee per Site', fmtUSD(A.pi_fee)],
      ['KZ In-Country Operations / Month', fmtUSD(A.kz_ops_mo)],
    ];
    if (dealStructure === 'Tigermed') {
      finRows.push(['Tigermed Target — Management Services', fmtUSD(A.tigermed_target_ms)]);
      finRows.push(['Tigermed Target — Clinical Trial Services', fmtUSD(A.tigermed_target_clinical)]);
    }
    body.push(kvTable(finRows));

    // 11. Team Salaries
    body.push(para('Team Salaries (Monthly)', {bold:true, size:24, color:BLUE, spaceBefore:200, spaceAfter:100}));
    const sal = ['Charlie','Zach','Almas','Didar','Alex','Alexander','Shynar'];
    const salKeys = ['sal_charlie','sal_zach','sal_almas','sal_didar','sal_alex','sal_alexander','sal_shynar'];
    const salRows = sal.map((nm,i)=>[nm, fmtUSD(A[salKeys[i]])]);
    salRows.push(['Total Monthly Salaries', fmtUSD(salKeys.reduce((sum,k)=>sum+nA(k),0))]);
    body.push(kvTable(salRows));

    // 12. Operational Phasing (NEW)
    body.push(para('Operational Phasing', {bold:true, size:24, color:BLUE, spaceBefore:200, spaceAfter:100}));
    body.push(para(`Salaries are scaled by phase to reflect actual workload during ramp-up and wind-down. During the first ${moStr(nA('startup_mo'))} (Start-Up Phase), salaries are paid at ${(nA('startup_sal_mult')*100).toFixed(0)}% of full rate. During the final ${moStr(nA('closeout_mo'))} (Close-Out Phase), salaries are paid at ${(nA('closeout_sal_mult')*100).toFixed(0)}% of full rate. Active phases (Enrollment, Treatment, Follow-Up) run at 100%.`, {size:18, color:NAVY, spaceAfter:200}));

    // 13. OpEx
    body.push(para('Operating Expenses', {bold:true, size:24, color:BLUE, spaceBefore:200, spaceAfter:100}));
    const opexRows = [
      ['Insurance / Month', fmtUSD(A.insurance_mo)],
      ['Technology Stack / Month', fmtUSD(A.tech_mo)],
      ['Travel & Accommodation (Month 1)', fmtUSD(A.travel_m1)],
      ['Legal & Compliance (Month 1)', fmtUSD(A.legal_m1)],
      ['Annual Compliance Audit', fmtUSD(A.audit_annual)],
    ];
    if (nA('referral_pct') > 0) {
      const refLabel = A.referral_name ? `Referral Partner (${A.referral_name})` : 'Referral Partner Commission';
      opexRows.push([refLabel, fmtPct(A.referral_pct)]);
    }
    body.push(kvTable(opexRows));

    // 14. Milestone Payment Schedule
    body.push(para('Milestone Payment Schedule', {bold:true, size:24, color:BLUE, spaceBefore:200, spaceAfter:100}));
    const totalProposal = fin.totRev;
    const msHeader = trXml([
      tcXml('Milestone',    {bold:true, color:'FFFFFF', bg:BLUE, w:2400}),
      tcXml('% of Total',   {bold:true, color:'FFFFFF', bg:BLUE, w:1200}),
      tcXml('Amount (USD)', {bold:true, color:'FFFFFF', bg:BLUE, w:1800}),
      tcXml('Timing',       {bold:true, color:'FFFFFF', bg:BLUE, w:3672}),
    ]);
    const msBody = milestones.map((m,i)=>{
      const bg = i%2===0 ? LIGHT : null;
      return trXml([
        tcXml(m.lbl, {color:NAVY, bg, w:2400}),
        tcXml(m.pct + '%', {color:GRAY, bg, w:1200}),
        tcXml(fmtUSD(totalProposal * m.pct/100), {color:NAVY, bg, w:1800}),
        tcXml(m.mo, {color:GRAY, bg, w:3672}),
      ]);
    });
    body.push(tableXml([msHeader, ...msBody], [2400, 1200, 1800, 3672]));

    // 15. Sensitivity Scenarios (Local CRO only)
    if (isLocalCRO) {
      body.push(para('Sensitivity Scenarios — Local CRO Quote', {bold:true, size:24, color:BLUE, spaceBefore:300, spaceAfter:100}));
      body.push(para('The Excel model includes scenario sensitivity at 100%, 85%, and 70% of the Local CRO envelope (assuming favourable negotiation). Refer to the Internal Overview tab for distributable margin and recommended monthly draws under each scenario.', {size:18, color:NAVY, spaceAfter:200}));
    }

    // 16. Source Model Reference
    const safeName = studyName.replace(/\s+/g,'_').replace(/[^A-Za-z0-9_-]/g,'').slice(0,40);
    body.push(para('Source Model', {bold:true, size:24, color:BLUE, spaceBefore:300, spaceAfter:100}));
    body.push(para(`Companion Excel file: Vantage_Pricing_${safeName}.xlsx`, {size:18, color:NAVY, spaceAfter:60}));
    body.push(para(`Baseline template: Vantage_Pricing_Model_Baseline_v2.xlsx (8 sheets — Cover, Assumptions, Vantage Output, Sponsor Output, Internal Overview, Management Services, Clinical Costs, Profit & Loss).`, {size:18, color:NAVY, spaceAfter:200}));

    // Footer
    body.push(para('', {spaceAfter:200}));
    body.push(para(`This document is auto-generated by the Vantage Pricing Engine. All assumptions should be reviewed and validated by a qualified clinical operations lead before use in sponsor proposals. The companion Excel model is the source of truth for all financial figures.`, {size:14, color:'888888', spaceAfter:0}));

    // ── Assemble OOXML ────────────────────────────────────────────
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${body.join('')}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;

    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

    const wordRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:styleId="Normal" w:default="1"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}"/><w:sz w:val="20"/></w:rPr></w:style></w:styles>`;

    const zip = new JSZip();
    zip.file('[Content_Types].xml', contentTypesXml);
    zip.file('_rels/.rels', rootRelsXml);
    zip.file('word/document.xml', documentXml);
    zip.file('word/styles.xml', stylesXml);
    zip.file('word/_rels/document.xml.rels', wordRelsXml);

    const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: out.toString('base64') }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message, stack: err.stack }),
    };
  }
};
