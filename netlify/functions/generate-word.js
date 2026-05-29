// vantage-v52.C-logo-and-style-rules-native
// vantage-v50.5-calibration-fixes
// v50.5 (2026-04-29):
//  - Replicated server-side derivation block from generate-excel.js so
//    A.imv_1day, A.sae, etc. are recomputed from current sites/subj before vantageCalcMS_word.
//    Fixes Word log Mgmt Fee disagreeing with Excel ($741,750 vs $528,950 on OT01P201 Tigermed run).
//  - Milestone schedule now applies % to Mgmt Fee (was Total Proposal) : matches Excel MS sheet.
//
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
    //
    // CRITICAL: this block must stay byte-identical to the (function computeDerived)
    // block in generate-excel.js (~line 412). The two endpoints receive the same A from
    // the client, but generate-excel.js used to recompute imv_1day/sae/etc. while
    // generate-word.js used the stale client-derived values : causing Word to show
    // a different Mgmt Fee (e.g., $741,750 vs Excel's $528,950 on OT01P201 with subj=18 override).
    {
      // Server-side derived defaults (derive sites if missing : matches generate-excel.js)
      if (!A.kz_sites) {
        const is2bSites = /2b|phase\s*iib/i.test(A.phase || '');
        const is3Sites  = /phase\s*3|phase\s*iii/i.test(A.phase || '') && !is2bSites;
        const is2Sites  = /phase\s*2|phase\s*ii(?!i)/i.test(A.phase || '') || is2bSites;
        A.kz_sites = is3Sites ? 10 : is2Sites ? 5 : 3;
      }
      const sites    = Number(A.kz_sites);
      const enroll   = Number(A.enroll_mo)   || 6;
      const treat    = Number(A.treat_mo)    || 1;
      const followup = Number(A.followup_mo) || 2;
      const closeout = Number(A.closeout_mo) || 1;
      const startup  = Number(A.startup_mo)  || 4;
      const total    = startup + enroll + treat + followup + closeout;
      const subj     = Number(A.subj_enroll) || 100;

      const indStrW = String(A.indication || '').toLowerCase();
      const isOncoW   = /cancer|tumor|tumour|leukemia|lymphoma|myeloma|sarcoma|glioma|melanoma|oncol/i.test(indStrW);
      const isCardioW = /cardiac|heart|cardiomyopathy|arrhythmia|ami|heart failure/i.test(indStrW);
      const saeRateW   = isOncoW ? 0.30 : isCardioW ? 0.05 : 0.10;
      const susarRateW = isOncoW ? 0.10 : 0.05;

      const is2bD = /2b|phase\s*iib/i.test(A.phase || '');
      const is3D  = /phase\s*3|phase\s*iii/i.test(A.phase || '') && !is2bD;
      const is2D  = /phase\s*2|phase\s*ii(?!i)/i.test(A.phase || '') || is2bD;

      if (is3D) {
        A.imv_1day = Math.round(sites * enroll * 0.5 + sites * followup / 6);
        A.imv_2day = 0;
        A.rmv      = Math.round(sites * enroll * 0.5 + sites * followup / 6);
      } else if (is2D) {
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

      A.sae        = Math.round(subj * saeRateW * 3);
      A.susar      = Math.ceil(subj * susarRateW);
      A.sig_issues = Math.max(3, Math.round(sites * 0.5));

      A.tc_sponsor   = total * 2;
      A.tc_internal  = Math.round(A.tc_sponsor * 2);
      A.site_pay     = sites * Math.ceil(total / 3);
      A.periodic_saf = Math.max(1, Math.ceil(total / 12));

      A.sites_screen = Number(A.kz_sites) + 1;  // v50.7: +1 buffer (matches manual baselines)
      A.ctra         = sites;
      A.ec_annual    = Math.max(1, Math.ceil(total / 12));
      A.subj_screen  = Math.round(subj * 1.3);
    }

    function nA(k) { return Number(A[k]) || 0; }
    function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function fmtUSD(v) { return '$' + Math.round(Number(v)||0).toLocaleString('en-US'); }
    function fmtPct(v) { return ((Number(v)||0)*100).toFixed(1) + '%'; }

    const studyName = A.study_name || 'Unknown Study';
    const sponsor   = A.sponsor    || ':';
    const phase     = A.phase      || ':';
    const indication = A.indication || ':';
    const datePrep  = A.date_prepared || new Date().toISOString().slice(0,10);
    const totalMos  = (Number(A.startup_mo)||0)+(Number(A.enroll_mo)||0)+(Number(A.treat_mo)||0)+(Number(A.followup_mo)||0)+(Number(A.closeout_mo)||0);

    // ── Brand styling: Century Gothic, Vantage royal blue ─────────
// v52.C: Vantage logo PNG embedded as base64 (replaces the blue text bar at the top of each doc).
// Source: /mnt/project/vantage_logo_1.png. Royal blue V-chevron + "vantage" wordmark.
const LOGO_PNG_B64 = "/9j/4AAQSkZJRgABAgAAAQABAAD/wAARCACoAhQDACIAAREBAhEB/9sAQwAIBgYHBgUIBwcHCQkICgwUDQwLCwwZEhMPFB0aHx4dGhwcICQuJyAiLCMcHCg3KSwwMTQ0NB8nOT04MjwuMzQy/9sAQwEJCQkMCwwYDQ0YMiEcITIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMAAAERAhEAPwD3+iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAoopMjOKAFopM4ozxSTAWik3ADNGaYC0UUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUANIznPQUgOVJIxSkZZT2FMkJUO4+baMhfU4oAXK7eDxRnI615fqHxam0+/mtJtCffESDiTGR61W/4XQcZ/sF8f8AXT/61aqjUauosylWpq6b1PWQRkjdz6UgDA8muF8J/EWLxNqJs5bBrViMqS2c4rugeMDoKipCVN2krFJxkrpkg6UtNUEDk5p1SWwooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigBpzuHpSZw5BHBpx54o5I96APEPiro32HW4b6JT5dxndj1FefkDcuDxX0D8Q9IGqeGJyibpohlB/Ovn8pjIOeDj8R1r6XLKrqUuXseBj6XJPm7mnoGpNpOuW9yjYG4A/QmvpKzkWe1imU5DKCDXy2SoUgH5gQV+te7/AA51saloKwO+65gADr6elRm9C9OM10Ky2quflkdqCCKdSDFGRXzu57rFooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooJxSZAzz0oAWijNFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAQTxLPFJE4yrKQR9a+b/ABRpraR4kvLRgQrNmP8AGvpU46EV5R8XtGzBDq0Scx8OR2r0Mtr+yqpPZnBj6PtKd10PKAQDtYdehrufhnq/9m689tI3yXGBz7VxAwyZPQDINS2VzJaXkFyhIdHBH0zzX02IpqdJxPCpVHGafY+p1IIyOh5pay9C1BNS0q3uUbcHQc+9aW4EkDqOtfFzi4Scex9RTmqkVJDsUUgYZHvSkiotbU0t0FopobJI9KUEEZFCYC0Um4YJzwKMjJpgLRSZFLQAUUmRnGaMgmgBaKQkClzQAUUmQaM4IHrQAtFJkZoyDQAtFJkZNDMFGSeKAEIyCOnvSMAVIPTGSaVhkj071FOT5MoxgBDg/hQBH9usxkG5hA6HLgH8qfBd29yWEMqPs67TnFfIPiLUb5PEl8DdzAiQ4xIQMZ9K9Y+Al7c3Z1Xz53fbjAY5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";

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
            if (proc.category === 'Site Personnel and Visits' && (m.name.includes('flat fee') || m.name.includes('Recruiter'))) {
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
            lineItems.site.push({ category: 'Site Personnel and Visits', procedure: 'Principal Investigator flat fee : per site (' + piTier + ')', qty: sites, unitUsd: piFlatFeeUsd, probability: 1.0, totalUsd: sites * piFlatFeeUsd, confidence: 'HIGH' });
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

    // 1. Vantage logo image at top (v52.C: replaces the blue text bar)
    // Logo is embedded as media/image1.png via the docx zip below.
    body.push('<w:p><w:pPr><w:spacing w:before="0" w:after="120"/></w:pPr><w:r><w:rPr><w:noProof/></w:rPr><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="1828800" cy="685800"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="1" name="Vantage Logo"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="1" name="Vantage"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId100"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1828800" cy="685800"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>');
    body.push(`<w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="${BLUE}"/><w:spacing w:before="0" w:after="200"/></w:pPr><w:r>${rPr({color:'FFFFFF',size:20})}<w:t xml:space="preserve">Pricing Assumption Log</w:t></w:r></w:p>`);

    // 2. Study Header
    body.push(para(studyName, {bold:true, size:28, color:NAVY, spaceBefore:200, spaceAfter:60}));
    body.push(para(`${sponsor} . ${phase} . ${indication}`, {size:20, color:GRAY, spaceAfter:80}));
    body.push(para(`Prepared ${datePrep} . Vantage Clinical Trials`, {size:18, color:GRAY, spaceAfter:300}));

    // 3. Deal Structure context
    body.push(para('Deal Structure', {bold:true, size:24, color:BLUE, spaceBefore:200, spaceAfter:100}));
    if (isLocalCRO) {
      body.push(para(`This proposal uses Vantage as the prime contractor with a Local CRO performing clinical operations as a vendor pass-through. Vantage Management Services include a ${fmtPct(A.vendor_mgmt_premium_rate)} Vendor Management Premium on top of the MS subtotal envelope. Clinical Cost Contingency is set at ${fmtPct(A.clin_contingency)} of the procedure base. Clinical markup is ${A.markup}x the contingency-buffered cost.`, {size:18, color:NAVY, spaceAfter:200}));
    } else {
      body.push(para(`This proposal uses Vantage as a sub-contractor to Tigermed. Tigermed Target Management Services = ${fmtUSD(A.tigermed_target_ms)}; Tigermed Target Clinical Trial Services = ${fmtUSD(A.tigermed_target_clinical)}. Vendor Management Premium is zero in this structure (Tigermed manages the vendor relationship directly). Clinical Cost Contingency is set at ${fmtPct(A.clin_contingency)} (lower than Local CRO since Tigermed bears more execution risk). Clinical markup is ${A.markup}x.`, {size:18, color:NAVY, spaceAfter:200}));
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
    body.push(para('Note: Figures above are server-side estimates for cross-reference. The Excel model is the source of truth for invoice-grade numbers : open it to see the precise Vantage Management Fee, Vendor Management Premium calculation, and full milestone-aligned cash flow.', {size:16, color:GRAY, spaceBefore:120, spaceAfter:200}));

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
      ['Trial Start', `${startMoNames[(nA('start_mo')||1)-1]} ${nA('start_yr')||':'}`],
      ['Start-Up Phase', moStr(nA('startup_mo'))],
      ['Enrollment', moStr(nA('enroll_mo'))],
      ['Treatment', moStr(nA('treat_mo'))],
      ['Follow-Up', moStr(nA('followup_mo'))],
      ['Close-Out', moStr(nA('closeout_mo'))],
      ['Total Duration', moStr(totalMos)],
    ]));

    // 7. Sites and Subjects
    body.push(para('Sites and Subjects', {bold:true, size:24, color:BLUE, spaceBefore:200, spaceAfter:100}));
    body.push(kvTable([
      ['Kazakhstan Sites', String(nA('kz_sites'))],
      ['Sites Screened', String(nA('sites_screen') || Math.round(nA('kz_sites')*1.5))],
      ['Subjects Enrolled', String(nA('subj_enroll'))],
      ['Subjects Screened (computed = enrolled x 1.3)', String(Math.round(nA('subj_enroll')*1.3))],
    ]));

    // 8. Monitoring and Safety
    body.push(para('Monitoring and Safety', {bold:true, size:24, color:BLUE, spaceBefore:200, spaceAfter:100}));
    const saeRateLbl = tier === 'Oncology' ? '30%' : tier === 'Cardiology' ? '5%' : '10%';
    const susarRateLbl = tier === 'Oncology' ? '10%' : '5%';
    body.push(kvTable([
      ['IMV : 1 Day', String(nA('imv_1day'))],
      ['IMV : 2 Day', String(nA('imv_2day'))],
      ['Remote Monitoring Visits', String(nA('rmv'))],
      ['Site Initiation Visits', String(nA('siv'))],
      ['Site Close-Out Visits', String(nA('cov'))],
      [`SAE Reports (${saeRateLbl} x subjects x 3)`, String(nA('sae'))],
      [`SUSAR Reports (${susarRateLbl} x subjects)`, String(nA('susar'))],
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
      ['Clinical Services Markup', `${A.markup}x`],
      ['Clinical Revenue Upfront %', fmtPct(A.clin_upfront)],
      ['Clinical Cost Contingency', fmtPct(A.clin_contingency)],
      ['Vendor Management Premium Rate', fmtPct(A.vendor_mgmt_premium_rate)],
      ['PI Fee per Site', fmtUSD(A.pi_fee)],
      ['KZ In-Country Operations / Month', fmtUSD(A.kz_ops_mo)],
    ];
    if (dealStructure === 'Tigermed') {
      finRows.push(['Tigermed Target : Management Services', fmtUSD(A.tigermed_target_ms)]);
      finRows.push(['Tigermed Target : Clinical Trial Services', fmtUSD(A.tigermed_target_clinical)]);
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
      ['Travel and Accommodation (Month 1)', fmtUSD(A.travel_m1)],
      ['Legal and Compliance (Month 1)', fmtUSD(A.legal_m1)],
      ['Annual Compliance Audit', fmtUSD(A.audit_annual)],
    ];
    if (nA('referral_pct') > 0) {
      const refLabel = A.referral_name ? `Referral Partner (${A.referral_name})` : 'Referral Partner Commission';
      opexRows.push([refLabel, fmtPct(A.referral_pct)]);
    }
    body.push(kvTable(opexRows));

    // 14. Milestone Payment Schedule
    body.push(para('Milestone Payment Schedule', {bold:true, size:24, color:BLUE, spaceBefore:200, spaceAfter:100}));
    // v50.5: milestone % apply to Vantage Management Fee, NOT to Total Proposal.
    // (Excel MS sheet has always done this; Word was incorrectly using Total.)
    // The 100% milestones below sum to 100% of the Mgmt Fee, which is what gets paid out
    // to Vantage on its own schedule. Clinical Services Revenue follows a separate
    // schedule (10% upfront + 90% spread) handled in the Excel P&L tab.
    const milestoneBase = fin.mgmtFee;
    const msHeader = trXml([
      tcXml('Milestone',    {bold:true, color:'FFFFFF', bg:BLUE, w:2400}),
      tcXml('% of Mgmt Fee',{bold:true, color:'FFFFFF', bg:BLUE, w:1200}),
      tcXml('Amount (USD)', {bold:true, color:'FFFFFF', bg:BLUE, w:1800}),
      tcXml('Timing',       {bold:true, color:'FFFFFF', bg:BLUE, w:3672}),
    ]);
    const msBody = milestones.map((m,i)=>{
      const bg = i%2===0 ? LIGHT : null;
      return trXml([
        tcXml(m.lbl, {color:NAVY, bg, w:2400}),
        tcXml(m.pct + '%', {color:GRAY, bg, w:1200}),
        tcXml(fmtUSD(milestoneBase * m.pct/100), {color:NAVY, bg, w:1800}),
        tcXml(m.mo, {color:GRAY, bg, w:3672}),
      ]);
    });
    body.push(tableXml([msHeader, ...msBody], [2400, 1200, 1800, 3672]));

    // 15. Sensitivity Scenarios (Local CRO only)
    if (isLocalCRO) {
      body.push(para('Sensitivity Scenarios : Local CRO Quote', {bold:true, size:24, color:BLUE, spaceBefore:300, spaceAfter:100}));
      body.push(para('The Excel model includes scenario sensitivity at 100%, 85%, and 70% of the Local CRO envelope (assuming favourable negotiation). Refer to the Internal Overview tab for distributable margin and recommended monthly draws under each scenario.', {size:18, color:NAVY, spaceAfter:200}));
    }

    // 16. Source Model Reference
    const safeName = studyName.replace(/\s+/g,'_').replace(/[^A-Za-z0-9_-]/g,'').slice(0,40);
    body.push(para('Source Model', {bold:true, size:24, color:BLUE, spaceBefore:300, spaceAfter:100}));
    body.push(para(`Companion Excel file: Vantage_Pricing_${safeName}.xlsx`, {size:18, color:NAVY, spaceAfter:60}));
    body.push(para(`Baseline template: Vantage_Pricing_Model_Baseline_v2.xlsx (8 sheets : Cover, Assumptions, Vantage Output, Sponsor Output, Internal Overview, Management Services, Clinical Costs, Profit and Loss).`, {size:18, color:NAVY, spaceAfter:200}));

    // Footer
    body.push(para('', {spaceAfter:200}));
    body.push(para(`This document is auto-generated by the Vantage Pricing Engine. All assumptions should be reviewed and validated by a qualified clinical operations lead before use in sponsor proposals. The companion Excel model is the source of truth for all financial figures.`, {size:14, color:'888888', spaceAfter:0}));

    // ── Assemble OOXML ────────────────────────────────────────────
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
<w:body>${body.join('')}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;

    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

    const wordRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId100" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/></Relationships>`;

    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:styleId="Normal" w:default="1"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}"/><w:sz w:val="20"/></w:rPr></w:style></w:styles>`;

    const zip = new JSZip();
    zip.file('[Content_Types].xml', contentTypesXml);
    zip.file('_rels/.rels', rootRelsXml);
    zip.file('word/document.xml', documentXml);
    zip.file('word/styles.xml', stylesXml);
    zip.file('word/_rels/document.xml.rels', wordRelsXml);
    // v52.C: embed Vantage logo as media/image1.png
    zip.file('word/media/image1.png', Buffer.from(LOGO_PNG_B64, 'base64'));

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
