/* ── ResumeForge AI — popup.js (Multi-Provider LLM Support) ── */

// ─── STATE ───────────────────────────────────────────────────────────────────
const state = {
  resumeText: '',
  jdText: '',
  activeJdTab: 'scrape',
  scrapedJD: '',
  provider: 'gemini',
  apiKey: '',
};
let _lastStructuredResume = null;

// ─── DOM REFS ────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const settingsToggle  = $('settingsToggle');
const apiPanel        = $('apiPanel');
const providerSelect  = $('providerSelect');
const saveKeyBtn      = $('saveKey');
const apiStatus       = $('apiStatus');
const uploadZone      = $('uploadZone');
const resumeFileInput = $('resumeFile');
const uploadIdle      = $('uploadIdle');
const uploadSuccess   = $('uploadSuccess');
const fileNameEl      = $('fileName');
const parsedStatus    = $('parsedStatus');
const removeFileBtn   = $('removeFile');
const tabBtns         = document.querySelectorAll('.tab-btn');
const scrapeTab       = $('scrapeTab');
const pasteTab        = $('pasteTab');
const scrapeBtn       = $('scrapeBtn');
const scrapedResult   = $('scrapedResult');
const scrapedPreview  = $('scrapedPreviewText');
const clearScrapeBtn  = $('clearScrape');
const jdPaste         = $('jdPaste');
const charCount       = $('charCount');
const generateBtn     = $('generateBtn');
const btnContent      = $('btnContent');
const btnLoader       = $('btnLoader');
const errorMsg        = $('errorMsg');
const resultSection   = $('resultSection');
const atsBadge        = $('atsBadge');
const copyBtn         = $('copyBtn');
const exportPdfBtn    = $('exportPdfBtn');
const resultText      = $('resultText');
const analysisCards   = $('analysisCards');
const resultTabs      = document.querySelectorAll('.result-tab');
const resumePane      = $('resumePane');
const analysisPane    = $('analysisPane');

// ─── INIT ────────────────────────────────────────────────────────────────────
async function init() {
  const stored = await chrome.storage.local.get(['provider', 'apiKey']);
  if (stored.provider) {
    state.provider = stored.provider;
    providerSelect.value = stored.provider;
    updateProviderInputs();
  }
  if (stored.apiKey) {
    state.apiKey = stored.apiKey;
    const inputId = `apiKey${state.provider.charAt(0).toUpperCase() + state.provider.slice(1)}`;
    $(inputId).value = stored.apiKey;
    apiStatus.textContent = '✓ API key loaded';
    apiStatus.className = 'api-status ok';
  }
}
init();

// ─── PROVIDER SELECTION ───────────────────────────────────────────────────────
providerSelect.addEventListener('change', (e) => {
  state.provider = e.target.value;
  updateProviderInputs();
});

function updateProviderInputs() {
  const providers = ['gemini', 'openai', 'groq', 'anthropic'];
  providers.forEach(p => {
    const el = $(`${p}Input`);
    if (p === state.provider) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
settingsToggle.addEventListener('click', () => apiPanel.classList.toggle('visible'));

saveKeyBtn.addEventListener('click', async () => {
  const inputId = `apiKey${state.provider.charAt(0).toUpperCase() + state.provider.slice(1)}`;
  const key = $(inputId).value.trim();
  if (!key) {
    apiStatus.textContent = '✗ Enter an API key';
    apiStatus.className = 'api-status err';
    return;
  }
  state.apiKey = key;
  await chrome.storage.local.set({ provider: state.provider, apiKey: key });
  apiStatus.textContent = '✓ API key saved';
  apiStatus.className = 'api-status ok';
});

// ─── FILE UPLOAD ─────────────────────────────────────────────────────────────
uploadZone.addEventListener('click', (e) => {
  if (e.target === removeFileBtn || removeFileBtn.contains(e.target)) return;
  resumeFileInput.click();
});
uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragging'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragging'));
uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragging');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
resumeFileInput.addEventListener('change', () => {
  if (resumeFileInput.files[0]) handleFile(resumeFileInput.files[0]);
});
removeFileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  state.resumeText = '';
  resumeFileInput.value = '';
  uploadIdle.style.display = 'flex';
  uploadSuccess.style.display = 'none';
});

