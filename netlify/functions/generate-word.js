// vantage-v37-word
const JSZip = require('jszip');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {
    const A = JSON.parse(event.body);

    const GROUPS_ORDER = ['Study Identity','Timeline','Sites & Subjects','Regulatory','Monitoring','PM & Safety','Financial','Team Salaries','OpEx'];

    const FIELDS = [
      {k:"study_name",    lbl:"Study Name / Protocol",                     grp:"Study Identity",   t:"text"},
      {k:"sponsor",       lbl:"Sponsor",                                    grp:"Study Identity",   t:"text"},
      {k:"phase",         lbl:"Phase",                                      grp:"Study Identity",   t:"text"},
      {k:"indication",    lbl:"Indication / Disease Area",                  grp:"Study Identity",   t:"text"},
      {k:"est_start",     lbl:"Estimated Start",                            grp:"Study Identity",   t:"text"},
      {k:"start_mo",      lbl:"Trial Start Month (1=Jan 12=Dec)",           grp:"Timeline",         t:"number", note:"e.g. 4 = April"},
      {k:"start_yr",      lbl:"Trial Start Year",                           grp:"Timeline",         t:"number", note:"Four-digit year"},
      {k:"startup_mo",    lbl:"Start-Up Phase (months)",                    grp:"Timeline",         t:"number", note:"Site selection, regulatory submissions"},
      {k:"enroll_mo",     lbl:"Enrollment / Recruitment (months)",          grp:"Timeline",         t:"number", note:"Active patient recruitment window"},
      {k:"treat_mo",      lbl:"Treatment Period (months)",                  grp:"Timeline",         t:"number", note:"Last patient in to last patient treatment complete"},
      {k:"followup_mo",   lbl:"Follow-Up Period (months)",                  grp:"Timeline",         t:"number"},
      {k:"closeout_mo",   lbl:"Close-Out Period (months)",                  grp:"Timeline",         t:"number", note:"Data lock, CSR, TMF transfer"},
      {k:"kz_sites",      lbl:"Kazakhstan Sites Initiated",                 grp:"Sites & Subjects", t:"number", note:"Full Vantage-managed sites"},
      {k:"sites_feas",    lbl:"Sites Feasibility Assessed",                 grp:"Sites & Subjects", t:"number"},
      {k:"sites_screen",  lbl:"Sites Screened",                             grp:"Sites & Subjects", t:"number"},
      {k:"subj_screen",   lbl:"Subjects Screened",                          grp:"Sites & Subjects", t:"number"},
      {k:"subj_enroll",   lbl:"Subjects Enrolled",                          grp:"Sites & Subjects", t:"number"},
      {k:"ec_init",       lbl:"Ethics Committee Initial Submissions",       grp:"Regulatory",       t:"number", note:"One submission for Kazakhstan"},
      {k:"ec_annual",     lbl:"Ethics Committee Annual Reports",            grp:"Regulatory",       t:"number", note:"One per year while trial is active"},
      {k:"ctra",          lbl:"CTRAs Executed",                             grp:"Regulatory",       t:"number", note:"One per Kazakhstan site"},
      {k:"imv_1day",      lbl:"Interim Monitoring Visit - 1 Day",           grp:"Monitoring",       t:"number", note:"Computed from phase/sites/timeline"},
      {k:"imv_2day",      lbl:"Interim Monitoring Visits 2 Days",           grp:"Monitoring",       t:"number"},
      {k:"rmv",           lbl:"Remote Monitoring Visits",                   grp:"Monitoring",       t:"number", note:"Computed from phase/sites/timeline"},
      {k:"siv",           lbl:"Site Initiation Visits",                     grp:"Monitoring",       t:"number", note:"= sites initiated"},
      {k:"cov",           lbl:"Site Close-Out Visits",                      grp:"Monitoring",       t:"number"},
      {k:"co_mon",        lbl:"Co-Monitoring Visits",                       grp:"Monitoring",       t:"number"},
      {k:"tmf_qc",        lbl:"TMF QC Visits",                              grp:"Monitoring",       t:"number"},
      {k:"sae",           lbl:"SAE Reports",                                grp:"Monitoring",       t:"number"},
      {k:"susar",         lbl:"SUSAR Reports",                              grp:"Monitoring",       t:"number"},
      {k:"sig_issues",    lbl:"Significant Issue Communications",           grp:"Monitoring",       t:"number"},
      {k:"tc_sponsor",    lbl:"Teleconferences with Sponsor",               grp:"PM & Safety",      t:"number"},
      {k:"tc_internal",   lbl:"Internal CRO Project TCs",                   grp:"PM & Safety",      t:"number"},
      {k:"site_pay",      lbl:"Site Payments Processed",                    grp:"PM & Safety",      t:"number", note:"Quarterly x sites"},
      {k:"periodic_saf",  lbl:"Periodic Safety Reports",                    grp:"PM & Safety",      t:"number"},
      {k:"tigermed_cost", lbl:"Tigermed CRO Quote (USD)",                   grp:"Financial",        t:"number", note:"From Budget Summary page"},
      {k:"markup",        lbl:"Clinical Services Markup Multiple",          grp:"Financial",        t:"number", note:"Revenue = Tigermed x Markup"},
      {k:"clin_upfront",  lbl:"Clinical Revenue Upfront % at signing",      grp:"Financial",        t:"number", note:"Portion billed at contract signing"},
      {k:"kz_ops_mo",     lbl:"KZ In-Country Operations per Month",         grp:"Financial",        t:"number", note:"Active during startup and enrollment"},
      {k:"sal_charlie",   lbl:"Charlie salary monthly USD",                 grp:"Team Salaries",    t:"number"},
      {k:"sal_zach",      lbl:"Zach salary monthly USD",                    grp:"Team Salaries",    t:"number"},
      {k:"sal_almas",     lbl:"Almas salary monthly USD",                   grp:"Team Salaries",    t:"number"},
      {k:"sal_didar",     lbl:"Didar salary monthly USD",                   grp:"Team Salaries",    t:"number"},
      {k:"sal_alex",      lbl:"Alex salary monthly USD",                    grp:"Team Salaries",    t:"number"},
      {k:"sal_alexander", lbl:"Alexander salary monthly USD",               grp:"Team Salaries",    t:"number"},
      {k:"sal_shynar",    lbl:"Shynar salary monthly USD",                  grp:"Team Salaries",    t:"number"},
      {k:"ciprian_pct",   lbl:"Ciprian Commission Rate",                    grp:"OpEx",             t:"number", note:"Applied to all revenue each month"},
      {k:"insurance_mo",  lbl:"Insurance monthly USD",                      grp:"OpEx",             t:"number"},
      {k:"tech_mo",       lbl:"Technology Stack monthly USD",               grp:"OpEx",             t:"number"},
      {k:"travel_m1",     lbl:"Travel and Accommodation Month 1",           grp:"OpEx",             t:"number"},
      {k:"legal_m1",      lbl:"Legal and Compliance Month 1",               grp:"OpEx",             t:"number"},
      {k:"audit_annual",  lbl:"Annual Compliance Audit",                    grp:"OpEx",             t:"number", note:"Fires every 12 months"},
    ];

    const dollarKeys = ['tigermed_cost','sal_charlie','sal_zach','sal_almas','sal_didar',
      'sal_alex','sal_alexander','sal_shynar','kz_ops_mo','insurance_mo','tech_mo','travel_m1','legal_m1','audit_annual'];
    const pctKeys = ['markup','clin_upfront','ciprian_pct'];
    const extractedKeys = ['study_name','sponsor','phase','indication','start_mo','start_yr',
      'startup_mo','enroll_mo','treat_mo','followup_mo','closeout_mo','subj_enroll','ec_init','tigermed_cost'];

    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function formatVal(field, val) {
      if (val === null || val === undefined || val === '') return '—';
      if (field.t === 'number') {
        const n = Number(val);
        if (isNaN(n)) return String(val);
        if (dollarKeys.includes(field.k)) return '$' + n.toLocaleString('en-US');
        if (pctKeys.includes(field.k)) return (n * 100).toFixed(1) + '%';
        return n.toLocaleString('en-US');
      }
      return String(val);
    }

    function sourceLabel(k) {
      const overrides = A._overrideNotes || [];
      if (overrides.some(n => n.toLowerCase().includes(k.replace(/_/g,' ')))) return 'Protocol signal';
      return extractedKeys.includes(k) ? 'Extracted' : 'Formula default';
    }

    function getRationale(k) {
      const sites   = Number(A.kz_sites) || 3;
      const enroll  = Number(A.enroll_mo) || 8;
      const treat   = Number(A.treat_mo) || 4;
      const followup= Number(A.followup_mo) || 1;
      const startup = Number(A.startup_mo) || 4;
      const closeout= Number(A.closeout_mo) || 2;
      const total   = startup + enroll + treat + followup + closeout;
      const subj    = Number(A.subj_enroll) || 30;
      const phase   = String(A.phase || '');
      const is3     = /phase\s*3|phase\s*iii/i.test(phase) && !/2b/i.test(phase);
      const is2     = /phase\s*2|phase\s*ii(?!i)|2b/i.test(phase);
      const ind     = String(A.indication || '').toLowerCase();
      const isOnco  = /cancer|tumor|tumour|leukemia|lymphoma|myeloma|sarcoma|glioma|melanoma|oncol/i.test(ind);
      const isCardio= /cardiac|heart|cardiomyopathy|arrhythmia|ami|heart failure/i.test(ind);
      const saeRate = isOnco ? '30%' : isCardio ? '5%' : '10%';
      const susarRate = isOnco ? '10%' : '5%';
      const phaseLbl = is3 ? 'Phase 3' : is2 ? 'Phase 2' : 'Phase 1/1b';
      const map = {
        study_name:   'Extracted from protocol title page.',
        sponsor:      'Extracted from protocol title page.',
        phase:        `Extracted from protocol. Determines phase-tiered formula defaults for monitoring, SAE/SUSAR rates, and timeline.`,
        indication:   `Extracted from protocol. Determines SAE rate tier: oncology ${saeRate}, cardiology 5%, other 10%.`,
        est_start:    'Display only — not used in calculations.',
        start_mo:     'Extracted if explicitly stated in protocol; otherwise defaults to April (month 4).',
        start_yr:     'Extracted if explicitly stated; otherwise defaults to current year.',
        startup_mo:   `${startup} month${startup !== 1 ? 's' : ''}. Covers site selection, CTRA execution, EC and regulatory submissions, SIV, and site activation.`,
        enroll_mo:    `${enroll} month${enroll !== 1 ? 's' : ''}. Extracted from protocol if explicitly stated. Active patient recruitment window.`,
        treat_mo:     `${treat} month${treat !== 1 ? 's' : ''}. Extracted if stated. Last-patient-in to last-patient-treatment-complete.`,
        followup_mo:  `${followup} month${followup !== 1 ? 's' : ''}. Post-treatment data collection before database lock.`,
        closeout_mo:  `${closeout} month${closeout !== 1 ? 's' : ''}. TMF reconciliation, data lock, CSR submission and archiving.`,
        kz_sites:     `${sites} sites. ${is3 ? 'Phase 3 default = 10.' : is2 ? 'Phase 2 default = 5.' : 'Phase 1/1b default = 3.'} Adjust manually per sponsor scope.`,
        sites_feas:   `Formula: KZ sites x 2 = ${sites * 2}. Standard practice — assess twice the planned sites as fallback.`,
        sites_screen: `Formula: KZ sites x 1.5 = ${Math.round(sites * 1.5)}. Sites proceeding from feasibility to screening.`,
        subj_screen:  `Formula: enrolled x 1.3 = ${Math.round(subj * 1.3)}. ~23% screen failure rate — conservative for oncology inclusion/exclusion criteria.`,
        subj_enroll:  `${subj} subjects. Extracted from protocol (global randomised/enrolled count).`,
        ec_init:      'Single submission to Kazakhstan Central Bioethics Commission covers national approval.',
        ec_annual:    `Formula: CEILING(${total} months / 12) = ${Math.max(1, Math.ceil(total/12))}. One annual progress report per calendar year of active conduct.`,
        ctra:         `Formula: = KZ sites = ${sites}. One Clinical Trial Research Agreement per initiated site.`,
        imv_1day:     is3
          ? `Formula (Ph3): sites x enroll x 0.5 + sites x followup / 6 = ${sites} x ${enroll} x 0.5 + ${sites} x ${followup} / 6 = ${Number(A.imv_1day)||0}.`
          : is2
          ? `Formula (Ph2): (treat x 2 + enroll + followup) x sites = (${treat} x 2 + ${enroll} + ${followup}) x ${sites} = ${Number(A.imv_1day)||0}.`
          : `Formula (Ph1/1b): sites x (enroll + followup) + sites x treat x 0.5 = ${sites} x (${enroll} + ${followup}) + ${sites} x ${treat} x 0.5 = ${Number(A.imv_1day)||0}.`,
        imv_2day:     is2
          ? `Formula (Ph2): CEILING(treat / 2) x sites = CEILING(${treat} / 2) x ${sites} = ${Number(A.imv_2day)||0}. Extended visits for source data verification.`
          : `0. Not applicable for ${phaseLbl} under Tigermed methodology.`,
        rmv:          is3
          ? `Formula (Ph3): mirrors IMV = ${Number(A.rmv)||0}.`
          : is2
          ? `Formula (Ph2): sites x (enroll + treat + followup) x 0.5 = ${sites} x (${enroll} + ${treat} + ${followup}) x 0.5 = ${Number(A.rmv)||0}.`
          : `Formula (Ph1/1b): mirrors IMV = ${Number(A.rmv)||0}.`,
        siv:          `Formula: = KZ sites = ${sites}. One site initiation visit per site before first patient enrolled (GCP requirement).`,
        cov:          `Formula: = KZ sites = ${sites}. One close-out visit per site at study completion.`,
        co_mon:       `Formula: = KZ sites = ${sites}. Senior CRA accompanies primary monitor for quality oversight.`,
        tmf_qc:       `Formula: ROUND(${total} / 6) = ${Math.max(1, Math.round(total/6))}. TMF quality check every 6 months.`,
        sae:          `Formula: subjects x rate x 3 = ${subj} x ${saeRate} x 3 = ${Number(A.sae)||0}. ${isOnco ? 'Oncology rate.' : isCardio ? 'Cardiology rate.' : 'Standard rate.'} x3 multiplier for follow-up reports per event.`,
        susar:        `Formula: subjects x rate = ${subj} x ${susarRate} = ${Number(A.susar)||0}. ${isOnco ? 'Oncology rate (10%).' : 'Standard rate (5%).'}`,
        sig_issues:   `Formula: MAX(3, ROUND(sites x 0.5)) = ${Math.max(3, Math.round(sites * 0.5))}. Floor of 3 applied regardless of site count.`,
        tc_sponsor:   `Formula: total months x 2 = ${total} x 2 = ${Number(A.tc_sponsor)||0}. Biweekly cadence throughout study.`,
        tc_internal:  `Formula: TC Sponsor x 2 = ${Number(A.tc_sponsor)||0} x 2 = ${Number(A.tc_internal)||0}. Internal calls run at double sponsor cadence.`,
        site_pay:     `Formula: sites x CEILING(total / 3) = ${sites} x ${Math.ceil(total/3)} = ${Number(A.site_pay)||0}. Quarterly payments per site.`,
        periodic_saf: `Formula: MAX(1, CEILING(${total} / 12)) = ${Math.max(1, Math.ceil(total/12))}. One periodic safety report per year of conduct.`,
        tigermed_cost:'Extracted from Tigermed proposal Budget Summary / Professional Service Fee page.',
        markup:       `${((Number(A.markup)||1.45)*100).toFixed(0)}% markup. Clinical revenue = Tigermed cost x markup. Adjust based on cash flow modelling.`,
        clin_upfront: `${((Number(A.clin_upfront)||0.2)*100).toFixed(0)}% billed at contract signing to cover mobilisation. Remainder spread monthly over enrollment.`,
        kz_ops_mo:    'Fixed in-country operations cost (local office, comms, incidental site support). Active during startup and enrollment.',
        sal_charlie:  'Monthly salary allocation. Set per study based on expected involvement level.',
        sal_zach:     'Monthly salary allocation. Set per study based on expected involvement level.',
        sal_almas:    'Monthly salary allocation. Set per study based on expected involvement level.',
        sal_didar:    'Monthly salary allocation. Set per study based on expected involvement level.',
        sal_alex:     'Monthly salary allocation. Set per study based on expected involvement level.',
        sal_alexander:'Monthly salary allocation. Set per study based on expected involvement level.',
        sal_shynar:   'Monthly salary allocation. Set per study based on expected involvement level.',
        ciprian_pct:  '0.5% of all revenue per month. Commission applied to management fee and clinical revenue.',
        insurance_mo: 'Professional indemnity and general liability insurance.',
        tech_mo:      'Technology stack: CTMS, data management tools, and communication platforms.',
        travel_m1:    'Initial travel and accommodation for site visits and sponsor meetings.',
        legal_m1:     'Legal review of CTRA, ICF, and regulatory submission documents.',
        audit_annual: 'Annual compliance audit. Triggers every 12 months of study conduct.',
      };
      return map[k] || '';
    }


    // ── XML helpers ──────────────────────────────────
    function para(text, opts = {}) {
      const { bold=false, size=20, color='000000', spaceAfter=100, spaceBefore=0, indent=0 } = opts;
      const rPr = `<w:rPr>${bold?'<w:b/>':''}<w:color w:val="${color}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr>`;
      const pPr = `<w:pPr>
        <w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}"/>
        ${indent ? `<w:ind w:left="${indent}"/>` : ''}
        <w:rPr>${bold?'<w:b/>':''}<w:color w:val="${color}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr>
      </w:pPr>`;
      return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
    }

    function tcXml(text, opts = {}) {
      const { bold=false, color='1A1A2E', bg=null, w=2000 } = opts;
      const shading = bg ? `<w:shd w:val="clear" w:color="auto" w:fill="${bg}"/>` : '';
      const rPr = `<w:rPr>${bold?'<w:b/>':''}<w:color w:val="${color}"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>`;
      return `<w:tc>
        <w:tcPr>
          <w:tcW w:w="${w}" w:type="dxa"/>
          ${shading}
          <w:tcBorders>
            <w:top w:val="single" w:sz="4" w:color="CCCCCC"/>
            <w:bottom w:val="single" w:sz="4" w:color="CCCCCC"/>
            <w:left w:val="single" w:sz="4" w:color="CCCCCC"/>
            <w:right w:val="single" w:sz="4" w:color="CCCCCC"/>
          </w:tcBorders>
          <w:tcMar>
            <w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/>
            <w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/>
          </w:tcMar>
        </w:tcPr>
        <w:p>
          <w:pPr><w:spacing w:before="0" w:after="0"/>${rPr}</w:pPr>
          <w:r>${rPr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>
        </w:p>
      </w:tc>`;
    }

    function tableXml(rows) {
      return `<w:tbl>
        <w:tblPr>
          <w:tblW w:w="9072" w:type="dxa"/>
          <w:tblLayout w:type="fixed"/>
        </w:tblPr>
        <w:tblGrid>
          <w:gridCol w:w="2200"/><w:gridCol w:w="1400"/>
          <w:gridCol w:w="1200"/><w:gridCol w:w="4272"/>
        </w:tblGrid>
        ${rows.join('\n')}
      </w:tbl>`;
    }

    function trXml(cells) { return `<w:tr>${cells.join('')}</w:tr>`; }

    // ── Build body ───────────────────────────────────
    const today = new Date().toLocaleDateString('en-US', {year:'numeric', month:'long', day:'numeric'});
    const studyName = A.study_name || 'Unknown Study';
    const sponsor   = A.sponsor    || '—';
    const phase     = A.phase      || '—';
    const totalMos  = (Number(A.startup_mo)||0)+(Number(A.enroll_mo)||0)+(Number(A.treat_mo)||0)+(Number(A.followup_mo)||0)+(Number(A.closeout_mo)||0);

    const body = [];

    // Cover
    body.push(para('Vantage Pricing Engine — Assumption Log', {bold:true, size:32, color:'1B6BF5', spaceAfter:80}));
    body.push(para(studyName, {bold:true, size:24, color:'1A1A2E', spaceAfter:60}));
    body.push(para(`Sponsor: ${sponsor}   |   Phase: ${phase}   |   Duration: ${totalMos} months`, {size:18, color:'555555', spaceAfter:60}));
    body.push(para(`Generated: ${today}`, {size:18, color:'888888', spaceAfter:300}));

    // One table per group
    for (const grpName of GROUPS_ORDER) {
      const fields = FIELDS.filter(f => f.grp === grpName);
      if (!fields.length) continue;
      body.push(para(grpName, {bold:true, size:22, color:'1B6BF5', spaceBefore:300, spaceAfter:100}));
      const rows = [];
      // Header row
      rows.push(trXml([
        tcXml('Assumption',            {bold:true, color:'FFFFFF', bg:'1B6BF5', w:2200}),
        tcXml('Value',                 {bold:true, color:'FFFFFF', bg:'1B6BF5', w:1400}),
        tcXml('Source',                {bold:true, color:'FFFFFF', bg:'1B6BF5', w:1200}),
        tcXml('Derivation & Rationale',{bold:true, color:'FFFFFF', bg:'1B6BF5', w:4272}),
      ]));
      fields.forEach((f, i) => {
        const bg = i % 2 === 0 ? 'F0F4FF' : null;
        rows.push(trXml([
          tcXml(f.lbl,                  {color:'1A1A2E', bg, w:2200}),
          tcXml(formatVal(f, A[f.k]),   {color:'1A1A2E', bg, w:1400}),
          tcXml(sourceLabel(f.k),       {color:'555555', bg, w:1200}),
          tcXml(getRationale(f.k),      {color:'333333', bg, w:4272}),
        ]));
      });
      body.push(tableXml(rows));
    }

    // Override notes
    const overrides = A._overrideNotes || [];
    if (overrides.length > 0) {
      body.push(para('Protocol Signal Overrides', {bold:true, size:22, color:'1B6BF5', spaceBefore:300, spaceAfter:100}));
      body.push(para('The following formula defaults were overridden based on explicit protocol language:', {size:18, color:'555555', spaceAfter:120}));
      overrides.forEach((note, i) => {
        body.push(para(`${i+1}. ${note}`, {size:18, spaceAfter:80, indent:360}));
      });
    }

    // Footer
    body.push(para('', {spaceAfter:200}));
    body.push(para('This document is auto-generated by the Vantage Pricing Engine. All assumptions should be reviewed and validated by a qualified CRA or clinical operations lead before use in sponsor proposals.', {size:16, color:'888888', spaceAfter:0}));

    // ── Assemble OOXML ────────────────────────────────
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${body.join('\n    ')}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    const wordRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr>
      <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
      <w:sz w:val="20"/><w:szCs w:val="20"/>
    </w:rPr></w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal" w:default="1">
    <w:name w:val="Normal"/>
    <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="20"/></w:rPr>
  </w:style>
</w:styles>`;

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
      body: JSON.stringify({ error: err.message }),
    };
  }
};
