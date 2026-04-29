// vantage-v50-claude-proxy
// v50 changes (additive over v49):
//  - When request body has { mode: 'extractSoA', pdf_base64, assumptions? }, the proxy
//    reads extractSoA_prompt.md + procedure_vocabulary.md from disk, builds a
//    multi-block messages array (PDF document + concatenated prompt+vocab text),
//    and POSTs to api.anthropic.com with claude-sonnet-4-20250514 / max_tokens=8000.
//    Returns the raw API response so the client can JSON.parse the manifest.
//  - All other requests (legacy: body is the full Anthropic API payload) are
//    passed through unchanged — byte-identical v49 behavior.
const fs = require('fs');
const path = require('path');

// Cached on warm starts to avoid re-reading large markdown files on every invoke
let _cachedPrompt = null;
let _cachedVocab  = null;
function loadExtractSoAPrompt() {
  if (_cachedPrompt && _cachedVocab) return { prompt: _cachedPrompt, vocab: _cachedVocab };
  // Try several candidate paths — Netlify Functions sometimes places assets in
  // /var/task/, sometimes alongside the function file. Fall back gracefully.
  const candidates = [
    path.join(__dirname, 'extractSoA_prompt.md'),
    path.join(process.cwd(), 'netlify', 'functions', 'extractSoA_prompt.md'),
    path.join(process.cwd(), 'extractSoA_prompt.md'),
  ];
  const vocabCandidates = [
    path.join(__dirname, 'procedure_vocabulary.md'),
    path.join(process.cwd(), 'netlify', 'functions', 'procedure_vocabulary.md'),
    path.join(process.cwd(), 'procedure_vocabulary.md'),
  ];
  let promptText = null, vocabText = null;
  for (const p of candidates) {
    try { promptText = fs.readFileSync(p, 'utf8'); break; } catch (_) {}
  }
  for (const p of vocabCandidates) {
    try { vocabText = fs.readFileSync(p, 'utf8'); break; } catch (_) {}
  }
  if (!promptText || !vocabText) {
    throw new Error('extractSoA_prompt.md or procedure_vocabulary.md not found in deploy bundle');
  }
  _cachedPrompt = promptText;
  _cachedVocab  = vocabText;
  return { prompt: promptText, vocab: vocabText };
}

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: ''
    };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' }) };
  }

  try {
    const body = JSON.parse(event.body);

    // ── v50 extractSoA branch ──────────────────────────────────────────
    // Triggered when client sends { mode: 'extractSoA', pdf_base64: '...', assumptions: {...} }
    // Constructs the multi-block extraction request and forwards to Anthropic.
    if (body && body.mode === 'extractSoA' && body.pdf_base64) {
      let promptText, vocabText;
      try {
        const loaded = loadExtractSoAPrompt();
        promptText = loaded.prompt;
        vocabText  = loaded.vocab;
      } catch (e) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'SoA prompt files not deployed: ' + e.message }) };
      }

      // Optional study context the client passed alongside the PDF — gives the
      // model phase/indication anchors for archetype classification
      let contextLine = '';
      if (body.assumptions && typeof body.assumptions === 'object') {
        const A = body.assumptions;
        const bits = [];
        if (A.study_name) bits.push(`Study: ${A.study_name}`);
        if (A.indication) bits.push(`Indication: ${A.indication}`);
        if (A.phase)      bits.push(`Phase: ${A.phase}`);
        if (A.population) bits.push(`Population: ${A.population}`);
        if (bits.length) contextLine = '\n\n# STUDY CONTEXT (from synopsis extraction)\n' + bits.join(' · ') + '\n';
      }

      const fullText = promptText + contextLine + '\n\n# VOCABULARY\n\n' + vocabText;
      const apiPayload = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: body.pdf_base64 },
              },
              { type: 'text', text: fullText },
            ],
          },
        ],
      };

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(apiPayload),
      });
      const data = await response.json();
      return { statusCode: response.status, headers, body: JSON.stringify(data) };
    }

    // ── Legacy passthrough (v49 behavior, byte-identical) ─────────────
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return { statusCode: response.status, headers, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