// ─── FILE HANDLING ───────────────────────────────────────────────────────────
async function handleFile(file) {
  if (!file.name.endsWith('.pdf')) {
    showError('Only PDF files are supported.');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showError('File is too large. Max 10MB.');
    return;
  }
  parsedStatus.textContent = 'Parsing PDF...';
  uploadIdle.style.display = 'none';
  uploadSuccess.style.display = 'block';
  fileNameEl.textContent = file.name;
  try {
    const text = await extractPDFText(file);
    state.resumeText = text;
    parsedStatus.textContent = `✓ Extracted ${text.length} characters`;
  } catch (err) {
    parsedStatus.textContent = `✗ Failed to parse: ${err.message}`;
  }
}

async function extractPDFText(file) {
  await globalThis.pdfjsWorkerPromise;
  const worker = await globalThis.pdfjsWorkerPromise;
  const arrayBuf = await file.arrayBuffer();
  const doc = await globalThis.pdfjsLib.getDocument(arrayBuf).promise;
  let text = '';
  for (let i = 0; i < doc.numPages; i++) {
    const page = await doc.getPage(i + 1);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  return text.trim();
}

// ─── INIT PDF.JS ─────────────────────────────────────────────────────────────
globalThis.pdfjsWorkerPromise = (async () => {
  const workerUrl = chrome.runtime.getURL('lib/pdf.worker.mjs');
  globalThis.pdfjsLib = await import(workerUrl.replace('.worker.mjs', '.mjs'));
  globalThis.pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
})();

// ─── JOB DESCRIPTION TABS ────────────────────────────────────────────────────
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    state.activeJdTab = tab;
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    scrapeTab.classList.toggle('hidden', tab !== 'scrape');
    pasteTab.classList.toggle('hidden', tab !== 'paste');
  });
});

// ─── SCRAPE FUNCTIONALITY ─────────────────────────────────────────────────────
scrapeBtn.addEventListener('click', async () => {
  showError('');
  scrapeBtn.disabled = true;
  scrapeBtn.textContent = 'Scraping...';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'scrapeJD' });
    state.scrapedJD = response.jd || '';
    if (state.scrapedJD.length < 30) {
      showError('Could not extract job description. Try pasting manually.');
    } else {
      scrapedPreview.textContent = state.scrapedJD.slice(0, 200) + '...';
      scrapedResult.style.display = 'block';
    }
  } catch (err) {
    showError(`Scrape failed: ${err.message}. Try pasting manually.`);
  } finally {
    scrapeBtn.disabled = false;
    scrapeBtn.textContent = 'Scrape Job Description';
  }
});

clearScrapeBtn.addEventListener('click', () => {
  state.scrapedJD = '';
  scrapedResult.style.display = 'none';
});

jdPaste.addEventListener('input', () => {
  charCount.textContent = jdPaste.value.length;
});

// ─── RESULT TABS ─────────────────────────────────────────────────────────────
resultTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const rtab = tab.dataset.rtab;
    resultTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    resumePane.classList.toggle('hidden', rtab !== 'resume');
    analysisPane.classList.toggle('hidden', rtab !== 'analysis');
  });
});

copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(resultText.textContent);
  copyBtn.textContent = '✓ Copied!';
  setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
});

// ─── PDF EXPORT ───────────────────────────────────────────────────────────────
exportPdfBtn.addEventListener('click', async () => {
  if (!_lastStructuredResume) {
    showError('No resume to export. Generate one first.');
    return;
  }
  try {
    const html = buildPrintHTML(_lastStructuredResume.resume);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    await chrome.tabs.create({ url, active: false });
    setTimeout(() => { exportPdfBtn.textContent = '✓ Downloaded'; }, 300);
    setTimeout(() => { exportPdfBtn.textContent = 'Export PDF'; }, 3000);
  } catch (err) {
    showError(`Export failed: ${err.message}`);
  }
});

function buildPrintHTML(resume) {
  const r = resume || {};
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Resume</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Calibri', 'Arial', sans-serif; color: #333; line-height: 1.5; }
    @media print { body { margin: 0; padding: 20px; } }
    .container { max-width: 8.5in; margin: auto; padding: 20px; }
    .header { border-bottom: 3px solid #FF4D26; padding-bottom: 12px; margin-bottom: 16px; }
    .name { font-size: 24px; font-weight: 700; color: #000; }
    .title { font-size: 14px; color: #666; margin-top: 4px; }
    .contact { font-size: 11px; color: #666; margin-top: 8px; }
    .section { margin-bottom: 16px; }
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #FF4D26; border-bottom: 1px solid #FF4D26; padding-bottom: 4px; margin-bottom: 8px; }
    .entry { margin-bottom: 10px; }
    .entry-header { font-weight: 600; font-size: 12px; color: #000; }
    .entry-sub { font-size: 11px; color: #666; margin-top: 2px; }
    .entry-bullets { font-size: 11px; margin-left: 14px; margin-top: 4px; }
    .entry-bullets li { margin-bottom: 3px; }
    .skills-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 11px; }
    .skill-cat { font-weight: 600; color: #FF4D26; margin-bottom: 4px; }
    .skill-items { font-size: 11px; }
    @media print {
      .page-break { page-break-after: always; }
      body { padding: 0.5in; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="name">${r.name || 'Your Name'}</div>
      <div class="title">${r.title || 'Job Title'}</div>
      <div class="contact">
        ${[r.contact?.email, r.contact?.phone, r.contact?.location, r.contact?.linkedin, r.contact?.github]
          .filter(Boolean).join(' • ')}
      </div>
    </div>
    ${r.summary ? `<div class="section">
      <div class="section-title">Professional Summary</div>
      <p style="font-size: 11px; line-height: 1.4;">${r.summary}</p>
    </div>` : ''}
    ${r.experience?.length ? `<div class="section">
      <div class="section-title">Experience</div>
      ${r.experience.map(e => `<div class="entry">
        <div class="entry-header">${e.title} — ${e.company}${e.location ? ` • ${e.location}` : ''}</div>
        <div class="entry-sub">${e.duration || ''}</div>
        ${e.bullets?.length ? `<ul class="entry-bullets">${e.bullets.map(b => `<li>${b}</li>`).join('')}</ul>` : ''}
      </div>`).join('')}
    </div>` : ''}
    ${r.projects?.length ? `<div class="section">
      <div class="section-title">Projects</div>
      ${r.projects.map(p => `<div class="entry">
        <div class="entry-header">${p.name}${p.tech ? ` • ${p.tech}` : ''}</div>
        ${p.bullets?.length ? `<ul class="entry-bullets">${p.bullets.map(b => `<li>${b}</li>`).join('')}</ul>` : ''}
      </div>`).join('')}
    </div>` : ''}
    ${r.education?.length ? `<div class="section">
      <div class="section-title">Education</div>
      ${r.education.map(e => `<div class="entry">
        <div class="entry-header">${e.degree}</div>
        <div class="entry-sub">${e.institution}${e.year ? ` • ${e.year}` : ''}${e.grade ? ` • ${e.grade}` : ''}</div>
      </div>`).join('')}
    </div>` : ''}
    ${r.skills?.length ? `<div class="section">
      <div class="section-title">Skills</div>
      <div class="skills-grid">
        ${r.skills.map(s => `<div>
          <div class="skill-cat">${s.category}</div>
          <div class="skill-items">${s.items?.join(', ')}</div>
        </div>`).join('')}
      </div>
    </div>` : ''}
  </div>
  <script>
    window.addEventListener('load', () => { window.print(); });
  </script>
</body>
</html>`;
}

// ─── GENERATE BUTTON ─────────────────────────────────────────────────────────
generateBtn.addEventListener('click', async () => {
  if (!state.apiKey) {
    showError('Please set your API key in settings.');
    return;
  }
  if (!state.resumeText || state.resumeText.length < 50) {
    showError('Please upload your resume PDF first.');
    return;
  }

  const jd = state.activeJdTab === 'scrape' ? state.scrapedJD : jdPaste.value.trim();
  if (!jd || jd.length < 30) {
    showError('Please provide a job description (scrape or paste).');
    return;
  }

  state.jdText = jd;
  setLoading(true);
  resultSection.classList.add('hidden');

  try {
    const result = await callLLMAPI(state.resumeText, state.jdText, state.apiKey, state.provider);
    displayResult(result);
  } catch (err) {
    showError(`API Error: ${err.message}`);
  } finally {
    setLoading(false);
  }
});

// ─── LLM API CALLS ───────────────────────────────────────────────────────────
async function callLLMAPI(resume, jd, apiKey, provider) {
  if (provider === 'gemini') return callGemini(resume, jd, apiKey);
  if (provider === 'openai') return callOpenAI(resume, jd, apiKey);
  if (provider === 'groq') return callGroq(resume, jd, apiKey);
  if (provider === 'anthropic') return callAnthropic(resume, jd, apiKey);
  throw new Error('Unknown provider');
}

// Gemini
async function callGemini(resume, jd, apiKey) {
  const prompt = buildPrompt(resume, jd);
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const cleaned = rawText.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

// OpenAI
async function callOpenAI(resume, jd, apiKey) {
  const prompt = buildPrompt(resume, jd);
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawText = data?.choices?.[0]?.message?.content || '';
  const cleaned = rawText.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

// Groq
async function callGroq(resume, jd, apiKey) {
  const prompt = buildPrompt(resume, jd);
  const groqModels = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
  ];

  let lastError = 'Unknown Groq API error';
  for (const model of groqModels) {
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 8192,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      lastError = err?.error?.message || `HTTP ${response.status}`;
      // Retry with the next model for deprecations/unsupported model errors.
      if (response.status === 400 || response.status === 404) continue;
      throw new Error(lastError);
    }

    const data = await response.json();
    const rawText = data?.choices?.[0]?.message?.content || '';
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  }

  throw new Error(lastError);
}

// Anthropic Claude
async function callAnthropic(resume, jd, apiKey) {
  const prompt = buildPrompt(resume, jd);
  const response = await fetch(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawText = data?.content?.[0]?.text || '';
  const cleaned = rawText.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

// ─── COMMON PROMPT ───────────────────────────────────────────────────────────
function buildPrompt(resume, jd) {
  return `You are an expert ATS resume optimizer and senior technical recruiter.

Your job: tailor the given resume for the job description to maximize ATS score.

━━━ STRICT RULES ━━━
1. NEVER fabricate, invent, or add experience/skills/credentials not in the original resume
2. You MAY rephrase bullets to mirror JD language — but only when factually true
3. Inject exact JD keywords naturally into bullets, summary, and skills
4. Quantify achievements where original is vague ("improved performance" → "improved API response time by 40%")
5. Match the exact job title from JD in the title field
6. Reorder sections/bullets — most relevant to JD first
7. Keep ALL sections present in original (don't drop education, projects, etc.)
8. ATS rules: no tables, no columns, no special unicode chars in bullets

━━━ OUTPUT FORMAT ━━━
Return ONLY a valid JSON object. No markdown. No backticks. No text outside JSON.

{
  "ats_score": <integer 0-100>,
  "score_reasoning": "<1-2 sentences explaining the score>",
  "key_changes": ["<specific change made>", "<specific change made>", "<specific change made>"],
  "matched_keywords": ["<exact keyword from JD now in resume>", "<kw2>", "<kw3>"],
  "missing_skills": ["<skill required in JD but genuinely absent from resume>"],
  "resume": {
    "name": "<full name from resume>",
    "title": "<matched job title>",
    "contact": {
      "email": "<email>",
      "phone": "<phone>",
      "location": "<city, state>",
      "linkedin": "<linkedin url>",
      "github": "<github url>",
      "portfolio": "<portfolio url>"
    },
    "summary": "<2-3 sentences tailored to JD>",
    "experience": [
      {
        "title": "<job title>",
        "company": "<company>",
        "location": "<location>",
        "duration": "<dates>",
        "bullets": ["<bullet with JD keywords>"]
      }
    ],
    "projects": [
      {
        "name": "<project name>",
        "tech": "<tech stack>",
        "bullets": ["<description with JD keywords>"]
      }
    ],
    "education": [
      {
        "degree": "<degree name>",
        "institution": "<university name>",
        "location": "<city>",
        "year": "<graduation year>",
        "grade": "<CGPA or percentage>"
      }
    ],
    "skills": [
      { "category": "Languages", "items": ["<skill>"] },
      { "category": "Frameworks", "items": ["<skill>"] },
      { "category": "Databases", "items": ["<skill>"] },
      { "category": "Cloud & DevOps", "items": ["<skill>"] },
      { "category": "Tools", "items": ["<skill>"] }
    ],
    "certifications": ["<cert name>"],
    "achievements": ["<achievement>"]
  }
}

━━━ INPUT ━━━

RESUME:
${resume}

JOB DESCRIPTION:
${jd}`;
}

// ─── DISPLAY RESULT ──────────────────────────────────────────────────────────
function displayResult(result) {
  _lastStructuredResume = result;

  const score = result.ats_score ?? 0;
  atsBadge.textContent = `ATS: ${score}%`;
  atsBadge.className = 'ats-badge ' + (score >= 80 ? 'high' : score >= 60 ? 'mid' : 'low');

  const r = result.resume;
  if (r) {
    const lines = [];
    if (r.name) lines.push(r.name);
    if (r.title) lines.push(r.title);
    const c = r.contact || {};
    const contactParts = [c.email, c.phone, c.location, c.linkedin, c.github, c.portfolio].filter(Boolean);
    if (contactParts.length) lines.push(contactParts.join('  |  '));
    lines.push('');
    if (r.summary) { lines.push('── SUMMARY ──'); lines.push(r.summary); lines.push(''); }
    if (r.experience?.length) {
      lines.push('── EXPERIENCE ──');
      r.experience.forEach(e => {
        lines.push(`${e.title} — ${e.company}${e.location ? ', ' + e.location : ''}  |  ${e.duration}`);
        e.bullets?.forEach(b => lines.push(`• ${b}`));
        lines.push('');
      });
    }
    if (r.projects?.length) {
      lines.push('── PROJECTS ──');
      r.projects.forEach(p => {
        lines.push(`${p.name}  [${p.tech}]`);
        p.bullets?.forEach(b => lines.push(`• ${b}`));
        lines.push('');
      });
    }
    if (r.education?.length) {
      lines.push('── EDUCATION ──');
      r.education.forEach(e => {
        lines.push(`${e.degree} — ${e.institution}${e.location ? ', ' + e.location : ''}  |  ${e.year}`);
        if (e.grade) lines.push(`Grade: ${e.grade}`);
        lines.push('');
      });
    }
    if (r.skills?.length) {
      lines.push('── SKILLS ──');
      r.skills.forEach(s => {
        lines.push(`${s.category}: ${s.items?.join(', ')}`);
      });
      lines.push('');
    }
    if (r.certifications?.length) { lines.push('── CERTIFICATIONS ──'); r.certifications.forEach(c => lines.push(`• ${c}`)); lines.push(''); }
    if (r.achievements?.length) { lines.push('── ACHIEVEMENTS ──'); r.achievements.forEach(a => lines.push(`• ${a}`)); }
    resultText.textContent = lines.join('\n');
  }

  if (result.key_changes?.length) {
    const cardsHtml = `
      <div class="analysis-card">
        <div class="card-title">Key Changes</div>
        <ul style="margin-left: 14px; font-size: 12px;">
          ${result.key_changes.map(c => `<li style="margin-bottom: 6px;">${c}</li>`).join('')}
        </ul>
      </div>
      <div class="analysis-card">
        <div class="card-title">Matched Keywords</div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; font-size: 11px;">
          ${result.matched_keywords?.map(kw => `<span style="background: #FFE5D9; color: #FF4D26; padding: 4px 8px; border-radius: 3px;">${kw}</span>`).join('')}
        </div>
      </div>
      ${result.missing_skills?.length ? `<div class="analysis-card">
        <div class="card-title">Missing Skills (Learn Optional)</div>
        <ul style="margin-left: 14px; font-size: 12px;">
          ${result.missing_skills.map(s => `<li style="margin-bottom: 4px; color: #666;">${s}</li>`).join('')}
        </ul>
      </div>` : ''}
    `;
    analysisCards.innerHTML = cardsHtml;
  }

  resultSection.classList.remove('hidden');
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function showError(msg) {
  if (msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
  } else {
    errorMsg.classList.add('hidden');
  }
}

function setLoading(isLoading) {
  generateBtn.disabled = isLoading;
  btnContent.classList.toggle('hidden', isLoading);
  btnLoader.classList.toggle('hidden', !isLoading);
}
